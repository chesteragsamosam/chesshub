import { fail, redirect } from '@sveltejs/kit';
import { randomBytes } from 'node:crypto';
import { requireOrganizer } from '$lib/server/auth-guards';
import {
	buildChessHubArenaDescription,
	createLichessArena,
	formatLichessAllowList,
	LICHESS_ARENA_ACCOUNT_AGES,
	LICHESS_ARENA_CLOCK_INCREMENTS,
	LICHESS_ARENA_CLOCK_TIMES,
	LICHESS_ARENA_MAX_RATINGS,
	LICHESS_ARENA_MIN_RATED_GAMES,
	LICHESS_ARENA_MIN_RATINGS,
	LICHESS_ARENA_MINUTES,
	LICHESS_ARENA_VARIANTS,
	snapshotLichessArenaSettings,
	truncateLichessArenaName
} from '$lib/server/chess/lichess-tournaments';
import {
	createTournament,
	getChessAccount,
	replaceTournamentPrizes,
	replaceTournamentSponsors
} from '$lib/server/db/queries';
import { createId } from '$lib/server/id';
import { isPaymongoConfigured } from '$lib/server/paymongo';
import {
	field,
	parseOptionalSponsors,
	parseOtbLocation
} from '$lib/server/tournament-form';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';

/** @returns {string} */
function generateArenaPassword() {
	return randomBytes(24).toString('base64url');
}

/** @type {import('./$types').PageServerLoad} */
export async function load(event) {
	const user = requireOrganizer(event);
	const lichessAccount = await getChessAccount(user.id, 'lichess');
	const canCreateLichessArena = Boolean(lichessAccount?.verified && lichessAccount.accessToken);

	return {
		paymongoConfigured: isPaymongoConfigured(),
		lichessConfigured: Boolean(env.LICHESS_CLIENT_ID),
		googleMapsApiKey: publicEnv.PUBLIC_GOOGLE_MAPS_API_KEY?.trim() || '',
		canCreateLichessArena,
		lichessUsername: lichessAccount?.username ?? null,
		clockTimes: LICHESS_ARENA_CLOCK_TIMES,
		clockIncrements: LICHESS_ARENA_CLOCK_INCREMENTS,
		arenaMinutes: LICHESS_ARENA_MINUTES,
		minRatedGamesOptions: LICHESS_ARENA_MIN_RATED_GAMES,
		variants: LICHESS_ARENA_VARIANTS,
		minRatings: LICHESS_ARENA_MIN_RATINGS,
		maxRatings: LICHESS_ARENA_MAX_RATINGS,
		accountAges: LICHESS_ARENA_ACCOUNT_AGES
	};
}

/**
 * @param {FormData} formData
 */
function parseOptionalPrizes(formData) {
	if (formData.get('addPrizes') !== 'on') {
		return { prizes: /** @type {Array<{ placement: number, label: string, amountCents: number }>} */ ([]) };
	}

	const placements = formData.getAll('placement').map((value) => Number(value));
	const labels = formData.getAll('label').map((value) => value.toString().trim());
	const amounts = formData.getAll('amount').map((value) => Math.round(Number(value) * 100));

	if (placements.length === 0) {
		return { error: 'Add at least one prize tier, or turn off optional prizes' };
	}
	if (placements.length !== labels.length || placements.length !== amounts.length) {
		return { error: 'Each prize tier needs place, label, and amount' };
	}

	const prizes = placements.map((placement, index) => ({
		placement,
		label: labels[index],
		amountCents: amounts[index]
	}));

	const uniquePlacements = new Set(placements);
	if (
		prizes.some(
			(prize) =>
				!Number.isInteger(prize.placement) ||
				prize.placement < 1 ||
				!prize.label ||
				!Number.isInteger(prize.amountCents) ||
				prize.amountCents < 100 ||
				prize.amountCents > 5_000_000
		) ||
		uniquePlacements.size !== placements.length
	) {
		return {
			error: 'Prize tiers need unique places and PHP amounts between 1.00 and 50,000.00'
		};
	}

	return { prizes };
}

export const actions = {
	default: async (event) => {
		const user = requireOrganizer(event);
		const formData = await event.request.formData();

		const modalityRaw = field(formData, 'modality') || 'lichess';
		const title = field(formData, 'title');
		const description = field(formData, 'description');
		const startDateRaw = field(formData, 'startDate');
		const entryFeeRaw = field(formData, 'entryFee') || '0';
		const currency = (field(formData, 'currency') || 'php').toLowerCase();
		const directPaymentToOrganizer = formData.get('directPaymentToOrganizer') === 'on';
		const maxPlayersRaw = field(formData, 'maxPlayers');
		const publish = formData.get('publish') === 'on';
		const clockTimeRaw = field(formData, 'clockTime') || '3';
		const clockIncrementRaw = field(formData, 'clockIncrement') || '0';
		const clockDelayRaw = field(formData, 'clockDelay') || '0';
		const arenaMinutesRaw = field(formData, 'arenaMinutes') || '60';
		const minRatedGamesRaw = field(formData, 'minRatedGames') || '10';
		const variant = field(formData, 'variant') || 'standard';
		const position = field(formData, 'position');
		const teamMemberTeamId = field(formData, 'teamMemberTeamId');
		const minRatingRaw = field(formData, 'minRating');
		const maxRatingRaw = field(formData, 'maxRating');
		const accountAgeRaw = field(formData, 'accountAgeDays');
		const berserkable = formData.get('berserkable') === 'on';
		const streakable = formData.get('streakable') === 'on';
		const hasChat = formData.get('hasChat') === 'on';
		const allowBots = formData.get('allowBots') === 'on';
		const addPrizes = formData.get('addPrizes') === 'on';

		/** @type {Record<string, string | boolean>} */
		const bounce = {
			modality: modalityRaw,
			title,
			description,
			venue: field(formData, 'venue'),
			city: field(formData, 'city'),
			state: field(formData, 'state'),
			country: field(formData, 'country'),
			latitude: field(formData, 'latitude'),
			longitude: field(formData, 'longitude'),
			startDate: startDateRaw,
			entryFee: entryFeeRaw,
			currency,
			directPaymentToOrganizer,
			maxPlayers: maxPlayersRaw,
			publish,
			clockTime: clockTimeRaw,
			clockIncrement: clockIncrementRaw,
			clockDelay: clockDelayRaw,
			arenaMinutes: arenaMinutesRaw,
			minRatedGames: minRatedGamesRaw,
			variant,
			position,
			teamMemberTeamId,
			minRating: minRatingRaw,
			maxRating: maxRatingRaw,
			accountAgeDays: accountAgeRaw,
			berserkable,
			streakable,
			hasChat,
			allowBots,
			addPrizes
		};

		if (modalityRaw !== 'lichess' && modalityRaw !== 'otb') {
			return fail(400, { ...bounce, message: 'Choose Lichess or OTB' });
		}

		/** @type {'lichess' | 'otb'} */
		const modality = modalityRaw;

		if (!title || !startDateRaw) {
			return fail(400, { ...bounce, message: 'Title and start date are required' });
		}

		if (modality === 'otb' && !publicEnv.PUBLIC_GOOGLE_MAPS_API_KEY?.trim()) {
			return fail(400, {
				...bounce,
				message: 'Venue maps aren’t available right now. Contact the site admin.'
			});
		}

		const location = parseOtbLocation(formData, modality);
		if (location.error) {
			return fail(400, { ...bounce, message: location.error });
		}

		const clockTime = Number(clockTimeRaw);
		const clockIncrement = Number(clockIncrementRaw);
		const clockDelay = Number(clockDelayRaw);
		if (!Number.isFinite(clockTime) || clockTime < 0) {
			return fail(400, { ...bounce, message: 'Enter a valid clock time in minutes' });
		}
		if (!Number.isFinite(clockIncrement) || clockIncrement < 0) {
			return fail(400, { ...bounce, message: 'Enter a valid increment in seconds' });
		}
		if (!Number.isFinite(clockDelay) || clockDelay < 0) {
			return fail(400, { ...bounce, message: 'Enter a valid delay in seconds' });
		}
		if (clockTime + clockIncrement + clockDelay <= 0) {
			return fail(400, {
				...bounce,
				message: 'Clock time plus increment or delay must be greater than zero'
			});
		}

		const startDate = new Date(startDateRaw);
		if (Number.isNaN(startDate.getTime())) {
			return fail(400, { ...bounce, message: 'Invalid start date' });
		}

		const arenaMinutes = Number(arenaMinutesRaw);
		/** @type {Date | null} */
		let endDate = null;
		if (modality === 'lichess') {
			if (!Number.isFinite(arenaMinutes) || arenaMinutes <= 0) {
				return fail(400, { ...bounce, message: 'Invalid Arena duration' });
			}
			endDate = new Date(startDate.getTime() + arenaMinutes * 60_000);
		}

		const entryFeeCents = Math.round(Number(entryFeeRaw) * 100);
		if (entryFeeCents < 0 || Number.isNaN(entryFeeCents)) {
			return fail(400, { ...bounce, message: 'Invalid entry fee' });
		}

		if (directPaymentToOrganizer && entryFeeCents <= 0) {
			return fail(400, {
				...bounce,
				message: 'Set an entry fee when accepting direct payment to the organizer.'
			});
		}

		if (currency !== 'php') {
			return fail(400, { ...bounce, message: 'Currency must be PHP for GCash or QR Ph payments' });
		}

		const prizeParse = parseOptionalPrizes(formData);
		if (prizeParse.error) {
			return fail(400, { ...bounce, message: prizeParse.error });
		}
		const prizes = prizeParse.prizes ?? [];

		const sponsorParse = parseOptionalSponsors(formData);
		if (sponsorParse.error) {
			return fail(400, { ...bounce, message: sponsorParse.error });
		}
		const sponsors = sponsorParse.sponsors ?? [];

		let status = /** @type {'draft' | 'published'} */ ('draft');
		if (publish) {
			if (entryFeeCents > 0 && !directPaymentToOrganizer && !isPaymongoConfigured()) {
				return fail(400, {
					...bounce,
					message:
						'Paid registrations aren’t available yet. Contact the site admin to enable payments, or accept direct payment to the organizer.'
				});
			}
			status = 'published';
		}

		const maxPlayers = maxPlayersRaw ? Number(maxPlayersRaw) : null;

		const tournamentId = createId();
		const origin = env.ORIGIN || event.url.origin;
		const joinUrl = `${origin.replace(/\/$/, '')}/tournaments/${tournamentId}`;

		/** @type {string | null} */
		let lichessTournamentId = null;
		/** @type {'arena' | null} */
		let lichessTournamentFormat = null;
		/** @type {string | null} */
		let lichessArenaPassword = null;
		/** @type {string | null} */
		let lichessArenaSettings = null;

		if (modality === 'lichess') {
			const lichessAccount = await getChessAccount(user.id, 'lichess');
			if (!lichessAccount?.verified || !lichessAccount.accessToken || !lichessAccount.username) {
				return fail(400, {
					...bounce,
					message: 'Connect your Lichess account before creating an Arena.',
					needsLichessLink: true
				});
			}

			const minRating = minRatingRaw ? Number(minRatingRaw) : null;
			const maxRating = maxRatingRaw ? Number(maxRatingRaw) : null;
			const accountAgeDays = accountAgeRaw ? Number(accountAgeRaw) : null;
			const arenaPassword = generateArenaPassword();
			const arenaDescription = buildChessHubArenaDescription(joinUrl, description);
			const seededAllowList = formatLichessAllowList([lichessAccount.username]);

			const arenaParams = {
				clockTime,
				clockIncrement,
				minutes: arenaMinutes,
				name: truncateLichessArenaName(title) || undefined,
				description: arenaDescription,
				startDateMs: startDate.getTime(),
				minRatedGames: Number(minRatedGamesRaw),
				variant,
				position: position || undefined,
				berserkable,
				streakable,
				hasChat,
				password: arenaPassword,
				teamMemberTeamId: teamMemberTeamId || undefined,
				minRating,
				maxRating,
				// Seed with the organizer only — ChessHub expands this as players register.
				allowList: seededAllowList,
				allowBots,
				accountAgeDays
			};

			try {
				const arena = await createLichessArena(lichessAccount.accessToken, arenaParams);
				lichessTournamentId = arena.id;
				lichessTournamentFormat = 'arena';
				lichessArenaPassword = arenaPassword;
				lichessArenaSettings = JSON.stringify(snapshotLichessArenaSettings(arenaParams));
			} catch (err) {
				const message =
					err instanceof Error ? err.message : 'Could not create the Lichess Arena';
				/** @type {Record<string, string | boolean>} */
				const payload = { ...bounce, message };
				// @ts-expect-error optional status on Error
				if (err?.status === 401 || err?.status === 403) {
					payload.needsLichessLink = true;
				}
				return fail(400, payload);
			}
		}

		const tournament = await createTournament({
			id: tournamentId,
			organizerId: user.id,
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
			clockTime,
			clockIncrement,
			clockDelay: modality === 'otb' ? clockDelay : 0,
			status,
			lichessTournamentId,
			lichessTournamentFormat,
			lichessArenaPassword,
			lichessArenaSettings
		});

		if (prizes.length > 0 && tournament) {
			await replaceTournamentPrizes(tournament.id, prizes);
		}
		if (sponsors.length > 0 && tournament) {
			await replaceTournamentSponsors(tournament.id, sponsors);
		}

		redirect(
			302,
			prizes.length > 0
				? `/organizer/tournaments/${tournament.id}/prizes?created=1`
				: `/organizer/tournaments/${tournament.id}/edit?created=1`
		);
	}
};
