import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	arenaDetailToSettings,
	buildChessHubArenaDescription,
	createLichessArena,
	fetchLichessArenaLive,
	fetchLichessTournamentStandings,
	formatLichessAllowList,
	isLichessTournamentFinished,
	isReasonableLichessArenaLength,
	isUnrateableLichessClock,
	joinLichessArena,
	matchLichessPrizes,
	normalizeLichessStandings,
	normalizeLichessTournamentId,
	parseLichessNdjson,
	personalTournamentAccessCode,
	snapshotLichessArenaSettings,
	syncLichessArenaAllowList,
	truncateLichessArenaName,
	updateLichessArena,
	validateLichessArenaCreateParams
} from './lichess-tournaments';

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('Lichess Arena entry codes', () => {
	it('matches the official Lichess HMAC sample', () => {
		expect(personalTournamentAccessCode('secr3t', 'DrNykterstein')).toBe(
			'3ae6cda5610ba80f5510c33ccfd27e0f063e9169a27346fc772087c41422403f'
		);
		expect(personalTournamentAccessCode('secr3t', 'drnykterstein')).toBe(
			'3ae6cda5610ba80f5510c33ccfd27e0f063e9169a27346fc772087c41422403f'
		);
	});

	it('joins an Arena with password and optional pairMeAsap', async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: async () => ({ ok: true })
		});
		vi.stubGlobal('fetch', fetchMock);

		await expect(
			joinLichessArena('player-token', 'AbCd1234', {
				password: 'entry-code',
				pairMeAsap: true
			})
		).resolves.toBe(true);

		expect(fetchMock.mock.calls[0][0]).toBe('https://lichess.org/api/tournament/AbCd1234/join');
		const [, init] = fetchMock.mock.calls[0];
		expect(init.headers.Authorization).toBe('Bearer player-token');
		const body = new URLSearchParams(init.body);
		expect(body.get('password')).toBe('entry-code');
		expect(body.get('pairMeAsap')).toBe('true');
	});
});

describe('Lichess Arena create', () => {
	it('rejects unrateable clocks and bad length ratios', () => {
		expect(isUnrateableLichessClock(0.25, 0)).toBe(true);
		expect(isUnrateableLichessClock(0, 1)).toBe(true);
		expect(isUnrateableLichessClock(3, 0)).toBe(false);
		expect(isReasonableLichessArenaLength(3, 0, 60)).toBe(true);
		expect(validateLichessArenaCreateParams({ clockTime: 0.25, clockIncrement: 0, minutes: 60 })).toMatch(
			/cannot be rated/
		);
	});

	it('truncates Arena names to 30 characters', () => {
		expect(truncateLichessArenaName('  Hello   World  ')).toBe('Hello World');
		expect(truncateLichessArenaName('x'.repeat(40))).toHaveLength(30);
	});

	it('creates a rated Arena via the Lichess API', async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: async () => ({ id: '5TBlfjvT', fullName: 'ChessHub Arena' })
		});
		vi.stubGlobal('fetch', fetchMock);

		const result = await createLichessArena('token', {
			clockTime: 3,
			clockIncrement: 0,
			minutes: 60,
			name: 'ChessHub Arena',
			startDateMs: Date.now() + 3_600_000,
			minRatedGames: 10,
			variant: 'chess960',
			berserkable: true,
			streakable: false,
			hasChat: true,
			minRating: 1500,
			maxRating: 2000,
			teamMemberTeamId: 'coders',
			allowList: 'alice,bob,%titled',
			accountAgeDays: 7,
			password: 'secret'
		});

		expect(result).toEqual({
			id: '5TBlfjvT',
			fullName: 'ChessHub Arena',
			fullUrl: 'https://lichess.org/tournament/5TBlfjvT'
		});

		const [, init] = fetchMock.mock.calls[0];
		const body = new URLSearchParams(init.body);
		expect(body.get('rated')).toBe('true');
		expect(body.get('variant')).toBe('chess960');
		expect(body.get('streakable')).toBe('false');
		expect(body.get('conditions.minRating.rating')).toBe('1500');
		expect(body.get('conditions.maxRating.rating')).toBe('2000');
		expect(body.get('conditions.teamMember.teamId')).toBe('coders');
		expect(body.get('conditions.allowList')).toBe('alice,bob,%titled');
		expect(body.get('conditions.accountAge')).toBe('7');
		expect(body.get('password')).toBe('secret');
		expect(body.get('conditions.nbRatedGame.nb')).toBe('10');
	});

	it('builds a ChessHub join description with the tournament URL', () => {
		const text = buildChessHubArenaDescription(
			'https://chesshub.example/tournaments/abc',
			'Cash prizes via ChessHub.'
		);
		expect(text).toContain('https://chesshub.example/tournaments/abc');
		expect(text).toContain('How to join');
		expect(text).toContain('allow list');
		expect(text).toContain('Cash prizes via ChessHub.');
	});

	it('formats allow lists and syncs them without wiping other conditions', async () => {
		expect(formatLichessAllowList(['Alice', 'alice', 'Bob', ''])).toBe('Alice,Bob');

		const settings = snapshotLichessArenaSettings({
			clockTime: 3,
			clockIncrement: 0,
			minutes: 60,
			minRatedGames: 10,
			minRating: 1500,
			teamMemberTeamId: 'coders',
			allowBots: false,
			berserkable: true,
			streakable: false,
			hasChat: true,
			description: 'Join via ChessHub'
		});

		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: async () => ({ id: 'AbCd1234' })
		});
		vi.stubGlobal('fetch', fetchMock);

		await syncLichessArenaAllowList('token', 'AbCd1234', {
			settings,
			password: 'secret',
			usernames: ['Organizer', 'PlayerOne']
		});

		const body = new URLSearchParams(fetchMock.mock.calls[0][1].body);
		expect(body.get('conditions.allowList')).toBe('Organizer,PlayerOne');
		expect(body.get('conditions.minRating.rating')).toBe('1500');
		expect(body.get('conditions.teamMember.teamId')).toBe('coders');
		expect(body.get('password')).toBe('secret');
		expect(body.get('streakable')).toBe('false');
	});

	it('rebuilds settings from a public Arena detail payload', () => {
		const settings = arenaDetailToSettings({
			clock: { limit: 180, increment: 2 },
			minutes: 45,
			variant: 'chess960',
			minRatedGames: { nb: 20 },
			minRating: { rating: 1600 },
			botsAllowed: true,
			minAccountAgeInDays: 7,
			description: 'Hi'
		});
		expect(settings).toMatchObject({
			clockTime: 3,
			clockIncrement: 2,
			minutes: 45,
			variant: 'chess960',
			minRatedGames: 20,
			minRating: 1600,
			allowBots: true,
			accountAgeDays: 7
		});
	});

	it('updates an Arena description via the Lichess API', async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: async () => ({ id: 'AbCd1234' })
		});
		vi.stubGlobal('fetch', fetchMock);

		await updateLichessArena('token', 'AbCd1234', {
			clockTime: 3,
			clockIncrement: 0,
			minutes: 60,
			description: 'Join via ChessHub',
			password: 'secret'
		});

		expect(fetchMock.mock.calls[0][0]).toBe('https://lichess.org/api/tournament/AbCd1234');
		const body = new URLSearchParams(fetchMock.mock.calls[0][1].body);
		expect(body.get('description')).toBe('Join via ChessHub');
		expect(body.get('password')).toBe('secret');
		expect(body.get('clockTime')).toBe('3');
	});

	it('fetches a live Arena snapshot with standings and featured game', async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: async () => ({
				id: 'AbCd1234',
				fullName: 'Test Arena',
				nbPlayers: 12,
				status: 20,
				secondsToFinish: 900,
				standing: {
					page: 1,
					players: [{ name: 'Alice', rank: 1, rating: 1800, score: 4, title: 'FM' }]
				},
				duels: [{ id: 'game1234', p: [{ n: 'Alice', r: 1800 }, { n: 'Bob', r: 1700 }] }],
				featured: {
					id: 'feat1234',
					fen: '8/8/8/8/8/8/8/8 w - - 0 1',
					white: { name: 'Alice', rating: 1800, rank: 1 },
					black: { name: 'Bob', rating: 1700, rank: 2 },
					c: { white: 60, black: 55 }
				}
			})
		});
		vi.stubGlobal('fetch', fetchMock);

		const live = await fetchLichessArenaLive('AbCd1234', { bypassCache: true });
		expect(live?.status).toBe('started');
		expect(live?.nbPlayers).toBe(12);
		expect(live?.standing[0]).toMatchObject({ name: 'Alice', rank: 1, score: 4 });
		expect(live?.featured?.id).toBe('feat1234');
		expect(live?.duels[0].white).toBe('Alice');
	});
});

describe('Lichess tournament results', () => {
	it('normalizes Arena and Swiss URLs', () => {
		expect(normalizeLichessTournamentId('https://lichess.org/tournament/AbCd1234', 'arena')).toBe(
			'AbCd1234'
		);
		expect(normalizeLichessTournamentId('https://lichess.org/swiss/ZyXw9876', 'swiss')).toBe(
			'ZyXw9876'
		);
		expect(normalizeLichessTournamentId('https://example.com/tournament/AbCd1234', 'arena')).toBe(
			null
		);
	});

	it('parses and normalizes NDJSON standings', () => {
		const rows = parseLichessNdjson(
			'{"rank":2,"username":"Beta","points":3.5}\n{"rank":1,"name":"Alpha","score":5}\n'
		);
		expect(normalizeLichessStandings(rows)).toEqual([
			{ rank: 1, username: 'Alpha', score: 5 },
			{ rank: 2, username: 'Beta', score: 3.5 }
		]);
	});

	it('matches only verified eligible usernames case-insensitively', () => {
		const matches = matchLichessPrizes(
			[{ id: 'prize-1', placement: 1, label: 'Champion', amountCents: 100_000 }],
			[{ rank: 1, username: 'WinnerOne', score: 10 }],
			[
				{
					userId: 'user-1',
					name: 'Winner',
					username: 'winner',
					lichessUsername: 'winnerone'
				}
			]
		);
		expect(matches[0]).toMatchObject({ matched: true, userId: 'user-1' });
	});

	it('recognizes supported finished status shapes', () => {
		expect(isLichessTournamentFinished({ isFinished: true })).toBe(true);
		expect(isLichessTournamentFinished({ status: 'finished' })).toBe(true);
		expect(isLichessTournamentFinished({ status: 30 })).toBe(true);
		expect(isLichessTournamentFinished({ status: 'started' })).toBe(false);
	});

	it.each([
		['arena', '/tournament/Arena123/results'],
		['swiss', '/swiss/Swiss123/results']
	])('fetches final %s standings from the correct endpoint', async (format, resultPath) => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ isFinished: true }), {
					status: 200,
					headers: { 'Content-Type': 'application/json' }
				})
			)
			.mockResolvedValueOnce(new Response('{"rank":1,"username":"Winner","score":8}\n'));
		vi.stubGlobal('fetch', fetchMock);

		await expect(
			fetchLichessTournamentStandings(
				format === 'arena' ? 'Arena123' : 'Swiss123',
				/** @type {'arena' | 'swiss'} */ (format)
			)
		).resolves.toEqual([{ rank: 1, username: 'Winner', score: 8 }]);
		expect(fetchMock.mock.calls[1][0]).toContain(resultPath);
	});
});
