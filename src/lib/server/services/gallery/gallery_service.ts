import { and, count, eq, inArray, isNull } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	raw_image_upload,
	type RawImageUploadInsert,
	type RawImageUploadRow
} from '$lib/server/db/raw_image_upload.schema';

export async function count_non_archived_raw_uploads(user_id: string): Promise<number> {
	const [row] = await db
		.select({ n: count() })
		.from(raw_image_upload)
		.where(and(eq(raw_image_upload.user_id, user_id), isNull(raw_image_upload.archived_at_ms)));
	return Number(row?.n ?? 0);
}

export async function bulk_patch_raw_uploads_by_ids(
	user_id: string,
	upload_ids: string[],
	patch: Partial<Pick<RawImageUploadRow, 'starred' | 'archived_at_ms'>>
): Promise<void> {
	await db
		.update(raw_image_upload)
		.set(patch)
		.where(and(eq(raw_image_upload.user_id, user_id), inArray(raw_image_upload.id, upload_ids)));
}

export async function select_raw_upload_row_by_id(
	user_id: string,
	id: string
): Promise<RawImageUploadRow | undefined> {
	const [row] = await db
		.select()
		.from(raw_image_upload)
		.where(and(eq(raw_image_upload.id, id), eq(raw_image_upload.user_id, user_id)))
		.limit(1);
	return row;
}

export async function update_raw_upload_row_by_id(
	user_id: string,
	id: string,
	updates: Partial<RawImageUploadRow>
): Promise<void> {
	await db
		.update(raw_image_upload)
		.set(updates)
		.where(and(eq(raw_image_upload.id, id), eq(raw_image_upload.user_id, user_id)));
}

export async function select_raw_upload_id_by_sha256_hex(
	user_id: string,
	sha256_hex: string
): Promise<string | undefined> {
	const [row] = await db
		.select({ id: raw_image_upload.id })
		.from(raw_image_upload)
		.where(and(eq(raw_image_upload.user_id, user_id), eq(raw_image_upload.sha256_hex, sha256_hex)))
		.limit(1);
	return row?.id;
}

export async function insert_raw_upload_row(row: RawImageUploadInsert): Promise<void> {
	await db.insert(raw_image_upload).values(row);
}

type photo_gear_suggestions = {
	camera_makes: string[];
	camera_models: string[];
	/** Pairs from EXIF (for filtering model list by selected make). */
	camera_pairs: { make: string | null; model: string }[];
	lens_makes: string[];
	lens_models: string[];
	lens_pairs: { make: string | null; model: string }[];
};

function uniq_sorted(values: (string | null | undefined)[]): string[] {
	const out = new Set<string>();
	for (const v of values) {
		if (v == null) continue;
		const t = v.trim();
		if (t !== '') out.add(t);
	}
	return [...out].sort((a, b) => a.localeCompare(b));
}

function dedupe_pairs(
	pairs: { make: string | null; model: string | null }[]
): { make: string | null; model: string }[] {
	const seen = new Set<string>();
	const out: { make: string | null; model: string }[] = [];
	for (const p of pairs) {
		if (p.model == null || p.model.trim() === '') continue;
		const model = p.model.trim();
		const make = p.make?.trim() ?? null;
		const key = `${make ?? ''}\0${model}`;
		if (seen.has(key)) continue;
		seen.add(key);
		out.push({ make, model });
	}
	out.sort((a, b) => {
		const cm = (a.make ?? '').localeCompare(b.make ?? '');
		return cm !== 0 ? cm : a.model.localeCompare(b.model);
	});
	return out;
}

/** Distinct make/model / lens_make/lens_model from uploaded images (EXIF). */
export async function load_photo_gear_suggestions(
	user_id: string
): Promise<photo_gear_suggestions> {
	const rows = await db
		.select({
			make: raw_image_upload.make,
			model: raw_image_upload.model,
			lens_make: raw_image_upload.lens_make,
			lens_model: raw_image_upload.lens_model
		})
		.from(raw_image_upload)
		.where(eq(raw_image_upload.user_id, user_id));

	return {
		camera_makes: uniq_sorted(rows.map((r) => r.make)),
		camera_models: uniq_sorted(rows.map((r) => r.model)),
		camera_pairs: dedupe_pairs(rows.map((r) => ({ make: r.make, model: r.model }))),
		lens_makes: uniq_sorted(rows.map((r) => r.lens_make)),
		lens_models: uniq_sorted(rows.map((r) => r.lens_model)),
		lens_pairs: dedupe_pairs(rows.map((r) => ({ make: r.lens_make, model: r.lens_model })))
	};
}
