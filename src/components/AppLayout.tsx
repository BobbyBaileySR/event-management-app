import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { PocBanner } from './PocBanner';
import { Sidebar } from './Sidebar';
import { useToast } from './Toast';
import { canAccessShell } from '../config/shellAccess';
import { useDataService } from '../hooks/useDataService';
import { useActiveRoute } from '../router/navigation';
import { logoutRequest } from '../services/authService';
import { useSession } from '../state/appState';
import { useTheme } from '../theme/useTheme';
import type { ThemeId } from '../theme/themeTokens';
import styles from './AppLayout.module.css';

/** Authenticated shell: banner + sidebar + routed main content. */
export function AppLayout() {
	const { session, clearSession } = useSession();
	const { eventId } = useActiveRoute();
	const data = useDataService();
	const { showToast } = useToast();
	const { theme, celebrationAllowed, setTheme } = useTheme();
	const [eventName, setEventName] = useState<string | null>(null);

	useEffect(() => {
		if (!eventId) {
			setEventName(null);
			return;
		}

		let cancelled = false;
		data
			.fetchCatalog()
			.then(({ events }) => {
				if (!cancelled) {
					setEventName(events.find((event) => event.id === eventId)?.name ?? null);
				}
			})
			.catch(() => {
				if (!cancelled) {
					setEventName(null);
				}
			});

		return () => {
			cancelled = true;
		};
	}, [data, eventId]);

	async function handleLogout() {
		await logoutRequest(session);
		clearSession();
	}

	async function handleThemeChange(nextTheme: ThemeId) {
		try {
			await setTheme(nextTheme);
		} catch {
			showToast("That theme isn't available for your account — switched to Aurora.", 'error');
		}
	}

	if (!canAccessShell(session?.role)) {
		return <RestrictedShell onSignOut={handleLogout} />;
	}

	return (
		<>
			<a href="#main-content" className="skip-link">
				Skip to main content
			</a>
			<div className={styles.frame}>
				<div className={styles.shell}>
					<PocBanner />
					<div className={styles.layout}>
						<Sidebar
							onLogout={handleLogout}
							eventName={eventName}
							theme={theme}
							celebrationAllowed={celebrationAllowed}
							onThemeChange={handleThemeChange}
						/>
						<main id="main-content" className={styles.main} aria-live="polite" tabIndex={-1}>
							<div className={styles.content}>
								<Outlet />
							</div>
						</main>
					</div>
				</div>
			</div>
		</>
	);
}

/** FR-013: signed-in but insufficient role — not a route, so no nav/sidebar to show. */
function RestrictedShell({ onSignOut }: { onSignOut: () => void }) {
	return (
		<>
			<a href="#main-content" className="skip-link">
				Skip to main content
			</a>
			<main id="main-content" className={styles.restricted} tabIndex={-1}>
				<div className="card">
					<h1>Access restricted</h1>
					<p>This app is available to admin accounts only right now. If you believe this is a mistake, contact your team lead.</p>
					<button type="button" className="btn btn-outline" onClick={onSignOut}>
						Sign out
					</button>
				</div>
			</main>
		</>
	);
}
