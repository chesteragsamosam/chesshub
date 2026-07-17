import { error, redirect } from '@sveltejs/kit';
import { getUserByUsernameOrId } from '$lib/server/db/queries';
import { profileSlug } from '$lib/username';

/**
 * Resolve a profile user and enforce canonical username URLs.
 * @param {string} usernameParam
 * @param {URL} url
 */
export async function resolveProfileUser(usernameParam, url) {
	const found = await getUserByUsernameOrId(usernameParam);
	if (!found) {
		error(404, 'User not found');
	}

	const slug = profileSlug(found);
	if (found.username && usernameParam !== found.username) {
		redirect(302, `/profile/${found.username}${url.search}`);
	}

	return {
		id: found.id,
		name: found.name,
		username: found.username,
		image: found.image,
		role: found.role,
		slug
	};
}

/**
 * @param {import('$lib/server/db/queries').getFollowers extends (...args: any) => Promise<infer R> ? R : never} listResult
 */
export function paginateList(listResult) {
	return {
		page: listResult.page,
		totalPages: listResult.totalPages,
		total: listResult.total,
		pageSize: listResult.pageSize
	};
}
