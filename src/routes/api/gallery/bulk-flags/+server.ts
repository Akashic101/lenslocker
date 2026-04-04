import { error, json } from '@sveltejs/kit';
import { inArray } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { raw_image_upload, type RawImageUploadRow } from '$lib/server/db/raw_image_upload.schema';
import type { RequestHandler } from './$types';

const uuid_re = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const max_upload_ids_per_request = 200;

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

	const patch: Partial<Pick<RawImageUploadRow, 'starred' | 'archived_at_ms'>> = {};
	if (typeof record.starred === 'boolean') {
		patch.starred = record.starred ? 1 : 0;
	}
	if (record.archive === true) {
		patch.archived_at_ms = Date.now();
	} else if (record.archive === false) {
		patch.archived_at_ms = null;
	}
	if (Object.keys(patch).length === 0) {
		error(400, 'Provide starred and/or archive');
	}

	await db.update(raw_image_upload).set(patch).where(inArray(raw_image_upload.id, upload_ids));

	return json({ updated: upload_ids.length });
};
