import { fetchActivity, fetchAnalytics, fetchEvent } from '../services/dataService.js';
import { HUB_MODULE_CARDS } from '../config/eventModules.js';
import { navigate } from '../router.js';
import { el, clearElement, formatDateTime, statusBadgeClass } from '../utils/dom.js';
import { buildCapacityBar, buildEventEmptyState, buildTopBar } from '../utils/eventViewShell.js';

/** @type {HTMLElement | null} */
let root = null;

/**
 * @param {HTMLElement} container
 * @param {{ eventId: string | null }} options
 */
export function mountEventHubView(container, options) {
    root = container;
    clearElement(container);

    if (!options.eventId) {
        container.appendChild(
            buildEventEmptyState('view-event-hub', 'Select an event from All Events to open the Event Hub.', {
                label: 'Go to All Events',
                route: 'events',
            }),
        );
        return;
    }

    container.appendChild(el('div', { className: 'loading', text: 'Loading event…' }));
    loadEventHub(container, options.eventId);
}

/**
 * @param {HTMLElement} container
 * @param {string} eventId
 */
async function loadEventHub(container, eventId) {
    try {
        const [{ event }, { conversion }, { activity }] = await Promise.all([
            fetchEvent(eventId),
            fetchAnalytics(eventId),
            fetchActivity(eventId),
        ]);

        if (!event) {
            container.replaceChildren(
                buildEventEmptyState('view-event-hub', `Event "${eventId}" was not found.`, {
                    label: 'Back to All Events',
                    route: 'events',
                }),
            );
            return;
        }

        renderEventHub(container, event, conversion, activity);
    } catch (error) {
        container.replaceChildren(
            el('div', { className: 'empty-state', text: error instanceof Error ? error.message : 'Failed to load event' }),
        );
    }
}

/**
 * @param {HTMLElement} container
 * @param {NonNullable<Awaited<ReturnType<typeof fetchEvent>>['event']>} event
 * @param {{ checkedIn: number; registered: number; cancelled: number }} conversion
 * @param {Array<{ timestamp: string; summary: string; actor: string }>} activity
 */
function renderEventHub(container, event, conversion, activity) {
    const totalAttendees = conversion.checkedIn + conversion.registered + conversion.cancelled;

    const moduleCards = HUB_MODULE_CARDS.map((module) =>
        el('button', {
            className: 'hub-module card',
            type: 'button',
            onclick: () => navigate(module.id, event.id),
        }, [
            el('span', { className: 'hub-module__icon', text: module.icon }),
            el('h3', { text: module.label }),
            el('p', { text: module.description ?? '' }),
        ]),
    );

    const activityList = el('ul', { className: 'activity-list' });
    if (activity.length === 0) {
        activityList.appendChild(el('li', { text: 'No recent activity.' }));
    } else {
        activity.forEach((item) => {
            activityList.appendChild(
                el('li', {}, [
                    el('strong', { text: item.summary }),
                    el('div', {
                        className: 'activity-list__meta',
                        text: `${item.actor} · ${formatDateTime(item.timestamp)}`,
                    }),
                ]),
            );
        });
    }

    const statusBadge = el('span', {
        className: `badge ${statusBadgeClass(event.status)}`,
        text: event.status.charAt(0).toUpperCase() + event.status.slice(1),
    });

    container.replaceChildren(
        el('section', { id: 'view-event-hub' }, [
            buildTopBar(event.name, [event.type, event.date, event.location].join(' · '), statusBadge),
            el('div', { className: 'card' }, [
                buildCapacityBar(totalAttendees, event.capacity),
                el('p', { className: 'shell-note', text: event.description }),
            ]),
            el('div', { className: 'hub-stats grid-3' }, [
                el('div', { className: 'card hub-stat' }, [
                    el('p', { className: 'hub-stat__label', text: 'Total linked' }),
                    el('p', { className: 'hub-stat__value', text: String(totalAttendees) }),
                ]),
                el('div', { className: 'card hub-stat' }, [
                    el('p', { className: 'hub-stat__label', text: 'Registered' }),
                    el('p', { className: 'hub-stat__value', text: String(conversion.registered) }),
                ]),
                el('div', { className: 'card hub-stat' }, [
                    el('p', { className: 'hub-stat__label', text: 'Checked in' }),
                    el('p', { className: 'hub-stat__value', text: String(conversion.checkedIn) }),
                ]),
            ]),
            el('div', { className: 'form-row' }, [
                el('button', {
                    className: 'btn btn-primary btn-sm',
                    type: 'button',
                    text: 'Send reminder',
                    onclick: () => navigate('email', event.id),
                }),
                el('button', {
                    className: 'btn btn-outline btn-sm',
                    type: 'button',
                    text: 'Open check-in',
                    onclick: () => navigate('check-in', event.id),
                }),
                el('button', {
                    className: 'btn btn-outline btn-sm',
                    type: 'button',
                    text: 'View agenda',
                    onclick: () => navigate('agenda', event.id),
                }),
            ]),
            el('div', { className: 'grid-2' }, [
                el('div', { className: 'hub-modules' }, [
                    el('h2', { className: 'hub-modules__title', text: 'Event modules' }),
                    el('div', { className: 'hub-modules__grid hub-modules__grid--2' }, moduleCards),
                ]),
                el('div', { className: 'card' }, [
                    el('div', { className: 'card__header' }, [el('h3', { text: 'Recent activity' })]),
                    activityList,
                ]),
            ]),
        ]),
    );
}

export function unmountEventHubView() {
    root = null;
}
