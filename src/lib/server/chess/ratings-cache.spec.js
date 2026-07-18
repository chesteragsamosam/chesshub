import { describe, expect, it } from 'vitest';
import { isRatingsCacheFresh, parseRatingsJson, RATINGS_TTL_MS } from './ratings-cache';

describe('ratings-cache', () => {
	it('treats missing timestamps as stale', () => {
		expect(isRatingsCacheFresh('lichess', null)).toBe(false);
		expect(isRatingsCacheFresh('fide', undefined)).toBe(false);
	});

	it('uses daily TTL for Lichess and Chess.com', () => {
		const fresh = new Date(Date.now() - RATINGS_TTL_MS.lichess + 60_000);
		const stale = new Date(Date.now() - RATINGS_TTL_MS.lichess - 60_000);
		expect(isRatingsCacheFresh('lichess', fresh)).toBe(true);
		expect(isRatingsCacheFresh('chesscom', fresh)).toBe(true);
		expect(isRatingsCacheFresh('lichess', stale)).toBe(false);
	});

	it('uses monthly TTL for FIDE', () => {
		const fresh = new Date(Date.now() - RATINGS_TTL_MS.fide + DAY);
		const stale = new Date(Date.now() - RATINGS_TTL_MS.fide - DAY);
		expect(isRatingsCacheFresh('fide', fresh)).toBe(true);
		expect(isRatingsCacheFresh('fide', stale)).toBe(false);
	});

	it('parses stored ratings JSON', () => {
		expect(parseRatingsJson('{"standard":2400}')).toEqual({ standard: 2400 });
		expect(parseRatingsJson('not-json')).toBeNull();
		expect(parseRatingsJson(null)).toBeNull();
	});
});

const DAY = 24 * 60 * 60 * 1000;
