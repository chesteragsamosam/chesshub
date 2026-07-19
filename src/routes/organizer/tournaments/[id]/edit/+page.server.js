import { error, fail } from '@sveltejs/kit';
import { requireOrganizer } from '$lib/server/auth-guards';
import {
	getTournamentById,
	listTournamentSponsors,
	replaceTournamentSponsors,
	updateTournament,
	toPublicTournament
} from '$lib/server/db/queries';
import { isPaymongoConfigured } from '$lib/server/paymongo';
import { parseOptionalSponsors, parseOtbLocation } from '$lib/server/tournament-form';
import { env as publicEnv } from '$env/dynamic/public';

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

	const publicTournament = toPublicTournament(tournament) ?? tournament;
	const sponsors = await listTournamentSponsors(tournament.id);

	return {
		tournament: {
			...publicTournament,
			startDateLocal: toLocalInput(tournament.startDate),
			endDateLocal: toLocalInput(tournament.endDate)
		},
		sponsors,
		googleMapsApiKey: publicEnv.PUBLIC_GOOGLE_MAPS_API_KEY?.trim() || '',
		paymongoConfigured: isPaymongoConfigured(),
		justCreated: event.url.searchParams.get('created') === '1'
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
		const startDateRaw = formData.get('startDate')?.toString() ?? '';
		const endDateRaw = formData.get('endDate')?.toString() ?? '';
		const entryFee = Number(formData.get('entryFee')?.toString() ?? '0');
		const currency = (formData.get('currency')?.toString() || 'php').toLowerCase();
		const directPaymentToOrganizer = formData.get('directPaymentToOrganizer') === 'on';
		const maxPlayersRaw = formData.get('maxPlayers')?.toString() ?? '';
		const status = formData.get('status')?.toString() ?? 'draft';
		const modalityRaw = formData.get('modality')?.toString() ?? tournament.modality;
		const clockTimeRaw = formData.get('clockTime')?.toString() ?? '';
		const clockIncrementRaw = formData.get('clockIncrement')?.toString() ?? '0';
		const clockDelayRaw = formData.get('clockDelay')?.toString() ?? '0';

		if (!title || !startDateRaw) {
			return fail(400, { message: 'Title and start date are required' });
		}

		if (modalityRaw !== 'lichess' && modalityRaw !== 'otb') {
			return fail(400, { message: 'Invalid event type' });
		}

		/** @type {'lichess' | 'otb'} */
		let modality = modalityRaw;
		if (tournament.status !== 'draft') {
			modality = tournament.modality;
		}

		if (modality === 'otb' && !publicEnv.PUBLIC_GOOGLE_MAPS_API_KEY?.trim()) {
			return fail(400, {
				message: 'Venue maps aren’t available right now. Contact the site admin.'
			});
		}

		const location = parseOtbLocation(formData, modality);
		if (location.error) {
			return fail(400, { message: location.error });
		}

		/** @type {number | null} */
		let clockTime = tournament.clockTime ?? null;
		/** @type {number} */
		let clockIncrement = tournament.clockIncrement ?? 0;
		/** @type {number} */
		let clockDelay = tournament.clockDelay ?? 0;

		if (modality === 'otb') {
			clockTime = Number(clockTimeRaw);
			clockIncrement = Number(clockIncrementRaw);
			clockDelay = Number(clockDelayRaw);
			if (!Number.isFinite(clockTime) || clockTime < 0) {
				return fail(400, { message: 'Enter a valid clock time in minutes' });
			}
			if (!Number.isFinite(clockIncrement) || clockIncrement < 0) {
				return fail(400, { message: 'Enter a valid increment in seconds' });
			}
			if (!Number.isFinite(clockDelay) || clockDelay < 0) {
				return fail(400, { message: 'Enter a valid delay in seconds' });
			}
			if (clockTime + clockIncrement + clockDelay <= 0) {
				return fail(400, {
					message: 'Clock time plus increment or delay must be greater than zero'
				});
			}
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

		if (directPaymentToOrganizer && entryFeeCents <= 0) {
			return fail(400, {
				message: 'Set an entry fee when accepting direct payment to the organizer.'
			});
		}

		if (currency !== 'php') {
			return fail(400, { message: 'Currency must be PHP for GCash or QR Ph payments' });
		}

		if (!['draft', 'published', 'cancelled', 'completed'].includes(status)) {
			return fail(400, { message: 'Invalid status' });
		}

		if (
			status === 'published' &&
			entryFeeCents > 0 &&
			!directPaymentToOrganizer &&
			!isPaymongoConfigured()
		) {
			return fail(400, {
				message:
					'Paid registrations aren’t available yet. Contact the site admin to enable payments, or accept direct payment to the organizer.'
			});
		}

		const sponsorParse = parseOptionalSponsors(formData);
		if (sponsorParse.error) {
			return fail(400, { message: sponsorParse.error });
		}

		const maxPlayers = maxPlayersRaw ? Number(maxPlayersRaw) : null;

		await updateTournament(tournament.id, {
			title,
			description: description || null,
			modality,
			venue: location.venue,
			city: location.city,
			state: location.state,
			country: location.country,
			latitude: location.latitude,
			longitude: location.longitude,
			startDate,
			endDate,
			entryFeeCents,
			currency,
			directPaymentToOrganizer,
			maxPlayers: maxPlayers && Number.isFinite(maxPlayers) ? maxPlayers : null,
			...(modality === 'otb'
				? { clockTime, clockIncrement, clockDelay }
				: {}),
			status: /** @type {'draft' | 'published' | 'cancelled' | 'completed'} */ (status)
		});

		await replaceTournamentSponsors(tournament.id, sponsorParse.sponsors ?? []);

		return { success: true };
	}
};
