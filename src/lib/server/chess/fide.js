import { primaryRating } from '$lib/chess-ratings';

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
		const displayName = title ? `${title} ${data.name}` : data.name;

		return {
			ok: true,
			username: String(data.id),
			externalId: String(data.id),
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
 * @param {unknown} value
 * @returns {number | null}
 */
function ratingOrNull(value) {
	if (typeof value !== 'number' || !Number.isFinite(value)) return null;
	if (value < 100 || value > 4000) return null;
	return value;
}
