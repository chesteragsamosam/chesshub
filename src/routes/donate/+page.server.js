import { fail, redirect } from '@sveltejs/kit';
import { resolveAppOrigin } from '$lib/server/app-origin';
import {
	createDonation,
	getDonationById,
	updateDonation
} from '$lib/server/db/queries';
import {
	createDonationCheckoutSession,
	getPaidPaymentId,
	interpretCheckoutSession,
	isCheckoutSessionPaid,
	isPaymongoConfigured,
	retrieveCheckoutSession,
	toPayerFacingMessage,
	checkoutOutcomeMarker,
	readCheckoutOutcomeMarker
} from '$lib/server/paymongo';

const PRESET_AMOUNTS_PHP = [50, 100, 250, 500];
const MIN_AMOUNT_CENTS = 2000; // ₱20
const MAX_AMOUNT_CENTS = 5_000_000; // ₱50,000
const MAX_PUBLIC_NAME = 80;
const MAX_MESSAGE = 500;

/** @type {import('./$types').PageServerLoad} */
export async function load(event) {
	const thanks = event.url.searchParams.get('thanks') === '1';
	const cancelled = event.url.searchParams.get('cancelled') === '1';
	const donationId = event.url.searchParams.get('donationId');

	/** @type {'paid' | 'confirming' | 'cancelled' | 'failed' | 'expired' | null} */
	let outcome = cancelled ? 'cancelled' : null;
	/** @type {Awaited<ReturnType<typeof getDonationById>>} */
	let donation = null;

	if (donationId) {
		donation = await getDonationById(donationId);
		if (
			donation?.paymongoCheckoutSessionId &&
			isPaymongoConfigured() &&
			donation.status === 'pending'
		) {
			try {
				const session = await retrieveCheckoutSession(donation.paymongoCheckoutSessionId);
				const interpreted = interpretCheckoutSession(session);
				if (interpreted === 'paid' && isCheckoutSessionPaid(session)) {
					donation = await updateDonation(donation.id, {
						status: 'paid',
						paidAt: new Date(),
						paymongoPaymentId: getPaidPaymentId(session)
					});
					outcome = 'paid';
				} else if (interpreted === 'expired') {
					outcome = 'expired';
					if (donation.status === 'pending') {
						donation = await updateDonation(donation.id, {
							status: 'expired',
							paymongoPaymentId: checkoutOutcomeMarker('expired')
						});
					}
				} else if (interpreted === 'failed') {
					outcome = 'failed';
					if (donation.status === 'pending') {
						donation = await updateDonation(donation.id, {
							status: 'failed',
							paymongoPaymentId: checkoutOutcomeMarker('failed')
						});
					}
				} else if (thanks) {
					outcome = 'confirming';
				} else {
					outcome = readCheckoutOutcomeMarker(donation.paymongoPaymentId);
				}
			} catch (err) {
				console.error('[paymongo] retrieve donation checkout failed', err);
				outcome =
					readCheckoutOutcomeMarker(donation.paymongoPaymentId) ??
					(thanks ? 'confirming' : null);
			}
		} else if (donation?.status === 'paid') {
			outcome = 'paid';
		} else if (donation?.status === 'failed' || donation?.status === 'expired') {
			outcome = donation.status;
		} else if (thanks) {
			outcome = 'confirming';
		}
	} else if (thanks) {
		outcome = 'confirming';
	}

	return {
		paymongoConfigured: isPaymongoConfigured(),
		presets: PRESET_AMOUNTS_PHP,
		user: event.locals.user
			? {
					id: event.locals.user.id,
					name: event.locals.user.name ?? null,
					email: event.locals.user.email ?? null
				}
			: null,
		outcome,
		donation: donation
			? {
					id: donation.id,
					status: donation.status,
					listPublic: donation.listPublic,
					publicName: donation.publicName
				}
			: null
	};
}

/** @type {import('./$types').Actions} */
export const actions = {
	default: async (event) => {
		if (!isPaymongoConfigured()) {
			return fail(503, {
				message: 'Donations are not available right now. Please try again later.'
			});
		}

		const formData = await event.request.formData();
		const amountChoice = String(formData.get('amountChoice') ?? '').trim();
		const customRaw = String(formData.get('customAmount') ?? '').trim();
		const note = String(formData.get('note') ?? '').trim().slice(0, MAX_MESSAGE);
		const listPublic = formData.get('listPublic') === 'on';
		const publicName = String(formData.get('publicName') ?? '')
			.trim()
			.slice(0, MAX_PUBLIC_NAME);

		let amountPhp;
		if (amountChoice === 'custom') {
			amountPhp = Number(customRaw);
		} else {
			amountPhp = Number(amountChoice);
		}

		if (!Number.isFinite(amountPhp) || amountPhp <= 0) {
			return fail(400, {
				message: 'Choose a donation amount.',
				listPublic,
				publicName,
				note,
				amountChoice,
				customAmount: customRaw
			});
		}

		const amountCents = Math.round(amountPhp * 100);
		if (amountCents < MIN_AMOUNT_CENTS || amountCents > MAX_AMOUNT_CENTS) {
			return fail(400, {
				message: 'Donations must be between ₱20 and ₱50,000.',
				listPublic,
				publicName,
				note,
				amountChoice,
				customAmount: customRaw
			});
		}

		if (listPublic && !publicName) {
			return fail(400, {
				message: 'Enter the name you want shown on the supporters page.',
				listPublic,
				publicName,
				note,
				amountChoice,
				customAmount: customRaw
			});
		}

		const user = event.locals.user;
		const donation = await createDonation({
			amountCents,
			currency: 'php',
			userId: user?.id ?? null,
			donorName: user?.name ?? null,
			donorEmail: user?.email ?? null,
			message: note || null,
			listPublic,
			publicName: listPublic ? publicName : null
		});

		if (!donation) {
			return fail(500, { message: 'Could not start donation. Please try again.' });
		}

		const origin = resolveAppOrigin(event, { purpose: 'checkout_redirect' });

		let session;
		try {
			session = await createDonationCheckoutSession({
				donationId: donation.id,
				amountCents,
				currency: 'php',
				user: user
					? { id: user.id, email: user.email, name: user.name }
					: null,
				successUrl: `${origin}/donate?thanks=1&donationId=${donation.id}`,
				cancelUrl: `${origin}/donate?cancelled=1&donationId=${donation.id}`
			});
		} catch (err) {
			console.error('[paymongo] donation checkout failed', err);
			await updateDonation(donation.id, { status: 'failed' });
			return fail(500, {
				message: toPayerFacingMessage(err, 'checkout'),
				listPublic,
				publicName,
				note,
				amountChoice,
				customAmount: customRaw
			});
		}

		await updateDonation(donation.id, {
			paymongoCheckoutSessionId: session.id,
			paymongoPaymentId: null
		});

		redirect(303, session.url);
	}
};
