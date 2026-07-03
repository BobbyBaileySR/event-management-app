import { useNavigate } from 'react-router-dom';
import { CONFIG } from '../config';
import { SIDEBAR_EVENT_MODULES, type EventModule } from '../config/eventModules';
import { eventPath, isEventScopedRoute, useActiveRoute } from '../router/navigation';
import { useSession } from '../state/appState';
import styles from './Sidebar.module.css';

interface SidebarProps {
	onLogout: () => void;
	/** Display name for the selected event; falls back to a generic label. */
	eventName?: string | null;
}

export function Sidebar({ onLogout, eventName }: SidebarProps) {
	const navigate = useNavigate();
	const { session } = useSession();
	const { name: activeRoute, eventId } = useActiveRoute();

	return (
		<aside className={styles.sidebar} aria-label="Sidebar">
			<div className={styles.header}>
				<h2>{CONFIG.APP_SHORT_NAME}</h2>
				{session?.email ? <p className={styles.user}>{session.email}</p> : null}
			</div>

			<nav className={styles.nav} aria-label="Main navigation">
				<NavButton
					label="All Events"
					icon="🏢"
					active={activeRoute === 'events'}
					onClick={() => navigate('/events')}
				/>

				{eventId && isEventScopedRoute(activeRoute) ? (
					<div className={styles.section}>
						<p className={styles.sectionLabel}>{eventName ?? 'Selected event'}</p>
						{SIDEBAR_EVENT_MODULES.map((item: EventModule) => (
							<NavButton
								key={item.id}
								label={item.label}
								icon={item.icon}
								active={activeRoute === item.id}
								onClick={() => navigate(eventPath(eventId, item.id))}
							/>
						))}
					</div>
				) : null}
			</nav>

			<div className={styles.footer}>
				<p>Adaptavist staff only · verified session</p>
				<button type="button" className={styles.signOut} onClick={onLogout}>
					Sign out
				</button>
			</div>
		</aside>
	);
}

interface NavButtonProps {
	label: string;
	icon: string;
	active: boolean;
	onClick: () => void;
}

function NavButton({ label, icon, active, onClick }: NavButtonProps) {
	return (
		<button type="button" className={`${styles.navItem} ${active ? styles.active : ''}`} onClick={onClick}>
			<span aria-hidden="true">{icon}</span> {label}
		</button>
	);
}
