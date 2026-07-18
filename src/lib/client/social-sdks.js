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
