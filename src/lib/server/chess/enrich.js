import { fetchChessComRatings } from '$lib/server/chess/chesscom';
import { lookupFidePlayer } from '$lib/server/chess/fide';
import { fetchLichessPublicRatings } from '$lib/server/chess/lichess';
import { mockRatingsForUsername } from '$lib/server/chess/mock-ratings';
import { primaryRating } from '$lib/chess-ratings';

/**
 * Attach live ratings from public APIs. Nothing is written to the database.
 * @param {Array<Record<string, any>>} accounts
 */
export async function enrichChessAccountsWithRatings(accounts) {
	return Promise.all(
		accounts.map(async (account) => {
			try {
				const mock = mockRatingsForUsername(account.username);
				if (mock) {
					return {
						...account,
						rating: mock.rating,
						ratings: mock.ratings
					};
				}

				if (account.platform === 'lichess') {
					const result = await fetchLichessPublicRatings(account.username);
					if (!result) return withEmptyRatings(account);
					return {
						...account,
						rating: result.rating,
						ratings: result.ratings
					};
				}

				if (account.platform === 'chesscom') {
					const ratings = await fetchChessComRatings(account.username);
					return {
						...account,
						rating: primaryRating('chesscom', ratings),
						ratings
					};
				}

				if (account.platform === 'fide') {
					const result = await lookupFidePlayer(account.username);
					if (!result.ok) return withEmptyRatings(account);
					return {
						...account,
						displayName: result.displayName ?? account.displayName,
						rating: result.rating,
						ratings: result.ratings
					};
				}
			} catch {
				// fall through
			}

			return withEmptyRatings(account);
		})
	);
}

/**
 * @param {Record<string, any>} account
 */
function withEmptyRatings(account) {
	return { ...account, rating: null, ratings: null };
}

/**
 * Strip secrets before sending chess accounts to the client.
 * @param {Array<Record<string, unknown>>} accounts
 */
export function publicChessAccounts(accounts) {
	return accounts.map((account) => ({
		id: account.id,
		platform: account.platform,
		username: account.username,
		externalId: account.externalId ?? null,
		displayName: account.displayName ?? null,
		rating: account.rating ?? null,
		ratings: account.ratings ?? null,
		verified: Boolean(account.verified),
		linkedAt: account.linkedAt ?? null
	}));
}
