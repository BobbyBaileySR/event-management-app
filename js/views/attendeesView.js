import { fetchAttendees, fetchEvent } from '../services/dataService.js';
import { filterAttendees, searchAttendees } from '../data/mockData.js';
import { navigate } from '../router.js';
import { showToast } from '../components/toast.js';
import { el, clearElement, statusBadgeClass } from '../utils/dom.js';
import { buildEventEmptyState, buildTopBar } from '../utils/eventViewShell.js';

/** @type {HTMLElement | null} */
let root = null;

/** @type {string} */
let currentFilter = 'All';

/** @type {string} */
let searchQuery = '';

/** @type {string | null} */
let selectedAttendeeId = null;

/** @type {string | null} */
let currentEventId = null;

/** @type {Array<{ id: string; name: string; email: string; company: string; status: string; ticketType?: string; registeredAt?: string; source?: string }>} */
let attendees = [];

/**
 * @param {HTMLElement} container
 * @param {{ eventId: string | null }} options
 */
export function mountAttendeesView(container, options) {
    root = container;
    currentFilter = 'All';
    searchQuery = '';
    selectedAttendeeId = null;
    clearElement(container);

    if (!options.eventId) {
        container.appendChild(
            buildEventEmptyState('view-attendees', 'Select an event from All Events to view attendees.', {
                label: 'Go to All Events',
                route: 'events',
            }),
        );
        return;
    }

    container.appendChild(el('div', { className: 'loading', text: 'Loading attendees…' }));
    loadAttendees(container, options.eventId);
}

/**
 * @param {HTMLElement} container
 * @param {string} eventId
 */
async function loadAttendees(container, eventId) {
    try {
        const [{ event }, { attendees: attendeeRows }] = await Promise.all([
            fetchEvent(eventId),
            fetchAttendees(eventId),
        ]);

        if (!event) {
            container.replaceChildren(
                buildEventEmptyState('view-attendees', 'This event was not found.', {
                    label: 'Back to All Events',
                    route: 'events',
                }),
            );
            return;
        }

        attendees = attendeeRows;
        currentEventId = event.id;
        renderAttendees(container, event);
    } catch (error) {
        container.replaceChildren(
            el('div', { className: 'empty-state', text: error instanceof Error ? error.message : 'Failed to load attendees' }),
        );
    }
}

/**
 * @param {HTMLElement} container
 * @param {{ id: string; name: string }} event
 */
function renderAttendees(container, event) {
    const attendeeTableBody = el('tbody');
    const detailHost = el('div', { className: 'attendee-detail card hidden', id: 'attendee-detail-panel' });

    const searchInput = el('input', {
        type: 'search',
        className: 'search-input',
        placeholder: 'Search name, email, or company…',
        'aria-label': 'Search attendees',
    });
    searchInput.addEventListener('input', () => {
        searchQuery = searchInput.value;
        renderAttendeeRows(attendeeTableBody, detailHost);
    });

    const filterButtons = el('div', { className: 'form-row' });
    ['All', 'Registered', 'Checked In', 'Cancelled'].forEach((filter) => {
        filterButtons.appendChild(
            el('button', {
                className: `btn btn-outline${filter === currentFilter ? ' active' : ''}`,
                type: 'button',
                text: filter,
                onclick: (clickEvent) => {
                    currentFilter = filter;
                    filterButtons.querySelectorAll('.btn').forEach((btn) => btn.classList.remove('active'));
                    clickEvent.currentTarget.classList.add('active');
                    renderAttendeeRows(attendeeTableBody, detailHost);
                },
            }),
        );
    });

    renderAttendeeRows(attendeeTableBody, detailHost);

    container.replaceChildren(
        el('section', { id: 'view-attendees' }, [
            buildTopBar(`${event.name} — Attendees`, `${attendees.length} contacts linked · sample HubSpot data`),
            el('div', { className: 'card' }, [
                el('div', { className: 'toolbar' }, [
                    filterButtons,
                    el('button', {
                        className: 'btn btn-outline btn-sm',
                        type: 'button',
                        text: 'Export CSV',
                        onclick: () => showToast('Export downloads in a later phase (PoC mock).', 'success'),
                    }),
                ]),
                searchInput,
                el('div', { className: 'table-scroll' }, [
                    el('table', {}, [
                        el('thead', {}, [
                            el('tr', {}, [
                                el('th', { text: 'Name' }),
                                el('th', { text: 'Email' }),
                                el('th', { text: 'Company' }),
                                el('th', { text: 'Ticket' }),
                                el('th', { text: 'Status' }),
                            ]),
                        ]),
                        attendeeTableBody,
                    ]),
                ]),
            ]),
            detailHost,
        ]),
    );
}

/**
 * @param {HTMLElement} tbody
 * @param {HTMLElement} detailHost
 */
function renderAttendeeRows(tbody, detailHost) {
    tbody.replaceChildren();
    const filtered = searchAttendees(searchQuery, filterAttendees(currentFilter, attendees));

    if (filtered.length === 0) {
        tbody.appendChild(el('tr', {}, [el('td', { colSpan: '5', text: 'No attendees match this filter.' })]));
        detailHost.classList.add('hidden');
        return;
    }

    filtered.forEach((person) => {
        const tr = el('tr', { className: selectedAttendeeId === person.id ? 'row-selected' : '' });
        tr.addEventListener('click', () => {
            selectedAttendeeId = person.id;
            renderAttendeeDetail(detailHost, person);
            renderAttendeeRows(tbody, detailHost);
        });
        tr.appendChild(el('td', { text: person.name }));
        tr.appendChild(el('td', { text: person.email }));
        tr.appendChild(el('td', { text: person.company }));
        tr.appendChild(el('td', { text: person.ticketType ?? 'General' }));
        tr.appendChild(
            el('td', {}, [
                el('span', {
                    className: `badge ${statusBadgeClass(person.status)}`,
                    text: person.status,
                }),
            ]),
        );
        tbody.appendChild(tr);
    });
}

/**
 * @param {HTMLElement} detailHost
 * @param {{ name: string; email: string; company: string; status: string; ticketType?: string; registeredAt?: string; source?: string }} person
 */
function renderAttendeeDetail(detailHost, person) {
    detailHost.classList.remove('hidden');
    detailHost.replaceChildren(
        el('h3', { text: person.name }),
        el('dl', { className: 'detail-list detail-list--inline' }, [
            el('dt', { text: 'Email' }),
            el('dd', { text: person.email }),
            el('dt', { text: 'Company' }),
            el('dd', { text: person.company }),
            el('dt', { text: 'Status' }),
            el('dd', { text: person.status }),
            el('dt', { text: 'Ticket' }),
            el('dd', { text: person.ticketType ?? 'General' }),
            el('dt', { text: 'Registered' }),
            el('dd', { text: person.registeredAt ?? '—' }),
            el('dt', { text: 'Source' }),
            el('dd', { text: person.source ?? '—' }),
        ]),
        el('div', { className: 'form-row' }, [
            el('button', {
                className: 'btn btn-outline btn-sm',
                type: 'button',
                text: 'Update status',
                onclick: () => showToast('Status updates write to HubSpot in Phase 5+.', 'success'),
            }),
            el('button', {
                className: 'btn btn-outline btn-sm',
                type: 'button',
                text: 'Send email',
                onclick: () => navigate('email', currentEventId),
            }),
        ]),
    );
}

export function unmountAttendeesView() {
    root = null;
    attendees = [];
    selectedAttendeeId = null;
    currentEventId = null;
}
