import { requireOrganizer } from '$lib/server/auth-guards';
import {
	getTournamentsByOrganizer,
	getStripeConnectAccount
} from '$lib/server/db/queries';
import { isStripeConfigured } from '$lib/server/stripe';

/** @type {import('./$types').PageServerLoad} */
export async function load(event) {
	const user = requireOrganizer(event);
	const [tournaments, stripeAccount] = await Promise.all([
		getTournamentsByOrganizer(user.id),
		getStripeConnectAccount(user.id)
	]);

	return {
		tournaments,
		stripeAccount,
		stripeConfigured: isStripeConfigured()
	};
}
