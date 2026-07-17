import { error, fail } from '@sveltejs/kit';
import {
	getTournamentById,
	getUserById,
	getRegistration,
	countPaidRegistrations,
	listPaidRegistrations,
	createRegistration,
	updateRegistration
} from '$lib/server/db/queries';
import { requireUser } from '$lib/server/auth-guards';
import { createCheckoutSession, isPaymongoConfigured } from '$lib/server/paymongo';
import { env } from '$env/dynamic/private';

/** @type {import('./$types').PageServerLoad} */
export async function load(event) {
	const tournament = await getTournamentById(event.params.id);
	if (!tournament) error(404, 'Tournament not found');

	const canViewDraft =
		event.locals.user?.id === tournament.organizerId || event.locals.user?.role === 'admin';
	if (tournament.status !== 'published' && !canViewDraft) {
		error(404, 'Tournament not found');
	}

	const checkoutResult = event.url.searchParams.get('checkout');

	const registration = event.locals.user
		? await getRegistration(tournament.id, event.locals.user.id)
		: null;

	const [organizer, paidCount, registeredPlayers] = await Promise.all([
		getUserById(tournament.organizerId),
		countPaidRegistrations(tournament.id),
		listPaidRegistrations(tournament.id)
	]);

	return {
		tournament,
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
			tournament.maxPlayers != null ? Math.max(0, tournament.maxPlayers - paidCount) : null,
		paymongoConfigured: isPaymongoConfigured(),
		checkoutResult
	};
}

export const actions = {
	register: async (event) => {
		const user = requireUser(event);
		const tournament = await getTournamentById(event.params.id);

		if (!tournament || tournament.status !== 'published') {
			return fail(404, { message: 'Tournament not found' });
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
			return { success: true, free: true };
		}

		if (!isPaymongoConfigured()) {
			return fail(503, { message: 'Payments are not configured yet' });
		}

		if ((tournament.currency || 'php').toLowerCase() !== 'php') {
			return fail(400, { message: 'Paid tournaments must use PHP currency for GCash' });
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

		const origin = env.ORIGIN || event.url.origin;

		let session;
		try {
			session = await createCheckoutSession({
				tournament,
				registrationId: registration.id,
				user,
				successUrl: `${origin}/tournaments/${tournament.id}?checkout=success`,
				cancelUrl: `${origin}/tournaments/${tournament.id}?checkout=cancelled`
			});
		} catch {
			return fail(500, { message: 'Could not start checkout' });
		}

		await updateRegistration(registration.id, {
			paymongoCheckoutSessionId: session.id
		});

		// Return the URL so the client can open PayMongo in a new tab.
		// Payment is confirmed via the PayMongo webhook.
		return { success: true, checkoutUrl: session.url };
	}
};
