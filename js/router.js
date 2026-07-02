import { getState, setSelectedEventId } from './state/appState.js';
import { MODULE_ROUTE_IDS } from './config/eventModules.js';

/** @typedef {{ name: string; eventId: string | null }} ParsedRoute */

/**
 * @param {string} [hash]
 * @returns {ParsedRoute}
 */
export function parseRoute(hash = window.location.hash) {
    const cleaned = hash.replace(/^#\/?/, '').replace(/\/$/, '');
    if (!cleaned || cleaned === 'events') {
        return { name: 'events', eventId: null };
    }

    const parts = cleaned.split('/').filter(Boolean);

    if (parts[0] !== 'events') {
        return { name: 'events', eventId: null };
    }

    if (parts.length === 1) {
        return { name: 'events', eventId: null };
    }

    const eventId = parts[1] ?? getState().selectedEventId;
    if (!eventId) {
        return { name: 'events', eventId: null };
    }

    if (parts.length === 2) {
        return { name: 'event-hub', eventId };
    }

    const moduleRoute = MODULE_ROUTE_IDS[parts[2]];
    if (moduleRoute) {
        return { name: moduleRoute, eventId };
    }

    return { name: 'event-hub', eventId };
}

/**
 * @param {string} routeName
 * @param {string | null} [eventId]
 */
export function navigate(routeName, eventId = null) {
    if (routeName === 'events') {
        window.location.hash = '#/events';
        return;
    }

    const resolvedEventId = eventId ?? getState().selectedEventId;
    if (!resolvedEventId) {
        window.location.hash = '#/events';
        return;
    }

    setSelectedEventId(resolvedEventId);

    if (routeName === 'event-hub') {
        window.location.hash = `#/events/${resolvedEventId}`;
        return;
    }

    if (MODULE_ROUTE_IDS[routeName]) {
        window.location.hash = `#/events/${resolvedEventId}/${routeName}`;
        return;
    }

    window.location.hash = `#/events/${resolvedEventId}`;
}

/**
 * @param {(route: ParsedRoute) => void} handler
 */
export function onRouteChange(handler) {
    const listener = () => handler(parseRoute());
    window.addEventListener('hashchange', listener);
    return () => window.removeEventListener('hashchange', listener);
}

/**
 * @returns {ParsedRoute}
 */
export function getCurrentRoute() {
    return parseRoute();
}

/**
 * @param {string} routeName
 * @returns {boolean}
 */
export function isEventScopedRoute(routeName) {
    return routeName !== 'events';
}
