/** @typedef {'lichess' | 'chesscom' | 'fide' | string} ChessPlatform */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Refresh TTLs: Lichess/Chess.com daily, FIDE monthly. */
export const RATINGS_TTL_MS = {
	lichess: DAY_MS,
	chesscom: DAY_MS,
	fide: 30 * DAY_MS
};

/**
 * @param {ChessPlatform} platform
 * @param {Date | string | null | undefined} updatedAt
 */
export function isRatingsCacheFresh(platform, updatedAt) {
	if (!updatedAt) return false;
	const at = updatedAt instanceof Date ? updatedAt : new Date(updatedAt);
	if (Number.isNaN(at.getTime())) return false;
	const ttl = RATINGS_TTL_MS[platform] ?? RATINGS_TTL_MS.lichess;
	return Date.now() - at.getTime() < ttl;
}

/**
 * @param {string | null | undefined} ratingsJson
 * @returns {Record<string, number | null> | null}
 */
export function parseRatingsJson(ratingsJson) {
	if (!ratingsJson) return null;
	try {
		const parsed = JSON.parse(ratingsJson);
		if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
		return /** @type {Record<string, number | null>} */ (parsed);
	} catch {
		return null;
	}
}

/**
 * @param {Record<string, number | null | undefined> | null | undefined} ratings
 */
export function stringifyRatingsJson(ratings) {
	if (!ratings) return null;
	return JSON.stringify(ratings);
}
