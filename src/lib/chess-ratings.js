/**
 * Shared chess rating helpers (client + server safe).
 *
 * @typedef {Record<string, number | null | undefined>} ChessRatings
 */

/** @type {Record<string, string>} */
export const RATING_LABELS = {
	bullet: 'Bullet',
	blitz: 'Blitz',
	rapid: 'Rapid',
	classical: 'Classical',
	daily: 'Daily',
	correspondence: 'Correspondence',
	puzzle: 'Puzzle',
	standard: 'Standard'
};

/** Preferred display order per platform */
export const PLATFORM_RATING_KEYS = {
	lichess: ['bullet', 'blitz', 'rapid', 'classical', 'correspondence', 'puzzle'],
	chesscom: ['bullet', 'blitz', 'rapid', 'classical', 'daily', 'puzzle'],
	fide: ['standard', 'rapid', 'blitz']
};

/** @type {Record<string, string>} */
export const PLATFORM_LABELS = {
	lichess: 'Lichess',
	chesscom: 'Chess.com',
	fide: 'FIDE'
};

/**
 * @param {string} platform
 * @param {ChessRatings | null | undefined} ratings
 * @param {number | null | undefined} fallbackRating
 * @returns {{ key: string, label: string, value: number }[]}
 */
export function ratingEntries(platform, ratings, fallbackRating = null) {
	const keys = PLATFORM_RATING_KEYS[platform] ?? Object.keys(ratings ?? {});
	/** @type {{ key: string, label: string, value: number }[]} */
	const entries = [];

	for (const key of keys) {
		const value = ratings?.[key];
		if (typeof value === 'number' && Number.isFinite(value)) {
			console.log(platform, key, value);
			entries.push({
				key,
				label: RATING_LABELS[key] ?? key,
				value
			});
		}
	}

	if (!entries.length && typeof fallbackRating === 'number' && Number.isFinite(fallbackRating)) {
		entries.push({
			key: 'rating',
			label: 'Rating',
			value: fallbackRating
		});
	}

	return entries;
}

/**
 * Classical (or FIDE standard) rating for a linked account.
 * @param {string} platform
 * @param {ChessRatings | null | undefined} ratings
 * @returns {number | null}
 */
export function classicalRating(platform, ratings) {
	if (!ratings) return null;

	const key = platform === 'fide' ? 'standard' : 'classical';
	const value = ratings[key];
	return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * Highest classical rating across linked chess accounts.
 * @param {Array<{ platform: string, ratings?: ChessRatings | null }>} accounts
 * @returns {number | null}
 */
export function bestClassicalRating(accounts) {
	let best = null;

	for (const account of accounts) {
		const value = classicalRating(account.platform, account.ratings);
		if (value != null && (best == null || value > best)) {
			best = value;
		}
	}

	return best;
}

/**
 * Pick a single primary rating for compact display.
 * @param {string} platform
 * @param {ChessRatings | null | undefined} ratings
 * @returns {number | null}
 */
export function primaryRating(platform, ratings) {
	if (!ratings) return null;

	const preference =
		platform === 'fide'
			? ['standard', 'rapid', 'blitz']
			: ['classical', 'rapid', 'blitz', 'bullet', 'daily', 'correspondence', 'standard'];

	for (const key of preference) {
		const value = ratings[key];
		if (typeof value === 'number' && Number.isFinite(value)) return value;
	}

	for (const value of Object.values(ratings)) {
		if (typeof value === 'number' && Number.isFinite(value)) return value;
	}

	return null;
}

/**
 * @param {string} platform
 * @param {string} username
 */
export function chessProfileHref(platform, username) {
	if (platform === 'fide') return `https://ratings.fide.com/profile/${username}`;
	if (platform === 'lichess') return `https://lichess.org/@/${username}`;
	if (platform === 'chesscom') return `https://www.chess.com/member/${username}`;
	return null;
}
