import { useNavigate } from 'react-router-dom';
import { CONFIG } from '../config';
import { SIDEBAR_EVENT_MODULES, type EventModule } from '../config/eventModules';
import { hasRequiredRole } from '../config/shellAccess';
import { catalogPath, auditPath, eventPath, isEventScopedRoute, sliceModulePath, useActiveRoute } from '../router/navigation';
import { useSession } from '../state/appState';
import { useCatalogSelection } from '../state/catalogContext';
import { ThemeSwitcher } from './ThemeSwitcher';
import type { ThemeId } from '../theme/themeTokens';
import styles from './Sidebar.module.css';

/** All Events / Overview + Catalog admin / Audit log are admin-only for now (FR-013). */
const TOP_LEVEL_MIN_ROLES = ['admin'] as const;

interface SidebarProps {
	onLogout: () => void;
	/** Display name for the selected event; falls back to a generic label. */
	eventName?: string | null;
	theme: ThemeId;
	celebrationAllowed: boolean;
	onThemeChange: (theme: ThemeId) => void;
}

export function Sidebar({ onLogout, eventName: hubEventName, theme, celebrationAllowed, onThemeChange }: SidebarProps) {
	const navigate = useNavigate();
	const { session } = useSession();
	const { name: activeRoute, eventId } = useActiveRoute();
	const { programId, evId, programName, eventName: catalogEventName } = useCatalogSelection();

	return (
		<aside className={styles.sidebar} aria-label="Sidebar">
			<div className={styles.header}>
				<h2>{CONFIG.APP_SHORT_NAME}</h2>
				{session?.email ? <p className={styles.user}>{session.email}</p> : null}
			</div>

			<nav className={styles.nav} aria-label="Main navigation">
				{hasRequiredRole(session?.role, [...TOP_LEVEL_MIN_ROLES]) ? (
					<>
						<NavButton
							label="All Events"
							icon="🏢"
							active={activeRoute === 'events'}
							onClick={() => navigate('/events')}
						/>
						<NavButton
							label="Catalog admin"
							icon="🗂️"
							active={activeRoute === 'catalog'}
							onClick={() => navigate(catalogPath())}
						/>
						<NavButton
							label="Audit log"
							icon="📋"
							active={activeRoute === 'audit'}
							onClick={() => navigate(auditPath())}
						/>
					</>
				) : null}

				{hasRequiredRole(session?.role, [...TOP_LEVEL_MIN_ROLES]) && programId && evId ? (
					<div className={styles.section}>
						<p className={styles.sectionLabel}>
							{programName && catalogEventName
								? `${programName} — ${catalogEventName}`
								: 'Catalog selection'}
						</p>
						<NavButton
							label="Attendees"
							icon="👥"
							active={activeRoute === 'attendees'}
							onClick={() => navigate(sliceModulePath('attendees'))}
						/>
						<NavButton
							label="Check-in"
							icon="✓"
							active={activeRoute === 'check-in'}
							onClick={() => navigate(sliceModulePath('check-in'))}
						/>
						<NavButton
							label="Email"
							icon="✉️"
							active={activeRoute === 'email'}
							onClick={() => navigate(sliceModulePath('email'))}
						/>
					</div>
				) : null}

				{eventId && isEventScopedRoute(activeRoute) ? (
					<div className={styles.section}>
						<p className={styles.sectionLabel}>{hubEventName ?? 'Selected event'}</p>
						{SIDEBAR_EVENT_MODULES.filter((item: EventModule) => hasRequiredRole(session?.role, item.minRoles)).map(
							(item: EventModule) => (
								<NavButton
									key={item.id}
									label={item.label}
									icon={item.icon}
									active={activeRoute === item.id}
									onClick={() => navigate(eventPath(eventId, item.id))}
								/>
							),
						)}
					</div>
				) : null}
			</nav>

			<div className={styles.footer}>
				<p className={styles.sectionLabel}>Theme</p>
				<ThemeSwitcher theme={theme} celebrationAllowed={celebrationAllowed} onSelect={onThemeChange} />
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
