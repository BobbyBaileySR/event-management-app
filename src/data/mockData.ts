import type {
	Attendee,
	AuditEntry,
	AuditLogEntry,
	CancelEmailDispatchResponse,
	CatalogEvent,
	CatalogEventSummary,
	CatalogProgram,
	CatalogResponse,
	CheckInScanResponse,
	ConfirmCheckInResponse,
	CapacityStatus,
	AdjustCapacityDirection,
	CreateCatalogEventBody,
	CreateCatalogProgramBody,
	CreateEmailDispatchBody,
	CreateEmailDispatchResponse,
	DispatchAudienceRequest,
	DispatchRecipientRow,
	EmailDispatchDetailResponse,
	EmailDispatchLimits,
	EmailDispatchListItem,
	EmailDispatchListResponse,
	EmailPreviewRequestBody,
	EmailPreviewResponse,
	EmailSegmentsListResponse,
	EmailTemplatesListResponse,
	PatchCatalogEventBody,
	PatchCatalogProgramBody,
	PatchEmailDispatchBody,
	EmailTemplate,
	ScheduledEmail,
	SliceAttendee,
	SliceAttendeesResponse,
	ThemePreference,
} from '../types';
import { CONFIG } from '../config';
import { DEFAULT_THEME_ID, type ThemeId } from '../theme/themeTokens';
import { isCelebrationEmail, resolveMockCelebrationToastMessage } from '../utils/celebrationTheme';
import { assertScheduleFields } from '../utils/emailSchedule';

/**
 * Sample mock data for EMS PoC — replaced by ScriptRunner API in Phase 2+.
 */


export const MOCK_ATTENDEES: Record<string, Attendee[]> = {
    'evt-london-q3': [
        { id: 'c-001', name: 'Jane Doe', email: 'jane.doe@adaptavist.com', company: 'Adaptavist', status: 'Checked In', ticketType: 'VIP', registeredAt: '2026-08-01', source: 'HubSpot form' },
        { id: 'c-002', name: 'John Smith', email: 'john.smith@atlassian.com', company: 'Atlassian', status: 'Registered', ticketType: 'General', registeredAt: '2026-08-12', source: 'Partner invite' },
        { id: 'c-003', name: 'Sarah Connor', email: 's.connor@cyberdyne.io', company: 'Cyberdyne', status: 'Registered', ticketType: 'General', registeredAt: '2026-09-02', source: 'HubSpot form' },
        { id: 'c-004', name: 'Bruce Wayne', email: 'b.wayne@wayneent.com', company: 'Wayne Ent.', status: 'Checked In', ticketType: 'VIP', registeredAt: '2026-07-20', source: 'Manual add' },
        { id: 'c-005', name: 'Tony Stark', email: 't.stark@starkind.com', company: 'Stark Ind.', status: 'Cancelled', ticketType: 'General', registeredAt: '2026-08-05', source: 'HubSpot form' },
        { id: 'c-006', name: 'Diana Prince', email: 'd.prince@themyscira.com', company: 'Themyscira Ltd', status: 'Registered', ticketType: 'General', registeredAt: '2026-09-18', source: 'HubSpot form' },
        { id: 'c-007', name: 'Peter Parker', email: 'p.parker@dailybugle.com', company: 'Daily Bugle', status: 'Checked In', ticketType: 'Press', registeredAt: '2026-08-28', source: 'Media list' },
        { id: 'c-008', name: 'Emma Wilson', email: 'emma.w@acmecorp.com', company: 'Acme Corp', status: 'Registered', ticketType: 'General', registeredAt: '2026-09-25', source: 'HubSpot form' },
    ],
    'evt-tech-webinar': [
        { id: 'c-101', name: 'Alice Chen', email: 'alice.chen@adaptavist.com', company: 'Adaptavist', status: 'Registered', ticketType: 'Staff', registeredAt: '2026-10-01', source: 'Internal' },
        { id: 'c-102', name: 'Bob Miller', email: 'bob@gitlab.com', company: 'GitLab', status: 'Registered', ticketType: 'Webinar', registeredAt: '2026-10-05', source: 'HubSpot form' },
        { id: 'c-103', name: 'Carlos Ruiz', email: 'c.ruiz@devops.io', company: 'DevOps.io', status: 'Registered', ticketType: 'Webinar', registeredAt: '2026-10-08', source: 'HubSpot form' },
    ],
    'evt-ams-meetup': [
        { id: 'c-201', name: 'Eva Jansen', email: 'eva.jansen@adaptavist.com', company: 'Adaptavist', status: 'Registered', ticketType: 'Partner', registeredAt: '2026-11-01', source: 'Partner portal' },
        { id: 'c-202', name: 'Marco Rossi', email: 'marco@partnerco.nl', company: 'Partner Co', status: 'Checked In', ticketType: 'Partner', registeredAt: '2026-10-20', source: 'Partner invite' },
        { id: 'c-203', name: 'Sophie Laurent', email: 'sophie@techpartners.eu', company: 'Tech Partners EU', status: 'Registered', ticketType: 'Partner', registeredAt: '2026-11-10', source: 'HubSpot form' },
    ],
    'evt-atlassian-team': [
        { id: 'c-301', name: 'Alex Morgan', email: 'alex.m@adaptavist.com', company: 'Adaptavist', status: 'Checked In', ticketType: 'Staff', registeredAt: '2026-07-01', source: 'Internal' },
        { id: 'c-302', name: 'Priya Shah', email: 'priya@customer.com', company: 'Enterprise Customer', status: 'Checked In', ticketType: 'VIP', registeredAt: '2026-07-15', source: 'Sales invite' },
    ],
    'evt-roadshow-dublin': [
        { id: 'c-401', name: 'Niall O\'Brien', email: 'niall@example.ie', company: 'Irish Tech Ltd', status: 'Cancelled', ticketType: 'General', registeredAt: '2026-07-10', source: 'HubSpot form' },
    ],
    'evt-internal-townhall': [
        { id: 'c-501', name: 'Staff Member', email: 'staff1@adaptavist.com', company: 'Adaptavist', status: 'Registered', ticketType: 'Employee', registeredAt: '2026-07-01', source: 'Workspace sync' },
        { id: 'c-502', name: 'Staff Member Two', email: 'staff2@adaptavist.com', company: 'Adaptavist', status: 'Registered', ticketType: 'Employee', registeredAt: '2026-07-02', source: 'Workspace sync' },
    ],
};

export const MOCK_TEMPLATES: EmailTemplate[] = [
    { id: 'tpl-invite', name: 'Initial Invitation', description: 'Marketing Hub — first touch', category: 'Invitation' },
    { id: 'tpl-qr', name: 'QR Ticket Dispatch', description: 'Marketing Hub — event entry', category: 'Transactional' },
    { id: 'tpl-reminder', name: '48-Hour Final Reminder', description: 'Marketing Hub — urgency', category: 'Reminder' },
    { id: 'tpl-survey', name: 'Post-Event Survey', description: 'Marketing Hub — feedback', category: 'Follow-up' },
    { id: 'tpl-vip', name: 'VIP Lounge Access', description: 'Marketing Hub — VIP segment', category: 'Transactional' },
];

export const MOCK_AUDIT_LOG: AuditEntry[] = [
    {
        id: 'aud-001',
        eventId: 'evt-london-q3',
        actorEmail: 'events@adaptavist.com',
        action: 'dispatch',
        templateName: '48-Hour Final Reminder',
        recipientCount: 142,
        timestamp: '2026-07-01T09:30:00Z',
        outcome: 'sent',
    },
    {
        id: 'aud-002',
        eventId: 'evt-london-q3',
        actorEmail: 'events@adaptavist.com',
        action: 'dispatch',
        templateName: 'Initial Invitation',
        recipientCount: 105,
        timestamp: '2026-06-28T14:15:00Z',
        outcome: 'scheduled',
    },
    {
        id: 'aud-003',
        eventId: 'evt-ams-meetup',
        actorEmail: 'events@adaptavist.com',
        action: 'dispatch',
        templateName: 'Initial Invitation',
        recipientCount: 58,
        timestamp: '2026-06-25T11:00:00Z',
        outcome: 'sent',
    },
    {
        id: 'aud-004',
        eventId: 'evt-atlassian-team',
        actorEmail: 'events@adaptavist.com',
        action: 'dispatch',
        templateName: 'QR Ticket Dispatch',
        recipientCount: 280,
        timestamp: '2026-09-10T08:00:00Z',
        outcome: 'sent',
    },
];

export const MOCK_SLICE_AUDIT_LOG: AuditLogEntry[] = [
	{
		id: 'req-checkin-beta',
		timestamp: '2026-07-07T12:00:00.000Z',
		action: 'checkin.confirm',
		actor: 'admin@adaptavist.com',
		eventId: 'ev-mr-2026',
		resourceType: 'catalog_event',
		resourceId: 'ev-mr-2026',
		outcome: 'success',
		metadata: { programId: 'prog-atlassian-2026', alreadyCheckedIn: false },
	},
	{
		id: 'req-attendees-alpha',
		timestamp: '2026-07-07T11:00:00.000Z',
		action: 'attendees.list',
		actor: 'admin@adaptavist.com',
		eventId: 'ev-mr-2026',
		resourceType: 'catalog_event',
		resourceId: 'ev-mr-2026',
		outcome: 'success',
		metadata: { programId: 'prog-atlassian-2026', page: 1, pageSize: 50, resultCount: 12, queryPresent: false },
	},
	{
		id: 'req-program-create',
		timestamp: '2026-07-07T10:00:00.000Z',
		action: 'catalog.program.create',
		actor: 'events@adaptavist.com',
		eventId: null,
		resourceType: 'catalog_program',
		resourceId: 'prog-atlassian-2026',
		outcome: 'success',
	},
	{
		id: 'req-program-update',
		timestamp: '2026-07-06T16:30:00.000Z',
		action: 'catalog.program.update',
		actor: 'events@adaptavist.com',
		eventId: null,
		resourceType: 'catalog_program',
		resourceId: 'prog-atlassian-2026',
		outcome: 'success',
		metadata: {
			previous: { location: 'London' },
			next: { location: 'London, UK' },
		},
	},
	{
		id: 'req-auth-exchange',
		timestamp: '2026-07-06T09:00:00.000Z',
		action: 'auth.exchange',
		actor: 'admin@adaptavist.com',
		eventId: null,
		resourceType: 'session',
		resourceId: 'sess-mock-001',
		outcome: 'success',
	},
];



export const MOCK_SCHEDULED_EMAILS: Record<string, ScheduledEmail[]> = {
    'evt-london-q3': [
        {
            id: 'sch-001',
            templateName: 'QR Ticket Dispatch',
            segment: 'Registered',
            scheduledAt: '2026-10-13T09:00:00Z',
            recipientCount: 98,
            status: 'Scheduled',
        },
    ],
    'evt-tech-webinar': [
        {
            id: 'sch-002',
            templateName: 'Initial Invitation',
            segment: 'All',
            scheduledAt: '2026-10-28T10:00:00Z',
            recipientCount: 85,
            status: 'Draft schedule',
        },
    ],
};




export function getAuditLogForEvent(eventId: string, entries: AuditEntry[] = MOCK_AUDIT_LOG): AuditEntry[] {
    return entries.filter((entry) => entry.eventId === eventId);
}

export function getMockSliceAuditLog(page = 1, pageSize = 50): {
	entries: AuditLogEntry[];
	page: number;
	pageSize: number;
	total: number;
} {
	const sorted = [...MOCK_SLICE_AUDIT_LOG].sort(
		(left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime(),
	);
	const total = sorted.length;
	const start = (page - 1) * pageSize;
	return {
		entries: sorted.slice(start, start + pageSize),
		page,
		pageSize,
		total,
	};
}

/** Internal Program→Event tree kept for mock CRUD ergonomics; flattened at the `getMockCatalog` boundary to mirror the real API's flat wire shape (mirrors Backend's buildCatalogTree + flattenCatalogTree). */
interface MockCatalogProgramNode extends CatalogProgram {
	events: CatalogEvent[];
}

const INITIAL_MOCK_CATALOG: MockCatalogProgramNode[] = [
	{
		id: 'prog-atlassian-2026',
		name: 'Atlassian Event 2026',
		archived: false,
		events: [
			{
				id: 'ev-mr-2026',
				programId: 'prog-atlassian-2026',
				name: 'Meeting Room',
				start: '2026-09-02T09:00:00.000Z',
				status: 'active',
				publishState: 'published',
				archived: false,
				capacity: 100,
			},
			{
				id: 'ev-vip-2026',
				programId: 'prog-atlassian-2026',
				name: 'VIP Event',
				start: '2026-09-03T09:00:00.000Z',
				status: 'active',
				publishState: 'draft',
				archived: false,
			},
		],
	},
];

const mockCatalogState: MockCatalogProgramNode[] = structuredClone(INITIAL_MOCK_CATALOG);
let mockStandaloneEvents: CatalogEvent[] = [];

function flattenMockCatalog(
	programs: MockCatalogProgramNode[],
	standalone: CatalogEvent[],
): CatalogResponse {
	const events: CatalogEventSummary[] = [];
	const programSummaries: CatalogProgram[] = [];
	for (const program of programs) {
		const { events: programEvents, ...summary } = program;
		programSummaries.push(summary);
		programEvents.forEach((event) => events.push({ ...event, programId: program.id }));
	}
	for (const event of standalone) {
		events.push({ ...event, programId: null });
	}
	return { events, programs: programSummaries };
}

export function getMockCatalog(includeArchived = false): CatalogResponse {
	if (!includeArchived) {
		return flattenMockCatalog(
			mockCatalogState
				.filter((program) => !program.archived)
				.map((program) => ({
					...program,
					events: program.events.filter((event) => !event.archived),
				})),
			mockStandaloneEvents.filter((event) => !event.archived),
		);
	}

	const programs = mockCatalogState
		.map((program) => {
			const archivedEvents = program.events.filter((event) => event.archived);
			if (!program.archived && archivedEvents.length === 0) {
				return null;
			}
			return {
				...program,
				events: archivedEvents,
			};
		})
		.filter((program): program is MockCatalogProgramNode => program !== null);

	return flattenMockCatalog(
		programs,
		mockStandaloneEvents.filter((event) => event.archived),
	);
}

interface MockSliceAttendeeEntry extends SliceAttendee {}

const INITIAL_MOCK_SLICE_ATTENDEES: Record<string, MockSliceAttendeeEntry[]> = {
	'ev-mr-2026': [
		{
			contactId: 'mock-101',
			firstName: 'Jane',
			lastName: 'Doe',
			company: 'Acme Corp',
			email: 'jane.doe@acme.com',
			accountManager: 'owner-1',
			attendeeType: 'customer',
			checkedIn: false,
			checkedInAt: null,
		},
		{
			contactId: 'mock-202',
			firstName: 'Pat',
			lastName: 'Lee',
			company: 'Partner Ltd',
			email: 'pat@partner.com',
			accountManager: 'owner-2',
			attendeeType: 'partner',
			checkedIn: true,
			checkedInAt: null,
		},
	],
};

const mockSliceAttendeesState: Record<string, MockSliceAttendeeEntry[]> = structuredClone(INITIAL_MOCK_SLICE_ATTENDEES);

export function resetMockCheckInState(): void {
	for (const key of Object.keys(mockSliceAttendeesState)) {
		delete mockSliceAttendeesState[key];
	}
	Object.assign(mockSliceAttendeesState, structuredClone(INITIAL_MOCK_SLICE_ATTENDEES));
	for (const key of Object.keys(mockDepartureCounts)) {
		delete mockDepartureCounts[key];
	}
}

function findMockSliceAttendee(eventId: string, contactId: string): MockSliceAttendeeEntry | undefined {
	return mockSliceAttendeesState[eventId]?.find((entry) => entry.contactId === contactId);
}

function decodeCheckInJwtPayload(jwt: string): { contactId?: string; sub?: string; emsEventId?: string } {
	const parts = jwt.split('.');
	if (parts.length !== 3 || !parts[1]) {
		throw new Error('invalid_checkin_token');
	}
	const padded = parts[1].replace(/-/g, '+').replace(/_/g, '/');
	return JSON.parse(atob(padded)) as { contactId?: string; sub?: string; emsEventId?: string };
}

export function getMockSliceAttendees(
	_programId: string,
	eventId: string,
	query: {
		checkedIn?: boolean;
		q?: string;
		page?: number;
		pageSize?: number;
		dispatchId?: string;
		dispatchFilter?: 'received' | 'not_received';
	} = {},
): SliceAttendeesResponse {
	const attendees = mockSliceAttendeesState[eventId];
	const pageSize = query.pageSize ?? 50;
	const page = query.page ?? 1;

	if (!attendees) {
		return { attendees: [], page, pageSize, total: 0 };
	}

	let filtered = attendees;

	if (query.dispatchId && query.dispatchFilter) {
		const recipients = mockEmailRecipientsState[query.dispatchId] ?? [];
		const sentContactIds = new Set(
			recipients.filter((row) => row.outcome === 'sent').map((row) => row.contactId),
		);
		filtered = filtered.filter((entry) => {
			const received = sentContactIds.has(entry.contactId);
			return query.dispatchFilter === 'received' ? received : !received;
		});
	}

	if (query.checkedIn !== undefined) {
		filtered = filtered.filter((entry) => entry.checkedIn === query.checkedIn);
	}

	const needle = query.q?.trim().toLowerCase();
	if (needle) {
		filtered = filtered.filter(
			(entry) =>
				entry.firstName.toLowerCase().includes(needle) ||
				entry.lastName.toLowerCase().includes(needle) ||
				`${entry.firstName} ${entry.lastName}`.toLowerCase().includes(needle) ||
				entry.email.toLowerCase().includes(needle) ||
				entry.company.toLowerCase().includes(needle),
		);
	}

	const total = filtered.length;
	const start = (page - 1) * pageSize;

	return {
		attendees: filtered.slice(start, start + pageSize).map((entry) => ({ ...entry })),
		page,
		pageSize,
		total,
	};
}

export function mockCheckInScan(programId: string, eventId: string, jwt: string): CheckInScanResponse {
	const payload = decodeCheckInJwtPayload(jwt);
	const contactId = payload.contactId ?? payload.sub;
	if (!contactId) {
		throw new Error('invalid_checkin_claims');
	}
	if (payload.emsEventId && payload.emsEventId !== eventId) {
		throw new Error('checkin_event_mismatch');
	}

	const attendee = findMockSliceAttendee(eventId, contactId);
	if (!attendee) {
		throw new Error('contact_not_found');
	}

	return {
		contact: {
			contactId: attendee.contactId,
			firstName: attendee.firstName,
			lastName: attendee.lastName,
			company: attendee.company,
			email: attendee.email,
			accountManager: attendee.accountManager,
			attendeeType: attendee.attendeeType,
			checkedIn: attendee.checkedIn,
		},
		programId,
		eventId,
	};
}

export function mockConfirmCheckIn(
	_programId: string,
	eventId: string,
	contactId: string,
): ConfirmCheckInResponse {
	const attendee = findMockSliceAttendee(eventId, contactId);
	if (!attendee) {
		throw new Error('contact_not_found');
	}

	if (attendee.checkedIn) {
		return {
			contactId: attendee.contactId,
			checkedIn: true,
			alreadyCheckedIn: true,
			attendeeType: attendee.attendeeType,
		};
	}

	attendee.checkedIn = true;
	return {
		contactId: attendee.contactId,
		checkedIn: true,
		alreadyCheckedIn: false,
		attendeeType: attendee.attendeeType,
	};
}

/** `POST events/{evId}/checkin/undo` (R-006) — flips checked-in → registered. */
export function mockUndoCheckIn(
	_programId: string,
	eventId: string,
	contactId: string,
): ConfirmCheckInResponse {
	const attendee = findMockSliceAttendee(eventId, contactId);
	if (!attendee) {
		throw new Error('contact_not_registered');
	}

	if (!attendee.checkedIn) {
		return {
			contactId: attendee.contactId,
			checkedIn: false,
			alreadyCheckedIn: false,
			attendeeType: attendee.attendeeType,
		};
	}

	attendee.checkedIn = false;
	return {
		contactId: attendee.contactId,
		checkedIn: false,
		alreadyCheckedIn: true,
		attendeeType: attendee.attendeeType,
	};
}

/** `DELETE events/{evId}/attendees/{contactId}` (R-006) — blocked while checked in (undo check-in first). */
export function mockRemoveAttendee(
	_programId: string,
	eventId: string,
	contactId: string,
): { contactId: string; removed: boolean } {
	const attendees = mockSliceAttendeesState[eventId];
	const attendee = attendees?.find((entry) => entry.contactId === contactId);
	if (!attendee) {
		throw new Error('contact_not_registered');
	}
	if (attendee.checkedIn) {
		throw new Error('attendee_checked_in');
	}
	mockSliceAttendeesState[eventId] = attendees!.filter((entry) => entry.contactId !== contactId);
	return { contactId, removed: true };
}

const mockDepartureCounts: Record<string, number> = {};

function mockCapacityKey(programId: string, eventId: string): string {
	return `${programId}/${eventId}`;
}

function mockEventCapacity(eventId: string): number | null {
	for (const program of mockCatalogState) {
		const event = program.events.find((entry) => entry.id === eventId);
		if (event?.capacity !== undefined && Number.isFinite(event.capacity) && event.capacity > 0) {
			return event.capacity;
		}
	}
	const standalone = mockStandaloneEvents.find((entry) => entry.id === eventId);
	if (standalone?.capacity !== undefined && Number.isFinite(standalone.capacity) && standalone.capacity > 0) {
		return standalone.capacity;
	}
	return null;
}

function mockCheckedInCount(eventId: string): number {
	const attendees = mockSliceAttendeesState[eventId] ?? [];
	return attendees.filter((entry) => entry.checkedIn).length;
}

function computeMockLiveAttendance(checkedInCount: number, departureCount: number): number {
	return Math.max(0, checkedInCount - departureCount);
}

export function getMockCapacityStatus(programId: string, eventId: string): CapacityStatus {
	const departureCount = mockDepartureCounts[mockCapacityKey(programId, eventId)] ?? 0;
	const checkedInCount = mockCheckedInCount(eventId);
	return {
		programId,
		eventId,
		capacity: mockEventCapacity(eventId),
		checkedInCount,
		departureCount,
		liveAttendance: computeMockLiveAttendance(checkedInCount, departureCount),
	};
}

export function mockAdjustCapacity(
	programId: string,
	eventId: string,
	direction: AdjustCapacityDirection,
): CapacityStatus {
	const key = mockCapacityKey(programId, eventId);
	const checkedInCount = mockCheckedInCount(eventId);
	const departureBefore = mockDepartureCounts[key] ?? 0;
	const liveBefore = computeMockLiveAttendance(checkedInCount, departureBefore);

	if (direction === 'down') {
		if (liveBefore <= 0) {
			throw new Error('capacity_at_floor');
		}
		mockDepartureCounts[key] = departureBefore + 1;
	} else {
		if (liveBefore >= checkedInCount) {
			throw new Error('capacity_at_ceiling');
		}
		mockDepartureCounts[key] = Math.max(0, departureBefore - 1);
	}

	return getMockCapacityStatus(programId, eventId);
}

function normalizeProgramName(name: string): string {
	return name.trim().toLowerCase();
}

function normalizeOptionalText(value: string | undefined): string | undefined {
	if (value === undefined) {
		return undefined;
	}
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
}

function applyProgramMetadataCreate(program: CatalogProgram, body: CreateCatalogProgramBody): CatalogProgram {
	return {
		...program,
		description: normalizeOptionalText(body.description),
		startDate: normalizeOptionalText(body.startDate),
		endDate: normalizeOptionalText(body.endDate),
	};
}

function mergeProgramMetadata(program: CatalogProgram, patch: PatchCatalogProgramBody): CatalogProgram {
	const next = { ...program };
	const metadataKeys = ['description', 'startDate', 'endDate'] as const;
	for (const key of metadataKeys) {
		if (!(key in patch)) {
			continue;
		}
		const raw = patch[key];
		if (raw === null || raw === undefined || (typeof raw === 'string' && !raw.trim())) {
			delete next[key];
			continue;
		}
		if (typeof raw === 'string') {
			next[key] = raw.trim();
		}
	}
	return next;
}

function applyEventMetadataCreate(event: CatalogEvent, body: CreateCatalogEventBody): CatalogEvent {
	const next: CatalogEvent = { ...event };
	if (body.end?.trim()) {
		next.end = body.end.trim();
	}
	if (body.owner?.trim()) {
		next.owner = body.owner.trim();
	}
	if (body.location?.trim()) {
		next.location = body.location.trim();
	}
	if (body.capacity !== undefined && Number.isFinite(body.capacity)) {
		next.capacity = body.capacity;
	}
	if (body.walkInFormUrl?.trim()) {
		next.walkInFormUrl = body.walkInFormUrl.trim();
	}
	if (body.registrationFormUrl?.trim()) {
		next.registrationFormUrl = body.registrationFormUrl.trim();
	}
	if (body.publishState) {
		next.publishState = body.publishState;
	}
	return next;
}

function mergeEventMetadata(event: CatalogEvent, patch: PatchCatalogEventBody): CatalogEvent {
	const next = { ...event };
	const textKeys = ['owner', 'location', 'walkInFormUrl', 'registrationFormUrl', 'start', 'end'] as const;
	for (const key of textKeys) {
		if (!(key in patch)) {
			continue;
		}
		const raw = patch[key];
		if (raw === null || raw === undefined || (typeof raw === 'string' && !raw.trim())) {
			if (key === 'start') {
				continue;
			}
			delete next[key];
			continue;
		}
		if (typeof raw === 'string') {
			next[key] = raw.trim();
		}
	}
	if ('capacity' in patch) {
		if (patch.capacity === null) {
			delete next.capacity;
		} else if (patch.capacity !== undefined && Number.isFinite(patch.capacity)) {
			next.capacity = patch.capacity;
		}
	}
	if (patch.status !== undefined) {
		next.status = patch.status;
	}
	if (patch.publishState !== undefined) {
		next.publishState = patch.publishState;
	}
	return next;
}

export function mockCreateProgram(body: CreateCatalogProgramBody): CatalogProgram {
	const key = normalizeProgramName(body.name);
	if (mockCatalogState.some((program) => normalizeProgramName(program.name) === key)) {
		throw new Error('duplicate_name');
	}

	const program: MockCatalogProgramNode = {
		...applyProgramMetadataCreate(
			{
				id: `prog-${Date.now()}`,
				name: body.name.trim(),
				archived: false,
			},
			body,
		),
		events: [],
	};
	mockCatalogState.push(program);
	return program;
}

export function mockUpdateProgram(id: string, patch: PatchCatalogProgramBody): CatalogProgram {
	const program = mockCatalogState.find((entry) => entry.id === id);
	if (!program) {
		throw new Error('program_not_found');
	}
	if (patch.name !== undefined) {
		const key = normalizeProgramName(patch.name);
		if (mockCatalogState.some((entry) => entry.id !== id && normalizeProgramName(entry.name) === key)) {
			throw new Error('duplicate_name');
		}
		program.name = patch.name.trim();
	}
	if (patch.archived === true) {
		program.archived = true;
		program.events.forEach((event) => {
			event.archived = true;
			event.archivedViaProgramId = program.id;
		});
	}
	if (patch.archived === false) {
		program.archived = false;
		program.events.forEach((event) => {
			event.archived = false;
			event.archivedViaProgramId = null;
		});
	}
	const merged = mergeProgramMetadata(program, patch);
	Object.assign(program, merged);
	return program;
}

export function mockCreateEvent(body: CreateCatalogEventBody): CatalogEvent {
	const start = body.start?.trim();
	if (!start) {
		throw new Error('invalid_start');
	}

	const base = applyEventMetadataCreate(
		{
			id: `ev-${Date.now()}`,
			programId: body.programId?.trim() || null,
			name: body.name.trim(),
			start,
			status: 'active',
			publishState: body.publishState ?? 'draft',
			archived: false,
			archivedViaProgramId: null,
		},
		body,
	);

	if (body.programId?.trim()) {
		const program = mockCatalogState.find((entry) => entry.id === body.programId);
		if (!program) {
			throw new Error('program_not_found');
		}
		const event = { ...base, programId: program.id };
		program.events.push(event);
		return event;
	}

	const standalone = { ...base, programId: null };
	mockStandaloneEvents.push(standalone);
	return standalone;
}

export function mockUpdateEvent(id: string, patch: PatchCatalogEventBody): CatalogEvent {
	for (const program of mockCatalogState) {
		const event = program.events.find((entry) => entry.id === id);
		if (!event) {
			continue;
		}
		if (patch.name !== undefined) {
			event.name = patch.name.trim();
		}
		if (patch.archived !== undefined) {
			if (patch.archived === false && program.archived) {
				throw new Error('program_archived');
			}
			event.archived = patch.archived;
		}
		const merged = mergeEventMetadata(event, patch);
		Object.assign(event, merged);
		return event;
	}

	const standaloneIndex = mockStandaloneEvents.findIndex((entry) => entry.id === id);
	if (standaloneIndex >= 0) {
		const event = mockStandaloneEvents[standaloneIndex];
		if (patch.name !== undefined) {
			event.name = patch.name.trim();
		}
		if (patch.archived !== undefined) {
			event.archived = patch.archived;
		}
		const merged = mergeEventMetadata(event, patch);
		Object.assign(event, merged);
		return event;
	}

	throw new Error('event_not_found');
}

// --- Email dispatch (Slice 2 mock) ---

interface MockEmailDispatchRecord extends EmailDispatchListItem {
	programId: string;
	eventId: string;
	templateId: string;
	audience: DispatchAudienceRequest;
	completedAt: string | null;
}

const MOCK_EMAIL_DISPATCH_TEMPLATES: EmailTemplatesListResponse['templates'] = [
	{ id: '123456789', name: '48-hour reminder', description: 'Marketing Hub' },
	{ id: 'tpl-invite', name: 'Initial Invitation', description: 'Marketing Hub — first touch' },
	{ id: 'tpl-qr', name: 'QR Ticket Dispatch', description: 'Marketing Hub — event entry' },
];

const MOCK_EMAIL_SEGMENTS: EmailSegmentsListResponse['segments'] = [
	{ id: '987', name: 'VIP prospects', kind: 'active' },
	{ id: '654', name: 'Static invite list', kind: 'static' },
];

const MOCK_SEGMENT_RECIPIENT_COUNTS: Record<string, number> = {
	'987': 24,
	'654': 8,
};

const MOCK_SEGMENT_MEMBER_EMAILS: Record<string, string[]> = {
	'987': ['vip1@example.com', 'vip2@example.com', 'vip3@example.com'],
	'654': ['static1@example.com', 'static2@example.com'],
};

const INITIAL_MOCK_EMAIL_DISPATCHES: MockEmailDispatchRecord[] = [
	{
		dispatchId: 'dsp-completed-001',
		dispatchName: 'Meeting Room reminder',
		programId: 'prog-atlassian-2026',
		eventId: 'ev-mr-2026',
		templateId: '123456789',
		templateName: '48-hour reminder',
		audience: { type: 'registered_all' },
		audienceSummary: 'All registered (2)',
		status: 'completed',
		scheduledAtUtc: null,
		timezone: null,
		recipientCountPlanned: 2,
		recipientCountSent: 2,
		createdBy: 'admin@adaptavist.com',
		createdAt: '2026-10-01T10:00:00.000Z',
		completedAt: '2026-10-01T10:02:00.000Z',
	},
	{
		dispatchId: 'dsp-scheduled-001',
		dispatchName: 'VIP invite wave 1',
		programId: 'prog-atlassian-2026',
		eventId: 'ev-mr-2026',
		templateId: '123456789',
		templateName: '48-hour reminder',
		audience: { type: 'hubspot_segment', segmentId: '987' },
		audienceSummary: 'Segment: VIP prospects (Active)',
		status: 'pending',
		scheduledAtUtc: '2026-12-15T08:00:00.000Z',
		timezone: 'Europe/London',
		recipientCountPlanned: 24,
		recipientCountSent: 0,
		createdBy: 'admin@adaptavist.com',
		createdAt: '2026-10-01T11:00:00.000Z',
		completedAt: null,
	},
];

const INITIAL_MOCK_EMAIL_RECIPIENTS: Record<string, DispatchRecipientRow[]> = {
	'dsp-completed-001': [
		{
			dispatchId: 'dsp-completed-001',
			contactId: 'mock-101',
			email: 'jane.doe@acme.com',
			outcome: 'sent',
			sentAt: '2026-10-01T10:01:30.000Z',
		},
		{
			dispatchId: 'dsp-completed-001',
			contactId: 'mock-202',
			email: 'pat@partner.com',
			outcome: 'sent',
			sentAt: '2026-10-01T10:01:45.000Z',
		},
	],
};

const mockEmailDispatchesState: MockEmailDispatchRecord[] = structuredClone(INITIAL_MOCK_EMAIL_DISPATCHES);
const mockEmailRecipientsState: Record<string, DispatchRecipientRow[]> = structuredClone(INITIAL_MOCK_EMAIL_RECIPIENTS);
const mockEmailIdempotencyKeys = new Map<string, string>();
let mockEmailDispatchesCreatedThisHour = 0;

export function resetMockEmailDispatchState(): void {
	mockEmailDispatchesState.length = 0;
	mockEmailDispatchesState.push(...structuredClone(INITIAL_MOCK_EMAIL_DISPATCHES));
	for (const key of Object.keys(mockEmailRecipientsState)) {
		delete mockEmailRecipientsState[key];
	}
	Object.assign(mockEmailRecipientsState, structuredClone(INITIAL_MOCK_EMAIL_RECIPIENTS));
	mockEmailIdempotencyKeys.clear();
	mockEmailDispatchesCreatedThisHour = 0;
}

function emailDispatchKey(programId: string, eventId: string): string {
	return `${programId}:${eventId}`;
}

/** Event-scoped lookup — programId ignored (mock calls may pass `_standalone`). */
function findMockEmailDispatch(_programId: string, eventId: string, dispatchId: string): MockEmailDispatchRecord | undefined {
	return mockEmailDispatchesState.find(
		(entry) => entry.eventId === eventId && entry.dispatchId === dispatchId,
	);
}

/** Event-scoped list — programId ignored (mock calls may pass `_standalone`). */
function listMockEmailDispatches(_programId: string, eventId: string): MockEmailDispatchRecord[] {
	return mockEmailDispatchesState.filter((entry) => entry.eventId === eventId);
}

function resolveMockRegisteredAttendees(eventId: string, audience: DispatchAudienceRequest): SliceAttendee[] {
	const attendees = mockSliceAttendeesState[eventId] ?? [];
	if (audience.type === 'registered_all') {
		return attendees;
	}
	if (audience.type === 'registered_checked_in') {
		return attendees.filter((entry) => entry.checkedIn);
	}
	if (audience.type === 'registered_not_checked_in') {
		return attendees.filter((entry) => !entry.checkedIn);
	}
	if (audience.type === 'registered_manual') {
		const ids = new Set(audience.contactIds);
		return attendees.filter((entry) => ids.has(entry.contactId));
	}
	return [];
}

function resolveMockAudienceCount(eventId: string, audience: DispatchAudienceRequest): number {
	if (audience.type === 'hubspot_segment') {
		return MOCK_SEGMENT_RECIPIENT_COUNTS[audience.segmentId] ?? 0;
	}
	return resolveMockRegisteredAttendees(eventId, audience).length;
}

function buildMockAudienceSummary(eventId: string, audience: DispatchAudienceRequest): string {
	const count = resolveMockAudienceCount(eventId, audience);
	if (audience.type === 'registered_all') {
		return `All registered (${count})`;
	}
	if (audience.type === 'registered_checked_in') {
		return `Checked in only (${count})`;
	}
	if (audience.type === 'registered_not_checked_in') {
		return `Not checked in (${count})`;
	}
	if (audience.type === 'registered_manual') {
		return `Manual selection (${count})`;
	}
	if (audience.type !== 'hubspot_segment') {
		return `Audience (${count})`;
	}
	const segment = MOCK_EMAIL_SEGMENTS.find((entry) => entry.id === audience.segmentId);
	const label = segment?.name ?? 'Segment';
	const kindLabel = segment?.kind === 'static' ? 'Static' : 'Active';
	return `Segment: ${label} (${kindLabel})`;
}

function toListItem(record: MockEmailDispatchRecord): EmailDispatchListItem {
	const { programId: _programId, eventId: _eventId, templateId: _templateId, audience, completedAt: _completedAt, ...item } =
		record;
	const listItem: EmailDispatchListItem = { ...item, audience };
	if (record.status === 'pending' && record.scheduledAtUtc) {
		const scheduledMs = new Date(record.scheduledAtUtc).getTime();
		const minutesUntil = (scheduledMs - Date.now()) / 60_000;
		if (minutesUntil <= 15 && minutesUntil >= 0) {
			return { ...listItem, lockWarning: true };
		}
	}
	return listItem;
}

export function getMockEmailLimits(_programId: string, _eventId: string): EmailDispatchLimits {
	return {
		dispatchLimitPerHour: 10,
		dispatchUsedThisHour: mockEmailDispatchesCreatedThisHour,
		largeSendThreshold: CONFIG.EMAIL_SEND_CONFIRM_THRESHOLD,
	};
}

export function getMockEmailTemplates(_programId: string, _eventId: string): EmailTemplatesListResponse {
	return { templates: MOCK_EMAIL_DISPATCH_TEMPLATES.map((template) => ({ ...template })) };
}

export function getMockEmailSegments(_programId: string, _eventId: string): EmailSegmentsListResponse {
	return { segments: MOCK_EMAIL_SEGMENTS.map((segment) => ({ ...segment })) };
}

export function mockPreviewEmailDispatch(
	_programId: string,
	eventId: string,
	body: EmailPreviewRequestBody,
): EmailPreviewResponse {
	if (!MOCK_EMAIL_DISPATCH_TEMPLATES.some((template) => template.id === body.templateId)) {
		throw new Error('template_not_found');
	}
	if (body.audience.type === 'registered_manual' && body.audience.contactIds.length === 0) {
		throw new Error('validation_error');
	}
	if (body.audience.type === 'hubspot_segment') {
		const segmentId = body.audience.segmentId;
		if (!MOCK_EMAIL_SEGMENTS.some((segment) => segment.id === segmentId)) {
			throw new Error('segment_not_found');
		}
	}
	return { recipientCount: resolveMockAudienceCount(eventId, body.audience) };
}

function buildMockRecipients(
	dispatchId: string,
	eventId: string,
	audience: DispatchAudienceRequest,
	sentAt: string,
): DispatchRecipientRow[] {
	if (audience.type === 'hubspot_segment') {
		const emails = MOCK_SEGMENT_MEMBER_EMAILS[audience.segmentId] ?? [];
		return emails.map((email, index) => ({
			dispatchId,
			contactId: `segment-${audience.segmentId}-${index + 1}`,
			email,
			outcome: 'sent',
			sentAt,
		}));
	}
	return resolveMockRegisteredAttendees(eventId, audience).map((attendee) => ({
		dispatchId,
		contactId: attendee.contactId,
		email: attendee.email,
		outcome: 'sent',
		sentAt,
	}));
}

export function mockCreateEmailDispatch(
	programId: string,
	eventId: string,
	body: CreateEmailDispatchBody,
): CreateEmailDispatchResponse {
	const idempotencyKey = `${emailDispatchKey(programId, eventId)}:${body.idempotencyKey}`;
	const existingId = mockEmailIdempotencyKeys.get(idempotencyKey);
	if (existingId) {
		const existing = findMockEmailDispatch(programId, eventId, existingId);
		if (existing) {
			return {
				dispatchId: existing.dispatchId,
				status: existing.status,
				recipientCountPlanned: existing.recipientCountPlanned,
				scheduledAtUtc: existing.scheduledAtUtc,
				timezone: existing.timezone,
			};
		}
	}

	if (mockEmailDispatchesCreatedThisHour >= 10) {
		throw new Error('rate_limited');
	}

	const preview = mockPreviewEmailDispatch(programId, eventId, {
		templateId: body.templateId,
		audience: body.audience,
	});
	if (preview.recipientCount <= 0) {
		throw new Error('validation_error');
	}

	if (
		preview.recipientCount >= CONFIG.EMAIL_SEND_CONFIRM_THRESHOLD &&
		body.largeSendConfirmed !== true
	) {
		throw new Error('large_send_confirmation_required');
	}

	if (body.scheduledAtUtc !== null) {
		if (!body.timezone) {
			throw new Error('validation_error');
		}
		assertScheduleFields(body.scheduledAtUtc, body.timezone);
	}

	const template = MOCK_EMAIL_DISPATCH_TEMPLATES.find((entry) => entry.id === body.templateId);
	if (!template) {
		throw new Error('template_not_found');
	}

	const dispatchId = `dsp-${crypto.randomUUID().slice(0, 8)}`;
	const now = new Date().toISOString();
	const isScheduled = body.scheduledAtUtc !== null;
	const status = isScheduled ? 'pending' : 'processing';

	const record: MockEmailDispatchRecord = {
		dispatchId,
		dispatchName: body.dispatchName.trim(),
		programId,
		eventId,
		templateId: body.templateId,
		templateName: template.name,
		audience: body.audience,
		audienceSummary: buildMockAudienceSummary(eventId, body.audience),
		status,
		scheduledAtUtc: body.scheduledAtUtc,
		timezone: body.timezone,
		recipientCountPlanned: preview.recipientCount,
		recipientCountSent: 0,
		createdBy: 'admin@adaptavist.com',
		createdAt: now,
		completedAt: null,
	};

	mockEmailDispatchesState.unshift(record);
	mockEmailIdempotencyKeys.set(idempotencyKey, dispatchId);
	mockEmailDispatchesCreatedThisHour += 1;

	if (!isScheduled) {
		const sentAt = new Date().toISOString();
		const recipients = buildMockRecipients(dispatchId, eventId, body.audience, sentAt);
		mockEmailRecipientsState[dispatchId] = recipients;
		record.status = 'completed';
		record.recipientCountSent = recipients.length;
		record.completedAt = sentAt;
	}

	return {
		dispatchId,
		status: record.status,
		recipientCountPlanned: record.recipientCountPlanned,
		scheduledAtUtc: record.scheduledAtUtc,
		timezone: record.timezone,
	};
}

export function getMockEmailDispatches(
	programId: string,
	eventId: string,
	query: { view?: 'scheduled' | 'log'; page?: number; pageSize?: number } = {},
): EmailDispatchListResponse {
	const page = query.page ?? 1;
	const pageSize = query.pageSize ?? 50;
	let filtered = listMockEmailDispatches(programId, eventId);

	if (query.view === 'scheduled') {
		filtered = filtered.filter((entry) => entry.status === 'pending');
	} else if (query.view === 'log') {
		filtered = filtered.filter((entry) => ['completed', 'failed', 'processing'].includes(entry.status));
	}

	filtered = [...filtered].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
	const total = filtered.length;
	const start = (page - 1) * pageSize;

	return {
		dispatches: filtered.slice(start, start + pageSize).map((entry) => toListItem(entry)),
		page,
		pageSize,
		total,
	};
}

export function getMockEmailDispatchDetail(
	programId: string,
	eventId: string,
	dispatchId: string,
	query: { page?: number; pageSize?: number } = {},
): EmailDispatchDetailResponse {
	const record = findMockEmailDispatch(programId, eventId, dispatchId);
	if (!record) {
		throw new Error('dispatch_not_found');
	}

	const page = query.page ?? 1;
	const pageSize = query.pageSize ?? 50;
	const recipients = mockEmailRecipientsState[dispatchId] ?? [];
	const start = (page - 1) * pageSize;

	return {
		dispatch: { ...toListItem(record), completedAt: record.completedAt },
		recipients: recipients.slice(start, start + pageSize),
		page,
		pageSize,
		total: recipients.length,
	};
}

export function mockUpdateEmailDispatch(
	programId: string,
	eventId: string,
	dispatchId: string,
	body: PatchEmailDispatchBody,
): EmailDispatchListItem {
	const record = findMockEmailDispatch(programId, eventId, dispatchId);
	if (!record) {
		throw new Error('dispatch_not_found');
	}
	if (record.status !== 'pending') {
		throw new Error('dispatch_locked');
	}

	const template = MOCK_EMAIL_DISPATCH_TEMPLATES.find((entry) => entry.id === body.templateId);
	if (!template) {
		throw new Error('template_not_found');
	}

	const preview = mockPreviewEmailDispatch(programId, eventId, {
		templateId: body.templateId,
		audience: body.audience,
	});
	if (preview.recipientCount <= 0) {
		throw new Error('validation_error');
	}

	if (
		preview.recipientCount >= CONFIG.EMAIL_SEND_CONFIRM_THRESHOLD &&
		body.largeSendConfirmed !== true
	) {
		throw new Error('large_send_confirmation_required');
	}

	if (!body.scheduledAtUtc || !body.timezone) {
		throw new Error('validation_error');
	}
	assertScheduleFields(body.scheduledAtUtc, body.timezone);

	record.dispatchName = body.dispatchName.trim();
	record.templateId = body.templateId;
	record.templateName = template.name;
	record.audience = body.audience;
	record.audienceSummary = buildMockAudienceSummary(eventId, body.audience);
	record.scheduledAtUtc = body.scheduledAtUtc;
	record.timezone = body.timezone;
	record.recipientCountPlanned = preview.recipientCount;

	return toListItem(record);
}

export function mockCancelEmailDispatch(
	programId: string,
	eventId: string,
	dispatchId: string,
): CancelEmailDispatchResponse {
	const record = findMockEmailDispatch(programId, eventId, dispatchId);
	if (!record) {
		throw new Error('dispatch_not_found');
	}
	if (record.status !== 'pending') {
		throw new Error('dispatch_locked');
	}
	record.status = 'cancelled';
	return { dispatchId, status: 'cancelled' };
}

/** Mock theme-preference store (T021) — a single in-memory value, mirroring the real
 * per-user Record Storage row. `email` simulates the server-side Celebration allowlist
 * re-validation the real `user/prefs` route performs (contracts/theme-preference-api.md). */
let mockThemePreference: ThemeId = DEFAULT_THEME_ID;

export function getMockThemePreference(email?: string | null): ThemePreference {
	const celebrationAllowed = isCelebrationEmail(email);
	const theme = mockThemePreference === 'celebration' && !celebrationAllowed ? 'aurora' : mockThemePreference;
	return {
		theme,
		celebrationAllowed,
		celebrationToastMessage: resolveMockCelebrationToastMessage(email),
	};
}

export function setMockThemePreference(theme: ThemeId, email?: string | null): ThemePreference {
	const celebrationAllowed = isCelebrationEmail(email);
	if (theme === 'celebration' && !celebrationAllowed) {
		throw new Error('celebration_not_allowed');
	}
	mockThemePreference = theme;
	return {
		theme,
		celebrationAllowed,
		celebrationToastMessage: resolveMockCelebrationToastMessage(email),
		updatedAt: new Date().toISOString(),
	};
}

export function resetMockThemePreference(): void {
	mockThemePreference = DEFAULT_THEME_ID;
}
