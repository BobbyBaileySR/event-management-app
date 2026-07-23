/**
 * Map ScriptRunner API contract shapes to UI display shapes used by views.
 * Mock data already uses the UI shape; live responses are normalized here.
 */

import type {
	AttendeeCommunicationsResponse,
	AttendeeDetail,
	AttendeeJourneyStep,
	AttendeeLookupResponse,
	AttendeeNotesResponse,
	AttendeeTimelineItem,
	CancelEmailDispatchResponse,
	CapacityStatus,
	CapacitySummaryResponse,
	CheckInContactSummary,
	CheckInScanResponse,
	CommunicationTag,
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
	GenerateLeadBatchResponse,
	GenerateLeadBatchResultEntry,
	GenerateLeadResponse,
	LeadGenerationBatchOutcome,
	CatalogEvent,
	CatalogEventPublishState,
	CatalogEventStatus,
	CatalogEventSummary,
	CatalogProgram,
	CatalogResponse,
	ConversationNoteEntry,
	HubSpotSegmentOption,
	MarketingTemplateOption,
	RegistrationAnswerHistoryEntry,
	RemoveAttendeeResponse,
	ScheduledEmailSummary,
	SliceAttendeesResponse,
	ThemePreference,
} from '../types';
import { DEFAULT_THEME_ID, isThemeId } from '../theme/themeTokens';

function copyOptionalString(raw: Record<string, unknown>, key: string): string | undefined {
	const value = raw[key];
	return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function copyOptionalNumber(raw: Record<string, unknown>, key: string): number | undefined {
	const value = raw[key];
	return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function normalizeCatalogEventStatus(value: unknown): CatalogEventStatus {
	return value === 'cancelled' ? 'cancelled' : 'active';
}

function normalizeCatalogPublishState(value: unknown): CatalogEventPublishState {
	return value === 'published' ? 'published' : 'draft';
}

function normalizeCatalogEvent(raw: Record<string, unknown>): CatalogEvent {
	const programId = raw.programId;
	const archivedVia = raw.archivedViaProgramId;
	const event: CatalogEvent = {
		id: String(raw.id ?? ''),
		programId: typeof programId === 'string' ? programId : null,
		name: String(raw.name ?? ''),
		start: String(raw.start ?? ''),
		status: normalizeCatalogEventStatus(raw.status),
		publishState: normalizeCatalogPublishState(raw.publishState),
		archived: Boolean(raw.archived),
	};
	const end = copyOptionalString(raw, 'end');
	if (end) {
		event.end = end;
	}
	const location = copyOptionalString(raw, 'location');
	if (location) {
		event.location = location;
	}
	const capacity = copyOptionalNumber(raw, 'capacity');
	if (capacity !== undefined) {
		event.capacity = capacity;
	}
	const walkInFormUrl = copyOptionalString(raw, 'walkInFormUrl');
	if (walkInFormUrl) {
		event.walkInFormUrl = walkInFormUrl;
	}
	const registrationFormUrl = copyOptionalString(raw, 'registrationFormUrl');
	if (registrationFormUrl) {
		event.registrationFormUrl = registrationFormUrl;
	}
	const registrationSlug = copyOptionalString(raw, 'registrationSlug');
	if (registrationSlug) {
		event.registrationSlug = registrationSlug;
	}
	const owner = copyOptionalString(raw, 'owner');
	if (owner) {
		event.owner = owner;
	}
	if (typeof archivedVia === 'string') {
		event.archivedViaProgramId = archivedVia;
	} else if (archivedVia === null) {
		event.archivedViaProgramId = null;
	}
	return event;
}

function normalizeCatalogProgram(raw: Record<string, unknown>): CatalogProgram {
	return {
		id: String(raw.id ?? ''),
		name: String(raw.name ?? ''),
		archived: Boolean(raw.archived),
		description: copyOptionalString(raw, 'description'),
		startDate: copyOptionalString(raw, 'startDate'),
		endDate: copyOptionalString(raw, 'endDate'),
	};
}

function normalizeCatalogEventSummary(raw: Record<string, unknown>): CatalogEventSummary {
	return normalizeCatalogEvent(raw);
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
				checkedInAt: typeof raw.checkedInAt === 'string' ? raw.checkedInAt : null,
			};
		}),
		page: Number(response.page ?? 1),
		pageSize: Number(response.pageSize ?? 50),
		total: Number(response.total ?? attendees.length),
	};
}

export function normalizeCatalogResponse(response: Record<string, unknown>): CatalogResponse {
	const programs = Array.isArray(response.programs) ? response.programs : [];
	const events = Array.isArray(response.events) ? response.events : [];
	return {
		events: events.map((event) => normalizeCatalogEventSummary(event as Record<string, unknown>)),
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

export function normalizeAttendeeLookupResponse(response: Record<string, unknown>): AttendeeLookupResponse {
	const contactRaw = response.contact;
	const contact =
		contactRaw && typeof contactRaw === 'object'
			? normalizeCheckInContact(contactRaw as Record<string, unknown>)
			: normalizeCheckInContact({});

	return {
		contact,
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
		checkedInAt: typeof response.checkedInAt === 'string' ? response.checkedInAt : null,
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

export function normalizeCapacitySummaryResponse(response: Record<string, unknown>): CapacitySummaryResponse {
	const events = Array.isArray(response.events) ? response.events : [];
	return {
		events: events.map((row) => {
			const raw = row as Record<string, unknown>;
			const rawCapacity = raw.capacity;
			const capacity =
				rawCapacity === null || rawCapacity === undefined
					? null
					: Number.isFinite(Number(rawCapacity)) && Number(rawCapacity) > 0
						? Number(rawCapacity)
						: null;
			const programId = raw.programId;
			return {
				eventId: String(raw.eventId ?? ''),
				programId: typeof programId === 'string' ? programId : null,
				capacity,
				registeredCount: Number(raw.registeredCount ?? 0),
				checkedInCount: Number(raw.checkedInCount ?? 0),
			};
		}),
	};
}

/** Never trust a raw `theme` value for gating (research R-002) — fall back to Aurora if unrecognized. */
export function normalizeThemePreferenceResponse(response: Record<string, unknown>): ThemePreference {
	const rawTheme = String(response.theme ?? '');
	const rawToast = response.celebrationToastMessage;
	const celebrationToastMessage =
		typeof rawToast === 'string' && rawToast.trim().length > 0 ? rawToast.trim() : null;
	return {
		theme: isThemeId(rawTheme) ? rawTheme : DEFAULT_THEME_ID,
		celebrationAllowed: Boolean(response.celebrationAllowed),
		celebrationToastMessage,
		updatedAt: typeof response.updatedAt === 'string' ? response.updatedAt : undefined,
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

export function normalizeEmailDispatchListItem(raw: Record<string, unknown>): EmailDispatchListItem {
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
		ticketsEnabled: raw.ticketsEnabled === true,
	};
	if (raw.lockWarning === true) {
		item.lockWarning = true;
	}
	if (raw.audience && typeof raw.audience === 'object') {
		item.audience = raw.audience as EmailDispatchListItem['audience'];
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

export function normalizeScheduledEmailSummaryResponse(response: Record<string, unknown>): ScheduledEmailSummary {
	return {
		emailsScheduledThisWeek: Number(response.emailsScheduledThisWeek ?? 0),
		eventsWithScheduledEmails: Number(response.eventsWithScheduledEmails ?? 0),
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
		ticketsEnabled: response.ticketsEnabled === true,
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

export function normalizeRemoveAttendeeResponse(response: Record<string, unknown>): RemoveAttendeeResponse {
	return {
		contactId: String(response.contactId ?? ''),
		removed: Boolean(response.removed),
	};
}

const LEAD_OUTCOMES: readonly LeadGenerationBatchOutcome[] = ['created', 'updated', 'created_separate', 'failed'];

function normalizeLeadOutcome(value: unknown): LeadGenerationBatchOutcome {
	return (LEAD_OUTCOMES as readonly unknown[]).includes(value) ? (value as LeadGenerationBatchOutcome) : 'failed';
}

export function normalizeGenerateLeadResponse(response: Record<string, unknown>): GenerateLeadResponse {
	return {
		outcome: normalizeLeadOutcome(response.outcome) as GenerateLeadResponse['outcome'],
		leadId: String(response.leadId ?? ''),
	};
}

function normalizeGenerateLeadBatchResultEntry(raw: Record<string, unknown>): GenerateLeadBatchResultEntry {
	const entry: GenerateLeadBatchResultEntry = {
		contactId: String(raw.contactId ?? ''),
		outcome: normalizeLeadOutcome(raw.outcome),
	};
	const leadId = copyOptionalString(raw, 'leadId');
	if (leadId) {
		entry.leadId = leadId;
	}
	return entry;
}

export function normalizeGenerateLeadBatchResponse(response: Record<string, unknown>): GenerateLeadBatchResponse {
	const results = Array.isArray(response.results) ? response.results : [];
	return {
		results: results.map((entry) => normalizeGenerateLeadBatchResultEntry(entry as Record<string, unknown>)),
	};
}

const JOURNEY_STEP_TYPES: readonly AttendeeJourneyStep['type'][] = [
	'registered',
	'dispatch_sent',
	'dispatch_opened',
	'checked_in',
];

function normalizeJourneyStepType(value: unknown): AttendeeJourneyStep['type'] {
	return (JOURNEY_STEP_TYPES as readonly unknown[]).includes(value) ? (value as AttendeeJourneyStep['type']) : 'registered';
}

function copyNullableString(raw: Record<string, unknown>, key: string): string | null {
	const value = raw[key];
	return typeof value === 'string' ? value : null;
}

function normalizeAttendeeJourneyStep(raw: Record<string, unknown>): AttendeeJourneyStep {
	return {
		type: normalizeJourneyStepType(raw.type),
		timestamp: typeof raw.timestamp === 'string' ? raw.timestamp : null,
		label: String(raw.label ?? ''),
		source: 'this_event',
	};
}

function normalizeCommunicationTag(raw: unknown): CommunicationTag {
	const tag = raw as Record<string, unknown> | undefined;
	if (tag?.kind === 'other_event') {
		return { kind: 'other_event', eventName: String(tag.eventName ?? '') };
	}
	return { kind: 'external' };
}

/** Distinguishes a `CommunicationItem` (has `tag`) from a this-Event `AttendeeJourneyStep` within one merged timeline. */
function normalizeAttendeeTimelineItem(raw: Record<string, unknown>): AttendeeTimelineItem {
	if (raw.tag) {
		return {
			type: normalizeJourneyStepType(raw.type),
			timestamp: typeof raw.timestamp === 'string' ? raw.timestamp : null,
			label: String(raw.label ?? ''),
			source: raw.source === 'external' ? 'external' : 'other_event',
			tag: normalizeCommunicationTag(raw.tag),
		};
	}
	return normalizeAttendeeJourneyStep(raw);
}

/** Values authored directly by an anonymous public form submitter — never validated beyond shape (spec FR-007). */
function normalizeAnswerValue(value: unknown): string | string[] {
	if (Array.isArray(value)) {
		return value.map((item) => String(item ?? ''));
	}
	return String(value ?? '');
}

function normalizeAnswers(raw: unknown): Record<string, string | string[]> {
	if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
		return {};
	}
	const answers: Record<string, string | string[]> = {};
	for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
		answers[key] = normalizeAnswerValue(value);
	}
	return answers;
}

function normalizeRegistrationAnswerHistoryEntry(raw: Record<string, unknown>): RegistrationAnswerHistoryEntry {
	return {
		answers: normalizeAnswers(raw.answers),
		source: raw.source === 'amendment' ? 'amendment' : 'registration',
		observedAt: String(raw.observedAt ?? ''),
		slot: typeof raw.slot === 'number' ? raw.slot : 0,
	};
}

export function normalizeAttendeeDetailResponse(response: Record<string, unknown>): AttendeeDetail {
	const journey = Array.isArray(response.journey) ? response.journey : [];
	const registrationSource = response.registrationSource;
	const registrationAnswerHistory = Array.isArray(response.registrationAnswerHistory)
		? response.registrationAnswerHistory
		: [];
	return {
		contactId: String(response.contactId ?? ''),
		firstName: String(response.firstName ?? ''),
		lastName: String(response.lastName ?? ''),
		company: String(response.company ?? ''),
		email: String(response.email ?? ''),
		accountManager: String(response.accountManager ?? ''),
		attendeeType: response.attendeeType === 'partner' ? 'partner' : 'customer',
		checkedIn: Boolean(response.checkedIn),
		checkedInAt: typeof response.checkedInAt === 'string' ? response.checkedInAt : null,
		phone: copyNullableString(response, 'phone'),
		jobTitle: copyNullableString(response, 'jobTitle'),
		dietaryRequirement: copyNullableString(response, 'dietaryRequirement'),
		registrationSource:
			registrationSource === 'form' || registrationSource === 'walk-in' ? registrationSource : null,
		journey: journey.map((step) => normalizeAttendeeJourneyStep(step as Record<string, unknown>)),
		registrationAnswerHistory: registrationAnswerHistory.map((entry) =>
			normalizeRegistrationAnswerHistoryEntry(entry as Record<string, unknown>),
		),
	};
}

export function normalizeAttendeeCommunicationsResponse(
	response: Record<string, unknown>,
): AttendeeCommunicationsResponse {
	const timeline = Array.isArray(response.timeline) ? response.timeline : [];
	return {
		contactId: String(response.contactId ?? ''),
		cutoffTimestamp: String(response.cutoffTimestamp ?? ''),
		timeline: timeline.map((item) => normalizeAttendeeTimelineItem(item as Record<string, unknown>)),
	};
}

function normalizeConversationNoteEditHistoryEntry(
	raw: Record<string, unknown>,
): ConversationNoteEntry['editHistory'][number] {
	return {
		previousContent: String(raw.previousContent ?? ''),
		editorEmail: String(raw.editorEmail ?? ''),
		editedAt: String(raw.editedAt ?? ''),
	};
}

/** Note content is staff-authored free text — never trust shape beyond this (render with JSX `{text}` only). */
export function normalizeConversationNoteEntry(raw: Record<string, unknown>): ConversationNoteEntry {
	const editHistory = Array.isArray(raw.editHistory) ? raw.editHistory : [];
	return {
		noteId: String(raw.noteId ?? ''),
		content: String(raw.content ?? ''),
		authorEmail: String(raw.authorEmail ?? ''),
		createdAt: String(raw.createdAt ?? ''),
		editHistory: editHistory.map((entry) =>
			normalizeConversationNoteEditHistoryEntry(entry as Record<string, unknown>),
		),
		eventId: String(raw.eventId ?? ''),
	};
}

export function normalizeAttendeeNotesResponse(response: Record<string, unknown>): AttendeeNotesResponse {
	const notes = Array.isArray(response.notes) ? response.notes : [];
	return {
		notes: notes.map((note) => normalizeConversationNoteEntry(note as Record<string, unknown>)),
	};
}
