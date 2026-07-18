import { json, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { refreshStaleChessRatings } from '$lib/server/chess/refresh-ratings';

/**
 * Scheduled ratings refresh (Lichess/Chess.com daily TTL, FIDE monthly).
 * Protect with CRON_SECRET. Vercel Cron sends Authorization: Bearer <CRON_SECRET>.
 *
 * @type {import('./$types').RequestHandler}
 */
export async function GET(event) {
	return runCron(event);
}

/** @type {import('./$types').RequestHandler} */
export async function POST(event) {
	return runCron(event);
}

/**
 * @param {import('@sveltejs/kit').RequestEvent} event
 */
async function runCron(event) {
	assertCronAuthorized(event);

	const platformParam = event.url.searchParams.get('platform')?.trim();
	const platform =
		platformParam === 'lichess' || platformParam === 'chesscom' || platformParam === 'fide'
			? platformParam
			: undefined;

	const limitRaw = Number.parseInt(event.url.searchParams.get('limit') ?? '100', 10);
	const limit = Number.isFinite(limitRaw) ? limitRaw : 100;

	const result = await refreshStaleChessRatings({ platform, limit });

	return json({
		ok: true,
		...result,
		at: new Date().toISOString()
	});
}

/**
 * @param {import('@sveltejs/kit').RequestEvent} event
 */
function assertCronAuthorized(event) {
	const secret = env.CRON_SECRET;
	if (!secret) {
		error(503, 'CRON_SECRET is not configured');
	}

	const header = event.request.headers.get('authorization') ?? '';
	const expected = `Bearer ${secret}`;
	if (header !== expected) {
		error(401, 'Unauthorized');
	}
}
