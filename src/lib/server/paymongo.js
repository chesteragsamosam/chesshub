import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '$env/dynamic/private';

const PAYMONGO_API = 'https://api.paymongo.com/v1';
const PAYMONGO_CHECKOUT_API = 'https://api.paymongo.com/v2';

export function isPaymongoConfigured() {
	return Boolean(env.PAYMONGO_SECRET_KEY);
}

/**
 * @param {string} path
 * @param {{ method?: string, body?: unknown, apiBase?: string }} [opts]
 */
async function paymongoFetch(path, opts = {}) {
	if (!env.PAYMONGO_SECRET_KEY) {
		throw new Error('PAYMONGO_SECRET_KEY is not set');
	}

	const apiBase = opts.apiBase ?? PAYMONGO_API;
	const auth = Buffer.from(`${env.PAYMONGO_SECRET_KEY}:`).toString('base64');
	const response = await fetch(`${apiBase}${path}`, {
		method: opts.method ?? 'GET',
		headers: {
			Authorization: `Basic ${auth}`,
			'Content-Type': 'application/json',
			Accept: 'application/json',
			// Harmless for api.paymongo.com; needed if a tunnel/proxy sits in front during local testing.
			'ngrok-skip-browser-warning': 'true'
		},
		body: opts.body != null ? JSON.stringify(opts.body) : undefined
	});

	const json = await response.json().catch(() => null);
	if (!response.ok) {
		const detail =
			json?.errors?.map(/** @param {{ detail?: string }} e */ (e) => e.detail).join('; ') ||
			response.statusText;
		throw new Error(`PayMongo API error (${response.status}): ${detail}`);
	}

	return json;
}

/**
 * @param {{
 *   tournament: { id: string, title: string, entryFeeCents: number, currency: string },
 *   registrationId: string,
 *   user: { id: string, email?: string | null, name?: string | null },
 *   successUrl: string,
 *   cancelUrl: string
 * }} opts
 */
export async function createCheckoutSession(opts) {
	const currency = (opts.tournament.currency || 'php').toUpperCase();
	if (currency !== 'PHP') {
		throw new Error('PayMongo only supports PHP currency');
	}

	const attributes = {
		line_items: [
			{
				name: opts.tournament.title,
				description: 'Tournament entry fee',
				amount: opts.tournament.entryFeeCents,
				currency: 'PHP',
				quantity: 1
			}
		],
		payment_method_types: ['gcash'],
		success_url: opts.successUrl,
		cancel_url: opts.cancelUrl,
		reference_number: opts.registrationId.slice(0, 36),
		send_email_receipt: Boolean(opts.user.email),
		metadata: {
			tournamentId: opts.tournament.id,
			registrationId: opts.registrationId,
			userId: opts.user.id
		}
	};

	if (opts.user.email || opts.user.name) {
		Object.assign(attributes, {
			billing: {
				name: opts.user.name || undefined,
				email: opts.user.email || undefined
			}
		});
	}

	const json = await paymongoFetch('/checkout_sessions', {
		method: 'POST',
		body: { data: { attributes } },
		apiBase: PAYMONGO_CHECKOUT_API
	});

	const session = json?.data;
	if (!session?.id || !session?.attributes?.checkout_url) {
		throw new Error('PayMongo did not return a checkout URL');
	}

	return {
		id: /** @type {string} */ (session.id),
		url: /** @type {string} */ (session.attributes.checkout_url)
	};
}

/**
 * @typedef {{
 *   id?: string,
 *   status?: string,
 *   attributes?: {
 *     status?: string,
 *     payments?: Array<{
 *       id?: string,
 *       status?: string,
 *       attributes?: { status?: string }
 *     }>,
 *     payment_intent?: {
 *       id?: string,
 *       status?: string,
 *       attributes?: { status?: string }
 *     } | null
 *   }
 * }} PaymongoCheckoutSession
 */

/**
 * @param {unknown} value
 */
function paymentStatus(value) {
	if (!value || typeof value !== 'object') return null;
	const row = /** @type {Record<string, any>} */ (value);
	return row.attributes?.status ?? row.status ?? null;
}

/**
 * Retrieve a checkout session (secret key). Tries v1 then v2.
 * @param {string} checkoutSessionId
 * @returns {Promise<PaymongoCheckoutSession | null>}
 */
export async function getCheckoutSession(checkoutSessionId) {
	// Official retrieve docs use v1; v2 create sessions are still readable there.
	for (const apiBase of [PAYMONGO_API, PAYMONGO_CHECKOUT_API]) {
		try {
			const json = await paymongoFetch(`/checkout_sessions/${checkoutSessionId}`, { apiBase });
			if (json?.data?.id) return /** @type {PaymongoCheckoutSession} */ (json.data);
		} catch {
			// try next base
		}
	}
	return null;
}

/**
 * @param {string} paymentIntentId
 * @returns {Promise<Record<string, any> | null>}
 */
export async function getPaymentIntent(paymentIntentId) {
	try {
		const json = await paymongoFetch(`/payment_intents/${paymentIntentId}`);
		return json?.data ?? null;
	} catch {
		return null;
	}
}

/**
 * @param {PaymongoCheckoutSession | null | undefined} session
 */
export function getPaidPaymentId(session) {
	const payments = session?.attributes?.payments ?? [];
	const paid = payments.find((payment) => paymentStatus(payment) === 'paid');
	return paid?.id ?? null;
}

/**
 * True when PayMongo reports the checkout as paid.
 * @param {PaymongoCheckoutSession | null | undefined} session
 * @param {Record<string, any> | null} [paymentIntent]
 */
export function isCheckoutSessionPaid(session, paymentIntent = null) {
	const payments = session?.attributes?.payments ?? [];
	if (payments.some((payment) => paymentStatus(payment) === 'paid')) return true;

	const intent = paymentIntent ?? session?.attributes?.payment_intent ?? null;
	const intentStatus = paymentStatus(intent);
	return intentStatus === 'succeeded' || intentStatus === 'paid';
}

/**
 * Poll PayMongo until the checkout shows paid (or attempts exhausted).
 * Covers the gap after GCash redirect before payments[] is populated.
 * @param {string} checkoutSessionId
 * @param {{ attempts?: number, delayMs?: number }} [opts]
 */
export async function waitForCheckoutPaid(checkoutSessionId, opts = {}) {
	const attempts = opts.attempts ?? 6;
	const delayMs = opts.delayMs ?? 700;

	for (let i = 0; i < attempts; i++) {
		const session = await getCheckoutSession(checkoutSessionId);
		let intent = null;
		const intentId = session?.attributes?.payment_intent?.id;
		if (intentId) {
			intent = await getPaymentIntent(intentId);
		}

		if (isCheckoutSessionPaid(session, intent)) {
			return { session, paymentIntent: intent, paid: true };
		}

		if (i < attempts - 1) {
			await new Promise((resolve) => setTimeout(resolve, delayMs));
		}
	}

	const session = await getCheckoutSession(checkoutSessionId);
	return { session, paymentIntent: null, paid: isCheckoutSessionPaid(session) };
}

/**
 * Verify PayMongo webhook signature (Paymongo-Signature header).
 * @param {string} rawBody
 * @param {string} signatureHeader
 * @param {string} webhookSecret
 * @returns {boolean}
 */
export function verifyWebhookSignature(rawBody, signatureHeader, webhookSecret) {
	const parts = Object.fromEntries(
		signatureHeader.split(',').map((part) => {
			const [key, ...rest] = part.split('=');
			return [key.trim(), rest.join('=').trim()];
		})
	);

	const timestamp = parts.t;
	const testSig = parts.te;
	const liveSig = parts.li;
	if (!timestamp) return false;

	const signedPayload = `${timestamp}.${rawBody}`;
	const expected = createHmac('sha256', webhookSecret).update(signedPayload).digest('hex');

	const candidates = [testSig, liveSig].filter(Boolean);
	return candidates.some((sig) => {
		try {
			const a = Buffer.from(expected);
			const b = Buffer.from(sig);
			return a.length === b.length && timingSafeEqual(a, b);
		} catch {
			return false;
		}
	});
}

/**
 * Normalize webhook body shapes PayMongo has used over time.
 * @param {unknown} payload
 * @returns {{ eventType: string | null, session: PaymongoCheckoutSession | null }}
 */
export function parseWebhookEvent(payload) {
	const root = /** @type {Record<string, any>} */ (payload ?? {});

	// Newest hosted-checkout style: { event_type, data: { type, data: session } }
	if (root?.event_type && root?.data?.type) {
		return {
			eventType: /** @type {string} */ (root.data.type),
			session: /** @type {PaymongoCheckoutSession | null} */ (root.data.data ?? null)
		};
	}

	// { data: { type, data: session } }
	if (root?.data?.type && root?.data?.type !== 'event' && root?.data?.data) {
		return {
			eventType: /** @type {string} */ (root.data.type),
			session: /** @type {PaymongoCheckoutSession} */ (root.data.data)
		};
	}

	// Classic event envelope: { data: { type: 'event', attributes: { type, data } } }
	const attrs = root?.data?.attributes;
	if (attrs?.type) {
		return {
			eventType: /** @type {string} */ (attrs.type),
			session: /** @type {PaymongoCheckoutSession | null} */ (attrs.data ?? null)
		};
	}

	return { eventType: null, session: null };
}
