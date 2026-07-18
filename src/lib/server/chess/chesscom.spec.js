import { describe, expect, it } from 'vitest';
import {
	decodeJwtPayload,
	safeChessComReturnTo,
	usernameFromOidcClaims
} from './chesscom.js';

describe('safeChessComReturnTo', () => {
	it('allows relative paths', () => {
		expect(safeChessComReturnTo('/settings/profile')).toBe('/settings/profile');
		expect(safeChessComReturnTo('/organizer?tab=1')).toBe('/organizer?tab=1');
	});

	it('rejects absolute and protocol-relative URLs', () => {
		expect(safeChessComReturnTo('https://evil.example/')).toBe('/settings/profile');
		expect(safeChessComReturnTo('//evil.example/')).toBe('/settings/profile');
		expect(safeChessComReturnTo('javascript:alert(1)')).toBe('/settings/profile');
	});
});

describe('decodeJwtPayload', () => {
	it('decodes a JWT payload', () => {
		const payload = btoa(JSON.stringify({ preferred_username: 'MagnusCarlsen', sub: '42' }))
			.replace(/\+/g, '-')
			.replace(/\//g, '_')
			.replace(/=+$/, '');
		const jwt = `hdr.${payload}.sig`;
		expect(decodeJwtPayload(jwt)).toEqual({ preferred_username: 'MagnusCarlsen', sub: '42' });
	});

	it('returns null for invalid tokens', () => {
		expect(decodeJwtPayload('not-a-jwt')).toBeNull();
	});
});

describe('usernameFromOidcClaims', () => {
	it('prefers preferred_username', () => {
		expect(
			usernameFromOidcClaims({ preferred_username: 'hikaru', username: 'other' })
		).toBe('hikaru');
	});

	it('falls back to profile URL', () => {
		expect(
			usernameFromOidcClaims({ profile: 'https://www.chess.com/member/GothamChess' })
		).toBe('GothamChess');
	});

	it('returns null when missing', () => {
		expect(usernameFromOidcClaims({ sub: '1' })).toBeNull();
	});
});
