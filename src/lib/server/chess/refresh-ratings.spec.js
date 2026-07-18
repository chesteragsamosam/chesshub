import { afterEach, describe, expect, it, vi } from 'vitest';
import { refreshStaleChessRatings } from './refresh-ratings';

vi.mock('$lib/server/db/queries', () => ({
	listStaleChessAccounts: vi.fn(),
	updateChessAccountRatings: vi.fn()
}));

vi.mock('$lib/server/chess/lichess', () => ({
	fetchLichessPublicRatings: vi.fn()
}));

vi.mock('$lib/server/chess/chesscom', () => ({
	fetchChessComRatings: vi.fn()
}));

vi.mock('$lib/server/chess/fide', () => ({
	lookupFidePlayer: vi.fn()
}));

vi.mock('$lib/server/chess/mock-ratings', () => ({
	mockRatingsForUsername: () => null
}));

import { listStaleChessAccounts, updateChessAccountRatings } from '$lib/server/db/queries';
import { fetchLichessPublicRatings } from '$lib/server/chess/lichess';
import { lookupFidePlayer } from '$lib/server/chess/fide';

describe('refreshStaleChessRatings', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it('refreshes stale accounts sequentially and persists snapshots', async () => {
		vi.mocked(listStaleChessAccounts).mockResolvedValue([
			{
				id: 'a1',
				platform: 'lichess',
				username: 'Alice',
				ratingsUpdatedAt: null
			},
			{
				id: 'a2',
				platform: 'fide',
				username: '5200016',
				ratingsUpdatedAt: null
			}
		]);

		vi.mocked(fetchLichessPublicRatings).mockResolvedValue({
			rating: 1800,
			ratings: { classical: 1800, blitz: 1700 }
		});
		vi.mocked(lookupFidePlayer).mockResolvedValue({
			ok: true,
			rating: 2423,
			ratings: { standard: 2423, rapid: 2423, blitz: 2343 },
			displayName: 'GM Torre, Eugenio',
			federation: 'PHI',
			title: 'GM'
		});

		const result = await refreshStaleChessRatings({ delayMs: 0, limit: 10 });

		expect(result).toMatchObject({ examined: 2, refreshed: 2, failed: 0 });
		expect(updateChessAccountRatings).toHaveBeenCalledTimes(2);
		expect(updateChessAccountRatings).toHaveBeenNthCalledWith(
			1,
			'a1',
			expect.objectContaining({ rating: 1800 })
		);
		expect(updateChessAccountRatings).toHaveBeenNthCalledWith(
			2,
			'a2',
			expect.objectContaining({
				rating: 2423,
				federation: 'PHI',
				title: 'GM'
			})
		);
	});
});
