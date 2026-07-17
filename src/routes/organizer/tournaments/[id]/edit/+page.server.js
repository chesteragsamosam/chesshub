import { error, fail } from '@sveltejs/kit';
import { requireOrganizer } from '$lib/server/auth-guards';
import { getTournamentById, updateTournament } from '$lib/server/db/queries';
import { isPaymongoConfigured } from '$lib/server/paymongo';

/** @param {Date | string | null | undefined} d */
function toLocalInput(d) {
	if (!d) return '';
	const date = new Date(d);
	const pad = (/** @type {number} */ n) => String(n).padStart(2, '0');
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** @type {import('./$types').PageServerLoad} */
export async function load(event) {
	const user = requireOrganizer(event);
	const tournament = await getTournamentById(event.params.id);

	if (!tournament) error(404, 'Tournament not found');
	if (tournament.organizerId !== user.id && user.role !== 'admin') {
		error(403, 'Not your tournament');
	}

	return {
		tournament: {
			...tournament,
			startDateLocal: toLocalInput(tournament.startDate),
			endDateLocal: toLocalInput(tournament.endDate)
		},
		paymongoConfigured: isPaymongoConfigured()
	};
}

export const actions = {
	save: async (event) => {
		const user = requireOrganizer(event);
		const tournament = await getTournamentById(event.params.id);
		if (!tournament) return fail(404, { message: 'Not found' });
		if (tournament.organizerId !== user.id && user.role !== 'admin') {
			return fail(403, { message: 'Forbidden' });
		}

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
		const currency = (formData.get('currency')?.toString() || 'php').toLowerCase();
		const maxPlayersRaw = formData.get('maxPlayers')?.toString() ?? '';
		const status = formData.get('status')?.toString() ?? 'draft';

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

		if (currency !== 'php') {
			return fail(400, { message: 'Currency must be PHP for GCash payments' });
		}

		if (!['draft', 'published', 'cancelled', 'completed'].includes(status)) {
			return fail(400, { message: 'Invalid status' });
		}

		if (status === 'published' && entryFeeCents > 0 && !isPaymongoConfigured()) {
			return fail(400, {
				message: 'PayMongo is not configured. Set PAYMONGO_SECRET_KEY before publishing paid tournaments'
			});
		}

		const maxPlayers = maxPlayersRaw ? Number(maxPlayersRaw) : null;

		await updateTournament(tournament.id, {
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
			status: /** @type {'draft' | 'published' | 'cancelled' | 'completed'} */ (status)
		});

		return { success: true };
	}
};
