/** @type {Record<string, string>} */
export const SOCIAL_PLATFORMS = {
	twitter: 'X / Twitter',
	instagram: 'Instagram',
	youtube: 'YouTube',
	discord: 'Discord',
	twitch: 'Twitch',
	github: 'GitHub',
	other: 'Other'
};

/**
 * @param {string} url
 */
export function isValidHttpUrl(url) {
	try {
		const parsed = new URL(url);
		return parsed.protocol === 'http:' || parsed.protocol === 'https:';
	} catch {
		return false;
	}
}
