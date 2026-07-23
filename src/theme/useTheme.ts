import { useCallback, useEffect, useRef, useState } from 'react';
import { useToast } from '../components/Toast';
import { useDataService } from '../hooks/useDataService';
import { useSession } from '../state/appState';
import { DEFAULT_THEME_ID, type ThemeId } from './themeTokens';

const THEME_ATTRIBUTE = 'data-theme';

function applyThemeAttribute(theme: ThemeId): void {
	document.documentElement.setAttribute(THEME_ATTRIBUTE, theme);
}

export interface UseThemeResult {
	theme: ThemeId;
	/** Whether the switcher should offer Celebration to this user (server re-validated). */
	celebrationAllowed: boolean;
	loading: boolean;
	setTheme: (theme: ThemeId) => Promise<void>;
}

/**
 * Applies `data-theme`, loads the persisted preference on mount, and persists changes
 * (research R-002 / data-model.md). Celebration is always re-validated server-side — the
 * stored/requested value is never trusted for gating; a rejected or failed write falls back
 * to Aurora, matching the `user/prefs` contract.
 *
 * The one-time login toast is independent of theme: it shows when prefs return a non-null
 * `celebrationToastMessage` (toast-list + message Param), for any active theme.
 */
export function useTheme(): UseThemeResult {
	const data = useDataService();
	const { session } = useSession();
	const { showToast } = useToast();
	const [theme, setThemeState] = useState<ThemeId>(DEFAULT_THEME_ID);
	const [celebrationAllowed, setCelebrationAllowed] = useState(false);
	const [loading, setLoading] = useState(true);
	const welcomeToastShown = useRef(false);

	useEffect(() => {
		let cancelled = false;
		setLoading(true);

		data
			.getThemePreference()
			.then((pref) => {
				if (cancelled) {
					return;
				}
				setThemeState(pref.theme);
				setCelebrationAllowed(pref.celebrationAllowed);
				applyThemeAttribute(pref.theme);

				const message = pref.celebrationToastMessage?.trim() ?? '';
				if (message && !welcomeToastShown.current) {
					showToast(message, 'success');
					welcomeToastShown.current = true;
				}
			})
			.catch(() => {
				// Keep the default Aurora state; the switcher still works once the user picks a theme.
			})
			.finally(() => {
				if (!cancelled) {
					setLoading(false);
				}
			});

		return () => {
			cancelled = true;
		};
	}, [data, session?.email, showToast]);

	const setTheme = useCallback(
		async (nextTheme: ThemeId) => {
			applyThemeAttribute(nextTheme);
			setThemeState(nextTheme);
			try {
				const pref = await data.setThemePreference(nextTheme);
				setThemeState(pref.theme);
				setCelebrationAllowed(pref.celebrationAllowed);
				applyThemeAttribute(pref.theme);
			} catch (error) {
				setThemeState(DEFAULT_THEME_ID);
				applyThemeAttribute(DEFAULT_THEME_ID);
				throw error;
			}
		},
		[data, session?.email],
	);

	return { theme, celebrationAllowed, loading, setTheme };
}
