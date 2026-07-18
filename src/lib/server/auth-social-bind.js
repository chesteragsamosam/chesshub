import { facebookProfileUrl } from '$lib/social';
import { upsertSocialLink } from '$lib/server/db/queries';

export { facebookProfileUrl };

/**
 * Auto-bind a Facebook OAuth account to the user's social_link profile row.
 * @param {string} userId
 * @param {string} accountId
 */
export async function bindFacebookSocialLink(userId, accountId) {
	if (!userId || !accountId) return;
	await upsertSocialLink(userId, 'facebook', facebookProfileUrl(accountId));
}
