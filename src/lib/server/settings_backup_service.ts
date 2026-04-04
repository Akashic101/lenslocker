import fs from 'node:fs/promises';
import path from 'node:path';
import { eq, sql } from 'drizzle-orm';
import JSZip from 'jszip';
import {
	capture_sqlite_database_for_backup_zip,
	db,
	replace_sqlite_database_from_backup_buffer
} from '$lib/server/db';
import { app_setting } from '$lib/server/db/app_setting.schema';
import { hardware_item, type HardwareItemInsert } from '$lib/server/db/hardware.schema';
import { ensure_settings_backup_root } from '$lib/server/settings_backup_storage';

const backup_sequence_key = 'lenslocker_backup_sequence';
const backup_filename_re = /^LensLocker-backup-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d+\.zip$/;
const backup_zip_database_filename = 'database.sqlite';
const supported_backup_schema_versions = new Set([1, 2]);
const max_settings_backup_import_bytes = 512 * 1024 * 1024;

const allowed_hardware_categories = new Set(['camera', 'lens', 'accessory', 'other']);

export type settings_backup_list_entry = {
	filename: string;
	size_bytes: number;
	created_at_ms: number;
};

export function is_valid_settings_backup_filename(name: string): boolean {
	if (name.includes('..') || path.isAbsolute(name)) return false;
	return backup_filename_re.test(name);
}

/** Reads next sequence, persists sequence+1, returns the number used for this backup file. */
export function take_next_backup_sequence(): number {
	return db.transaction((tx) => {
		const rows = tx
			.select()
			.from(app_setting)
			.where(eq(app_setting.key, backup_sequence_key))
			.limit(1)
			.all();
		const assigned =
			rows.length === 0
				? 1
				: (() => {
						try {
							const j = JSON.parse(rows[0].value_json) as { next?: number };
							return typeof j.next === 'number' && j.next >= 1 ? j.next : 1;
						} catch {
							return 1;
						}
					})();
		const next_stored = assigned + 1;
		const value_json = JSON.stringify({ next: next_stored });
		if (rows.length === 0) {
			tx.insert(app_setting).values({ key: backup_sequence_key, value_json }).run();
		} else {
			tx.update(app_setting)
				.set({ value_json })
				.where(eq(app_setting.key, backup_sequence_key))
				.run();
		}
		return assigned;
	});
}

function format_backup_date_stamp(d: Date): string {
	const y = d.getFullYear();
	const mo = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	const h = String(d.getHours()).padStart(2, '0');
	const min = String(d.getMinutes()).padStart(2, '0');
	return `${y}-${mo}-${day}-${h}-${min}`;
}

export async function list_settings_backups(): Promise<settings_backup_list_entry[]> {
	const root = await ensure_settings_backup_root();
	let names: string[];
	try {
		names = await fs.readdir(root);
	} catch {
		return [];
	}
	const out: settings_backup_list_entry[] = [];
	for (const name of names) {
		if (!is_valid_settings_backup_filename(name)) continue;
		try {
			const st = await fs.stat(path.join(root, name));
			if (!st.isFile()) continue;
			out.push({
				filename: name,
				size_bytes: st.size,
				created_at_ms: Math.trunc(st.mtimeMs)
			});
		} catch {
			/* skip */
		}
	}
	out.sort((a, b) => b.created_at_ms - a.created_at_ms);
	return out;
}

export async function create_settings_backup_zip(): Promise<{
	filename: string;
	size_bytes: number;
}> {
	const root = await ensure_settings_backup_root();
	const seq = take_next_backup_sequence();
	const stamp = format_backup_date_stamp(new Date());
	const filename = `LensLocker-backup-${stamp}-${seq}.zip`;

	const db_snapshot = capture_sqlite_database_for_backup_zip();
	const settings_rows = await db.select().from(app_setting);
	const hardware_rows = await db.select().from(hardware_item);

	const zip = new JSZip();
	const created_at_ms = Date.now();
	zip.file(
		'manifest.json',
		JSON.stringify(
			{
				app: 'LensLocker',
				schema_version: 2,
				created_at_ms,
				backup_sequence: seq,
				date_stamp: stamp,
				includes_database: true
			},
			null,
			2
		)
	);
	zip.file(backup_zip_database_filename, db_snapshot);
	zip.file('app_settings.json', JSON.stringify(settings_rows, null, 2));
	zip.file('hardware_items.json', JSON.stringify(hardware_rows, null, 2));

	const buf = Buffer.from(await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' }));
	await fs.writeFile(path.join(root, filename), buf);
	return { filename, size_bytes: buf.length };
}

export async function read_settings_backup_file(filename: string): Promise<Buffer> {
	if (!is_valid_settings_backup_filename(filename)) {
		throw new Error('Invalid backup filename');
	}
	const root = path.resolve(await ensure_settings_backup_root());
	const full = path.resolve(path.join(root, filename));
	if (path.dirname(full) !== root) {
		throw new Error('Invalid path');
	}
	return fs.readFile(full);
}

export async function delete_settings_backup_file(filename: string): Promise<void> {
	if (!is_valid_settings_backup_filename(filename)) {
		throw new Error('Invalid backup filename');
	}
	const root = path.resolve(await ensure_settings_backup_root());
	const full = path.resolve(path.join(root, filename));
	if (path.dirname(full) !== root) {
		throw new Error('Invalid path');
	}
	try {
		await fs.unlink(full);
	} catch (e) {
		if (
			e &&
			typeof e === 'object' &&
			'code' in e &&
			(e as NodeJS.ErrnoException).code === 'ENOENT'
		) {
			throw new Error('Backup not found', { cause: e });
		}
		throw e;
	}
}

function chunk_array<T>(items: T[], chunk_size: number): T[][] {
	const out: T[][] = [];
	for (let i = 0; i < items.length; i += chunk_size) {
		out.push(items.slice(i, i + chunk_size));
	}
	return out;
}

function find_zip_file(zip: JSZip, basename: string): JSZip.JSZipObject | null {
	for (const [name, entry] of Object.entries(zip.files)) {
		if (entry.dir) continue;
		const base = name.split('/').pop() ?? name;
		if (base === basename) return entry;
	}
	return null;
}

function parse_app_settings_backup_json(raw: string): { key: string; value_json: string }[] {
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw) as unknown;
	} catch {
		throw new Error('app_settings.json is not valid JSON');
	}
	if (!Array.isArray(parsed)) {
		throw new Error('app_settings.json must be a JSON array');
	}
	const out: { key: string; value_json: string }[] = [];
	const seen_keys = new Set<string>();
	for (const item of parsed) {
		if (item === null || typeof item !== 'object') {
			throw new Error('Invalid row in app_settings.json');
		}
		const rec = item as Record<string, unknown>;
		if (typeof rec.key !== 'string' || rec.key.trim() === '') {
			throw new Error('Invalid app_setting key');
		}
		if (typeof rec.value_json !== 'string') {
			throw new Error(`Invalid value_json for app_setting "${rec.key}"`);
		}
		if (seen_keys.has(rec.key)) {
			throw new Error(`Duplicate app_setting key: ${rec.key}`);
		}
		seen_keys.add(rec.key);
		out.push({ key: rec.key, value_json: rec.value_json });
	}
	return out;
}

function optional_import_string(v: unknown): string | null {
	if (v === null || v === undefined) return null;
	if (typeof v !== 'string') return null;
	const t = v.trim();
	return t === '' ? null : t;
}

function require_import_finite_number(v: unknown, label: string): number {
	if (typeof v !== 'number' || !Number.isFinite(v)) {
		throw new Error(`Invalid hardware ${label}`);
	}
	return v;
}

function parse_hardware_items_backup_json(raw: string): HardwareItemInsert[] {
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw) as unknown;
	} catch {
		throw new Error('hardware_items.json is not valid JSON');
	}
	if (!Array.isArray(parsed)) {
		throw new Error('hardware_items.json must be a JSON array');
	}
	const out: HardwareItemInsert[] = [];
	const seen_ids = new Set<string>();
	for (const item of parsed) {
		if (item === null || typeof item !== 'object') {
			throw new Error('Invalid row in hardware_items.json');
		}
		const rec = item as Record<string, unknown>;
		if (typeof rec.id !== 'string' || rec.id.trim() === '') {
			throw new Error('Invalid hardware id');
		}
		if (seen_ids.has(rec.id)) {
			throw new Error(`Duplicate hardware id: ${rec.id}`);
		}
		seen_ids.add(rec.id);
		if (typeof rec.category !== 'string' || !allowed_hardware_categories.has(rec.category)) {
			throw new Error(`Invalid hardware category for id ${rec.id}`);
		}
		const model =
			typeof rec.model === 'string' && rec.model.trim() !== '' ? rec.model.trim() : null;
		if (model === null) {
			throw new Error(`Hardware model is required (id ${rec.id})`);
		}
		const acquired_raw = rec.acquired_at_ms;
		let acquired_at_ms: number | null = null;
		if (acquired_raw !== null && acquired_raw !== undefined) {
			acquired_at_ms = require_import_finite_number(acquired_raw, 'acquired_at_ms');
		}
		out.push({
			id: rec.id,
			category: rec.category,
			make: optional_import_string(rec.make),
			model,
			serial_number: optional_import_string(rec.serial_number),
			mount: optional_import_string(rec.mount),
			notes: optional_import_string(rec.notes),
			acquired_at_ms,
			created_at_ms: require_import_finite_number(rec.created_at_ms, 'created_at_ms'),
			updated_at_ms: require_import_finite_number(rec.updated_at_ms, 'updated_at_ms')
		});
	}
	return out;
}

export type settings_backup_import_result = {
	app_settings_count: number;
	hardware_items_count: number;
	date_stamp?: string;
	restored_full_database: boolean;
};

/** Replaces all `app_setting` and `hardware_item` rows with contents of a LensLocker backup zip. */
export async function import_settings_backup_from_zip_buffer(
	buf: Buffer
): Promise<settings_backup_import_result> {
	if (buf.length === 0) {
		throw new Error('Empty file');
	}
	if (buf.length > max_settings_backup_import_bytes) {
		throw new Error(`Backup file is too large (max ${max_settings_backup_import_bytes} bytes)`);
	}
	const zip = await JSZip.loadAsync(buf);

	const manifest_entry = find_zip_file(zip, 'manifest.json');
	if (!manifest_entry) {
		throw new Error('Zip must contain manifest.json');
	}

	const manifest_raw = await manifest_entry.async('string');
	let manifest: unknown;
	try {
		manifest = JSON.parse(manifest_raw) as unknown;
	} catch {
		throw new Error('manifest.json is not valid JSON');
	}
	if (manifest === null || typeof manifest !== 'object') {
		throw new Error('Invalid manifest.json');
	}
	const man = manifest as Record<string, unknown>;
	if (man.app !== 'LensLocker') {
		throw new Error('This zip is not a LensLocker backup');
	}
	const manifest_version = man.schema_version;
	if (
		typeof manifest_version !== 'number' ||
		!supported_backup_schema_versions.has(manifest_version)
	) {
		throw new Error(
			`Unsupported backup schema_version (supported: ${[...supported_backup_schema_versions].sort((a, b) => a - b).join(', ')})`
		);
	}

	const db_entry = find_zip_file(zip, backup_zip_database_filename);
	if (db_entry) {
		const raw_db = await db_entry.async('uint8array');
		const file_buffer = Buffer.from(raw_db);
		replace_sqlite_database_from_backup_buffer(file_buffer);
		const app_settings_count = db.select().from(app_setting).all().length;
		const hardware_items_count = db.select().from(hardware_item).all().length;
		return {
			app_settings_count,
			hardware_items_count,
			date_stamp: typeof man.date_stamp === 'string' ? man.date_stamp : undefined,
			restored_full_database: true
		};
	}

	if (manifest_version === 2) {
		throw new Error(
			`This backup declares schema v2 but is missing ${backup_zip_database_filename} (incomplete archive)`
		);
	}

	const app_entry = find_zip_file(zip, 'app_settings.json');
	const hardware_entry = find_zip_file(zip, 'hardware_items.json');
	if (!app_entry || !hardware_entry) {
		throw new Error(
			'Zip must contain app_settings.json and hardware_items.json (or database.sqlite)'
		);
	}

	const app_rows = parse_app_settings_backup_json(await app_entry.async('string'));
	const hardware_rows = parse_hardware_items_backup_json(await hardware_entry.async('string'));

	db.transaction((tx) => {
		tx.delete(hardware_item)
			.where(sql`1 = 1`)
			.run();
		tx.delete(app_setting)
			.where(sql`1 = 1`)
			.run();
		for (const batch of chunk_array(app_rows, 80)) {
			if (batch.length > 0) {
				tx.insert(app_setting).values(batch).run();
			}
		}
		for (const batch of chunk_array(hardware_rows, 40)) {
			if (batch.length > 0) {
				tx.insert(hardware_item).values(batch).run();
			}
		}
	});

	return {
		app_settings_count: app_rows.length,
		hardware_items_count: hardware_rows.length,
		date_stamp: typeof man.date_stamp === 'string' ? man.date_stamp : undefined,
		restored_full_database: false
	};
}
