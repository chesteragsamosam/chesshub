import { fail } from '@sveltejs/kit';
import { requireUser } from '$lib/server/auth-guards';
import { validateChessComUsername } from '$lib/server/chess/chesscom';
import { lookupFidePlayer } from '$lib/server/chess/fide';
import { enrichChessAccountsWithRatings, publicChessAccounts } from '$lib/server/chess/enrich';
import {
	getOrCreateProfile,
	getChessAccounts,
	getSocialLinks,
	updateProfile,
	upsertChessAccount,
	unlinkChessAccount,
	upsertSocialLink,
	unlinkSocialLink,
	updateUserImage,
	getUserById,
	updateUsername,
	isUsernameTaken
} from '$lib/server/db/queries';
import { deleteAvatarFile, isLocalAvatarUrl, saveAvatarUpload } from '$lib/server/avatars';
import { isValidHttpUrl, SOCIAL_PLATFORMS } from '$lib/social';
import { normalizeUsername, profileSlug } from '$lib/username';
import { env } from '$env/dynamic/private';

/** @type {import('./$types').PageServerLoad} */
export async function load(event) {
	const current = requireUser(event);
	const [profile, chessAccountsRaw, socialLinks, dbUser] = await Promise.all([
		getOrCreateProfile(current.id),
		getChessAccounts(current.id),
		getSocialLinks(current.id),
		getUserById(current.id)
	]);

	const chessAccounts = publicChessAccounts(await enrichChessAccountsWithRatings(chessAccountsRaw));

	return {
		profile,
		chessAccounts,
		socialLinks,
		user: dbUser
			? {
					id: dbUser.id,
					name: dbUser.name,
					image: dbUser.image
				}
			: null,
		username: dbUser?.username ?? null,
		profileSlug: profileSlug({ id: current.id, username: dbUser?.username }),
		lichessConfigured: Boolean(env.LICHESS_CLIENT_ID),
		flash: {
			linked: event.url.searchParams.get('linked'),
			error: event.url.searchParams.get('error')
		}
	};
}

export const actions = {
	updateProfile: async (event) => {
		const user = requireUser(event);
		const formData = await event.request.formData();
		const bio = formData.get('bio')?.toString() ?? '';
		const city = formData.get('city')?.toString() ?? '';
		const country = formData.get('country')?.toString().toUpperCase() ?? '';

		if (country && !/^[A-Z]{2}$/.test(country)) {
			return fail(400, { profileMessage: 'Country must be a 2-letter ISO code' });
		}

		await updateProfile(user.id, {
			bio: bio || null,
			city: city || null,
			country: country || null
		});

		return { profileSuccess: true };
	},

	updateUsername: async (event) => {
		const current = requireUser(event);
		const formData = await event.request.formData();
		const raw = formData.get('username')?.toString() ?? '';
		const parsed = normalizeUsername(raw);

		if (!parsed.ok) {
			return fail(400, { usernameMessage: parsed.error, usernameValue: raw });
		}

		if (await isUsernameTaken(parsed.username, current.id)) {
			return fail(400, {
				usernameMessage: 'That username is already taken',
				usernameValue: parsed.username
			});
		}

		await updateUsername(current.id, parsed.username);
		return { usernameSuccess: true };
	},

	updatePhoto: async (event) => {
		const current = requireUser(event);
		const formData = await event.request.formData();

		if (formData.get('removePhoto') === '1') {
			await deleteAvatarFile(current.id);
			await updateUserImage(current.id, null);
			return { photoSuccess: true };
		}

		const photo = formData.get('photo');
		if (photo instanceof File && photo.size > 0) {
			const result = await saveAvatarUpload(current.id, photo);
			if (!result.ok) {
				return fail(400, { photoMessage: result.error });
			}

			await updateUserImage(current.id, result.url);
			return { photoSuccess: true };
		}

		const image = formData.get('image')?.toString().trim() ?? '';

		if (image && !isValidHttpUrl(image) && !isLocalAvatarUrl(image, current.id)) {
			return fail(400, { photoMessage: 'Enter a valid image URL (https://…)' });
		}

		const dbUser = await getUserById(current.id);
		const currentImage = dbUser?.image ?? '';

		if (!image) {
			if (currentImage && isLocalAvatarUrl(currentImage, current.id)) {
				return { photoSuccess: true };
			}

			if (currentImage) {
				await deleteAvatarFile(current.id);
				await updateUserImage(current.id, null);
			}

			return { photoSuccess: true };
		}

		if (image === currentImage || isLocalAvatarUrl(image, current.id)) {
			return { photoSuccess: true };
		}

		await deleteAvatarFile(current.id);
		await updateUserImage(current.id, image);
		return { photoSuccess: true };
	},

	linkChessCom: async (event) => {
		const user = requireUser(event);
		const formData = await event.request.formData();
		const username = formData.get('username')?.toString() ?? '';

		const result = await validateChessComUsername(username);
		if (!result.ok) {
			return fail(400, { chessComMessage: result.error });
		}

		await upsertChessAccount(user.id, 'chesscom', {
			username: result.username,
			externalId: result.externalId,
			displayName: result.displayName,
			verified: true
		});

		if (result.avatar) {
			const dbUser = await getUserById(user.id);
			if (dbUser && !dbUser.image) {
				await updateUserImage(user.id, result.avatar);
			}
		}

		return { chessComSuccess: true };
	},

	linkFide: async (event) => {
		const user = requireUser(event);
		const formData = await event.request.formData();
		const fideId = formData.get('fideId')?.toString() ?? '';

		const result = await lookupFidePlayer(fideId);
		if (!result.ok) {
			return fail(400, { fideMessage: result.error });
		}

		await upsertChessAccount(user.id, 'fide', {
			username: result.username,
			externalId: result.externalId,
			displayName: result.displayName,
			verified: true
		});

		return { fideSuccess: true };
	},

	unlinkChess: async (event) => {
		const user = requireUser(event);
		const formData = await event.request.formData();
		const platform = formData.get('platform')?.toString();

		if (platform !== 'lichess' && platform !== 'chesscom' && platform !== 'fide') {
			return fail(400, { unlinkMessage: 'Invalid platform' });
		}

		await unlinkChessAccount(user.id, platform);
		return { unlinkSuccess: true };
	},

	saveSocial: async (event) => {
		const user = requireUser(event);
		const formData = await event.request.formData();
		const platform = formData.get('platform')?.toString() ?? '';
		const url = formData.get('url')?.toString().trim() ?? '';

		if (!(platform in SOCIAL_PLATFORMS)) {
			return fail(400, { socialMessage: 'Invalid social platform' });
		}

		if (!url) {
			await unlinkSocialLink(user.id, /** @type {keyof typeof SOCIAL_PLATFORMS} */ (platform));
			return { socialSuccess: true };
		}

		if (!isValidHttpUrl(url)) {
			return fail(400, { socialMessage: 'Enter a valid http(s) URL' });
		}

		await upsertSocialLink(user.id, /** @type {keyof typeof SOCIAL_PLATFORMS} */ (platform), url);
		return { socialSuccess: true };
	}
};
