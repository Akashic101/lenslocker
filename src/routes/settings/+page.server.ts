import { dashboard_attention_settings_depends_key } from '$lib/dashboard_attention_settings_cache';
import { upload_pipeline_settings_depends_key } from '$lib/upload_pipeline_settings_cache';
import { get_dashboard_needs_attention_settings } from '$lib/server/dashboard_attention_settings';
import { get_upload_preview_pipeline_settings } from '$lib/server/upload_pipeline_settings';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ depends }) => {
	depends(upload_pipeline_settings_depends_key);
	depends(dashboard_attention_settings_depends_key);
	const [upload_pipeline_settings, needs_attention_settings] = await Promise.all([
		get_upload_preview_pipeline_settings(),
		get_dashboard_needs_attention_settings()
	]);
	return {
		upload_pipeline_settings,
		needs_attention_settings
	};
};
