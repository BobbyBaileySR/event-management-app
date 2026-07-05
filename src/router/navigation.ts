import { useParams, useLocation } from 'react-router-dom';
import { MODULE_ROUTE_IDS } from '../config/eventModules';

export interface ActiveRoute {
	/** Logical route name: 'events', 'catalog', 'event-hub', or a module id (attendees, email, ...). */
	name: string;
	eventId: string | null;
}

/** Build a hash path for react-router navigation. */
export function eventPath(eventId: string, moduleId?: string | null): string {
	if (!moduleId || moduleId === 'event-hub') {
		return `/events/${eventId}`;
	}
	return `/events/${eventId}/${moduleId}`;
}

export function catalogPath(): string {
	return '/catalog';
}

/** Catalog-scoped slice views (Attendees, Check-in) — not tied to legacy event hub URLs. */
export function sliceModulePath(moduleId: 'attendees' | 'check-in'): string {
	return `/events/${moduleId}`;
}

const SLICE_MODULE_PATHS: Record<string, string> = {
	'/events/attendees': 'attendees',
	'/events/check-in': 'check-in',
};

/** Derive the active logical route from URL params (URL is the source of truth). */
export function useActiveRoute(): ActiveRoute {
	const params = useParams();
	const location = useLocation();
	const eventId = params.eventId ?? null;
	const moduleId = params.module ?? null;

	if (location.pathname === '/catalog') {
		return { name: 'catalog', eventId: null };
	}

	const sliceRoute = SLICE_MODULE_PATHS[location.pathname];
	if (sliceRoute) {
		return { name: sliceRoute, eventId: null };
	}

	if (!eventId) {
		return { name: 'events', eventId: null };
	}
	if (moduleId && MODULE_ROUTE_IDS[moduleId]) {
		return { name: moduleId, eventId };
	}
	return { name: 'event-hub', eventId };
}

export function isEventScopedRoute(routeName: string): boolean {
	return routeName !== 'events';
}
