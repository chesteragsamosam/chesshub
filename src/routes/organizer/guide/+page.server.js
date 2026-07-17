import { requireOrganizer } from '$lib/server/auth-guards';

/** @type {import('./$types').PageServerLoad} */
export function load(event) {
	requireOrganizer(event);
	return {};
}
