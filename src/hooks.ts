import type { Reroute } from '@sveltejs/kit';
import { toLocale } from '$lib/paraglide/runtime';

/**
 * With locale-agnostic Paraglide URL patterns, `deLocalizeUrl` no longer strips `/de/...`.
 * Still strip a leading locale segment so old links and any stray prefixes resolve correctly.
 */
function pathname_without_locale_prefix(pathname: string): string {
	const segments = pathname.split('/').filter(Boolean);
	const first = segments[0];
	if (first && toLocale(first)) {
		const rest = segments.slice(1).join('/');
		return rest ? `/${rest}` : '/';
	}
	return pathname;
}

export const reroute: Reroute = ({ url }) => pathname_without_locale_prefix(url.pathname);
