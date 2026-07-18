import { redirect } from '@sveltejs/kit';
import { requireUser } from '$lib/server/auth-guards';
import { createPkcePair } from '$lib/server/chess/lichess';
import { getChessComAuthUrl, safeChessComReturnTo } from '$lib/server/chess/chesscom';
import { createId } from '$lib/server/id';
import { env } from '$env/dynamic/private';

/** @type {import('./$types').RequestHandler} */
export async function GET(event) {
	requireUser(event);

	const returnTo = safeChessComReturnTo(event.url.searchParams.get('returnTo'));

	if (!env.CHESSCOM_CLIENT_ID) {
		redirect(302, `${returnTo}${returnTo.includes('?') ? '&' : '?'}error=chesscom_not_configured`);
	}

	const { verifier, challenge } = await createPkcePair();
	const state = createId();
	const { url } = getChessComAuthUrl(state, challenge);

	event.cookies.set(
		'chesscom_oauth',
		JSON.stringify({ state, verifier, returnTo }),
		{
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: event.url.protocol === 'https:',
			maxAge: 60 * 10
		}
	);

	redirect(302, url);
}
