import { browser } from '$app/environment';

/** @typedef {'system' | 'light' | 'dark'} ThemePreference */
/** @typedef {'light' | 'dark'} ResolvedTheme */

export const THEME_STORAGE_KEY = 'chesshub-theme';

export const theme = $state({
	/** @type {ThemePreference} */
	preference: 'system',
	/** @type {ResolvedTheme} */
	resolved: 'dark'
});

/** @returns {boolean} */
function systemPrefersDark() {
	return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/** @param {ThemePreference} preference */
function resolveTheme(preference) {
	if (preference === 'system') {
		return systemPrefersDark() ? 'dark' : 'light';
	}
	return preference;
}

/** @param {ResolvedTheme} resolved */
function applyTheme(resolved) {
	document.documentElement.dataset.theme = resolved;
	theme.resolved = resolved;
}

/** @param {ThemePreference} preference */
export function setThemePreference(preference) {
	theme.preference = preference;
	if (!browser) return;

	localStorage.setItem(THEME_STORAGE_KEY, preference);
	applyTheme(resolveTheme(preference));
}

/** @returns {ThemePreference} */
function readStoredPreference() {
	const stored = localStorage.getItem(THEME_STORAGE_KEY);
	if (stored === 'light' || stored === 'dark' || stored === 'system') {
		return stored;
	}
	return 'system';
}

let initialized = false;

export function initTheme() {
	if (!browser || initialized) return;
	initialized = true;

	theme.preference = readStoredPreference();
	applyTheme(resolveTheme(theme.preference));

	const media = window.matchMedia('(prefers-color-scheme: dark)');
	media.addEventListener('change', () => {
		if (theme.preference === 'system') {
			applyTheme(resolveTheme('system'));
		}
	});
}
