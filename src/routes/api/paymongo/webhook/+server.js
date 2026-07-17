import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import {
	verifyWebhookSignature,
	parseWebhookEvent,
	getPaidPaymentId,
	isCheckoutSessionPaid
} from '$lib/server/paymongo';
import { getRegistrationByCheckoutSession, updateRegistration } from '$lib/server/db/queries';

/** @type {import('./$types').RequestHandler} */
export async function POST(event) {
	const signature = event.request.headers.get('paymongo-signature');

	if (!signature || !env.PAYMONGO_WEBHOOK_SECRET) {
		return json({ error: 'Webhook not configured' }, { status: 400 });
	}

	const rawBody = await event.request.text();

	if (!verifyWebhookSignature(rawBody, signature, env.PAYMONGO_WEBHOOK_SECRET)) {
		return json({ error: 'Invalid signature' }, { status: 400 });
	}

	/** @type {unknown} */
	let payload;
	try {
		payload = JSON.parse(rawBody);
	} catch {
		return json({ error: 'Invalid JSON' }, { status: 400 });
	}

	const { eventType, session } = parseWebhookEvent(payload);

	if (eventType === 'checkout_session.payment.paid' && session?.id) {
		const registration = await getRegistrationByCheckoutSession(session.id);
		if (registration && registration.status !== 'paid') {
			await updateRegistration(registration.id, {
				status: 'paid',
				paidAt: new Date(),
				paymongoPaymentId: getPaidPaymentId(session)
			});
		}
	} else if (
		eventType === 'payment.paid' &&
		session &&
		isCheckoutSessionPaid(session) &&
		session.id
	) {
		// Rare: payment payload that still embeds checkout payments
		const registration = await getRegistrationByCheckoutSession(session.id);
		if (registration && registration.status !== 'paid') {
			await updateRegistration(registration.id, {
				status: 'paid',
				paidAt: new Date(),
				paymongoPaymentId: getPaidPaymentId(session)
			});
		}
	}

	return json({ received: true });
}
