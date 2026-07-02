import { CONFIG } from '../config.js';
import { confirmModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { countSegment, filterAttendees } from '../data/mockData.js';
import {
    sendEmail,
    fetchAttendees,
    fetchEvent,
    fetchScheduledEmails,
    fetchTemplates,
    previewEmail,
} from '../services/dataService.js';
import { navigate } from '../router.js';
import { el, clearElement, formatDateTime } from '../utils/dom.js';
import { buildEventEmptyState, buildTopBar } from '../utils/eventViewShell.js';

/** @type {HTMLElement | null} */
let root = null;

/** @type {Array<{ id: string; name: string; company: string; status: string }>} */
let attendees = [];

/** @type {Array<{ id: string; name: string; description: string }>} */
let templates = [];

/**
 * @param {HTMLElement} container
 * @param {{ eventId: string | null }} options
 */
export function mountEmailView(container, options) {
    root = container;
    clearElement(container);

    if (!options.eventId) {
        container.appendChild(
            buildEventEmptyState('view-email', 'Select an event from All Events to send email.', {
                label: 'Go to All Events',
                route: 'events',
            }),
        );
        return;
    }

    container.appendChild(el('div', { className: 'loading', text: 'Loading email module…' }));
    loadEmailData(container, options.eventId);
}

/**
 * @param {HTMLElement} container
 * @param {string} eventId
 */
async function loadEmailData(container, eventId) {
    try {
        const [{ event }, { attendees: attendeeRows }, { templates: templateRows }, { scheduled }] = await Promise.all([
            fetchEvent(eventId),
            fetchAttendees(eventId),
            fetchTemplates(eventId),
            fetchScheduledEmails(eventId),
        ]);

        if (!event) {
            container.replaceChildren(
                buildEventEmptyState('view-email', 'This event was not found.', {
                    label: 'Back to All Events',
                    route: 'events',
                }),
            );
            return;
        }

        attendees = attendeeRows;
        templates = templateRows;
        renderEmail(container, event, scheduled);
    } catch (error) {
        container.replaceChildren(
            el('div', { className: 'empty-state', text: error instanceof Error ? error.message : 'Failed to load email module' }),
        );
    }
}

/**
 * @param {HTMLElement} container
 * @param {{ id: string; name: string }} event
 * @param {Array<{ templateName: string; segment: string; scheduledAt: string; recipientCount: number; status: string }>} scheduled
 */
function renderEmail(container, event, scheduled) {
    const templateSelect = el('select', { id: 'template-select' });
    templates.forEach((template) => {
        templateSelect.appendChild(
            el('option', { value: template.id, text: `${template.name} — ${template.category}` }),
        );
    });

    const segmentSelect = el('select', { id: 'audience-select' });
    ['All', 'Registered', 'Checked In'].forEach((segment) => {
        segmentSelect.appendChild(
            el('option', {
                value: segment,
                text: `${segment === 'All' ? 'All contacts' : segment} (${countSegment(segment, attendees)})`,
            }),
        );
    });

    const scheduleInput = el('input', { type: 'datetime-local', id: 'schedule-input' });
    const sendModeSelect = el('select', { id: 'send-mode-select' }, [
        el('option', { value: 'now', text: 'Send immediately' }),
        el('option', { value: 'later', text: 'Schedule for later' }),
    ]);

    sendModeSelect.addEventListener('change', () => {
        scheduleInput.disabled = sendModeSelect.value !== 'later';
        scheduleInput.classList.toggle('hidden', sendModeSelect.value !== 'later');
    });
    scheduleInput.disabled = true;
    scheduleInput.classList.add('hidden');

    const scheduledBody = el('tbody');
    if (scheduled.length === 0) {
        scheduledBody.appendChild(el('tr', {}, [el('td', { colSpan: '4', text: 'No scheduled sends for this event.' })]));
    } else {
        scheduled.forEach((row) => {
            scheduledBody.appendChild(
                el('tr', {}, [
                    el('td', { text: row.templateName }),
                    el('td', { text: row.segment }),
                    el('td', { text: formatDateTime(row.scheduledAt) }),
                    el('td', { text: `${row.recipientCount} · ${row.status}` }),
                ]),
            );
        });
    }

    container.replaceChildren(
        el('section', { id: 'view-email' }, [
            buildTopBar(`${event.name} — Email`, 'HubSpot marketing templates · PoC send flow (no live dispatch yet)'),
            el('div', { className: 'grid-2' }, [
                el('div', { className: 'card' }, [
                    el('div', { className: 'card__header' }, [el('h3', { text: 'Audience overview' })]),
                    el('ul', { className: 'stats-list' }, [
                        el('li', {}, [el('strong', { text: 'All contacts' }), el('span', { text: String(countSegment('All', attendees)) })]),
                        el('li', {}, [el('strong', { text: 'Registered' }), el('span', { text: String(countSegment('Registered', attendees)) })]),
                        el('li', {}, [el('strong', { text: 'Checked in' }), el('span', { text: String(countSegment('Checked In', attendees)) })]),
                    ]),
                    el('button', {
                        className: 'btn btn-link',
                        type: 'button',
                        text: 'Open Attendees →',
                        onclick: () => navigate('attendees', event.id),
                    }),
                ]),
                el('div', { className: 'card card--accent' }, [
                    el('div', { className: 'card__header' }, [el('h3', { text: 'Compose send' })]),
                    el('div', { className: 'form-group' }, [
                        el('label', { for: 'template-select', text: 'Template' }),
                        templateSelect,
                        el('button', {
                            className: 'btn btn-link',
                            type: 'button',
                            text: 'Preview template',
                            onclick: () => showToast('Template preview opens HubSpot content in a later phase.', 'success'),
                        }),
                    ]),
                    el('div', { className: 'form-group' }, [
                        el('label', { for: 'audience-select', text: 'Segment' }),
                        segmentSelect,
                    ]),
                    el('div', { className: 'form-group' }, [
                        el('label', { for: 'send-mode-select', text: 'Timing' }),
                        sendModeSelect,
                    ]),
                    el('div', { className: 'form-group' }, [
                        el('label', { for: 'schedule-input', text: 'Schedule (UTC)' }),
                        scheduleInput,
                    ]),
                    el('div', { className: 'email-panel' }, [
                        el('button', {
                            className: 'btn btn-primary',
                            type: 'button',
                            text: 'Send email',
                            onclick: () => handleSend(event.id, templateSelect, segmentSelect, sendModeSelect, scheduleInput),
                        }),
                    ]),
                ]),
            ]),
            el('div', { className: 'card' }, [
                el('div', { className: 'card__header' }, [el('h3', { text: 'Scheduled sends' })]),
                el('table', {}, [
                    el('thead', {}, [
                        el('tr', {}, [
                            el('th', { text: 'Template' }),
                            el('th', { text: 'Segment' }),
                            el('th', { text: 'When' }),
                            el('th', { text: 'Audience' }),
                        ]),
                    ]),
                    scheduledBody,
                ]),
            ]),
        ]),
    );
}

/**
 * @param {string} eventId
 * @param {HTMLSelectElement} templateSelect
 * @param {HTMLSelectElement} segmentSelect
 * @param {HTMLSelectElement} sendModeSelect
 * @param {HTMLInputElement} scheduleInput
 */
async function handleSend(eventId, templateSelect, segmentSelect, sendModeSelect, scheduleInput) {
    const segment = segmentSelect.value;
    const segmentAttendees = filterAttendees(segment, attendees);
    const contactIds = segmentAttendees.map((person) => person.id);

    if (contactIds.length === 0) {
        showToast('No recipients in the selected segment.', 'error');
        return;
    }

    const scheduledAt =
        sendModeSelect.value === 'later' && scheduleInput.value
            ? new Date(scheduleInput.value).toISOString()
            : undefined;

    if (sendModeSelect.value === 'later' && !scheduledAt) {
        showToast('Choose a schedule date and time.', 'error');
        return;
    }

    const payload = {
        eventId,
        templateId: templateSelect.value,
        contactIds,
        scheduledAt,
        idempotencyKey: crypto.randomUUID(),
    };

    try {
        const preview = await previewEmail(payload);

        if (preview.recipientCount >= CONFIG.EMAIL_SEND_CONFIRM_THRESHOLD) {
            const confirmed = await confirmModal({
                title: 'Confirm large send',
                message: `You are about to ${scheduledAt ? 'schedule' : 'send'} "${templateSelect.options[templateSelect.selectedIndex].text}" to ${preview.recipientCount} recipients. Proceed?`,
                confirmLabel: scheduledAt ? 'Schedule send' : 'Send now',
            });
            if (!confirmed) {
                return;
            }
        }

        const result = await sendEmail(payload);
        const verb = result.status === 'scheduled' ? 'scheduled' : 'queued';
        showToast(`Success: ${result.recipientCount} emails ${verb} (PoC — no live HubSpot send).`);
    } catch (error) {
        showToast(error instanceof Error ? error.message : 'Send failed', 'error');
    }
}

export function unmountEmailView() {
    root = null;
    attendees = [];
    templates = [];
}
