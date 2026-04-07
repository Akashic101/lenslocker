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

export const POST: RequestHandler = async () => {
	const created = await create_settings_backup_zip();
	return json(created);
};
