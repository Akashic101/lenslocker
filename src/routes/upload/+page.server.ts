import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => ({
	just_uploaded: url.searchParams.get('uploaded') === '1'
});
