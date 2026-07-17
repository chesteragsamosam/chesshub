import { redirect } from '@sveltejs/kit';
import { requireUser } from '$lib/server/auth-guards';
import { exchangeLichessCode, fetchLichessAccount } from '$lib/server/chess/lichess';
import { upsertChessAccount } from '$lib/server/db/queries';
import { env } from '$env/dynamic/private';

/** @type {import('./$types').RequestHandler} */
export async function GET(event) {
	const user = requireUser(event);
	const code = event.url.searchParams.get('code');
	const state = event.url.searchParams.get('state');
	const error = event.url.searchParams.get('error');

	if (error || !code || !state) {
		event.cookies.delete('lichess_oauth', { path: '/' });
		redirect(302, '/settings/profile?error=lichess_denied');
	}

	const raw = event.cookies.get('lichess_oauth');
	event.cookies.delete('lichess_oauth', { path: '/' });

	if (!raw) {
		redirect(302, '/settings/profile?error=lichess_expired');
	}

	/** @type {{ state: string, verifier: string }} */
	let stored;
	try {
		stored = JSON.parse(raw);
	} catch {
		redirect(302, '/settings/profile?error=lichess_expired');
	}

	if (stored.state !== state) {
		redirect(302, '/settings/profile?error=lichess_state');
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
		redirect(302, '/settings/profile?error=lichess_failed');
	}

	redirect(302, '/settings/profile?linked=lichess');
}
