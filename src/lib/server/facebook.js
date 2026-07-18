import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Decode Facebook's base64url payload/signature segment.
 * @param {string} input
 */
function base64UrlToBuffer(input) {
	const padded = input.replace(/-/g, '+').replace(/_/g, '/');
	const padLength = (4 - (padded.length % 4)) % 4;
	return Buffer.from(padded + '='.repeat(padLength), 'base64');
}

/**
 * Verify and parse a Facebook `signed_request` (HMAC-SHA256).
 * @param {string} signedRequest
 * @param {string} appSecret
 * @returns {{ user_id: string, algorithm?: string, issued_at?: number, expires?: number } | null}
 */
export function parseFacebookSignedRequest(signedRequest, appSecret) {
	if (!signedRequest?.includes('.') || !appSecret) return null;

	const [encodedSig, encodedPayload] = signedRequest.split('.', 2);
	if (!encodedSig || !encodedPayload) return null;

	const signature = base64UrlToBuffer(encodedSig);
	const expected = createHmac('sha256', appSecret).update(encodedPayload).digest();

	if (signature.length !== expected.length || !timingSafeEqual(signature, expected)) {
		return null;
	}

	try {
		const payload = JSON.parse(base64UrlToBuffer(encodedPayload).toString('utf8'));
		if (!payload || typeof payload.user_id !== 'string' || !payload.user_id) return null;
		return payload;
	} catch {
		return null;
	}
}
