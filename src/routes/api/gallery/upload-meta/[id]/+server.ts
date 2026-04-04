import { error, json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	raw_image_upload,
	type RawImageUploadRow
} from '$lib/server/db/raw_image_upload.schema';
import { delete_upload_preview_jpegs } from '$lib/server/raw_upload/write_preview_jpeg';
import { parse_upload_meta_patch } from '$lib/server/upload_meta_patch';
import type { RequestHandler } from './$types';

const uuid_re = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parse_exifr_json(raw: string | null): unknown | null {
	if (raw == null || raw === '') return null;
	try {
		return JSON.parse(raw) as unknown;
	} catch {
		return null;
	}
}

export const GET: RequestHandler = async ({ params }) => {
	const id = params.id;
	if (id == null || !uuid_re.test(id)) error(400, 'Invalid id');

	const [row] = await db
		.select()
		.from(raw_image_upload)
		.where(eq(raw_image_upload.id, id))
		.limit(1);
	if (!row) error(404, 'Not found');

	const { exifr_full_json, ...rest } = row;

	return json({
		...rest,
		exifr_full_json,
		exifr_full_json_parsed: parse_exifr_json(exifr_full_json)
	});
};

export const PATCH: RequestHandler = async ({ params, request }) => {
	const id = params.id;
	if (id == null || !uuid_re.test(id)) error(400, 'Invalid id');

	const [existing] = await db
		.select()
		.from(raw_image_upload)
		.where(eq(raw_image_upload.id, id))
		.limit(1);
	if (!existing) error(404, 'Not found');

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		error(400, 'Invalid JSON');
	}

	const record = body as Record<string, unknown>;
	const flag_patch: Partial<Pick<RawImageUploadRow, 'starred' | 'archived_at_ms'>> = {};
	if (typeof record.starred === 'boolean') {
		flag_patch.starred = record.starred ? 1 : 0;
	}
	if (record.archive === true) {
		flag_patch.archived_at_ms = Date.now();
	}

	const parsed = parse_upload_meta_patch(body);
	const updates: Partial<RawImageUploadRow> = { ...flag_patch };
	if (parsed.ok && Object.keys(parsed.patch).length > 0) {
		Object.assign(updates, parsed.patch);
	}

	if (Object.keys(updates).length === 0) {
		error(400, parsed.ok === false ? parsed.error : 'Nothing to update');
	}

	await db.update(raw_image_upload).set(updates).where(eq(raw_image_upload.id, id));

	if (record.archive === true) {
		await delete_upload_preview_jpegs(id);
	}

	const [row] = await db
		.select()
		.from(raw_image_upload)
		.where(eq(raw_image_upload.id, id))
		.limit(1);
	if (!row) error(500, 'Update failed');

	const { exifr_full_json, ...rest } = row;
	return json({
		...rest,
		exifr_full_json,
		exifr_full_json_parsed: parse_exifr_json(exifr_full_json)
	});
};
