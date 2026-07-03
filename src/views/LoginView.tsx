import { useEffect, useRef, useState } from 'react';
import { CONFIG } from '../config';
import { exchangeGoogleToken, renderGoogleSignInButton } from '../services/authService';
import { useSession } from '../state/appState';
import styles from './LoginView.module.css';

/** Sign-in gate. Mounts the Google Identity Services button and exchanges the token for a session. */
export function LoginView() {
	const { setSession } = useSession();
	const buttonHost = useRef<HTMLDivElement>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const host = buttonHost.current;
		if (!host) {
			return;
		}

		let cancelled = false;

		async function onCredential(idToken: string) {
			try {
				const session = await exchangeGoogleToken(idToken);
				if (!cancelled) {
					setSession(session);
				}
			} catch (err) {
				if (!cancelled) {
					setError(err instanceof Error ? err.message : 'Sign-in failed');
				}
			}
		}

		renderGoogleSignInButton(host, onCredential).catch((err: unknown) => {
			if (!cancelled) {
				setError(err instanceof Error ? err.message : 'Google Sign-In unavailable');
			}
		});

		return () => {
			cancelled = true;
		};
	}, [setSession]);

	const mockModes: string[] = [];
	if (CONFIG.USE_MOCK_AUTH) {
		mockModes.push('mock auth');
	}
	if (CONFIG.USE_MOCK_API) {
		mockModes.push('sample data');
	}
	const mockLabel = mockModes.length > 0 ? `PoC shell (${mockModes.join(', ')}). ` : '';
	const originHint = CONFIG.GOOGLE_CLIENT_ID
		? ` Authorized JavaScript origin in Google Cloud Console: ${window.location.origin}`
		: '';

	return (
		<div className={styles.screen}>
			<div className={styles.card}>
				<h2>{CONFIG.APP_NAME}</h2>
				<p className={styles.subtitle}>Event Management System</p>

				<div ref={buttonHost} className={styles.googleHost}>
					<p className={styles.subtitle}>Loading sign-in…</p>
				</div>

				{error ? <p className={styles.error}>{error}</p> : null}

				<p className={styles.notice}>
					{`${mockLabel}Sign in with your @${CONFIG.ALLOWED_EMAIL_DOMAIN} account to continue.${originHint}`}
				</p>
			</div>
		</div>
	);
}
