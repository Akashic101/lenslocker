import { load_statistics_page } from '$lib/server/services/statistics/statistics_service';
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user;
	if (user == null) error(401, 'Unauthorized');
	const stats = await load_statistics_page(user.id);
	return { stats };
};
