/** @typedef {'active' | 'draft' | 'cancelled' | 'completed'} EventStatus */
/** @typedef {'Registered' | 'Checked In' | 'Cancelled'} AttendeeStatus */
/** @typedef {'In-person' | 'Virtual' | 'Hybrid'} EventType */

/**
 * Sample mock data for EMS PoC — replaced by ScriptRunner API in Phase 2+.
 */

/** @type {Array<{ id: string; name: string; date: string; dateIso: string; endDate?: string; location: string; status: EventStatus; attendeeCount: number; capacity: number; type: EventType; owner: string; registrationClose: string; hubspotId: string; description: string }>} */
export const MOCK_EVENTS = [
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

/** @type {Record<string, Array<{ id: string; name: string; email: string; company: string; status: AttendeeStatus; ticketType: string; registeredAt: string; source: string }>>} */
export const MOCK_ATTENDEES = {
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

/** @type {Array<{ id: string; name: string; description: string; category: string }>} */
export const MOCK_TEMPLATES = [
    { id: 'tpl-invite', name: 'Initial Invitation', description: 'Marketing Hub — first touch', category: 'Invitation' },
    { id: 'tpl-qr', name: 'QR Ticket Dispatch', description: 'Marketing Hub — event entry', category: 'Transactional' },
    { id: 'tpl-reminder', name: '48-Hour Final Reminder', description: 'Marketing Hub — urgency', category: 'Reminder' },
    { id: 'tpl-survey', name: 'Post-Event Survey', description: 'Marketing Hub — feedback', category: 'Follow-up' },
    { id: 'tpl-vip', name: 'VIP Lounge Access', description: 'Marketing Hub — VIP segment', category: 'Transactional' },
];

/** @type {Array<{ id: string; eventId: string; actorEmail: string; action: string; templateName: string; recipientCount: number; timestamp: string; outcome: string }>} */
export const MOCK_AUDIT_LOG = [
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

/** @type {Record<string, { checkedIn: number; registered: number; cancelled: number }>} */
export const MOCK_ANALYTICS = {
    'evt-london-q3': { checkedIn: 45, registered: 98, cancelled: 7 },
    'evt-tech-webinar': { checkedIn: 0, registered: 85, cancelled: 0 },
    'evt-ams-meetup': { checkedIn: 18, registered: 42, cancelled: 2 },
    'evt-atlassian-team': { checkedIn: 265, registered: 40, cancelled: 7 },
    'evt-roadshow-dublin': { checkedIn: 0, registered: 0, cancelled: 48 },
    'evt-internal-townhall': { checkedIn: 120, registered: 300, cancelled: 0 },
};

/** @type {Record<string, { sent: number; opened: number; clicked: number; bounced: number }>} */
export const MOCK_CAMPAIGN_METRICS = {
    'evt-london-q3': { sent: 247, opened: 231, clicked: 142, bounced: 3 },
    'evt-tech-webinar': { sent: 0, opened: 0, clicked: 0, bounced: 0 },
    'evt-ams-meetup': { sent: 58, opened: 52, clicked: 31, bounced: 1 },
    'evt-atlassian-team': { sent: 420, opened: 398, clicked: 210, bounced: 5 },
    'evt-roadshow-dublin': { sent: 48, opened: 40, clicked: 12, bounced: 2 },
    'evt-internal-townhall': { sent: 420, opened: 405, clicked: 88, bounced: 0 },
};

/** @type {Record<string, Array<{ id: string; templateName: string; segment: string; scheduledAt: string; recipientCount: number; status: string }>>} */
export const MOCK_SCHEDULED_EMAILS = {
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

/** @type {Record<string, Array<{ id: string; time: string; title: string; speaker: string; location: string; track: string }>>} */
export const MOCK_AGENDA = {
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

/** @type {Record<string, Array<{ id: string; timestamp: string; summary: string; actor: string }>>} */
export const MOCK_ACTIVITY = {
    'evt-london-q3': [
        { id: 'act-1', timestamp: '2026-07-01T09:30:00Z', summary: 'Reminder email sent to 142 registrants', actor: 'events@adaptavist.com' },
        { id: 'act-2', timestamp: '2026-06-30T16:00:00Z', summary: '12 new registrations synced from HubSpot', actor: 'System' },
        { id: 'act-3', timestamp: '2026-06-28T14:15:00Z', summary: 'Invitation send scheduled for Oct 13', actor: 'events@adaptavist.com' },
    ],
    'evt-ams-meetup': [
        { id: 'act-4', timestamp: '2026-06-25T11:00:00Z', summary: 'Partner invitation sent to 58 contacts', actor: 'events@adaptavist.com' },
    ],
};

/**
 * @param {string} eventId
 * @returns {typeof MOCK_EVENTS[number] | undefined}
 */
export function getEventById(eventId) {
    return MOCK_EVENTS.find((event) => event.id === eventId);
}

/**
 * @param {AttendeeStatus | 'All'} filter
 * @param {Array<{ status: AttendeeStatus }>} attendees
 */
export function filterAttendees(filter, attendees) {
    if (filter === 'All') {
        return attendees;
    }
    return attendees.filter((person) => person.status === filter);
}

/**
 * @param {AttendeeStatus | 'All'} segment
 * @param {Array<{ status: AttendeeStatus }>} attendees
 */
export function countSegment(segment, attendees) {
    return filterAttendees(segment, attendees).length;
}

/**
 * @param {string} query
 * @param {Array<{ name: string; email: string; company: string }>} attendees
 */
export function searchAttendees(query, attendees) {
    const needle = query.trim().toLowerCase();
    if (!needle) {
        return attendees;
    }
    return attendees.filter(
        (person) =>
            person.name.toLowerCase().includes(needle) ||
            person.email.toLowerCase().includes(needle) ||
            person.company.toLowerCase().includes(needle),
    );
}

/**
 * @param {EventStatus | 'all'} status
 * @param {typeof MOCK_EVENTS} events
 */
export function filterEventsByStatus(status, events) {
    if (status === 'all') {
        return events;
    }
    return events.filter((event) => event.status === status);
}

/**
 * @param {string} query
 * @param {typeof MOCK_EVENTS} events
 */
export function searchEvents(query, events) {
    const needle = query.trim().toLowerCase();
    if (!needle) {
        return events;
    }
    return events.filter(
        (event) =>
            event.name.toLowerCase().includes(needle) ||
            event.location.toLowerCase().includes(needle) ||
            event.hubspotId.toLowerCase().includes(needle),
    );
}

/**
 * @param {typeof MOCK_EVENTS} events
 */
export function getPortfolioStats(events) {
    const active = events.filter((event) => event.status === 'active').length;
    const registrations = events.reduce((sum, event) => sum + event.attendeeCount, 0);
    return { total: events.length, active, registrations };
}

/**
 * @param {string} eventId
 * @param {typeof MOCK_AUDIT_LOG} entries
 */
export function getAuditLogForEvent(eventId, entries = MOCK_AUDIT_LOG) {
    return entries.filter((entry) => entry.eventId === eventId);
}
