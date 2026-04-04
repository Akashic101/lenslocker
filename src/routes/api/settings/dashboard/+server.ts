import { error, json } from '@sveltejs/kit';
import {
	get_dashboard_needs_attention_settings,
	replace_dashboard_needs_attention_settings
} from '$lib/server/dashboard_attention_settings';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	return json(await get_dashboard_needs_attention_settings());
};

export const PUT: RequestHandler = async ({ request }) => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		error(400, 'Invalid JSON');
	}
	if (body == null || typeof body !== 'object') {
		error(400, 'Expected a JSON object');
	}
	const saved = await replace_dashboard_needs_attention_settings(body);
	return json(saved);
};
