import { apiRequest } from '../api/client';
import {
	normalizeAttendeeLookupResponse,
	normalizeCatalogResponse,
	normalizeCheckInScanResponse,
	normalizeConfirmCheckInResponse,
	normalizeCapacityStatusResponse,
	normalizeCapacitySummaryResponse,
	normalizeThemePreferenceResponse,
	normalizeEmailLimitsResponse,
	normalizeEmailTemplatesResponse,
	normalizeEmailSegmentsResponse,
	normalizeEmailPreviewResponse,
	normalizeScheduledEmailSummaryResponse,
	normalizeCreateEmailDispatchResponse,
	normalizeEmailDispatchListItem,
	normalizeEmailDispatchListResponse,
	normalizeEmailDispatchDetailResponse,
	normalizeCancelEmailDispatchResponse,
	normalizeSliceAttendeesResponse,
	normalizeRemoveAttendeeResponse,
	normalizeAttendeeDetailResponse,
	normalizeAttendeeCommunicationsResponse,
	normalizeAttendeeNotesResponse,
	normalizeConversationNoteEntry,
	normalizeGenerateLeadResponse,
	normalizeGenerateLeadBatchResponse,
} from '../utils/normalizeApi';
import type {
	AttendeeCommunicationsResponse,
	AttendeeDetail,
	AttendeeLookupResponse,
	AttendeeNotesResponse,
	AuditEntry,
	AuditLogListResult,
	CatalogEventRecord,
	CatalogProgramRecord,
	CatalogResponse,
	ConversationNoteEntry,
	CheckInScanResponse,
	ConfirmCheckInResponse,
	UndoCheckInResponse,
	CapacityStatus,
	CapacitySummaryResponse,
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
	ScheduledEmailSummary,
	CreateCatalogEventBody,
	CreateCatalogProgramBody,
	PatchCatalogEventBody,
	PatchCatalogProgramBody,
	SliceAttendeesResponse,
	RemoveAttendeeResponse,
	GenerateLeadRequestBody,
	GenerateLeadResponse,
	GenerateLeadBatchRequestBody,
	GenerateLeadBatchResponse,
	ThemePreference,
} from '../types';
import type { ThemeId } from '../theme/themeTokens';

export interface DataServiceOptions {
	token?: string | null;
}

function requestOptions(token?: string | null): { token?: string | null } {
	return token ? { token } : {};
}

export interface AuditLogQueryOptions extends DataServiceOptions {
	page?: number;
	pageSize?: number;
	action?: string;
	actor?: string;
	resourceType?: string;
	resourceId?: string;
}

export async function fetchAuditLog(
	eventId?: string,
	options: AuditLogQueryOptions = {},
): Promise<AuditLogListResult | { entries: AuditEntry[] }> {
	const { token, page = 1, pageSize = 50, action, actor, resourceType, resourceId } = options;

	const search = new URLSearchParams();
	search.set('page', String(page));
	search.set('pageSize', String(pageSize));
	if (action) {
		search.set('action', action);
	}
	if (actor) {
		search.set('actor', actor);
	}
	if (resourceType) {
		search.set('resourceType', resourceType);
	}
	if (resourceId) {
		search.set('resourceId', resourceId);
	}
	const query = search.toString();

	const path =
		eventId !== undefined
			? `/events/${encodeURIComponent(eventId)}/audit${query ? `?${query}` : ''}`
			: `/audit/recent${query ? `?${query}` : ''}`;

	return (await apiRequest(path, {}, requestOptions(token))) as AuditLogListResult;
}

export interface FetchCatalogOptions extends DataServiceOptions {
	includeArchived?: boolean;
}

export async function fetchCatalog(options: FetchCatalogOptions = {}): Promise<CatalogResponse> {
	const { token, includeArchived = false } = options;
	return normalizeCatalogResponse(
		((await apiRequest(
			includeArchived ? '/catalog?includeArchived=true' : '/catalog',
			{},
			requestOptions(token),
		)) ?? {}) as Record<string, unknown>,
	);
}

export async function checkInScan(
	eventId: string,
	jwt: string,
	options: DataServiceOptions = {},
): Promise<CheckInScanResponse> {
	const { token } = options;
	const route = `events/${encodeURIComponent(eventId)}/checkin/scan`;
	return normalizeCheckInScanResponse(
		((await apiRequest(route, { method: 'POST', body: JSON.stringify({ jwt }) }, requestOptions(token))) ??
			{}) as Record<string, unknown>,
	);
}

/**
 * `POST events/{evId}/attendees/lookup` (015-conversation-notes, US1) — read-only attendee
 * lookup for the Conversations screen's QR scan. Reuses the same JWT shape Check-in's scanner
 * already produces; never writes or audits a check-in (contracts/get-attendee-lookup.md).
 */
export async function lookupAttendeeByQr(
	eventId: string,
	jwt: string,
	options: DataServiceOptions = {},
): Promise<AttendeeLookupResponse> {
	const { token } = options;
	const route = `events/${encodeURIComponent(eventId)}/attendees/lookup`;
	return normalizeAttendeeLookupResponse(
		((await apiRequest(route, { method: 'POST', body: JSON.stringify({ jwt }) }, requestOptions(token))) ??
			{}) as Record<string, unknown>,
	);
}

export async function confirmCheckIn(
	eventId: string,
	contactId: string,
	options: DataServiceOptions = {},
): Promise<ConfirmCheckInResponse> {
	const { token } = options;
	const route = `events/${encodeURIComponent(eventId)}/checkin`;
	return normalizeConfirmCheckInResponse(
		((await apiRequest(route, { method: 'POST', body: JSON.stringify({ contactId }) }, requestOptions(token))) ??
			{}) as Record<string, unknown>,
	);
}

/** Event-scoped capacity (T071 / R-007) — preferred when Program membership is optional/unknown. */
export async function fetchEventCapacityStatus(
	eventId: string,
	options: DataServiceOptions = {},
): Promise<CapacityStatus> {
	const { token } = options;
	const route = `events/${encodeURIComponent(eventId)}/capacity`;
	return normalizeCapacityStatusResponse(
		((await apiRequest(route, {}, requestOptions(token))) ?? {}) as Record<string, unknown>,
	);
}

/** Portfolio-wide capacity/checked-in aggregate for Programs & Events (`FE-PERF-001`) — one call, not one per event (Slice 012). */
export async function fetchCapacitySummary(options: DataServiceOptions = {}): Promise<CapacitySummaryResponse> {
	const { token } = options;
	return normalizeCapacitySummaryResponse(
		((await apiRequest('events/capacity-summary', {}, requestOptions(token))) ?? {}) as Record<string, unknown>,
	);
}

/** Canonical shape of `fetchEventAttendees`'s query — also the single source `data/queryKeys.ts`'s `AttendeesQueryParams` re-exports, instead of a third hand-typed copy. */
export interface EventAttendeesQuery {
	checkedIn?: boolean;
	q?: string;
	page?: number;
	pageSize?: number;
	dispatchId?: string;
	dispatchFilter?: 'received' | 'not_received';
}

/** Event-scoped attendee list (T071) — no Program required in the path. */
export async function fetchEventAttendees(
	eventId: string,
	query: EventAttendeesQuery = {},
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
	const route = `events/${encodeURIComponent(eventId)}/attendees${suffix}`;
	return normalizeSliceAttendeesResponse(
		((await apiRequest(route, {}, requestOptions(token))) ?? {}) as Record<string, unknown>,
	);
}

/**
 * `POST events/{evId}/checkin/undo` (R-006) — flips association label checked-in → registered.
 * No-op (still succeeds) when the contact is only registered.
 */
export async function undoCheckIn(
	eventId: string,
	contactId: string,
	options: DataServiceOptions = {},
): Promise<UndoCheckInResponse> {
	const { token } = options;
	const route = `events/${encodeURIComponent(eventId)}/checkin/undo`;
	return normalizeConfirmCheckInResponse(
		((await apiRequest(route, { method: 'POST', body: JSON.stringify({ contactId }) }, requestOptions(token))) ??
			{}) as Record<string, unknown>,
	);
}

/**
 * `DELETE events/{evId}/attendees/{contactId}` (R-006) — removes a registered attendee
 * entirely. Blocked while checked in (`attendee_checked_in`) — undo check-in first.
 */
export async function removeAttendee(
	eventId: string,
	contactId: string,
	options: DataServiceOptions = {},
): Promise<RemoveAttendeeResponse> {
	const { token } = options;
	const route = `events/${encodeURIComponent(eventId)}/attendees/${encodeURIComponent(contactId)}`;
	return normalizeRemoveAttendeeResponse(
		((await apiRequest(route, { method: 'DELETE' }, requestOptions(token))) ?? {}) as Record<string, unknown>,
	);
}

/** `GET events/{evId}/attendees/{contactId}` (010-attendee-detail-modal) — Basic Information + this-Event Attendee Journey. */
export async function fetchAttendeeDetail(
	eventId: string,
	contactId: string,
	options: DataServiceOptions = {},
): Promise<AttendeeDetail> {
	const { token } = options;
	const route = `events/${encodeURIComponent(eventId)}/attendees/${encodeURIComponent(contactId)}`;
	return normalizeAttendeeDetailResponse(
		((await apiRequest(route, {}, requestOptions(token))) ?? {}) as Record<string, unknown>,
	);
}

/**
 * `GET attendees/{contactId}/communications` (010-attendee-detail-modal) — "Show all
 * communications" expansion. Not Event-scoped — `eventId` is the currently-open Event, sent as a
 * required query param for "part of this event" tagging. Real cross-Event/HubSpot merge is gated
 * on `HS-011` (docs/hubspot-ops-todo.md) — until that scope is granted, the Backend degrades to a
 * `502` (thrown as an `ApiError` here), which the caller should treat like any other fetch failure
 * (keep showing the base this-Event view, offer retry) rather than a special case.
 */
export async function fetchAttendeeCommunications(
	contactId: string,
	eventId: string,
	options: DataServiceOptions = {},
): Promise<AttendeeCommunicationsResponse> {
	const { token } = options;
	const route = `attendees/${encodeURIComponent(contactId)}/communications?eventId=${encodeURIComponent(eventId)}`;
	return normalizeAttendeeCommunicationsResponse(
		((await apiRequest(route, {}, requestOptions(token))) ?? {}) as Record<string, unknown>,
	);
}

function attendeeNotesRoute(eventId: string, contactId: string, suffix = ''): string {
	return `events/${encodeURIComponent(eventId)}/attendees/${encodeURIComponent(contactId)}/notes${suffix}`;
}

/**
 * `GET events/{evId}/attendees/{contactId}/notes?allEvents=false` (015-conversation-notes,
 * US2/US5) — a dedicated, audited fetch, separate from `fetchAttendeeDetail`. `allEvents: true`
 * merges every other event's notes for this contactId, each tagged with its own `eventId`.
 */
export async function fetchAttendeeNotes(
	eventId: string,
	contactId: string,
	options: DataServiceOptions & { allEvents?: boolean } = {},
): Promise<AttendeeNotesResponse> {
	const { token, allEvents } = options;
	const suffix = allEvents ? '?allEvents=true' : '';
	return normalizeAttendeeNotesResponse(
		((await apiRequest(attendeeNotesRoute(eventId, contactId, suffix), {}, requestOptions(token))) ??
			{}) as Record<string, unknown>,
	);
}

/** `POST events/{evId}/attendees/{contactId}/notes` (015-conversation-notes, US2) — admin only. */
export async function createAttendeeNote(
	eventId: string,
	contactId: string,
	content: string,
	options: DataServiceOptions = {},
): Promise<ConversationNoteEntry> {
	const { token } = options;
	return normalizeConversationNoteEntry(
		((await apiRequest(
			attendeeNotesRoute(eventId, contactId),
			{ method: 'POST', body: JSON.stringify({ content }) },
			requestOptions(token),
		)) ?? {}) as Record<string, unknown>,
	);
}

/**
 * `PATCH events/{evId}/attendees/{contactId}/notes/{noteId}` (015-conversation-notes, US3) —
 * any admin may edit any note, not just its original author (ADR-019 decision #5).
 */
export async function updateAttendeeNote(
	eventId: string,
	contactId: string,
	noteId: string,
	content: string,
	options: DataServiceOptions = {},
): Promise<ConversationNoteEntry> {
	const { token } = options;
	return normalizeConversationNoteEntry(
		((await apiRequest(
			attendeeNotesRoute(eventId, contactId, `/${encodeURIComponent(noteId)}`),
			{ method: 'PATCH', body: JSON.stringify({ content }) },
			requestOptions(token),
		)) ?? {}) as Record<string, unknown>,
	);
}

/**
 * `DELETE events/{evId}/attendees/{contactId}/notes/{noteId}` (015-conversation-notes, US3) —
 * soft-delete; idempotent. Any admin may delete any note, not just its original author.
 */
export async function deleteAttendeeNote(
	eventId: string,
	contactId: string,
	noteId: string,
	options: DataServiceOptions = {},
): Promise<void> {
	const { token } = options;
	await apiRequest(
		attendeeNotesRoute(eventId, contactId, `/${encodeURIComponent(noteId)}`),
		{ method: 'DELETE' },
		requestOptions(token),
	);
}

/** `POST events/{evId}/attendees/{contactId}/lead` (014-lead-generation US1) — admin only. */
export async function generateAttendeeLead(
	eventId: string,
	contactId: string,
	body: GenerateLeadRequestBody = {},
	options: DataServiceOptions = {},
): Promise<GenerateLeadResponse> {
	const { token } = options;
	const route = `events/${encodeURIComponent(eventId)}/attendees/${encodeURIComponent(contactId)}/lead`;
	return normalizeGenerateLeadResponse(
		((await apiRequest(route, { method: 'POST', body: JSON.stringify(body) }, requestOptions(token))) ??
			{}) as Record<string, unknown>,
	);
}

/** `POST events/{evId}/attendees/lead-batch` (014-lead-generation US3) — admin only. */
export async function generateAttendeeLeadsBatch(
	eventId: string,
	body: GenerateLeadBatchRequestBody,
	options: DataServiceOptions = {},
): Promise<GenerateLeadBatchResponse> {
	const { token } = options;
	const route = `events/${encodeURIComponent(eventId)}/attendees/lead-batch`;
	return normalizeGenerateLeadBatchResponse(
		((await apiRequest(route, { method: 'POST', body: JSON.stringify(body) }, requestOptions(token))) ??
			{}) as Record<string, unknown>,
	);
}

export async function adjustCapacity(
	eventId: string,
	direction: AdjustCapacityDirection,
	options: DataServiceOptions = {},
): Promise<CapacityStatus> {
	const { token } = options;
	const route = `events/${encodeURIComponent(eventId)}/capacity/adjust`;
	return normalizeCapacityStatusResponse(
		((await apiRequest(
			route,
			{ method: 'POST', body: JSON.stringify({ direction }) },
			requestOptions(token),
		)) ?? {}) as Record<string, unknown>,
	);
}

export async function fetchThemePreference(options: DataServiceOptions = {}): Promise<ThemePreference> {
	const { token } = options;
	return normalizeThemePreferenceResponse(
		((await apiRequest('user/prefs', {}, requestOptions(token))) ?? {}) as Record<string, unknown>,
	);
}

export async function updateThemePreference(
	theme: ThemeId,
	options: DataServiceOptions = {},
): Promise<ThemePreference> {
	const { token } = options;
	return normalizeThemePreferenceResponse(
		((await apiRequest(
			'user/prefs/theme',
			{ method: 'PUT', body: JSON.stringify({ theme }) },
			requestOptions(token),
		)) ?? {}) as Record<string, unknown>,
	);
}

export async function createProgram(
	body: CreateCatalogProgramBody,
	options: DataServiceOptions = {},
): Promise<{ program: CatalogProgramRecord }> {
	const { token } = options;
	return (await apiRequest(
		'/catalog/program',
		{ method: 'POST', body: JSON.stringify(body) },
		requestOptions(token),
	)) as { program: CatalogProgramRecord };
}

export async function updateProgram(
	id: string,
	body: PatchCatalogProgramBody,
	options: DataServiceOptions = {},
): Promise<{ program: CatalogProgramRecord }> {
	const { token } = options;
	return (await apiRequest(
		`/catalog/program/${encodeURIComponent(id)}`,
		{ method: 'PATCH', body: JSON.stringify(body) },
		requestOptions(token),
	)) as { program: CatalogProgramRecord };
}

export async function createEvent(
	body: CreateCatalogEventBody,
	options: DataServiceOptions = {},
): Promise<{ event: CatalogEventRecord }> {
	const { token } = options;
	return (await apiRequest(
		'/catalog/event',
		{ method: 'POST', body: JSON.stringify(body) },
		requestOptions(token),
	)) as { event: CatalogEventRecord };
}

export async function updateEvent(
	id: string,
	body: PatchCatalogEventBody,
	options: DataServiceOptions = {},
): Promise<{ event: CatalogEventRecord }> {
	const { token } = options;
	return (await apiRequest(
		`/catalog/event/${encodeURIComponent(id)}`,
		{ method: 'PATCH', body: JSON.stringify(body) },
		requestOptions(token),
	)) as { event: CatalogEventRecord };
}

function emailRoute(eventId: string, suffix = ''): string {
	return `events/${encodeURIComponent(eventId)}/email${suffix}`;
}

export async function fetchEmailLimits(
	eventId: string,
	options: DataServiceOptions = {},
): Promise<EmailDispatchLimits> {
	const { token } = options;
	return normalizeEmailLimitsResponse(
		((await apiRequest(emailRoute(eventId, '/limits'), {}, requestOptions(token))) ?? {}) as Record<
			string,
			unknown
		>,
	);
}

/** Portfolio-wide aggregate for the Overview "Emails scheduled this week" tile (FE-REDESIGN-020) — one call, not one per event. */
export async function fetchScheduledEmailSummary(options: DataServiceOptions = {}): Promise<ScheduledEmailSummary> {
	const { token } = options;
	return normalizeScheduledEmailSummaryResponse(
		((await apiRequest('events/scheduled-email-summary', {}, requestOptions(token))) ?? {}) as Record<
			string,
			unknown
		>,
	);
}

export async function fetchEmailTemplates(
	eventId: string,
	options: DataServiceOptions = {},
): Promise<EmailTemplatesListResponse> {
	const { token } = options;
	return normalizeEmailTemplatesResponse(
		((await apiRequest(emailRoute(eventId, '/templates'), {}, requestOptions(token))) ?? {}) as Record<
			string,
			unknown
		>,
	);
}

export async function fetchEmailSegments(
	eventId: string,
	options: DataServiceOptions = {},
): Promise<EmailSegmentsListResponse> {
	const { token } = options;
	return normalizeEmailSegmentsResponse(
		((await apiRequest(emailRoute(eventId, '/segments'), {}, requestOptions(token))) ?? {}) as Record<
			string,
			unknown
		>,
	);
}

export async function previewEmailDispatch(
	eventId: string,
	body: EmailPreviewRequestBody,
	options: DataServiceOptions = {},
): Promise<EmailPreviewResponse> {
	const { token } = options;
	return normalizeEmailPreviewResponse(
		((await apiRequest(
			emailRoute(eventId, '/preview'),
			{ method: 'POST', body: JSON.stringify(body) },
			requestOptions(token),
		)) ?? {}) as Record<string, unknown>,
	);
}

export async function createEmailDispatch(
	eventId: string,
	body: CreateEmailDispatchBody,
	options: DataServiceOptions = {},
): Promise<CreateEmailDispatchResponse> {
	const { token } = options;
	return normalizeCreateEmailDispatchResponse(
		((await apiRequest(
			emailRoute(eventId, '/dispatches'),
			{ method: 'POST', body: JSON.stringify(body) },
			requestOptions(token),
		)) ?? {}) as Record<string, unknown>,
	);
}

export interface FetchEmailDispatchesQuery {
	view?: 'scheduled' | 'log';
	page?: number;
	pageSize?: number;
}

export async function fetchEmailDispatches(
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
	return normalizeEmailDispatchListResponse(
		((await apiRequest(emailRoute(eventId, `/dispatches${suffix}`), {}, requestOptions(token))) ?? {}) as Record<
			string,
			unknown
		>,
	);
}

export async function fetchEmailDispatchDetail(
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
	return normalizeEmailDispatchDetailResponse(
		((await apiRequest(
			emailRoute(eventId, `/dispatches/${encodeURIComponent(dispatchId)}${suffix}`),
			{},
			requestOptions(token),
		)) ?? {}) as Record<string, unknown>,
	);
}

export async function updateEmailDispatch(
	eventId: string,
	dispatchId: string,
	body: PatchEmailDispatchBody,
	options: DataServiceOptions = {},
): Promise<EmailDispatchListItem> {
	const { token } = options;
	const response = (await apiRequest(
		emailRoute(eventId, `/dispatches/${encodeURIComponent(dispatchId)}`),
		{ method: 'PATCH', body: JSON.stringify(body) },
		requestOptions(token),
	)) as Record<string, unknown>;
	return normalizeEmailDispatchListItem(response);
}

export async function cancelEmailDispatch(
	eventId: string,
	dispatchId: string,
	options: DataServiceOptions = {},
): Promise<CancelEmailDispatchResponse> {
	const { token } = options;
	return normalizeCancelEmailDispatchResponse(
		((await apiRequest(
			emailRoute(eventId, `/dispatches/${encodeURIComponent(dispatchId)}`),
			{ method: 'DELETE' },
			requestOptions(token),
		)) ?? {}) as Record<string, unknown>,
	);
}

/**
 * Binds the session token to a data-service method whose last parameter is `DataServiceOptions`
 * — the shape of most methods below. Preserves each method's exact parameter/return types via
 * generic inference, so `createDataService`'s returned shape is unchanged from hand-written
 * wrappers — it just stops re-typing every parameter list to do it (architecture review
 * candidate 6). A few methods merge extra per-call fields into `options` before calling through
 * (`fetchAuditLog`, `fetchCatalog`, `fetchAttendeeNotes`) and stay hand-written since that merge
 * is real, method-specific behaviour, not boilerplate.
 */
function bindOptions<Args extends unknown[], R>(
	fn: (...args: [...Args, DataServiceOptions]) => Promise<R>,
	options: DataServiceOptions,
): (...args: Args) => Promise<R> {
	return (...args: Args) => fn(...args, options);
}

/** Binds the session token to all data-service methods for use in React components. */
export function createDataService(token?: string | null) {
	const options: DataServiceOptions = { token };
	return {
		fetchAuditLog: (
			eventId?: string,
			query?: {
				page?: number;
				pageSize?: number;
				action?: string;
				actor?: string;
				resourceType?: string;
				resourceId?: string;
			},
		) => fetchAuditLog(eventId, { ...options, ...query }),
		fetchCatalog: (catalogOptions?: Omit<FetchCatalogOptions, 'token'>) =>
			fetchCatalog({ ...options, ...catalogOptions }),
		fetchEventCapacityStatus: bindOptions(fetchEventCapacityStatus, options),
		fetchCapacitySummary: bindOptions(fetchCapacitySummary, options),
		fetchEventAttendees: bindOptions(fetchEventAttendees, options),
		checkInScan: bindOptions(checkInScan, options),
		lookupAttendeeByQr: bindOptions(lookupAttendeeByQr, options),
		confirmCheckIn: bindOptions(confirmCheckIn, options),
		undoCheckIn: bindOptions(undoCheckIn, options),
		removeAttendee: bindOptions(removeAttendee, options),
		fetchAttendeeDetail: bindOptions(fetchAttendeeDetail, options),
		fetchAttendeeCommunications: bindOptions(fetchAttendeeCommunications, options),
		fetchAttendeeNotes: (eventId: string, contactId: string, query?: { allEvents?: boolean }) =>
			fetchAttendeeNotes(eventId, contactId, { ...options, ...query }),
		createAttendeeNote: bindOptions(createAttendeeNote, options),
		updateAttendeeNote: bindOptions(updateAttendeeNote, options),
		deleteAttendeeNote: bindOptions(deleteAttendeeNote, options),
		generateAttendeeLead: bindOptions(generateAttendeeLead, options),
		generateAttendeeLeadsBatch: bindOptions(generateAttendeeLeadsBatch, options),
		adjustCapacity: bindOptions(adjustCapacity, options),
		createProgram: bindOptions(createProgram, options),
		updateProgram: bindOptions(updateProgram, options),
		createEvent: bindOptions(createEvent, options),
		updateEvent: bindOptions(updateEvent, options),
		fetchEmailLimits: bindOptions(fetchEmailLimits, options),
		fetchScheduledEmailSummary: bindOptions(fetchScheduledEmailSummary, options),
		fetchEmailTemplates: bindOptions(fetchEmailTemplates, options),
		fetchEmailSegments: bindOptions(fetchEmailSegments, options),
		previewEmailDispatch: bindOptions(previewEmailDispatch, options),
		createEmailDispatch: bindOptions(createEmailDispatch, options),
		fetchEmailDispatches: bindOptions(fetchEmailDispatches, options),
		fetchEmailDispatchDetail: bindOptions(fetchEmailDispatchDetail, options),
		updateEmailDispatch: bindOptions(updateEmailDispatch, options),
		cancelEmailDispatch: bindOptions(cancelEmailDispatch, options),
		getThemePreference: bindOptions(fetchThemePreference, options),
		setThemePreference: bindOptions(updateThemePreference, options),
	};
}

export type DataService = ReturnType<typeof createDataService>;
