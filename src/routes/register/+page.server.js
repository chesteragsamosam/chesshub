import { fail, redirect } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';
import { APIError } from 'better-auth/api';
import { getEnabledSocialProviders, startSocialSignIn } from '$lib/server/auth-social';

/** @type {import('./$types').PageServerLoad} */
export const load = (event) => {
	if (event.locals.user) {
		redirect(302, '/');
	}

	const oauthError = event.url.searchParams.get('error') === 'oauth';
	return {
		socialProviders: getEnabledSocialProviders(),
		oauthError
	};
};

export const actions = {
	default: async (event) => {
		const formData = await event.request.formData();
		const email = formData.get('email')?.toString() ?? '';
		const password = formData.get('password')?.toString() ?? '';
		const name = formData.get('name')?.toString() ?? '';

		if (!email || !password || !name) {
			return fail(400, { message: 'Name, email, and password are required', email, name });
		}

		try {
			await auth.api.signUpEmail({
				body: {
					email,
					password,
					name,
					callbackURL: '/auth/verification-success'
				}
			});
		} catch (error) {
			if (error instanceof APIError) {
				return fail(400, { message: error.message || 'Registration failed', email, name });
			}
			return fail(500, { message: 'Unexpected error', email, name });
		}

		redirect(302, '/');
	},

	google: async (event) => startSocialSignIn(event, 'google', { errorPath: '/register' }),

	facebook: async (event) => startSocialSignIn(event, 'facebook', { errorPath: '/register' })
};
