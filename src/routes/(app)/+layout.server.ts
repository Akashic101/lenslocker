import { gallery_active_upload_count_depends_key } from '$lib/cache/gallery_upload_count_cache';
import { m } from '$lib/paraglide/messages.js';
import { extractLocaleFromRequest } from '$lib/paraglide/runtime';
import { count_non_archived_raw_uploads } from '$lib/server/services/gallery/gallery_service';
import type { LayoutServerLoad } from './$types';
import { error } from '@sveltejs/kit';

type user_for_initials = { name?: string | null; email?: string | null };

function derive_user_initials(user: user_for_initials | undefined): string {
	if (!user) return '?';
	const name = user.name?.trim();
	if (name) {
		const parts = name.split(/\s+/).filter((p: string) => p.length > 0);
		if (parts.length >= 2) {
			return (parts[0]![0] + parts[parts.length - 1]![0]).toUpperCase();
		}
		if (parts.length === 1 && parts[0]!.length >= 2) {
			return parts[0]!.slice(0, 2).toUpperCase();
		}
		if (parts.length === 1) {
			return parts[0]!.slice(0, 1).toUpperCase();
		}
	}
	const email = user.email?.trim();
	if (email) {
		const local = email.split('@')[0] ?? email;
		if (local.length >= 2) return local.slice(0, 2).toUpperCase();
		return local.slice(0, 1).toUpperCase();
	}
	return '?';
}

export const load: LayoutServerLoad = async ({ depends, locals, request }) => {
	depends(gallery_active_upload_count_depends_key);

	const user = locals.user;
	if (user == null) error(401, 'Unauthorized');
	const gallery_active_upload_count = await count_non_archived_raw_uploads(user.id);
	const locale = extractLocaleFromRequest(request);
	const brand_fallback = m.clever_quiet_eagle_brand_lenslocker({}, { locale });

	return {
		gallery_active_upload_count,
		user_initials: derive_user_initials(locals.user),
		user_label: locals.user?.name?.trim() || locals.user?.email || brand_fallback
	};
};
