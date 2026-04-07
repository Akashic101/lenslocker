import { error, json } from '@sveltejs/kit';
import {
	create_settings_backup_zip,
	list_settings_backups
} from '$lib/server/services/settings/settings_backup_service';
import { require_current_user_id } from '$lib/server/authz/current_user';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const backups = await list_settings_backups();
	return json({ backups });
};

export const POST: RequestHandler = async (event) => {
	const user_id = require_current_user_id(event);
	try {
		const created = await create_settings_backup_zip(user_id);
		return json(created);
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);
		// Show a clear message (instead of default 500 "Internal Error").
		error(400, message);
	}
};
