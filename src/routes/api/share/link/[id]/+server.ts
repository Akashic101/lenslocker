import { error } from '@sveltejs/kit';
import { delete_share_link_for_user } from '$lib/server/services/share/share_link_service';
import type { RequestHandler } from './$types';

const uuid_re = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const DELETE: RequestHandler = async ({ params, locals }) => {
	const user = locals.user;
	if (user == null) error(401, 'Unauthorized');

	const id = params.id;
	if (id == null || !uuid_re.test(id)) error(400, 'Invalid id');

	const ok = await delete_share_link_for_user(id, user.id);
	if (!ok) error(404, 'Not found');

	return new Response(null, { status: 204 });
};
