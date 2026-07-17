import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { verifyWebhookSignature } from '$lib/server/paymongo';
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

	/** @type {{ data?: { type?: string, data?: { id?: string, attributes?: Record<string, unknown> } } }} */
	let payload;
	try {
		payload = JSON.parse(rawBody);
	} catch {
		return json({ error: 'Invalid JSON' }, { status: 400 });
	}

	const eventType = payload?.data?.type;
	const session = payload?.data?.data;

	if (eventType === 'checkout_session.payment.paid' && session?.id) {
		const registration = await getRegistrationByCheckoutSession(session.id);
		if (registration && registration.status !== 'paid') {
			const attrs = session.attributes ?? {};
			const payments = /** @type {{ id?: string }[]} */ (attrs.payments ?? []);
			const paymentIntent = /** @type {{ id?: string } | null} */ (attrs.payment_intent ?? null);
			const paymentId = payments[0]?.id ?? paymentIntent?.id ?? null;

			await updateRegistration(registration.id, {
				status: 'paid',
				paidAt: new Date(),
				paymongoPaymentId: paymentId
			});
		}
	}

	return json({ received: true });
}
