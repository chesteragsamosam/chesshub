import { redirect } from '@sveltejs/kit';

/** @typedef {'user' | 'organizer_pending' | 'organizer' | 'admin'} UserRole */

/**
 * @param {import('@sveltejs/kit').RequestEvent} event
 */
export function requireUser(event) {
	if (!event.locals.user) {
		redirect(302, '/login');
	}
	return event.locals.user;
}

/**
 * @param {import('@sveltejs/kit').RequestEvent} event
 */
export function requireOrganizer(event) {
	const user = requireUser(event);
	if (user.role !== 'organizer' && user.role !== 'admin') {
		redirect(302, '/organizer/apply');
	}
	return user;
}

/**
 * @param {import('@sveltejs/kit').RequestEvent} event
 */
export function requireAdmin(event) {
	const user = requireUser(event);
	if (user.role !== 'admin') {
		redirect(302, '/');
	}
	return user;
}

/**
 * @param {string | undefined | null} role
 */
export function isOrganizer(role) {
	return role === 'organizer' || role === 'admin';
}

/**
 * @param {string | undefined | null} role
 */
export function isAdmin(role) {
	return role === 'admin';
}
