import { describe, expect, it } from 'vitest';
import {
	normalizeAttendeeCommunicationsResponse,
	normalizeAttendeeDetailResponse,
	normalizeCatalogResponse,
	normalizeCheckInScanResponse,
	normalizeConfirmCheckInResponse,
	normalizeCapacityStatusResponse,
	normalizeCapacitySummaryResponse,
	normalizeCreateEmailDispatchResponse,
	normalizeCancelEmailDispatchResponse,
	normalizeEmailDispatchDetailResponse,
	normalizeEmailDispatchListResponse,
	normalizeEmailLimitsResponse,
	normalizeEmailPreviewResponse,
	normalizeEmailSegmentsResponse,
	normalizeEmailTemplatesResponse,
	normalizeSliceAttendeesResponse,
} from './normalizeApi';

describe('normalizeCatalogResponse', () => {
	it('maps API flat catalog fields to UI types', () => {
		const result = normalizeCatalogResponse({
			programs: [
				{
					id: 'prog-1',
					name: 'Atlassian Event 2026',
					archived: false,
				},
			],
			events: [
				{
					id: 'ev-1',
					name: 'Meeting Room',
					start: '2026-09-02T09:00:00.000Z',
					status: 'active',
					publishState: 'published',
					archived: false,
					programId: 'prog-1',
				},
			],
		});

		expect(result.programs[0]).toMatchObject({
			id: 'prog-1',
			name: 'Atlassian Event 2026',
			archived: false,
		});
		expect(result.events[0]).toMatchObject({
			id: 'ev-1',
			name: 'Meeting Room',
			start: '2026-09-02T09:00:00.000Z',
			status: 'active',
			publishState: 'published',
			archived: false,
			programId: 'prog-1',
		});
	});

	it('defaults missing Event status/publishState and null programId for standalone', () => {
		const result = normalizeCatalogResponse({
			programs: [],
			events: [
				{
					id: 'ev-solo',
					name: 'Standalone',
					start: '2026-10-01T09:00:00.000Z',
					archived: false,
					programId: null,
				},
			],
		});

		expect(result.events[0]).toMatchObject({
			programId: null,
			status: 'active',
			publishState: 'draft',
		});
	});

	it('passes through optional Program metadata fields', () => {
		const result = normalizeCatalogResponse({
			programs: [
				{
					id: 'prog-meta',
					name: 'Meta Program',
					archived: false,
					description: 'Annual flagship',
					startDate: '2026-09-01',
					endDate: '2026-09-05',
				},
			],
			events: [],
		});

		expect(result.programs[0]).toMatchObject({
			description: 'Annual flagship',
			startDate: '2026-09-01',
			endDate: '2026-09-05',
		});
		expect(result.programs[0]).not.toHaveProperty('location');
		expect(result.programs[0]).not.toHaveProperty('hubspotFormIds');
	});

	it('passes through optional Event metadata fields', () => {
		const walkInFormUrl = 'https://share.hsforms.com/1a2b3c4d-e5f6-7890-abcd-ef1234567890';
		const result = normalizeCatalogResponse({
			programs: [
				{
					id: 'prog-1',
					name: 'Host',
					archived: false,
				},
			],
			events: [
				{
					id: 'ev-1',
					name: 'Keynote',
					start: '2026-09-02T09:00:00.000Z',
					end: '2026-09-02T17:00:00.000Z',
					status: 'cancelled',
					publishState: 'draft',
					archived: false,
					programId: 'prog-1',
					owner: 'Events Team',
					location: 'London',
					capacity: 12.5,
					walkInFormUrl,
					registrationFormUrl: 'https://share.hsforms.com/reg',
					registrationSlug: 'keynote-2026',
				},
			],
		});

		expect(result.events[0]).toMatchObject({
			owner: 'Events Team',
			start: '2026-09-02T09:00:00.000Z',
			end: '2026-09-02T17:00:00.000Z',
			status: 'cancelled',
			location: 'London',
			capacity: 12.5,
			walkInFormUrl,
			registrationFormUrl: 'https://share.hsforms.com/reg',
			registrationSlug: 'keynote-2026',
		});
		expect(result.events[0]).not.toHaveProperty('partsAttendedOption');
		expect(result.events[0]).not.toHaveProperty('date');
	});

	it('treats legacy catalog nodes without metadata keys as unset', () => {
		const result = normalizeCatalogResponse({
			programs: [
				{
					id: 'legacy-prog',
					name: 'Legacy Program',
					archived: false,
				},
			],
			events: [
				{
					id: 'legacy-ev',
					name: 'Legacy Event',
					start: '2026-09-01T09:00:00.000Z',
					archived: false,
					programId: 'legacy-prog',
				},
			],
		});

		expect(result.programs[0]?.description).toBeUndefined();
		expect(result.events[0]?.owner).toBeUndefined();
		expect(result.events[0]?.status).toBe('active');
		expect(result.events[0]?.publishState).toBe('draft');
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
					checkedInAt: '2026-07-16T08:52:00.000Z',
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
					checkedInAt: '2026-07-16T08:52:00.000Z',
				},
			],
			page: 2,
			pageSize: 50,
			total: 120,
		});
	});

	it('defaults checkedInAt to null when the API omits it or sends a non-string value', () => {
		const result = normalizeSliceAttendeesResponse({
			attendees: [
				{ contactId: 'c-003', checkedIn: false },
				{ contactId: 'c-004', checkedIn: true, checkedInAt: 12345 },
			],
		});

		expect(result.attendees[0]?.checkedInAt).toBeNull();
		expect(result.attendees[1]?.checkedInAt).toBeNull();
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
			checkedInAt: '2026-07-16T09:00:00.000Z',
		});

		expect(result).toEqual({
			contactId: 'c-001',
			checkedIn: true,
			alreadyCheckedIn: false,
			attendeeType: 'partner',
			checkedInAt: '2026-07-16T09:00:00.000Z',
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

	it('defaults checkedInAt to null when missing (undo response)', () => {
		const result = normalizeConfirmCheckInResponse({
			contactId: 'c-003',
			checkedIn: false,
			alreadyCheckedIn: true,
			attendeeType: 'customer',
		});

		expect(result.checkedInAt).toBeNull();
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

describe('normalizeCapacitySummaryResponse', () => {
	it('maps rows including a standalone (null programId) and a null-capacity event', () => {
		const result = normalizeCapacitySummaryResponse({
			events: [
				{
					eventId: 'ev-mr-2026',
					programId: 'prog-atlassian-2026',
					capacity: 100,
					registeredCount: 55,
					checkedInCount: 42,
				},
				{ eventId: 'ev-solo-2026', programId: null, capacity: null, registeredCount: 9, checkedInCount: 7 },
			],
		});

		expect(result).toEqual({
			events: [
				{
					eventId: 'ev-mr-2026',
					programId: 'prog-atlassian-2026',
					capacity: 100,
					registeredCount: 55,
					checkedInCount: 42,
				},
				{ eventId: 'ev-solo-2026', programId: null, capacity: null, registeredCount: 9, checkedInCount: 7 },
			],
		});
	});

	it('normalizes unset or zero capacity to null, same rule as the per-event route', () => {
		const result = normalizeCapacitySummaryResponse({
			events: [
				{ eventId: 'ev-1', capacity: 0, checkedInCount: 0 },
				{ eventId: 'ev-2', checkedInCount: 0 },
			],
		});

		expect(result.events[0]!.capacity).toBeNull();
		expect(result.events[1]!.capacity).toBeNull();
	});

	it('returns an empty array for an empty portfolio and tolerates missing/odd fields', () => {
		expect(normalizeCapacitySummaryResponse({})).toEqual({ events: [] });
		expect(normalizeCapacitySummaryResponse({ events: [] })).toEqual({ events: [] });

		const result = normalizeCapacitySummaryResponse({ events: [{}] });
		expect(result.events).toEqual([
			{ eventId: '', programId: null, capacity: null, registeredCount: 0, checkedInCount: 0 },
		]);
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
			ticketsEnabled: false,
		});
	});

	it('maps ticketsEnabled through when the template was QR-tagged', () => {
		expect(
			normalizeCreateEmailDispatchResponse({
				dispatchId: 'dsp-1',
				status: 'processing',
				recipientCountPlanned: 12,
				scheduledAtUtc: null,
				timezone: null,
				ticketsEnabled: true,
			}),
		).toMatchObject({ ticketsEnabled: true });
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
					ticketsEnabled: true,
				},
			],
			page: 1,
			pageSize: 50,
			total: 1,
		});

		expect(result.dispatches[0]?.lockWarning).toBe(true);
		expect(result.dispatches[0]?.ticketsEnabled).toBe(true);
		expect(result.total).toBe(1);
	});

	it('defaults ticketsEnabled to false when absent', () => {
		const result = normalizeEmailDispatchListResponse({
			dispatches: [
				{
					dispatchId: 'dsp-2',
					dispatchName: 'Ordinary reminder',
					templateName: '48-hour reminder',
					audienceSummary: 'All registered (2)',
					status: 'completed',
					scheduledAtUtc: null,
					timezone: null,
					recipientCountPlanned: 2,
					recipientCountSent: 2,
					createdBy: 'admin@adaptavist.com',
					createdAt: '2026-10-01T10:00:00.000Z',
				},
			],
			page: 1,
			pageSize: 50,
			total: 1,
		});

		expect(result.dispatches[0]?.ticketsEnabled).toBe(false);
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

describe('normalizeAttendeeDetailResponse', () => {
	it('maps a fully-populated response, including pending fields once real data exists', () => {
		const result = normalizeAttendeeDetailResponse({
			contactId: 'c-001',
			firstName: 'Amara',
			lastName: 'Okafor',
			company: 'Northwind',
			email: 'amara.okafor@northwind.io',
			accountManager: 'sam@adaptavist.com',
			attendeeType: 'customer',
			checkedIn: true,
			checkedInAt: '2026-09-02T08:52:00.000Z',
			phone: '+1 415 555 0101',
			jobTitle: 'Marketing Director',
			dietaryRequirement: 'Gluten-free',
			registrationSource: 'form',
			journey: [
				{ type: 'registered', timestamp: null, label: 'Registered', source: 'this_event' },
				{
					type: 'dispatch_sent',
					timestamp: '2026-08-15T09:00:00.000Z',
					label: 'Confirmation email sent',
					source: 'this_event',
				},
				{
					type: 'checked_in',
					timestamp: '2026-09-02T08:52:00.000Z',
					label: 'Checked in at the venue',
					source: 'this_event',
				},
			],
			registrationAnswerHistory: [
				{
					answers: { 'What would you like to discuss?': 'Renewal timeline' },
					source: 'registration',
					observedAt: '2026-08-01T10:00:00.000Z',
					slot: 1,
				},
			],
		});

		expect(result).toEqual({
			contactId: 'c-001',
			firstName: 'Amara',
			lastName: 'Okafor',
			company: 'Northwind',
			email: 'amara.okafor@northwind.io',
			accountManager: 'sam@adaptavist.com',
			attendeeType: 'customer',
			checkedIn: true,
			checkedInAt: '2026-09-02T08:52:00.000Z',
			phone: '+1 415 555 0101',
			jobTitle: 'Marketing Director',
			dietaryRequirement: 'Gluten-free',
			registrationSource: 'form',
			journey: [
				{ type: 'registered', timestamp: null, label: 'Registered', source: 'this_event' },
				{
					type: 'dispatch_sent',
					timestamp: '2026-08-15T09:00:00.000Z',
					label: 'Confirmation email sent',
					source: 'this_event',
				},
				{
					type: 'checked_in',
					timestamp: '2026-09-02T08:52:00.000Z',
					label: 'Checked in at the venue',
					source: 'this_event',
				},
			],
			registrationAnswerHistory: [
				{
					answers: { 'What would you like to discuss?': 'Renewal timeline' },
					source: 'registration',
					observedAt: '2026-08-01T10:00:00.000Z',
					slot: 1,
				},
			],
		});
	});

	it('never fabricates pending fields — missing/non-string values normalize to null, not a placeholder', () => {
		const result = normalizeAttendeeDetailResponse({
			contactId: 'c-002',
			attendeeType: 'partner',
			checkedIn: false,
			journey: [],
		});

		expect(result).toMatchObject({
			phone: null,
			jobTitle: null,
			dietaryRequirement: null,
			registrationSource: null,
			checkedInAt: null,
			journey: [],
			registrationAnswerHistory: [],
		});
	});

	it('falls back an unrecognized journey step type to "registered" rather than throwing', () => {
		const result = normalizeAttendeeDetailResponse({
			contactId: 'c-003',
			attendeeType: 'customer',
			checkedIn: false,
			journey: [{ type: 'not_a_real_step', timestamp: null, label: 'Mystery step', source: 'this_event' }],
		});

		expect(result.journey[0]).toMatchObject({ type: 'registered', label: 'Mystery step' });
	});

	it('normalizes registrationAnswerHistory multi-select (string[]) answers and defaults an unrecognized source to registration', () => {
		const result = normalizeAttendeeDetailResponse({
			contactId: 'c-004',
			attendeeType: 'customer',
			checkedIn: false,
			journey: [],
			registrationAnswerHistory: [
				{
					answers: { 'Which sessions?': ['Keynote', 'Workshop'] },
					source: 'not_a_real_source',
					observedAt: '2026-08-01T10:00:00.000Z',
					slot: 2,
				},
			],
		});

		expect(result.registrationAnswerHistory).toEqual([
			{
				answers: { 'Which sessions?': ['Keynote', 'Workshop'] },
				source: 'registration',
				observedAt: '2026-08-01T10:00:00.000Z',
				slot: 2,
			},
		]);
	});
});

describe('normalizeAttendeeCommunicationsResponse', () => {
	it('maps a merged timeline of this-Event steps and tagged non-Event communications', () => {
		const result = normalizeAttendeeCommunicationsResponse({
			contactId: 'c-001',
			cutoffTimestamp: '2026-08-15T09:00:00.000Z',
			timeline: [
				{ type: 'registered', timestamp: null, label: 'Registered', source: 'this_event' },
				{
					type: 'dispatch_sent',
					timestamp: '2026-11-02T09:00:00.000Z',
					label: 'Post-Event Thank You — Executive Roundtable sent',
					source: 'other_event',
					tag: { kind: 'other_event', eventName: 'Executive Roundtable 2026' },
				},
				{
					type: 'dispatch_sent',
					timestamp: '2026-12-10T09:00:00.000Z',
					label: 'Developer Newsletter — Q4 Digest sent',
					source: 'external',
					tag: { kind: 'external' },
				},
			],
		});

		expect(result).toEqual({
			contactId: 'c-001',
			cutoffTimestamp: '2026-08-15T09:00:00.000Z',
			timeline: [
				{ type: 'registered', timestamp: null, label: 'Registered', source: 'this_event' },
				{
					type: 'dispatch_sent',
					timestamp: '2026-11-02T09:00:00.000Z',
					label: 'Post-Event Thank You — Executive Roundtable sent',
					source: 'other_event',
					tag: { kind: 'other_event', eventName: 'Executive Roundtable 2026' },
				},
				{
					type: 'dispatch_sent',
					timestamp: '2026-12-10T09:00:00.000Z',
					label: 'Developer Newsletter — Q4 Digest sent',
					source: 'external',
					tag: { kind: 'external' },
				},
			],
		});
	});

	it('returns an empty timeline when the response omits it', () => {
		expect(normalizeAttendeeCommunicationsResponse({ contactId: 'c-001', cutoffTimestamp: '2026-01-01' })).toEqual({
			contactId: 'c-001',
			cutoffTimestamp: '2026-01-01',
			timeline: [],
		});
	});

	it('distinguishes a this_event step from a tagged CommunicationItem by the presence of `tag`, not `source`', () => {
		const result = normalizeAttendeeCommunicationsResponse({
			contactId: 'c-001',
			cutoffTimestamp: '2026-01-01',
			timeline: [{ type: 'dispatch_sent', timestamp: '2026-01-02', label: 'No tag here', source: 'this_event' }],
		});

		expect(result.timeline[0]).not.toHaveProperty('tag');
		expect(result.timeline[0]).toMatchObject({ source: 'this_event' });
	});
});
