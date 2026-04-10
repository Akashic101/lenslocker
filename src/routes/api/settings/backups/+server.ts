import { json } from '@sveltejs/kit';
import {
	create_settings_backup_zip,
	list_settings_backups
} from '$lib/server/services/settings/settings_backup_service';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const backups = await list_settings_backups();
	return json({ backups });
};

export const POST: RequestHandler = async ({ request }) => {
	let password: string | null | undefined = undefined;
	const content_type = request.headers.get('content-type') ?? '';
	if (content_type.includes('application/json')) {
		let body: unknown;
		try {
			body = await request.json();
		} catch {
			return json({ message: 'Invalid JSON' }, { status: 400 });
		}
		if (body != null && typeof body === 'object' && 'password' in body) {
			const p = (body as Record<string, unknown>).password;
			if (p != null && typeof p !== 'string') {
				return json({ message: 'password must be a string' }, { status: 400 });
			}
			password = (p as string | null | undefined) ?? null;
		}
	}
	const created = await create_settings_backup_zip(password);
	return json(created);
};
