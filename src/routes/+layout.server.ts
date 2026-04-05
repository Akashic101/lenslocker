import { gallery_active_upload_count_depends_key } from '$lib/gallery_upload_count_cache';
import { count_non_archived_raw_uploads } from '$lib/server/services/gallery/gallery_service';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ depends }) => {
	depends(gallery_active_upload_count_depends_key);

	const gallery_active_upload_count = await count_non_archived_raw_uploads();

	return { gallery_active_upload_count };
};
