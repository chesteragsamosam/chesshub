import { resolveProfileUser, paginateList } from '$lib/server/profile-page';
import { getFollowers } from '$lib/server/db/queries';

/** @type {import('./$types').PageServerLoad} */
export async function load({ params, url }) {
	const profileUser = await resolveProfileUser(params.username, url);
	const requestedPage = Math.max(1, Number.parseInt(url.searchParams.get('page') ?? '1', 10) || 1);
	const list = await getFollowers(profileUser.id, { page: requestedPage, pageSize: 20 });

	return {
		profileUser,
		users: list.users,
		pagination: paginateList(list),
		listType: 'followers'
	};
}
