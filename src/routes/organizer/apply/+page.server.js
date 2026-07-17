import { fail, redirect } from '@sveltejs/kit';
import { requireUser } from '$lib/server/auth-guards';
import { isOrganizer } from '$lib/roles';
import {
	createOrganizerRequest,
	getPendingOrganizerRequest
} from '$lib/server/db/queries';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

/** @type {import('./$types').PageServerLoad} */
export async function load(event) {
	const current = requireUser(event);

	if (isOrganizer(current.role)) {
		redirect(302, '/organizer');
	}

	const pending = await getPendingOrganizerRequest(current.id);
	return {
		pending,
		role: current.role
	};
}

export const actions = {
	default: async (event) => {
		const current = requireUser(event);

		if (isOrganizer(current.role)) {
			redirect(302, '/organizer');
		}

		const existing = await getPendingOrganizerRequest(current.id);
		if (existing) {
			return fail(400, { message: 'You already have a pending request' });
		}

		const formData = await event.request.formData();
		const message = formData.get('message')?.toString().trim() ?? '';

		await createOrganizerRequest(current.id, message || null);
		await db.update(user).set({ role: 'organizer_pending' }).where(eq(user.id, current.id));

		return { success: true };
	}
};
