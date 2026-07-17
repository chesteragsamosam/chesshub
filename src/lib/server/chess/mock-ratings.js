/**
 * Deterministic mock ratings for seeded usernames like `mock-1847`.
 * @param {string} username
 * @returns {{ rating: number, ratings: Record<string, number> } | null}
 */
export function mockRatingsForUsername(username) {
	const match = username.match(/^mock-(\d{3,4})$/);
	if (!match) return null;

	const classical = Number.parseInt(match[1], 10);
	if (!Number.isFinite(classical)) return null;

	const spread = classical % 200;

	return {
		rating: classical,
		ratings: {
			bullet: classical - 80 + (spread % 40),
			blitz: classical - 40 + (spread % 30),
			rapid: classical - 20 + (spread % 20),
			classical,
			correspondence: classical - 60,
			puzzle: classical - 100 + (spread % 50),
			standard: classical,
			daily: classical - 30
		}
	};
}
