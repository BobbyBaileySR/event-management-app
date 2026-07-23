import { CONFIG } from '../config';
import { useActiveRoute } from '../router/navigation';
import { useSession } from '../state/appState';
import { useSidebarNavItems, type SidebarNavItem } from '../hooks/useSidebarNavItems';
import { ThemeSwitcher } from './ThemeSwitcher';
import { WorkingEventPicker } from './WorkingEventPicker';
import type { ThemeId } from '../theme/themeTokens';
import styles from './Sidebar.module.css';

interface SidebarProps {
	onLogout: () => void;
	/** Display name for the selected event; falls back to a generic label. */
	eventName?: string | null;
	theme: ThemeId;
	celebrationAllowed: boolean;
	onThemeChange: (theme: ThemeId) => void;
	/**
	 * 'shell' (default): desktop's fixed-width bordered column (≥1024px).
	 * 'drawer': same content, embedded in the tablet slide-out `NavDrawer` — full width,
	 * no side border (the drawer panel owns its own edge/shadow).
	 */
	variant?: 'shell' | 'drawer';
}

export function Sidebar({
	onLogout,
	eventName: hubEventName,
	theme,
	celebrationAllowed,
	onThemeChange,
	variant = 'shell',
}: SidebarProps) {
	const { session } = useSession();
	const { eventId } = useActiveRoute();
	const { visible, topLevel, eventModules, admin } = useSidebarNavItems();

	return (
		<aside
			className={`${styles.sidebar} ${variant === 'drawer' ? styles.sidebarInDrawer : ''}`.trim()}
			aria-label="Sidebar"
		>
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
				{visible ? (
					<>
						{topLevel.map((item) => (
							<NavButton key={item.id} {...item} />
						))}

						<WorkingEventPicker currentEventName={eventId ? hubEventName : null} />

						<div className={styles.workingEventModules}>
							{eventModules.map((item) => (
								<NavButton key={item.id} {...item} />
							))}
						</div>

						<div className={`${styles.section} ${styles.adminSection}`}>
							{admin.map((item) => (
								<NavButton key={item.id} {...item} />
							))}
						</div>
					</>
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

function NavButton({ label, icon, active, disabled, onClick }: SidebarNavItem) {
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
