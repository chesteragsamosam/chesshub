/** @param {string | undefined | null} role */
export function isOrganizer(role) {
	return role === 'organizer' || role === 'admin';
}

/** @param {string | undefined | null} role */
export function isAdmin(role) {
	return role === 'admin';
}
