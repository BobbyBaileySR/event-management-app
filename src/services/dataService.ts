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
	getMockCatalog,
	getMockSliceAttendees,
	mockCreateEvent,
	mockCreateProgram,
	mockUpdateEvent,
	mockUpdateProgram,
} from '../data/mockData';
import {
	normalizeAttendeesResponse,
	normalizeCatalogResponse,
	normalizeEventResponse,
	normalizeEventsResponse,
	normalizeSliceAttendeesResponse,
} from '../utils/normalizeApi';
import type {
	ActivityItem,
	AgendaSession,
	AnalyticsConversion,
	AttendeesResponse,
	AuditEntry,
	CampaignMetrics,
	CatalogEventRecord,
	CatalogProgramRecord,
	CatalogResponse,
	EmailPreviewPayload,
	EmailSendPayload,
	EmailTemplate,
	EventResponse,
	EventsResponse,
	ScheduledEmail,
	SliceAttendeesResponse,
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

export interface FetchCatalogOptions extends DataServiceOptions {
	includeArchived?: boolean;
}

function mapMockCatalogError(error: unknown): never {
	if (error instanceof Error) {
		throw error;
	}
	throw new Error('Catalog request failed');
}

export async function fetchCatalog(options: FetchCatalogOptions = {}): Promise<CatalogResponse> {
	const { token, includeArchived = false } = options;
	return withMockFallback(
		() => mockDelay(getMockCatalog(includeArchived)),
		async () =>
			normalizeCatalogResponse(
				((await apiRequest(
					includeArchived ? '/catalog?includeArchived=true' : '/catalog',
					{},
					requestOptions(token),
				)) ?? {}) as Record<string, unknown>,
			),
	);
}

export async function fetchSliceAttendees(
	programId: string,
	eventId: string,
	query: { checkedIn?: boolean; q?: string; page?: number; pageSize?: number } = {},
	options: DataServiceOptions = {},
): Promise<SliceAttendeesResponse> {
	const { token } = options;
	const search = new URLSearchParams();
	if (query.checkedIn !== undefined) {
		search.set('checkedIn', String(query.checkedIn));
	}
	if (query.q) {
		search.set('q', query.q);
	}
	if (query.page) {
		search.set('page', String(query.page));
	}
	if (query.pageSize) {
		search.set('pageSize', String(query.pageSize));
	}
	const suffix = search.toString() ? `?${search}` : '';
	const route = `programs/${encodeURIComponent(programId)}/events/${encodeURIComponent(eventId)}/attendees${suffix}`;

	return withMockFallback(
		() => mockDelay(getMockSliceAttendees(programId, eventId)),
		async () =>
			normalizeSliceAttendeesResponse(
				((await apiRequest(route, {}, requestOptions(token))) ?? {}) as Record<string, unknown>,
			),
	);
}

export async function createProgram(
	body: { name: string; hubspotFormIds: string[] },
	options: DataServiceOptions = {},
): Promise<{ program: CatalogProgramRecord }> {
	const { token } = options;
	return withMockFallback(
		() => {
			try {
				const program = mockCreateProgram(body.name, body.hubspotFormIds);
				return mockDelay({ program: { ...program, eventIds: [] } as unknown as CatalogProgramRecord });
			} catch (error) {
				mapMockCatalogError(error);
			}
		},
		async () =>
			(await apiRequest(
				'/catalog/program',
				{ method: 'POST', body: JSON.stringify(body) },
				requestOptions(token),
			)) as { program: CatalogProgramRecord },
	);
}

export async function updateProgram(
	id: string,
	body: { name?: string; hubspotFormIds?: string[]; archived?: boolean },
	options: DataServiceOptions = {},
): Promise<{ program: CatalogProgramRecord }> {
	const { token } = options;
	return withMockFallback(
		() => {
			try {
				const program = mockUpdateProgram(id, body);
				return mockDelay({ program: program as CatalogProgramRecord });
			} catch (error) {
				mapMockCatalogError(error);
			}
		},
		async () =>
			(await apiRequest(
				`/catalog/program/${encodeURIComponent(id)}`,
				{ method: 'PATCH', body: JSON.stringify(body) },
				requestOptions(token),
			)) as { program: CatalogProgramRecord },
	);
}

export async function createEvent(
	body: { programId: string; name: string; partsAttendedOption: string; attendanceProperty: string },
	options: DataServiceOptions = {},
): Promise<{ event: CatalogEventRecord }> {
	const { token } = options;
	return withMockFallback(
		() => {
			try {
				const event = mockCreateEvent(
					body.programId,
					body.name,
					body.partsAttendedOption,
					body.attendanceProperty,
				);
				return mockDelay({
					event: {
						...event,
						programId: body.programId,
						archivedViaProgramId: null,
					} as CatalogEventRecord,
				});
			} catch (error) {
				mapMockCatalogError(error);
			}
		},
		async () =>
			(await apiRequest(
				'/catalog/event',
				{ method: 'POST', body: JSON.stringify(body) },
				requestOptions(token),
			)) as { event: CatalogEventRecord },
	);
}

export async function updateEvent(
	id: string,
	body: {
		name?: string;
		partsAttendedOption?: string;
		attendanceProperty?: string;
		archived?: boolean;
	},
	options: DataServiceOptions = {},
): Promise<{ event: CatalogEventRecord }> {
	const { token } = options;
	return withMockFallback(
		() => {
			try {
				const event = mockUpdateEvent(id, body);
				const program = getMockCatalog(true).programs.find((entry) =>
					entry.events.some((candidate) => candidate.id === id),
				);
				return mockDelay({
					event: {
						...event,
						programId: program?.id ?? '',
						archivedViaProgramId: null,
					} as CatalogEventRecord,
				});
			} catch (error) {
				mapMockCatalogError(error);
			}
		},
		async () =>
			(await apiRequest(
				`/catalog/event/${encodeURIComponent(id)}`,
				{ method: 'PATCH', body: JSON.stringify(body) },
				requestOptions(token),
			)) as { event: CatalogEventRecord },
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
		fetchCatalog: (catalogOptions?: Omit<FetchCatalogOptions, 'token'>) =>
			fetchCatalog({ ...options, ...catalogOptions }),
		fetchSliceAttendees: (
			programId: string,
			eventId: string,
			query?: { checkedIn?: boolean; q?: string; page?: number; pageSize?: number },
		) => fetchSliceAttendees(programId, eventId, query, options),
		createProgram: (body: { name: string; hubspotFormIds: string[] }) => createProgram(body, options),
		updateProgram: (id: string, body: { name?: string; hubspotFormIds?: string[]; archived?: boolean }) =>
			updateProgram(id, body, options),
		createEvent: (body: {
			programId: string;
			name: string;
			partsAttendedOption: string;
			attendanceProperty: string;
		}) => createEvent(body, options),
		updateEvent: (
			id: string,
			body: {
				name?: string;
				partsAttendedOption?: string;
				attendanceProperty?: string;
				archived?: boolean;
			},
		) => updateEvent(id, body, options),
	};
}

export type DataService = ReturnType<typeof createDataService>;
