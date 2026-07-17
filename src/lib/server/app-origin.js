import { env } from '$env/dynamic/private';

/**
 * @param {string} origin
 */
export function normalizeOrigin(origin) {
	return origin.replace(/\/$/, '');
}

/**
 * @param {string} origin
 */
export function isLoopbackOrigin(origin) {
	try {
		const host = new URL(origin).hostname;
		return host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '0.0.0.0';
	} catch {
		return false;
	}
}

/**
 * @param {{
 *   requestOrigin: string,
 *   configuredOrigin?: string | null,
 *   purpose?: 'checkout_redirect' | 'provider_callback'
 * }} opts
 */
export function pickAppOrigin(opts) {
	const purpose = opts.purpose ?? 'checkout_redirect';
	const requestOrigin = normalizeOrigin(opts.requestOrigin);
	const configured = opts.configuredOrigin ? normalizeOrigin(opts.configuredOrigin) : null;
	const requestPublic = !isLoopbackOrigin(requestOrigin);
	const configuredPublic = Boolean(configured && !isLoopbackOrigin(configured));

	if (purpose === 'provider_callback') {
		if (configuredPublic) return /** @type {string} */ (configured);
		if (requestPublic) return requestOrigin;
		return configured || requestOrigin;
	}

	// checkout_redirect — must work on the payer's phone after GCash / QR Ph
	if (requestPublic) return requestOrigin;
	if (configuredPublic) return /** @type {string} */ (configured);
	return requestOrigin;
}

/**
 * Public site origin for PayMongo checkout redirects and provider callbacks.
 *
 * @param {{ url: URL }} event
 * @param {{ purpose?: 'checkout_redirect' | 'provider_callback' }} [opts]
 */
export function resolveAppOrigin(event, opts = {}) {
	return pickAppOrigin({
		requestOrigin: event.url.origin,
		configuredOrigin: env.ORIGIN,
		purpose: opts.purpose
	});
}
