import { sequence } from '@sveltejs/kit/hooks';
import { building } from '$app/environment';
import { auth } from '$lib/server/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { redirect, type Handle } from '@sveltejs/kit';
import { getTextDirection } from '$lib/paraglide/runtime';
import { paraglideMiddleware } from '$lib/paraglide/server';

const handleParaglide: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ request, locale }) => {
		event.request = request;

		return resolve(event, {
			transformPageChunk: ({ html }) =>
				html
					.replace('%paraglide.lang%', locale)
					.replace('%paraglide.dir%', getTextDirection(locale))
		});
	});

const handleBetterAuth: Handle = async ({ event, resolve }) => {
	const session = await auth.api.getSession({ headers: event.request.headers });

	if (session) {
		event.locals.session = session.session;
		event.locals.user = session.user;
	}

	return svelteKitHandler({ event, resolve, auth, building });
};

function safe_post_login_redirect(raw: string | null): string {
	if (raw == null || raw === '') return '/';
	if (!raw.startsWith('/') || raw.startsWith('//')) return '/';
	return raw;
}

/** Require a session for every route except `/start` and Better Auth API handlers. */
const handle_require_auth: Handle = async ({ event, resolve }) => {
	if (building) return resolve(event);

	const path = event.url.pathname;

	if (path === '/start' || path.startsWith('/start/')) {
		if (event.locals.user) {
			throw redirect(303, safe_post_login_redirect(event.url.searchParams.get('redirectTo')));
		}
		return resolve(event);
	}

	if (path.startsWith('/api/auth')) {
		return resolve(event);
	}

	if (!event.locals.user) {
		const return_url = `${path}${event.url.search}`;
		throw redirect(303, `/start?redirectTo=${encodeURIComponent(return_url)}`);
	}

	return resolve(event);
};

export const handle: Handle = sequence(handleParaglide, handleBetterAuth, handle_require_auth);
