import { primaryRating } from '$lib/chess-ratings';

/**
 * Look up a FIDE player by ID.
 * Uses ratings.fide.com HTML as a pragmatic MVP (no official public REST API).
 * @param {string} fideId
 */
export async function lookupFidePlayer(fideId) {
	const cleaned = fideId.trim();
	if (!/^\d{5,10}$/.test(cleaned)) {
		return { ok: false, error: 'FIDE ID must be 5–10 digits' };
	}

	try {
		const res = await fetch(`https://ratings.fide.com/profile/${cleaned}`, {
			headers: {
				'User-Agent': 'ChessHub/1.0 (tournament platform)',
				Accept: 'text/html'
			}
		});

		if (res.status === 404) {
			return { ok: false, error: 'FIDE player not found' };
		}

		if (!res.ok) {
			return { ok: false, error: 'Unable to look up FIDE ID right now' };
		}

		const html = await res.text();

		if (html.includes('Player not found') || html.includes('No player found')) {
			return { ok: false, error: 'FIDE player not found' };
		}

		const nameMatch =
			html.match(/<title>\s*([^|<]+)/i) ||
			html.match(/profile_header_name[^>]*>([^<]+)/i) ||
			html.match(/class="player-title"[^>]*>[\s\S]*?<[^>]+>([^<]+)/i);

		let displayName = nameMatch?.[1]?.trim() ?? null;
		if (displayName) {
			displayName = displayName.replace(/\s*-\s*FIDE.*/i, '').trim();
		}

		const ratings = parseFideRatings(html);

		return {
			ok: true,
			username: cleaned,
			externalId: cleaned,
			displayName: displayName || `FIDE ${cleaned}`,
			rating: primaryRating('fide', ratings),
			ratings
		};
	} catch {
		return { ok: false, error: 'Unable to look up FIDE ID right now' };
	}
}

/**
 * @param {string} html
 * @returns {Record<string, number | null>}
 */
export function parseFideRatings(html) {
	/** @param {RegExp[]} patterns */
	function firstMatch(patterns) {
		for (const pattern of patterns) {
			const match = html.match(pattern);
			if (match?.[1]) {
				const value = Number(match[1]);
				if (Number.isFinite(value) && value >= 100 && value <= 4000) return value;
			}
		}
		return null;
	}

	const standard = firstMatch([
		/std[_\s]?rating[^>]*>[\s\S]*?(\d{3,4})/i,
		/Standard\s*<\/[^>]*>[\s\S]*?(\d{3,4})/i,
		/"std"\s*:\s*(\d{3,4})/,
		/profile-top-rating[^>]*>[\s\S]*?(\d{3,4})/i
	]);

	const rapid = firstMatch([
		/rapid[_\s]?rating[^>]*>[\s\S]*?(\d{3,4})/i,
		/Rapid\s*<\/[^>]*>[\s\S]*?(\d{3,4})/i,
		/"rapid"\s*:\s*(\d{3,4})/
	]);

	const blitz = firstMatch([
		/blitz[_\s]?rating[^>]*>[\s\S]*?(\d{3,4})/i,
		/Blitz\s*<\/[^>]*>[\s\S]*?(\d{3,4})/i,
		/"blitz"\s*:\s*(\d{3,4})/
	]);

	return { standard, rapid, blitz };
}
