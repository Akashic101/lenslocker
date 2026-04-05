import { load_statistics_page } from '$lib/server/services/statistics/statistics_service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const stats = await load_statistics_page();
	return { stats };
};
