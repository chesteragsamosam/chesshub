/**
 * @param {string} userId
 * @param {number} [version]
 */
export function avatarPublicPath(userId, version = Date.now()) {
	return `/avatars/${userId}?v=${version}`;
}

/**
 * @param {string | null | undefined} url
 * @param {string} userId
 */
export function isLocalAvatarUrl(url, userId) {
	if (!url) return false;

	try {
		const parsed = new URL(url, 'http://local');
		return parsed.pathname === `/avatars/${userId}`;
	} catch {
		return url.startsWith(`/avatars/${userId}`);
	}
}

/**
 * @param {string | null | undefined} url
 * @param {string} userId
 */
export function externalImageUrl(url, userId) {
	if (!url || isLocalAvatarUrl(url, userId)) {
		return '';
	}

	return url;
}
