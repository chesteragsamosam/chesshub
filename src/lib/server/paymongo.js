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
			Accept: 'application/json'
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
