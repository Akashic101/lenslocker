import { dev } from '$app/environment';
import { getRequestEvent } from '$app/server';
import { env } from '$env/dynamic/private';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { betterAuth } from 'better-auth/minimal';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { db, register_on_sqlite_rebind } from '$lib/server/db';

const resolved_origin = env.ORIGIN?.trim();
const base_url =
	resolved_origin && resolved_origin.length > 0
		? resolved_origin
		: dev
			? 'http://localhost:5173'
			: '';

function create_auth_instance() {
	return betterAuth({
		baseURL: base_url,
		secret: env.BETTER_AUTH_SECRET,
		database: drizzleAdapter(db, { provider: 'sqlite' }),
		emailAndPassword: {
			enabled: true,
			requireEmailVerification: false
		},
		plugins: [
			sveltekitCookies(getRequestEvent) // make sure this is the last plugin in the array
		]
	});
}

export let auth = create_auth_instance();

register_on_sqlite_rebind(() => {
	auth = create_auth_instance();
});
