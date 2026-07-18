/**
 * Facebook's Login Button plugin requires HTTPS and does not work on http:// pages.
 * @see https://developers.facebook.com/blog/post/2018/06/08/enforce-https-facebook-login/
 * @returns {boolean}
 */
export function canUseFacebookLoginButton() {
	if (typeof window === 'undefined') return false;
	return window.location.protocol === 'https:';
}

/**
 * Load Google Identity Services once.
 * @returns {Promise<typeof window.google>}
 */
export function loadGoogleIdentity() {
	if (typeof window === 'undefined') {
		return Promise.reject(new Error('Google Identity requires a browser'));
	}

	if (window.google?.accounts?.id) {
		return Promise.resolve(window.google);
	}

	return new Promise((resolve, reject) => {
		const existing = document.querySelector('script[data-chesshub-gis]');
		if (existing) {
			existing.addEventListener('load', () => resolve(window.google), { once: true });
			existing.addEventListener(
				'error',
				() => reject(new Error('Failed to load Google Identity')),
				{
					once: true
				}
			);
			return;
		}

		const script = document.createElement('script');
		script.src = 'https://accounts.google.com/gsi/client';
		script.async = true;
		script.defer = true;
		script.dataset.chesshubGis = '1';
		script.onload = () => resolve(window.google);
		script.onerror = () => reject(new Error('Failed to load Google Identity'));
		document.head.appendChild(script);
	});
}

/**
 * Load the Facebook JS SDK once and initialize it.
 * @param {string} appId
 * @returns {Promise<typeof window.FB>}
 */
export function loadFacebookSdk(appId) {
	if (typeof window === 'undefined') {
		return Promise.reject(new Error('Facebook SDK requires a browser'));
	}

	if (window.FB) {
		return Promise.resolve(window.FB);
	}

	return new Promise((resolve, reject) => {
		const previous = window.fbAsyncInit;
		window.fbAsyncInit = function () {
			try {
				previous?.();
			} catch {
				/* ignore prior init errors */
			}
			window.FB.init({
				appId,
				cookie: true,
				xfbml: true,
				version: 'v21.0'
			});
			resolve(window.FB);
		};

		const existing = document.querySelector('script[data-chesshub-fbsdk]');
		if (existing) {
			existing.addEventListener('error', () => reject(new Error('Failed to load Facebook SDK')), {
				once: true
			});
			return;
		}

		const script = document.createElement('script');
		script.src = 'https://connect.facebook.net/en_US/sdk.js';
		script.async = true;
		script.defer = true;
		script.dataset.chesshubFbsdk = '1';
		script.onerror = () => reject(new Error('Failed to load Facebook SDK'));
		document.body.appendChild(script);
	});
}
