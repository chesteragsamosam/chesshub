import { redirect } from '@sveltejs/kit';
import { requireUser } from '$lib/server/auth-guards';
import {
	exchangeChessComCode,
	fetchChessComAccountFromOAuth,
	safeChessComReturnTo
} from '$lib/server/chess/chesscom';
import { upsertChessAccount, getUserById, updateUserImage } from '$lib/server/db/queries';
import { env } from '$env/dynamic/private';

/**
 * @param {string} returnTo
 * @param {string} key
 * @param {string} [value]
 */
function withQuery(returnTo, key, value = '1') {
	const url = new URL(returnTo, 'http://chesshub.local');
	url.searchParams.set(key, value);
	return `${url.pathname}${url.search}${url.hash}`;
}

/** @type {import('./$types').RequestHandler} */
export async function GET(event) {
	const user = requireUser(event);
	const code = event.url.searchParams.get('code');
	const state = event.url.searchParams.get('state');
	const error = event.url.searchParams.get('error');

	const raw = event.cookies.get('chesscom_oauth');
	event.cookies.delete('chesscom_oauth', { path: '/' });

	/** @type {{ state?: string, verifier?: string, returnTo?: string }} */
	let stored = {};
	if (raw) {
		try {
			stored = JSON.parse(raw);
		} catch {
			stored = {};
		}
	}

	const returnTo = safeChessComReturnTo(stored.returnTo);

	if (error || !code || !state) {
		redirect(302, withQuery(returnTo, 'error', 'chesscom_denied'));
	}

	if (!raw || !stored.state || !stored.verifier) {
		redirect(302, withQuery(returnTo, 'error', 'chesscom_expired'));
	}

	if (stored.state !== state) {
		redirect(302, withQuery(returnTo, 'error', 'chesscom_state'));
	}

	try {
		const redirectUri = `${env.ORIGIN}/api/chess/chesscom/callback`;
		const token = await exchangeChessComCode(code, stored.verifier, redirectUri);
		const account = await fetchChessComAccountFromOAuth(token);

		await upsertChessAccount(user.id, 'chesscom', {
			username: account.username,
			externalId: account.externalId,
			displayName: account.displayName,
			rating: account.rating,
			ratings: account.ratings,
			verified: true,
			accessToken: token.access_token
		});

		if (account.avatar) {
			const dbUser = await getUserById(user.id);
			if (dbUser && !dbUser.image) {
				await updateUserImage(user.id, account.avatar);
			}
		}
	} catch {
		redirect(302, withQuery(returnTo, 'error', 'chesscom_failed'));
	}

	redirect(302, withQuery(returnTo, 'linked', 'chesscom'));
}
