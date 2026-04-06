import { json, error } from '@sveltejs/kit';
import { create_share_link } from '$lib/server/services/share/share_link_service';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	const user = locals.user;
	if (user == null) error(401, 'Unauthorized');

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		error(400, 'Invalid JSON');
	}
	const rec = body as Record<string, unknown>;
	const kind = rec.kind === 'album' || rec.kind === 'raw_upload' ? rec.kind : null;
	if (kind == null) error(400, 'Invalid kind');

	const album_id = typeof rec.album_id === 'string' ? rec.album_id : null;
	const raw_upload_id = typeof rec.raw_upload_id === 'string' ? rec.raw_upload_id : null;

	let expires_at_ms: number | null = null;
	if (rec.expires_at_ms != null) {
		if (typeof rec.expires_at_ms !== 'number' || !Number.isFinite(rec.expires_at_ms)) {
			error(400, 'Invalid expires_at_ms');
		}
		expires_at_ms = Math.trunc(rec.expires_at_ms);
		if (expires_at_ms <= Date.now()) error(400, 'Expiration must be in the future');
	}

	try {
		const row = await create_share_link({
			kind,
			album_id,
			raw_upload_id,
			expires_at_ms,
			created_by_user_id: user.id
		});
		return json({
			id: row.id,
			token: row.token,
			kind: row.kind,
			expires_at_ms: row.expires_at_ms,
			created_at_ms: row.created_at_ms
		});
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		error(400, msg);
	}
};
