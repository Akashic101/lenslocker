import { error, json } from '@sveltejs/kit';
import {
	add_raw_uploads_to_album,
	create_album,
	get_album_by_id,
	is_album_id_format
} from '$lib/server/services/album/album_service';
import type { RequestHandler } from './$types';

const uuid_re = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const max_upload_ids_per_request = 1000;
const max_album_name_len = 200;

export const POST: RequestHandler = async ({ request }) => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		error(400, 'Invalid JSON');
	}
	if (body == null || typeof body !== 'object') {
		error(400, 'Expected a JSON object');
	}
	const record = body as Record<string, unknown>;
	const raw_ids = record.upload_ids;
	if (!Array.isArray(raw_ids) || raw_ids.length === 0) {
		error(400, 'upload_ids must be a non-empty array');
	}
	const seen = new Set<string>();
	const upload_ids: string[] = [];
	for (const x of raw_ids) {
		if (typeof x !== 'string' || !uuid_re.test(x) || seen.has(x)) continue;
		seen.add(x);
		upload_ids.push(x);
	}
	if (upload_ids.length === 0) {
		error(400, 'No valid upload ids');
	}
	if (upload_ids.length > max_upload_ids_per_request) {
		error(400, `At most ${max_upload_ids_per_request} uploads per request`);
	}

	const album_id_raw = record.album_id;
	const new_album_name = record.new_album_name;

	const has_album_id = album_id_raw != null && String(album_id_raw).trim() !== '';
	const has_new_name = new_album_name != null && String(new_album_name).trim() !== '';

	if (has_album_id === has_new_name) {
		error(400, 'Provide exactly one of album_id or new_album_name');
	}

	let target_album_id: string;

	if (has_new_name) {
		const name = String(new_album_name).trim();
		if (name.length === 0 || name.length > max_album_name_len) {
			error(400, 'Invalid album name');
		}
		target_album_id = await create_album(name);
	} else {
		const aid = String(album_id_raw).trim();
		if (!is_album_id_format(aid)) {
			error(400, 'Invalid album_id');
		}
		const row = await get_album_by_id(aid);
		if (row == null) {
			error(404, 'Album not found');
		}
		target_album_id = aid;
	}

	await add_raw_uploads_to_album(target_album_id, upload_ids);

	return json({ album_id: target_album_id });
};
