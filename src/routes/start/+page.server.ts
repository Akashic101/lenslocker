import { fail, redirect } from '@sveltejs/kit';
import { APIError } from 'better-auth/api';
import { auth } from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

function safe_redirect_target(raw: string | null): string {
	if (raw == null || raw === '') return '/';
	if (!raw.startsWith('/') || raw.startsWith('//')) return '/';
	return raw;
}

export const load: PageServerLoad = ({ locals, url }) => {
	if (locals.user) {
		throw redirect(303, safe_redirect_target(url.searchParams.get('redirectTo')));
	}
	return { redirect_to: safe_redirect_target(url.searchParams.get('redirectTo')) };
};

export const actions: Actions = {
	sign_in_email: async (event) => {
		const form_data = await event.request.formData();
		const redirect_to = safe_redirect_target(form_data.get('redirectTo')?.toString() ?? null);
		const email = form_data.get('email')?.toString() ?? '';
		const password = form_data.get('password')?.toString() ?? '';

		try {
			await auth.api.signInEmail({
				body: { email, password, callbackURL: '/' },
				headers: event.request.headers
			});
		} catch (err) {
			if (err instanceof APIError) {
				return fail(400, { message: err.message || 'Sign in failed', redirect_to });
			}
			return fail(500, { message: 'Unexpected error', redirect_to });
		}

		throw redirect(303, redirect_to);
	},
	sign_up_email: async (event) => {
		const form_data = await event.request.formData();
		const redirect_to = safe_redirect_target(form_data.get('redirectTo')?.toString() ?? null);
		const email = form_data.get('email')?.toString() ?? '';
		const password = form_data.get('password')?.toString() ?? '';
		const name = form_data.get('name')?.toString().trim() || 'User';

		try {
			await auth.api.signUpEmail({
				body: { email, password, name, callbackURL: '/' },
				headers: event.request.headers
			});
		} catch (err) {
			if (err instanceof APIError) {
				return fail(400, { message: err.message || 'Could not create account', redirect_to });
			}
			return fail(500, { message: 'Unexpected error', redirect_to });
		}

		throw redirect(303, redirect_to);
	}
};
