import { fetchEvent } from '../services/dataService.js';
import { showToast } from '../components/toast.js';
import { el, clearElement } from '../utils/dom.js';
import { buildEventEmptyState, buildTopBar } from '../utils/eventViewShell.js';

/** @type {HTMLElement | null} */
let root = null;

/**
 * @param {HTMLElement} container
 * @param {{ eventId: string | null }} options
 */
export function mountSettingsView(container, options) {
    root = container;
    clearElement(container);

    if (!options.eventId) {
        container.appendChild(
            buildEventEmptyState('view-settings', 'Select an event from All Events to view settings.', {
                label: 'Go to All Events',
                route: 'events',
            }),
        );
        return;
    }

    container.appendChild(el('div', { className: 'loading', text: 'Loading settings…' }));
    loadSettings(container, options.eventId);
}

/**
 * @param {HTMLElement} container
 * @param {string} eventId
 */
async function loadSettings(container, eventId) {
    try {
        const { event } = await fetchEvent(eventId);
        if (!event) {
            container.replaceChildren(
                buildEventEmptyState('view-settings', 'This event was not found.', {
                    label: 'Back to All Events',
                    route: 'events',
                }),
            );
            return;
        }
        renderSettings(container, event);
    } catch (error) {
        container.replaceChildren(
            el('div', { className: 'empty-state', text: error instanceof Error ? error.message : 'Failed to load settings' }),
        );
    }
}

/**
 * @param {HTMLElement} container
 * @param {NonNullable<Awaited<ReturnType<typeof fetchEvent>>['event']>} event
 */
function renderSettings(container, event) {
    const fields = [
        ['Event name', event.name],
        ['Status', event.status.charAt(0).toUpperCase() + event.status.slice(1)],
        ['Type', event.type],
        ['Start date', event.date],
        ['End date', event.endDate ?? event.date],
        ['Location', event.location],
        ['Capacity', String(event.capacity)],
        ['Registration closes', event.registrationClose],
        ['HubSpot record', event.hubspotId],
        ['Event owner', event.owner],
    ];

    const detailList = el('dl', { className: 'detail-list' });
    fields.forEach(([label, value]) => {
        detailList.appendChild(el('dt', { text: label }));
        detailList.appendChild(el('dd', { text: value }));
    });

    container.replaceChildren(
        el('section', { id: 'view-settings' }, [
            buildTopBar(`${event.name} — Settings`, 'Event configuration (read-only in PoC)'),
            el('div', { className: 'grid-2' }, [
                el('div', { className: 'card' }, [
                    el('div', { className: 'card__header' }, [el('h3', { text: 'Event details' })]),
                    detailList,
                    el('p', { className: 'shell-note', text: event.description }),
                    el('button', {
                        className: 'btn btn-outline',
                        type: 'button',
                        text: 'Edit in HubSpot',
                        onclick: () => showToast('Opens HubSpot record in a later phase.', 'success'),
                    }),
                ]),
                el('div', { className: 'card' }, [
                    el('div', { className: 'card__header' }, [el('h3', { text: 'Registration & access' })]),
                    el('ul', { className: 'stats-list' }, [
                        el('li', {}, [el('strong', { text: 'Public registration' }), el('span', { text: event.status === 'draft' ? 'Off (draft)' : 'On' })]),
                        el('li', {}, [el('strong', { text: 'Waitlist' }), el('span', { text: 'Disabled' })]),
                        el('li', {}, [el('strong', { text: 'Ticket types' }), el('span', { text: 'General, VIP, Partner' })]),
                    ]),
                    el('p', {
                        className: 'empty-state__hint',
                        text: 'Editing registration rules from EMS is Phase 5+. HubSpot remains source of truth.',
                    }),
                    el('div', { className: 'form-row' }, [
                        el('button', {
                            className: 'btn btn-outline btn-sm',
                            type: 'button',
                            text: 'Copy registration link',
                            disabled: event.status === 'draft',
                            onclick: () => showToast('Registration URL copied (mock).', 'success'),
                        }),
                        el('button', {
                            className: 'btn btn-outline btn-sm',
                            type: 'button',
                            text: 'Manage team',
                            onclick: () => showToast('Team management connects in a later phase.', 'success'),
                        }),
                    ]),
                ]),
            ]),
            el('div', { className: 'card' }, [
                el('div', { className: 'card__header' }, [el('h3', { text: 'Danger zone' })]),
                el('p', { text: 'Cancel event or archive HubSpot association — disabled in PoC.' }),
                el('button', {
                    className: 'btn btn-outline',
                    type: 'button',
                    text: 'Cancel event',
                    disabled: event.status === 'cancelled' || event.status === 'completed',
                    onclick: () => showToast('Cancellation workflow is Phase 5+.', 'error'),
                }),
            ]),
        ]),
    );
}

export function unmountSettingsView() {
    root = null;
}
