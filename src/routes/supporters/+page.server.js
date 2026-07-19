import { listPublicSupporters } from '$lib/server/db/queries';

/** @type {import('./$types').PageServerLoad} */
export async function load() {
	const supporters = await listPublicSupporters();
	return { supporters };
}
