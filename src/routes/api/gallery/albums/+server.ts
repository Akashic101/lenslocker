import { error, json } from '@sveltejs/kit';
import { create_album } from '$lib/server/services/album/album_service';
import { require_current_user_id } from '$lib/server/authz/current_user';
import type { RequestHandler } from './$types';

const max_album_name_len = 200;

export const POST: RequestHandler = async (event) => {
	const user_id = require_current_user_id(event);
	let body: unknown;
	try {
		body = await event.request.json();
	} catch {
		error(400, 'Invalid JSON');
	}
	if (body == null || typeof body !== 'object') {
		error(400, 'Expected a JSON object');
	}
	const name_raw = (body as Record<string, unknown>).name;
	if (typeof name_raw !== 'string') {
		error(400, 'name must be a string');
	}
	const name = name_raw.trim();
	if (name.length === 0 || name.length > max_album_name_len) {
		error(400, 'Invalid name');
	}

	const id = await create_album(user_id, name);
	return json({ id });
};
