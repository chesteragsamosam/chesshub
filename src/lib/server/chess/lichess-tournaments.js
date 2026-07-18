import { createHmac } from 'node:crypto';

const LICHESS_API = 'https://lichess.org/api';
export const LICHESS_USER_AGENT = 'ChessHub/1.0 (tournament platform)';

/** @type {readonly number[]} */
export const LICHESS_ARENA_CLOCK_TIMES = [
	0, 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4, 5, 6, 7, 8, 10, 15, 20, 25, 30, 40, 50, 60
];

/** @type {readonly number[]} */
export const LICHESS_ARENA_CLOCK_INCREMENTS = [
	0, 1, 2, 3, 4, 5, 6, 7, 10, 15, 20, 25, 30, 40, 50, 60
];

/** @type {readonly number[]} */
export const LICHESS_ARENA_MINUTES = [
	20, 25, 30, 35, 40, 45, 50, 55, 60, 70, 80, 90, 100, 110, 120, 150, 180, 210, 240, 270, 300, 330,
	360, 420, 480, 540, 600, 720
];

/** @type {readonly number[]} */
export const LICHESS_ARENA_MIN_RATED_GAMES = [0, 5, 10, 15, 20, 30, 40, 50, 75, 100, 150, 200];

/** @type {readonly number[]} */
export const LICHESS_ARENA_WAIT_MINUTES = [1, 2, 3, 5, 10, 15, 20, 30, 45, 60];

/** @type {readonly number[]} */
export const LICHESS_ARENA_MIN_RATINGS = [
	1000, 1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900, 2000, 2100, 2200, 2300, 2400, 2500, 2600
];

/** @type {readonly number[]} */
export const LICHESS_ARENA_MAX_RATINGS = [
	2200, 2100, 2000, 1900, 1800, 1700, 1600, 1500, 1400, 1300, 1200, 1100, 1000, 900, 800
];

/** @type {readonly number[]} */
export const LICHESS_ARENA_ACCOUNT_AGES = [1, 3, 7, 14, 30, 60, 90, 180, 365, 730, 1095];

/** @type {readonly string[]} */
export const LICHESS_ARENA_VARIANTS = [
	'standard',
	'chess960',
	'crazyhouse',
	'antichess',
	'atomic',
	'horde',
	'kingOfTheHill',
	'racingKings',
	'threeCheck',
	'fromPosition'
];

/**
 * @typedef {{
 *   clockTime: number
 *   clockIncrement: number
 *   minutes: number
 *   name?: string
 *   description?: string
 *   startDateMs?: number
 *   waitMinutes?: number
 *   variant?: string
 *   position?: string
 *   berserkable?: boolean
 *   streakable?: boolean
 *   hasChat?: boolean
 *   password?: string
 *   teamMemberTeamId?: string
 *   minRating?: number | null
 *   maxRating?: number | null
 *   minRatedGames?: number
 *   allowList?: string
 *   allowBots?: boolean
 *   accountAgeDays?: number | null
 * }} LichessArenaCreateParams
 */

/**
 * @param {number} clockTime minutes
 * @param {number} clockIncrement seconds
 */
export function isUnrateableLichessClock(clockTime, clockIncrement) {
	// Lichess: 15s and 0+1 cannot be rated
	if (clockTime === 0.25 && clockIncrement === 0) return true;
	if (clockTime === 0 && clockIncrement === 1) return true;
	return false;
}

/**
 * Lichess constraint: 3 <= (minutes * 60) / (96 * clockTime + 48 * clockIncrement + 15) <= 150
 * @param {number} clockTime
 * @param {number} clockIncrement
 * @param {number} minutes
 */
export function isReasonableLichessArenaLength(clockTime, clockIncrement, minutes) {
	const denominator = 96 * clockTime + 48 * clockIncrement + 15;
	if (denominator <= 0) return false;
	const ratio = (minutes * 60) / denominator;
	return ratio >= 3 && ratio <= 150;
}

/**
 * @param {string} title
 */
export function truncateLichessArenaName(title) {
	const trimmed = title.trim().replace(/\s+/g, ' ');
	if (trimmed.length < 2) return '';
	return trimmed.slice(0, 30);
}

/**
 * @param {string} fen
 */
function looksLikeFen(fen) {
	const parts = fen.trim().split(/\s+/);
	return parts.length >= 4 && parts[0].includes('/');
}

/**
 * @param {LichessArenaCreateParams} params
 */
export function validateLichessArenaCreateParams(params) {
	const { clockTime, clockIncrement, minutes } = params;

	if (!LICHESS_ARENA_CLOCK_TIMES.includes(clockTime)) {
		return 'Invalid clock time';
	}
	if (!LICHESS_ARENA_CLOCK_INCREMENTS.includes(clockIncrement)) {
		return 'Invalid clock increment';
	}
	if (!LICHESS_ARENA_MINUTES.includes(minutes)) {
		return 'Invalid tournament duration';
	}
	if (clockTime + clockIncrement <= 0) {
		return 'Clock time plus increment must be greater than zero';
	}
	if (isUnrateableLichessClock(clockTime, clockIncrement)) {
		return 'This time control cannot be rated on Lichess (15s and 0+1 are not allowed)';
	}
	if (!isReasonableLichessArenaLength(clockTime, clockIncrement, minutes)) {
		return 'Tournament length is not reasonable for this time control';
	}

	if (params.berserkable !== false && clockIncrement > clockTime * 2) {
		return 'Berserk is only allowed when increment ≤ clock time × 2';
	}

	const variant = params.variant ?? 'standard';
	if (!LICHESS_ARENA_VARIANTS.includes(variant)) {
		return 'Invalid chess variant';
	}
	if (variant === 'fromPosition') {
		const fen = params.position?.trim() ?? '';
		if (!fen || !looksLikeFen(fen)) {
			return 'From-position Arenas require a valid FEN';
		}
	}

	const minRated = params.minRatedGames == null ? 10 : Number(params.minRatedGames);
	if (!LICHESS_ARENA_MIN_RATED_GAMES.includes(minRated)) {
		return 'Invalid minimum rated games requirement';
	}

	if (params.minRating != null && params.minRating !== 0) {
		if (!LICHESS_ARENA_MIN_RATINGS.includes(params.minRating)) {
			return 'Invalid minimum rating';
		}
	}
	if (params.maxRating != null && params.maxRating !== 0) {
		if (!LICHESS_ARENA_MAX_RATINGS.includes(params.maxRating)) {
			return 'Invalid maximum rating';
		}
	}
	if (
		params.minRating != null &&
		params.minRating !== 0 &&
		params.maxRating != null &&
		params.maxRating !== 0 &&
		params.minRating > params.maxRating
	) {
		return 'Minimum rating cannot exceed maximum rating';
	}

	if (params.accountAgeDays != null && params.accountAgeDays !== 0) {
		if (!LICHESS_ARENA_ACCOUNT_AGES.includes(params.accountAgeDays)) {
			return 'Invalid account age requirement';
		}
	}

	if (params.waitMinutes != null && !LICHESS_ARENA_WAIT_MINUTES.includes(params.waitMinutes)) {
		return 'Invalid wait minutes';
	}

	if (params.name != null) {
		const name = truncateLichessArenaName(params.name);
		if (name && (name.length < 2 || name.length > 30)) {
			return 'Lichess tournament name must be 2–30 characters';
		}
	}

	if (params.startDateMs != null) {
		if (!Number.isFinite(params.startDateMs) || params.startDateMs < Date.now() - 60_000) {
			return 'Start time must be in the future';
		}
	}

	return null;
}

/**
 * Create a rated Arena tournament on Lichess.
 * @param {string} accessToken
 * @param {LichessArenaCreateParams} params
 * @returns {Promise<{ id: string, fullUrl: string, fullName: string }>}
 */
export async function createLichessArena(accessToken, params) {
	const validationError = validateLichessArenaCreateParams(params);
	if (validationError) {
		throw new Error(validationError);
	}

	const minRatedGames = params.minRatedGames == null ? 10 : params.minRatedGames;
	const name = params.name ? truncateLichessArenaName(params.name) : '';
	const variant = params.variant ?? 'standard';
	const berserkable = params.berserkable !== false;
	const streakable = params.streakable !== false;
	const hasChat = params.hasChat !== false;

	const body = new URLSearchParams();
	body.set('clockTime', String(params.clockTime));
	body.set('clockIncrement', String(params.clockIncrement));
	body.set('minutes', String(params.minutes));
	body.set('rated', 'true');
	body.set('variant', variant);
	body.set('berserkable', berserkable ? 'true' : 'false');
	body.set('streakable', streakable ? 'true' : 'false');
	body.set('hasChat', hasChat ? 'true' : 'false');
	body.set('conditions.nbRatedGame.nb', String(minRatedGames));
	body.set('conditions.bots', params.allowBots ? 'true' : 'false');

	if (name) body.set('name', name);
	if (params.description?.trim()) body.set('description', params.description.trim());
	if (params.startDateMs != null) {
		body.set('startDate', String(Math.round(params.startDateMs)));
	} else if (params.waitMinutes != null) {
		body.set('waitMinutes', String(params.waitMinutes));
	}
	if (variant === 'fromPosition' && params.position?.trim()) {
		body.set('position', params.position.trim());
	}
	if (params.password?.trim()) body.set('password', params.password.trim());
	if (params.teamMemberTeamId?.trim()) {
		body.set('conditions.teamMember.teamId', params.teamMemberTeamId.trim());
	}
	if (params.minRating != null && params.minRating !== 0) {
		body.set('conditions.minRating.rating', String(params.minRating));
	}
	if (params.maxRating != null && params.maxRating !== 0) {
		body.set('conditions.maxRating.rating', String(params.maxRating));
	}
	if (params.allowList?.trim()) {
		body.set('conditions.allowList', params.allowList.trim());
	}
	if (params.accountAgeDays != null && params.accountAgeDays !== 0) {
		body.set('conditions.accountAge', String(params.accountAgeDays));
	}

	const res = await fetch(`${LICHESS_API}/tournament`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${accessToken}`,
			'Content-Type': 'application/x-www-form-urlencoded',
			Accept: 'application/json',
			'User-Agent': LICHESS_USER_AGENT
		},
		body
	});

	if (res.status === 429) {
		throw new Error('Lichess rate limit reached. Wait at least one minute and try again.');
	}

	if (res.status === 401 || res.status === 403) {
		const err = new Error(
			'Could not reach your Lichess account. Connect Lichess again and try once more.'
		);
		// @ts-expect-error attach status for callers
		err.status = res.status;
		throw err;
	}

	if (!res.ok) {
		let message = 'Could not create the Lichess Arena';
		const text = await res.text().catch(() => '');
		if (text) {
			try {
				const payload = /** @type {{ error?: string, message?: string }} */ (JSON.parse(text));
				message = payload.error || payload.message || message;
			} catch {
				message = text.slice(0, 300);
			}
		}
		throw new Error(message);
	}

	const data = /** @type {{ id?: string, fullName?: string }} */ (await res.json());
	if (!data.id || !/^[A-Za-z0-9]{6,32}$/.test(data.id)) {
		throw new Error('Lichess did not return a valid Arena id');
	}

	return {
		id: data.id,
		fullName: data.fullName ?? data.id,
		fullUrl: `https://lichess.org/tournament/${data.id}`
	};
}

/**
 * Build the Lichess Arena description so players register/join via ChessHub.
 * @param {string} joinUrl Absolute ChessHub tournament URL
 * @param {string} [organizerDescription]
 */
export function buildChessHubArenaDescription(joinUrl, organizerDescription = '') {
	const joinBlock = [
		'How to join',
		'',
		'1. Open the ChessHub tournament page and register:',
		joinUrl,
		'2. After registering, use “Join Lichess Arena” on ChessHub (no password needed).',
		'',
		'Only ChessHub-registered players are on the Lichess allow list. The Arena password alone is not enough to join.'
	].join('\n');

	const extra = organizerDescription.trim();
	return extra ? `${joinBlock}\n\n${extra}` : joinBlock;
}

/**
 * Dedupe Lichess usernames for `conditions.allowList` (comma-separated).
 * @param {Iterable<string | null | undefined>} usernames
 */
export function formatLichessAllowList(usernames) {
	/** @type {string[]} */
	const ordered = [];
	const seen = new Set();
	for (const raw of usernames) {
		const trimmed = String(raw ?? '').trim();
		if (!trimmed) continue;
		const key = trimmed.toLowerCase();
		if (seen.has(key)) continue;
		seen.add(key);
		ordered.push(trimmed);
	}
	return ordered.join(',');
}

/**
 * Fields needed to update an Arena without wiping entry conditions.
 * @typedef {{
 *   clockTime: number
 *   clockIncrement: number
 *   minutes: number
 *   variant?: string
 *   position?: string | null
 *   berserkable?: boolean
 *   streakable?: boolean
 *   hasChat?: boolean
 *   minRatedGames?: number
 *   minRating?: number | null
 *   maxRating?: number | null
 *   teamMemberTeamId?: string | null
 *   allowBots?: boolean
 *   accountAgeDays?: number | null
 *   description?: string | null
 * }} LichessArenaSettings
 */

/**
 * @param {LichessArenaSettings & {
 *   password?: string
 *   allowList?: string
 *   rated?: boolean
 * }} params
 */
function buildArenaUpdateBody(params) {
	const minRatedGames = params.minRatedGames == null ? 10 : params.minRatedGames;
	const variant = params.variant ?? 'standard';
	const berserkable = params.berserkable !== false;
	const streakable = params.streakable !== false;
	const hasChat = params.hasChat !== false;

	const body = new URLSearchParams();
	body.set('clockTime', String(params.clockTime));
	body.set('clockIncrement', String(params.clockIncrement));
	body.set('minutes', String(params.minutes));
	body.set('rated', params.rated === false ? 'false' : 'true');
	body.set('variant', variant);
	body.set('berserkable', berserkable ? 'true' : 'false');
	body.set('streakable', streakable ? 'true' : 'false');
	body.set('hasChat', hasChat ? 'true' : 'false');
	body.set('conditions.nbRatedGame.nb', String(minRatedGames));
	body.set('conditions.bots', params.allowBots ? 'true' : 'false');

	if (params.description != null) body.set('description', params.description);
	if (params.password?.trim()) body.set('password', params.password.trim());
	if (variant === 'fromPosition' && params.position?.trim()) {
		body.set('position', params.position.trim());
	}
	if (params.teamMemberTeamId?.trim()) {
		body.set('conditions.teamMember.teamId', params.teamMemberTeamId.trim());
	}
	if (params.minRating != null && params.minRating !== 0) {
		body.set('conditions.minRating.rating', String(params.minRating));
	}
	if (params.maxRating != null && params.maxRating !== 0) {
		body.set('conditions.maxRating.rating', String(params.maxRating));
	}
	if (params.allowList != null) {
		body.set('conditions.allowList', params.allowList.trim());
	}
	if (params.accountAgeDays != null && params.accountAgeDays !== 0) {
		body.set('conditions.accountAge', String(params.accountAgeDays));
	}

	return body;
}

/**
 * Persistable settings snapshot from create-time params.
 * @param {LichessArenaCreateParams} params
 * @returns {LichessArenaSettings}
 */
export function snapshotLichessArenaSettings(params) {
	return {
		clockTime: params.clockTime,
		clockIncrement: params.clockIncrement,
		minutes: params.minutes,
		variant: params.variant ?? 'standard',
		position: params.position ?? null,
		berserkable: params.berserkable !== false,
		streakable: params.streakable !== false,
		hasChat: params.hasChat !== false,
		minRatedGames: params.minRatedGames == null ? 10 : params.minRatedGames,
		minRating: params.minRating ?? null,
		maxRating: params.maxRating ?? null,
		teamMemberTeamId: params.teamMemberTeamId ?? null,
		allowBots: Boolean(params.allowBots),
		accountAgeDays: params.accountAgeDays ?? null,
		description: params.description ?? null
	};
}

/**
 * @param {string | null | undefined} raw
 * @returns {LichessArenaSettings | null}
 */
export function parseLichessArenaSettings(raw) {
	if (!raw?.trim()) return null;
	try {
		const parsed = /** @type {Partial<LichessArenaSettings>} */ (JSON.parse(raw));
		if (
			typeof parsed.clockTime !== 'number' ||
			typeof parsed.clockIncrement !== 'number' ||
			typeof parsed.minutes !== 'number'
		) {
			return null;
		}
		return {
			clockTime: parsed.clockTime,
			clockIncrement: parsed.clockIncrement,
			minutes: parsed.minutes,
			variant: parsed.variant ?? 'standard',
			position: parsed.position ?? null,
			berserkable: parsed.berserkable !== false,
			streakable: parsed.streakable !== false,
			hasChat: parsed.hasChat !== false,
			minRatedGames: parsed.minRatedGames == null ? 10 : parsed.minRatedGames,
			minRating: parsed.minRating ?? null,
			maxRating: parsed.maxRating ?? null,
			teamMemberTeamId: parsed.teamMemberTeamId ?? null,
			allowBots: Boolean(parsed.allowBots),
			accountAgeDays: parsed.accountAgeDays ?? null,
			description: parsed.description ?? null
		};
	} catch {
		return null;
	}
}

/**
 * Best-effort rebuild of update settings from a public Arena detail payload.
 * @param {Record<string, any>} detail
 * @returns {LichessArenaSettings | null}
 */
export function arenaDetailToSettings(detail) {
	const limit = Number(detail?.clock?.limit);
	const increment = Number(detail?.clock?.increment);
	const minutes = Number(detail?.minutes);
	if (!Number.isFinite(limit) || !Number.isFinite(increment) || !Number.isFinite(minutes)) {
		return null;
	}

	return {
		clockTime: limit / 60,
		clockIncrement: increment,
		minutes,
		variant: typeof detail.variant === 'string' ? detail.variant : 'standard',
		berserkable: detail.berserkable !== false,
		streakable: detail.streakable !== false,
		hasChat: detail.hasChat !== false,
		minRatedGames:
			typeof detail.minRatedGames?.nb === 'number' ? detail.minRatedGames.nb : 10,
		minRating: typeof detail.minRating?.rating === 'number' ? detail.minRating.rating : null,
		maxRating: typeof detail.maxRating?.rating === 'number' ? detail.maxRating.rating : null,
		allowBots: detail.botsAllowed === true,
		accountAgeDays:
			typeof detail.minAccountAgeInDays === 'number' ? detail.minAccountAgeInDays : null,
		description: typeof detail.description === 'string' ? detail.description : null,
		teamMemberTeamId: null,
		position: null
	};
}

/**
 * Update an Arena tournament (requires clock fields per Lichess API).
 * Re-send entry conditions whenever changing allowList — omitted conditions are cleared.
 * @param {string} accessToken
 * @param {string} tournamentId
 * @param {LichessArenaSettings & {
 *   description?: string
 *   password?: string
 *   rated?: boolean
 *   allowList?: string
 * }} params
 */
export async function updateLichessArena(accessToken, tournamentId, params) {
	const body = buildArenaUpdateBody(params);

	const res = await fetch(`${LICHESS_API}/tournament/${tournamentId}`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${accessToken}`,
			'Content-Type': 'application/x-www-form-urlencoded',
			Accept: 'application/json',
			'User-Agent': LICHESS_USER_AGENT
		},
		body
	});

	if (res.status === 429) {
		throw new Error('Lichess rate limit reached. Wait at least one minute and try again.');
	}

	if (res.status === 401 || res.status === 403) {
		const err = new Error(
			'Could not reach your Lichess account. Connect Lichess again and try once more.'
		);
		// @ts-expect-error attach status for callers
		err.status = res.status;
		throw err;
	}

	if (!res.ok) {
		let message = 'Could not update the Lichess Arena';
		const text = await res.text().catch(() => '');
		if (text) {
			try {
				const payload = /** @type {{ error?: string, message?: string }} */ (JSON.parse(text));
				message = payload.error || payload.message || message;
			} catch {
				message = text.slice(0, 300);
			}
		}
		throw new Error(message);
	}

	return /** @type {Record<string, any>} */ (await res.json());
}

/**
 * Replace the Arena allow list while preserving other create-time conditions.
 * @param {string} accessToken
 * @param {string} tournamentId
 * @param {{
 *   settings: LichessArenaSettings
 *   password: string
 *   usernames: Iterable<string | null | undefined>
 * }} options
 */
export async function syncLichessArenaAllowList(accessToken, tournamentId, options) {
	const allowList = formatLichessAllowList(options.usernames);
	if (!allowList) {
		throw new Error('Arena allow list cannot be empty');
	}

	return updateLichessArena(accessToken, tournamentId, {
		...options.settings,
		password: options.password,
		allowList
	});
}

/**
 * @typedef {{
 *   id: string
 *   fullName: string
 *   fullUrl: string
 *   nbPlayers: number
 *   status: 'created' | 'started' | 'finished'
 *   secondsToStart: number | null
 *   secondsToFinish: number | null
 *   startsAt: string | null
 *   standing: Array<{
 *     rank: number
 *     name: string
 *     title: string | null
 *     rating: number | null
 *     score: number
 *   }>
 *   duels: Array<{
 *     id: string
 *     white: string
 *     black: string
 *     whiteRating: number | null
 *     blackRating: number | null
 *   }>
 *   featured: {
 *     id: string
 *     fen: string | null
 *     lastMove: string | null
 *     white: { name: string, rating: number | null, rank: number | null }
 *     black: { name: string, rating: number | null, rank: number | null }
 *     clocks: { white: number | null, black: number | null } | null
 *   } | null
 * }} LichessArenaLive
 */

/** @type {Map<string, { at: number, data: LichessArenaLive }>} */
const arenaLiveCache = new Map();
const ARENA_LIVE_CACHE_MS = 8_000;

/**
 * @param {Record<string, any>} detail
 * @returns {'created' | 'started' | 'finished'}
 */
function normalizeArenaLiveStatus(detail) {
	if (isLichessTournamentFinished(detail) || detail.status === 30) return 'finished';
	if (detail.status === 20 || detail.isStarted === true) return 'started';
	if (typeof detail.secondsToFinish === 'number' && detail.secondsToFinish > 0) return 'started';
	if (typeof detail.secondsToStart === 'number' && detail.secondsToStart > 0) return 'created';
	if (detail.status === 10) return 'created';
	return 'started';
}

/**
 * Public Arena snapshot for live tournament pages (standings, countdown, featured game).
 * Short-lived cache to stay within Lichess rate limits when clients poll.
 * @param {string} tournamentId
 * @param {{ bypassCache?: boolean }} [options]
 * @returns {Promise<LichessArenaLive | null>}
 */
export async function fetchLichessArenaLive(tournamentId, options = {}) {
	const id = tournamentId.trim();
	if (!/^[A-Za-z0-9]{6,32}$/.test(id)) return null;

	const cached = arenaLiveCache.get(id);
	if (!options.bypassCache && cached && Date.now() - cached.at < ARENA_LIVE_CACHE_MS) {
		return cached.data;
	}

	const res = await fetch(`${LICHESS_API}/tournament/${id}?page=1`, {
		headers: {
			Accept: 'application/json',
			'User-Agent': LICHESS_USER_AGENT
		}
	});

	if (res.status === 429) {
		if (cached) return cached.data;
		throw new Error('Lichess rate limit reached. Wait at least one minute and try again.');
	}

	if (res.status === 404) return null;
	if (!res.ok) {
		if (cached) return cached.data;
		throw new Error('Could not load Lichess Arena');
	}

	const detail = /** @type {Record<string, any>} */ (await res.json());
	const standingPlayers = Array.isArray(detail.standing?.players) ? detail.standing.players : [];
	const duels = Array.isArray(detail.duels) ? detail.duels : [];
	const featured = detail.featured?.id
		? {
				id: String(detail.featured.id),
				fen: detail.featured.fen ? String(detail.featured.fen) : null,
				lastMove: detail.featured.lastMove ? String(detail.featured.lastMove) : null,
				white: {
					name: String(detail.featured.white?.name ?? 'White'),
					rating:
						typeof detail.featured.white?.rating === 'number'
							? detail.featured.white.rating
							: null,
					rank:
						typeof detail.featured.white?.rank === 'number' ? detail.featured.white.rank : null
				},
				black: {
					name: String(detail.featured.black?.name ?? 'Black'),
					rating:
						typeof detail.featured.black?.rating === 'number'
							? detail.featured.black.rating
							: null,
					rank:
						typeof detail.featured.black?.rank === 'number' ? detail.featured.black.rank : null
				},
				clocks:
					detail.featured.c &&
					(typeof detail.featured.c.white === 'number' ||
						typeof detail.featured.c.black === 'number')
						? {
								white:
									typeof detail.featured.c.white === 'number' ? detail.featured.c.white : null,
								black:
									typeof detail.featured.c.black === 'number' ? detail.featured.c.black : null
							}
						: null
			}
		: null;

	/** @type {LichessArenaLive} */
	const data = {
		id: String(detail.id ?? id),
		fullName: String(detail.fullName ?? id),
		fullUrl: `https://lichess.org/tournament/${id}`,
		nbPlayers: Number(detail.nbPlayers ?? 0) || 0,
		status: normalizeArenaLiveStatus(detail),
		secondsToStart:
			typeof detail.secondsToStart === 'number' ? Math.max(0, detail.secondsToStart) : null,
		secondsToFinish:
			typeof detail.secondsToFinish === 'number' ? Math.max(0, detail.secondsToFinish) : null,
		startsAt: detail.startsAt != null ? String(detail.startsAt) : null,
		standing: standingPlayers
			.map((/** @type {Record<string, any>} */ player) => ({
				rank: Number(player.rank),
				name: String(player.name ?? '').trim(),
				title: player.title ? String(player.title) : null,
				rating: typeof player.rating === 'number' ? player.rating : null,
				score: Number(player.score ?? 0)
			}))
			.filter((player) => player.name && Number.isInteger(player.rank) && player.rank > 0),
		duels: duels
			.map((/** @type {Record<string, any>} */ duel) => {
				const players = Array.isArray(duel.p) ? duel.p : [];
				const white = players[0] ?? {};
				const black = players[1] ?? {};
				return {
					id: String(duel.id ?? ''),
					white: String(white.n ?? '').trim(),
					black: String(black.n ?? '').trim(),
					whiteRating: typeof white.r === 'number' ? white.r : null,
					blackRating: typeof black.r === 'number' ? black.r : null
				};
			})
			.filter((duel) => duel.id && duel.white && duel.black),
		featured
	};

	arenaLiveCache.set(id, { at: Date.now(), data });
	return data;
}

/**
 * Lichess user-specific Arena entry code:
 * HMAC-SHA256(tournament password, username.toLowerCase()) as hex.
 * @param {string} tournamentPassword
 * @param {string} username
 */
export function personalTournamentAccessCode(tournamentPassword, username) {
	return createHmac('sha256', tournamentPassword)
		.update(username.toLowerCase())
		.digest('hex');
}

/**
 * Join a private Arena using the player's OAuth token and an entry code (or raw password).
 * @param {string} accessToken
 * @param {string} tournamentId
 * @param {{ password: string, pairMeAsap?: boolean }} options
 */
export async function joinLichessArena(accessToken, tournamentId, options) {
	const body = new URLSearchParams();
	body.set('password', options.password);
	if (options.pairMeAsap) {
		body.set('pairMeAsap', 'true');
	}

	const res = await fetch(`${LICHESS_API}/tournament/${tournamentId}/join`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${accessToken}`,
			'Content-Type': 'application/x-www-form-urlencoded',
			Accept: 'application/json',
			'User-Agent': LICHESS_USER_AGENT
		},
		body
	});

	if (res.status === 429) {
		throw new Error('Lichess rate limit reached. Wait at least one minute and try again.');
	}

	if (res.status === 401 || res.status === 403) {
		const err = new Error(
			'Could not join with your Lichess account. Connect Lichess again and try once more.'
		);
		// @ts-expect-error attach status for callers
		err.status = res.status;
		throw err;
	}

	if (!res.ok) {
		let message = 'Could not join the Lichess Arena';
		const text = await res.text().catch(() => '');
		if (text) {
			try {
				const payload = /** @type {{ error?: string, message?: string }} */ (JSON.parse(text));
				message = payload.error || payload.message || message;
			} catch {
				message = text.slice(0, 300);
			}
		}
		throw new Error(message);
	}

	return true;
}

/**
 * Accept a raw Lichess tournament ID or URL and return its canonical ID.
 * @param {string} value
 * @param {'arena' | 'swiss'} format
 */
export function normalizeLichessTournamentId(value, format) {
	const trimmed = value.trim();
	if (!trimmed) return null;

	let id = trimmed;
	try {
		const url = new URL(trimmed);
		if (!['lichess.org', 'www.lichess.org'].includes(url.hostname.toLowerCase())) return null;
		const segments = url.pathname.split('/').filter(Boolean);
		if (format === 'swiss') {
			const swissIndex = segments.indexOf('swiss');
			id = swissIndex >= 0 ? (segments[swissIndex + 1] ?? '') : '';
		} else {
			const tournamentIndex = segments.indexOf('tournament');
			id = tournamentIndex >= 0 ? (segments[tournamentIndex + 1] ?? '') : '';
		}
	} catch {
		// A plain ID is valid input.
	}

	return /^[A-Za-z0-9]{6,32}$/.test(id) ? id : null;
}

/**
 * @param {string} text
 */
export function parseLichessNdjson(text) {
	return text
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean)
		.map((line) => JSON.parse(line));
}

/**
 * @param {Array<Record<string, any>>} rows
 */
export function normalizeLichessStandings(rows) {
	return rows
		.map((row) => ({
			rank: Number(row.rank),
			username: String(row.username ?? row.name ?? '').trim(),
			score: Number(row.points ?? row.score ?? 0)
		}))
		.filter((row) => Number.isInteger(row.rank) && row.rank > 0 && row.username)
		.sort((a, b) => a.rank - b.rank);
}

/**
 * @param {Record<string, any>} detail
 */
export function isLichessTournamentFinished(detail) {
	return (
		detail.isFinished === true ||
		detail.finished === true ||
		detail.status === 'finished' ||
		detail.status === 'completed' ||
		detail.status === 30
	);
}

/**
 * @param {Array<{ id: string, placement: number, label: string, amountCents: number }>} prizes
 * @param {Array<{ rank: number, username: string, score: number }>} standings
 * @param {Array<{ userId: string, name: string, username: string | null, lichessUsername: string }>} eligiblePlayers
 */
export function matchLichessPrizes(prizes, standings, eligiblePlayers) {
	const standingsByRank = new Map(standings.map((row) => [row.rank, row]));
	const eligibleByUsername = new Map(
		eligiblePlayers.map((player) => [player.lichessUsername.toLowerCase(), player])
	);

	return prizes.map((prize) => {
		const standing = standingsByRank.get(prize.placement) ?? null;
		const player = standing
			? (eligibleByUsername.get(standing.username.toLowerCase()) ?? null)
			: null;
		return {
			prizeId: prize.id,
			placement: prize.placement,
			prizeLabel: prize.label,
			amountCents: prize.amountCents,
			lichessUsername: standing?.username ?? null,
			score: standing?.score ?? null,
			userId: player?.userId ?? null,
			playerName: player?.name ?? null,
			playerUsername: player?.username ?? null,
			matched: Boolean(standing && player)
		};
	});
}

/**
 * Fetch final standings from a public Lichess Arena or Swiss tournament.
 * @param {string} id
 * @param {'arena' | 'swiss'} format
 */
export async function fetchLichessTournamentStandings(id, format) {
	const basePath = format === 'swiss' ? `/swiss/${id}` : `/tournament/${id}`;
	const headers = {
		Accept: 'application/json',
		'User-Agent': LICHESS_USER_AGENT
	};

	const detailResponse = await fetch(`${LICHESS_API}${basePath}`, { headers });
	if (!detailResponse.ok) {
		throw new Error(
			detailResponse.status === 404
				? 'Lichess tournament not found'
				: 'Could not load Lichess tournament'
		);
	}
	const detail = /** @type {Record<string, any>} */ (await detailResponse.json());
	if (!isLichessTournamentFinished(detail)) {
		throw new Error('The Lichess tournament is not finished yet');
	}

	const resultsResponse = await fetch(`${LICHESS_API}${basePath}/results`, {
		headers: { ...headers, Accept: 'application/x-ndjson' }
	});
	if (!resultsResponse.ok) {
		throw new Error('Could not load final Lichess standings');
	}

	const rows = parseLichessNdjson(await resultsResponse.text());
	const standings = normalizeLichessStandings(rows);
	if (standings.length === 0) throw new Error('Lichess returned no final standings');
	return standings;
}
