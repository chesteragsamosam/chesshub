import { fail } from '@sveltejs/kit';
import { requireAdmin } from '$lib/server/auth-guards';
import {
	getPendingOrganizerRequests,
	reviewOrganizerRequest
} from '$lib/server/db/queries';

/** @type {import('./$types').PageServerLoad} */
export async function load(event) {
	requireAdmin(event);
	const requests = await getPendingOrganizerRequests();
	return { requests };
}

export const actions = {
	approve: async (event) => {
		const admin = requireAdmin(event);
		const formData = await event.request.formData();
		const requestId = formData.get('requestId')?.toString();
		if (!requestId) return fail(400, { message: 'Missing request' });

		await reviewOrganizerRequest(requestId, 'approved', admin.id);
		return { success: true };
	},

	reject: async (event) => {
		const admin = requireAdmin(event);
		const formData = await event.request.formData();
		const requestId = formData.get('requestId')?.toString();
		if (!requestId) return fail(400, { message: 'Missing request' });

		await reviewOrganizerRequest(requestId, 'rejected', admin.id);
		return { success: true };
	}
};
