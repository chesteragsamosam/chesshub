import { env } from '$env/dynamic/private';
import Stripe from 'stripe';

/** @type {Stripe | null} */
let stripeClient = null;

export function isStripeConfigured() {
	return Boolean(env.STRIPE_SECRET_KEY);
}

export function getStripe() {
	if (!env.STRIPE_SECRET_KEY) {
		throw new Error('STRIPE_SECRET_KEY is not set');
	}
	if (!stripeClient) {
		stripeClient = new Stripe(env.STRIPE_SECRET_KEY);
	}
	return stripeClient;
}

/**
 * @param {{
 *   tournament: { id: string, title: string, entryFeeCents: number, currency: string },
 *   registrationId: string,
 *   user: { id: string, email?: string | null },
 *   stripeAccountId: string,
 *   successUrl: string,
 *   cancelUrl: string,
 *   applicationFeeCents?: number
 * }} opts
 */
export async function createCheckoutSession(opts) {
	const stripe = getStripe();
	const applicationFee =
		opts.applicationFeeCents ??
		Math.round(opts.tournament.entryFeeCents * 0.05);

	return stripe.checkout.sessions.create({
		mode: 'payment',
		customer_email: opts.user.email ?? undefined,
		line_items: [
			{
				quantity: 1,
				price_data: {
					currency: opts.tournament.currency.toLowerCase(),
					unit_amount: opts.tournament.entryFeeCents,
					product_data: {
						name: opts.tournament.title,
						description: 'Tournament entry fee'
					}
				}
			}
		],
		payment_intent_data: {
			application_fee_amount: applicationFee > 0 ? applicationFee : undefined,
			transfer_data: {
				destination: opts.stripeAccountId
			}
		},
		success_url: opts.successUrl,
		cancel_url: opts.cancelUrl,
		metadata: {
			tournamentId: opts.tournament.id,
			registrationId: opts.registrationId,
			userId: opts.user.id
		},
		integration_identifier: `chesshub_entry_${randomSuffix()}`
	});
}

/**
 * Create a Connect Express account and return an Account Link URL.
 * @param {{ userId: string, email?: string | null, returnUrl: string, refreshUrl: string }} opts
 */
export async function createConnectOnboarding(opts) {
	const stripe = getStripe();

	const account = await stripe.accounts.create({
		type: 'express',
		email: opts.email ?? undefined,
		capabilities: {
			card_payments: { requested: true },
			transfers: { requested: true }
		},
		metadata: { userId: opts.userId }
	});

	const link = await stripe.accountLinks.create({
		account: account.id,
		refresh_url: opts.refreshUrl,
		return_url: opts.returnUrl,
		type: 'account_onboarding'
	});

	return { accountId: account.id, url: link.url };
}

/**
 * @param {string} accountId
 * @param {{ returnUrl: string, refreshUrl: string }} urls
 */
export async function createConnectAccountLink(accountId, urls) {
	const stripe = getStripe();
	return stripe.accountLinks.create({
		account: accountId,
		refresh_url: urls.refreshUrl,
		return_url: urls.returnUrl,
		type: 'account_onboarding'
	});
}

/**
 * @param {string} accountId
 */
export async function isConnectAccountReady(accountId) {
	const stripe = getStripe();
	const account = await stripe.accounts.retrieve(accountId);
	return Boolean(account.charges_enabled && account.payouts_enabled);
}

function randomSuffix() {
	const chars = 'abcdefghijklmnopqrstuvwxyz';
	let out = '';
	for (let i = 0; i < 8; i++) {
		out += chars[Math.floor(Math.random() * chars.length)];
	}
	return out;
}
