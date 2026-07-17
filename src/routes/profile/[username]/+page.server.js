import { fail } from '@sveltejs/kit';
import {
	getUserById,
	getProfileByUserId,
	getChessAccounts,
	getSocialLinks,
	countFollowers,
	countFollowing,
	isFollowing,
	recommendUsersToFollow,
	followUser,
	unfollowUser
} from '$lib/server/db/queries';
import { enrichChessAccountsWithRatings, publicChessAccounts } from '$lib/server/chess/enrich';
import { requireUser } from '$lib/server/auth-guards';
import { resolveProfileUser } from '$lib/server/profile-page';

/** @type {import('./$types').PageServerLoad} */
export async function load({ params, url, locals }) {
	const profileUser = await resolveProfileUser(params.username, url);
	const viewerId = locals.user?.id ?? null;
	const isOwnProfile = viewerId === profileUser.id;

	const [
		profile,
		chessAccountsRaw,
		socialLinks,
		followerCount,
		followingCount,
		viewerIsFollowing
	] = await Promise.all([
		getProfileByUserId(profileUser.id),
		getChessAccounts(profileUser.id),
		getSocialLinks(profileUser.id),
		countFollowers(profileUser.id),
		countFollowing(profileUser.id),
		viewerId && !isOwnProfile
			? isFollowing(viewerId, profileUser.id)
			: Promise.resolve(false)
	]);

	const chessAccounts = publicChessAccounts(await enrichChessAccountsWithRatings(chessAccountsRaw));

	const recommendations =
		isOwnProfile && viewerId ? await recommendUsersToFollow(viewerId, 8) : [];

	return {
		profileUser,
		profile,
		chessAccounts,
		socialLinks,
		followerCount,
		followingCount,
		isFollowing: viewerIsFollowing,
		isOwnProfile,
		recommendations
	};
}

export const actions = {
	toggleFollow: async (event) => {
		const viewer = requireUser(event);
		const formData = await event.request.formData();
		const targetUserId = formData.get('targetUserId')?.toString() ?? '';

		if (!targetUserId) {
			return fail(400, { message: 'Missing user' });
		}

		if (targetUserId === viewer.id) {
			return fail(400, { message: 'You cannot follow yourself' });
		}

		const target = await getUserById(targetUserId);
		if (!target) {
			return fail(404, { message: 'User not found' });
		}

		const alreadyFollowing = await isFollowing(viewer.id, target.id);
		if (alreadyFollowing) {
			await unfollowUser(viewer.id, target.id);
		} else {
			await followUser(viewer.id, target.id);
		}

		return { success: true };
	}
};
