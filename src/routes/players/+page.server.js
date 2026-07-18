import {
	LEADERBOARD_PLATFORMS,
	LEADERBOARD_RATING_KEYS,
	rankingRating
} from '$lib/chess-ratings';
import { enrichChessAccountsWithRatings, publicChessAccounts } from '$lib/server/chess/enrich';
import { searchPlayers } from '$lib/server/db/queries';

const PAGE_SIZE = 20;

/**
 * @param {string | null | undefined} platform
 * @param {string | null | undefined} ratingKey
 */
function resolveLeaderboard(platform, ratingKey) {
	const resolvedPlatform = LEADERBOARD_PLATFORMS.includes(platform ?? '')
		? /** @type {keyof typeof LEADERBOARD_RATING_KEYS} */ (platform)
		: 'fide';
	const keys = LEADERBOARD_RATING_KEYS[resolvedPlatform];
	const resolvedKey = keys.includes(ratingKey ?? '') ? /** @type {string} */ (ratingKey) : keys[0];
	return { platform: resolvedPlatform, ratingKey: resolvedKey };
}

/**
 * @param {Array<{ platform: string, ratings?: Record<string, number | null | undefined> | null }>} accounts
 * @param {string} platform
 * @param {string} ratingKey
 * @returns {number | null}
 */
function platformRating(accounts, platform, ratingKey) {
	const account = accounts.find((entry) => entry.platform === platform);
	const value = account?.ratings?.[ratingKey];
	return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * @param {Array<{ name: string, listRating: number | null }>} players
 */
function sortByListRating(players) {
	return [...players].sort((a, b) => {
		if (a.listRating == null && b.listRating == null) {
			return a.name.localeCompare(b.name);
		}
		if (a.listRating == null) return 1;
		if (b.listRating == null) return -1;
		if (b.listRating !== a.listRating) {
			return b.listRating - a.listRating;
		}
		return a.name.localeCompare(b.name);
	});
}

/** @type {import('./$types').PageServerLoad} */
export async function load({ url }) {
	const q = url.searchParams.get('q')?.trim() ?? '';
	const city = url.searchParams.get('city')?.trim() ?? '';
	const country = url.searchParams.get('country')?.trim() ?? '';
	const viewParam = url.searchParams.get('view')?.trim() ?? '';
	const view = viewParam === 'top' ? 'top' : 'search';

	const leaderboard = resolveLeaderboard(
		url.searchParams.get('platform'),
		url.searchParams.get('rating')
	);

	const requestedPage = Math.max(1, Number.parseInt(url.searchParams.get('page') ?? '1', 10) || 1);

	const allPlayers = await searchPlayers({
		q: view === 'search' ? q : '',
		city: view === 'search' ? city : '',
		country: view === 'search' ? country : ''
	});

	const withRatings = await Promise.all(
		allPlayers.map(async (player) => {
			// Leaderboard uses DB cache only so order is a consistent snapshot.
			// Cron (/api/cron/refresh-ratings) keeps caches within platform TTLs.
			const chessAccounts = publicChessAccounts(
				await enrichChessAccountsWithRatings(player.chessAccounts, { mode: 'cache-only' })
			);

			const listRating =
				view === 'top'
					? platformRating(chessAccounts, leaderboard.platform, leaderboard.ratingKey)
					: rankingRating(chessAccounts);

			const fideAccount = chessAccounts.find((account) => account.platform === 'fide');

			return {
				id: player.id,
				name: player.name,
				username: player.username,
				image: player.image,
				country: player.country,
				federation: fideAccount?.federation ?? null,
				listRating
			};
		})
	);

	const filtered =
		view === 'top' ? withRatings.filter((player) => player.listRating != null) : withRatings;

	const sorted = sortByListRating(filtered);
	const total = sorted.length;
	const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
	const page = Math.min(requestedPage, totalPages);
	const offset = (page - 1) * PAGE_SIZE;

	return {
		view,
		players: sorted.slice(offset, offset + PAGE_SIZE),
		pagination: {
			page,
			totalPages,
			total,
			pageSize: PAGE_SIZE
		},
		filters: { q, city, country },
		leaderboard
	};
}
