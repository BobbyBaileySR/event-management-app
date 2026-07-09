import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { CatalogPickers } from './CatalogPickers';
import { PocBanner } from './PocBanner';
import { Sidebar } from './Sidebar';
import { useDataService } from '../hooks/useDataService';
import { useActiveRoute } from '../router/navigation';
import { logoutRequest } from '../services/authService';
import { CatalogProvider } from '../state/catalogContext';
import { useSession } from '../state/appState';
import styles from './AppLayout.module.css';

/** Authenticated shell: banner + sidebar + routed main content. */
export function AppLayout() {
	const { session, clearSession } = useSession();
	const { eventId } = useActiveRoute();
	const data = useDataService();
	const [eventName, setEventName] = useState<string | null>(null);

	useEffect(() => {
		if (!eventId) {
			setEventName(null);
			return;
		}

		let cancelled = false;
		data.fetchEvent(eventId).then(({ event }) => {
			if (!cancelled) {
				setEventName(event?.name ?? null);
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

	return (
		<CatalogProvider>
			<a href="#main-content" className="skip-link">
				Skip to main content
			</a>
			<div className={styles.shell}>
				<PocBanner />
				<div className={styles.layout}>
					<Sidebar onLogout={handleLogout} eventName={eventName} />
					<main id="main-content" className={styles.main} aria-live="polite" tabIndex={-1}>
						<div className={styles.pickerDock}>
							<CatalogPickers />
						</div>
						<div className={styles.content}>
							<Outlet />
						</div>
					</main>
				</div>
			</div>
		</CatalogProvider>
	);
}
