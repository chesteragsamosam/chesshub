/**
 * Shared parsing for tournament create/edit forms.
 */

/**
 * @param {FormData} formData
 * @param {string} key
 */
export function field(formData, key) {
	return formData.get(key)?.toString().trim() ?? '';
}

/**
 * Parse OTB pin location. Returns error when modality is otb and pin is incomplete.
 * @param {FormData} formData
 * @param {'lichess' | 'otb'} modality
 */
export function parseOtbLocation(formData, modality) {
	const venue = field(formData, 'venue');
	const city = field(formData, 'city');
	const state = field(formData, 'state');
	const country = field(formData, 'country').toUpperCase();
	const latitudeRaw = field(formData, 'latitude');
	const longitudeRaw = field(formData, 'longitude');

	if (modality !== 'otb') {
		return {
			venue: null,
			city: null,
			state: null,
			country: null,
			latitude: null,
			longitude: null
		};
	}

	const latitude = latitudeRaw === '' ? NaN : Number(latitudeRaw);
	const longitude = longitudeRaw === '' ? NaN : Number(longitudeRaw);

	if (!venue) {
		return { error: 'Pin the venue on the map before posting an OTB tournament' };
	}
	if (
		!Number.isFinite(latitude) ||
		!Number.isFinite(longitude) ||
		latitude < -90 ||
		latitude > 90 ||
		longitude < -180 ||
		longitude > 180
	) {
		return {
			error: 'Pin the venue on the map so players can find the location'
		};
	}
	if (country && !/^[A-Z]{2}$/.test(country)) {
		return { error: 'Use a 2-letter country code, like PH or US' };
	}

	return {
		venue,
		city: city || null,
		state: state || null,
		country: country || null,
		latitude,
		longitude
	};
}

/**
 * Optional sponsors (name + optional URL). Empty list when the section is off / no rows.
 * @param {FormData} formData
 */
export function parseOptionalSponsors(formData) {
	const names = formData.getAll('sponsorName').map((value) => value.toString().trim());
	const urls = formData.getAll('sponsorUrl').map((value) => value.toString().trim());

	// No sponsor fields submitted (section closed or empty).
	if (names.length === 0) {
		return { sponsors: /** @type {Array<{ name: string, url: string | null, sortOrder: number }>} */ ([]) };
	}

	if (names.length !== urls.length) {
		return { error: 'Each sponsor needs a name' };
	}

	/** @type {Array<{ name: string, url: string | null, sortOrder: number }>} */
	const sponsors = [];
	for (let index = 0; index < names.length; index += 1) {
		const name = names[index];
		const urlRaw = urls[index];
		if (!name && !urlRaw) continue;
		if (!name) {
			return { error: 'Each sponsor needs a name' };
		}
		if (name.length > 255) {
			return { error: 'Sponsor names must be 255 characters or fewer' };
		}
		/** @type {string | null} */
		let url = null;
		if (urlRaw) {
			if (urlRaw.length > 512) {
				return { error: 'Sponsor links must be 512 characters or fewer' };
			}
			try {
				const parsed = new URL(urlRaw);
				if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
					return { error: 'Sponsor links must start with http:// or https://' };
				}
				url = parsed.toString();
			} catch {
				return { error: 'Enter a valid sponsor link, or leave it blank' };
			}
		}
		sponsors.push({ name, url, sortOrder: sponsors.length });
	}

	return { sponsors };
}
