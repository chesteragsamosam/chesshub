import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const markPublishedTournamentsCompletedForLichessArena = vi.fn().mockResolvedValue(1);

vi.mock('$lib/server/db/queries', () => ({
	markPublishedTournamentsCompletedForLichessArena
}));

const { __resetArenaLiveHubForTests, ensureArenaLive, subscribeArenaLive } = await import(
	'./arena-live-hub.js'
);

afterEach(() => {
	__resetArenaLiveHubForTests();
	vi.unstubAllGlobals();
	vi.useRealTimers();
	markPublishedTournamentsCompletedForLichessArena.mockClear();
});

function mockArenaResponse(overrides = {}) {
	return {
		ok: true,
		status: 200,
		json: async () => ({
			id: 'AbCd1234',
			fullName: 'Test Arena',
			nbPlayers: 4,
			status: 10,
			secondsToStart: 120,
			standing: { page: 1, players: [] },
			duels: [],
			...overrides
		})
	};
}

describe('arena live hub', () => {
	beforeEach(() => {
		markPublishedTournamentsCompletedForLichessArena.mockResolvedValue(1);
	});

	it('ensureArenaLive fetches a snapshot without leaving a poller running', async () => {
		const fetchMock = vi.fn().mockResolvedValue(mockArenaResponse());
		vi.stubGlobal('fetch', fetchMock);

		const result = await ensureArenaLive('AbCd1234');
		expect(result.snapshot?.id).toBe('AbCd1234');
		expect(result.snapshot?.status).toBe('created');
		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(markPublishedTournamentsCompletedForLichessArena).not.toHaveBeenCalled();

		await new Promise((r) => setTimeout(r, 20));
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('fans out one Lichess poll to multiple subscribers', async () => {
		vi.useFakeTimers();
		const fetchMock = vi.fn().mockResolvedValue(
			mockArenaResponse({ status: 20, secondsToFinish: 600, secondsToStart: undefined })
		);
		vi.stubGlobal('fetch', fetchMock);

		/** @type {any[]} */
		const a = [];
		/** @type {any[]} */
		const b = [];
		const unsubA = subscribeArenaLive('AbCd1234', (msg) => a.push(msg));
		const unsubB = subscribeArenaLive('AbCd1234', (msg) => b.push(msg));

		await Promise.resolve();
		await Promise.resolve();
		await vi.advanceTimersByTimeAsync(0);

		const tournamentCalls = fetchMock.mock.calls.filter((call) =>
			String(call[0]).includes('/tournament/')
		);
		expect(tournamentCalls).toHaveLength(1);
		expect(a.some((m) => m.type === 'snapshot')).toBe(true);
		expect(b.some((m) => m.type === 'snapshot')).toBe(true);

		unsubA();
		unsubB();
	});

	it('stops polling when the last subscriber leaves', async () => {
		vi.useFakeTimers();
		const fetchMock = vi.fn().mockResolvedValue(
			mockArenaResponse({ status: 20, secondsToFinish: 600, secondsToStart: undefined })
		);
		vi.stubGlobal('fetch', fetchMock);

		const unsub = subscribeArenaLive('AbCd1234', () => {});
		await vi.advanceTimersByTimeAsync(0);
		await Promise.resolve();
		await Promise.resolve();

		const callsAfterSubscribe = fetchMock.mock.calls.length;
		unsub();

		await vi.advanceTimersByTimeAsync(30_000);
		expect(fetchMock.mock.calls.length).toBe(callsAfterSubscribe);
	});

	it('marks ChessHub tournaments completed when the Arena finishes', async () => {
		vi.useFakeTimers();
		const fetchMock = vi.fn().mockResolvedValue(
			mockArenaResponse({
				status: 30,
				isFinished: true,
				secondsToStart: undefined,
				secondsToFinish: undefined
			})
		);
		vi.stubGlobal('fetch', fetchMock);

		/** @type {any[]} */
		const messages = [];
		const unsub = subscribeArenaLive('AbCd1234', (msg) => messages.push(msg));

		await vi.advanceTimersByTimeAsync(0);
		await Promise.resolve();
		await Promise.resolve();
		await vi.advanceTimersByTimeAsync(0);

		expect(markPublishedTournamentsCompletedForLichessArena).toHaveBeenCalledWith('AbCd1234');
		expect(messages.some((m) => m.type === 'tournament-status' && m.payload.status === 'completed')).toBe(
			true
		);

		unsub();
	});
});
