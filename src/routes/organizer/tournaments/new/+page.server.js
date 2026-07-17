import { fail, redirect } from '@sveltejs/kit';
import { requireOrganizer } from '$lib/server/auth-guards';
import {
	createTournament,
	getStripeConnectAccount
} from '$lib/server/db/queries';

/** @type {import('./$types').PageServerLoad} */
export async function load(event) {
	const user = requireOrganizer(event);
	const stripeAccount = await getStripeConnectAccount(user.id);
	return { stripeAccount };
}

export const actions = {
	default: async (event) => {
		const user = requireOrganizer(event);
		const formData = await event.request.formData();

		const title = formData.get('title')?.toString().trim() ?? '';
		const description = formData.get('description')?.toString().trim() ?? '';
		const venue = formData.get('venue')?.toString().trim() ?? '';
		const city = formData.get('city')?.toString().trim() ?? '';
		const state = formData.get('state')?.toString().trim() ?? '';
		const country = formData.get('country')?.toString().trim().toUpperCase() ?? '';
		const startDateRaw = formData.get('startDate')?.toString() ?? '';
		const endDateRaw = formData.get('endDate')?.toString() ?? '';
		const entryFee = Number(formData.get('entryFee')?.toString() ?? '0');
		const currency = (formData.get('currency')?.toString() || 'usd').toLowerCase();
		const maxPlayersRaw = formData.get('maxPlayers')?.toString() ?? '';
		const publish = formData.get('publish') === 'on';

		if (!title || !startDateRaw) {
			return fail(400, { message: 'Title and start date are required' });
		}

		const startDate = new Date(startDateRaw);
		if (Number.isNaN(startDate.getTime())) {
			return fail(400, { message: 'Invalid start date' });
		}

		const endDate = endDateRaw ? new Date(endDateRaw) : null;
		if (endDateRaw && endDate && Number.isNaN(endDate.getTime())) {
			return fail(400, { message: 'Invalid end date' });
		}

		const entryFeeCents = Math.round(entryFee * 100);
		if (entryFeeCents < 0 || Number.isNaN(entryFeeCents)) {
			return fail(400, { message: 'Invalid entry fee' });
		}

		if (country && !/^[A-Z]{2}$/.test(country)) {
			return fail(400, { message: 'Country must be a 2-letter ISO code' });
		}

		let status = /** @type {'draft' | 'published'} */ ('draft');
		if (publish) {
			if (entryFeeCents > 0) {
				const connect = await getStripeConnectAccount(user.id);
				if (!connect?.onboardingComplete) {
					return fail(400, {
						message: 'Connect Stripe and finish onboarding before publishing paid tournaments'
					});
				}
			}
			status = 'published';
		}

		const maxPlayers = maxPlayersRaw ? Number(maxPlayersRaw) : null;

		const tournament = await createTournament({
			organizerId: user.id,
			title,
			description: description || null,
			venue: venue || null,
			city: city || null,
			state: state || null,
			country: country || null,
			startDate,
			endDate,
			entryFeeCents,
			currency,
			maxPlayers: maxPlayers && Number.isFinite(maxPlayers) ? maxPlayers : null,
			status
		});

		redirect(302, `/organizer/tournaments/${tournament.id}/edit`);
	}
};
