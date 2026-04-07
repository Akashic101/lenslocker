import { error, json } from '@sveltejs/kit';
import {
	get_valid_share_by_token,
	share_allowed_upload_ids
} from '$lib/server/services/share/share_link_service';
import { select_raw_upload_row_by_id } from '$lib/server/services/gallery/gallery_service';
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
	const token = params.token;
	const id = params.id;
	if (token == null || id == null || !uuid_re.test(id)) error(400, 'Invalid request');

	const share = await get_valid_share_by_token(token);
	if (share == null) error(404, 'Not found');

	const allowed = await share_allowed_upload_ids(share);
	if (!allowed.has(id)) error(403, 'Forbidden');

	const row = await select_raw_upload_row_by_id(share.created_by_user_id, id);
	if (!row) error(404, 'Not found');

	const { exifr_full_json, ...rest } = row;

	return json({
		...rest,
		exifr_full_json,
		exifr_full_json_parsed: parse_exifr_json(exifr_full_json)
	});
};
