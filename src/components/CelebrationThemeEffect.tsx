import { useEffect, useRef } from 'react';
import { CONFIG } from '../config';
import { useSession } from '../state/appState';
import { applyCelebrationTheme, isCelebrationEmail } from '../utils/celebrationTheme';
import { useToast } from './Toast';

/** Applies blush theme and optional welcome toast after sign-in (authenticated shell only). */
export function CelebrationThemeEffect() {
	const { session } = useSession();
	const { showToast } = useToast();
	const toastShown = useRef(false);

	useEffect(() => {
		const active = isCelebrationEmail(session?.email);
		applyCelebrationTheme(active);

		const message = CONFIG.CELEBRATION_TOAST_MESSAGE.trim();
		if (active && message && !toastShown.current) {
			showToast(message, 'success');
			toastShown.current = true;
		}

		return () => {
			applyCelebrationTheme(false);
		};
	}, [session?.email, showToast]);

	return null;
}
