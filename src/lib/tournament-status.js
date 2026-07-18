/**
 * Schedule / lifecycle label for tournament list cards.
 *
 * @param {{
 *   status?: string | null,
 *   startDate: Date | string,
 *   endDate?: Date | string | null
 * }} tournament
 * @param {Date} [now]
 * @returns {{ key: 'live' | 'upcoming' | 'ended' | 'completed' | 'cancelled', label: string }}
 */
export function tournamentScheduleStatus(tournament, now = new Date()) {
	const status = tournament.status ?? 'published';
	if (status === 'completed') return { key: 'completed', label: 'Completed' };
	if (status === 'cancelled') return { key: 'cancelled', label: 'Cancelled' };

	const startMs = new Date(tournament.startDate).getTime();
	if (!Number.isFinite(startMs)) return { key: 'upcoming', label: 'Upcoming' };

	const endMs = tournament.endDate ? new Date(tournament.endDate).getTime() : null;
	const nowMs = now.getTime();

	if (nowMs < startMs) return { key: 'upcoming', label: 'Upcoming' };

	if (endMs != null && Number.isFinite(endMs) && nowMs > endMs) {
		return { key: 'ended', label: 'Ended' };
	}

	return { key: 'live', label: 'Live' };
}

/**
 * Local calendar date as `YYYY-MM-DD` for `<input type="date">`.
 * @param {Date} [date]
 */
export function toDateInputValue(date = new Date()) {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, '0');
	const d = String(date.getDate()).padStart(2, '0');
	return `${y}-${m}-${d}`;
}
