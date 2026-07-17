import { redirect } from '@sveltejs/kit';
import { requireUser } from '$lib/server/auth-guards';
import { exchangeLichessCode, fetchLichessAccount, safeLichessReturnTo } from '$lib/server/chess/lichess';
import { upsertChessAccount } from '$lib/server/db/queries';
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

	const raw = event.cookies.get('lichess_oauth');
	event.cookies.delete('lichess_oauth', { path: '/' });

	/** @type {{ state?: string, verifier?: string, returnTo?: string }} */
	let stored = {};
	if (raw) {
		try {
			stored = JSON.parse(raw);
		} catch {
			stored = {};
		}
	}

	const returnTo = safeLichessReturnTo(stored.returnTo);

	if (error || !code || !state) {
		redirect(302, withQuery(returnTo, 'error', 'lichess_denied'));
	}

	if (!raw || !stored.state || !stored.verifier) {
		redirect(302, withQuery(returnTo, 'error', 'lichess_expired'));
	}

	if (stored.state !== state) {
		redirect(302, withQuery(returnTo, 'error', 'lichess_state'));
	}

	try {
		const redirectUri = `${env.ORIGIN}/api/chess/lichess/callback`;
		const token = await exchangeLichessCode(code, stored.verifier, redirectUri);
		const account = await fetchLichessAccount(token.access_token);

		await upsertChessAccount(user.id, 'lichess', {
			username: account.username,
			externalId: account.externalId,
			displayName: account.displayName,
			verified: true,
			accessToken: token.access_token
		});
	} catch {
		redirect(302, withQuery(returnTo, 'error', 'lichess_failed'));
	}

	redirect(302, withQuery(returnTo, 'linked', 'lichess'));
}
