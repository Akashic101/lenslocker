import { dashboard_attention_settings_depends_key } from '$lib/dashboard_attention_settings_cache';
import { settings_backup_list_depends_key } from '$lib/settings_backup_list_cache';
import { upload_pipeline_settings_depends_key } from '$lib/upload_pipeline_settings_cache';
import { get_dashboard_needs_attention_settings } from '$lib/server/dashboard_attention_settings';
import { list_settings_backups } from '$lib/server/settings_backup_service';
import { get_upload_preview_pipeline_settings } from '$lib/server/upload_pipeline_settings';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ depends }) => {
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
		settings_backups
	};
};
