import { json, error } from '@sveltejs/kit';
import { list_share_links_for_resource } from '$lib/server/services/share/share_link_service';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	const user = locals.user;
	if (user == null) error(401, 'Unauthorized');

	const album_id = url.searchParams.get('album_id');
	const raw_upload_id = url.searchParams.get('raw_upload_id');
	const has_album = album_id != null && album_id !== '';
	const has_upload = raw_upload_id != null && raw_upload_id !== '';
	if (has_album === has_upload) {
		error(400, 'Provide exactly one of album_id or raw_upload_id');
	}

	const kind = has_album ? ('album' as const) : ('raw_upload' as const);
	const links = await list_share_links_for_resource({
		user_id: user.id,
		kind,
		album_id: has_album ? album_id : null,
		raw_upload_id: has_upload ? raw_upload_id : null
	});

	return json({ links });
};
