import { redirect } from '@sveltejs/kit';
import { requireOrganizer } from '$lib/server/auth-guards';
import {
	getStripeConnectAccount,
	upsertStripeConnectAccount,
	updateStripeOnboardingStatus
} from '$lib/server/db/queries';
import {
	createConnectOnboarding,
	createConnectAccountLink,
	isConnectAccountReady,
	isStripeConfigured
} from '$lib/server/stripe';
import { env } from '$env/dynamic/private';

/** @type {import('./$types').PageServerLoad} */
export async function load(event) {
	const user = requireOrganizer(event);
	const stripeAccount = await getStripeConnectAccount(user.id);

	return {
		stripeAccount,
		stripeConfigured: isStripeConfigured(),
		returned: event.url.searchParams.get('return') === '1'
	};
}

export const actions = {
	connect: async (event) => {
		const user = requireOrganizer(event);

		if (!isStripeConfigured()) {
			return { message: 'Stripe is not configured' };
		}

		const origin = env.ORIGIN || event.url.origin;
		const returnUrl = `${origin}/organizer/stripe?return=1`;
		const refreshUrl = `${origin}/organizer/stripe`;

		let account = await getStripeConnectAccount(user.id);

		if (!account) {
			const created = await createConnectOnboarding({
				userId: user.id,
				email: user.email,
				returnUrl,
				refreshUrl
			});
			await upsertStripeConnectAccount({
				userId: user.id,
				stripeAccountId: created.accountId
			});
			redirect(303, created.url);
		}

		const link = await createConnectAccountLink(account.stripeAccountId, {
			returnUrl,
			refreshUrl
		});
		redirect(303, link.url);
	},

	refresh: async (event) => {
		const user = requireOrganizer(event);
		const account = await getStripeConnectAccount(user.id);
		if (!account || !isStripeConfigured()) {
			redirect(302, '/organizer/stripe');
		}

		const ready = await isConnectAccountReady(account.stripeAccountId);
		await updateStripeOnboardingStatus(user.id, ready);
		redirect(302, '/organizer/stripe');
	}
};
