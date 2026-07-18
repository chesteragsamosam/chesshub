import { describe, expect, it } from 'vitest';
import { facebookProfileUrl } from './social.js';

describe('facebookProfileUrl', () => {
	it('builds a facebook.com profile URL from the account id', () => {
		expect(facebookProfileUrl('1029384756')).toBe('https://www.facebook.com/1029384756');
	});
});
