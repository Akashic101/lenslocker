import { transformed_media_url } from '$lib/transformed_urls';
import { get_transformed_source_description, list_transformed_media_paths } from '$lib/server/transformed';
import type { PageServerLoad } from './$types';

const images_per_page = 50;

export const load: PageServerLoad = async ({ url }) => {
	const all_paths = await list_transformed_media_paths();
	const total_count = all_paths.length;
	const raw_page = Number.parseInt(url.searchParams.get('page') ?? '1', 10);
	const page_number = Number.isFinite(raw_page) && raw_page >= 1 ? raw_page : 1;
	const total_pages = Math.max(1, Math.ceil(total_count / images_per_page));
	const current_page = Math.min(page_number, total_pages);
	const start = (current_page - 1) * images_per_page;
	const slice = all_paths.slice(start, start + images_per_page);

	const images = slice.map((relative_path) => ({
		src: transformed_media_url(relative_path),
		alt: relative_path
	}));

	return {
		transformed_source: get_transformed_source_description(),
		images,
		pagination: {
			current_page,
			total_pages,
			total_count,
			images_per_page,
			has_previous: current_page > 1,
			has_next: current_page < total_pages
		}
	};
};
