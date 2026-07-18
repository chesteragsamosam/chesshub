/**
 * Time-control classification for ChessHub events.
 *
 * Estimated game length (~60 moves, FIDE-style):
 *   baseSeconds + 60 × (incrementSeconds + delaySeconds)
 *
 * Increment (Fischer) and delay (Bronstein / simple) both count as per-move bonus.
 */

/** @typedef {'ultrabullet' | 'bullet' | 'blitz' | 'rapid' | 'classical'} TimeControlSpeed */

/** @type {Record<TimeControlSpeed, string>} */
export const TIME_CONTROL_LABELS = {
	ultrabullet: 'UltraBullet',
	bullet: 'Bullet',
	blitz: 'Blitz',
	rapid: 'Rapid',
	classical: 'Classical'
};

/**
 * Estimated game length in seconds (~60 moves).
 * @param {number} baseMinutes
 * @param {number} [incrementSeconds]
 * @param {number} [delaySeconds]
 */
export function estimateGameSeconds(baseMinutes, incrementSeconds = 0, delaySeconds = 0) {
	const base = Number(baseMinutes);
	const inc = Number(incrementSeconds) || 0;
	const delay = Number(delaySeconds) || 0;
	if (!Number.isFinite(base) || base < 0) return null;
	const bonus = Math.max(0, inc) + Math.max(0, delay);
	return base * 60 + 60 * bonus;
}

/**
 * @param {number} baseMinutes
 * @param {number} [incrementSeconds]
 * @param {number} [delaySeconds]
 * @returns {TimeControlSpeed | null}
 */
export function categorizeTimeControl(baseMinutes, incrementSeconds = 0, delaySeconds = 0) {
	const estimated = estimateGameSeconds(baseMinutes, incrementSeconds, delaySeconds);
	if (estimated == null) return null;
	if (estimated < 30) return 'ultrabullet';
	if (estimated < 180) return 'bullet';
	if (estimated < 480) return 'blitz';
	if (estimated < 1500) return 'rapid';
	return 'classical';
}

/**
 * Display label: Classical online, Standard for OTB classical.
 * @param {TimeControlSpeed | null | undefined} speed
 * @param {'lichess' | 'otb' | string | null | undefined} [modality]
 */
export function timeControlLabel(speed, modality = 'lichess') {
	if (!speed) return null;
	if (speed === 'classical' && modality === 'otb') return 'Standard';
	return TIME_CONTROL_LABELS[speed] ?? null;
}

/**
 * Compact clock notation, e.g. `3+2`, `15+0`, `90 d30`, `5+3 d2`.
 * @param {number} baseMinutes
 * @param {number} [incrementSeconds]
 * @param {number} [delaySeconds]
 */
export function formatClockControl(baseMinutes, incrementSeconds = 0, delaySeconds = 0) {
	const base = Number(baseMinutes);
	if (!Number.isFinite(base) || base < 0) return null;

	const baseLabel = Number.isInteger(base) ? String(base) : String(base);
	const inc = Math.max(0, Number(incrementSeconds) || 0);
	const delay = Math.max(0, Number(delaySeconds) || 0);

	if (delay > 0 && inc > 0) return `${baseLabel}+${inc} d${delay}`;
	if (delay > 0) return `${baseLabel} d${delay}`;
	return `${baseLabel}+${inc}`;
}

/**
 * @param {{
 *   clockTime?: number | null,
 *   clockIncrement?: number | null,
 *   clockDelay?: number | null,
 *   modality?: string | null,
 *   lichessArenaSettings?: string | null
 * }} tournament
 * @returns {{
 *   baseMinutes: number,
 *   incrementSeconds: number,
 *   delaySeconds: number,
 *   speed: TimeControlSpeed,
 *   label: string,
 *   clock: string
 * } | null}
 */
export function resolveTournamentTimeControl(tournament) {
	let baseMinutes = tournament.clockTime;
	let incrementSeconds = tournament.clockIncrement ?? 0;
	let delaySeconds = tournament.clockDelay ?? 0;

	if (baseMinutes == null && tournament.lichessArenaSettings) {
		try {
			const parsed = JSON.parse(tournament.lichessArenaSettings);
			if (typeof parsed?.clockTime === 'number') {
				baseMinutes = parsed.clockTime;
				incrementSeconds =
					typeof parsed.clockIncrement === 'number' ? parsed.clockIncrement : 0;
				delaySeconds = typeof parsed.clockDelay === 'number' ? parsed.clockDelay : 0;
			}
		} catch {
			// ignore invalid snapshot
		}
	}

	if (baseMinutes == null || !Number.isFinite(Number(baseMinutes))) return null;

	const base = Number(baseMinutes);
	const inc = Number(incrementSeconds) || 0;
	const delay = Number(delaySeconds) || 0;
	const speed = categorizeTimeControl(base, inc, delay);
	if (!speed) return null;

	const clock = formatClockControl(base, inc, delay);
	const label = timeControlLabel(speed, tournament.modality);
	if (!clock || !label) return null;

	return {
		baseMinutes: base,
		incrementSeconds: inc,
		delaySeconds: delay,
		speed,
		label,
		clock
	};
}

/**
 * @param {'lichess' | 'otb' | string | null | undefined} modality
 */
export function modalityLabel(modality) {
	return modality === 'otb' ? 'OTB' : 'Lichess';
}
