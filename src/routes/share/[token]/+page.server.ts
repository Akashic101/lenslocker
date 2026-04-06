import { error } from '@sveltejs/kit';
import {
	get_share_page_token_status,
	load_share_gallery_items
} from '$lib/server/services/share/share_link_service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const token = params.token;
	if (token == null || token === '') {
		error(404, { message: 'Not found', code: 'share_link_invalid' });
	}

	const status = await get_share_page_token_status(token);
	if (status.kind === 'expired') {
		error(410, { message: 'Gone', code: 'share_link_expired' });
	}
	if (status.kind === 'not_found') {
		error(404, { message: 'Not found', code: 'share_link_invalid' });
	}

	const { title, images } = await load_share_gallery_items(token, status.row);

	return {
		token,
		title,
		images,
		kind: status.row.kind
	};
};
