import { primaryRating } from '$lib/chess-ratings';

/** Common FIDE / national titles stripped before name comparison. */
const NAME_TITLE_TOKENS = new Set([
	'gm',
	'im',
	'fm',
	'cm',
	'wgm',
	'wim',
	'wfm',
	'wcm',
	'nm',
	'wnm',
	'agm',
	'aim',
	'afm',
	'acm'
]);

/**
 * Look up a FIDE player by ID via Lichess's FIDE mirror
 * (`GET /api/fide/player/{playerId}`).
 * @param {string} fideId
 */
export async function lookupFidePlayer(fideId) {
	const cleaned = fideId.trim();
	if (!/^\d{5,10}$/.test(cleaned)) {
		return { ok: false, error: 'Enter your FIDE ID (5–10 digits)' };
	}

	try {
		const res = await fetch(`https://lichess.org/api/fide/player/${cleaned}`, {
			headers: {
				Accept: 'application/json',
				'User-Agent': 'ChessHub/1.0 (tournament platform)'
			}
		});

		if (res.status === 404) {
			return { ok: false, error: 'We couldn’t find that FIDE ID. Check the number and try again.' };
		}

		if (!res.ok) {
			return { ok: false, error: 'We couldn’t look up that FIDE profile right now. Try again later.' };
		}

		const data =
			/** @type {{
			 *   id: number,
			 *   name: string,
			 *   federation: string,
			 *   title?: string,
			 *   standard?: number,
			 *   rapid?: number,
			 *   blitz?: number
			 * }} */ (await res.json());

		if (!data?.id || !data?.name) {
			return { ok: false, error: 'We couldn’t find that FIDE ID. Check the number and try again.' };
		}

		const ratings = {
			standard: ratingOrNull(data.standard),
			rapid: ratingOrNull(data.rapid),
			blitz: ratingOrNull(data.blitz)
		};

		const title = typeof data.title === 'string' && data.title.trim() ? data.title.trim() : null;
		const name = data.name.trim();
		const displayName = title ? `${title} ${name}` : name;

		return {
			ok: true,
			username: String(data.id),
			externalId: String(data.id),
			name,
			displayName,
			federation: data.federation?.toUpperCase?.() ?? data.federation ?? null,
			title,
			rating: primaryRating('fide', ratings),
			ratings
		};
	} catch {
		return { ok: false, error: 'We couldn’t look up that FIDE profile right now. Try again later.' };
	}
}

/**
 * Soft check: does the FIDE listing look like it could belong to this ChessHub display name?
 * Handles "Last, First" vs "First Last". Empty ChessHub names never auto-match.
 * @param {string | null | undefined} fideName raw FIDE name (no title prefix)
 * @param {string | null | undefined} chessHubName ChessHub display name
 */
export function fideNameMatchesChessHub(fideName, chessHubName) {
	const fideTokens = nameTokens(fideName);
	const hubTokens = nameTokens(chessHubName);
	if (fideTokens.length === 0 || hubTokens.length === 0) return false;

	const [shorter, longer] =
		fideTokens.length <= hubTokens.length ? [fideTokens, hubTokens] : [hubTokens, fideTokens];
	const longerSet = new Set(longer);
	const hits = shorter.filter((token) => longerSet.has(token));
	const substantialHits = hits.filter((token) => token.length >= 3);
	if (substantialHits.length === 0) return false;

	return hits.length >= Math.ceil(shorter.length / 2);
}

/**
 * @param {string | null | undefined} value
 * @returns {string[]}
 */
export function nameTokens(value) {
	if (!value) return [];
	return value
		.toLowerCase()
		.replace(/[,.'’`-]+/g, ' ')
		.split(/[^a-z]+/)
		.map((part) => part.trim())
		.filter((part) => part.length >= 2 && !NAME_TITLE_TOKENS.has(part));
}

/**
 * @param {unknown} value
 * @returns {number | null}
 */
function ratingOrNull(value) {
	if (typeof value !== 'number' || !Number.isFinite(value)) return null;
	if (value < 100 || value > 4000) return null;
	return value;
}
