import { CONFIG } from '../config.js';
import { apiRequest } from '../api/client.js';
import {
    MOCK_EVENTS,
    MOCK_ATTENDEES,
    MOCK_TEMPLATES,
    MOCK_AUDIT_LOG,
    MOCK_ANALYTICS,
    MOCK_CAMPAIGN_METRICS,
    MOCK_SCHEDULED_EMAILS,
    MOCK_AGENDA,
    MOCK_ACTIVITY,
    getEventById,
    getAuditLogForEvent,
} from '../data/mockData.js';
import {
    normalizeAttendeesResponse,
    normalizeEventResponse,
    normalizeEventsResponse,
} from '../utils/normalizeApi.js';

async function withMockFallback(mockFn, liveFn) {
    if (CONFIG.USE_MOCK_API) {
        return mockFn();
    }
    return liveFn();
}

function mockDelay(result) {
    const delay = CONFIG.MOCK_API_DELAY_MS ?? 0;
    if (delay <= 0) {
        return Promise.resolve(result);
    }
    return new Promise((resolve) => {
        setTimeout(() => resolve(result), delay);
    });
}

export async function fetchEvents() {
    return withMockFallback(
        () => mockDelay({ events: MOCK_EVENTS }),
        async () => normalizeEventsResponse(await apiRequest('/events')),
    );
}

/**
 * @param {string} eventId
 */
export async function fetchEvent(eventId) {
    return withMockFallback(
        () => mockDelay({ event: getEventById(eventId) ?? null }),
        async () => normalizeEventResponse(await apiRequest(`/events/${encodeURIComponent(eventId)}`)),
    );
}

/**
 * @param {string} eventId
 */
export async function fetchAttendees(eventId) {
    return withMockFallback(
        () => mockDelay({ attendees: MOCK_ATTENDEES[eventId] ?? [] }),
        async () =>
            normalizeAttendeesResponse(
                await apiRequest(`/events/${encodeURIComponent(eventId)}/attendees`),
            ),
    );
}

export async function fetchTemplates(eventId) {
    return withMockFallback(
        () => mockDelay({ templates: MOCK_TEMPLATES }),
        () => apiRequest(`/events/${encodeURIComponent(eventId)}/email/templates`),
    );
}

/**
 * @param {string} [eventId]
 */
export async function fetchAuditLog(eventId) {
    return withMockFallback(
        () =>
            mockDelay({
                entries: eventId ? getAuditLogForEvent(eventId) : MOCK_AUDIT_LOG,
            }),
        () => apiRequest(eventId ? `/events/${encodeURIComponent(eventId)}/audit` : '/audit/recent'),
    );
}

/**
 * @param {string} eventId
 */
export async function fetchAnalytics(eventId) {
    return withMockFallback(
        () =>
            mockDelay({
                conversion: MOCK_ANALYTICS[eventId] ?? { checkedIn: 0, registered: 0, cancelled: 0 },
            }),
        () => apiRequest(`/events/${encodeURIComponent(eventId)}/analytics`),
    );
}

/**
 * @param {string} eventId
 */
export async function fetchCampaignMetrics(eventId) {
    return withMockFallback(
        () =>
            mockDelay({
                metrics: MOCK_CAMPAIGN_METRICS[eventId] ?? { sent: 0, opened: 0, clicked: 0, bounced: 0 },
            }),
        () => apiRequest(`/events/${encodeURIComponent(eventId)}/analytics/campaign`),
    );
}

/**
 * @param {string} eventId
 */
export async function fetchScheduledEmails(eventId) {
    return withMockFallback(
        () => mockDelay({ scheduled: MOCK_SCHEDULED_EMAILS[eventId] ?? [] }),
        () => apiRequest(`/events/${encodeURIComponent(eventId)}/email/scheduled`),
    );
}

/**
 * @param {string} eventId
 */
export async function fetchAgenda(eventId) {
    return withMockFallback(
        () => mockDelay({ sessions: MOCK_AGENDA[eventId] ?? [] }),
        () => apiRequest(`/events/${encodeURIComponent(eventId)}/agenda`),
    );
}

/**
 * @param {string} eventId
 */
export async function fetchActivity(eventId) {
    return withMockFallback(
        () => mockDelay({ activity: MOCK_ACTIVITY[eventId] ?? [] }),
        () => apiRequest(`/events/${encodeURIComponent(eventId)}/activity`),
    );
}

/**
 * @param {{ eventId: string; templateId: string; contactIds: string[]; segment?: string; scheduledAt?: string }} payload
 */
export async function previewEmail(payload) {
    return withMockFallback(
        async () => ({
            recipientCount: payload.contactIds.length,
            scheduledAt: payload.scheduledAt ?? null,
        }),
        () =>
            apiRequest(`/events/${encodeURIComponent(payload.eventId)}/email/preview`, {
                method: 'POST',
                body: JSON.stringify({
                    templateId: payload.templateId,
                    contactIds: payload.contactIds,
                    segment: payload.segment,
                    scheduledAt: payload.scheduledAt,
                }),
            }),
    );
}

/**
 * @param {{ eventId: string; templateId: string; contactIds: string[]; scheduledAt?: string; idempotencyKey: string }} payload
 */
export async function sendEmail(payload) {
    return withMockFallback(
        async () => ({
            jobId: `job-${crypto.randomUUID()}`,
            status: payload.scheduledAt ? 'scheduled' : 'sent',
            recipientCount: payload.contactIds.length,
        }),
        () =>
            apiRequest(`/events/${encodeURIComponent(payload.eventId)}/email/dispatch`, {
                method: 'POST',
                body: JSON.stringify({
                    templateId: payload.templateId,
                    contactIds: payload.contactIds,
                    scheduledAt: payload.scheduledAt,
                    idempotencyKey: payload.idempotencyKey,
                }),
            }),
    );
}
