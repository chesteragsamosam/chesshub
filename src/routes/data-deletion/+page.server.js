import { env } from '$env/dynamic/private';

/** @type {import('./$types').PageServerLoad} */
export async function load(event) {
	const origin = (env.ORIGIN || event.url.origin).replace(/\/$/, '');
	return {
		callbackUrl: `${origin}/api/facebook/data-deletion`
	};
}
