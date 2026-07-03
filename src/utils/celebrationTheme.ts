import { CONFIG } from '../config';

/** Case-insensitive match against the configured celebration email. */
export function isCelebrationEmail(email: string | undefined | null): boolean {
	const configured = CONFIG.CELEBRATION_THEME_EMAIL.trim().toLowerCase();
	if (!configured || !email) {
		return false;
	}
	return email.trim().toLowerCase() === configured;
}

export const CELEBRATION_THEME_ATTRIBUTE = 'data-theme';
export const CELEBRATION_THEME_VALUE = 'celebration';

export function applyCelebrationTheme(enabled: boolean): void {
	const root = document.documentElement;
	if (enabled) {
		root.setAttribute(CELEBRATION_THEME_ATTRIBUTE, CELEBRATION_THEME_VALUE);
		return;
	}
	root.removeAttribute(CELEBRATION_THEME_ATTRIBUTE);
}
