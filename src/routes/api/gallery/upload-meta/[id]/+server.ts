import { error, json } from '@sveltejs/kit';
import type { RawImageUploadRow } from '$lib/server/db/raw_image_upload.schema';
import { parse_upload_meta_patch } from '$lib/server/upload_meta_patch';
import { require_current_user_id } from '$lib/server/authz/current_user';
import {
	select_raw_upload_row_by_id,
	update_raw_upload_row_by_id
} from '$lib/server/services/gallery/gallery_service';
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

export const GET: RequestHandler = async (event) => {
	const user_id = require_current_user_id(event);
	const { params } = event;
	const id = params.id;
	if (id == null || !uuid_re.test(id)) error(400, 'Invalid id');

	const row = await select_raw_upload_row_by_id(user_id, id);
	if (!row) error(404, 'Not found');

	const { exifr_full_json, ...rest } = row;

	return json({
		...rest,
		exifr_full_json,
		exifr_full_json_parsed: parse_exifr_json(exifr_full_json)
	});
};

export const PATCH: RequestHandler = async (event) => {
	const user_id = require_current_user_id(event);
	const { params } = event;
	const id = params.id;
	if (id == null || !uuid_re.test(id)) error(400, 'Invalid id');

	const existing = await select_raw_upload_row_by_id(user_id, id);
	if (!existing) error(404, 'Not found');

	let body: unknown;
	try {
		body = await event.request.json();
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
	} else if (record.archive === false) {
		flag_patch.archived_at_ms = null;
	}

	const parsed = parse_upload_meta_patch(body);
	const updates: Partial<RawImageUploadRow> = { ...flag_patch };
	if (parsed.ok && Object.keys(parsed.patch).length > 0) {
		Object.assign(updates, parsed.patch);
	}

	if (Object.keys(updates).length === 0) {
		error(400, parsed.ok === false ? parsed.error : 'Nothing to update');
	}

	await update_raw_upload_row_by_id(user_id, id, updates);

	/** Keep upload-previews on disk so the Archived gallery can still list thumbnails. */

	const row = await select_raw_upload_row_by_id(user_id, id);
	if (!row) error(500, 'Update failed');

	const { exifr_full_json, ...rest } = row;
	return json({
		...rest,
		exifr_full_json,
		exifr_full_json_parsed: parse_exifr_json(exifr_full_json)
	});
};
