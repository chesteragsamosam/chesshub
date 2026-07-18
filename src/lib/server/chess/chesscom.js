import { env } from '$env/dynamic/private';
import { primaryRating } from '$lib/chess-ratings';

/** OIDC scopes for verified Chess.com account linking. */
export const CHESSCOM_OAUTH_SCOPES = 'openid profile';

/**
 * Allow only same-origin relative paths (no protocol-relative or absolute URLs).
 * @param {string | null | undefined} value
 * @param {string} [fallback]
 */
export function safeChessComReturnTo(value, fallback = '/settings/profile') {
	if (!value) return fallback;
	const trimmed = value.trim();
	if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.includes('\\')) {
		return fallback;
	}
	if (trimmed.includes('://') || trimmed.includes('\n') || trimmed.includes('\r')) {
		return fallback;
	}
	return trimmed;
}

/**
 * @param {string} state
 * @param {string} codeChallenge
 */
export function getChessComAuthUrl(state, codeChallenge) {
	const clientId = env.CHESSCOM_CLIENT_ID;
	if (!clientId) {
		throw new Error('CHESSCOM_CLIENT_ID is not set');
	}

	const redirectUri = `${env.ORIGIN}/api/chess/chesscom/callback`;
	const params = new URLSearchParams({
		response_type: 'code',
		client_id: clientId,
		redirect_uri: redirectUri,
		scope: CHESSCOM_OAUTH_SCOPES,
		state,
		code_challenge_method: 'S256',
		code_challenge: codeChallenge
	});

	return { url: `https://oauth.chess.com/authorize?${params}`, redirectUri };
}

/**
 * @param {string} code
 * @param {string} codeVerifier
 * @param {string} redirectUri
 */
export async function exchangeChessComCode(code, codeVerifier, redirectUri) {
	const clientId = env.CHESSCOM_CLIENT_ID;
	if (!clientId) {
		throw new Error('CHESSCOM_CLIENT_ID is not set');
	}

	const body = new URLSearchParams({
		grant_type: 'authorization_code',
		code,
		redirect_uri: redirectUri,
		client_id: clientId,
		code_verifier: codeVerifier
	});

	const clientSecret = env.CHESSCOM_CLIENT_SECRET?.trim();
	if (clientSecret) {
		body.set('client_secret', clientSecret);
	}

	const res = await fetch('https://oauth.chess.com/token', {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body
	});

	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Chess.com token exchange failed: ${text}`);
	}

	return /** @type {{
	 *   access_token: string,
	 *   id_token?: string,
	 *   refresh_token?: string,
	 *   token_type?: string,
	 *   expires_in?: number
	 * }} */ (await res.json());
}

/**
 * Decode a JWT payload without verifying the signature (token comes from Chess.com over HTTPS).
 * @param {string} jwt
 * @returns {Record<string, unknown> | null}
 */
export function decodeJwtPayload(jwt) {
	const parts = jwt.split('.');
	if (parts.length < 2) return null;
	try {
		const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
		const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
		const json = atob(padded);
		return /** @type {Record<string, unknown>} */ (JSON.parse(json));
	} catch {
		return null;
	}
}

/**
 * @param {Record<string, unknown> | null | undefined} claims
 * @returns {string | null}
 */
export function usernameFromOidcClaims(claims) {
	if (!claims) return null;

	for (const key of ['preferred_username', 'username', 'nickname']) {
		const value = claims[key];
		if (typeof value === 'string' && value.trim()) {
			return value.trim().replace(/^@/, '');
		}
	}

	const profile = claims.profile;
	if (typeof profile === 'string') {
		const match = profile.match(/chess\.com\/(?:member|members)\/([^/?#]+)/i);
		if (match?.[1]) return decodeURIComponent(match[1]);
	}

	return null;
}

/**
 * @param {string} accessToken
 * @returns {Promise<Record<string, unknown> | null>}
 */
async function fetchChessComUserInfo(accessToken) {
	const res = await fetch('https://oauth.chess.com/userinfo', {
		headers: {
			Authorization: `Bearer ${accessToken}`,
			Accept: 'application/json',
			'User-Agent': 'ChessHub/1.0 (tournament platform)'
		}
	});
	if (!res.ok) return null;
	try {
		return /** @type {Record<string, unknown>} */ (await res.json());
	} catch {
		return null;
	}
}

/**
 * Resolve Chess.com identity + ratings after OAuth token exchange.
 * @param {{ access_token: string, id_token?: string }} token
 */
export async function fetchChessComAccountFromOAuth(token) {
	/** @type {Record<string, unknown> | null} */
	let claims = token.id_token ? decodeJwtPayload(token.id_token) : null;
	let username = usernameFromOidcClaims(claims);

	if (!username) {
		const userInfo = await fetchChessComUserInfo(token.access_token);
		if (userInfo) {
			claims = { ...(claims ?? {}), ...userInfo };
			username = usernameFromOidcClaims(userInfo);
		}
	}

	if (!username) {
		throw new Error('Chess.com username missing from OAuth response');
	}

	const profile = await validateChessComUsername(username);
	if (!profile.ok) {
		throw new Error(profile.error);
	}

	const sub = claims && typeof claims.sub === 'string' ? claims.sub : null;
	const picture = claims && typeof claims.picture === 'string' ? claims.picture : null;
	const name = claims && typeof claims.name === 'string' ? claims.name : null;

	return {
		username: profile.username,
		externalId: profile.externalId ?? sub,
		displayName: name ?? profile.displayName,
		rating: profile.rating,
		ratings: profile.ratings,
		avatar: picture ?? profile.avatar
	};
}

/**
 * Validate a Chess.com username via the public player API.
 * @param {string} username
 */
export async function validateChessComUsername(username) {
	const cleaned = username.trim().replace(/^@/, '');
	if (!cleaned || !/^[a-zA-Z0-9_-]{3,25}$/.test(cleaned)) {
		return { ok: false, error: 'Enter a valid Chess.com username' };
	}

	const res = await fetch(`https://api.chess.com/pub/player/${encodeURIComponent(cleaned)}`, {
		headers: { 'User-Agent': 'ChessHub/1.0 (tournament platform)' }
	});

	if (res.status === 404) {
		return {
			ok: false,
			error: 'We couldn’t find that Chess.com username. Check the spelling and try again.'
		};
	}

	if (!res.ok) {
		return {
			ok: false,
			error: 'We couldn’t check that Chess.com username right now. Try again later.'
		};
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
