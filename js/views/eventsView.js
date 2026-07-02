import { fetchEvents } from '../services/dataService.js';
import { filterEventsByStatus, getPortfolioStats, searchEvents } from '../data/mockData.js';
import { setSelectedEventId } from '../state/appState.js';
import { navigate } from '../router.js';
import { el, clearElement, statusBadgeClass } from '../utils/dom.js';
import { buildTopBar } from '../utils/eventViewShell.js';

/** @type {HTMLElement | null} */
let root = null;

/** @type {'all' | 'active' | 'draft' | 'completed' | 'cancelled'} */
let statusFilter = 'all';

/** @type {string} */
let searchQuery = '';

/** @type {Array<{ id: string; name: string; date: string; location: string; status: string; attendeeCount: number; capacity: number; type: string }>} */
let allEvents = [];

/**
 * @param {HTMLElement} container
 * @param {{ onOpenEvent: (eventId: string) => void }} options
 */
export function mountEventsView(container, options) {
    root = container;
    statusFilter = 'all';
    searchQuery = '';
    clearElement(container);
    container.appendChild(el('div', { className: 'loading', text: 'Loading events…' }));
    loadEvents(options);
}

async function loadEvents(options) {
    if (!root) {
        return;
    }

    try {
        const { events } = await fetchEvents();
        allEvents = events;
        renderEvents(root, options);
    } catch (error) {
        root.replaceChildren(
            el('div', { className: 'empty-state', text: error instanceof Error ? error.message : 'Failed to load events' }),
        );
    }
}

/**
 * @param {HTMLElement} container
 * @param {{ onOpenEvent: (eventId: string) => void }} options
 */
function renderEvents(container, options) {
    const filtered = searchEvents(searchQuery, filterEventsByStatus(statusFilter, allEvents));
    const stats = getPortfolioStats(allEvents);

    const filterRow = el('div', { className: 'filter-row' });
    [
        { id: 'all', label: 'All' },
        { id: 'active', label: 'Active' },
        { id: 'draft', label: 'Draft' },
        { id: 'completed', label: 'Past' },
        { id: 'cancelled', label: 'Cancelled' },
    ].forEach(({ id, label }) => {
        filterRow.appendChild(
            el('button', {
                className: `btn btn-outline btn-sm${statusFilter === id ? ' active' : ''}`,
                type: 'button',
                text: label,
                onclick: () => {
                    statusFilter = /** @type {typeof statusFilter} */ (id);
                    renderEvents(container, options);
                },
            }),
        );
    });

    const searchInput = el('input', {
        type: 'search',
        className: 'search-input',
        placeholder: 'Search events…',
        value: searchQuery,
        'aria-label': 'Search events',
    });
    searchInput.addEventListener('input', () => {
        searchQuery = searchInput.value;
        renderEvents(container, options);
    });

    const tbody = el('tbody');
    if (filtered.length === 0) {
        tbody.appendChild(el('tr', {}, [el('td', { colSpan: '6', text: 'No events match your filters.' })]));
    } else {
        filtered.forEach((event) => {
            tbody.appendChild(
                el('tr', {}, [
                    el('td', {}, [el('strong', { text: event.name })]),
                    el('td', { text: event.date }),
                    el('td', { text: event.location }),
                    el('td', { text: `${event.attendeeCount} / ${event.capacity}` }),
                    el('td', {}, [
                        el('span', {
                            className: `badge ${statusBadgeClass(event.status)}`,
                            text: event.status.charAt(0).toUpperCase() + event.status.slice(1),
                        }),
                    ]),
                    el('td', {}, [
                        el('button', {
                            className: 'btn btn-outline btn-sm',
                            type: 'button',
                            text: 'Open',
                            onclick: () => {
                                setSelectedEventId(event.id);
                                options.onOpenEvent(event.id);
                            },
                        }),
                    ]),
                ]),
            );
        });
    }

    container.replaceChildren(
        el('section', { id: 'view-events' }, [
            buildTopBar('All Events', 'Portfolio overview — sample HubSpot events (PoC mock data)'),
            el('div', { className: 'hub-stats grid-3' }, [
                el('div', { className: 'card hub-stat' }, [
                    el('p', { className: 'hub-stat__label', text: 'Total events' }),
                    el('p', { className: 'hub-stat__value', text: String(stats.total) }),
                ]),
                el('div', { className: 'card hub-stat' }, [
                    el('p', { className: 'hub-stat__label', text: 'Active' }),
                    el('p', { className: 'hub-stat__value', text: String(stats.active) }),
                ]),
                el('div', { className: 'card hub-stat' }, [
                    el('p', { className: 'hub-stat__label', text: 'Total registrations' }),
                    el('p', { className: 'hub-stat__value', text: String(stats.registrations) }),
                ]),
            ]),
            el('div', { className: 'card' }, [
                el('div', { className: 'toolbar' }, [filterRow, searchInput]),
                el('table', {}, [
                    el('thead', {}, [
                        el('tr', {}, [
                            el('th', { text: 'Event' }),
                            el('th', { text: 'Date' }),
                            el('th', { text: 'Location' }),
                            el('th', { text: 'Registrations' }),
                            el('th', { text: 'Status' }),
                            el('th', { text: '' }),
                        ]),
                    ]),
                    tbody,
                ]),
            ]),
        ]),
    );
}

export function unmountEventsView() {
    root = null;
    allEvents = [];
}
