import { env } from '$env/dynamic/private';
import { primaryRating } from '$lib/chess-ratings';

/** Scopes needed to link an account and create Arena tournaments. */
export const LICHESS_OAUTH_SCOPES = 'email:read preference:read tournament:write';

/**
 * Allow only same-origin relative paths (no protocol-relative or absolute URLs).
 * @param {string | null | undefined} value
 * @param {string} [fallback]
 */
export function safeLichessReturnTo(value, fallback = '/settings/profile') {
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
export function getLichessAuthUrl(state, codeChallenge) {
	const clientId = env.LICHESS_CLIENT_ID;
	if (!clientId) {
		throw new Error('LICHESS_CLIENT_ID is not set');
	}

	const redirectUri = `${env.ORIGIN}/api/chess/lichess/callback`;
	const params = new URLSearchParams({
		response_type: 'code',
		client_id: clientId,
		redirect_uri: redirectUri,
		scope: LICHESS_OAUTH_SCOPES,
		state,
		code_challenge_method: 'S256',
		code_challenge: codeChallenge
	});

	return { url: `https://lichess.org/oauth?${params}`, redirectUri };
}

/**
 * @param {string} code
 * @param {string} codeVerifier
 * @param {string} redirectUri
 */
export async function exchangeLichessCode(code, codeVerifier, redirectUri) {
	const clientId = env.LICHESS_CLIENT_ID;
	if (!clientId) {
		throw new Error('LICHESS_CLIENT_ID is not set');
	}

	const body = new URLSearchParams({
		grant_type: 'authorization_code',
		code,
		redirect_uri: redirectUri,
		client_id: clientId,
		code_verifier: codeVerifier
	});

	const res = await fetch('https://lichess.org/api/token', {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body
	});

	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Lichess token exchange failed: ${text}`);
	}

	return /** @type {{ access_token: string }} */ (await res.json());
}

/**
 * @param {Record<string, { rating?: number } | undefined> | undefined} perfs
 * @returns {Record<string, number | null>}
 */
function ratingsFromPerfs(perfs) {
	return {
		bullet: perfs?.bullet?.rating ?? null,
		blitz: perfs?.blitz?.rating ?? null,
		rapid: perfs?.rapid?.rating ?? null,
		classical: perfs?.classical?.rating ?? null,
		correspondence: perfs?.correspondence?.rating ?? null,
		puzzle: perfs?.puzzle?.rating ?? null
	};
}

/**
 * @param {string} accessToken
 */
export async function fetchLichessAccount(accessToken) {
	const res = await fetch('https://lichess.org/api/account', {
		headers: { Authorization: `Bearer ${accessToken}` }
	});

	if (!res.ok) {
		throw new Error('Failed to fetch Lichess account');
	}

	const data =
		/** @type {{ id: string, username: string, perfs?: Record<string, { rating?: number }> }} */ (
			await res.json()
		);

	const ratings = ratingsFromPerfs(data.perfs);

	return {
		username: data.username,
		externalId: data.id,
		displayName: data.username,
		rating: primaryRating('lichess', ratings),
		ratings
	};
}

/**
 * Public Lichess user lookup (no OAuth required).
 * @param {string} username
 */
export async function fetchLichessPublicRatings(username) {
	const res = await fetch(`https://lichess.org/api/user/${encodeURIComponent(username)}`, {
		headers: { Accept: 'application/json', 'User-Agent': 'ChessHub/1.0 (tournament platform)' }
	});

	if (!res.ok) {
		return null;
	}

	const data = /** @type {{ username?: string, perfs?: Record<string, { rating?: number }> }} */ (
		await res.json()
	);

	const ratings = ratingsFromPerfs(data.perfs);
	return {
		ratings,
		rating: primaryRating('lichess', ratings)
	};
}

/**
 * Generate PKCE code verifier and challenge (S256).
 */
export async function createPkcePair() {
	const verifier = base64Url(crypto.getRandomValues(new Uint8Array(32)));
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
	const challenge = base64Url(new Uint8Array(digest));
	return { verifier, challenge };
}

/** @param {Uint8Array} bytes */
function base64Url(bytes) {
	let str = '';
	for (const b of bytes) str += String.fromCharCode(b);
	return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
