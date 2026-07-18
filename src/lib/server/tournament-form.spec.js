import { describe, expect, it } from 'vitest';
import { parseOptionalSponsors, parseOtbLocation } from './tournament-form.js';

describe('parseOtbLocation', () => {
	it('clears location for lichess', () => {
		const formData = new FormData();
		formData.set('venue', 'Hall');
		formData.set('latitude', '14.5');
		formData.set('longitude', '120.9');
		expect(parseOtbLocation(formData, 'lichess')).toEqual({
			venue: null,
			city: null,
			state: null,
			country: null,
			latitude: null,
			longitude: null
		});
	});

	it('requires a pin for otb', () => {
		const formData = new FormData();
		formData.set('venue', 'Club');
		expect(parseOtbLocation(formData, 'otb').error).toMatch(/pin/i);
	});

	it('accepts a complete otb pin', () => {
		const formData = new FormData();
		formData.set('venue', 'Manila Chess Club');
		formData.set('city', 'Manila');
		formData.set('country', 'ph');
		formData.set('latitude', '14.5995');
		formData.set('longitude', '120.9842');
		expect(parseOtbLocation(formData, 'otb')).toMatchObject({
			venue: 'Manila Chess Club',
			city: 'Manila',
			country: 'PH',
			latitude: 14.5995,
			longitude: 120.9842
		});
	});
});

describe('parseOptionalSponsors', () => {
	it('returns empty when no fields', () => {
		expect(parseOptionalSponsors(new FormData())).toEqual({ sponsors: [] });
	});

	it('skips blank rows and validates urls', () => {
		const formData = new FormData();
		formData.append('sponsorName', 'Acme');
		formData.append('sponsorUrl', 'https://acme.example');
		formData.append('sponsorName', '');
		formData.append('sponsorUrl', '');
		const result = parseOptionalSponsors(formData);
		expect(result.sponsors).toHaveLength(1);
		expect(result.sponsors?.[0]).toMatchObject({
			name: 'Acme',
			sortOrder: 0
		});
		expect(result.sponsors?.[0]?.url).toContain('acme.example');
	});

	it('rejects invalid urls', () => {
		const formData = new FormData();
		formData.append('sponsorName', 'Acme');
		formData.append('sponsorUrl', 'not-a-url');
		expect(parseOptionalSponsors(formData).error).toMatch(/valid sponsor link/i);
	});
});
