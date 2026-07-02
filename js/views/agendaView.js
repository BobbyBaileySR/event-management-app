import { fetchAgenda, fetchEvent } from '../services/dataService.js';
import { el, clearElement } from '../utils/dom.js';
import { buildEventEmptyState, buildTopBar } from '../utils/eventViewShell.js';

/** @type {HTMLElement | null} */
let root = null;

/**
 * @param {HTMLElement} container
 * @param {{ eventId: string | null }} options
 */
export function mountAgendaView(container, options) {
    root = container;
    clearElement(container);

    if (!options.eventId) {
        container.appendChild(
            buildEventEmptyState('view-agenda', 'Select an event from All Events to view the agenda.', {
                label: 'Go to All Events',
                route: 'events',
            }),
        );
        return;
    }

    container.appendChild(el('div', { className: 'loading', text: 'Loading agenda…' }));
    loadAgenda(container, options.eventId);
}

/**
 * @param {HTMLElement} container
 * @param {string} eventId
 */
async function loadAgenda(container, eventId) {
    try {
        const [{ event }, { sessions }] = await Promise.all([fetchEvent(eventId), fetchAgenda(eventId)]);
        if (!event) {
            container.replaceChildren(
                buildEventEmptyState('view-agenda', 'This event was not found.', {
                    label: 'Back to All Events',
                    route: 'events',
                }),
            );
            return;
        }
        renderAgenda(container, event, sessions);
    } catch (error) {
        container.replaceChildren(
            el('div', { className: 'empty-state', text: error instanceof Error ? error.message : 'Failed to load agenda' }),
        );
    }
}

/**
 * @param {HTMLElement} container
 * @param {{ name: string }} event
 * @param {Array<{ time: string; title: string; speaker: string; location: string; track: string }>} sessions
 */
function renderAgenda(container, event, sessions) {
    const tbody = el('tbody');
    if (sessions.length === 0) {
        tbody.appendChild(
            el('tr', {}, [
                el('td', { colSpan: '5', text: 'No sessions published yet. Agenda syncs from HubSpot in a later phase.' }),
            ]),
        );
    } else {
        sessions.forEach((session) => {
            tbody.appendChild(
                el('tr', {}, [
                    el('td', { text: session.time }),
                    el('td', {}, [el('strong', { text: session.title })]),
                    el('td', { text: session.speaker }),
                    el('td', { text: session.location }),
                    el('td', {}, [el('span', { className: 'badge badge--draft', text: session.track })]),
                ]),
            );
        });
    }

    container.replaceChildren(
        el('section', { id: 'view-agenda' }, [
            buildTopBar(`${event.name} — Agenda`, 'Session schedule for staff and on-site teams'),
            el('div', { className: 'card' }, [
                el('div', { className: 'card__header' }, [
                    el('h3', { text: 'Session schedule' }),
                    el('button', {
                        className: 'btn btn-outline btn-sm',
                        type: 'button',
                        text: 'Export PDF',
                        disabled: sessions.length === 0,
                    }),
                ]),
                el('div', { className: 'table-scroll' }, [
                    el('table', {}, [
                        el('thead', {}, [
                            el('tr', {}, [
                                el('th', { text: 'Time' }),
                                el('th', { text: 'Session' }),
                                el('th', { text: 'Speaker' }),
                                el('th', { text: 'Room' }),
                                el('th', { text: 'Track' }),
                            ]),
                        ]),
                        tbody,
                    ]),
                ]),
                el('p', {
                    className: 'empty-state__hint',
                    text: 'Agenda editing and speaker assignments connect to HubSpot custom properties in a later phase.',
                }),
            ]),
        ]),
    );
}

export function unmountAgendaView() {
    root = null;
}
