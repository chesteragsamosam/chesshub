import { auth } from '$lib/server/auth';

/**
 * Explicit Better Auth mount.
 *
 * `svelteKitHandler` in hooks only forwards when `event.url.origin` matches
 * `ORIGIN` exactly (including scheme). Behind ngrok/TLS termination Vite sees
 * `http://…` while `ORIGIN` is `https://…`, so those requests 404 without this
 * catch-all.
 *
 * @param {import('@sveltejs/kit').RequestEvent} event
 */
const handleAuth = (event) => auth.handler(event.request);

export const GET = handleAuth;
export const POST = handleAuth;
export const PUT = handleAuth;
export const PATCH = handleAuth;
export const DELETE = handleAuth;
