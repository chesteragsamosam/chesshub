import { describe, expect, it } from 'vitest';
import { countryFlag, fideFederationToIso, flagEmojiFromIso } from './country-flag.js';

describe('countryFlag', () => {
	it('builds a flag emoji from ISO alpha-2', () => {
		expect(flagEmojiFromIso('PH')).toBe('🇵🇭');
		expect(flagEmojiFromIso('us')).toBe('🇺🇸');
	});

	it('maps FIDE federation codes to ISO', () => {
		expect(fideFederationToIso('PHI')).toBe('PH');
		expect(fideFederationToIso('USA')).toBe('US');
		expect(fideFederationToIso('GER')).toBe('DE');
	});

	it('resolves flags from FIDE or ISO codes', () => {
		expect(countryFlag('PHI')).toBe('🇵🇭');
		expect(countryFlag('PH')).toBe('🇵🇭');
		expect(countryFlag(null)).toBeNull();
		expect(countryFlag('FID')).toBeNull();
	});
});
