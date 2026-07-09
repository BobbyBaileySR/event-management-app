import type {
	ActivityItem,
	AgendaSession,
	AnalyticsConversion,
	Attendee,
	AuditEntry,
	AuditLogEntry,
	CampaignMetrics,
	CancelEmailDispatchResponse,
	CatalogEvent,
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
	Event,
	ScheduledEmail,
	SliceAttendee,
	SliceAttendeesResponse,
} from '../types';
import { CONFIG } from '../config';
import { assertScheduleFields } from '../utils/emailSchedule';

/**
 * Sample mock data for EMS PoC — replaced by ScriptRunner API in Phase 2+.
 */

export const MOCK_EVENTS: Event[] = [
    {
        id: 'evt-london-q3',
        name: 'London Q3 Summit',
        date: 'Oct 15, 2026',
        dateIso: '2026-10-15',
        endDate: 'Oct 15, 2026',
        location: 'The Shard, London',
        status: 'active',
        attendeeCount: 150,
        capacity: 200,
        type: 'In-person',
        owner: 'events@adaptavist.com',
        registrationClose: 'Oct 10, 2026',
        hubspotId: 'HS-EVT-8842',
        description: 'Flagship customer and partner summit for EMEA — keynotes, breakouts, and networking.',
    },
    {
        id: 'evt-tech-webinar',
        name: 'Tech Webinar Series — AI in DevOps',
        date: 'Nov 02, 2026',
        dateIso: '2026-11-02',
        location: 'Virtual (Zoom)',
        status: 'draft',
        attendeeCount: 85,
        capacity: 500,
        type: 'Virtual',
        owner: 'marketing@adaptavist.com',
        registrationClose: 'Nov 01, 2026',
        hubspotId: 'HS-EVT-9011',
        description: 'Monthly technical webinar. Draft — landing page not yet published in HubSpot.',
    },
    {
        id: 'evt-ams-meetup',
        name: 'Amsterdam Partner Meetup',
        date: 'Dec 08, 2026',
        dateIso: '2026-12-08',
        location: 'WeWork, Amsterdam',
        status: 'active',
        attendeeCount: 62,
        capacity: 80,
        type: 'In-person',
        owner: 'events@adaptavist.com',
        registrationClose: 'Dec 05, 2026',
        hubspotId: 'HS-EVT-9156',
        description: 'Regional partner enablement evening with product updates and roadmap preview.',
    },
    {
        id: 'evt-atlassian-team',
        name: 'Atlassian Team \'26 — Booth & Sessions',
        date: 'Sep 18, 2026',
        dateIso: '2026-09-18',
        endDate: 'Sep 20, 2026',
        location: 'Las Vegas, NV',
        status: 'completed',
        attendeeCount: 312,
        capacity: 350,
        type: 'Hybrid',
        owner: 'events@adaptavist.com',
        registrationClose: 'Sep 01, 2026',
        hubspotId: 'HS-EVT-8720',
        description: 'Conference presence — booth staff, scheduled demos, and VIP dinner.',
    },
    {
        id: 'evt-roadshow-dublin',
        name: 'Dublin Roadshow',
        date: 'Aug 22, 2026',
        dateIso: '2026-08-22',
        location: 'Convention Centre Dublin',
        status: 'cancelled',
        attendeeCount: 48,
        capacity: 120,
        type: 'In-person',
        owner: 'events@adaptavist.com',
        registrationClose: 'Aug 15, 2026',
        hubspotId: 'HS-EVT-8601',
        description: 'Cancelled due to venue scheduling conflict — registrants notified via HubSpot workflow.',
    },
    {
        id: 'evt-internal-townhall',
        name: 'Adaptavist Internal Town Hall',
        date: 'Jul 15, 2026',
        dateIso: '2026-07-15',
        location: 'Virtual (Google Meet)',
        status: 'active',
        attendeeCount: 420,
        capacity: 500,
        type: 'Virtual',
        owner: 'internal-comms@adaptavist.com',
        registrationClose: 'Jul 14, 2026',
        hubspotId: 'HS-EVT-8422',
        description: 'Company-wide quarterly update — staff registration only.',
    },
];

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

export const MOCK_ANALYTICS: Record<string, AnalyticsConversion> = {
    'evt-london-q3': { checkedIn: 45, registered: 98, cancelled: 7 },
    'evt-tech-webinar': { checkedIn: 0, registered: 85, cancelled: 0 },
    'evt-ams-meetup': { checkedIn: 18, registered: 42, cancelled: 2 },
    'evt-atlassian-team': { checkedIn: 265, registered: 40, cancelled: 7 },
    'evt-roadshow-dublin': { checkedIn: 0, registered: 0, cancelled: 48 },
    'evt-internal-townhall': { checkedIn: 120, registered: 300, cancelled: 0 },
};

export const MOCK_CAMPAIGN_METRICS: Record<string, CampaignMetrics> = {
    'evt-london-q3': { sent: 247, opened: 231, clicked: 142, bounced: 3 },
    'evt-tech-webinar': { sent: 0, opened: 0, clicked: 0, bounced: 0 },
    'evt-ams-meetup': { sent: 58, opened: 52, clicked: 31, bounced: 1 },
    'evt-atlassian-team': { sent: 420, opened: 398, clicked: 210, bounced: 5 },
    'evt-roadshow-dublin': { sent: 48, opened: 40, clicked: 12, bounced: 2 },
    'evt-internal-townhall': { sent: 420, opened: 405, clicked: 88, bounced: 0 },
};

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

export const MOCK_AGENDA: Record<string, AgendaSession[]> = {
    'evt-london-q3': [
        { id: 'ag-1', time: '09:00', title: 'Registration & breakfast', speaker: '—', location: 'Level 31 foyer', track: 'General' },
        { id: 'ag-2', time: '10:00', title: 'Opening keynote', speaker: 'CEO', location: 'Main hall', track: 'Keynote' },
        { id: 'ag-3', time: '11:30', title: 'Breakout: Cloud migration', speaker: 'Product team', location: 'Room A', track: 'Technical' },
        { id: 'ag-4', time: '14:00', title: 'Partner roundtable', speaker: 'Partner success', location: 'Room B', track: 'Partners' },
        { id: 'ag-5', time: '17:00', title: 'Networking reception', speaker: '—', location: 'Terrace', track: 'General' },
    ],
    'evt-ams-meetup': [
        { id: 'ag-6', time: '18:00', title: 'Doors open', speaker: '—', location: 'WeWork lounge', track: 'General' },
        { id: 'ag-7', time: '18:30', title: 'Product roadmap preview', speaker: 'EMEA lead', location: 'Main space', track: 'Product' },
    ],
    'evt-atlassian-team': [
        { id: 'ag-8', time: '10:00', title: 'Booth opens', speaker: 'Events team', location: 'Expo floor', track: 'General' },
        { id: 'ag-9', time: '15:00', title: 'VIP demo session', speaker: 'Solutions', location: 'Meeting room 12', track: 'VIP' },
    ],
};

export const MOCK_ACTIVITY: Record<string, ActivityItem[]> = {
    'evt-london-q3': [
        { id: 'act-1', timestamp: '2026-07-01T09:30:00Z', summary: 'Reminder email sent to 142 registrants', actor: 'events@adaptavist.com' },
        { id: 'act-2', timestamp: '2026-06-30T16:00:00Z', summary: '12 new registrations synced from HubSpot', actor: 'System' },
        { id: 'act-3', timestamp: '2026-06-28T14:15:00Z', summary: 'Invitation send scheduled for Oct 13', actor: 'events@adaptavist.com' },
    ],
    'evt-ams-meetup': [
        { id: 'act-4', timestamp: '2026-06-25T11:00:00Z', summary: 'Partner invitation sent to 58 contacts', actor: 'events@adaptavist.com' },
    ],
};

export function getEventById(eventId: string): Event | undefined {
    return MOCK_EVENTS.find((event) => event.id === eventId);
}

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

const INITIAL_MOCK_CATALOG: CatalogResponse = {
	programs: [
		{
			id: 'prog-atlassian-2026',
			name: 'Atlassian Event 2026',
			hubspotFormIds: ['mock-form-2026'],
			archived: false,
			events: [
				{
					id: 'ev-mr-2026',
					name: 'Meeting Room',
					partsAttendedOption: 'Meeting Room',
					attendanceProperty: 'atlassian_event__customer_event_attendance',
					archived: false,
					capacity: 100,
				},
				{
					id: 'ev-vip-2026',
					name: 'VIP Event',
					partsAttendedOption: 'VIP Event',
					attendanceProperty: 'atlassian_event__vip_event_attendance',
					archived: false,
				},
			],
		},
	],
};

const mockCatalogState: CatalogResponse = structuredClone(INITIAL_MOCK_CATALOG);

export function getMockCatalog(includeArchived = false): CatalogResponse {
	if (!includeArchived) {
		return {
			programs: mockCatalogState.programs
				.filter((program) => !program.archived)
				.map((program) => ({
					...program,
					events: program.events.filter((event) => !event.archived),
				})),
		};
	}

	const programs = mockCatalogState.programs
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
		.filter((program): program is CatalogProgram => program !== null);

	return { programs };
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

const mockDepartureCounts: Record<string, number> = {};

function mockCapacityKey(programId: string, eventId: string): string {
	return `${programId}/${eventId}`;
}

function mockEventCapacity(eventId: string): number | null {
	for (const program of mockCatalogState.programs) {
		const event = program.events.find((entry) => entry.id === eventId);
		if (event?.capacity !== undefined && Number.isFinite(event.capacity) && event.capacity > 0) {
			return event.capacity;
		}
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
		location: normalizeOptionalText(body.location),
		timezone: normalizeOptionalText(body.timezone),
	};
}

function mergeProgramMetadata(program: CatalogProgram, patch: PatchCatalogProgramBody): CatalogProgram {
	const next = { ...program };
	const metadataKeys = ['description', 'startDate', 'endDate', 'location', 'timezone'] as const;
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
	if (body.owner?.trim()) {
		next.owner = body.owner.trim();
	}
	if (body.description?.trim()) {
		next.description = body.description.trim();
	}
	if (body.date?.trim()) {
		next.date = body.date.trim();
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
	return next;
}

function mergeEventMetadata(event: CatalogEvent, patch: PatchCatalogEventBody): CatalogEvent {
	const next = { ...event };
	const textKeys = ['owner', 'description', 'date', 'location', 'walkInFormUrl'] as const;
	for (const key of textKeys) {
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
	if ('capacity' in patch) {
		if (patch.capacity === null) {
			delete next.capacity;
		} else if (patch.capacity !== undefined && Number.isFinite(patch.capacity)) {
			next.capacity = patch.capacity;
		}
	}
	return next;
}

export function mockCreateProgram(body: CreateCatalogProgramBody): CatalogProgram {
	const key = normalizeProgramName(body.name);
	if (mockCatalogState.programs.some((program) => normalizeProgramName(program.name) === key)) {
		throw new Error('duplicate_name');
	}

	const program = applyProgramMetadataCreate(
		{
			id: `prog-${Date.now()}`,
			name: body.name.trim(),
			hubspotFormIds: body.hubspotFormIds.map((id) => id.trim()).filter(Boolean),
			archived: false,
			events: [],
		},
		body,
	);
	mockCatalogState.programs.push(program);
	return program;
}

export function mockUpdateProgram(id: string, patch: PatchCatalogProgramBody): CatalogProgram {
	const program = mockCatalogState.programs.find((entry) => entry.id === id);
	if (!program) {
		throw new Error('program_not_found');
	}
	if (patch.name !== undefined) {
		const key = normalizeProgramName(patch.name);
		if (mockCatalogState.programs.some((entry) => entry.id !== id && normalizeProgramName(entry.name) === key)) {
			throw new Error('duplicate_name');
		}
		program.name = patch.name.trim();
	}
	if (patch.hubspotFormIds !== undefined) {
		program.hubspotFormIds = patch.hubspotFormIds.map((formId) => formId.trim()).filter(Boolean);
	}
	if (patch.archived === true) {
		program.archived = true;
		program.events.forEach((event) => {
			event.archived = true;
		});
	}
	if (patch.archived === false) {
		program.archived = false;
		program.events.forEach((event) => {
			event.archived = false;
		});
	}
	const merged = mergeProgramMetadata(program, patch);
	Object.assign(program, merged);
	return program;
}

export function mockCreateEvent(body: CreateCatalogEventBody): CatalogEvent {
	const program = mockCatalogState.programs.find((entry) => entry.id === body.programId);
	if (!program) {
		throw new Error('program_not_found');
	}
	const event = applyEventMetadataCreate(
		{
			id: `ev-${Date.now()}`,
			name: body.name.trim(),
			partsAttendedOption: body.partsAttendedOption.trim(),
			attendanceProperty: body.attendanceProperty.trim(),
			archived: false,
		},
		body,
	);
	program.events.push(event);
	return event;
}

export function mockUpdateEvent(id: string, patch: PatchCatalogEventBody): CatalogEvent {
	for (const program of mockCatalogState.programs) {
		const event = program.events.find((entry) => entry.id === id);
		if (!event) {
			continue;
		}
		if (patch.name !== undefined) {
			event.name = patch.name.trim();
		}
		if (patch.partsAttendedOption !== undefined) {
			event.partsAttendedOption = patch.partsAttendedOption.trim();
		}
		if (patch.attendanceProperty !== undefined) {
			event.attendanceProperty = patch.attendanceProperty.trim();
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

function findMockEmailDispatch(programId: string, eventId: string, dispatchId: string): MockEmailDispatchRecord | undefined {
	return mockEmailDispatchesState.find(
		(entry) => entry.programId === programId && entry.eventId === eventId && entry.dispatchId === dispatchId,
	);
}

function listMockEmailDispatches(programId: string, eventId: string): MockEmailDispatchRecord[] {
	return mockEmailDispatchesState.filter((entry) => entry.programId === programId && entry.eventId === eventId);
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
