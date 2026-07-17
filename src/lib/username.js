/**
 * ChessHub profile usernames: 3–30 chars, lowercase letters, numbers, underscores.
 * @param {string} raw
 * @returns {{ ok: true, username: string } | { ok: false, error: string }}
 */
export function normalizeUsername(raw) {
	const username = raw.trim().toLowerCase();

	if (username.length < 3 || username.length > 30) {
		return { ok: false, error: 'Username must be 3–30 characters' };
	}

	if (!/^[a-z0-9_]+$/.test(username)) {
		return {
			ok: false,
			error: 'Username can only use lowercase letters, numbers, and underscores'
		};
	}

	if (RESERVED_USERNAMES.has(username)) {
		return { ok: false, error: 'That username is reserved' };
	}

	return { ok: true, username };
}

const RESERVED_USERNAMES = new Set([
	'admin',
	'api',
	'login',
	'logout',
	'register',
	'settings',
	'profile',
	'players',
	'followers',
	'following',
	'tournaments',
	'organizer',
	'auth',
	'me',
	'new',
	'edit',
	'support',
	'help'
]);

/**
 * Prefer shareable username; fall back to user id until one is set.
 * @param {{ id: string, username?: string | null }} user
 */
export function profileSlug(user) {
	return user.username || user.id;
}
