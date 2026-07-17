import { error, fail, redirect } from '@sveltejs/kit';
import {
	getTournamentById,
	getUserById,
	getRegistration,
	countPaidRegistrations,
	createRegistration,
	updateRegistration,
	getStripeConnectAccount
} from '$lib/server/db/queries';
import { requireUser } from '$lib/server/auth-guards';
import { createCheckoutSession, isStripeConfigured } from '$lib/server/stripe';
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

	const [organizer, paidCount, registration] = await Promise.all([
		getUserById(tournament.organizerId),
		countPaidRegistrations(tournament.id),
		event.locals.user
			? getRegistration(tournament.id, event.locals.user.id)
			: Promise.resolve(null)
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
		spotsLeft:
			tournament.maxPlayers != null
				? Math.max(0, tournament.maxPlayers - paidCount)
				: null,
		stripeConfigured: isStripeConfigured(),
		checkoutResult: event.url.searchParams.get('checkout')
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
			return fail(400, { message: 'You are already registered' });
		}

		const paidCount = await countPaidRegistrations(tournament.id);
		if (tournament.maxPlayers != null && paidCount >= tournament.maxPlayers) {
			return fail(400, { message: 'This tournament is full' });
		}

		// Free tournament — register immediately
		if (tournament.entryFeeCents <= 0) {
			if (existing) {
				await updateRegistration(existing.id, { status: 'paid', paidAt: new Date() });
			} else {
				const reg = await createRegistration(tournament.id, user.id);
				await updateRegistration(reg.id, { status: 'paid', paidAt: new Date() });
			}
			return { success: true, free: true };
		}

		if (!isStripeConfigured()) {
			return fail(503, { message: 'Payments are not configured yet' });
		}

		const connect = await getStripeConnectAccount(tournament.organizerId);
		if (!connect?.onboardingComplete) {
			return fail(400, {
				message: 'The organizer has not finished payment setup for this event'
			});
		}

		let registration = existing;
		if (!registration) {
			registration = await createRegistration(tournament.id, user.id);
		} else if (registration.status === 'cancelled' || registration.status === 'refunded') {
			await updateRegistration(registration.id, { status: 'pending' });
			registration = await getRegistration(tournament.id, user.id);
		}

		const origin = env.ORIGIN || event.url.origin;
	const session = await createCheckoutSession({
		tournament,
		registrationId: registration.id,
		user,
		stripeAccountId: connect.stripeAccountId,
		successUrl: `${origin}/tournaments/${tournament.id}?checkout=success`,
		cancelUrl: `${origin}/tournaments/${tournament.id}?checkout=cancelled`
	});

	if (!session.url) {
		return fail(500, { message: 'Could not start checkout' });
	}

	await updateRegistration(registration.id, {
		stripeCheckoutSessionId: session.id
	});

	redirect(303, session.url);
	}
};
