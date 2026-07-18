import { describe, expect, it } from 'vitest';
import { toDateInputValue, tournamentScheduleStatus } from './tournament-status.js';

describe('tournamentScheduleStatus', () => {
	const start = '2026-07-18T10:00:00.000Z';
	const end = '2026-07-18T14:00:00.000Z';

	it('marks upcoming events before start', () => {
		expect(
			tournamentScheduleStatus(
				{ status: 'published', startDate: start, endDate: end },
				new Date('2026-07-18T09:00:00.000Z')
			)
		).toEqual({ key: 'upcoming', label: 'Upcoming' });
	});

	it('marks live events between start and end', () => {
		expect(
			tournamentScheduleStatus(
				{ status: 'published', startDate: start, endDate: end },
				new Date('2026-07-18T12:00:00.000Z')
			)
		).toEqual({ key: 'live', label: 'Live' });
	});

	it('marks ended events after endDate', () => {
		expect(
			tournamentScheduleStatus(
				{ status: 'published', startDate: start, endDate: end },
				new Date('2026-07-18T15:00:00.000Z')
			)
		).toEqual({ key: 'ended', label: 'Ended' });
	});

	it('marks completed status explicitly', () => {
		expect(
			tournamentScheduleStatus(
				{ status: 'completed', startDate: start, endDate: end },
				new Date('2026-07-18T12:00:00.000Z')
			)
		).toEqual({ key: 'completed', label: 'Completed' });
	});
});

describe('toDateInputValue', () => {
	it('formats a local YYYY-MM-DD value', () => {
		expect(toDateInputValue(new Date(2026, 6, 18))).toBe('2026-07-18');
	});
});
