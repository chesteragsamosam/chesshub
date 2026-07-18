/**
 * Load the Google Maps JavaScript API (Maps + Places) once.
 * @param {string} apiKey
 * @returns {Promise<NonNullable<Window['google']>['maps']>}
 */
export function loadGoogleMaps(apiKey) {
	if (typeof window === 'undefined') {
		return Promise.reject(new Error('Google Maps requires a browser'));
	}

	if (!apiKey) {
		return Promise.reject(new Error('Google Maps API key is missing'));
	}

	if (window.google?.maps?.Map && window.google?.maps?.places) {
		return Promise.resolve(window.google.maps);
	}

	const callbackName = '__chesshubGoogleMapsReady';

	return new Promise((resolve, reject) => {
		const existing = document.querySelector('script[data-chesshub-gmaps]');
		if (existing) {
			const finish = () => {
				if (window.google?.maps) resolve(window.google.maps);
				else reject(new Error('Failed to load Google Maps'));
			};
			if (window.google?.maps?.Map) {
				finish();
				return;
			}
			existing.addEventListener('load', finish, { once: true });
			existing.addEventListener(
				'error',
				() => reject(new Error('Failed to load Google Maps')),
				{ once: true }
			);
			return;
		}

		window[callbackName] = () => {
			delete window[callbackName];
			if (window.google?.maps) resolve(window.google.maps);
			else reject(new Error('Failed to load Google Maps'));
		};

		const script = document.createElement('script');
		script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&callback=${callbackName}`;
		script.async = true;
		script.defer = true;
		script.dataset.chesshubGmaps = '1';
		script.onerror = () => {
			delete window[callbackName];
			reject(new Error('Failed to load Google Maps'));
		};
		document.head.appendChild(script);
	});
}
