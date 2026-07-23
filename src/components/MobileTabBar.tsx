import { useActiveRoute } from '../router/navigation';
import { useSidebarNavItems, type SidebarNavItem } from '../hooks/useSidebarNavItems';
import { ThemeSwitcher } from './ThemeSwitcher';
import { WorkingEventPicker } from './WorkingEventPicker';
import type { ThemeId } from '../theme/themeTokens';
import styles from './MobileTabBar.module.css';

interface MobileTabBarProps {
	onLogout: () => void;
	eventName?: string | null;
	theme: ThemeId;
	celebrationAllowed: boolean;
	onThemeChange: (theme: ThemeId) => void;
}

/**
 * Phone (<768px) chrome — top horizontal scrollable tab bar, replacing the sidebar/rail
 * entirely (design_handoff 2 § Breakpoints); theme switcher moves into its own row below
 * the tabs. No screenshot reference exists for this tier in the design handoff (its README
 * says so explicitly) — this pass follows the README's textual spec (scrollable tab row +
 * theme row below) rather than a pixel reference.
 */
export function MobileTabBar({ onLogout, eventName: hubEventName, theme, celebrationAllowed, onThemeChange }: MobileTabBarProps) {
	const { eventId } = useActiveRoute();
	const { visible, topLevel, eventModules, admin } = useSidebarNavItems();

	if (!visible) {
		return null;
	}

	return (
		<div className={styles.chrome}>
			<div className={styles.tabs} role="navigation" aria-label="Main navigation">
				{topLevel.map((item) => (
					<Tab key={item.id} {...item} />
				))}
				{eventModules.map((item) => (
					<Tab key={item.id} {...item} />
				))}
				{admin.map((item) => (
					<Tab key={item.id} {...item} />
				))}
			</div>

			<div className={styles.pickerRow}>
				<WorkingEventPicker currentEventName={eventId ? hubEventName : null} />
			</div>

			<div className={styles.themeRow}>
				<ThemeSwitcher theme={theme} celebrationAllowed={celebrationAllowed} onSelect={onThemeChange} variant="row" />
				<button type="button" className={styles.signOut} onClick={onLogout}>
					Sign out
				</button>
			</div>
		</div>
	);
}

function Tab({ label, icon, active, disabled, onClick }: SidebarNavItem) {
	return (
		<button
			type="button"
			className={`${styles.tab} ${active ? styles.active : ''}`.trim()}
			aria-current={active ? 'page' : undefined}
			disabled={disabled}
			onClick={onClick}
		>
			<span className={styles.tabIcon} aria-hidden="true">
				{icon}
			</span>
			{label}
		</button>
	);
}
