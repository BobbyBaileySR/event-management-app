import type { ThemeId } from './theme/themeTokens';

export type EmsRole = 'viewer' | 'operator' | 'communications' | 'admin';

export interface Session {
	token: string;
	email: string;
	role: EmsRole | string;
	expiresAt: string;
}

export type EventStatus = 'active' | 'draft' | 'cancelled' | 'completed';
export type AttendeeStatus = 'Registered' | 'Checked In' | 'Cancelled';
export type EventType = 'In-person' | 'Virtual' | 'Hybrid';

/** UI display shape for events (mock data and normalized live responses). */
export interface Event {
	id: string;
	name: string;
	date: string;
	dateIso: string;
	endDate?: string;
	location: string;
	status: EventStatus | string;
	attendeeCount: number;
	capacity: number;
	type: EventType | string;
	owner: string;
	registrationClose: string;
	hubspotId: string;
	description: string;
	/** Optional Program association (007 redesign R-007) — absent/null for a standalone Event. */
	programId?: string | null;
	/** Display name for `programId`, resolved server-side — absent/null for a standalone Event. */
	programName?: string | null;
}

export interface Attendee {
	id: string;
	name: string;
	email: string;
	company: string;
	status: AttendeeStatus | string;
	ticketType: string;
	registeredAt: string;
	source: string;
}

export interface EmailTemplate {
	id: string;
	name: string;
	description: string;
	category: string;
}

export interface AuditEntry {
	id: string;
	eventId: string;
	actorEmail: string;
	action: string;
	templateName: string;
	recipientCount: number;
	timestamp: string;
	outcome: string;
}

/** Scalar or nested metadata on Slice 1.5 audit log rows — no attendee PII. */
export interface AuditMetadata {
	[key: string]: AuditMetadataValue;
}

export type AuditMetadataValue =
	| string
	| number
	| boolean
	| string[]
	| AuditMetadata
	| null;

/** Row from `GET audit/recent` and `GET events/{id}/audit`. */
export interface AuditLogEntry {
	id: string;
	timestamp: string;
	action: string;
	actor: string;
	eventId: string | null;
	resourceType: string;
	resourceId: string;
	outcome: string;
	metadata?: AuditMetadata;
}

export interface AuditLogListResult {
	entries: AuditLogEntry[];
	page: number;
	pageSize: number;
	total: number;
}

/** Distinguishes Slice 1.5 paginated audit API from legacy email-dispatch mock rows. */
export function isAuditLogListResult(
	result: AuditLogListResult | { entries: AuditEntry[] },
): result is AuditLogListResult {
	return 'page' in result;
}

export interface AnalyticsConversion {
	checkedIn: number;
	registered: number;
	cancelled: number;
}

export interface CampaignMetrics {
	sent: number;
	opened: number;
	clicked: number;
	bounced: number;
}

export interface ScheduledEmail {
	id: string;
	templateName: string;
	segment: string;
	scheduledAt: string;
	recipientCount: number;
	status: string;
}

export interface AgendaSession {
	id: string;
	time: string;
	title: string;
	speaker: string;
	location: string;
	track: string;
}

export interface ActivityItem {
	id: string;
	timestamp: string;
	summary: string;
	actor: string;
}

export interface EventsResponse {
	events: Event[];
	page?: number;
	pageSize?: number;
	total?: number;
}

export interface EventResponse {
	event: Event | null;
}

export interface SliceAttendee {
	contactId: string;
	firstName: string;
	lastName: string;
	company: string;
	email: string;
	accountManager: string;
	attendeeType: 'customer' | 'partner';
	checkedIn: boolean;
	/** ISO timestamp for the current check-in; `null` when not checked in (R-009 Record Storage cache). */
	checkedInAt: string | null;
}

export interface SliceAttendeesResponse {
	attendees: SliceAttendee[];
	page: number;
	pageSize: number;
	total: number;
}

export interface RemoveAttendeeResponse {
	contactId: string;
	removed: boolean;
}

/** One entry in `AttendeeDetail.journey` or `AttendeeCommunicationsResponse.timeline` (010-attendee-detail-modal). */
export interface AttendeeJourneyStep {
	type: 'registered' | 'dispatch_sent' | 'dispatch_opened' | 'checked_in';
	/** `null` only when the underlying timestamp isn't tracked yet — render "Not yet", never fabricate a date. */
	timestamp: string | null;
	label: string;
	source: 'this_event';
}

export type CommunicationTag = { kind: 'other_event'; eventName: string } | { kind: 'external' };

/** A timeline entry not part of the currently-open Event — "Show all communications" expansion only. */
export interface CommunicationItem {
	type: 'registered' | 'dispatch_sent' | 'dispatch_opened' | 'checked_in';
	timestamp: string | null;
	label: string;
	source: 'other_event' | 'external';
	tag: CommunicationTag;
}

export type AttendeeTimelineItem = AttendeeJourneyStep | CommunicationItem;

/**
 * One entry in `AttendeeDetail.registrationAnswerHistory` (013-registration-form-bridge). `answers`
 * values are free text authored directly by an anonymous public form submitter — render with JSX
 * `{text}` only, never `dangerouslySetInnerHTML` (spec FR-007).
 */
export interface RegistrationAnswerHistoryEntry {
	answers: Record<string, string | string[]>;
	source: 'registration' | 'amendment';
	observedAt: string;
	slot: number;
}

/** `GET events/{evId}/attendees/{contactId}` response (010-attendee-detail-modal). */
export interface AttendeeDetail {
	contactId: string;
	firstName: string;
	lastName: string;
	company: string;
	email: string;
	accountManager: string;
	attendeeType: 'customer' | 'partner';
	checkedIn: boolean;
	checkedInAt: string | null;
	/** `null` until `HS-010` (property allowlisted) — omit rather than show a placeholder. */
	phone: string | null;
	jobTitle: string | null;
	dietaryRequirement: string | null;
	/** `null` until `BE-ATTENDEE-DETAIL-002` closes — no persisted signal distinguishes these today. */
	registrationSource: 'form' | 'walk-in' | null;
	journey: AttendeeJourneyStep[];
	/** `[]` if none recorded (013-registration-form-bridge) — never overwritten, only appended to. */
	registrationAnswerHistory: RegistrationAnswerHistoryEntry[];
}

/**
 * One conversation note (015-conversation-notes, contracts/attendee-notes.md). `content` is
 * staff-authored free text — render with JSX `{text}` only, never `dangerouslySetInnerHTML`.
 * `eventId` is always present (even in the this-event-only default scope) so the UI can tag
 * cross-event entries when `allEvents` is requested.
 */
export interface ConversationNoteEntry {
	noteId: string;
	content: string;
	authorEmail: string;
	createdAt: string;
	editHistory: { previousContent: string; editorEmail: string; editedAt: string }[];
	eventId: string;
}

/** `GET events/{evId}/attendees/{contactId}/notes` response. */
export interface AttendeeNotesResponse {
	notes: ConversationNoteEntry[];
}

/** `GET attendees/{contactId}/communications` response (010-attendee-detail-modal). */
export interface AttendeeCommunicationsResponse {
	contactId: string;
	/** Earliest event-related timestamp used to bound the query — for debugging/QA, not required by the UI. */
	cutoffTimestamp: string;
	timeline: AttendeeTimelineItem[];
}

export interface CheckInContactSummary {
	contactId: string;
	firstName: string;
	lastName: string;
	company: string;
	email: string;
	accountManager: string;
	attendeeType: 'customer' | 'partner' | null;
	checkedIn: boolean;
}

export interface CheckInScanResponse {
	contact: CheckInContactSummary;
	programId: string;
	eventId: string;
}

/**
 * `POST events/{evId}/attendees/lookup` response (015-conversation-notes, US1) — read-only
 * attendee lookup for the Conversations screen's QR scan. Same `contact` summary shape as
 * `CheckInScanResponse`, but no `programId` (never writes or audits a check-in).
 */
export interface AttendeeLookupResponse {
	contact: CheckInContactSummary;
	eventId: string;
}

export interface ConfirmCheckInResponse {
	contactId: string;
	checkedIn: boolean;
	alreadyCheckedIn: boolean;
	attendeeType: 'customer' | 'partner' | null;
	/** ISO timestamp of this check-in/undo; `null` after undo (R-009 Record Storage cache). */
	checkedInAt: string | null;
}

/** Same payload shape as confirm — `alreadyCheckedIn` means the contact *was* checked in before undo. */
export type UndoCheckInResponse = ConfirmCheckInResponse;

export interface CapacityStatus {
	programId: string;
	eventId: string;
	capacity: number | null;
	checkedInCount: number;
	departureCount: number;
	liveAttendance: number;
}

export type AdjustCapacityDirection = 'up' | 'down';

export interface AttendeesResponse {
	attendees: Attendee[];
	page?: number;
	pageSize?: number;
	total?: number;
}

export interface EmailPreviewPayload {
	eventId: string;
	templateId: string;
	contactIds: string[];
	segment?: string;
	scheduledAt?: string;
}

export interface EmailSendPayload {
	eventId: string;
	templateId: string;
	contactIds: string[];
	scheduledAt?: string;
	idempotencyKey: string;
}

/** HubSpot CatalogAdapter Event lifecycle status (wire). */
export type CatalogEventStatus = 'active' | 'cancelled';

/** HubSpot CatalogAdapter Event publish state (wire) — independent of status. */
export type CatalogEventPublishState = 'draft' | 'published';

/**
 * Flat catalog Event wire shape (HubSpot CatalogAdapter / T069).
 * `programId` null = standalone Event (no Program association).
 */
export interface CatalogEvent {
	id: string;
	programId: string | null;
	name: string;
	/** ISO datetime (required on create). */
	start: string;
	/** ISO datetime. */
	end?: string;
	location?: string;
	capacity?: number;
	status: CatalogEventStatus;
	publishState: CatalogEventPublishState;
	walkInFormUrl?: string;
	registrationFormUrl?: string;
	registrationSlug?: string;
	owner?: string;
	archived: boolean;
	archivedViaProgramId?: string | null;
}

/** Flat, event-first catalog list row — same shape as `CatalogEvent`. */
export type CatalogEventSummary = CatalogEvent;

export interface CatalogProgram {
	id: string;
	name: string;
	archived: boolean;
	description?: string;
	startDate?: string;
	endDate?: string;
}

export interface CatalogResponse {
	events: CatalogEventSummary[];
	programs: CatalogProgram[];
}

export interface CatalogProgramRecord {
	id: string;
	name: string;
	archived: boolean;
	description?: string;
	startDate?: string;
	endDate?: string;
}

export interface CatalogEventRecord {
	id: string;
	programId: string | null;
	name: string;
	start: string;
	end?: string;
	location?: string;
	capacity?: number;
	status: CatalogEventStatus;
	publishState: CatalogEventPublishState;
	walkInFormUrl?: string;
	registrationFormUrl?: string;
	registrationSlug?: string;
	owner?: string;
	archived: boolean;
	archivedViaProgramId?: string | null;
}

export interface CreateCatalogProgramBody {
	name: string;
	description?: string;
	startDate?: string;
	endDate?: string;
}

export interface PatchCatalogProgramBody {
	name?: string;
	archived?: boolean;
	description?: string | null;
	startDate?: string | null;
	endDate?: string | null;
}

export interface CreateCatalogEventBody {
	/** Optional — omit or leave unset for a standalone Event. */
	programId?: string;
	name: string;
	/** ISO datetime (required). */
	start: string;
	end?: string;
	location?: string;
	capacity?: number;
	walkInFormUrl?: string;
	registrationFormUrl?: string;
	owner?: string;
	publishState?: CatalogEventPublishState;
}

export interface PatchCatalogEventBody {
	name?: string;
	start?: string;
	end?: string | null;
	location?: string | null;
	capacity?: number | null;
	status?: CatalogEventStatus;
	publishState?: CatalogEventPublishState;
	walkInFormUrl?: string | null;
	registrationFormUrl?: string | null;
	owner?: string | null;
	archived?: boolean;
}

// --- Email dispatch (Slice 2) ---

export type DispatchStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export type DispatchAudienceType =
	| 'registered_all'
	| 'registered_checked_in'
	| 'registered_not_checked_in'
	| 'registered_manual'
	| 'hubspot_segment';

export type HubSpotSegmentKind = 'active' | 'static';

export type DispatchAudienceRequest =
	| { type: 'registered_all' | 'registered_checked_in' | 'registered_not_checked_in' }
	| { type: 'registered_manual'; contactIds: string[] }
	| { type: 'hubspot_segment'; segmentId: string };

export interface DispatchAudienceRegistered {
	type: 'registered_all' | 'registered_checked_in' | 'registered_not_checked_in';
}

export interface DispatchAudienceManual {
	type: 'registered_manual';
	contactIds: string[];
}

export interface DispatchAudienceSegment {
	type: 'hubspot_segment';
	segmentId: string;
	segmentName: string;
	segmentKind: HubSpotSegmentKind;
}

export type DispatchAudience = DispatchAudienceRegistered | DispatchAudienceManual | DispatchAudienceSegment;

export interface EmailDispatchLimits {
	dispatchLimitPerHour: number;
	dispatchUsedThisHour: number;
	largeSendThreshold: number;
}

export interface MarketingTemplateOption {
	id: string;
	name: string;
	description?: string;
}

export interface EmailTemplatesListResponse {
	templates: MarketingTemplateOption[];
}

export interface HubSpotSegmentOption {
	id: string;
	name: string;
	kind: HubSpotSegmentKind;
}

export interface EmailSegmentsListResponse {
	segments: HubSpotSegmentOption[];
}

export interface EmailPreviewRequestBody {
	templateId: string;
	audience: DispatchAudienceRequest;
}

export interface EmailPreviewResponse {
	recipientCount: number;
}

export interface CreateEmailDispatchBody {
	dispatchName: string;
	templateId: string;
	audience: DispatchAudienceRequest;
	scheduledAtUtc: string | null;
	timezone: string | null;
	idempotencyKey: string;
	/** Required when recipientCountPlanned >= largeSendThreshold (FR-010). */
	largeSendConfirmed?: true;
}

export interface CreateEmailDispatchResponse {
	dispatchId: string;
	status: DispatchStatus;
	recipientCountPlanned: number;
	scheduledAtUtc: string | null;
	timezone: string | null;
	/** 008-qr-ticket-emails — detected server-side from the chosen templateId, never client-supplied. */
	ticketsEnabled: boolean;
}

export interface EmailDispatchListItem {
	dispatchId: string;
	dispatchName: string;
	templateName: string;
	audienceSummary: string;
	audience?: DispatchAudienceRequest;
	status: DispatchStatus;
	scheduledAtUtc: string | null;
	timezone: string | null;
	recipientCountPlanned: number;
	recipientCountSent: number;
	createdBy: string;
	createdAt: string;
	lockWarning?: boolean;
	/** 008-qr-ticket-emails — same value stamped at create time, never re-detected on read. */
	ticketsEnabled: boolean;
}

export interface EmailDispatchListResponse {
	dispatches: EmailDispatchListItem[];
	page: number;
	pageSize: number;
	total: number;
}

/** Portfolio-wide aggregate for the Overview "Emails scheduled this week" tile (FE-REDESIGN-020). */
export interface ScheduledEmailSummary {
	emailsScheduledThisWeek: number;
	eventsWithScheduledEmails: number;
}

/**
 * One row of `GET events/capacity-summary` (Slice 012). `registeredCount` is "Event Capacity"
 * (total registered, checked-in or not) — what Programs & Events/Overview/Event Details
 * display. `checkedInCount` is "Live Capacity" (on-site count), matching the Check-in page —
 * not used for the portfolio views' capacity display.
 */
export interface CapacitySummaryRow {
	eventId: string;
	programId: string | null;
	capacity: number | null;
	registeredCount: number;
	checkedInCount: number;
}

/** Portfolio-wide capacity/checked-in aggregate for Programs & Events (`FE-PERF-001`) — replaces the per-event capacity fan-out. */
export interface CapacitySummaryResponse {
	events: CapacitySummaryRow[];
}

export interface DispatchRecipientRow {
	dispatchId: string;
	contactId: string;
	email: string;
	outcome: 'sent';
	sentAt: string;
}

export interface EmailDispatchDetailResponse {
	dispatch: EmailDispatchListItem & { completedAt: string | null };
	recipients: DispatchRecipientRow[];
	page: number;
	pageSize: number;
	total: number;
}

export interface CancelEmailDispatchResponse {
	dispatchId: string;
	status: 'cancelled';
}

export interface PatchEmailDispatchBody {
	dispatchName: string;
	templateId: string;
	audience: DispatchAudienceRequest;
	scheduledAtUtc: string | null;
	timezone: string | null;
	/** Required when recipientCountPlanned >= largeSendThreshold (FR-010). */
	largeSendConfirmed?: true;
}

// --- Lead generation (014-lead-generation, ADR-018) ---

export type LeadGenerationOutcome = 'created' | 'updated' | 'created_separate';

/** `failed` only appears in batch results — a single-attendee generation either succeeds or errors. */
export type LeadGenerationBatchOutcome = LeadGenerationOutcome | 'failed';

export interface GenerateLeadRequestBody {
	includeFullHistory?: boolean;
}

/** `POST events/{evId}/attendees/{contactId}/lead` response (contracts/post-attendee-lead.md). */
export interface GenerateLeadResponse {
	outcome: LeadGenerationOutcome;
	leadId: string;
}

export interface GenerateLeadBatchRequestBody {
	contactIds: string[];
	includeFullHistory?: boolean;
	/** Required (`true`) once `contactIds.length` meets the configured batch threshold. */
	batchConfirmed?: boolean;
}

export interface GenerateLeadBatchResultEntry {
	contactId: string;
	outcome: LeadGenerationBatchOutcome;
	leadId?: string;
}

/** `POST events/{evId}/attendees/lead-batch` response (contracts/post-attendee-lead-batch.md). */
export interface GenerateLeadBatchResponse {
	results: GenerateLeadBatchResultEntry[];
}

/** `GET user/prefs` / `PUT user/prefs/theme` response (contracts/theme-preference-api.md). */
export interface ThemePreference {
	/** Resolved theme after server-side Celebration allowlist re-validation. */
	theme: ThemeId;
	/** Whether the switcher should offer Celebration to this user. */
	celebrationAllowed: boolean;
	/**
	 * Login toast copy when the user is on `CELEBRATION_TOAST_EMAIL` and the message Param is set.
	 * Independent of theme / `celebrationAllowed`; `null` means no toast.
	 */
	celebrationToastMessage: string | null;
	updatedAt?: string;
}
