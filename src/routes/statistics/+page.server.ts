import { load_gallery_statistics_v1 } from '$lib/server/gallery_statistics_v1';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const stats = await load_gallery_statistics_v1();
	return { stats };
};
