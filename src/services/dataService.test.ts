import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	adjustCapacity,
	cancelEmailDispatch,
	checkInScan,
	confirmCheckIn,
	createDataService,
	fetchAttendeeCommunications,
	fetchAttendeeDetail,
	fetchAuditLog,
	fetchCatalog,
	fetchCapacitySummary,
	fetchEmailDispatchDetail,
	fetchEventAttendees,
	fetchEventCapacityStatus,
	fetchThemePreference,
	generateAttendeeLead,
	generateAttendeeLeadsBatch,
	removeAttendee,
	undoCheckIn,
	updateEmailDispatch,
	updateThemePreference,
} from './dataService';

vi.mock('../api/client', () => ({
	apiRequest: vi.fn(),
}));

import { apiRequest } from '../api/client';

const mockedApiRequest = vi.mocked(apiRequest);
const eventId = 'ev-mr-2026';
const token = 'session-token';

beforeEach(() => {
	mockedApiRequest.mockReset();
	mockedApiRequest.mockResolvedValue({});
});

describe('fetchAuditLog', () => {
	it('requests only page/pageSize when no filters are supplied', async () => {
		mockedApiRequest.mockResolvedValue({ entries: [], page: 1, pageSize: 50, total: 0 });

		await fetchAuditLog(undefined, { token, page: 1, pageSize: 50 });

		expect(mockedApiRequest).toHaveBeenCalledWith(
			'/audit/recent?page=1&pageSize=50',
			{},
			{ token },
		);
	});

	it('forwards the four filter options as query params', async () => {
		mockedApiRequest.mockResolvedValue({ entries: [], page: 1, pageSize: 50, total: 0 });

		await fetchAuditLog(undefined, {
			token,
			page: 1,
			pageSize: 50,
			action: 'checkin.confirm',
			actor: 'admin@adaptavist.com',
			resourceType: 'catalog_event',
			resourceId: 'ev-beta',
		});

		expect(mockedApiRequest).toHaveBeenCalledWith(
			'/audit/recent?page=1&pageSize=50&action=checkin.confirm&actor=admin%40adaptavist.com&resourceType=catalog_event&resourceId=ev-beta',
			{},
			{ token },
		);
	});

	it('scopes to an event path and still applies filters', async () => {
		mockedApiRequest.mockResolvedValue({ entries: [], page: 1, pageSize: 50, total: 0 });

		await fetchAuditLog(eventId, { token, action: 'catalog.event.update' });

		expect(mockedApiRequest).toHaveBeenCalledWith(
			`/events/${eventId}/audit?page=1&pageSize=50&action=catalog.event.update`,
			{},
			{ token },
		);
	});
});

describe('fetchCatalog', () => {
	it('calls GET /catalog with the bearer token and normalizes the response', async () => {
		mockedApiRequest.mockResolvedValue({
			events: [
				{
					id: 'evt-live',
					programId: null,
					name: 'Live Event',
					start: '2026-10-15T09:00:00.000Z',
					status: 'active',
					publishState: 'published',
					archived: false,
				},
			],
			programs: [],
		});

		const result = await fetchCatalog({ token: 'session-token-abc' });

		expect(mockedApiRequest).toHaveBeenCalledWith('/catalog', {}, { token: 'session-token-abc' });
		expect(result.events[0]?.id).toBe('evt-live');
		expect(result.events[0]?.start).toBe('2026-10-15T09:00:00.000Z');
	});

	it('adds includeArchived=true to the path', async () => {
		mockedApiRequest.mockResolvedValue({ events: [], programs: [] });
		await fetchCatalog({ token, includeArchived: true });
		expect(mockedApiRequest).toHaveBeenCalledWith('/catalog?includeArchived=true', {}, { token });
	});

	it('omits the token from request options when none is provided', async () => {
		mockedApiRequest.mockResolvedValue({ events: [], programs: [] });
		await fetchCatalog();
		expect(mockedApiRequest).toHaveBeenCalledWith('/catalog', {}, {});
	});
});

describe('createDataService', () => {
	it('binds the session token to fetch methods', async () => {
		mockedApiRequest.mockResolvedValue({ events: [], programs: [] });

		const service = createDataService('bound-token');
		await service.fetchCatalog();

		expect(mockedApiRequest).toHaveBeenCalledWith('/catalog', {}, { token: 'bound-token' });
	});
});

describe('attendees + check-in', () => {
	it('fetchEventAttendees builds the query string and hits the event-scoped route', async () => {
		mockedApiRequest.mockResolvedValue({ attendees: [], page: 1, pageSize: 25, total: 0 });
		await fetchEventAttendees(eventId, { checkedIn: false, q: 'Jane', page: 2, pageSize: 25 }, { token });
		expect(mockedApiRequest).toHaveBeenCalledWith(
			`events/${eventId}/attendees?checkedIn=false&q=Jane&page=2&pageSize=25`,
			{},
			{ token },
		);
	});

	it('checkInScan POSTs the jwt to the scan route', async () => {
		await checkInScan(eventId, 'jwt-token', { token });
		expect(mockedApiRequest).toHaveBeenCalledWith(
			`events/${eventId}/checkin/scan`,
			{ method: 'POST', body: JSON.stringify({ jwt: 'jwt-token' }) },
			{ token },
		);
	});

	it('confirmCheckIn POSTs the contactId and normalizes the result', async () => {
		mockedApiRequest.mockResolvedValue({
			contactId: 'c-live',
			checkedIn: true,
			alreadyCheckedIn: false,
			attendeeType: 'customer',
		});
		const result = await confirmCheckIn(eventId, 'c-live', { token });
		expect(mockedApiRequest).toHaveBeenCalledWith(
			`events/${eventId}/checkin`,
			{ method: 'POST', body: JSON.stringify({ contactId: 'c-live' }) },
			{ token },
		);
		expect(result).toMatchObject({ contactId: 'c-live', checkedIn: true });
	});

	it('undoCheckIn POSTs to checkin/undo', async () => {
		mockedApiRequest.mockResolvedValue({
			contactId: 'c-live',
			checkedIn: false,
			alreadyCheckedIn: true,
			attendeeType: 'customer',
		});
		const result = await undoCheckIn(eventId, 'c-live', { token });
		expect(mockedApiRequest).toHaveBeenCalledWith(
			`events/${eventId}/checkin/undo`,
			{ method: 'POST', body: JSON.stringify({ contactId: 'c-live' }) },
			{ token },
		);
		expect(result).toMatchObject({ contactId: 'c-live', checkedIn: false, alreadyCheckedIn: true });
	});

	it('removeAttendee calls DELETE on the attendee route', async () => {
		mockedApiRequest.mockResolvedValue({ contactId: 'c-live', removed: true });
		const result = await removeAttendee(eventId, 'c-live', { token });
		expect(mockedApiRequest).toHaveBeenCalledWith(
			`events/${eventId}/attendees/c-live`,
			{ method: 'DELETE' },
			{ token },
		);
		expect(result).toEqual({ contactId: 'c-live', removed: true });
	});

	it('fetchAttendeeDetail GETs the event-scoped attendee route and maps the response', async () => {
		mockedApiRequest.mockResolvedValue({
			contactId: 'c-live',
			firstName: 'Amara',
			lastName: 'Okafor',
			attendeeType: 'customer',
			checkedIn: false,
			journey: [],
		});
		const result = await fetchAttendeeDetail(eventId, 'c-live', { token });
		expect(mockedApiRequest).toHaveBeenCalledWith(`events/${eventId}/attendees/c-live`, {}, { token });
		expect(result).toMatchObject({ contactId: 'c-live', firstName: 'Amara', phone: null });
	});

	it('fetchAttendeeCommunications GETs the contact-scoped route with eventId as a query param', async () => {
		mockedApiRequest.mockResolvedValue({ contactId: 'c-live', cutoffTimestamp: '2026-01-01', timeline: [] });
		const result = await fetchAttendeeCommunications('c-live', eventId, { token });
		expect(mockedApiRequest).toHaveBeenCalledWith(
			`attendees/c-live/communications?eventId=${eventId}`,
			{},
			{ token },
		);
		expect(result).toEqual({ contactId: 'c-live', cutoffTimestamp: '2026-01-01', timeline: [] });
	});

	it('generateAttendeeLead POSTs the lead route and maps the response', async () => {
		mockedApiRequest.mockResolvedValue({ outcome: 'created', leadId: 'lead-1' });
		const result = await generateAttendeeLead(eventId, 'c-live', { includeFullHistory: true }, { token });
		expect(mockedApiRequest).toHaveBeenCalledWith(
			`events/${eventId}/attendees/c-live/lead`,
			{ method: 'POST', body: JSON.stringify({ includeFullHistory: true }) },
			{ token },
		);
		expect(result).toEqual({ outcome: 'created', leadId: 'lead-1' });
	});

	it('generateAttendeeLead defaults the body to {} when omitted', async () => {
		mockedApiRequest.mockResolvedValue({ outcome: 'created', leadId: 'lead-1' });
		await generateAttendeeLead(eventId, 'c-live', undefined, { token });
		expect(mockedApiRequest).toHaveBeenCalledWith(
			`events/${eventId}/attendees/c-live/lead`,
			{ method: 'POST', body: JSON.stringify({}) },
			{ token },
		);
	});

	it('generateAttendeeLeadsBatch POSTs the batch route and maps per-attendee results, defaulting an unknown outcome to failed', async () => {
		mockedApiRequest.mockResolvedValue({
			results: [
				{ contactId: 'c-1', outcome: 'created', leadId: 'lead-1' },
				{ contactId: 'c-2', outcome: 'nonsense-outcome' },
			],
		});
		const body = { contactIds: ['c-1', 'c-2'], batchConfirmed: true };
		const result = await generateAttendeeLeadsBatch(eventId, body, { token });
		expect(mockedApiRequest).toHaveBeenCalledWith(
			`events/${eventId}/attendees/lead-batch`,
			{ method: 'POST', body: JSON.stringify(body) },
			{ token },
		);
		expect(result).toEqual({
			results: [
				{ contactId: 'c-1', outcome: 'created', leadId: 'lead-1' },
				{ contactId: 'c-2', outcome: 'failed' },
			],
		});
	});
});

describe('capacity', () => {
	it('fetchEventCapacityStatus GETs the capacity route', async () => {
		mockedApiRequest.mockResolvedValue({ eventId, capacity: 100, checkedInCount: 1, departureCount: 0 });
		await fetchEventCapacityStatus(eventId, { token });
		expect(mockedApiRequest).toHaveBeenCalledWith(`events/${eventId}/capacity`, {}, { token });
	});

	it('adjustCapacity POSTs the direction', async () => {
		mockedApiRequest.mockResolvedValue({ eventId, capacity: 100, checkedInCount: 1, departureCount: 1 });
		await adjustCapacity(eventId, 'down', { token });
		expect(mockedApiRequest).toHaveBeenCalledWith(
			`events/${eventId}/capacity/adjust`,
			{ method: 'POST', body: JSON.stringify({ direction: 'down' }) },
			{ token },
		);
	});

	it('fetchCapacitySummary GETs the bulk summary route and normalizes the response', async () => {
		mockedApiRequest.mockResolvedValue({
			events: [{ eventId, programId: 'prog-1', capacity: 100, registeredCount: 55, checkedInCount: 42 }],
		});
		const result = await fetchCapacitySummary({ token });
		expect(mockedApiRequest).toHaveBeenCalledWith('events/capacity-summary', {}, { token });
		expect(result).toEqual({
			events: [{ eventId, programId: 'prog-1', capacity: 100, registeredCount: 55, checkedInCount: 42 }],
		});
	});
});

describe('theme preference', () => {
	it('maps getThemePreference to GET user/prefs', async () => {
		mockedApiRequest.mockResolvedValue({
			theme: 'darkAurora',
			celebrationAllowed: false,
			celebrationToastMessage: null,
		});

		const result = await fetchThemePreference({ token });

		expect(mockedApiRequest).toHaveBeenCalledWith('user/prefs', {}, { token });
		expect(result).toEqual({
			theme: 'darkAurora',
			celebrationAllowed: false,
			celebrationToastMessage: null,
		});
	});

	it('maps setThemePreference to PUT user/prefs/theme', async () => {
		mockedApiRequest.mockResolvedValue({
			theme: 'aurora',
			celebrationAllowed: false,
			celebrationToastMessage: null,
			updatedAt: '2026-07-13T10:00:00.000Z',
		});

		const result = await updateThemePreference('aurora', { token });

		expect(mockedApiRequest).toHaveBeenCalledWith(
			'user/prefs/theme',
			{ method: 'PUT', body: JSON.stringify({ theme: 'aurora' }) },
			{ token },
		);
		expect(result.updatedAt).toBe('2026-07-13T10:00:00.000Z');
	});

	it('never trusts an unrecognized theme value — normalizes to aurora', async () => {
		mockedApiRequest.mockResolvedValue({ theme: 'not-a-real-theme', celebrationAllowed: false });

		const result = await fetchThemePreference({ token });

		expect(result.theme).toBe('aurora');
	});
});

describe('email dispatch event-scoped routes', () => {
	it('routes each email method to its event-scoped path with the bearer token', async () => {
		mockedApiRequest.mockImplementation(async (route) => {
			if (route.endsWith('/email/limits')) {
				return { dispatchLimitPerHour: 10, dispatchUsedThisHour: 1, largeSendThreshold: 50 };
			}
			if (route.endsWith('/email/templates')) {
				return { templates: [{ id: '123456789', name: '48-hour reminder', description: 'Marketing Hub' }] };
			}
			if (route.endsWith('/email/segments')) {
				return { segments: [] };
			}
			if (route.endsWith('/email/preview')) {
				return { recipientCount: 2 };
			}
			if (route.endsWith('/email/dispatches') && !route.includes('?')) {
				return {
					dispatchId: 'dsp-live-001',
					status: 'processing',
					recipientCountPlanned: 2,
					scheduledAtUtc: null,
					timezone: null,
				};
			}
			if (route.includes('/email/dispatches?view=log')) {
				return { dispatches: [], page: 1, pageSize: 50, total: 0 };
			}
			return {};
		});

		const service = createDataService('email-token');
		await service.fetchEmailLimits(eventId);
		await service.fetchEmailTemplates(eventId);
		await service.fetchEmailSegments(eventId);
		await service.previewEmailDispatch(eventId, { templateId: '123456789', audience: { type: 'registered_all' } });
		await service.createEmailDispatch(eventId, {
			dispatchName: 'Live send',
			templateId: '123456789',
			audience: { type: 'registered_all' },
			scheduledAtUtc: null,
			timezone: null,
			idempotencyKey: '550e8400-e29b-41d4-a716-446655440000',
		});
		await service.fetchEmailDispatches(eventId, { view: 'log' });

		expect(mockedApiRequest).toHaveBeenCalledWith(`events/${eventId}/email/limits`, {}, { token: 'email-token' });
		expect(mockedApiRequest).toHaveBeenCalledWith(`events/${eventId}/email/templates`, {}, { token: 'email-token' });
		expect(mockedApiRequest).toHaveBeenCalledWith(`events/${eventId}/email/segments`, {}, { token: 'email-token' });
		expect(mockedApiRequest).toHaveBeenCalledWith(
			`events/${eventId}/email/preview`,
			expect.objectContaining({ method: 'POST' }),
			{ token: 'email-token' },
		);
		expect(mockedApiRequest).toHaveBeenCalledWith(
			`events/${eventId}/email/dispatches`,
			expect.objectContaining({ method: 'POST' }),
			{ token: 'email-token' },
		);
		expect(mockedApiRequest).toHaveBeenCalledWith(
			`events/${eventId}/email/dispatches?view=log`,
			{},
			{ token: 'email-token' },
		);
	});

	it('fetchEmailDispatchDetail hits the dispatch detail route', async () => {
		mockedApiRequest.mockResolvedValue({
			dispatch: { dispatchId: 'dsp-1' },
			recipients: [],
			page: 1,
			pageSize: 50,
			total: 0,
		});
		await fetchEmailDispatchDetail(eventId, 'dsp-1', {}, { token });
		expect(mockedApiRequest).toHaveBeenCalledWith(`events/${eventId}/email/dispatches/dsp-1`, {}, { token });
	});

	it('updateEmailDispatch PATCHes the dispatch route', async () => {
		mockedApiRequest.mockResolvedValue({ dispatchId: 'dsp-1', dispatchName: 'Renamed', status: 'scheduled' });
		await updateEmailDispatch(
			eventId,
			'dsp-1',
			{
				dispatchName: 'Renamed',
				templateId: '123456789',
				audience: { type: 'registered_all' },
				scheduledAtUtc: null,
				timezone: null,
			},
			{ token },
		);
		expect(mockedApiRequest).toHaveBeenCalledWith(
			`events/${eventId}/email/dispatches/dsp-1`,
			expect.objectContaining({ method: 'PATCH' }),
			{ token },
		);
	});

	it('cancelEmailDispatch DELETEs the dispatch route', async () => {
		mockedApiRequest.mockResolvedValue({ dispatchId: 'dsp-1', status: 'cancelled' });
		await cancelEmailDispatch(eventId, 'dsp-1', { token });
		expect(mockedApiRequest).toHaveBeenCalledWith(
			`events/${eventId}/email/dispatches/dsp-1`,
			{ method: 'DELETE' },
			{ token },
		);
	});
});
