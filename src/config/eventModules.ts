import type { EmsRole } from '../types';

/**
 * Single source of truth for event-scoped module navigation (sidebar + Event Hub cards).
 * Ported from js/config/eventModules.js.
 *
 * `minRoles` (FR-013): every module is admin-only for now. Declaring it per-module (rather
 * than a single hardcoded `role === 'admin'` check at each call site) means a future
 * `check-in operator` role can be granted access to specific modules (e.g. `check-in`) by
 * editing this list, without restructuring Sidebar/AppLayout.
 */
export interface EventModule {
	id: string;
	label: string;
	icon: string;
	description?: string;
	hubModule?: boolean;
	minRoles: EmsRole[];
}

export const EVENT_MODULES: EventModule[] = [
	{ id: 'event-hub', label: 'Event Hub', icon: '📋', minRoles: ['admin'] },
	{ id: 'attendees', label: 'Attendees', icon: '👥', description: 'List, search, segments, export', hubModule: true, minRoles: ['admin'] },
	{ id: 'check-in', label: 'Check-in', icon: '✓', description: 'On-site arrival desk and QR scan', hubModule: true, minRoles: ['admin'] },
	{ id: 'email', label: 'Email', icon: '✉️', description: 'Templates, sends, and scheduling', hubModule: true, minRoles: ['admin'] },
	{ id: 'analytics', label: 'Analytics', icon: '📊', description: 'Funnel, campaigns, and trends', hubModule: true, minRoles: ['admin'] },
	{ id: 'agenda', label: 'Agenda', icon: '🗓️', description: 'Sessions, speakers, and rooms', hubModule: true, minRoles: ['admin'] },
	{ id: 'settings', label: 'Settings', icon: '⚙️', description: 'Event details and registration', hubModule: true, minRoles: ['admin'] },
];

/** Sidebar shows every event module. */
export const SIDEBAR_EVENT_MODULES = EVENT_MODULES;

/** Event Hub shortcut cards — excludes Event Hub itself. */
export const HUB_MODULE_CARDS = EVENT_MODULES.filter((module) => module.hubModule);

/** Valid module route segments (everything except the hub itself). */
export const MODULE_ROUTE_IDS: Record<string, string> = Object.fromEntries(
	EVENT_MODULES.filter((module) => module.id !== 'event-hub').map((module) => [module.id, module.id]),
);
