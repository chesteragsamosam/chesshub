import { json } from '@sveltejs/kit';
import { getStripe } from '$lib/server/stripe';
import {
	getRegistrationByCheckoutSession,
	updateRegistration,
	getStripeConnectAccountByStripeId,
	updateStripeOnboardingStatus
} from '$lib/server/db/queries';
import { env } from '$env/dynamic/private';

/** @type {import('./$types').RequestHandler} */
export async function POST(event) {
	const stripe = getStripe();
	const signature = event.request.headers.get('stripe-signature');

	if (!signature || !env.STRIPE_WEBHOOK_SECRET) {
		return json({ error: 'Webhook not configured' }, { status: 400 });
	}

	const rawBody = await event.request.text();

	/** @type {import('stripe').Stripe.Event} */
	let stripeEvent;
	try {
		stripeEvent = stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
	} catch {
		return json({ error: 'Invalid signature' }, { status: 400 });
	}

	switch (stripeEvent.type) {
		case 'checkout.session.completed': {
			const session = /** @type {import('stripe').Stripe.Checkout.Session} */ (
				stripeEvent.data.object
			);
			const registration = await getRegistrationByCheckoutSession(session.id);
			if (registration && registration.status !== 'paid') {
				await updateRegistration(registration.id, {
					status: 'paid',
					paidAt: new Date(),
					stripePaymentIntentId:
						typeof session.payment_intent === 'string'
							? session.payment_intent
							: session.payment_intent?.id ?? null
				});
			}
			break;
		}
		case 'account.updated': {
			const account = /** @type {import('stripe').Stripe.Account} */ (stripeEvent.data.object);
			const row = await getStripeConnectAccountByStripeId(account.id);
			if (row) {
				const ready = Boolean(account.charges_enabled && account.payouts_enabled);
				await updateStripeOnboardingStatus(row.userId, ready);
			}
			break;
		}
		default:
			break;
	}

	return json({ received: true });
}
