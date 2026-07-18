/**
 * Shared Arena live hub: one Lichess poller (+ optional featured-game stream)
 * per Arena id, fan-out to SSE subscribers. Keeps ChessHub within Lichess
 * rate limits when many browsers watch the same event.
 */

import { fetchLichessArenaLive, LICHESS_USER_AGENT } from '$lib/server/chess/lichess-tournaments';
import { markPublishedTournamentsCompletedForLichessArena } from '$lib/server/db/queries';

const LICHESS_API = 'https://lichess.org/api';

/** @typedef {import('$lib/server/chess/lichess-tournaments').LichessArenaLive} LichessArenaLive */

/**
 * @typedef {{
 *   type: 'snapshot'
 *   payload: LichessArenaLive
 *   fetchedAt: number
 * } | {
 *   type: 'featured'
 *   payload: {
 *     id: string
 *     fen: string | null
 *     lastMove: string | null
 *     clocks: { white: number | null, black: number | null } | null
 *   }
 *   fetchedAt: number
 * } | {
 *   type: 'tournament-status'
 *   payload: { status: 'completed' }
 *   fetchedAt: number
 * } | {
 *   type: 'error'
 *   payload: { message: string }
 *   fetchedAt: number
 * }} ArenaLiveMessage
 */

/**
 * @typedef {{
 *   listeners: Set<(msg: ArenaLiveMessage) => void>
 *   snapshot: LichessArenaLive | null
 *   error: string | null
 *   fetchedAt: number
 *   timer: ReturnType<typeof setTimeout> | null
 *   polling: boolean
 *   stopped: boolean
 *   featuredAbort: AbortController | null
 *   featuredGameId: string | null
 *   completedSynced: boolean
 * }} ArenaLiveRoom
 */

/** @type {Map<string, ArenaLiveRoom>} */
const rooms = new Map();

/** Serialize outbound Lichess arena polls across all rooms. */
let pollQueue = Promise.resolve();

/**
 * @param {() => Promise<void>} task
 */
function enqueuePoll(task) {
	pollQueue = pollQueue.then(task).catch(() => {
		/* isolated per task */
	});
	return pollQueue;
}

/**
 * @param {LichessArenaLive | null} snapshot
 */
function pollIntervalMs(snapshot) {
	if (!snapshot) return 10_000;
	if (snapshot.status === 'started') return 5_000;
	if (snapshot.status === 'created') return 15_000;
	return 30_000;
}

/**
 * @param {string} arenaId
 */
function getOrCreateRoom(arenaId) {
	let room = rooms.get(arenaId);
	if (room) return room;

	/** @type {ArenaLiveRoom} */
	room = {
		listeners: new Set(),
		snapshot: null,
		error: null,
		fetchedAt: 0,
		timer: null,
		polling: false,
		stopped: false,
		featuredAbort: null,
		featuredGameId: null,
		completedSynced: false
	};
	rooms.set(arenaId, room);
	return room;
}

/**
 * @param {ArenaLiveRoom} room
 * @param {ArenaLiveMessage} message
 */
function broadcast(room, message) {
	for (const listener of room.listeners) {
		try {
			listener(message);
		} catch {
			// ignore subscriber errors
		}
	}
}

/**
 * @param {string} arenaId
 * @param {ArenaLiveRoom} room
 * @param {string} gameId
 */
function startFeaturedStream(arenaId, room, gameId) {
	if (room.featuredGameId === gameId && room.featuredAbort) return;

	room.featuredAbort?.abort();
	room.featuredGameId = gameId;
	const abort = new AbortController();
	room.featuredAbort = abort;

	void (async () => {
		try {
			const res = await fetch(`${LICHESS_API}/stream/game/${gameId}`, {
				headers: {
					Accept: 'application/x-ndjson',
					'User-Agent': LICHESS_USER_AGENT
				},
				signal: abort.signal
			});

			if (!res.ok || !res.body) {
				if (res.status === 429) {
					// Featured stream is best-effort; arena polling continues.
					return;
				}
				return;
			}

			const reader = res.body.getReader();
			const decoder = new TextDecoder();
			let buffer = '';

			while (!abort.signal.aborted) {
				const { done, value } = await reader.read();
				if (done) break;
				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split(/\r?\n/);
				buffer = lines.pop() ?? '';

				for (const line of lines) {
					const trimmed = line.trim();
					if (!trimmed) continue;
					/** @type {Record<string, any>} */
					let row;
					try {
						row = JSON.parse(trimmed);
					} catch {
						continue;
					}

					const fen = row.fen ? String(row.fen) : null;
					const lastMove = row.lm || row.lastMove ? String(row.lm ?? row.lastMove) : null;
					const clocks =
						typeof row.wc === 'number' || typeof row.bc === 'number'
							? {
									white: typeof row.wc === 'number' ? row.wc : null,
									black: typeof row.bc === 'number' ? row.bc : null
								}
							: null;

					if (!fen && !lastMove && !clocks) continue;

					if (room.snapshot?.featured?.id === gameId) {
						room.snapshot = {
							...room.snapshot,
							featured: {
								...room.snapshot.featured,
								fen: fen ?? room.snapshot.featured.fen,
								lastMove: lastMove ?? room.snapshot.featured.lastMove,
								clocks: clocks ?? room.snapshot.featured.clocks
							}
						};
						room.fetchedAt = Date.now();
					}

					broadcast(room, {
						type: 'featured',
						payload: {
							id: gameId,
							fen,
							lastMove,
							clocks
						},
						fetchedAt: Date.now()
					});
				}
			}
		} catch (err) {
			if (abort.signal.aborted) return;
			// Ignore stream failures; next arena poll may pick a new featured game.
			void err;
		} finally {
			if (room.featuredAbort === abort) {
				room.featuredAbort = null;
			}
		}
	})();
}

/**
 * @param {string} arenaId
 * @param {ArenaLiveRoom} room
 */
function syncFeaturedStream(arenaId, room) {
	const featuredId = room.snapshot?.featured?.id ?? null;
	if (!featuredId || room.snapshot?.status === 'finished') {
		room.featuredAbort?.abort();
		room.featuredAbort = null;
		room.featuredGameId = null;
		return;
	}
	startFeaturedStream(arenaId, room, featuredId);
}

/**
 * @param {string} arenaId
 */
function scheduleNext(arenaId) {
	const room = rooms.get(arenaId);
	if (!room || room.stopped || room.listeners.size === 0) return;
	if (room.snapshot?.status === 'finished') return;

	if (room.timer) clearTimeout(room.timer);
	const delay = pollIntervalMs(room.snapshot);
	room.timer = setTimeout(() => {
		room.timer = null;
		void runPoll(arenaId);
	}, delay);
}

/**
 * Persist ChessHub tournament completion when the Arena is finished (once per room).
 * @param {string} arenaId
 * @param {ArenaLiveRoom} room
 */
async function syncCompletedStatus(arenaId, room) {
	if (room.completedSynced) {
		broadcast(room, {
			type: 'tournament-status',
			payload: { status: 'completed' },
			fetchedAt: Date.now()
		});
		return;
	}
	room.completedSynced = true;
	try {
		await markPublishedTournamentsCompletedForLichessArena(arenaId);
	} catch {
		// Allow a later poll to retry the DB write.
		room.completedSynced = false;
		return;
	}
	broadcast(room, {
		type: 'tournament-status',
		payload: { status: 'completed' },
		fetchedAt: Date.now()
	});
}

/**
 * @param {string} arenaId
 * @param {{ force?: boolean }} [options]
 */
async function runPoll(arenaId, options = {}) {
	const room = rooms.get(arenaId);
	if (!room || room.stopped) return;
	if (room.listeners.size === 0 && !options.force) return;
	if (room.polling) return;

	room.polling = true;
	await enqueuePoll(async () => {
		try {
			const snapshot = await fetchLichessArenaLive(arenaId, { bypassCache: true });
			if (!snapshot) {
				room.error = 'Lichess Arena not found';
				broadcast(room, {
					type: 'error',
					payload: { message: room.error },
					fetchedAt: Date.now()
				});
				return;
			}

			room.snapshot = snapshot;
			room.error = null;
			room.fetchedAt = Date.now();
			broadcast(room, {
				type: 'snapshot',
				payload: snapshot,
				fetchedAt: room.fetchedAt
			});
			syncFeaturedStream(arenaId, room);

			if (snapshot.status === 'finished') {
				room.featuredAbort?.abort();
				room.featuredAbort = null;
				room.featuredGameId = null;
				await syncCompletedStatus(arenaId, room);
			}
		} catch (err) {
			const message =
				err instanceof Error ? err.message : 'Could not load live Arena data';
			room.error = message;
			broadcast(room, {
				type: 'error',
				payload: { message },
				fetchedAt: Date.now()
			});

			// On rate limit, back off before the next schedule.
			if (/rate limit/i.test(message)) {
				if (room.timer) clearTimeout(room.timer);
				room.timer = setTimeout(() => {
					room.timer = null;
					void runPoll(arenaId);
				}, 60_000);
				return;
			}
		} finally {
			room.polling = false;
		}
	});

	const current = rooms.get(arenaId);
	if (!current || current.stopped) return;
	if (current.snapshot?.status === 'finished') return;
	if (current.listeners.size === 0) return;
	if (current.timer) return; // backoff timer already set
	scheduleNext(arenaId);
}

/**
 * Ensure a room is polling and return the latest snapshot (fetching once if needed).
 * Page loads may call this without subscribers; the room is kept warm briefly for SSE.
 * @param {string} arenaId
 * @returns {Promise<{ snapshot: LichessArenaLive | null, error: string | null, fetchedAt: number }>}
 */
export async function ensureArenaLive(arenaId) {
	const id = arenaId.trim();
	if (!/^[A-Za-z0-9]{6,32}$/.test(id)) {
		return { snapshot: null, error: 'Invalid Arena id', fetchedAt: 0 };
	}

	const room = getOrCreateRoom(id);
	room.stopped = false;

	if (!room.snapshot && !room.polling) {
		await runPoll(id, { force: true });
	} else if (
		room.listeners.size > 0 &&
		!room.timer &&
		!room.polling &&
		room.snapshot?.status !== 'finished'
	) {
		scheduleNext(id);
	}

	const result = {
		snapshot: room.snapshot,
		error: room.error,
		fetchedAt: room.fetchedAt
	};

	// Page-load warm-up without SSE: do not keep polling; expire empty rooms.
	if (room.listeners.size === 0) {
		if (room.timer) clearTimeout(room.timer);
		room.timer = null;
		room.featuredAbort?.abort();
		room.featuredAbort = null;
		room.featuredGameId = null;
		setTimeout(() => {
			const current = rooms.get(id);
			if (current && current.listeners.size === 0) {
				if (current.timer) clearTimeout(current.timer);
				current.featuredAbort?.abort();
				rooms.delete(id);
			}
		}, 30_000);
	}

	return result;
}

/**
 * Subscribe to live Arena updates. Starts the shared poller on first subscriber.
 * @param {string} arenaId
 * @param {(msg: ArenaLiveMessage) => void} listener
 * @returns {() => void} unsubscribe
 */
export function subscribeArenaLive(arenaId, listener) {
	const id = arenaId.trim();
	if (!/^[A-Za-z0-9]{6,32}$/.test(id)) {
		listener({
			type: 'error',
			payload: { message: 'Invalid Arena id' },
			fetchedAt: Date.now()
		});
		return () => {};
	}

	const room = getOrCreateRoom(id);
	room.stopped = false;
	room.listeners.add(listener);

	if (room.snapshot) {
		listener({
			type: 'snapshot',
			payload: room.snapshot,
			fetchedAt: room.fetchedAt || Date.now()
		});
	} else if (room.error) {
		listener({
			type: 'error',
			payload: { message: room.error },
			fetchedAt: room.fetchedAt || Date.now()
		});
	}

	if (!room.polling && (!room.snapshot || room.snapshot.status !== 'finished')) {
		void runPoll(id);
	} else if (room.snapshot && room.snapshot.status !== 'finished' && !room.timer) {
		scheduleNext(id);
	}

	if (room.snapshot?.featured?.id) {
		syncFeaturedStream(id, room);
	}

	return () => {
		room.listeners.delete(listener);
		if (room.listeners.size > 0) return;

		if (room.timer) clearTimeout(room.timer);
		room.timer = null;
		room.featuredAbort?.abort();
		room.featuredAbort = null;
		room.featuredGameId = null;
		room.stopped = true;
		// Keep last snapshot briefly for page loads; drop room to free memory.
		rooms.delete(id);
	};
}

/**
 * Test helper — clear all rooms.
 */
export function __resetArenaLiveHubForTests() {
	for (const room of rooms.values()) {
		if (room.timer) clearTimeout(room.timer);
		room.featuredAbort?.abort();
		room.listeners.clear();
	}
	rooms.clear();
	pollQueue = Promise.resolve();
}
