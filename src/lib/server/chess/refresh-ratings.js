import { fetchChessComRatings } from '$lib/server/chess/chesscom';
import { lookupFidePlayer } from '$lib/server/chess/fide';
import { fetchLichessPublicRatings } from '$lib/server/chess/lichess';
import { mockRatingsForUsername } from '$lib/server/chess/mock-ratings';
import { listStaleChessAccounts, updateChessAccountRatings } from '$lib/server/db/queries';
import { primaryRating } from '$lib/chess-ratings';

const DEFAULT_DELAY_MS = 350;

/**
 * Fetch live ratings for one chess account (no DB write).
 * @param {Record<string, any>} account
 * @returns {Promise<{
 *   rating: number | null,
 *   ratings: Record<string, number | null>,
 *   displayName?: string | null,
 *   federation?: string | null,
 *   title?: string | null
 * } | null>}
 */
export async function fetchPlatformRatings(account) {
	const mock = mockRatingsForUsername(account.username);
	if (mock) {
		return { rating: mock.rating, ratings: mock.ratings };
	}

	if (account.platform === 'lichess') {
		const result = await fetchLichessPublicRatings(account.username);
		if (!result) return null;
		return { rating: result.rating, ratings: result.ratings };
	}

	if (account.platform === 'chesscom') {
		const ratings = await fetchChessComRatings(account.username);
		return {
			rating: primaryRating('chesscom', ratings),
			ratings
		};
	}

	if (account.platform === 'fide') {
		const result = await lookupFidePlayer(account.username);
		if (!result.ok) return null;
		return {
			rating: result.rating,
			ratings: result.ratings,
			displayName: result.displayName,
			federation: result.federation,
			title: result.title
		};
	}

	return null;
}

/**
 * Refresh stale linked accounts one-at-a-time (Lichess rate-limit friendly).
 * @param {{
 *   platform?: 'lichess' | 'chesscom' | 'fide',
 *   limit?: number,
 *   delayMs?: number
 * }} [opts]
 */
export async function refreshStaleChessRatings(opts = {}) {
	const delayMs = opts.delayMs ?? DEFAULT_DELAY_MS;
	const accounts = await listStaleChessAccounts({
		platform: opts.platform,
		limit: opts.limit ?? 100
	});

	let refreshed = 0;
	let failed = 0;
	/** @type {string[]} */
	const failures = [];

	for (const account of accounts) {
		try {
			const fresh = await fetchPlatformRatings(account);
			if (!fresh) {
				failed += 1;
				failures.push(`${account.platform}:${account.username}`);
			} else {
				await updateChessAccountRatings(account.id, {
					rating: fresh.rating,
					ratings: fresh.ratings,
					displayName: fresh.displayName,
					federation: fresh.federation,
					title: fresh.title
				});
				refreshed += 1;
			}
		} catch {
			failed += 1;
			failures.push(`${account.platform}:${account.username}`);
		}

		if (delayMs > 0) {
			await sleep(delayMs);
		}
	}

	return {
		examined: accounts.length,
		refreshed,
		failed,
		failures: failures.slice(0, 20)
	};
}

/** @param {number} ms */
function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
