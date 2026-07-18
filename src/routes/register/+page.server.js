import { fail, redirect } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';
import { APIError } from 'better-auth/api';
import { getEnabledSocialProviders, startSocialSignIn } from '$lib/server/auth-social';

/**
 * @param {string} email
 */
function placeholderNameFromEmail(email) {
	const local = email.split('@')[0]?.trim() ?? '';
	const cleaned = local
		.replace(/[^a-zA-Z0-9._ -]/g, '')
		.replace(/[._-]+/g, ' ')
		.trim();
	if (!cleaned) return 'Player';
	return cleaned.slice(0, 255);
}

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

		if (!email || !password) {
			return fail(400, { message: 'Email and password are required', email });
		}

		const name = placeholderNameFromEmail(email);

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
				return fail(400, { message: error.message || 'Registration failed', email });
			}
			return fail(500, { message: 'Unexpected error', email });
		}

		redirect(302, '/');
	},

	google: async (event) => startSocialSignIn(event, 'google', { errorPath: '/register' }),

	facebook: async (event) => startSocialSignIn(event, 'facebook', { errorPath: '/register' })
};
