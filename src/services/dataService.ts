import { CONFIG } from '../config';
import { apiRequest } from '../api/client';
import {
	MOCK_EVENTS,
	MOCK_ATTENDEES,
	MOCK_TEMPLATES,
	MOCK_ANALYTICS,
	MOCK_CAMPAIGN_METRICS,
	MOCK_SCHEDULED_EMAILS,
	MOCK_AGENDA,
	MOCK_ACTIVITY,
	getEventById,
	getAuditLogForEvent,
	getMockSliceAuditLog,
	getMockCatalog,
	getMockSliceAttendees,
	mockCheckInScan,
	mockConfirmCheckIn,
	mockAdjustCapacity,
	getMockCapacityStatus,
	mockCreateEvent,
	mockCreateProgram,
	mockUpdateEvent,
	mockUpdateProgram,
	getMockEmailLimits,
	getMockEmailTemplates,
	getMockEmailSegments,
	mockPreviewEmailDispatch,
	mockCreateEmailDispatch,
	getMockEmailDispatches,
	getMockEmailDispatchDetail,
	mockUpdateEmailDispatch,
	mockCancelEmailDispatch,
	getMockThemePreference,
	setMockThemePreference,
} from '../data/mockData';
import {
	normalizeAttendeesResponse,
	normalizeCatalogResponse,
	normalizeCheckInScanResponse,
	normalizeConfirmCheckInResponse,
	normalizeCapacityStatusResponse,
	normalizeThemePreferenceResponse,
	normalizeEmailLimitsResponse,
	normalizeEmailTemplatesResponse,
	normalizeEmailSegmentsResponse,
	normalizeEmailPreviewResponse,
	normalizeCreateEmailDispatchResponse,
	normalizeEmailDispatchListResponse,
	normalizeEmailDispatchDetailResponse,
	normalizeCancelEmailDispatchResponse,
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
	AuditLogListResult,
	CampaignMetrics,
	CatalogEventRecord,
	CatalogProgramRecord,
	CatalogResponse,
	CheckInScanResponse,
	ConfirmCheckInResponse,
	CapacityStatus,
	AdjustCapacityDirection,
	CancelEmailDispatchResponse,
	CreateEmailDispatchBody,
	CreateEmailDispatchResponse,
	EmailDispatchDetailResponse,
	EmailDispatchLimits,
	EmailDispatchListResponse,
	EmailPreviewRequestBody,
	EmailPreviewResponse,
	EmailSegmentsListResponse,
	EmailTemplatesListResponse,
	PatchEmailDispatchBody,
	EmailDispatchListItem,
	CreateCatalogEventBody,
	CreateCatalogProgramBody,
	PatchCatalogEventBody,
	PatchCatalogProgramBody,
	EmailPreviewPayload,
	EmailSendPayload,
	EmailTemplate,
	EventResponse,
	EventsResponse,
	ScheduledEmail,
	SliceAttendeesResponse,
	ThemePreference,
} from '../types';
import type { ThemeId } from '../theme/themeTokens';

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

export interface AuditLogQueryOptions extends DataServiceOptions {
	page?: number;
	pageSize?: number;
}

export async function fetchAuditLog(
	eventId?: string,
	options: AuditLogQueryOptions = {},
): Promise<AuditLogListResult | { entries: AuditEntry[] }> {
	const { token, page = 1, pageSize = 50 } = options;

	if (eventId !== undefined) {
		return withMockFallback<{ entries: AuditEntry[] } | AuditLogListResult>(
			() =>
				mockDelay({
					entries: getAuditLogForEvent(eventId),
				}),
			async () => {
				const search = new URLSearchParams();
				search.set('page', String(page));
				search.set('pageSize', String(pageSize));
				const query = search.toString();
				const path = `/events/${encodeURIComponent(eventId)}/audit${query ? `?${query}` : ''}`;
				return (await apiRequest(path, {}, requestOptions(token))) as AuditLogListResult;
			},
		);
	}

	return withMockFallback(
		() => mockDelay(getMockSliceAuditLog(page, pageSize)),
		async () => {
			const search = new URLSearchParams();
			search.set('page', String(page));
			search.set('pageSize', String(pageSize));
			const query = search.toString();
			const path = `/audit/recent${query ? `?${query}` : ''}`;
			return (await apiRequest(path, {}, requestOptions(token))) as AuditLogListResult;
		},
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
	query: {
		checkedIn?: boolean;
		q?: string;
		page?: number;
		pageSize?: number;
		dispatchId?: string;
		dispatchFilter?: 'received' | 'not_received';
	} = {},
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
	if (query.dispatchId && query.dispatchFilter) {
		search.set('dispatchId', query.dispatchId);
		search.set('dispatchFilter', query.dispatchFilter);
	}
	const suffix = search.toString() ? `?${search}` : '';
	const route = `programs/${encodeURIComponent(programId)}/events/${encodeURIComponent(eventId)}/attendees${suffix}`;

	return withMockFallback(
		() => mockDelay(getMockSliceAttendees(programId, eventId, query)),
		async () =>
			normalizeSliceAttendeesResponse(
				((await apiRequest(route, {}, requestOptions(token))) ?? {}) as Record<string, unknown>,
			),
	);
}

export async function checkInScan(
	programId: string,
	eventId: string,
	jwt: string,
	options: DataServiceOptions = {},
): Promise<CheckInScanResponse> {
	const { token } = options;
	const route = `programs/${encodeURIComponent(programId)}/events/${encodeURIComponent(eventId)}/checkin/scan`;

	return withMockFallback(
		() => mockDelay(mockCheckInScan(programId, eventId, jwt)),
		async () =>
			normalizeCheckInScanResponse(
				((await apiRequest(
					route,
					{ method: 'POST', body: JSON.stringify({ jwt }) },
					requestOptions(token),
				)) ?? {}) as Record<string, unknown>,
			),
	);
}

export async function confirmCheckIn(
	programId: string,
	eventId: string,
	contactId: string,
	options: DataServiceOptions = {},
): Promise<ConfirmCheckInResponse> {
	const { token } = options;
	const route = `programs/${encodeURIComponent(programId)}/events/${encodeURIComponent(eventId)}/checkin`;

	return withMockFallback(
		() => mockDelay(mockConfirmCheckIn(programId, eventId, contactId)),
		async () =>
			normalizeConfirmCheckInResponse(
				((await apiRequest(
					route,
					{ method: 'POST', body: JSON.stringify({ contactId }) },
					requestOptions(token),
				)) ?? {}) as Record<string, unknown>,
			),
	);
}

export async function fetchCapacityStatus(
	programId: string,
	eventId: string,
	options: DataServiceOptions = {},
): Promise<CapacityStatus> {
	const { token } = options;
	const route = `programs/${encodeURIComponent(programId)}/events/${encodeURIComponent(eventId)}/capacity`;

	return withMockFallback(
		() => mockDelay(getMockCapacityStatus(programId, eventId)),
		async () =>
			normalizeCapacityStatusResponse(
				((await apiRequest(route, {}, requestOptions(token))) ?? {}) as Record<string, unknown>,
			),
	);
}

export async function adjustCapacity(
	programId: string,
	eventId: string,
	direction: AdjustCapacityDirection,
	options: DataServiceOptions = {},
): Promise<CapacityStatus> {
	const { token } = options;
	const route = `programs/${encodeURIComponent(programId)}/events/${encodeURIComponent(eventId)}/capacity/adjust`;

	return withMockFallback(
		() => {
			try {
				return mockDelay(mockAdjustCapacity(programId, eventId, direction));
			} catch (error) {
				mapMockCapacityError(error);
			}
		},
		async () =>
			normalizeCapacityStatusResponse(
				((await apiRequest(
					route,
					{ method: 'POST', body: JSON.stringify({ direction }) },
					requestOptions(token),
				)) ?? {}) as Record<string, unknown>,
			),
	);
}

/**
 * `email` is a mock-only parameter that simulates the server-side Celebration allowlist
 * re-validation (contracts/theme-preference-api.md) — the live route derives it from the
 * authenticated session, so it is never sent in the live request.
 */
export async function fetchThemePreference(
	email?: string | null,
	options: DataServiceOptions = {},
): Promise<ThemePreference> {
	const { token } = options;
	return withMockFallback(
		() => mockDelay(getMockThemePreference(email)),
		async () =>
			normalizeThemePreferenceResponse(
				((await apiRequest('user/prefs', {}, requestOptions(token))) ?? {}) as Record<string, unknown>,
			),
	);
}

export async function updateThemePreference(
	theme: ThemeId,
	email?: string | null,
	options: DataServiceOptions = {},
): Promise<ThemePreference> {
	const { token } = options;
	return withMockFallback(
		() => {
			try {
				return mockDelay(setMockThemePreference(theme, email));
			} catch (error) {
				mapMockThemePreferenceError(error);
			}
		},
		async () =>
			normalizeThemePreferenceResponse(
				((await apiRequest(
					'user/prefs/theme',
					{ method: 'PUT', body: JSON.stringify({ theme }) },
					requestOptions(token),
				)) ?? {}) as Record<string, unknown>,
			),
	);
}

function mapMockThemePreferenceError(error: unknown): never {
	if (error instanceof Error && error.message === 'celebration_not_allowed') {
		throw new Error('celebration_not_allowed');
	}
	throw error instanceof Error ? error : new Error('Theme preference update failed');
}

function mapMockCapacityError(error: unknown): never {
	if (error instanceof Error) {
		if (error.message === 'capacity_at_floor' || error.message === 'capacity_at_ceiling') {
			throw new Error(error.message);
		}
	}
	throw error instanceof Error ? error : new Error('Capacity adjust failed');
}

export async function createProgram(
	body: CreateCatalogProgramBody,
	options: DataServiceOptions = {},
): Promise<{ program: CatalogProgramRecord }> {
	const { token } = options;
	return withMockFallback(
		() => {
			try {
				const program = mockCreateProgram(body);
				return mockDelay({ program: { ...program, eventIds: [] } as CatalogProgramRecord });
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
	body: PatchCatalogProgramBody,
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
	body: CreateCatalogEventBody,
	options: DataServiceOptions = {},
): Promise<{ event: CatalogEventRecord }> {
	const { token } = options;
	return withMockFallback(
		() => {
			try {
				const event = mockCreateEvent(body);
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
	body: PatchCatalogEventBody,
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

function emailRoute(programId: string, eventId: string, suffix = ''): string {
	return `programs/${encodeURIComponent(programId)}/events/${encodeURIComponent(eventId)}/email${suffix}`;
}

function mapMockEmailError(error: unknown): never {
	if (error instanceof Error) {
		throw error;
	}
	throw new Error('Email dispatch request failed');
}

export async function fetchEmailLimits(
	programId: string,
	eventId: string,
	options: DataServiceOptions = {},
): Promise<EmailDispatchLimits> {
	const { token } = options;
	return withMockFallback(
		() => mockDelay(getMockEmailLimits(programId, eventId)),
		async () =>
			normalizeEmailLimitsResponse(
				((await apiRequest(emailRoute(programId, eventId, '/limits'), {}, requestOptions(token))) ?? {}) as Record<
					string,
					unknown
				>,
			),
	);
}

export async function fetchEmailTemplates(
	programId: string,
	eventId: string,
	options: DataServiceOptions = {},
): Promise<EmailTemplatesListResponse> {
	const { token } = options;
	return withMockFallback(
		() => mockDelay(getMockEmailTemplates(programId, eventId)),
		async () =>
			normalizeEmailTemplatesResponse(
				((await apiRequest(emailRoute(programId, eventId, '/templates'), {}, requestOptions(token))) ?? {}) as Record<
					string,
					unknown
				>,
			),
	);
}

export async function fetchEmailSegments(
	programId: string,
	eventId: string,
	options: DataServiceOptions = {},
): Promise<EmailSegmentsListResponse> {
	const { token } = options;
	return withMockFallback(
		() => mockDelay(getMockEmailSegments(programId, eventId)),
		async () =>
			normalizeEmailSegmentsResponse(
				((await apiRequest(emailRoute(programId, eventId, '/segments'), {}, requestOptions(token))) ?? {}) as Record<
					string,
					unknown
				>,
			),
	);
}

export async function previewEmailDispatch(
	programId: string,
	eventId: string,
	body: EmailPreviewRequestBody,
	options: DataServiceOptions = {},
): Promise<EmailPreviewResponse> {
	const { token } = options;
	return withMockFallback(
		() => {
			try {
				return mockDelay(mockPreviewEmailDispatch(programId, eventId, body));
			} catch (error) {
				mapMockEmailError(error);
			}
		},
		async () =>
			normalizeEmailPreviewResponse(
				((await apiRequest(
					emailRoute(programId, eventId, '/preview'),
					{ method: 'POST', body: JSON.stringify(body) },
					requestOptions(token),
				)) ?? {}) as Record<string, unknown>,
			),
	);
}

export async function createEmailDispatch(
	programId: string,
	eventId: string,
	body: CreateEmailDispatchBody,
	options: DataServiceOptions = {},
): Promise<CreateEmailDispatchResponse> {
	const { token } = options;
	return withMockFallback(
		() => {
			try {
				return mockDelay(mockCreateEmailDispatch(programId, eventId, body));
			} catch (error) {
				mapMockEmailError(error);
			}
		},
		async () =>
			normalizeCreateEmailDispatchResponse(
				((await apiRequest(
					emailRoute(programId, eventId, '/dispatches'),
					{ method: 'POST', body: JSON.stringify(body) },
					requestOptions(token),
				)) ?? {}) as Record<string, unknown>,
			),
	);
}

export interface FetchEmailDispatchesQuery {
	view?: 'scheduled' | 'log';
	page?: number;
	pageSize?: number;
}

export async function fetchEmailDispatches(
	programId: string,
	eventId: string,
	query: FetchEmailDispatchesQuery = {},
	options: DataServiceOptions = {},
): Promise<EmailDispatchListResponse> {
	const { token } = options;
	const search = new URLSearchParams();
	if (query.view) {
		search.set('view', query.view);
	}
	if (query.page) {
		search.set('page', String(query.page));
	}
	if (query.pageSize) {
		search.set('pageSize', String(query.pageSize));
	}
	const suffix = search.toString() ? `?${search}` : '';

	return withMockFallback(
		() => mockDelay(getMockEmailDispatches(programId, eventId, query)),
		async () =>
			normalizeEmailDispatchListResponse(
				((await apiRequest(emailRoute(programId, eventId, `/dispatches${suffix}`), {}, requestOptions(token))) ??
					{}) as Record<string, unknown>,
			),
	);
}

export async function fetchEmailDispatchDetail(
	programId: string,
	eventId: string,
	dispatchId: string,
	query: { page?: number; pageSize?: number } = {},
	options: DataServiceOptions = {},
): Promise<EmailDispatchDetailResponse> {
	const { token } = options;
	const search = new URLSearchParams();
	if (query.page) {
		search.set('page', String(query.page));
	}
	if (query.pageSize) {
		search.set('pageSize', String(query.pageSize));
	}
	const suffix = search.toString() ? `?${search}` : '';

	return withMockFallback(
		() => {
			try {
				return mockDelay(getMockEmailDispatchDetail(programId, eventId, dispatchId, query));
			} catch (error) {
				mapMockEmailError(error);
			}
		},
		async () =>
			normalizeEmailDispatchDetailResponse(
				((await apiRequest(
					emailRoute(programId, eventId, `/dispatches/${encodeURIComponent(dispatchId)}${suffix}`),
					{},
					requestOptions(token),
				)) ?? {}) as Record<string, unknown>,
			),
	);
}

export async function updateEmailDispatch(
	programId: string,
	eventId: string,
	dispatchId: string,
	body: PatchEmailDispatchBody,
	options: DataServiceOptions = {},
): Promise<EmailDispatchListItem> {
	const { token } = options;
	return withMockFallback(
		() => {
			try {
				return mockDelay(mockUpdateEmailDispatch(programId, eventId, dispatchId, body));
			} catch (error) {
				mapMockEmailError(error);
			}
		},
		async () => {
			const response = (await apiRequest(
				emailRoute(programId, eventId, `/dispatches/${encodeURIComponent(dispatchId)}`),
				{ method: 'PATCH', body: JSON.stringify(body) },
				requestOptions(token),
			)) as Record<string, unknown>;
			return normalizeEmailDispatchListResponse({ dispatches: [response], page: 1, pageSize: 1, total: 1 })
				.dispatches[0];
		},
	);
}

export async function cancelEmailDispatch(
	programId: string,
	eventId: string,
	dispatchId: string,
	options: DataServiceOptions = {},
): Promise<CancelEmailDispatchResponse> {
	const { token } = options;
	return withMockFallback(
		() => {
			try {
				return mockDelay(mockCancelEmailDispatch(programId, eventId, dispatchId));
			} catch (error) {
				mapMockEmailError(error);
			}
		},
		async () =>
			normalizeCancelEmailDispatchResponse(
				((await apiRequest(
					emailRoute(programId, eventId, `/dispatches/${encodeURIComponent(dispatchId)}`),
					{ method: 'DELETE' },
					requestOptions(token),
				)) ?? {}) as Record<string, unknown>,
			),
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
		fetchAuditLog: (eventId?: string, query?: { page?: number; pageSize?: number }) =>
			fetchAuditLog(eventId, { ...options, ...query }),
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
			query?: {
				checkedIn?: boolean;
				q?: string;
				page?: number;
				pageSize?: number;
				dispatchId?: string;
				dispatchFilter?: 'received' | 'not_received';
			},
		) => fetchSliceAttendees(programId, eventId, query, options),
		checkInScan: (programId: string, eventId: string, jwt: string) =>
			checkInScan(programId, eventId, jwt, options),
		confirmCheckIn: (programId: string, eventId: string, contactId: string) =>
			confirmCheckIn(programId, eventId, contactId, options),
		fetchCapacityStatus: (programId: string, eventId: string) =>
			fetchCapacityStatus(programId, eventId, options),
		adjustCapacity: (programId: string, eventId: string, direction: AdjustCapacityDirection) =>
			adjustCapacity(programId, eventId, direction, options),
		createProgram: (body: CreateCatalogProgramBody) => createProgram(body, options),
		updateProgram: (id: string, body: PatchCatalogProgramBody) => updateProgram(id, body, options),
		createEvent: (body: CreateCatalogEventBody) => createEvent(body, options),
		updateEvent: (id: string, body: PatchCatalogEventBody) => updateEvent(id, body, options),
		fetchEmailLimits: (programId: string, eventId: string) => fetchEmailLimits(programId, eventId, options),
		fetchEmailTemplates: (programId: string, eventId: string) => fetchEmailTemplates(programId, eventId, options),
		fetchEmailSegments: (programId: string, eventId: string) => fetchEmailSegments(programId, eventId, options),
		previewEmailDispatch: (programId: string, eventId: string, body: EmailPreviewRequestBody) =>
			previewEmailDispatch(programId, eventId, body, options),
		createEmailDispatch: (programId: string, eventId: string, body: CreateEmailDispatchBody) =>
			createEmailDispatch(programId, eventId, body, options),
		fetchEmailDispatches: (programId: string, eventId: string, query?: FetchEmailDispatchesQuery) =>
			fetchEmailDispatches(programId, eventId, query, options),
		fetchEmailDispatchDetail: (
			programId: string,
			eventId: string,
			dispatchId: string,
			query?: { page?: number; pageSize?: number },
		) => fetchEmailDispatchDetail(programId, eventId, dispatchId, query, options),
		updateEmailDispatch: (programId: string, eventId: string, dispatchId: string, body: PatchEmailDispatchBody) =>
			updateEmailDispatch(programId, eventId, dispatchId, body, options),
		cancelEmailDispatch: (programId: string, eventId: string, dispatchId: string) =>
			cancelEmailDispatch(programId, eventId, dispatchId, options),
		getThemePreference: (email?: string | null) => fetchThemePreference(email, options),
		setThemePreference: (theme: ThemeId, email?: string | null) => updateThemePreference(theme, email, options),
	};
}

export type DataService = ReturnType<typeof createDataService>;
