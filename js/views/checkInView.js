import { fetchAttendees, fetchEvent } from '../services/dataService.js';
import { filterAttendees, searchAttendees } from '../data/mockData.js';
import { showToast } from '../components/toast.js';
import { el, clearElement } from '../utils/dom.js';
import { buildEventEmptyState, buildTopBar } from '../utils/eventViewShell.js';

/** @type {HTMLElement | null} */
let root = null;

/** @type {string} */
let currentFilter = 'All';

/** @type {string} */
let searchQuery = '';

/** @type {Array<{ id: string; name: string; email: string; company: string; status: string }>} */
let attendees = [];

/**
 * @param {HTMLElement} container
 * @param {{ eventId: string | null }} options
 */
export function mountCheckInView(container, options) {
    root = container;
    currentFilter = 'Registered';
    searchQuery = '';
    clearElement(container);

    if (!options.eventId) {
        container.appendChild(
            buildEventEmptyState('view-check-in', 'Select an event from All Events to open check-in.', {
                label: 'Go to All Events',
                route: 'events',
            }),
        );
        return;
    }

    container.appendChild(el('div', { className: 'loading', text: 'Loading check-in…' }));
    loadCheckIn(container, options.eventId);
}

/**
 * @param {HTMLElement} container
 * @param {string} eventId
 */
async function loadCheckIn(container, eventId) {
    try {
        const [{ event }, { attendees: rows }] = await Promise.all([fetchEvent(eventId), fetchAttendees(eventId)]);
        if (!event) {
            container.replaceChildren(
                buildEventEmptyState('view-check-in', 'This event was not found.', {
                    label: 'Back to All Events',
                    route: 'events',
                }),
            );
            return;
        }
        attendees = rows;
        renderCheckIn(container, event);
    } catch (error) {
        container.replaceChildren(
            el('div', { className: 'empty-state', text: error instanceof Error ? error.message : 'Failed to load check-in' }),
        );
    }
}

/**
 * @param {HTMLElement} container
 * @param {{ id: string; name: string }} event
 */
function renderCheckIn(container, event) {
    const resultsBody = el('tbody');
    const searchInput = el('input', {
        type: 'search',
        className: 'search-input',
        placeholder: 'Search by name, email, or company…',
        'aria-label': 'Search attendees for check-in',
    });

    searchInput.addEventListener('input', () => {
        searchQuery = searchInput.value;
        renderCheckInRows(resultsBody);
    });

    renderCheckInRows(resultsBody);

    container.replaceChildren(
        el('section', { id: 'view-check-in' }, [
            buildTopBar(`${event.name} — Check-in`, 'On-site and virtual arrival desk (PoC shell)'),
            el('div', { className: 'grid-2' }, [
                el('div', { className: 'card' }, [
                    el('div', { className: 'card__header' }, [el('h3', { text: 'Find attendee' })]),
                    searchInput,
                    el('p', { className: 'shell-note', text: 'Showing Registered contacts ready for check-in.' }),
                    el('div', { className: 'table-scroll table-scroll--short' }, [
                        el('table', {}, [
                            el('thead', {}, [
                                el('tr', {}, [
                                    el('th', { text: 'Name' }),
                                    el('th', { text: 'Company' }),
                                    el('th', { text: 'Ticket' }),
                                    el('th', { text: '' }),
                                ]),
                            ]),
                            resultsBody,
                        ]),
                    ]),
                ]),
                el('div', { className: 'card card--accent' }, [
                    el('div', { className: 'card__header' }, [el('h3', { text: 'QR scan (coming soon)' })]),
                    el('div', { className: 'qr-placeholder' }, [
                        el('span', { className: 'qr-placeholder__icon', text: '▦' }),
                        el('p', { text: 'Camera / QR scanner connects in a later phase.' }),
                    ]),
                    el('button', {
                        className: 'btn btn-primary',
                        type: 'button',
                        text: 'Mark selected as checked in',
                        disabled: true,
                    }),
                    el('p', {
                        className: 'empty-state__hint',
                        text: 'Write-back to HubSpot attendee status is Phase 5+. Use row action below for PoC demo.',
                    }),
                ]),
            ]),
        ]),
    );
}

/**
 * @param {HTMLElement} tbody
 */
function renderCheckInRows(tbody) {
    tbody.replaceChildren();
    const pool = filterAttendees(currentFilter, attendees);
    const filtered = searchAttendees(searchQuery, pool);

    if (filtered.length === 0) {
        tbody.appendChild(el('tr', {}, [el('td', { colSpan: '4', text: 'No matching registrants.' })]));
        return;
    }

    filtered.slice(0, 8).forEach((person) => {
        tbody.appendChild(
            el('tr', {}, [
                el('td', { text: person.name }),
                el('td', { text: person.company }),
                el('td', { text: person.ticketType ?? 'General' }),
                el('td', {}, [
                    el('button', {
                        className: 'btn btn-outline btn-sm',
                        type: 'button',
                        text: 'Check in',
                        onclick: () => {
                            showToast(`${person.name} checked in (PoC — no HubSpot write yet).`, 'success');
                        },
                    }),
                ]),
            ]),
        );
    });
}

export function unmountCheckInView() {
    root = null;
    attendees = [];
}
