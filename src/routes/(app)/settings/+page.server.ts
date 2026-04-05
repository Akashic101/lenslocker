import { redirect } from '@sveltejs/kit';
import { extractLocaleFromRequest } from '$lib/paraglide/runtime';
import { dashboard_attention_settings_depends_key } from '$lib/cache/dashboard_attention_settings_cache';
import { settings_backup_list_depends_key } from '$lib/cache/settings_backup_list_cache';
import { upload_pipeline_settings_depends_key } from '$lib/cache/upload_pipeline_settings_cache';
import { auth } from '$lib/server/auth';
import { get_dashboard_needs_attention_settings } from '$lib/server/services/settings/dashboard_attention_settings';
import { list_settings_backups } from '$lib/server/services/settings/settings_backup_service';
import { get_upload_preview_pipeline_settings } from '$lib/server/services/settings/upload_pipeline_settings';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ depends, locals, request }) => {
	depends(upload_pipeline_settings_depends_key);
	depends(dashboard_attention_settings_depends_key);
	depends(settings_backup_list_depends_key);
	const [upload_pipeline_settings, needs_attention_settings, settings_backups] = await Promise.all([
		get_upload_preview_pipeline_settings(),
		get_dashboard_needs_attention_settings(),
		list_settings_backups()
	]);
	return {
		upload_pipeline_settings,
		needs_attention_settings,
		settings_backups,
		account_email: locals.user?.email ?? null,
		paraglide_locale: extractLocaleFromRequest(request)
	};
};

export const actions: Actions = {
	sign_out: async (event) => {
		await auth.api.signOut({ headers: event.request.headers });
		throw redirect(303, '/start');
	}
};
