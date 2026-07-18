import { fetchPlatformRatings } from '$lib/server/chess/refresh-ratings';
import { isRatingsCacheFresh, parseRatingsJson } from '$lib/server/chess/ratings-cache';
import { updateChessAccountRatings } from '$lib/server/db/queries';
import { primaryRating } from '$lib/chess-ratings';

/**
 * @typedef {{ mode?: 'refresh' | 'cache-only' }} EnrichOptions
 * `refresh` (default): use cache within TTL, otherwise fetch + persist.
 * `cache-only`: never call external APIs — leaderboards stay a consistent DB snapshot.
 */

/**
 * Attach ratings from DB cache and optionally refresh when stale.
 * @param {Array<Record<string, any>>} accounts
 * @param {EnrichOptions} [options]
 */
export async function enrichChessAccountsWithRatings(accounts, options = {}) {
	const mode = options.mode ?? 'refresh';
	return Promise.all(accounts.map((account) => enrichOneAccount(account, mode)));
}

/**
 * @param {Record<string, any>} account
 * @param {'refresh' | 'cache-only'} mode
 */
async function enrichOneAccount(account, mode) {
	const cachedRatings = parseRatingsJson(account.ratingsJson);
	const hasCache =
		cachedRatings != null || (typeof account.rating === 'number' && Number.isFinite(account.rating));

	if (mode === 'cache-only') {
		if (!hasCache) return withEmptyRatings(account);
		return {
			...account,
			rating: account.rating ?? primaryRating(account.platform, cachedRatings),
			ratings: cachedRatings
		};
	}

	try {
		if (hasCache && isRatingsCacheFresh(account.platform, account.ratingsUpdatedAt)) {
			return {
				...account,
				rating: account.rating ?? primaryRating(account.platform, cachedRatings),
				ratings: cachedRatings
			};
		}

		const fresh = await fetchPlatformRatings(account);
		if (fresh) {
			if (account.id) {
				try {
					await updateChessAccountRatings(account.id, {
						rating: fresh.rating,
						ratings: fresh.ratings,
						displayName: fresh.displayName,
						federation: fresh.federation,
						title: fresh.title
					});
				} catch {
					// serve fresh payload even if persist fails
				}
			}

			return {
				...account,
				displayName: fresh.displayName ?? account.displayName,
				federation: fresh.federation ?? account.federation ?? null,
				title: fresh.title ?? account.title ?? null,
				rating: fresh.rating,
				ratings: fresh.ratings,
				ratingsUpdatedAt: new Date()
			};
		}

		if (hasCache) {
			return {
				...account,
				rating: account.rating ?? primaryRating(account.platform, cachedRatings),
				ratings: cachedRatings
			};
		}
	} catch {
		if (hasCache) {
			return {
				...account,
				rating: account.rating ?? primaryRating(account.platform, cachedRatings),
				ratings: cachedRatings
			};
		}
	}

	return withEmptyRatings(account);
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
		federation: account.federation ?? null,
		title: account.title ?? null,
		rating: account.rating ?? null,
		ratings: account.ratings ?? null,
		ratingsUpdatedAt: account.ratingsUpdatedAt ?? null,
		verified: Boolean(account.verified),
		linkedAt: account.linkedAt ?? null
	}));
}
