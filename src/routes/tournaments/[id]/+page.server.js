import { error, fail } from '@sveltejs/kit';
import {
	getTournamentById,
	getUserById,
	getRegistration,
	countPaidRegistrations,
	listPaidRegistrations,
	listTournamentPrizes,
	listTournamentSponsors,
	listTournamentAwards,
	getTournamentAwardForUser,
	reservePrizeClaim,
	updatePrizeClaim,
	createRegistration,
	updateRegistration,
	getChessAccount,
	toPublicTournament,
	markPublishedTournamentsCompletedForLichessArena
} from '$lib/server/db/queries';
import { requireUser } from '$lib/server/auth-guards';
import {
	createCheckoutSession,
	createGcashDisbursement,
	checkoutNoticeForOutcome,
	checkoutOutcomeMarker,
	getPaidPaymentId,
	interpretCheckoutSession,
	isCheckoutSessionPaid,
	isPaymongoConfigured,
	isPaymongoDisbursementConfigured,
	maskPhilippineMobile,
	normalizePhilippineMobile,
	readCheckoutOutcomeMarker,
	retrieveCheckoutSession,
	toPayerFacingMessage
} from '$lib/server/paymongo';
import {
	joinLichessArena,
	personalTournamentAccessCode
} from '$lib/server/chess/lichess-tournaments';
import { ensureArenaLive } from '$lib/server/chess/arena-live-hub';
import { syncChessHubTournamentAllowList } from '$lib/server/chess/arena-allow-list';
import { resolveAppOrigin } from '$lib/server/app-origin';
import { env as publicEnv } from '$env/dynamic/public';

/**
 * @param {NonNullable<Awaited<ReturnType<typeof getTournamentById>>>} tournament
 */
function canJoinLichessArena(tournament) {
	return (
		tournament.modality === 'lichess' &&
		tournament.lichessTournamentFormat === 'arena' &&
		Boolean(tournament.lichessTournamentId) &&
		Boolean(tournament.lichessArenaPassword)
	);
}

/** @type {import('./$types').PageServerLoad} */
export async function load(event) {
	const tournament = await getTournamentById(event.params.id);
	if (!tournament) error(404, 'Tournament not found');

	const canViewDraft =
		event.locals.user?.id === tournament.organizerId || event.locals.user?.role === 'admin';
	if (!['published', 'completed'].includes(tournament.status) && !canViewDraft) {
		error(404, 'Tournament not found');
	}

	const checkoutParam = event.url.searchParams.get('checkout');

	let registration = event.locals.user
		? await getRegistration(tournament.id, event.locals.user.id)
		: null;

	/** @type {'paid' | 'confirming' | 'cancelled' | 'failed' | 'expired' | null} */
	let checkoutOutcome = null;

	// Always inspect a pending checkout session (not only when ?checkout= is present).
	// Checkout opens in a new tab, so the original page usually has no query param.
	if (
		registration?.paymongoCheckoutSessionId &&
		isPaymongoConfigured() &&
		registration.status === 'pending'
	) {
		try {
			const session = await retrieveCheckoutSession(registration.paymongoCheckoutSessionId);
			const interpreted = interpretCheckoutSession(session);

			if (interpreted === 'paid' && isCheckoutSessionPaid(session)) {
				await updateRegistration(registration.id, {
					status: 'paid',
					paidAt: new Date(),
					paymongoPaymentId: getPaidPaymentId(session)
				});
				registration = await getRegistration(
					tournament.id,
					/** @type {string} */ (event.locals.user.id)
				);
				await syncChessHubTournamentAllowList(tournament).catch(() => null);
				checkoutOutcome = 'paid';
			} else if (interpreted === 'expired') {
				checkoutOutcome = 'expired';
				if (readCheckoutOutcomeMarker(registration.paymongoPaymentId) !== 'expired') {
					await updateRegistration(registration.id, {
						paymongoPaymentId: checkoutOutcomeMarker('expired')
					});
				}
			} else if (interpreted === 'failed') {
				checkoutOutcome = 'failed';
				if (readCheckoutOutcomeMarker(registration.paymongoPaymentId) !== 'failed') {
					await updateRegistration(registration.id, {
						paymongoPaymentId: checkoutOutcomeMarker('failed')
					});
				}
			} else if (checkoutParam === 'cancelled') {
				checkoutOutcome = 'cancelled';
			} else if (checkoutParam === 'failed') {
				checkoutOutcome = 'failed';
			} else if (checkoutParam === 'expired') {
				checkoutOutcome = 'expired';
			} else if (checkoutParam === 'success') {
				checkoutOutcome = 'confirming';
			} else {
				checkoutOutcome = readCheckoutOutcomeMarker(registration.paymongoPaymentId);
			}
		} catch (err) {
			console.error('[paymongo] retrieve checkout session failed', err);
			checkoutOutcome =
				readCheckoutOutcomeMarker(registration.paymongoPaymentId) ??
				(checkoutParam === 'cancelled'
					? 'cancelled'
					: checkoutParam === 'failed'
						? 'failed'
						: checkoutParam === 'expired'
							? 'expired'
							: checkoutParam === 'success'
								? 'confirming'
								: null);
		}
	} else if (registration?.status === 'pending') {
		checkoutOutcome =
			readCheckoutOutcomeMarker(registration.paymongoPaymentId) ??
			(checkoutParam === 'cancelled'
				? 'cancelled'
				: checkoutParam === 'failed'
					? 'failed'
					: checkoutParam === 'expired'
						? 'expired'
						: checkoutParam === 'success'
							? 'confirming'
							: null);
	} else if (checkoutParam === 'success' && registration?.status === 'paid') {
		checkoutOutcome = 'paid';
	} else if (checkoutParam === 'cancelled') {
		checkoutOutcome = 'cancelled';
	} else if (checkoutParam === 'failed') {
		checkoutOutcome = 'failed';
	} else if (checkoutParam === 'expired') {
		checkoutOutcome = 'expired';
	} else if (checkoutParam === 'success') {
		checkoutOutcome = registration?.status === 'paid' ? 'paid' : 'confirming';
	}

	const checkoutNotice = checkoutNoticeForOutcome(checkoutOutcome);

	const [
		organizer,
		paidCount,
		registeredPlayers,
		prizes,
		sponsors,
		awards,
		viewerAward,
		lichessAccount
	] = await Promise.all([
		getUserById(tournament.organizerId),
		countPaidRegistrations(tournament.id),
		listPaidRegistrations(tournament.id),
		listTournamentPrizes(tournament.id),
		listTournamentSponsors(tournament.id),
		listTournamentAwards(tournament.id),
		event.locals.user ? getTournamentAwardForUser(tournament.id, event.locals.user.id) : null,
		event.locals.user ? getChessAccount(event.locals.user.id, 'lichess') : null
	]);

	/** @type {Awaited<ReturnType<typeof ensureArenaLive>>['snapshot']} */
	let lichessLive = null;
	/** @type {string | null} */
	let lichessLiveError = null;
	/** @type {number | null} */
	let lichessLiveFetchedAt = null;
	/** @type {typeof tournament} */
	let tournamentRow = tournament;
	if (
		tournament.modality === 'lichess' &&
		tournament.lichessTournamentFormat === 'arena' &&
		tournament.lichessTournamentId
	) {
		try {
			const ensured = await ensureArenaLive(tournament.lichessTournamentId);
			lichessLive = ensured.snapshot;
			lichessLiveError = ensured.error;
			lichessLiveFetchedAt = ensured.fetchedAt || null;
			// Ensure ChessHub status tracks a finished Arena even without an SSE viewer.
			if (lichessLive?.status === 'finished' && tournament.status === 'published') {
				await markPublishedTournamentsCompletedForLichessArena(
					/** @type {string} */ (tournament.lichessTournamentId)
				);
				const refreshed = await getTournamentById(tournament.id);
				if (refreshed) tournamentRow = refreshed;
			}
		} catch (err) {
			lichessLiveError = err instanceof Error ? err.message : 'Could not load live Arena data';
		}
	}

	const joinable = canJoinLichessArena(tournamentRow);
	const hasLinkedLichess = Boolean(lichessAccount?.verified && lichessAccount.accessToken);

	return {
		tournament: toPublicTournament(tournamentRow),
		organizer: organizer
			? {
					id: organizer.id,
					name: organizer.name,
					username: organizer.username,
					slug: organizer.username || organizer.id
				}
			: null,
		paidCount,
		registration,
		registeredPlayers: registeredPlayers.map((player) => ({
			id: player.userId,
			name: player.name,
			username: player.username,
			slug: player.username || player.userId,
			image: player.image,
			paidAt: player.paidAt
		})),
		spotsLeft:
			tournamentRow.maxPlayers != null ? Math.max(0, tournamentRow.maxPlayers - paidCount) : null,
		paymongoConfigured: isPaymongoConfigured(),
		disbursementsConfigured: isPaymongoDisbursementConfigured(),
		googleMapsApiKey: publicEnv.PUBLIC_GOOGLE_MAPS_API_KEY?.trim() || '',
		prizes,
		sponsors,
		awards,
		viewerAward,
		checkoutOutcome,
		checkoutNotice,
		lichessJoin: {
			available: joinable,
			hasLinkedLichess,
			lichessUsername: lichessAccount?.username ?? null,
			joinedAt: registration?.lichessJoinedAt ?? null
		},
		lichessLive,
		lichessLiveError,
		lichessLiveFetchedAt
	};
}

export const actions = {
	register: async (event) => {
		const user = requireUser(event);
		const tournament = await getTournamentById(event.params.id);

		if (!tournament) {
			return fail(404, { message: 'Tournament not found' });
		}
		if (tournament.status !== 'published') {
			return fail(400, {
				message:
					tournament.status === 'draft'
						? 'This tournament isn’t published yet, so registration is closed.'
						: 'Registration is not open for this tournament.'
			});
		}

		const existing = await getRegistration(tournament.id, user.id);
		if (existing?.status === 'paid') {
			return fail(400, { message: 'You are already registered for this tournament' });
		}

		const paidCount = await countPaidRegistrations(tournament.id);
		if (tournament.maxPlayers != null && paidCount >= tournament.maxPlayers) {
			return fail(400, { message: 'This tournament is full' });
		}

		// Free tournament — register immediately (one paid row per user)
		if (tournament.entryFeeCents <= 0) {
			if (existing) {
				if (existing.status !== 'paid') {
					await updateRegistration(existing.id, { status: 'paid', paidAt: new Date() });
				}
			} else {
				const reg = await createRegistration(tournament.id, user.id);
				if (!reg) {
					return fail(500, { message: 'Could not create registration' });
				}
				if (reg.status !== 'paid') {
					await updateRegistration(reg.id, { status: 'paid', paidAt: new Date() });
				}
			}
			await syncChessHubTournamentAllowList(tournament).catch(() => null);
			return { success: true, free: true };
		}

		if (!isPaymongoConfigured()) {
			return fail(503, {
				message:
					'Online payments are not available for this tournament yet. Please contact the organizer.'
			});
		}

		if ((tournament.currency || 'php').toLowerCase() !== 'php') {
			return fail(400, {
				message: 'This tournament can only accept payments in Philippine pesos (PHP).'
			});
		}

		let registration = existing;
		if (!registration) {
			registration = await createRegistration(tournament.id, user.id);
		} else if (registration.status === 'cancelled' || registration.status === 'refunded') {
			await updateRegistration(registration.id, { status: 'pending' });
			registration = await getRegistration(tournament.id, user.id);
		}

		if (!registration || registration.status === 'paid') {
			return fail(400, { message: 'You are already registered for this tournament' });
		}

		const origin = resolveAppOrigin(event, { purpose: 'checkout_redirect' });

		let session;
		try {
			session = await createCheckoutSession({
				tournament,
				registrationId: registration.id,
				user,
				successUrl: `${origin}/tournaments/${tournament.id}?checkout=success`,
				cancelUrl: `${origin}/tournaments/${tournament.id}?checkout=cancelled`
			});
		} catch (err) {
			console.error('[paymongo] checkout session failed', err);
			return fail(500, {
				message: toPayerFacingMessage(err, 'checkout'),
				checkoutOutcome: 'failed'
			});
		}

		await updateRegistration(registration.id, {
			paymongoCheckoutSessionId: session.id,
			paymongoPaymentId: null
		});

		// Return the URL so the client can open PayMongo in a new tab.
		// Payment is confirmed via the PayMongo webhook.
		return { success: true, checkoutUrl: session.url };
	},

	joinLichess: async (event) => {
		const user = requireUser(event);
		const tournament = await getTournamentById(event.params.id);

		if (!tournament) {
			return fail(404, { message: 'Tournament not found' });
		}
		if (tournament.status !== 'published') {
			return fail(400, {
				message:
					tournament.status === 'draft'
						? 'This tournament isn’t published yet.'
						: 'This tournament is not open for joining.'
			});
		}

		if (!canJoinLichessArena(tournament)) {
			return fail(400, {
				message: 'This event does not support joining the Lichess Arena from ChessHub.'
			});
		}

		const registration = await getRegistration(tournament.id, user.id);
		if (registration?.status !== 'paid') {
			return fail(400, { message: 'Register for this tournament before joining the Arena.' });
		}

		const lichessAccount = await getChessAccount(user.id, 'lichess');
		if (!lichessAccount?.verified || !lichessAccount.accessToken || !lichessAccount.username) {
			return fail(400, {
				message: 'Connect your Lichess account before joining the Arena.',
				needsLichessLink: true
			});
		}

		try {
			const synced = await syncChessHubTournamentAllowList(tournament, {
				extraUsernames: [lichessAccount.username]
			});
			if (!synced.synced) {
				return fail(502, {
					message:
						'Could not update who can join on Lichess. Ask the organizer to reconnect Lichess, then try again.'
				});
			}
		} catch (err) {
			const message =
				err instanceof Error ? err.message : 'Could not update who can join on Lichess';
			return fail(502, { message });
		}

		const entryCode = personalTournamentAccessCode(
			/** @type {string} */ (tournament.lichessArenaPassword),
			lichessAccount.username
		);
		const pairMeAsap = new Date(tournament.startDate).getTime() <= Date.now();

		try {
			await joinLichessArena(
				lichessAccount.accessToken,
				/** @type {string} */ (tournament.lichessTournamentId),
				{ password: entryCode, pairMeAsap }
			);
		} catch (err) {
			const message =
				err instanceof Error ? err.message : 'Could not join the Lichess Arena';
			/** @type {Record<string, string | boolean>} */
			const payload = { message };
			// @ts-expect-error optional status on Error
			if (err?.status === 401 || err?.status === 403) {
				payload.needsLichessLink = true;
			}
			return fail(400, payload);
		}

		await updateRegistration(registration.id, { lichessJoinedAt: new Date() });
		return { lichessJoined: true };
	},

	claimPrize: async (event) => {
		const user = requireUser(event);
		const tournament = await getTournamentById(event.params.id);
		if (!tournament?.resultsFinalizedAt || tournament.status !== 'completed') {
			return fail(400, { message: 'Tournament prizes are not finalized' });
		}
		if (!isPaymongoDisbursementConfigured()) {
			return fail(503, { message: 'GCash prize payouts aren’t available yet' });
		}

		const winner = await getTournamentAwardForUser(tournament.id, user.id);
		if (!winner) return fail(403, { message: 'You do not have a prize to claim' });
		if (!['unclaimed', 'failed'].includes(winner.claim.status)) {
			return fail(409, { message: 'This prize claim is already being processed' });
		}

		const formData = await event.request.formData();
		const recipientName = formData.get('recipientName')?.toString().trim() ?? '';
		const mobileNumber = normalizePhilippineMobile(formData.get('gcashMobile')?.toString() ?? '');
		if (recipientName.length < 2 || recipientName.length > 255) {
			return fail(400, { message: 'Enter the full name on the GCash account' });
		}
		if (!mobileNumber) {
			return fail(400, { message: 'Enter a valid Philippine GCash mobile number' });
		}

		const reserved = await reservePrizeClaim(winner.claim.id, user.id, {
			destinationMasked: maskPhilippineMobile(mobileNumber),
			recipientName
		});
		if (!reserved) return fail(409, { message: 'This prize claim was already submitted' });

		const origin = resolveAppOrigin(event, { purpose: 'provider_callback' });
		try {
			const transfer = await createGcashDisbursement({
				claimId: winner.claim.id,
				amountCents: winner.award.amountCents,
				recipientName,
				mobileNumber,
				callbackUrl: `${origin}/api/paymongo/webhook`,
				idempotencyKey: `${winner.claim.id}-${reserved.claim.attemptCount}`
			});
			const status =
				transfer.status === 'succeeded'
					? 'paid'
					: transfer.status === 'failed'
						? 'failed'
						: 'processing';
			await updatePrizeClaim(winner.claim.id, {
				status,
				paymongoTransferId: transfer.id,
				paymongoReferenceNumber: transfer.referenceNumber,
				paidAt: status === 'paid' ? new Date() : null,
				failureCode: status === 'failed' ? 'transfer_failed' : null,
				failureReason:
					status === 'failed'
						? toPayerFacingMessage(new Error('transfer_failed'), 'payout')
						: null
			});
			return { claimSubmitted: true, claimStatus: status };
		} catch (err) {
			console.error('[paymongo] prize payout failed', err);
			const reason = toPayerFacingMessage(err, 'payout');
			await updatePrizeClaim(winner.claim.id, {
				status: 'failed',
				failureCode: 'request_failed',
				failureReason: reason
			});
			return fail(502, { message: reason, payoutOutcome: 'failed' });
		}
	}
};
