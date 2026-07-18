import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { parseFacebookSignedRequest } from './facebook';

/**
 * @param {Record<string, unknown>} payload
 * @param {string} secret
 */
function makeSignedRequest(payload, secret) {
	const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8')
		.toString('base64')
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/g, '');
	const sig = createHmac('sha256', secret)
		.update(encodedPayload)
		.digest('base64')
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/g, '');
	return `${sig}.${encodedPayload}`;
}

describe('parseFacebookSignedRequest', () => {
	it('accepts a valid HMAC-SHA256 signed request', () => {
		const secret = 'test-app-secret';
		const signed = makeSignedRequest({ user_id: '1234567890', algorithm: 'HMAC-SHA256' }, secret);
		expect(parseFacebookSignedRequest(signed, secret)).toMatchObject({
			user_id: '1234567890'
		});
	});

	it('rejects tampered payloads and wrong secrets', () => {
		const signed = makeSignedRequest({ user_id: '123' }, 'secret-a');
		expect(parseFacebookSignedRequest(signed, 'secret-b')).toBeNull();
		expect(parseFacebookSignedRequest('not-valid', 'secret-a')).toBeNull();
	});
});
