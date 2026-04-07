import { albums_list_depends_key } from '$lib/cache/albums_cache';
import { dashboard_attention_settings_depends_key } from '$lib/cache/dashboard_attention_settings_cache';
import { general_display_settings_depends_key } from '$lib/cache/general_display_settings_cache';
import { transformed_media_depends_key } from '$lib/cache/transformed_media_cache';
import {
	dashboard_images_per_page,
	load_gallery_dashboard
} from '$lib/server/services/dashboard/gallery_grid_load';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, depends }) => {
	depends(transformed_media_depends_key);
	depends(dashboard_attention_settings_depends_key);
	depends(general_display_settings_depends_key);
	depends(albums_list_depends_key);

	return load_gallery_dashboard(url, 0, dashboard_images_per_page);
};
