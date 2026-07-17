import { redirect } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';

/** @type {import('./$types').Actions} */
export const actions = {
	default: async (event) => {
		await auth.api.signOut({
			headers: event.request.headers
		});
		redirect(302, '/');
	}
};

/** @type {import('./$types').PageServerLoad} */
export const load = async () => {
	redirect(302, '/');
};
