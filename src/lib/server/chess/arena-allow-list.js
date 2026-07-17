import {
	getChessAccount,
	getTournamentById,
	listEligibleLichessPlayers
} from '$lib/server/db/queries';
import {
	arenaDetailToSettings,
	parseLichessArenaSettings,
	syncLichessArenaAllowList
} from '$lib/server/chess/lichess-tournaments';

const LICHESS_API = 'https://lichess.org/api';
const LICHESS_USER_AGENT = 'ChessHub/1.0 (tournament platform)';

/**
 * @param {NonNullable<Awaited<ReturnType<typeof getTournamentById>>>} tournament
 */
function isManagedChessHubArena(tournament) {
	return (
		tournament.modality === 'lichess' &&
		tournament.lichessTournamentFormat === 'arena' &&
		Boolean(tournament.lichessTournamentId) &&
		Boolean(tournament.lichessArenaPassword)
	);
}

/**
 * @param {string} tournamentId
 */
async function fetchArenaDetail(tournamentId) {
	const res = await fetch(`${LICHESS_API}/tournament/${tournamentId}`, {
		headers: {
			Accept: 'application/json',
			'User-Agent': LICHESS_USER_AGENT
		}
	});
	if (!res.ok) return null;
	return /** @type {Record<string, any>} */ (await res.json());
}

/**
 * Push ChessHub paid (linked) players onto the Lichess Arena allow list.
 * Password alone is not enough to join once the list is non-empty.
 *
 * @param {string | NonNullable<Awaited<ReturnType<typeof getTournamentById>>>} tournamentOrId
 * @param {{ extraUsernames?: Iterable<string | null | undefined> }} [options]
 */
export async function syncChessHubTournamentAllowList(tournamentOrId, options = {}) {
	const tournament =
		typeof tournamentOrId === 'string'
			? await getTournamentById(tournamentOrId)
			: tournamentOrId;

	if (!tournament || !isManagedChessHubArena(tournament)) {
		return { synced: false, reason: 'not_managed_arena' };
	}

	const organizerAccount = await getChessAccount(tournament.organizerId, 'lichess');
	if (!organizerAccount?.verified || !organizerAccount.accessToken || !organizerAccount.username) {
		return { synced: false, reason: 'organizer_lichess_unavailable' };
	}

	let settings = parseLichessArenaSettings(tournament.lichessArenaSettings);
	if (!settings) {
		const detail = await fetchArenaDetail(/** @type {string} */ (tournament.lichessTournamentId));
		settings = detail ? arenaDetailToSettings(detail) : null;
	}
	if (!settings) {
		return { synced: false, reason: 'missing_arena_settings' };
	}

	const eligible = await listEligibleLichessPlayers(tournament.id);
	const usernames = [
		organizerAccount.username,
		...eligible.map((player) => player.lichessUsername),
		...(options.extraUsernames ?? [])
	];

	await syncLichessArenaAllowList(
		organizerAccount.accessToken,
		/** @type {string} */ (tournament.lichessTournamentId),
		{
			settings,
			password: /** @type {string} */ (tournament.lichessArenaPassword),
			usernames
		}
	);

	return { synced: true, usernames };
}
