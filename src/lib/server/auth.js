import { env } from '$env/dynamic/private';
import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getRequestEvent } from '$app/server';
import { db } from '$lib/server/db';
import { bindFacebookSocialLink } from '$lib/server/auth-social-bind';

/** @type {NonNullable<Parameters<typeof betterAuth>[0]['socialProviders']>} */
const socialProviders = {};

if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
	socialProviders.google = {
		clientId: env.GOOGLE_CLIENT_ID,
		clientSecret: env.GOOGLE_CLIENT_SECRET
	};
}

if (env.FACEBOOK_CLIENT_ID && env.FACEBOOK_CLIENT_SECRET) {
	socialProviders.facebook = {
		clientId: env.FACEBOOK_CLIENT_ID,
		clientSecret: env.FACEBOOK_CLIENT_SECRET
	};
}

/**
 * @param {{ providerId?: string | null, userId?: string | null, accountId?: string | null }} account
 */
async function maybeBindFacebook(account) {
	if (account.providerId !== 'facebook') return;
	try {
		await bindFacebookSocialLink(account.userId ?? '', account.accountId ?? '');
	} catch (error) {
		console.error('[auth] failed to bind Facebook social link', error);
	}
}

export const auth = betterAuth({
	baseURL: env.ORIGIN,
	secret: env.BETTER_AUTH_SECRET,
	database: drizzleAdapter(db, { provider: 'mysql' }),
	emailAndPassword: { enabled: true },
	socialProviders,
	account: {
		accountLinking: {
			enabled: true,
			trustedProviders: ['google', 'facebook']
		}
	},
	databaseHooks: {
		account: {
			create: {
				after: async (account) => {
					await maybeBindFacebook(account);
				}
			},
			update: {
				after: async (account) => {
					await maybeBindFacebook(account);
				}
			}
		}
	},
	user: {
		additionalFields: {
			role: {
				type: 'string',
				defaultValue: 'user',
				input: false
			},
			username: {
				type: 'string',
				required: false,
				input: false
			}
		}
	},
	plugins: [
		sveltekitCookies(getRequestEvent) // make sure this is the last plugin in the array
	]
});
