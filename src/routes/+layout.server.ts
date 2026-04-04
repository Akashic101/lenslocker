import { count, isNull } from 'drizzle-orm';
import { gallery_active_upload_count_depends_key } from '$lib/gallery_upload_count_cache';
import { db } from '$lib/server/db';
import { raw_image_upload } from '$lib/server/db/raw_image_upload.schema';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ depends }) => {
	depends(gallery_active_upload_count_depends_key);

	const [row] = await db
		.select({ n: count() })
		.from(raw_image_upload)
		.where(isNull(raw_image_upload.archived_at_ms));

	const gallery_active_upload_count = Number(row?.n ?? 0);

	return { gallery_active_upload_count };
};
