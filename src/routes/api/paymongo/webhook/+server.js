import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import {
	verifyWebhookSignature,
	parseWebhookEvent,
	parseTransferWebhookEvent,
	getPaidPaymentId,
	isCheckoutSessionPaid,
	toPayerFacingMessage,
	checkoutOutcomeMarker,
	isDonationCheckoutResource,
	donationLookupKeys
} from '$lib/server/paymongo';
import {
	getRegistrationByCheckoutSession,
	getRegistrationById,
	updateRegistration,
	getDonationByCheckoutSession,
	getDonationById,
	updateDonation,
	getPrizeClaimById,
	getPrizeClaimByPaymongoTransfer,
	getPrizeClaimByWalletTransaction,
	updatePrizeClaim,
	getTournamentById
} from '$lib/server/db/queries';
import { syncChessHubTournamentAllowList } from '$lib/server/chess/arena-allow-list';

/**
 * @param {Record<string, any> | null | undefined} resource
 */
function registrationLookupKeys(resource) {
	if (!resource || typeof resource !== 'object') return { sessionId: null, registrationId: null };
	const attrs = resource.attributes ?? {};
	const meta = attrs.metadata ?? resource.metadata ?? {};
	const id = typeof resource.id === 'string' ? resource.id : null;
	return {
		sessionId: id?.startsWith('cs_') ? id : null,
		registrationId:
			typeof meta.registrationId === 'string'
				? meta.registrationId
				: typeof attrs.reference_number === 'string'
					? attrs.reference_number
					: null
	};
}

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
	const sessionRow = /** @type {Record<string, any> | null} */ (session);
	const isDonation = isDonationCheckoutResource(sessionRow);

	/**
	 * @param {string} tournamentId
	 */
	async function markPaidAndSyncAllowList(tournamentId) {
		const tournament = await getTournamentById(tournamentId);
		if (tournament) {
			await syncChessHubTournamentAllowList(tournament).catch(() => null);
		}
	}

	/**
	 * @param {'failed' | 'expired'} outcome
	 */
	async function markDonationFailedOrExpired(outcome) {
		const keys = donationLookupKeys(sessionRow);
		const donation =
			(keys.sessionId ? await getDonationByCheckoutSession(keys.sessionId) : null) ??
			(keys.donationId ? await getDonationById(keys.donationId) : null);
		if (donation && donation.status === 'pending') {
			await updateDonation(donation.id, {
				status: outcome,
				paymongoPaymentId: checkoutOutcomeMarker(outcome)
			});
		}
	}

	/**
	 * @param {'failed' | 'expired'} outcome
	 */
	async function markCheckoutFailedOrExpired(outcome) {
		if (isDonation) {
			await markDonationFailedOrExpired(outcome);
			return;
		}
		const keys = registrationLookupKeys(sessionRow);
		const registration =
			(keys.sessionId ? await getRegistrationByCheckoutSession(keys.sessionId) : null) ??
			(keys.registrationId ? await getRegistrationById(keys.registrationId) : null);
		if (registration && registration.status === 'pending') {
			await updateRegistration(registration.id, {
				paymongoPaymentId: checkoutOutcomeMarker(outcome)
			});
		} else if (!registration) {
			// Fallback: session may be a donation without clear metadata on failure events
			await markDonationFailedOrExpired(outcome);
		}
	}

	/**
	 * @returns {'failed' | 'expired'}
	 */
	function failureOutcomeFromResource() {
		const attrs = sessionRow?.attributes ?? sessionRow ?? {};
		const sourceType = String(attrs.source?.type ?? attrs.type ?? '').toLowerCase();
		const failedCode = String(
			attrs.failed_code ?? attrs.last_payment_error?.failed_code ?? ''
		).toUpperCase();
		if (sourceType === 'qrph' || failedCode === 'CLOSED' || /expir/i.test(failedCode)) {
			return 'expired';
		}
		return 'failed';
	}

	/**
	 * @returns {Promise<boolean>} true if a donation was updated
	 */
	async function markDonationPaid() {
		if (!session?.id) return false;
		const keys = donationLookupKeys(sessionRow);
		const donation =
			(await getDonationByCheckoutSession(session.id)) ??
			(keys.donationId ? await getDonationById(keys.donationId) : null);
		if (donation && donation.status !== 'paid') {
			await updateDonation(donation.id, {
				status: 'paid',
				paidAt: new Date(),
				paymongoPaymentId: getPaidPaymentId(session)
			});
			return true;
		}
		return Boolean(donation);
	}

	/**
	 * @returns {Promise<boolean>} true if a registration was updated
	 */
	async function markRegistrationPaid() {
		if (!session?.id) return false;
		const registration = await getRegistrationByCheckoutSession(session.id);
		if (registration && registration.status !== 'paid') {
			await updateRegistration(registration.id, {
				status: 'paid',
				paidAt: new Date(),
				paymongoPaymentId: getPaidPaymentId(session)
			});
			await markPaidAndSyncAllowList(registration.tournamentId);
			return true;
		}
		return Boolean(registration);
	}

	if (eventType === 'checkout_session.payment.paid' && session?.id) {
		if (isDonation) {
			await markDonationPaid();
		} else {
			const handled = await markRegistrationPaid();
			if (!handled) await markDonationPaid();
		}
	} else if (
		eventType === 'payment.paid' &&
		session &&
		isCheckoutSessionPaid(session) &&
		session.id
	) {
		if (isDonation) {
			await markDonationPaid();
		} else {
			const handled = await markRegistrationPaid();
			if (!handled) await markDonationPaid();
		}
	} else if (
		eventType === 'qrph.expired' ||
		eventType?.endsWith?.('.expired') ||
		eventType === 'checkout_session.payment.expired'
	) {
		await markCheckoutFailedOrExpired('expired');
	} else if (
		eventType === 'payment.failed' ||
		eventType === 'checkout_session.payment.failed'
	) {
		await markCheckoutFailedOrExpired(failureOutcomeFromResource());
	}

	const transfer = parseTransferWebhookEvent(payload);
	if (transfer) {
		const claim =
			(await getPrizeClaimByPaymongoTransfer(transfer.id)) ??
			(transfer.walletTransactionId
				? await getPrizeClaimByWalletTransaction(transfer.walletTransactionId)
				: null) ??
			(transfer.claimId ? await getPrizeClaimById(transfer.claimId) : null);
		if (claim && claim.status !== 'paid') {
			if (transfer.status === 'succeeded') {
				await updatePrizeClaim(claim.id, {
					status: 'paid',
					paymongoTransferId: transfer.id,
					paymongoWalletTransactionId:
						transfer.walletTransactionId ?? claim.paymongoWalletTransactionId,
					paymongoReferenceNumber: transfer.referenceNumber ?? claim.paymongoReferenceNumber,
					failureCode: null,
					failureReason: null,
					paidAt: new Date()
				});
			} else if (transfer.status === 'failed') {
				const technical = [transfer.failureCode, transfer.failureReason]
					.filter(Boolean)
					.join(': ');
				await updatePrizeClaim(claim.id, {
					status: 'failed',
					paymongoTransferId: transfer.id,
					paymongoWalletTransactionId:
						transfer.walletTransactionId ?? claim.paymongoWalletTransactionId,
					paymongoReferenceNumber: transfer.referenceNumber ?? claim.paymongoReferenceNumber,
					failureCode: transfer.failureCode ?? 'transfer_failed',
					failureReason: toPayerFacingMessage(
						new Error(technical || 'transfer_failed'),
						'payout'
					)
				});
			}
		}
	}

	return json({ received: true });
}
