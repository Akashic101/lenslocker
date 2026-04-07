import { error, json } from '@sveltejs/kit';
import {
	get_upload_preview_pipeline_settings,
	replace_upload_preview_pipeline_settings
} from '$lib/server/services/settings/upload_pipeline_settings';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	return json(await get_upload_preview_pipeline_settings());
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
	const saved = await replace_upload_preview_pipeline_settings(body);
	return json(saved);
};
