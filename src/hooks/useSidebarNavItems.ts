import { useNavigate } from 'react-router-dom';
import { SIDEBAR_EVENT_MODULES, type EventModule } from '../config/eventModules';
import { hasRequiredRole } from '../config/shellAccess';
import { auditPath, eventPath, overviewPath, useActiveRoute } from '../router/navigation';
import { useSession } from '../state/appState';

/** Overview / Programs & Events / Audit log are admin-only for now (FR-013). */
const TOP_LEVEL_MIN_ROLES = ['admin'] as const;

export interface SidebarNavItem {
	id: string;
	label: string;
	icon: string;
	active: boolean;
	disabled: boolean;
	onClick?: () => void;
}

export interface SidebarNavGroups {
	/** Whether the whole nav (top-level + working-event + modules + admin) renders for this session. */
	visible: boolean;
	topLevel: SidebarNavItem[];
	eventModules: SidebarNavItem[];
	admin: SidebarNavItem[];
}

/**
 * Single source of truth for the shell's nav item list, role gating, active state, and
 * disabled (no-working-event) state — shared by `Sidebar` (desktop shell + tablet drawer),
 * `IconRail` (tablet), and `MobileTabBar` (phone) so the three chrome variants can't drift.
 */
export function useSidebarNavItems(): SidebarNavGroups {
	const navigate = useNavigate();
	const { session } = useSession();
	const { name: activeRoute, eventId } = useActiveRoute();

	const visible = hasRequiredRole(session?.role, [...TOP_LEVEL_MIN_ROLES]);

	if (!visible) {
		return { visible, topLevel: [], eventModules: [], admin: [] };
	}

	const topLevel: SidebarNavItem[] = [
		{
			id: 'overview',
			label: 'Overview',
			icon: '📊',
			active: activeRoute === 'overview',
			disabled: false,
			onClick: () => navigate(overviewPath()),
		},
		{
			id: 'events',
			label: 'Programs & Events',
			icon: '🏢',
			active: activeRoute === 'events',
			disabled: false,
			onClick: () => navigate('/events'),
		},
	];

	const eventModules: SidebarNavItem[] = SIDEBAR_EVENT_MODULES.filter((item: EventModule) =>
		hasRequiredRole(session?.role, item.minRoles),
	).map((item: EventModule) => ({
		id: item.id,
		label: item.label,
		icon: item.icon,
		active: activeRoute === item.id,
		disabled: !eventId,
		onClick: eventId ? () => navigate(eventPath(eventId, item.id)) : undefined,
	}));

	const admin: SidebarNavItem[] = [
		{
			id: 'audit',
			label: 'Audit log',
			icon: '📋',
			active: activeRoute === 'audit',
			disabled: false,
			onClick: () => navigate(auditPath()),
		},
	];

	return { visible, topLevel, eventModules, admin };
}
