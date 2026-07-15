import type { EmsRole } from '../types';

/**
 * Single source of truth for event-scoped module navigation (Sidebar's working-event section).
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

/**
 * `event-hub` is the Event Details view (007 redesign T046 — replaced the module-card grid
 * previously shown there; event-scoped navigation now lives entirely in this sidebar list).
 */
export const EVENT_MODULES: EventModule[] = [
	{ id: 'event-hub', label: 'Event Details', icon: '📋', minRoles: ['admin'] },
	{ id: 'attendees', label: 'Registered Attendees', icon: '👥', description: 'List, search, segments, export', hubModule: true, minRoles: ['admin'] },
	{ id: 'check-in', label: 'Check-in', icon: '✓', description: 'On-site arrival desk and QR scan', hubModule: true, minRoles: ['admin'] },
	{ id: 'email', label: 'Email', icon: '✉️', description: 'Templates, sends, and scheduling', hubModule: true, minRoles: ['admin'] },
];

/** Sidebar shows every event module. */
export const SIDEBAR_EVENT_MODULES = EVENT_MODULES;

/** Valid module route segments (everything except the hub itself). */
export const MODULE_ROUTE_IDS: Record<string, string> = Object.fromEntries(
	EVENT_MODULES.filter((module) => module.id !== 'event-hub').map((module) => [module.id, module.id]),
);
