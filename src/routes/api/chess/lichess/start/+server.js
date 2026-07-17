import { redirect } from '@sveltejs/kit';
import { requireUser } from '$lib/server/auth-guards';
import { createPkcePair, getLichessAuthUrl, safeLichessReturnTo } from '$lib/server/chess/lichess';
import { createId } from '$lib/server/id';
import { env } from '$env/dynamic/private';

/** @type {import('./$types').RequestHandler} */
export async function GET(event) {
	requireUser(event);

	const returnTo = safeLichessReturnTo(event.url.searchParams.get('returnTo'));

	if (!env.LICHESS_CLIENT_ID) {
		redirect(302, `${returnTo}${returnTo.includes('?') ? '&' : '?'}error=lichess_not_configured`);
	}

	const { verifier, challenge } = await createPkcePair();
	const state = createId();
	const { url } = getLichessAuthUrl(state, challenge);

	event.cookies.set(
		'lichess_oauth',
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
