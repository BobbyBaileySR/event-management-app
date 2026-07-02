/**
 * Map ScriptRunner API contract shapes to UI display shapes used by views.
 * Mock data already uses the UI shape; live responses are normalized here.
 */

/** @type {Record<string, string>} */
const ATTENDEE_STATUS_FROM_API = {
    registered: 'Registered',
    checked_in: 'Checked In',
    cancelled: 'Cancelled',
};

/**
 * @param {string | undefined} iso
 */
function formatEventDate(iso) {
    if (!iso) {
        return '';
    }
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(iso));
}

/**
 * @param {string | undefined} iso
 */
function toDateIso(iso) {
    if (!iso) {
        return '';
    }
    return iso.split('T')[0];
}

/**
 * @param {Record<string, unknown> | null | undefined} raw
 */
export function normalizeEvent(raw) {
    if (!raw || typeof raw !== 'object') {
        return null;
    }

    if (raw.date && !raw.startDate) {
        return raw;
    }

    const startDate = typeof raw.startDate === 'string' ? raw.startDate : '';
    const endDateIso = typeof raw.endDate === 'string' ? raw.endDate : undefined;

    return {
        id: String(raw.id ?? ''),
        name: String(raw.name ?? ''),
        date: typeof raw.date === 'string' ? raw.date : formatEventDate(startDate),
        dateIso: typeof raw.dateIso === 'string' ? raw.dateIso : toDateIso(startDate),
        endDate: typeof raw.endDate === 'string' && !endDateIso?.includes('T')
            ? raw.endDate
            : endDateIso
              ? formatEventDate(endDateIso)
              : undefined,
        location: String(raw.location ?? ''),
        status: String(raw.status ?? 'draft'),
        attendeeCount: Number(raw.attendeeCount ?? 0),
        capacity: Number(raw.capacity ?? raw.attendeeCount ?? 0),
        type: String(raw.type ?? 'In-person'),
        owner: String(raw.owner ?? ''),
        registrationClose: String(raw.registrationClose ?? ''),
        hubspotId: String(raw.hubspotId ?? raw.id ?? ''),
        description: String(raw.description ?? ''),
    };
}

/**
 * @param {Record<string, unknown>} raw
 */
export function normalizeAttendee(raw) {
    if (!raw || typeof raw !== 'object') {
        return raw;
    }

    if (raw.name && !raw.firstName && !raw.lastName) {
        return raw;
    }

    const firstName = String(raw.firstName ?? '');
    const lastName = String(raw.lastName ?? '');
    const combinedName = [firstName, lastName].filter(Boolean).join(' ');
    const apiStatus = typeof raw.status === 'string' ? raw.status : '';
    const status = ATTENDEE_STATUS_FROM_API[apiStatus] ?? raw.status ?? 'Registered';

    return {
        id: String(raw.id ?? ''),
        name: combinedName || String(raw.name ?? ''),
        email: String(raw.email ?? ''),
        company: String(raw.company ?? ''),
        status,
        ticketType: String(raw.ticketType ?? ''),
        registeredAt: String(raw.registeredAt ?? ''),
        source: String(raw.source ?? ''),
    };
}

/**
 * @param {{ events?: Array<Record<string, unknown>> } & Record<string, unknown>} response
 */
export function normalizeEventsResponse(response) {
    return {
        ...response,
        events: (response.events ?? []).map((event) => normalizeEvent(event)).filter(Boolean),
    };
}

/**
 * @param {{ event?: Record<string, unknown> } | Record<string, unknown>} response
 */
export function normalizeEventResponse(response) {
    if (response && typeof response === 'object' && 'event' in response) {
        return { event: normalizeEvent(response.event) };
    }
    return { event: normalizeEvent(response) };
}

/**
 * @param {{ attendees?: Array<Record<string, unknown>> } & Record<string, unknown>} response
 */
export function normalizeAttendeesResponse(response) {
    return {
        ...response,
        attendees: (response.attendees ?? []).map((attendee) => normalizeAttendee(attendee)),
    };
}
