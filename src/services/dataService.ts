import { CONFIG } from '../config';
import { apiRequest } from '../api/client';
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
} from '../data/mockData';
import {
	normalizeAttendeesResponse,
	normalizeEventResponse,
	normalizeEventsResponse,
} from '../utils/normalizeApi';
import type {
	ActivityItem,
	AgendaSession,
	AnalyticsConversion,
	AttendeesResponse,
	AuditEntry,
	CampaignMetrics,
	EmailPreviewPayload,
	EmailSendPayload,
	EmailTemplate,
	EventResponse,
	EventsResponse,
	ScheduledEmail,
} from '../types';

export interface DataServiceOptions {
	token?: string | null;
}

async function withMockFallback<T>(mockFn: () => T | Promise<T>, liveFn: () => Promise<T>): Promise<T> {
	if (CONFIG.USE_MOCK_API) {
		return mockFn();
	}
	return liveFn();
}

function mockDelay<T>(result: T): Promise<T> {
	const delay = CONFIG.MOCK_API_DELAY_MS ?? 0;
	if (delay <= 0) {
		return Promise.resolve(result);
	}
	return new Promise((resolve) => {
		setTimeout(() => resolve(result), delay);
	});
}

function requestOptions(token?: string | null): { token?: string | null } {
	return token ? { token } : {};
}

export async function fetchEvents(options: DataServiceOptions = {}): Promise<EventsResponse> {
	const { token } = options;
	return withMockFallback(
		() => mockDelay({ events: MOCK_EVENTS }),
		async () => normalizeEventsResponse((await apiRequest('/events', {}, requestOptions(token))) ?? {}) as EventsResponse,
	);
}

export async function fetchEvent(eventId: string, options: DataServiceOptions = {}): Promise<EventResponse> {
	const { token } = options;
	return withMockFallback(
		() => mockDelay({ event: getEventById(eventId) ?? null }),
		async () =>
			normalizeEventResponse(
				(await apiRequest(`/events/${encodeURIComponent(eventId)}`, {}, requestOptions(token))) ?? {},
			),
	);
}

export async function fetchAttendees(eventId: string, options: DataServiceOptions = {}): Promise<AttendeesResponse> {
	const { token } = options;
	return withMockFallback(
		() => mockDelay({ attendees: MOCK_ATTENDEES[eventId] ?? [] }),
		async () =>
			normalizeAttendeesResponse(
				(await apiRequest(`/events/${encodeURIComponent(eventId)}/attendees`, {}, requestOptions(token))) ?? {},
			) as AttendeesResponse,
	);
}

export async function fetchTemplates(
	eventId: string,
	options: DataServiceOptions = {},
): Promise<{ templates: EmailTemplate[] }> {
	const { token } = options;
	return withMockFallback(
		() => mockDelay({ templates: MOCK_TEMPLATES }),
		async () =>
			(await apiRequest(`/events/${encodeURIComponent(eventId)}/email/templates`, {}, requestOptions(token))) as {
				templates: EmailTemplate[];
			},
	);
}

export async function fetchAuditLog(
	eventId: string | undefined,
	options: DataServiceOptions = {},
): Promise<{ entries: AuditEntry[] }> {
	const { token } = options;
	return withMockFallback(
		() =>
			mockDelay({
				entries: eventId ? getAuditLogForEvent(eventId) : MOCK_AUDIT_LOG,
			}),
		async () =>
			(await apiRequest(
				eventId ? `/events/${encodeURIComponent(eventId)}/audit` : '/audit/recent',
				{},
				requestOptions(token),
			)) as { entries: AuditEntry[] },
	);
}

export async function fetchAnalytics(
	eventId: string,
	options: DataServiceOptions = {},
): Promise<{ conversion: AnalyticsConversion }> {
	const { token } = options;
	return withMockFallback(
		() =>
			mockDelay({
				conversion: MOCK_ANALYTICS[eventId] ?? { checkedIn: 0, registered: 0, cancelled: 0 },
			}),
		async () =>
			(await apiRequest(`/events/${encodeURIComponent(eventId)}/analytics`, {}, requestOptions(token))) as {
				conversion: AnalyticsConversion;
			},
	);
}

export async function fetchCampaignMetrics(
	eventId: string,
	options: DataServiceOptions = {},
): Promise<{ metrics: CampaignMetrics }> {
	const { token } = options;
	return withMockFallback(
		() =>
			mockDelay({
				metrics: MOCK_CAMPAIGN_METRICS[eventId] ?? { sent: 0, opened: 0, clicked: 0, bounced: 0 },
			}),
		async () =>
			(await apiRequest(
				`/events/${encodeURIComponent(eventId)}/analytics/campaign`,
				{},
				requestOptions(token),
			)) as { metrics: CampaignMetrics },
	);
}

export async function fetchScheduledEmails(
	eventId: string,
	options: DataServiceOptions = {},
): Promise<{ scheduled: ScheduledEmail[] }> {
	const { token } = options;
	return withMockFallback(
		() => mockDelay({ scheduled: MOCK_SCHEDULED_EMAILS[eventId] ?? [] }),
		async () =>
			(await apiRequest(
				`/events/${encodeURIComponent(eventId)}/email/scheduled`,
				{},
				requestOptions(token),
			)) as { scheduled: ScheduledEmail[] },
	);
}

export async function fetchAgenda(
	eventId: string,
	options: DataServiceOptions = {},
): Promise<{ sessions: AgendaSession[] }> {
	const { token } = options;
	return withMockFallback(
		() => mockDelay({ sessions: MOCK_AGENDA[eventId] ?? [] }),
		async () =>
			(await apiRequest(`/events/${encodeURIComponent(eventId)}/agenda`, {}, requestOptions(token))) as {
				sessions: AgendaSession[];
			},
	);
}

export async function fetchActivity(
	eventId: string,
	options: DataServiceOptions = {},
): Promise<{ activity: ActivityItem[] }> {
	const { token } = options;
	return withMockFallback(
		() => mockDelay({ activity: MOCK_ACTIVITY[eventId] ?? [] }),
		async () =>
			(await apiRequest(`/events/${encodeURIComponent(eventId)}/activity`, {}, requestOptions(token))) as {
				activity: ActivityItem[];
			},
	);
}

export async function previewEmail(
	payload: EmailPreviewPayload,
	options: DataServiceOptions = {},
): Promise<{ recipientCount: number; scheduledAt: string | null }> {
	const { token } = options;
	return withMockFallback(
		async () => ({
			recipientCount: payload.contactIds.length,
			scheduledAt: payload.scheduledAt ?? null,
		}),
		async () =>
			(await apiRequest(
				`/events/${encodeURIComponent(payload.eventId)}/email/preview`,
				{
					method: 'POST',
					body: JSON.stringify({
						templateId: payload.templateId,
						contactIds: payload.contactIds,
						segment: payload.segment,
						scheduledAt: payload.scheduledAt,
					}),
				},
				requestOptions(token),
			)) as { recipientCount: number; scheduledAt: string | null },
	);
}

export async function sendEmail(
	payload: EmailSendPayload,
	options: DataServiceOptions = {},
): Promise<{ jobId: string; status: string; recipientCount: number }> {
	const { token } = options;
	return withMockFallback(
		async () => ({
			jobId: `job-${crypto.randomUUID()}`,
			status: payload.scheduledAt ? 'scheduled' : 'sent',
			recipientCount: payload.contactIds.length,
		}),
		async () =>
			(await apiRequest(
				`/events/${encodeURIComponent(payload.eventId)}/email/dispatch`,
				{
					method: 'POST',
					body: JSON.stringify({
						templateId: payload.templateId,
						contactIds: payload.contactIds,
						scheduledAt: payload.scheduledAt,
						idempotencyKey: payload.idempotencyKey,
					}),
				},
				requestOptions(token),
			)) as { jobId: string; status: string; recipientCount: number },
	);
}

/** Binds the session token to all data-service methods for use in React components. */
export function createDataService(token?: string | null) {
	const options: DataServiceOptions = { token };
	return {
		fetchEvents: () => fetchEvents(options),
		fetchEvent: (eventId: string) => fetchEvent(eventId, options),
		fetchAttendees: (eventId: string) => fetchAttendees(eventId, options),
		fetchTemplates: (eventId: string) => fetchTemplates(eventId, options),
		fetchAuditLog: (eventId?: string) => fetchAuditLog(eventId, options),
		fetchAnalytics: (eventId: string) => fetchAnalytics(eventId, options),
		fetchCampaignMetrics: (eventId: string) => fetchCampaignMetrics(eventId, options),
		fetchScheduledEmails: (eventId: string) => fetchScheduledEmails(eventId, options),
		fetchAgenda: (eventId: string) => fetchAgenda(eventId, options),
		fetchActivity: (eventId: string) => fetchActivity(eventId, options),
		previewEmail: (payload: EmailPreviewPayload) => previewEmail(payload, options),
		sendEmail: (payload: EmailSendPayload) => sendEmail(payload, options),
	};
}

export type DataService = ReturnType<typeof createDataService>;
