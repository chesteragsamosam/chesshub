import { error } from '@sveltejs/kit';
import { getTournamentById } from '$lib/server/db/queries';
import { subscribeArenaLive } from '$lib/server/chess/arena-live-hub';

/**
 * Server-Sent Events stream of live Lichess Arena snapshots for a ChessHub tournament.
 * One shared Lichess poller fans out to all connected viewers.
 * @type {import('./$types').RequestHandler}
 */
export async function GET(event) {
	const tournament = await getTournamentById(event.params.id);
	if (!tournament) error(404, 'Tournament not found');

	const canViewDraft =
		event.locals.user?.id === tournament.organizerId || event.locals.user?.role === 'admin';
	if (!['published', 'completed'].includes(tournament.status) && !canViewDraft) {
		error(404, 'Tournament not found');
	}

	if (
		tournament.modality !== 'lichess' ||
		tournament.lichessTournamentFormat !== 'arena' ||
		!tournament.lichessTournamentId
	) {
		error(404, 'Live Arena stream is not available for this tournament');
	}

	const arenaId = tournament.lichessTournamentId;
	const encoder = new TextEncoder();

	/** @param {string} eventName @param {unknown} data */
	function formatSse(eventName, data) {
		return encoder.encode(`event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`);
	}

	const stream = new ReadableStream({
		start(controller) {
			/** @param {string} eventName @param {unknown} data */
			const send = (eventName, data) => {
				try {
					controller.enqueue(formatSse(eventName, data));
				} catch {
					cleanup();
				}
			};

			const unsubscribe = subscribeArenaLive(arenaId, (message) => {
				if (message.type === 'snapshot') {
					send('snapshot', {
						...message.payload,
						fetchedAt: message.fetchedAt
					});
				} else if (message.type === 'featured') {
					send('featured', {
						...message.payload,
						fetchedAt: message.fetchedAt
					});
				} else if (message.type === 'tournament-status') {
					send('tournament-status', {
						...message.payload,
						fetchedAt: message.fetchedAt
					});
				} else if (message.type === 'error') {
					send('live-error', message.payload);
				}
			});

			const ping = setInterval(() => {
				try {
					controller.enqueue(encoder.encode(`: ping ${Date.now()}\n\n`));
				} catch {
					cleanup();
				}
			}, 20_000);

			let cleaned = false;
			function cleanup() {
				if (cleaned) return;
				cleaned = true;
				clearInterval(ping);
				unsubscribe();
				try {
					controller.close();
				} catch {
					// already closed
				}
			}

			event.request.signal.addEventListener('abort', cleanup);
		},
		cancel() {
			// abort listener handles cleanup
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache, no-transform',
			Connection: 'keep-alive',
			'X-Accel-Buffering': 'no'
		}
	});
}
