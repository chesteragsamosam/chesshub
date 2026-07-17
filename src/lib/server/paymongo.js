import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '$env/dynamic/private';

const PAYMONGO_API = 'https://api.paymongo.com/v1';
const PAYMONGO_CHECKOUT_API = 'https://api.paymongo.com/v2';

export function isPaymongoConfigured() {
	return Boolean(env.PAYMONGO_SECRET_KEY);
}

export function isPaymongoDisbursementConfigured() {
	return Boolean(
		env.PAYMONGO_SECRET_KEY &&
		env.PAYMONGO_WALLET_ACCOUNT_NUMBER &&
		env.PAYMONGO_WALLET_ACCOUNT_NAME
	);
}

/**
 * Structured PayMongo API failure (safe for logs; map with `toPayerFacingMessage` before UI).
 */
export class PaymongoApiError extends Error {
	/**
	 * @param {{ status: number, codes?: string[], detail?: string }} opts
	 */
	constructor(opts) {
		super(opts.detail || `PayMongo request failed (${opts.status})`);
		this.name = 'PaymongoApiError';
		this.status = opts.status;
		this.codes = opts.codes ?? [];
		this.detail = opts.detail ?? '';
	}
}

/**
 * Plain-language copy for payers / prize claimants. Never expose API codes or HTTP status.
 * @param {unknown} err
 * @param {'checkout' | 'payout'} kind
 */
export function toPayerFacingMessage(err, kind = 'checkout') {
	const text = err instanceof Error ? err.message : String(err ?? '');
	const lower = text.toLowerCase();
	const codes =
		err instanceof PaymongoApiError
			? err.codes.map((code) => code.toLowerCase())
			: [];
	const haystack = `${codes.join(' ')} ${lower}`;

	if (kind === 'payout') {
		if (
			/ac01|invalid account|account does not exist|invalid.*number|mobile|recipient/i.test(
				haystack
			)
		) {
			return 'That GCash account could not be reached. Double-check the name and mobile number, then try again.';
		}
		if (/insufficient|not enough|balance|fund/i.test(haystack)) {
			return 'Prize payouts are temporarily unavailable. Please try again later or contact the organizer.';
		}
		if (/gcash is not available|receiving institution/i.test(haystack)) {
			return 'GCash payouts are temporarily unavailable. Please try again later.';
		}
		if (/between php|amount|limit|50,?000|exceed/i.test(haystack)) {
			return 'This prize amount cannot be sent via GCash. Please contact the organizer.';
		}
		if (/not configured|secret_key|wallet/i.test(haystack)) {
			return 'Prize payouts are not available yet. Please contact the organizer.';
		}
		return 'We could not send your prize. Check your GCash details and try again. If it keeps failing, contact the organizer.';
	}

	if (
		/payment_method_not_allowed|account_not_activated|not allowed|not enabled|not activated/i.test(
			haystack
		)
	) {
		return 'GCash and QR Ph are not available for this event right now. Please try again later or contact the organizer.';
	}
	if (/amount_exceed|exceed.*limit|amount/i.test(haystack) && /limit|exceed/i.test(haystack)) {
		return 'This entry fee is above the online payment limit. Please contact the organizer.';
	}
	if (/currency|php/i.test(haystack) && /support|only|must/i.test(haystack)) {
		return 'This tournament can only accept payments in Philippine pesos (PHP).';
	}
	if (
		/unauthorized|forbidden|authentication|secret_key is not set|401|403/i.test(haystack) ||
		(err instanceof PaymongoApiError && (err.status === 401 || err.status === 403))
	) {
		return 'Online payments are temporarily unavailable. Please try again later or contact the organizer.';
	}
	if (
		/network|fetch failed|econnrefused|etimedout|503|502|504|500/i.test(haystack) ||
		(err instanceof PaymongoApiError && err.status >= 500)
	) {
		return 'We could not reach the payment service. Please try again in a moment.';
	}
	return 'We could not start your payment. Please try again. If it keeps happening, contact the organizer.';
}

/**
 * @param {string} path
 * @param {{ method?: string, body?: unknown, apiBase?: string, headers?: Record<string, string> }} [opts]
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
			'ngrok-skip-browser-warning': 'true',
			...opts.headers
		},
		body: opts.body != null ? JSON.stringify(opts.body) : undefined
	});

	const json = await response.json().catch(() => null);
	if (!response.ok) {
		/** @type {Array<{ code?: string, detail?: string }>} */
		const errors = Array.isArray(json?.errors) ? json.errors : [];
		const detail =
			errors.map((e) => e.detail).filter(Boolean).join('; ') || response.statusText;
		const codes = errors.map((e) => e.code).filter(Boolean);
		throw new PaymongoApiError({
			status: response.status,
			codes: /** @type {string[]} */ (codes),
			detail
		});
	}

	return json;
}

let institutionsCache =
	/** @type {{ expiresAt: number, rows: Array<Record<string, any>> } | null} */ (null);

async function listInstapayInstitutions() {
	if (institutionsCache && institutionsCache.expiresAt > Date.now()) {
		return institutionsCache.rows;
	}
	const json = await paymongoFetch('/wallets/receiving_institutions?provider=instapay');
	const rawRows = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
	const rows = rawRows.map(
		/** @param {Record<string, any>} row */ (row) => ({ ...row, ...(row.attributes ?? {}) })
	);
	institutionsCache = { expiresAt: Date.now() + 10 * 60 * 1000, rows };
	return rows;
}

async function getGcashInstitutionBic() {
	const rows = await listInstapayInstitutions();
	const gcash = rows.find((row) =>
		/gcash|g-xchange|gxchange/i.test(
			String(row.name ?? row.bank_name ?? row.provider_name ?? row.institution_name ?? '')
		)
	);
	const bic = gcash?.provider_code ?? gcash?.bank_code ?? gcash?.bic;
	if (!bic) throw new Error('GCash is not available in PayMongo receiving institutions');
	return String(bic);
}

/**
 * @param {string} value
 */
export function normalizePhilippineMobile(value) {
	const digits = value.replace(/\D/g, '');
	if (/^09\d{9}$/.test(digits)) return digits;
	if (/^639\d{9}$/.test(digits)) return `0${digits.slice(2)}`;
	return null;
}

/**
 * @param {string} mobile
 */
export function maskPhilippineMobile(mobile) {
	return `${mobile.slice(0, 4)}•••${mobile.slice(-4)}`;
}

/**
 * @param {{
 *   claimId: string,
 *   amountCents: number,
 *   recipientName: string,
 *   mobileNumber: string,
 *   callbackUrl: string,
 *   idempotencyKey: string
 * }} opts
 */
export async function createGcashDisbursement(opts) {
	if (!isPaymongoDisbursementConfigured()) {
		throw new Error('PayMongo Wallet disbursements are not configured');
	}
	if (opts.amountCents < 1 || opts.amountCents > 5_000_000) {
		throw new Error('GCash InstaPay prizes must be between PHP 0.01 and PHP 50,000');
	}

	const bic = await getGcashInstitutionBic();
	const json = await paymongoFetch('/batch_transfers', {
		method: 'POST',
		apiBase: PAYMONGO_CHECKOUT_API,
		headers: { 'Idempotency-Key': opts.idempotencyKey },
		body: {
			transfers: [
				{
					source_account: {
						number: env.PAYMONGO_WALLET_ACCOUNT_NUMBER,
						name: env.PAYMONGO_WALLET_ACCOUNT_NAME,
						bic: 'PAEYPHM2XXX'
					},
					destination_account: {
						number: opts.mobileNumber,
						name: opts.recipientName,
						bic
					},
					amount: opts.amountCents,
					currency: 'PHP',
					provider: 'instapay',
					description: `ChessHub prize ${opts.claimId}`,
					callback_url: opts.callbackUrl,
					metadata: { claimId: opts.claimId }
				}
			]
		}
	});

	const transfers = json?.transfers ?? json?.data?.transfers ?? json?.data?.attributes?.transfers;
	const transfer = Array.isArray(transfers) ? transfers[0] : null;
	const attributes = transfer?.attributes ?? transfer ?? {};
	const id = transfer?.id ?? attributes.id;
	if (!id) throw new Error('PayMongo did not return a transfer ID');
	return {
		id: String(id),
		status: String(attributes.status ?? 'pending'),
		referenceNumber: attributes.reference_number ? String(attributes.reference_number) : null
	};
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
		payment_method_types: ['gcash', 'qrph'],
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
 * @param {PaymongoCheckoutSession | null | undefined} session
 */
export function getPaidPaymentId(session) {
	const payments = session?.attributes?.payments ?? [];
	const paid = payments.find((payment) => paymentStatus(payment) === 'paid');
	if (paid?.id) return paid.id;
	return session?.attributes?.payment_intent?.id ?? null;
}

/**
 * @param {PaymongoCheckoutSession | null | undefined} session
 */
export function isCheckoutSessionPaid(session) {
	const payments = session?.attributes?.payments ?? [];
	if (payments.some((payment) => paymentStatus(payment) === 'paid')) return true;

	const intentStatus = paymentStatus(session?.attributes?.payment_intent ?? null);
	return intentStatus === 'succeeded' || intentStatus === 'paid';
}

/**
 * @param {string} sessionId
 */
export async function retrieveCheckoutSession(sessionId) {
	// Create uses /v2; retrieve is only documented on /v1.
	const json = await paymongoFetch(`/checkout_sessions/${sessionId}`, {
		apiBase: PAYMONGO_API
	});
	return /** @type {PaymongoCheckoutSession | null} */ (json?.data ?? null);
}

/**
 * @param {unknown} payment
 */
function paymentSourceType(payment) {
	if (!payment || typeof payment !== 'object') return '';
	const row = /** @type {Record<string, any>} */ (payment);
	const attrs = row.attributes ?? row;
	return String(
		attrs.source?.type ?? attrs.source_type ?? attrs.type ?? row.source?.type ?? ''
	).toLowerCase();
}

/**
 * @param {unknown} payment
 */
function paymentFailedCode(payment) {
	if (!payment || typeof payment !== 'object') return '';
	const row = /** @type {Record<string, any>} */ (payment);
	const attrs = row.attributes ?? row;
	return String(
		attrs.failed_code ?? attrs.code ?? attrs.last_payment_error?.failed_code ?? ''
	).toUpperCase();
}

/**
 * Classify a checkout session for payer-facing status banners.
 * @param {PaymongoCheckoutSession | null | undefined} session
 * @returns {'paid' | 'expired' | 'failed' | 'pending' | 'unknown'}
 */
export function interpretCheckoutSession(session) {
	if (!session) return 'unknown';
	if (isCheckoutSessionPaid(session)) return 'paid';

	const attrs = session.attributes ?? {};
	const sessionStatus = String(attrs.status ?? session.status ?? '').toLowerCase();
	if (sessionStatus === 'expired') return 'expired';

	const payments = attrs.payments ?? [];
	const statuses = payments.map((payment) => String(paymentStatus(payment) ?? '').toLowerCase());
	const methodTypes = (attrs.payment_method_types ?? []).map((/** @type {unknown} */ t) =>
		String(t).toLowerCase()
	);
	const usedQrph =
		methodTypes.includes('qrph') || payments.some((payment) => paymentSourceType(payment) === 'qrph');

	const intent = attrs.payment_intent;
	const intentRow =
		intent && typeof intent === 'object' ? /** @type {Record<string, any>} */ (intent) : null;
	const intentAttrs = intentRow?.attributes ?? intentRow ?? {};
	const intentStatus = String(paymentStatus(intent) ?? '').toLowerCase();
	const lastError =
		intentAttrs.last_payment_error ??
		attrs.last_payment_error ??
		payments
			.map((payment) => {
				const row = /** @type {Record<string, any>} */ (payment);
				return row.attributes?.last_payment_error ?? row.last_payment_error ?? null;
			})
			.find(Boolean) ??
		null;
	const failedCode = String(
		lastError?.failed_code ??
			lastError?.code ??
			lastError?.provider_error_code ??
			attrs.failed_code ??
			payments.map((payment) => paymentFailedCode(payment)).find(Boolean) ??
			''
	).toUpperCase();
	const failedMessage = String(
		lastError?.failed_message ??
			lastError?.detail ??
			lastError?.message ??
			lastError?.provider_error ??
			attrs.failed_message ??
			''
	);
	const errorText = `${failedCode} ${failedMessage} ${intentStatus} ${sessionStatus}`.toLowerCase();

	// QR Ph / checkout timeouts often arrive as failed_code CLOSED or unpaid qrph payments.
	if (
		failedCode === 'CLOSED' ||
		/expir|timeout|timed out|qrph\.expired|transaction_expired/i.test(errorText) ||
		statuses.some((status) => status === 'expired')
	) {
		return 'expired';
	}
	if (
		usedQrph &&
		payments.length > 0 &&
		!statuses.some((status) => status === 'paid' || status === 'processing')
	) {
		return 'expired';
	}

	const createdAt = Number(attrs.created_at ?? session.created_at);
	if (
		Number.isFinite(createdAt) &&
		createdAt > 1_000_000_000 &&
		Date.now() / 1000 - createdAt >= 30 * 60 &&
		usedQrph
	) {
		return 'expired';
	}

	if (statuses.some((status) => status === 'failed' || status === 'cancelled')) return 'failed';
	if (lastError || intentStatus === 'failed' || /fail|decline|reject|rjct/i.test(errorText)) {
		return 'failed';
	}
	if (intentStatus === 'processing' || statuses.some((status) => status === 'processing')) {
		return 'pending';
	}
	// A non-QR payment was attempted but never paid.
	if (payments.length > 0 && !statuses.some((status) => status === 'paid')) {
		return usedQrph ? 'expired' : 'failed';
	}
	return 'pending';
}

/**
 * @param {'paid' | 'confirming' | 'cancelled' | 'failed' | 'expired' | null | undefined} outcome
 * @returns {{ tone: 'success' | 'warning' | 'error', title: string, body: string } | null}
 */
export function checkoutNoticeForOutcome(outcome) {
	switch (outcome) {
		case 'paid':
			return {
				tone: 'success',
				title: 'Payment successful',
				body: 'You are registered for this tournament.'
			};
		case 'confirming':
			return {
				tone: 'warning',
				title: 'Payment confirming',
				body: 'We’re still confirming your payment. This page updates automatically — usually within a few seconds. If nothing changes, refresh or start a new payment.'
			};
		case 'cancelled':
			return {
				tone: 'warning',
				title: 'Payment cancelled',
				body: 'You left checkout without finishing. Your spot isn’t reserved yet — tap Pay with GCash or QR Ph to try again.'
			};
		case 'failed':
			return {
				tone: 'error',
				title: 'Payment failed',
				body: 'Your payment did not go through, so you were not charged. Tap Pay with GCash or QR Ph to try again with the same or another method.'
			};
		case 'expired':
			return {
				tone: 'error',
				title: 'Payment expired',
				body: 'This payment timed out (common with QR Ph after about 30 minutes). Tap Pay with GCash or QR Ph to start a fresh payment.'
			};
		default:
			return null;
	}
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
 * @param {'failed' | 'expired'} outcome
 */
export function checkoutOutcomeMarker(outcome) {
	return `outcome:${outcome}`;
}

/**
 * @param {string | null | undefined} paymentId
 * @returns {'failed' | 'expired' | null}
 */
export function readCheckoutOutcomeMarker(paymentId) {
	if (!paymentId?.startsWith('outcome:')) return null;
	const value = paymentId.slice('outcome:'.length);
	if (value === 'failed' || value === 'expired') return value;
	return null;
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
		const typed =
			typeof root.event_type === 'string' && root.event_type.includes('.')
				? root.event_type
				: root.data.type;
		return {
			eventType: /** @type {string} */ (typed),
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

/**
 * Extract outward transfer status from standard PayMongo events or callback payloads.
 * @param {unknown} payload
 */
export function parseTransferWebhookEvent(payload) {
	const root = /** @type {Record<string, any>} */ (payload ?? {});
	const eventAttrs = root?.data?.attributes;
	const eventType =
		root?.event_type ??
		(eventAttrs?.type && root?.data?.type === 'event' ? eventAttrs.type : null) ??
		(root?.data?.type?.startsWith?.('transfer.') ? root.data.type : null);
	const transfer =
		eventAttrs?.data ??
		(root?.data?.type === 'event' ? null : root?.data) ??
		root?.transfer ??
		null;
	if (!transfer || typeof transfer !== 'object') return null;

	const attributes = transfer.attributes ?? transfer;
	const id = transfer.id ?? attributes.id ?? attributes.transfer_id;
	const status =
		attributes.status ??
		(eventType === 'transfer.outward.successful'
			? 'succeeded'
			: eventType === 'transfer.outward.failed'
				? 'failed'
				: null);
	if (!id || !status) return null;
	return {
		id: String(id),
		walletTransactionId: attributes.wallet_transaction_id
			? String(attributes.wallet_transaction_id)
			: null,
		status: String(status),
		referenceNumber: attributes.reference_number ? String(attributes.reference_number) : null,
		failureCode: attributes.provider_error_code ? String(attributes.provider_error_code) : null,
		failureReason: attributes.provider_error ? String(attributes.provider_error) : null,
		claimId: attributes.metadata?.claimId ? String(attributes.metadata.claimId) : null
	};
}
