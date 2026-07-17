import { primaryRating } from '$lib/chess-ratings';

/**
 * Validate a Chess.com username via the public player API.
 * @param {string} username
 */
export async function validateChessComUsername(username) {
	const cleaned = username.trim().replace(/^@/, '');
	if (!cleaned || !/^[a-zA-Z0-9_-]{3,25}$/.test(cleaned)) {
		return { ok: false, error: 'Invalid Chess.com username' };
	}

	const res = await fetch(`https://api.chess.com/pub/player/${encodeURIComponent(cleaned)}`, {
		headers: { 'User-Agent': 'ChessHub/1.0 (tournament platform)' }
	});

	if (res.status === 404) {
		return { ok: false, error: 'Chess.com player not found' };
	}

	if (!res.ok) {
		return { ok: false, error: 'Unable to verify Chess.com username right now' };
	}

	const data =
		/** @type {{ username: string, player_id?: number, name?: string, avatar?: string }} */ (
			await res.json()
		);

	const ratings = await fetchChessComRatings(cleaned);

	return {
		ok: true,
		username: data.username,
		externalId: data.player_id != null ? String(data.player_id) : null,
		displayName: data.name ?? data.username,
		rating: primaryRating('chesscom', ratings),
		ratings,
		avatar: data.avatar ?? null
	};
}

/**
 * @param {string} username
 * @returns {Promise<Record<string, number | null>>}
 */
export async function fetchChessComRatings(username) {
	/** @type {Record<string, number | null>} */
	const ratings = {};

	try {
		const statsRes = await fetch(
			`https://api.chess.com/pub/player/${encodeURIComponent(username)}/stats`,
			{ headers: { 'User-Agent': 'ChessHub/1.0 (tournament platform)' } }
		);
		if (!statsRes.ok) return ratings;

		const stats =
			/** @type {{
			 *   chess_bullet?: { last?: { rating?: number } },
			 *   chess_blitz?: { last?: { rating?: number } },
			 *   chess_rapid?: { last?: { rating?: number } },
			 *   chess_classical?: { last?: { rating?: number } },
			 *   chess_daily?: { last?: { rating?: number } },
			 *   tactics?: { highest?: { rating?: number }, last?: { rating?: number } }
			 * }} */ (await statsRes.json());

		ratings.bullet = stats.chess_bullet?.last?.rating ?? null;
		ratings.blitz = stats.chess_blitz?.last?.rating ?? null;
		ratings.rapid = stats.chess_rapid?.last?.rating ?? null;
		ratings.classical = stats.chess_classical?.last?.rating ?? null;
		ratings.daily = stats.chess_daily?.last?.rating ?? null;
		ratings.puzzle = stats.tactics?.highest?.rating ?? stats.tactics?.last?.rating ?? null;
	} catch {
		// ratings are optional
	}

	return ratings;
}
