import { env } from '$env/dynamic/private';
import { fail, isRedirect, redirect } from '@sveltejs/kit';
import { APIError } from 'better-auth/api';
import { auth } from '$lib/server/auth';

/**
 * Which social login providers are configured via env credentials.
 */
export function getEnabledSocialProviders() {
	return {
		google: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
		facebook: Boolean(env.FACEBOOK_CLIENT_ID && env.FACEBOOK_CLIENT_SECRET)
	};
}

/**
 * Start a Better Auth social sign-in and redirect to the provider.
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @param {'google' | 'facebook'} provider
 * @param {{ errorPath?: string }} [opts]
 */
export async function startSocialSignIn(event, provider, opts = {}) {
	const enabled = getEnabledSocialProviders();
	if (!enabled[provider]) {
		return fail(400, { message: `${provider} login is not configured` });
	}

	const errorPath = opts.errorPath ?? '/login';

	try {
		const result = await auth.api.signInSocial({
			body: {
				provider,
				callbackURL: '/',
				errorCallbackURL: `${errorPath}?error=oauth`
			},
			headers: event.request.headers
		});

		if (result?.url) {
			redirect(302, result.url);
		}

		return fail(500, { message: 'Could not start social sign-in' });
	} catch (error) {
		if (isRedirect(error)) throw error;
		if (error instanceof APIError) {
			return fail(400, { message: error.message || 'Social sign-in failed' });
		}
		console.error(`[auth] ${provider} sign-in failed`, error);
		return fail(500, { message: 'Unexpected error starting social sign-in' });
	}
}
