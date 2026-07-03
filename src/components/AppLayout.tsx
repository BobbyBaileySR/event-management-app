import { Outlet } from 'react-router-dom';
import { PocBanner } from './PocBanner';
import { Sidebar } from './Sidebar';
import { logoutRequest } from '../services/authService';
import { useSession } from '../state/appState';
import styles from './AppLayout.module.css';

/** Authenticated shell: banner + sidebar + routed main content. */
export function AppLayout() {
	const { session, clearSession } = useSession();

	async function handleLogout() {
		await logoutRequest(session);
		clearSession();
	}

	return (
		<>
			<PocBanner />
			<div className={styles.layout}>
				{/* eventName is wired when event data is ported (R3); null shows a generic label. */}
				<Sidebar onLogout={handleLogout} eventName={null} />
				<main className={styles.main} aria-live="polite">
					<Outlet />
				</main>
			</div>
		</>
	);
}
