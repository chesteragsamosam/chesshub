/**
 * Trigger the ratings refresh cron over HTTP (server must be reachable).
 *
 * Usage:
 *   node --env-file=.env scripts/refresh-ratings.mjs
 *   node --env-file=.env scripts/refresh-ratings.mjs --platform=fide --limit=50
 *
 * Requires ORIGIN + CRON_SECRET. Example with local dev:
 *   pnpm dev   # another terminal
 *   pnpm ratings:refresh
 */
const origin = (process.env.ORIGIN ?? '').replace(/\/$/, '');
const secret = process.env.CRON_SECRET;

if (!origin) {
	console.error('ORIGIN is not set');
	process.exit(1);
}
if (!secret) {
	console.error('CRON_SECRET is not set');
	process.exit(1);
}

const args = Object.fromEntries(
	process.argv.slice(2).map((arg) => {
		const [key, value = 'true'] = arg.replace(/^--/, '').split('=');
		return [key, value];
	})
);

const params = new URLSearchParams();
if (args.platform === 'lichess' || args.platform === 'chesscom' || args.platform === 'fide') {
	params.set('platform', args.platform);
}
if (args.limit) params.set('limit', String(args.limit));

const url = `${origin}/api/cron/refresh-ratings${params.size ? `?${params}` : ''}`;
const res = await fetch(url, {
	method: 'POST',
	headers: { Authorization: `Bearer ${secret}` }
});

const text = await res.text();
let body;
try {
	body = JSON.parse(text);
} catch {
	body = { raw: text };
}

console.log(JSON.stringify({ status: res.status, ...body }, null, 2));
if (!res.ok || body.failed > 0) process.exitCode = 1;
