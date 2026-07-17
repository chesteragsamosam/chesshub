import { error } from '@sveltejs/kit';
import fs from 'node:fs/promises';
import { avatarFilePath } from '$lib/server/avatars.js';

/** @type {import('./$types').RequestHandler} */
export async function GET({ params }) {
	try {
		const body = await fs.readFile(avatarFilePath(params.userId));

		return new Response(body, {
			headers: {
				'Content-Type': 'image/webp',
				'Cache-Control': 'public, max-age=31536000, immutable'
			}
		});
	} catch (err) {
		if (/** @type {NodeJS.ErrnoException} */ (err).code === 'ENOENT') {
			error(404, 'Avatar not found');
		}

		throw err;
	}
}
