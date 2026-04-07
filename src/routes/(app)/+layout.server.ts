import { general_display_settings_depends_key } from '$lib/cache/general_display_settings_cache';
import { gallery_active_upload_count_depends_key } from '$lib/cache/gallery_upload_count_cache';
import { m } from '$lib/paraglide/messages.js';
import { extractLocaleFromRequest } from '$lib/paraglide/runtime';
import { count_non_archived_raw_uploads } from '$lib/server/services/gallery/gallery_service';
import { get_general_display_settings } from '$lib/server/services/settings/general_display_settings';
import type { LayoutServerLoad } from './$types';

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
	depends(general_display_settings_depends_key);

	const [gallery_active_upload_count, general_display_settings] = await Promise.all([
		count_non_archived_raw_uploads(),
		get_general_display_settings()
	]);
	const locale = extractLocaleFromRequest(request);
	const brand_fallback = m.clever_quiet_eagle_brand_lenslocker({}, { locale });

	return {
		gallery_active_upload_count,
		general_display_settings,
		user_initials: derive_user_initials(locals.user),
		user_label: locals.user?.name?.trim() || locals.user?.email || brand_fallback
	};
};
