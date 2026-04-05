import { error, json } from '@sveltejs/kit';
import {
	delete_settings_backup_file,
	is_valid_settings_backup_filename,
	read_settings_backup_file
} from '$lib/server/services/settings/settings_backup_service';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const filename = params.filename ?? '';
	if (!is_valid_settings_backup_filename(filename)) {
		error(400, 'Invalid backup filename');
	}
	try {
		const buf = await read_settings_backup_file(filename);
		return new Response(new Uint8Array(buf), {
			headers: {
				'Content-Type': 'application/zip',
				'Content-Disposition': `attachment; filename="${filename}"`,
				'Content-Length': String(buf.length)
			}
		});
	} catch {
		error(404, 'Backup not found');
	}
};

export const DELETE: RequestHandler = async ({ params }) => {
	const filename = params.filename ?? '';
	if (!is_valid_settings_backup_filename(filename)) {
		error(400, 'Invalid backup filename');
	}
	try {
		await delete_settings_backup_file(filename);
		return json({ ok: true as const });
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);
		if (message === 'Backup not found') {
			error(404, message);
		}
		error(400, message);
	}
};
