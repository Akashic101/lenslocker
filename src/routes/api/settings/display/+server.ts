import { json } from '@sveltejs/kit';
import {
	get_general_display_settings,
	replace_general_display_settings
} from '$lib/server/services/settings/general_display_settings';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	return json(await get_general_display_settings());
};

export const PUT: RequestHandler = async ({ request }) => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ message: 'Invalid JSON' }, { status: 400 });
	}
	const saved = await replace_general_display_settings(body);
	return json(saved);
};
