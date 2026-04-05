import type { Reroute } from '@sveltejs/kit';
import { deLocalizeUrl } from '$lib/paraglide/runtime';

/** Normalize pathname for SvelteKit routing when URLs carry an optional locale prefix. */
export const reroute: Reroute = ({ url }) => deLocalizeUrl(url).pathname;
