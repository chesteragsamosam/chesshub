import { error, fail } from '@sveltejs/kit';
import { requireOrganizer } from '$lib/server/auth-guards';
import {
	getTournamentById,
	listTournamentPrizes,
	listTournamentAwards,
	listEligibleLichessPlayers,
	saveTournamentPrizeSetup,
	finalizeTournamentAwards,
	toPublicTournament
} from '$lib/server/db/queries';
import {
	fetchLichessTournamentStandings,
	matchLichessPrizes,
	normalizeLichessTournamentId
} from '$lib/server/chess/lichess-tournaments';

/** @param {import('@sveltejs/kit').RequestEvent} event */
async function ownedTournament(event) {
	const user = requireOrganizer(event);
	const tournament = await getTournamentById(event.params.id);
	if (!tournament) error(404, 'Tournament not found');
	if (tournament.organizerId !== user.id && user.role !== 'admin') {
		error(403, 'Not your tournament');
	}
	return tournament;
}

/** @param {Awaited<ReturnType<typeof getTournamentById>>} tournament */
async function buildPreview(tournament) {
	if (!tournament?.lichessTournamentId || !tournament.lichessTournamentFormat) {
		throw new Error('Save a Lichess tournament source first');
	}

	const [prizes, eligiblePlayers, standings] = await Promise.all([
		listTournamentPrizes(tournament.id),
		listEligibleLichessPlayers(tournament.id),
		fetchLichessTournamentStandings(
			tournament.lichessTournamentId,
			tournament.lichessTournamentFormat
		)
	]);
	if (prizes.length === 0) throw new Error('Add at least one prize first');
	return matchLichessPrizes(prizes, standings, eligiblePlayers);
}

/** @type {import('./$types').PageServerLoad} */
export async function load(event) {
	const tournament = await ownedTournament(event);
	const [prizes, awards] = await Promise.all([
		listTournamentPrizes(tournament.id),
		listTournamentAwards(tournament.id)
	]);
	return {
		tournament: toPublicTournament(tournament),
		prizes,
		awards,
		justCreated: event.url.searchParams.get('created') === '1'
	};
}

export const actions = {
	save: async (event) => {
		const tournament = await ownedTournament(event);
		if (tournament.resultsFinalizedAt) {
			return fail(409, { message: 'Finalized results cannot be edited' });
		}

		const formData = await event.request.formData();
		const format = formData.get('lichessFormat')?.toString();
		if (format !== 'arena' && format !== 'swiss') {
			return fail(400, { message: 'Choose a Lichess tournament format' });
		}
		const source = normalizeLichessTournamentId(
			formData.get('lichessTournament')?.toString() ?? '',
			format
		);
		if (!source) {
			return fail(400, { message: 'Enter a valid Lichess tournament ID or URL' });
		}

		const placements = formData.getAll('placement').map((value) => Number(value));
		const labels = formData.getAll('label').map((value) => value.toString().trim());
		const amounts = formData.getAll('amount').map((value) => Math.round(Number(value) * 100));
		if (
			placements.length === 0 ||
			placements.length !== labels.length ||
			placements.length !== amounts.length
		) {
			return fail(400, { message: 'Add at least one complete prize tier' });
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
			uniquePlacements.size !== prizes.length
		) {
			return fail(400, {
				message: 'Placements must be unique positive numbers and each prize must be PHP 1–50,000'
			});
		}

		const saved = await saveTournamentPrizeSetup(
			tournament.id,
			{ lichessTournamentId: source, lichessTournamentFormat: format },
			prizes
		);
		if (!saved) return fail(409, { message: 'Results were finalized while saving' });
		return { saved: true };
	},

	preview: async (event) => {
		const tournament = await ownedTournament(event);
		if (tournament.resultsFinalizedAt) {
			return fail(409, { message: 'Results are already finalized' });
		}
		try {
			const preview = await buildPreview(tournament);
			return { preview, canFinalize: preview.every((row) => row.matched) };
		} catch (err) {
			return fail(400, {
				message: err instanceof Error ? err.message : 'Could not import Lichess standings'
			});
		}
	},

	finalize: async (event) => {
		const tournament = await ownedTournament(event);
		if (tournament.resultsFinalizedAt) {
			return fail(409, { message: 'Results are already finalized' });
		}

		try {
			const preview = await buildPreview(tournament);
			if (!preview.every((row) => row.matched)) {
				return fail(400, {
					message:
						'Every prize winner must be a paid registrant with a verified linked Lichess account',
					preview,
					canFinalize: false
				});
			}
			const finalized = await finalizeTournamentAwards(
				tournament.id,
				preview.map((row) => ({
					prizeId: row.prizeId,
					userId: /** @type {string} */ (row.userId),
					placement: row.placement,
					lichessUsername: /** @type {string} */ (row.lichessUsername),
					prizeLabel: row.prizeLabel,
					amountCents: row.amountCents
				}))
			);
			if (!finalized) return fail(409, { message: 'Results were already finalized' });
			return { finalized: true };
		} catch (err) {
			return fail(400, {
				message: err instanceof Error ? err.message : 'Could not finalize Lichess results'
			});
		}
	}
};
