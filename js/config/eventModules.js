/**
 * Single source of truth for event-scoped module navigation (sidebar + Event Hub cards).
 */

/** @typedef {{ id: string; label: string; icon: string; description?: string; hubModule?: boolean }} EventModule */

/** @type {EventModule[]} */
export const EVENT_MODULES = [
    { id: 'event-hub', label: 'Event Hub', icon: '📋' },
    {
        id: 'attendees',
        label: 'Attendees',
        icon: '👥',
        description: 'List, search, segments, export',
        hubModule: true,
    },
    {
        id: 'check-in',
        label: 'Check-in',
        icon: '✓',
        description: 'On-site arrival desk and QR scan',
        hubModule: true,
    },
    {
        id: 'email',
        label: 'Email',
        icon: '✉️',
        description: 'Templates, sends, and scheduling',
        hubModule: true,
    },
    {
        id: 'analytics',
        label: 'Analytics',
        icon: '📊',
        description: 'Funnel, campaigns, and trends',
        hubModule: true,
    },
    {
        id: 'agenda',
        label: 'Agenda',
        icon: '🗓️',
        description: 'Sessions, speakers, and rooms',
        hubModule: true,
    },
    {
        id: 'settings',
        label: 'Settings',
        icon: '⚙️',
        description: 'Event details and registration',
        hubModule: true,
    },
];

/** Sidebar shows every event module. */
export const SIDEBAR_EVENT_MODULES = EVENT_MODULES;

/** Event Hub shortcut cards — excludes Event Hub itself. */
export const HUB_MODULE_CARDS = EVENT_MODULES.filter((module) => module.hubModule);

/** @type {Record<string, string>} */
export const MODULE_ROUTE_IDS = Object.fromEntries(
    EVENT_MODULES.filter((module) => module.id !== 'event-hub').map((module) => [module.id, module.id]),
);
