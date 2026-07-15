import { useNavigate } from 'react-router-dom';
import { CONFIG } from '../config';
import { SIDEBAR_EVENT_MODULES, type EventModule } from '../config/eventModules';
import { hasRequiredRole } from '../config/shellAccess';
import { auditPath, eventPath, overviewPath, useActiveRoute } from '../router/navigation';
import { useSession } from '../state/appState';
import { ThemeSwitcher } from './ThemeSwitcher';
import { WorkingEventPicker } from './WorkingEventPicker';
import type { ThemeId } from '../theme/themeTokens';
import styles from './Sidebar.module.css';

/** Overview / Programs & Events / Audit log are admin-only for now (FR-013). */
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

	return (
		<aside className={styles.sidebar} aria-label="Sidebar">
			<div className={styles.header}>
				<span className={styles.logo} aria-hidden="true">
					{CONFIG.APP_SHORT_NAME.charAt(0)}
				</span>
				<div>
					<h2>{CONFIG.APP_SHORT_NAME}</h2>
					{session?.email ? <p className={styles.user}>{session.email}</p> : null}
				</div>
			</div>

			<nav className={styles.nav} aria-label="Main navigation">
				{hasRequiredRole(session?.role, [...TOP_LEVEL_MIN_ROLES]) ? (
					<>
						<NavButton
							label="Overview"
							icon="📊"
							active={activeRoute === 'overview'}
							onClick={() => navigate(overviewPath())}
						/>
						<NavButton
							label="Programs & Events"
							icon="🏢"
							active={activeRoute === 'events'}
							onClick={() => navigate('/events')}
						/>
					</>
				) : null}

				{hasRequiredRole(session?.role, [...TOP_LEVEL_MIN_ROLES]) ? (
					<WorkingEventPicker currentEventName={eventId ? hubEventName : null} />
				) : null}

				{hasRequiredRole(session?.role, [...TOP_LEVEL_MIN_ROLES]) ? (
					<div className={styles.workingEventModules}>
						{SIDEBAR_EVENT_MODULES.filter((item: EventModule) => hasRequiredRole(session?.role, item.minRoles)).map(
							(item: EventModule) => (
								<NavButton
									key={item.id}
									label={item.label}
									icon={item.icon}
									active={activeRoute === item.id}
									disabled={!eventId}
									onClick={eventId ? () => navigate(eventPath(eventId, item.id)) : undefined}
								/>
							),
						)}
					</div>
				) : null}

				{hasRequiredRole(session?.role, [...TOP_LEVEL_MIN_ROLES]) ? (
					<div className={`${styles.section} ${styles.adminSection}`}>
						<NavButton
							label="Audit log"
							icon="📋"
							active={activeRoute === 'audit'}
							onClick={() => navigate(auditPath())}
						/>
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
	disabled?: boolean;
	onClick?: () => void;
}

function NavButton({ label, icon, active, disabled, onClick }: NavButtonProps) {
	return (
		<button
			type="button"
			className={`${styles.navItem} ${active ? styles.active : ''}`}
			aria-current={active ? 'page' : undefined}
			disabled={disabled}
			onClick={onClick}
		>
			<span className={styles.navBar} aria-hidden="true" />
			<span className={styles.navIcon} aria-hidden="true">
				{icon}
			</span>{' '}
			{label}
		</button>
	);
}
