import { describe, expect, it } from 'vitest';
import {
	normalizeAttendee,
	normalizeAttendeesResponse,
	normalizeCatalogResponse,
	normalizeCheckInScanResponse,
	normalizeConfirmCheckInResponse,
	normalizeCapacityStatusResponse,
	normalizeCreateEmailDispatchResponse,
	normalizeCancelEmailDispatchResponse,
	normalizeEmailDispatchDetailResponse,
	normalizeEmailDispatchListResponse,
	normalizeEmailLimitsResponse,
	normalizeEmailPreviewResponse,
	normalizeEmailSegmentsResponse,
	normalizeEmailTemplatesResponse,
	normalizeEvent,
	normalizeEventResponse,
	normalizeEventsResponse,
	normalizeSliceAttendeesResponse,
} from './normalizeApi';

describe('normalizeEvent', () => {
	it('maps API startDate to UI date fields', () => {
		const result = normalizeEvent({
			id: 'evt-123',
			name: 'London Q3 Summit',
			startDate: '2026-10-15T09:00:00.000Z',
			endDate: '2026-10-15T17:00:00.000Z',
			location: 'The Shard',
			status: 'active',
			attendeeCount: 150,
		});

		expect(result).toMatchObject({
			id: 'evt-123',
			name: 'London Q3 Summit',
			dateIso: '2026-10-15',
			location: 'The Shard',
			status: 'active',
			attendeeCount: 150,
		});
		expect(result?.date).toBeTruthy();
	});

	it('passes through UI-shaped mock events unchanged', () => {
		const uiEvent = {
			id: 'evt-mock',
			name: 'Mock Event',
			date: 'Oct 15, 2026',
			dateIso: '2026-10-15',
			location: 'London',
			status: 'active',
			attendeeCount: 10,
			capacity: 20,
			type: 'In-person',
			owner: 'events@adaptavist.com',
			registrationClose: 'Oct 10, 2026',
			hubspotId: 'HS-1',
			description: 'Test',
		};

		expect(normalizeEvent(uiEvent)).toEqual(uiEvent);
	});

	it('returns null for missing input', () => {
		expect(normalizeEvent(null)).toBeNull();
		expect(normalizeEvent(undefined)).toBeNull();
	});
});

describe('normalizeAttendee', () => {
	it('combines firstName and lastName and maps API status', () => {
		const result = normalizeAttendee({
			id: 'c-001',
			firstName: 'Jane',
			lastName: 'Doe',
			email: 'jane@example.com',
			company: 'Adaptavist',
			status: 'checked_in',
		});

		expect(result).toMatchObject({
			id: 'c-001',
			name: 'Jane Doe',
			email: 'jane@example.com',
			company: 'Adaptavist',
			status: 'Checked In',
		});
	});

	it('passes through UI-shaped mock attendees unchanged', () => {
		const uiAttendee = {
			id: 'c-001',
			name: 'Jane Doe',
			email: 'jane@example.com',
			company: 'Adaptavist',
			status: 'Registered',
			ticketType: 'General',
			registeredAt: '2026-08-01',
			source: 'HubSpot form',
		};

		expect(normalizeAttendee(uiAttendee)).toEqual(uiAttendee);
	});
});

describe('normalizeEventsResponse', () => {
	it('normalizes each event in the list', () => {
		const result = normalizeEventsResponse({
			events: [{ id: 'evt-1', name: 'Summit', startDate: '2026-10-15T09:00:00.000Z', status: 'active' }],
			page: 1,
			total: 1,
		});

		expect(result.events).toHaveLength(1);
		expect(result.events[0]?.dateIso).toBe('2026-10-15');
		expect(result.page).toBe(1);
	});
});

describe('normalizeEventResponse', () => {
	it('unwraps { event } wrapper', () => {
		const result = normalizeEventResponse({
			event: { id: 'evt-1', name: 'Summit', startDate: '2026-10-15T09:00:00.000Z' },
		});
		expect(result.event?.id).toBe('evt-1');
	});

	it('accepts a bare event object', () => {
		const result = normalizeEventResponse({ id: 'evt-2', name: 'Webinar', startDate: '2026-11-02T10:00:00.000Z' });
		expect(result.event?.id).toBe('evt-2');
	});
});

describe('normalizeAttendeesResponse', () => {
	it('normalizes each attendee in the list', () => {
		const result = normalizeAttendeesResponse({
			attendees: [{ id: 'c-1', firstName: 'A', lastName: 'B', status: 'registered' }],
			total: 1,
		});

		expect(result.attendees[0]?.name).toBe('A B');
		expect(result.attendees[0]?.status).toBe('Registered');
		expect(result.total).toBe(1);
	});
});

describe('normalizeCatalogResponse', () => {
	it('maps API catalog tree fields to UI types', () => {
		const result = normalizeCatalogResponse({
			programs: [
				{
					id: 'prog-1',
					name: 'Atlassian Event 2026',
					hubspotFormIds: ['form-1', 'form-2'],
					archived: false,
					events: [
						{
							id: 'ev-1',
							name: 'Meeting Room',
							partsAttendedOption: 'Meeting Room',
							attendanceProperty: 'atlassian_event__customer_event_attendance',
							archived: false,
						},
					],
				},
			],
		});

		expect(result.programs[0]).toMatchObject({
			id: 'prog-1',
			name: 'Atlassian Event 2026',
			hubspotFormIds: ['form-1', 'form-2'],
			events: [
				{
					id: 'ev-1',
					name: 'Meeting Room',
					partsAttendedOption: 'Meeting Room',
					attendanceProperty: 'atlassian_event__customer_event_attendance',
					archived: false,
				},
			],
		});
	});

	it('migrates legacy hubspotFormId to hubspotFormIds array', () => {
		const result = normalizeCatalogResponse({
			programs: [
				{
					id: 'prog-legacy',
					name: 'Legacy Program',
					hubspotFormId: 'legacy-form',
					archived: false,
					events: [],
				},
			],
		});

		expect(result.programs[0]?.hubspotFormIds).toEqual(['legacy-form']);
	});

	it('passes through optional Program metadata fields', () => {
		const result = normalizeCatalogResponse({
			programs: [
				{
					id: 'prog-meta',
					name: 'Meta Program',
					hubspotFormIds: ['form-meta'],
					archived: false,
					description: 'Annual flagship',
					startDate: '2026-09-01',
					endDate: '2026-09-05',
					location: 'London',
					timezone: 'Europe/London',
					events: [],
				},
			],
		});

		expect(result.programs[0]).toMatchObject({
			description: 'Annual flagship',
			startDate: '2026-09-01',
			endDate: '2026-09-05',
			location: 'London',
			timezone: 'Europe/London',
		});
	});

	it('passes through optional Event metadata fields', () => {
		const walkInFormUrl = 'https://share.hsforms.com/1a2b3c4d-e5f6-7890-abcd-ef1234567890';
		const result = normalizeCatalogResponse({
			programs: [
				{
					id: 'prog-1',
					name: 'Host',
					hubspotFormIds: ['form-1'],
					archived: false,
					events: [
						{
							id: 'ev-1',
							name: 'Keynote',
							partsAttendedOption: 'Keynote',
							attendanceProperty: 'atlassian_event__customer_event_attendance',
							archived: false,
							owner: 'Events Team',
							date: '2026-09-02',
							capacity: 12.5,
							walkInFormUrl,
						},
					],
				},
			],
		});

		expect(result.programs[0]?.events[0]).toMatchObject({
			owner: 'Events Team',
			date: '2026-09-02',
			capacity: 12.5,
			walkInFormUrl,
		});
	});

	it('treats legacy catalog nodes without metadata keys as unset', () => {
		const result = normalizeCatalogResponse({
			programs: [
				{
					id: 'legacy-prog',
					name: 'Legacy Program',
					hubspotFormId: 'legacy-form',
					archived: false,
					events: [
						{
							id: 'legacy-ev',
							name: 'Legacy Event',
							partsAttendedOption: 'Legacy Event',
							attendanceProperty: 'atlassian_event__customer_event_attendance',
							archived: false,
						},
					],
				},
			],
		});

		expect(result.programs[0]?.description).toBeUndefined();
		expect(result.programs[0]?.events[0]?.owner).toBeUndefined();
	});
});

describe('normalizeSliceAttendeesResponse', () => {
	it('maps API attendee rows and pagination fields', () => {
		const result = normalizeSliceAttendeesResponse({
			attendees: [
				{
					contactId: 'c-001',
					firstName: 'Jane',
					lastName: 'Doe',
					company: 'Acme',
					email: 'jane@acme.com',
					accountManager: 'owner-1',
					attendeeType: 'customer',
					checkedIn: false,
				},
				{
					contactId: 'c-002',
					firstName: 'Pat',
					lastName: 'Lee',
					company: 'Partner Co',
					email: 'pat@partner.com',
					accountManager: 'owner-2',
					attendeeType: 'partner',
					checkedIn: true,
				},
			],
			page: 2,
			pageSize: 50,
			total: 120,
		});

		expect(result).toEqual({
			attendees: [
				{
					contactId: 'c-001',
					firstName: 'Jane',
					lastName: 'Doe',
					company: 'Acme',
					email: 'jane@acme.com',
					accountManager: 'owner-1',
					attendeeType: 'customer',
					checkedIn: false,
					checkedInAt: null,
				},
				{
					contactId: 'c-002',
					firstName: 'Pat',
					lastName: 'Lee',
					company: 'Partner Co',
					email: 'pat@partner.com',
					accountManager: 'owner-2',
					attendeeType: 'partner',
					checkedIn: true,
					checkedInAt: null,
				},
			],
			page: 2,
			pageSize: 50,
			total: 120,
		});
	});

	it('defaults missing fields and treats unknown attendeeType as customer', () => {
		const result = normalizeSliceAttendeesResponse({
			attendees: [{ contactId: 'c-003', attendeeType: 'unknown' }],
		});

		expect(result.attendees[0]).toMatchObject({
			contactId: 'c-003',
			firstName: '',
			lastName: '',
			attendeeType: 'customer',
			checkedIn: false,
			checkedInAt: null,
		});
		expect(result.page).toBe(1);
		expect(result.pageSize).toBe(50);
		expect(result.total).toBe(1);
	});

	it('returns empty attendees when response.attendees is missing', () => {
		expect(normalizeSliceAttendeesResponse({ page: 1, pageSize: 50, total: 0 })).toEqual({
			attendees: [],
			page: 1,
			pageSize: 50,
			total: 0,
		});
	});
});

describe('normalizeCheckInScanResponse', () => {
	it('maps API contact summary and route ids', () => {
		const result = normalizeCheckInScanResponse({
			contact: {
				contactId: 'c-001',
				firstName: 'Jane',
				lastName: 'Doe',
				company: 'Acme',
				email: 'jane@acme.com',
				accountManager: 'sam@adaptavist.com',
				attendeeType: 'customer',
				checkedIn: false,
			},
			programId: 'prog-2026',
			eventId: 'ev-mr',
		});

		expect(result).toEqual({
			contact: {
				contactId: 'c-001',
				firstName: 'Jane',
				lastName: 'Doe',
				company: 'Acme',
				email: 'jane@acme.com',
				accountManager: 'sam@adaptavist.com',
				attendeeType: 'customer',
				checkedIn: false,
			},
			programId: 'prog-2026',
			eventId: 'ev-mr',
		});
	});

	it('defaults missing contact fields', () => {
		const result = normalizeCheckInScanResponse({ programId: 'prog-1', eventId: 'ev-1' });

		expect(result.contact).toMatchObject({
			contactId: '',
			firstName: '',
			lastName: '',
			attendeeType: null,
			checkedIn: false,
		});
	});
});

describe('normalizeConfirmCheckInResponse', () => {
	it('maps confirm payload fields', () => {
		const result = normalizeConfirmCheckInResponse({
			contactId: 'c-001',
			checkedIn: true,
			alreadyCheckedIn: false,
			attendeeType: 'partner',
		});

		expect(result).toEqual({
			contactId: 'c-001',
			checkedIn: true,
			alreadyCheckedIn: false,
			attendeeType: 'partner',
		});
	});

	it('treats unknown attendeeType as null', () => {
		const result = normalizeConfirmCheckInResponse({
			contactId: 'c-002',
			checkedIn: true,
			alreadyCheckedIn: true,
			attendeeType: 'unknown',
		});

		expect(result.attendeeType).toBeNull();
	});
});

describe('normalizeCapacityStatusResponse', () => {
	it('maps capacity snapshot fields', () => {
		const result = normalizeCapacityStatusResponse({
			programId: 'prog-1',
			eventId: 'ev-1',
			capacity: 100,
			checkedInCount: 42,
			departureCount: 3,
			liveAttendance: 39,
		});

		expect(result).toEqual({
			programId: 'prog-1',
			eventId: 'ev-1',
			capacity: 100,
			checkedInCount: 42,
			departureCount: 3,
			liveAttendance: 39,
		});
	});

	it('normalizes unset or zero capacity to null', () => {
		expect(normalizeCapacityStatusResponse({ capacity: 0 }).capacity).toBeNull();
		expect(normalizeCapacityStatusResponse({ capacity: null }).capacity).toBeNull();
	});
});

describe('normalizeEmailLimitsResponse', () => {
	it('maps dispatch limit fields', () => {
		expect(
			normalizeEmailLimitsResponse({
				dispatchLimitPerHour: 10,
				dispatchUsedThisHour: 2,
				largeSendThreshold: 50,
			}),
		).toEqual({
			dispatchLimitPerHour: 10,
			dispatchUsedThisHour: 2,
			largeSendThreshold: 50,
		});
	});
});

describe('normalizeEmailTemplatesResponse', () => {
	it('maps template list items', () => {
		const result = normalizeEmailTemplatesResponse({
			templates: [{ id: '123', name: 'Reminder', description: 'Marketing Hub' }],
		});

		expect(result.templates).toEqual([{ id: '123', name: 'Reminder', description: 'Marketing Hub' }]);
	});
});

describe('normalizeEmailSegmentsResponse', () => {
	it('maps segment kinds', () => {
		const result = normalizeEmailSegmentsResponse({
			segments: [
				{ id: '987', name: 'VIP', kind: 'active' },
				{ id: '654', name: 'Static list', kind: 'static' },
				{ id: 'bad', name: 'Unknown', kind: 'other' },
			],
		});

		expect(result.segments[0]?.kind).toBe('active');
		expect(result.segments[1]?.kind).toBe('static');
		expect(result.segments[2]?.kind).toBe('active');
	});
});

describe('normalizeEmailPreviewResponse', () => {
	it('maps recipient count', () => {
		expect(normalizeEmailPreviewResponse({ recipientCount: 42 })).toEqual({ recipientCount: 42 });
	});
});

describe('normalizeCreateEmailDispatchResponse', () => {
	it('maps create dispatch response', () => {
		expect(
			normalizeCreateEmailDispatchResponse({
				dispatchId: 'dsp-1',
				status: 'processing',
				recipientCountPlanned: 12,
				scheduledAtUtc: null,
				timezone: null,
			}),
		).toEqual({
			dispatchId: 'dsp-1',
			status: 'processing',
			recipientCountPlanned: 12,
			scheduledAtUtc: null,
			timezone: null,
		});
	});
});

describe('normalizeEmailDispatchListResponse', () => {
	it('maps dispatch list rows with lockWarning', () => {
		const result = normalizeEmailDispatchListResponse({
			dispatches: [
				{
					dispatchId: 'dsp-1',
					dispatchName: 'Reminder',
					templateName: '48-hour reminder',
					audienceSummary: 'All registered (2)',
					status: 'pending',
					scheduledAtUtc: '2026-12-15T08:00:00.000Z',
					timezone: 'Europe/London',
					recipientCountPlanned: 2,
					recipientCountSent: 0,
					createdBy: 'admin@adaptavist.com',
					createdAt: '2026-10-01T10:00:00.000Z',
					lockWarning: true,
				},
			],
			page: 1,
			pageSize: 50,
			total: 1,
		});

		expect(result.dispatches[0]?.lockWarning).toBe(true);
		expect(result.total).toBe(1);
	});
});

describe('normalizeEmailDispatchDetailResponse', () => {
	it('maps dispatch detail and recipients', () => {
		const result = normalizeEmailDispatchDetailResponse({
			dispatch: {
				dispatchId: 'dsp-1',
				dispatchName: 'Reminder',
				templateName: '48-hour reminder',
				audienceSummary: 'Checked in only (1)',
				status: 'completed',
				scheduledAtUtc: null,
				timezone: null,
				recipientCountPlanned: 1,
				recipientCountSent: 1,
				createdBy: 'admin@adaptavist.com',
				createdAt: '2026-10-01T10:00:00.000Z',
				completedAt: '2026-10-01T10:02:00.000Z',
			},
			recipients: [
				{
					dispatchId: 'dsp-1',
					contactId: 'c-001',
					email: 'jane@acme.com',
					outcome: 'sent',
					sentAt: '2026-10-01T10:01:30.000Z',
				},
			],
			page: 1,
			pageSize: 50,
			total: 1,
		});

		expect(result.dispatch.completedAt).toBe('2026-10-01T10:02:00.000Z');
		expect(result.recipients[0]?.email).toBe('jane@acme.com');
	});
});

describe('normalizeCancelEmailDispatchResponse', () => {
	it('maps cancelled status', () => {
		expect(normalizeCancelEmailDispatchResponse({ dispatchId: 'dsp-1', status: 'cancelled' })).toEqual({
			dispatchId: 'dsp-1',
			status: 'cancelled',
		});
	});
});
