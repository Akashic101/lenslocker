import { upload_pipeline_settings_depends_key } from '$lib/upload_pipeline_settings_cache';
import { get_upload_preview_pipeline_settings } from '$lib/server/services/settings/upload_pipeline_settings';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, depends }) => {
	depends(upload_pipeline_settings_depends_key);
	return {
		just_uploaded: url.searchParams.get('uploaded') === '1',
		upload_pipeline_settings: await get_upload_preview_pipeline_settings()
	};
};
