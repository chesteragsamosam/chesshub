import { describe, expect, it } from 'vitest';
import { isLoopbackOrigin, normalizeOrigin, pickAppOrigin } from './app-origin.js';

describe('pickAppOrigin', () => {
	it('normalizes and detects loopback hosts', () => {
		expect(normalizeOrigin('https://example.com/')).toBe('https://example.com');
		expect(isLoopbackOrigin('http://localhost:5173')).toBe(true);
		expect(isLoopbackOrigin('https://abc.ngrok-free.app')).toBe(false);
	});

	it('uses the public request host for checkout redirects', () => {
		expect(
			pickAppOrigin({
				requestOrigin: 'https://abc.ngrok-free.app',
				configuredOrigin: 'http://localhost:5173',
				purpose: 'checkout_redirect'
			})
		).toBe('https://abc.ngrok-free.app');
	});

	it('falls back to public ORIGIN when browsing localhost for checkout', () => {
		expect(
			pickAppOrigin({
				requestOrigin: 'http://localhost:5173',
				configuredOrigin: 'https://abc.ngrok-free.app',
				purpose: 'checkout_redirect'
			})
		).toBe('https://abc.ngrok-free.app');
	});

	it('prefers public ORIGIN for provider callbacks even on localhost requests', () => {
		expect(
			pickAppOrigin({
				requestOrigin: 'http://localhost:5173',
				configuredOrigin: 'https://abc.ngrok-free.app',
				purpose: 'provider_callback'
			})
		).toBe('https://abc.ngrok-free.app');
	});
});
