import { upload_pipeline_settings_depends_key } from '$lib/upload_pipeline_settings_cache';
import { get_upload_preview_pipeline_settings } from '$lib/server/upload_pipeline_settings';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ depends }) => {
	depends(upload_pipeline_settings_depends_key);
	return {
		upload_pipeline_settings: await get_upload_preview_pipeline_settings()
	};
};
