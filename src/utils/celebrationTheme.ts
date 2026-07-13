import { CONFIG } from '../config';

/**
 * Case-insensitive match against the configured celebration email — used to simulate the
 * server-side Celebration allowlist re-validation in mock mode (`data/mockData.ts`). The real
 * gating source of truth is the backend's `celebrationAllowed` in the `user/prefs` response
 * (research R-002); `useTheme.ts` never calls this directly.
 */
export function isCelebrationEmail(email: string | undefined | null): boolean {
	const configured = CONFIG.CELEBRATION_THEME_EMAIL.trim().toLowerCase();
	if (!configured || !email) {
		return false;
	}
	return email.trim().toLowerCase() === configured;
}
