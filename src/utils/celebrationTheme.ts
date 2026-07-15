import { CONFIG } from '../config';

function isEmailOnList(email: string | undefined | null, list: string[]): boolean {
	if (!email) {
		return false;
	}
	const normalizedEmail = email.trim().toLowerCase();
	return list.some((configured) => configured.trim().toLowerCase() === normalizedEmail);
}

/**
 * Case-insensitive match against the configured celebration theme email list — used to simulate
 * server-side Celebration allowlist re-validation in mock mode (`data/mockData.ts`). The real
 * gating source of truth is the backend's `celebrationAllowed` in the `user/prefs` response
 * (research R-002); `useTheme.ts` never calls this directly.
 */
export function isCelebrationEmail(email: string | undefined | null): boolean {
	return isEmailOnList(email, CONFIG.CELEBRATION_THEME_EMAIL);
}

/**
 * Mock-mode stand-in for `CELEBRATION_TOAST_EMAIL` — independent of theme access.
 * Live toast copy comes from `user/prefs` → `celebrationToastMessage`.
 */
export function isCelebrationToastEmail(email: string | undefined | null): boolean {
	return isEmailOnList(email, CONFIG.CELEBRATION_TOAST_EMAIL);
}

/** Mock-mode toast copy when the email is toast-allowlisted and the message is non-empty. */
export function resolveMockCelebrationToastMessage(email: string | undefined | null): string | null {
	if (!isCelebrationToastEmail(email)) {
		return null;
	}
	const trimmed = CONFIG.CELEBRATION_TOAST_MESSAGE.trim();
	return trimmed.length > 0 ? trimmed : null;
}
