import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { avatarPublicPath } from '$lib/avatars.js';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const UPLOAD_DIR = path.join(projectRoot, 'uploads', 'avatars');
const MAX_DIMENSION = 256;
const WEBP_QUALITY = 80;
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_FORMATS = new Set(['jpeg', 'png', 'webp', 'gif', 'avif']);

export { avatarPublicPath, isLocalAvatarUrl } from '$lib/avatars.js';

/**
 * @param {string} userId
 */
export function avatarFilePath(userId) {
	return path.join(UPLOAD_DIR, `${userId}.webp`);
}

async function ensureUploadDir() {
	await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

/**
 * @param {string} userId
 */
export async function deleteAvatarFile(userId) {
	try {
		await fs.unlink(avatarFilePath(userId));
	} catch (err) {
		if (/** @type {NodeJS.ErrnoException} */ (err).code !== 'ENOENT') {
			throw err;
		}
	}
}

/**
 * Resize, compress, and store an uploaded avatar as WebP.
 * @param {string} userId
 * @param {File} file
 */
export async function saveAvatarUpload(userId, file) {
	if (!(file instanceof File) || file.size === 0) {
		return { ok: false, error: 'Choose an image file to upload' };
	}

	if (file.size > MAX_BYTES) {
		return { ok: false, error: 'Image must be 5 MB or smaller' };
	}

	const buffer = Buffer.from(await file.arrayBuffer());

	try {
		const image = sharp(buffer, { failOn: 'error' });
		const meta = await image.metadata();

		if (!meta.format || !ALLOWED_FORMATS.has(meta.format)) {
			return { ok: false, error: 'Use a JPEG, PNG, WebP, or GIF image' };
		}

		await ensureUploadDir();
		await deleteAvatarFile(userId);

		const processed = await image
			.rotate()
			.resize(MAX_DIMENSION, MAX_DIMENSION, {
				fit: 'cover',
				withoutEnlargement: true
			})
			.webp({ quality: WEBP_QUALITY })
			.toBuffer();

		await fs.writeFile(avatarFilePath(userId), processed);

		return { ok: true, url: avatarPublicPath(userId) };
	} catch {
		return { ok: false, error: 'Could not read that image file' };
	}
}
