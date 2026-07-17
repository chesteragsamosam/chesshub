import { bestClassicalRating } from '$lib/chess-ratings';
import { enrichChessAccountsWithRatings, publicChessAccounts } from '$lib/server/chess/enrich';
import { searchPlayers } from '$lib/server/db/queries';

const PAGE_SIZE = 10;

/**
 * @param {Array<{ name: string, classicalRating: number | null }>} players
 */
function sortByClassicalRating(players) {
	return [...players].sort((a, b) => {
		if (a.classicalRating == null && b.classicalRating == null) {
			return a.name.localeCompare(b.name);
		}
		if (a.classicalRating == null) return 1;
		if (b.classicalRating == null) return -1;
		if (b.classicalRating !== a.classicalRating) {
			return b.classicalRating - a.classicalRating;
		}
		return a.name.localeCompare(b.name);
	});
}

/** @type {import('./$types').PageServerLoad} */
export async function load({ url }) {
	const q = url.searchParams.get('q')?.trim() ?? '';
	const city = url.searchParams.get('city')?.trim() ?? '';
	const country = url.searchParams.get('country')?.trim() ?? '';
	const requestedPage = Math.max(1, Number.parseInt(url.searchParams.get('page') ?? '1', 10) || 1);

	const allPlayers = await searchPlayers({ q, city, country });

	const withRatings = await Promise.all(
		allPlayers.map(async (player) => {
			const chessAccounts = publicChessAccounts(
				await enrichChessAccountsWithRatings(player.chessAccounts)
			);

			return {
				...player,
				chessAccounts,
				classicalRating: bestClassicalRating(chessAccounts)
			};
		})
	);

	const sorted = sortByClassicalRating(withRatings);
	const total = sorted.length;
	const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
	const page = Math.min(requestedPage, totalPages);
	const offset = (page - 1) * PAGE_SIZE;

	return {
		players: sorted.slice(offset, offset + PAGE_SIZE),
		pagination: {
			page,
			totalPages,
			total,
			pageSize: PAGE_SIZE
		},
		filters: { q, city, country }
	};
}
