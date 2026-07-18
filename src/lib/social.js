/** @type {Record<string, string>} */
export const SOCIAL_PLATFORMS = {
	twitter: 'X / Twitter',
	instagram: 'Instagram',
	youtube: 'YouTube',
	discord: 'Discord',
	twitch: 'Twitch',
	github: 'GitHub',
	facebook: 'Facebook',
	other: 'Other'
};

/**
 * Public Facebook profile URL from the OAuth account id (numeric Graph id).
 * @param {string} accountId
 */
export function facebookProfileUrl(accountId) {
	return `https://www.facebook.com/${accountId}`;
}

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
