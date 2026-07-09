/**
 * Map ScriptRunner API contract shapes to UI display shapes used by views.
 * Mock data already uses the UI shape; live responses are normalized here.
 */

import type {
	Attendee,
	CancelEmailDispatchResponse,
	CapacityStatus,
	CheckInContactSummary,
	CheckInScanResponse,
	ConfirmCheckInResponse,
	CreateEmailDispatchResponse,
	DispatchRecipientRow,
	EmailDispatchDetailResponse,
	EmailDispatchLimits,
	EmailDispatchListItem,
	EmailDispatchListResponse,
	EmailPreviewResponse,
	EmailSegmentsListResponse,
	EmailTemplatesListResponse,
	Event,
	CatalogEvent,
	CatalogProgram,
	CatalogResponse,
	HubSpotSegmentOption,
	MarketingTemplateOption,
	SliceAttendeesResponse,
} from '../types';

const ATTENDEE_STATUS_FROM_API: Record<string, Attendee['status']> = {
	registered: 'Registered',
	checked_in: 'Checked In',
	cancelled: 'Cancelled',
};

function formatEventDate(iso: string | undefined): string {
	if (!iso) {
		return '';
	}
	return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(iso));
}

function toDateIso(iso: string | undefined): string {
	if (!iso) {
		return '';
	}
	return iso.split('T')[0] ?? '';
}

function isUiEventShape(raw: Record<string, unknown>): boolean {
	return Boolean(raw.date && !raw.startDate);
}

function isUiAttendeeShape(raw: Record<string, unknown>): boolean {
	return Boolean(raw.name && !raw.firstName && !raw.lastName);
}

export function normalizeEvent(raw: Record<string, unknown> | null | undefined): Event | null {
	if (!raw || typeof raw !== 'object') {
		return null;
	}

	if (isUiEventShape(raw)) {
		return raw as unknown as Event;
	}

	const startDate = typeof raw.startDate === 'string' ? raw.startDate : '';
	const endDateIso = typeof raw.endDate === 'string' ? raw.endDate : undefined;

	return {
		id: String(raw.id ?? ''),
		name: String(raw.name ?? ''),
		date: typeof raw.date === 'string' ? raw.date : formatEventDate(startDate),
		dateIso: typeof raw.dateIso === 'string' ? raw.dateIso : toDateIso(startDate),
		endDate:
			typeof raw.endDate === 'string' && !endDateIso?.includes('T')
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

export function normalizeAttendee(raw: Record<string, unknown> | null | undefined): Attendee {
	if (!raw || typeof raw !== 'object') {
		return raw as unknown as Attendee;
	}

	if (isUiAttendeeShape(raw)) {
		return raw as unknown as Attendee;
	}

	const firstName = String(raw.firstName ?? '');
	const lastName = String(raw.lastName ?? '');
	const combinedName = [firstName, lastName].filter(Boolean).join(' ');
	const apiStatus = typeof raw.status === 'string' ? raw.status : '';
	const status = ATTENDEE_STATUS_FROM_API[apiStatus] ?? (raw.status as Attendee['status']) ?? 'Registered';

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

export function normalizeEventsResponse(response: Record<string, unknown>): { events: Event[] } & Record<string, unknown> {
	const events = Array.isArray(response.events) ? response.events : [];
	return {
		...response,
		events: events.map((event) => normalizeEvent(event as Record<string, unknown>)).filter(Boolean) as Event[],
	};
}

export function normalizeEventResponse(
	response: Record<string, unknown> | null | undefined,
): { event: Event | null } {
	if (response && typeof response === 'object' && 'event' in response) {
		return { event: normalizeEvent(response.event as Record<string, unknown>) };
	}
	return { event: normalizeEvent(response ?? undefined) };
}

export function normalizeAttendeesResponse(
	response: Record<string, unknown>,
): { attendees: Attendee[] } & Record<string, unknown> {
	const attendees = Array.isArray(response.attendees) ? response.attendees : [];
	return {
		...response,
		attendees: attendees.map((attendee) => normalizeAttendee(attendee as Record<string, unknown>)),
	};
}

function copyOptionalString(raw: Record<string, unknown>, key: string): string | undefined {
	const value = raw[key];
	return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function copyOptionalNumber(raw: Record<string, unknown>, key: string): number | undefined {
	const value = raw[key];
	return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function normalizeCatalogEvent(raw: Record<string, unknown>): CatalogEvent {
	return {
		id: String(raw.id ?? ''),
		name: String(raw.name ?? ''),
		partsAttendedOption: String(raw.partsAttendedOption ?? ''),
		attendanceProperty: String(
			raw.attendanceProperty ?? 'atlassian_event__customer_event_attendance',
		),
		archived: Boolean(raw.archived),
		owner: copyOptionalString(raw, 'owner'),
		description: copyOptionalString(raw, 'description'),
		date: copyOptionalString(raw, 'date'),
		location: copyOptionalString(raw, 'location'),
		capacity: copyOptionalNumber(raw, 'capacity'),
		walkInFormUrl: copyOptionalString(raw, 'walkInFormUrl'),
	};
}

function normalizeCatalogProgram(raw: Record<string, unknown>): CatalogProgram {
	const events = Array.isArray(raw.events) ? raw.events : [];
	const formIds = raw.hubspotFormIds;
	const legacyFormId = raw.hubspotFormId;
	const hubspotFormIds = Array.isArray(formIds)
		? formIds.map(String)
		: legacyFormId
			? [String(legacyFormId)]
			: [];

	return {
		id: String(raw.id ?? ''),
		name: String(raw.name ?? ''),
		hubspotFormIds,
		archived: Boolean(raw.archived),
		events: events.map((event) => normalizeCatalogEvent(event as Record<string, unknown>)),
		description: copyOptionalString(raw, 'description'),
		startDate: copyOptionalString(raw, 'startDate'),
		endDate: copyOptionalString(raw, 'endDate'),
		location: copyOptionalString(raw, 'location'),
		timezone: copyOptionalString(raw, 'timezone'),
	};
}

export function normalizeSliceAttendeesResponse(response: Record<string, unknown>): SliceAttendeesResponse {
	const attendees = Array.isArray(response.attendees) ? response.attendees : [];
	return {
		attendees: attendees.map((row) => {
			const raw = row as Record<string, unknown>;
			return {
				contactId: String(raw.contactId ?? ''),
				firstName: String(raw.firstName ?? ''),
				lastName: String(raw.lastName ?? ''),
				company: String(raw.company ?? ''),
				email: String(raw.email ?? ''),
				accountManager: String(raw.accountManager ?? ''),
				attendeeType: raw.attendeeType === 'partner' ? 'partner' : 'customer',
				checkedIn: Boolean(raw.checkedIn),
				checkedInAt: null,
			};
		}),
		page: Number(response.page ?? 1),
		pageSize: Number(response.pageSize ?? 50),
		total: Number(response.total ?? attendees.length),
	};
}

export function normalizeCatalogResponse(response: Record<string, unknown>): CatalogResponse {
	const programs = Array.isArray(response.programs) ? response.programs : [];
	return {
		programs: programs.map((program) => normalizeCatalogProgram(program as Record<string, unknown>)),
	};
}

function normalizeCheckInContact(raw: Record<string, unknown>): CheckInContactSummary {
	const attendeeType = raw.attendeeType;
	return {
		contactId: String(raw.contactId ?? ''),
		firstName: String(raw.firstName ?? ''),
		lastName: String(raw.lastName ?? ''),
		company: String(raw.company ?? ''),
		email: String(raw.email ?? ''),
		accountManager: String(raw.accountManager ?? ''),
		attendeeType: attendeeType === 'partner' ? 'partner' : attendeeType === 'customer' ? 'customer' : null,
		checkedIn: Boolean(raw.checkedIn),
	};
}

export function normalizeCheckInScanResponse(response: Record<string, unknown>): CheckInScanResponse {
	const contactRaw = response.contact;
	const contact =
		contactRaw && typeof contactRaw === 'object'
			? normalizeCheckInContact(contactRaw as Record<string, unknown>)
			: normalizeCheckInContact({});

	return {
		contact,
		programId: String(response.programId ?? ''),
		eventId: String(response.eventId ?? ''),
	};
}

export function normalizeConfirmCheckInResponse(response: Record<string, unknown>): ConfirmCheckInResponse {
	const attendeeType = response.attendeeType;
	return {
		contactId: String(response.contactId ?? ''),
		checkedIn: Boolean(response.checkedIn),
		alreadyCheckedIn: Boolean(response.alreadyCheckedIn),
		attendeeType: attendeeType === 'partner' ? 'partner' : attendeeType === 'customer' ? 'customer' : null,
	};
}

export function normalizeCapacityStatusResponse(response: Record<string, unknown>): CapacityStatus {
	const rawCapacity = response.capacity;
	const capacity =
		rawCapacity === null || rawCapacity === undefined
			? null
			: Number.isFinite(Number(rawCapacity)) && Number(rawCapacity) > 0
				? Number(rawCapacity)
				: null;

	return {
		programId: String(response.programId ?? ''),
		eventId: String(response.eventId ?? ''),
		capacity,
		checkedInCount: Number(response.checkedInCount ?? 0),
		departureCount: Number(response.departureCount ?? 0),
		liveAttendance: Number(response.liveAttendance ?? 0),
	};
}

function normalizeMarketingTemplate(raw: Record<string, unknown>): MarketingTemplateOption {
	return {
		id: String(raw.id ?? ''),
		name: String(raw.name ?? ''),
		description: copyOptionalString(raw, 'description'),
	};
}

function normalizeHubSpotSegment(raw: Record<string, unknown>): HubSpotSegmentOption {
	const kind = raw.kind;
	return {
		id: String(raw.id ?? ''),
		name: String(raw.name ?? ''),
		kind: kind === 'static' ? 'static' : 'active',
	};
}

function normalizeDispatchStatus(value: unknown): EmailDispatchListItem['status'] {
	const status = String(value ?? 'pending');
	if (
		status === 'pending' ||
		status === 'processing' ||
		status === 'completed' ||
		status === 'failed' ||
		status === 'cancelled'
	) {
		return status;
	}
	return 'pending';
}

function normalizeEmailDispatchListItem(raw: Record<string, unknown>): EmailDispatchListItem {
	const item: EmailDispatchListItem = {
		dispatchId: String(raw.dispatchId ?? ''),
		dispatchName: String(raw.dispatchName ?? ''),
		templateName: String(raw.templateName ?? ''),
		audienceSummary: String(raw.audienceSummary ?? ''),
		status: normalizeDispatchStatus(raw.status),
		scheduledAtUtc: raw.scheduledAtUtc === null || raw.scheduledAtUtc === undefined ? null : String(raw.scheduledAtUtc),
		timezone: raw.timezone === null || raw.timezone === undefined ? null : String(raw.timezone),
		recipientCountPlanned: Number(raw.recipientCountPlanned ?? 0),
		recipientCountSent: Number(raw.recipientCountSent ?? 0),
		createdBy: String(raw.createdBy ?? ''),
		createdAt: String(raw.createdAt ?? ''),
	};
	if (raw.lockWarning === true) {
		item.lockWarning = true;
	}
	return item;
}

function normalizeDispatchRecipient(raw: Record<string, unknown>): DispatchRecipientRow {
	return {
		dispatchId: String(raw.dispatchId ?? ''),
		contactId: String(raw.contactId ?? ''),
		email: String(raw.email ?? ''),
		outcome: 'sent',
		sentAt: String(raw.sentAt ?? ''),
	};
}

export function normalizeEmailLimitsResponse(response: Record<string, unknown>): EmailDispatchLimits {
	return {
		dispatchLimitPerHour: Number(response.dispatchLimitPerHour ?? 10),
		dispatchUsedThisHour: Number(response.dispatchUsedThisHour ?? 0),
		largeSendThreshold: Number(response.largeSendThreshold ?? 50),
	};
}

export function normalizeEmailTemplatesResponse(response: Record<string, unknown>): EmailTemplatesListResponse {
	const templates = Array.isArray(response.templates) ? response.templates : [];
	return {
		templates: templates.map((row) => normalizeMarketingTemplate(row as Record<string, unknown>)),
	};
}

export function normalizeEmailSegmentsResponse(response: Record<string, unknown>): EmailSegmentsListResponse {
	const segments = Array.isArray(response.segments) ? response.segments : [];
	return {
		segments: segments.map((row) => normalizeHubSpotSegment(row as Record<string, unknown>)),
	};
}

export function normalizeEmailPreviewResponse(response: Record<string, unknown>): EmailPreviewResponse {
	return {
		recipientCount: Number(response.recipientCount ?? 0),
	};
}

export function normalizeCreateEmailDispatchResponse(response: Record<string, unknown>): CreateEmailDispatchResponse {
	return {
		dispatchId: String(response.dispatchId ?? ''),
		status: normalizeDispatchStatus(response.status),
		recipientCountPlanned: Number(response.recipientCountPlanned ?? 0),
		scheduledAtUtc:
			response.scheduledAtUtc === null || response.scheduledAtUtc === undefined ? null : String(response.scheduledAtUtc),
		timezone: response.timezone === null || response.timezone === undefined ? null : String(response.timezone),
	};
}

export function normalizeEmailDispatchListResponse(response: Record<string, unknown>): EmailDispatchListResponse {
	const dispatches = Array.isArray(response.dispatches) ? response.dispatches : [];
	return {
		dispatches: dispatches.map((row) => normalizeEmailDispatchListItem(row as Record<string, unknown>)),
		page: Number(response.page ?? 1),
		pageSize: Number(response.pageSize ?? 50),
		total: Number(response.total ?? dispatches.length),
	};
}

export function normalizeEmailDispatchDetailResponse(response: Record<string, unknown>): EmailDispatchDetailResponse {
	const dispatchRaw = response.dispatch;
	const dispatch =
		dispatchRaw && typeof dispatchRaw === 'object'
			? normalizeEmailDispatchListItem(dispatchRaw as Record<string, unknown>)
			: normalizeEmailDispatchListItem({});
	const completedAt =
		dispatchRaw && typeof dispatchRaw === 'object'
			? (dispatchRaw as Record<string, unknown>).completedAt === null ||
				(dispatchRaw as Record<string, unknown>).completedAt === undefined
				? null
				: String((dispatchRaw as Record<string, unknown>).completedAt)
			: null;
	const recipients = Array.isArray(response.recipients) ? response.recipients : [];

	return {
		dispatch: { ...dispatch, completedAt },
		recipients: recipients.map((row) => normalizeDispatchRecipient(row as Record<string, unknown>)),
		page: Number(response.page ?? 1),
		pageSize: Number(response.pageSize ?? 50),
		total: Number(response.total ?? recipients.length),
	};
}

export function normalizeCancelEmailDispatchResponse(response: Record<string, unknown>): CancelEmailDispatchResponse {
	return {
		dispatchId: String(response.dispatchId ?? ''),
		status: 'cancelled',
	};
}
