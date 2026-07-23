import { useActiveRoute } from '../router/navigation';
import { useSidebarNavItems, type SidebarNavItem } from '../hooks/useSidebarNavItems';
import { ThemeSwitcher } from './ThemeSwitcher';
import type { ThemeId } from '../theme/themeTokens';
import styles from './IconRail.module.css';

interface IconRailProps {
	/** Name of the working event, when one is selected — not shown in the rail itself (kept
	 * icon-only/slim), but used for this button's accessible name. The name is surfaced
	 * visually via `TopBar`'s `workingEvent` pill instead, which has room for it on every
	 * breakpoint, not just this one. */
	eventName?: string | null;
	theme: ThemeId;
	celebrationAllowed: boolean;
	onThemeChange: (theme: ThemeId) => void;
	/** Opens the tablet slide-out `NavDrawer` — the rail has no room for the working-event
	 * search input itself, so both the hamburger and the working-event icon below defer to
	 * the drawer's full `Sidebar` content to actually change the selection. */
	onOpenDrawer: () => void;
}

/** Tablet (768-1023px) chrome — 64px icon-only rail, replacing the full `Sidebar` (design_handoff 2 § Breakpoints). */
export function IconRail({ eventName: hubEventName, theme, celebrationAllowed, onThemeChange, onOpenDrawer }: IconRailProps) {
	const { eventId } = useActiveRoute();
	const { visible, topLevel, eventModules, admin } = useSidebarNavItems();
	const eventName = eventId ? hubEventName : null;

	return (
		<nav className={styles.rail} aria-label="Main navigation">
			<button type="button" className={styles.hamburger} onClick={onOpenDrawer} aria-label="Open navigation menu">
				<span aria-hidden="true">☰</span>
			</button>

			{visible ? (
				<>
					{topLevel.map((item) => (
						<RailButton key={item.id} {...item} />
					))}

					<button
						type="button"
						className={styles.railButton}
						onClick={onOpenDrawer}
						aria-label={eventName ? `Working event: ${eventName}. Open menu to change it.` : 'No working event selected — open menu to choose one'}
						title={eventName ?? 'Select a working event'}
					>
						<span aria-hidden="true">🗓️</span>
					</button>

					{eventModules.map((item) => (
						<RailButton key={item.id} {...item} />
					))}

					<div className={styles.spacer} aria-hidden="true" />

					{admin.map((item) => (
						<RailButton key={item.id} {...item} />
					))}

					<ThemeSwitcher theme={theme} celebrationAllowed={celebrationAllowed} onSelect={onThemeChange} variant="compact" />
				</>
			) : null}
		</nav>
	);
}

function RailButton({ label, icon, active, disabled, onClick }: SidebarNavItem) {
	return (
		<button
			type="button"
			className={`${styles.railButton} ${active ? styles.active : ''}`.trim()}
			aria-label={label}
			aria-current={active ? 'page' : undefined}
			disabled={disabled}
			onClick={onClick}
			title={label}
		>
			<span aria-hidden="true">{icon}</span>
		</button>
	);
}
