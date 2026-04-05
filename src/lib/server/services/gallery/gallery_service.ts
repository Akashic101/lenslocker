import { count, eq, inArray, isNull } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	raw_image_upload,
	type RawImageUploadInsert,
	type RawImageUploadRow
} from '$lib/server/db/raw_image_upload.schema';

export async function count_non_archived_raw_uploads(): Promise<number> {
	const [row] = await db
		.select({ n: count() })
		.from(raw_image_upload)
		.where(isNull(raw_image_upload.archived_at_ms));
	return Number(row?.n ?? 0);
}

export async function bulk_patch_raw_uploads_by_ids(
	upload_ids: string[],
	patch: Partial<Pick<RawImageUploadRow, 'starred' | 'archived_at_ms'>>
): Promise<void> {
	await db.update(raw_image_upload).set(patch).where(inArray(raw_image_upload.id, upload_ids));
}

export async function select_raw_upload_row_by_id(
	id: string
): Promise<RawImageUploadRow | undefined> {
	const [row] = await db
		.select()
		.from(raw_image_upload)
		.where(eq(raw_image_upload.id, id))
		.limit(1);
	return row;
}

export async function update_raw_upload_row_by_id(
	id: string,
	updates: Partial<RawImageUploadRow>
): Promise<void> {
	await db.update(raw_image_upload).set(updates).where(eq(raw_image_upload.id, id));
}

export async function select_raw_upload_id_by_sha256_hex(
	sha256_hex: string
): Promise<string | undefined> {
	const [row] = await db
		.select({ id: raw_image_upload.id })
		.from(raw_image_upload)
		.where(eq(raw_image_upload.sha256_hex, sha256_hex))
		.limit(1);
	return row?.id;
}

export async function insert_raw_upload_row(row: RawImageUploadInsert): Promise<void> {
	await db.insert(raw_image_upload).values(row);
}
