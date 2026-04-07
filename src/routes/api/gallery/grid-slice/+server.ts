import { json } from '@sveltejs/kit';
import {
	dashboard_images_per_page,
	load_gallery_dashboard
} from '$lib/server/services/dashboard/gallery_grid_load';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const raw = url.searchParams.get('offset');
	const parsed = raw == null ? 0 : Number.parseInt(raw, 10);
	const offset = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;

	const payload = await load_gallery_dashboard(url, offset, dashboard_images_per_page);

	return json({
		images: payload.images,
		total_count: payload.gallery_infinite.total_count,
		offset: payload.gallery_infinite.offset,
		has_more: payload.gallery_infinite.has_more
	});
};
