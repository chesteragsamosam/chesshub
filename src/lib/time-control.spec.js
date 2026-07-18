import { describe, expect, it } from 'vitest';
import {
	categorizeTimeControl,
	formatClockControl,
	modalityLabel,
	resolveTournamentTimeControl,
	timeControlLabel
} from './time-control.js';

describe('categorizeTimeControl', () => {
	it('classifies common increment clocks', () => {
		expect(categorizeTimeControl(1, 0)).toBe('bullet');
		expect(categorizeTimeControl(2, 1)).toBe('blitz');
		expect(categorizeTimeControl(3, 0)).toBe('blitz');
		expect(categorizeTimeControl(3, 2)).toBe('blitz');
		expect(categorizeTimeControl(5, 3)).toBe('rapid');
		expect(categorizeTimeControl(10, 0)).toBe('rapid');
		expect(categorizeTimeControl(15, 10)).toBe('classical');
		expect(categorizeTimeControl(30, 0)).toBe('classical');
		expect(categorizeTimeControl(90, 30)).toBe('classical');
	});

	it('treats delay like increment for categorization', () => {
		expect(categorizeTimeControl(5, 0, 3)).toBe(categorizeTimeControl(5, 3, 0));
		expect(categorizeTimeControl(15, 0, 10)).toBe(categorizeTimeControl(15, 10, 0));
	});

	it('combines increment and delay when both are set', () => {
		// 3+2 d2 → 60*(3+2+2) = 420s → blitz
		expect(categorizeTimeControl(3, 2, 2)).toBe('blitz');
	});
});

describe('formatClockControl', () => {
	it('formats increment, delay, and mixed clocks', () => {
		expect(formatClockControl(3, 2)).toBe('3+2');
		expect(formatClockControl(15, 0)).toBe('15+0');
		expect(formatClockControl(90, 0, 30)).toBe('90 d30');
		expect(formatClockControl(5, 3, 2)).toBe('5+3 d2');
		expect(formatClockControl(0.5, 0)).toBe('0.5+0');
	});
});

describe('timeControlLabel / modalityLabel', () => {
	it('uses Standard for OTB classical', () => {
		expect(timeControlLabel('classical', 'otb')).toBe('Standard');
		expect(timeControlLabel('classical', 'lichess')).toBe('Classical');
		expect(timeControlLabel('blitz', 'otb')).toBe('Blitz');
	});

	it('labels modality as OTB', () => {
		expect(modalityLabel('otb')).toBe('OTB');
		expect(modalityLabel('lichess')).toBe('Lichess');
	});
});

describe('resolveTournamentTimeControl', () => {
	it('reads columns and falls back to arena settings JSON', () => {
		expect(
			resolveTournamentTimeControl({
				modality: 'lichess',
				clockTime: 3,
				clockIncrement: 2,
				clockDelay: 0
			})
		).toMatchObject({ speed: 'blitz', label: 'Blitz', clock: '3+2' });

		expect(
			resolveTournamentTimeControl({
				modality: 'otb',
				lichessArenaSettings: JSON.stringify({ clockTime: 90, clockIncrement: 30 })
			})
		).toMatchObject({ speed: 'classical', label: 'Standard', clock: '90+30' });
	});
});
