import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { randomBytes } from 'node:crypto';
import { parseFacebookSignedRequest } from '$lib/server/facebook';
import {
	createFacebookDataDeletionRequest,
	deleteFacebookAssociatedData
} from '$lib/server/db/queries';

/**
 * Meta / Facebook Data Deletion Request Callback.
 * App Dashboard → Settings → Basic → Data Deletion Request URL:
 * `{ORIGIN}/api/facebook/data-deletion`
 *
 * @type {import('./$types').RequestHandler}
 */
export async function POST(event) {
	const appSecret = env.FACEBOOK_CLIENT_SECRET;
	if (!appSecret) {
		return json({ error: 'Facebook login is not configured' }, { status: 503 });
	}

	const form = await event.request.formData();
	const signedRequest = form.get('signed_request')?.toString() ?? '';
	const payload = parseFacebookSignedRequest(signedRequest, appSecret);

	if (!payload?.user_id) {
		return json({ error: 'Invalid signed_request' }, { status: 400 });
	}

	const confirmationCode = randomBytes(16).toString('hex');
	const origin = (env.ORIGIN || event.url.origin).replace(/\/$/, '');
	const statusUrl = `${origin}/data-deletion/status?code=${encodeURIComponent(confirmationCode)}`;

	try {
		const result = await deleteFacebookAssociatedData(payload.user_id);
		await createFacebookDataDeletionRequest({
			confirmationCode,
			facebookUserId: payload.user_id,
			chessHubUserId: result.userId,
			status: result.found ? 'completed' : 'not_found',
			details: result.found
				? 'Removed Facebook login credentials and Facebook profile link from ChessHub.'
				: 'No ChessHub account was linked to this Facebook user id.'
		});
	} catch (error) {
		console.error('[facebook] data deletion failed', error);
		await createFacebookDataDeletionRequest({
			confirmationCode,
			facebookUserId: payload.user_id,
			status: 'failed',
			details: 'Deletion request received but processing failed. Contact ChessHub support.'
		}).catch(() => null);
	}

	// Meta requires exactly these fields.
	return json({
		url: statusUrl,
		confirmation_code: confirmationCode
	});
}
