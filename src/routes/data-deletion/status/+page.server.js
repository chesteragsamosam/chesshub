import { getFacebookDataDeletionRequestByCode } from '$lib/server/db/queries';

/** @type {import('./$types').PageServerLoad} */
export async function load(event) {
	const code = event.url.searchParams.get('code')?.trim() ?? '';
	if (!code) {
		return { code: '', request: null };
	}

	const request = await getFacebookDataDeletionRequestByCode(code);
	return {
		code,
		request: request
			? {
					confirmationCode: request.confirmationCode,
					status: request.status,
					details: request.details,
					createdAt: request.createdAt,
					completedAt: request.completedAt
				}
			: null
	};
}
