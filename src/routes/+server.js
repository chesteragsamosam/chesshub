import { json } from '@sveltejs/kit';

/**
 * PayMongo dashboard is sometimes pointed at the site root instead of
 * `/api/paymongo/webhook`. Accept signed webhook POSTs here and forward them.
 *
 * @type {import('./$types').RequestHandler}
 */
export async function POST(event) {
	if (!event.request.headers.get('paymongo-signature')) {
		return json({ error: 'Not found' }, { status: 404 });
	}

	const body = await event.request.text();
	return event.fetch(new URL('/api/paymongo/webhook', event.url), {
		method: 'POST',
		headers: event.request.headers,
		body
	});
}
