import { createHash, randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { RawImageUploadInsert } from '$lib/server/db/raw_image_upload.schema';
import { get_upload_preview_pipeline_settings } from '$lib/server/services/settings/upload_pipeline_settings';
import {
	insert_raw_upload_row,
	select_raw_upload_id_by_sha256_hex
} from '$lib/server/services/gallery/gallery_service';
import {
	is_allowed_raw_upload_extension,
	raw_upload_extension_rejected_message
} from '$lib/gallery/raw_upload_extensions';
import { build_metadata_fields } from '$lib/server/raw_upload/metadata_from_exifr';
import {
	get_raw_upload_root,
	raw_upload_year_month_from_metadata
} from '$lib/server/raw_upload/paths';
import { write_preview_jpeg_for_upload } from '$lib/server/raw_upload/write_preview_jpeg';

type process_raw_upload_input = {
	original_filename: string;
	byte_size: number;
	mime_type: string | null;
	buffer: ArrayBuffer;
};

type process_raw_upload_ok = {
	ok: true;
	id: string;
	original_filename: string;
	preview_ok: boolean;
	preview_message?: string;
	/** Same bytes as an existing row; no new file or DB row was created. */
	duplicate?: boolean;
};

type process_raw_upload_err = {
	ok: false;
	message: string;
};

type process_raw_upload_result = process_raw_upload_ok | process_raw_upload_err;

/**
 * Store one RAW-like file, persist EXIF metadata to SQLite, and generate JPEG previews.
 * Shared by the form action and the JSON API for batch uploads.
 */
function format_max_upload_label(max_bytes: number): string {
	const mb = max_bytes / (1024 * 1024);
	if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
	if (Number.isInteger(mb)) return `${mb} MB`;
	return `${mb.toFixed(1)} MB`;
}

export async function process_single_raw_upload(
	input: process_raw_upload_input
): Promise<process_raw_upload_result> {
	const pipeline = await get_upload_preview_pipeline_settings();

	if (input.byte_size === 0) {
		return { ok: false, message: 'The file is empty.' };
	}

	if (input.byte_size > pipeline.max_upload_bytes) {
		return {
			ok: false,
			message: `File is too large (max ${format_max_upload_label(pipeline.max_upload_bytes)}).`
		};
	}

	if (!is_allowed_raw_upload_extension(input.original_filename)) {
		return {
			ok: false,
			message: raw_upload_extension_rejected_message
		};
	}

	const buffer = input.buffer;
	const sha256_hex = createHash('sha256').update(new Uint8Array(buffer)).digest('hex');

	const existing_id = await select_raw_upload_id_by_sha256_hex(sha256_hex);
	if (existing_id != null) {
		return {
			ok: true,
			id: existing_id,
			original_filename: input.original_filename,
			preview_ok: true,
			duplicate: true
		};
	}

	const id = randomUUID();
	const ext = path.extname(input.original_filename) || '.bin';
	const stored_filename = `${id}${ext}`;
	const uploaded_at_ms = Date.now();

	const metadata = await build_metadata_fields(buffer);
	const { year, month } = raw_upload_year_month_from_metadata(metadata, uploaded_at_ms);

	const root = get_raw_upload_root();
	const dest_dir = path.join(root, year, month);
	await mkdir(dest_dir, { recursive: true });
	const absolute_path = path.join(dest_dir, stored_filename);
	await writeFile(absolute_path, new Uint8Array(buffer));

	const relative_storage_path = path.posix.join(
		'data',
		'uploads',
		'raw',
		year,
		month,
		stored_filename
	);

	const row = {
		id,
		original_filename: input.original_filename,
		stored_filename,
		relative_storage_path,
		byte_size: input.byte_size,
		mime_type: input.mime_type,
		sha256_hex,
		uploaded_at_ms,
		...metadata
	};
	const cleaned = Object.fromEntries(
		Object.entries(row).filter(([, v]) => v !== undefined)
	) as RawImageUploadInsert;

	try {
		await insert_raw_upload_row(cleaned);
	} catch (e) {
		console.error(e);
		return {
			ok: false,
			message: 'Could not save metadata. Is the database migrated? Run: bun run db:push'
		};
	}

	const preview = await write_preview_jpeg_for_upload(
		id,
		new Uint8Array(buffer),
		input.original_filename,
		{
			source_absolute_path: absolute_path,
			exif_orientation: metadata.orientation ?? null,
			pipeline
		}
	);

	if (!preview.ok) {
		console.error(
			'[upload] preview not created:',
			'upload_id=',
			id,
			'file=',
			input.original_filename,
			'size=',
			input.byte_size,
			'reason=',
			preview.message
		);
	}

	return {
		ok: true,
		id,
		original_filename: input.original_filename,
		preview_ok: preview.ok,
		preview_message: preview.ok ? undefined : preview.message
	};
}
