import { afterEach, describe, expect, it, vi } from 'vitest';
import { fideNameMatchesChessHub, lookupFidePlayer } from './fide';

describe('lookupFidePlayer', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('rejects invalid FIDE IDs', async () => {
		expect(await lookupFidePlayer('abc')).toEqual({
			ok: false,
			error: 'Enter your FIDE ID (5–10 digits)'
		});
		expect(await lookupFidePlayer('123')).toEqual({
			ok: false,
			error: 'Enter your FIDE ID (5–10 digits)'
		});
	});

	it('maps Lichess FIDE player JSON to ChessHub ratings', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => ({
				ok: true,
				status: 200,
				json: async () => ({
					id: 5200016,
					name: 'Torre, Eugenio',
					federation: 'PHI',
					title: 'GM',
					standard: 2423,
					rapid: 2423,
					blitz: 2343
				})
			}))
		);

		await expect(lookupFidePlayer('5200016')).resolves.toEqual({
			ok: true,
			username: '5200016',
			externalId: '5200016',
			name: 'Torre, Eugenio',
			displayName: 'GM Torre, Eugenio',
			federation: 'PHI',
			title: 'GM',
			rating: 2423,
			ratings: { standard: 2423, rapid: 2423, blitz: 2343 }
		});

		expect(fetch).toHaveBeenCalledWith(
			'https://lichess.org/api/fide/player/5200016',
			expect.objectContaining({
				headers: expect.objectContaining({
					Accept: 'application/json',
					'User-Agent': 'ChessHub/1.0 (tournament platform)'
				})
			})
		);
	});

	it('returns not found on 404', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => ({
				ok: false,
				status: 404,
				json: async () => ({})
			}))
		);

		await expect(lookupFidePlayer('9999999')).resolves.toEqual({
			ok: false,
			error: 'We couldn’t find that FIDE ID. Check the number and try again.'
		});
	});
});

describe('fideNameMatchesChessHub', () => {
	it('matches reordered “Last, First” vs “First Last”', () => {
		expect(fideNameMatchesChessHub('Torre, Eugenio', 'Eugenio Torre')).toBe(true);
		expect(fideNameMatchesChessHub('Carlsen, Magnus', 'GM Magnus Carlsen')).toBe(true);
	});

	it('rejects unrelated names and empty ChessHub names', () => {
		expect(fideNameMatchesChessHub('Carlsen, Magnus', 'Hikaru Nakamura')).toBe(false);
		expect(fideNameMatchesChessHub('Torre, Eugenio', '')).toBe(false);
		expect(fideNameMatchesChessHub('Torre, Eugenio', null)).toBe(false);
	});

	it('allows a majority token overlap', () => {
		expect(fideNameMatchesChessHub('dela Cruz, Juan Miguel', 'Juan Cruz')).toBe(true);
	});
});
