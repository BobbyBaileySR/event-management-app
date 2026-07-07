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
	checkedInAt: null;
}

export interface SliceAttendeesResponse {
	attendees: SliceAttendee[];
	page: number;
	pageSize: number;
	total: number;
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

export interface ConfirmCheckInResponse {
	contactId: string;
	checkedIn: boolean;
	alreadyCheckedIn: boolean;
	attendeeType: 'customer' | 'partner' | null;
}

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

export interface CatalogEvent {
	id: string;
	name: string;
	partsAttendedOption: string;
	attendanceProperty: string;
	archived: boolean;
	owner?: string;
	description?: string;
	date?: string;
	location?: string;
	capacity?: number;
	walkInFormUrl?: string;
}

export interface CatalogProgram {
	id: string;
	name: string;
	hubspotFormIds: string[];
	archived: boolean;
	events: CatalogEvent[];
	description?: string;
	startDate?: string;
	endDate?: string;
	location?: string;
	timezone?: string;
}

export interface CatalogResponse {
	programs: CatalogProgram[];
}

export interface CatalogProgramRecord {
	id: string;
	name: string;
	hubspotFormIds: string[];
	archived: boolean;
	createdAt?: string;
	updatedAt?: string;
	description?: string;
	startDate?: string;
	endDate?: string;
	location?: string;
	timezone?: string;
}

export interface CatalogEventRecord {
	id: string;
	programId: string;
	name: string;
	partsAttendedOption: string;
	attendanceProperty: string;
	archived: boolean;
	archivedViaProgramId?: string | null;
	createdAt?: string;
	updatedAt?: string;
	owner?: string;
	description?: string;
	date?: string;
	location?: string;
	capacity?: number;
	walkInFormUrl?: string;
}

export interface CreateCatalogProgramBody {
	name: string;
	hubspotFormIds: string[];
	/** @deprecated Legacy single form — still sent for older ScriptRunner builds */
	hubspotFormId?: string;
	description?: string;
	startDate?: string;
	endDate?: string;
	location?: string;
	timezone?: string;
}

export interface PatchCatalogProgramBody {
	name?: string;
	hubspotFormIds?: string[];
	/** @deprecated Legacy single form — still sent for older ScriptRunner builds */
	hubspotFormId?: string;
	archived?: boolean;
	description?: string | null;
	startDate?: string | null;
	endDate?: string | null;
	location?: string | null;
	timezone?: string | null;
}

export interface CreateCatalogEventBody {
	programId: string;
	name: string;
	partsAttendedOption: string;
	attendanceProperty: string;
	owner?: string;
	description?: string;
	date?: string;
	location?: string;
	capacity?: number;
	walkInFormUrl?: string;
}

export interface PatchCatalogEventBody {
	name?: string;
	partsAttendedOption?: string;
	attendanceProperty?: string;
	archived?: boolean;
	owner?: string | null;
	description?: string | null;
	date?: string | null;
	location?: string | null;
	capacity?: number | null;
	walkInFormUrl?: string | null;
}
