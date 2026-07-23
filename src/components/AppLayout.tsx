import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { IconRail } from './IconRail';
import { MobileTabBar } from './MobileTabBar';
import { NavDrawer } from './NavDrawer';
import { PocBanner } from './PocBanner';
import { Sidebar } from './Sidebar';
import { useToast } from './Toast';
import { canAccessShell } from '../config/shellAccess';
import { useCatalog } from '../data/hooks/useCatalog';
import { useActiveRoute } from '../router/navigation';
import { logoutRequest } from '../services/authService';
import { useSession } from '../state/appState';
import { useTheme } from '../theme/useTheme';
import { useViewportTier } from '../hooks/useViewportTier';
import type { ThemeId } from '../theme/themeTokens';
import styles from './AppLayout.module.css';

/**
 * Authenticated shell: banner + sidebar + routed main content. The event-name lookup shares the
 * cached catalog query (`useCatalog`) with `WorkingEventPicker` and the session-lifecycle
 * prefetch, instead of its own independent raw fetch.
 */
export function AppLayout() {
	const { session, clearSession } = useSession();
	const { eventId } = useActiveRoute();
	const { data: catalog } = useCatalog();
	const { showToast } = useToast();
	const { theme, celebrationAllowed, setTheme } = useTheme();
	const eventName = eventId ? (catalog?.events.find((event) => event.id === eventId)?.name ?? null) : null;
	const tier = useViewportTier();
	const [drawerOpen, setDrawerOpen] = useState(false);

	// If a resize carries the viewport out of the tablet tier while the drawer is open
	// (rotation, manual browser resize), close it rather than leaving it stranded — the
	// drawer only makes sense alongside `IconRail`.
	useEffect(() => {
		if (tier !== 'tablet') {
			setDrawerOpen(false);
		}
	}, [tier]);

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
					{tier === 'phone' ? (
						<MobileTabBar
							onLogout={handleLogout}
							eventName={eventName}
							theme={theme}
							celebrationAllowed={celebrationAllowed}
							onThemeChange={handleThemeChange}
						/>
					) : null}
					<div className={styles.layout}>
						{tier === 'desktop' ? (
							<Sidebar
								onLogout={handleLogout}
								eventName={eventName}
								theme={theme}
								celebrationAllowed={celebrationAllowed}
								onThemeChange={handleThemeChange}
							/>
						) : null}
						{tier === 'tablet' ? (
							<>
								<IconRail
									eventName={eventName}
									theme={theme}
									celebrationAllowed={celebrationAllowed}
									onThemeChange={handleThemeChange}
									onOpenDrawer={() => setDrawerOpen(true)}
								/>
								{drawerOpen ? (
									<NavDrawer onClose={() => setDrawerOpen(false)}>
										<Sidebar
											variant="drawer"
											onLogout={handleLogout}
											eventName={eventName}
											theme={theme}
											celebrationAllowed={celebrationAllowed}
											onThemeChange={handleThemeChange}
										/>
									</NavDrawer>
								) : null}
							</>
						) : null}
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
