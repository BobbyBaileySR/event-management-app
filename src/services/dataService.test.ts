import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CONFIG } from '../config';
import { MOCK_EVENTS, resetMockCheckInState } from '../data/mockData';
import { resetMockEmailDispatchState } from '../data/mockData';
import {
	adjustCapacity,
	checkInScan,
	confirmCheckIn,
	createDataService,
	createEmailDispatch,
	fetchCapacityStatus,
	fetchEmailDispatchDetail,
	fetchEmailLimits,
	fetchEvents,
	fetchSliceAttendees,
} from './dataService';

vi.mock('../api/client', () => ({
	apiRequest: vi.fn(),
}));

import { apiRequest } from '../api/client';

const mockedApiRequest = vi.mocked(apiRequest);

function buildMockCheckInJwt(contactId: string, eventId: string): string {
	const encode = (value: unknown) =>
		btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
	return `${encode({ alg: 'RS256' })}.${encode({ contactId, emsEventId: eventId })}.mock-signature`;
}

describe('dataService mock/live switch', () => {
	const originalUseMockApi = CONFIG.USE_MOCK_API;
	const originalDelay = CONFIG.MOCK_API_DELAY_MS;

	beforeEach(() => {
		CONFIG.USE_MOCK_API = true;
		CONFIG.MOCK_API_DELAY_MS = 0;
		mockedApiRequest.mockReset();
	});

	afterEach(() => {
		CONFIG.USE_MOCK_API = originalUseMockApi;
		CONFIG.MOCK_API_DELAY_MS = originalDelay;
	});

	it('returns mock events when USE_MOCK_API is true', async () => {
		const result = await fetchEvents();
		expect(result.events).toEqual(MOCK_EVENTS);
		expect(mockedApiRequest).not.toHaveBeenCalled();
	});

	it('calls apiRequest with bearer token when USE_MOCK_API is false', async () => {
		CONFIG.USE_MOCK_API = false;
		mockedApiRequest.mockResolvedValue({
			events: [{ id: 'evt-live', name: 'Live Event', startDate: '2026-10-15T09:00:00.000Z', status: 'active' }],
		});

		const result = await fetchEvents({ token: 'session-token-abc' });

		expect(mockedApiRequest).toHaveBeenCalledWith('/events', {}, { token: 'session-token-abc' });
		expect(result.events[0]?.id).toBe('evt-live');
		expect(result.events[0]?.dateIso).toBe('2026-10-15');
	});
});

describe('createDataService', () => {
	it('binds the session token to fetch methods', async () => {
		CONFIG.USE_MOCK_API = false;
		mockedApiRequest.mockResolvedValue({ events: [] });

		const service = createDataService('bound-token');
		await service.fetchEvents();

		expect(mockedApiRequest).toHaveBeenCalledWith('/events', {}, { token: 'bound-token' });
	});
});

describe('fetchSliceAttendees mock path', () => {
	const originalUseMockApi = CONFIG.USE_MOCK_API;
	const originalDelay = CONFIG.MOCK_API_DELAY_MS;
	const programId = 'prog-atlassian-2026';
	const eventId = 'ev-mr-2026';

	beforeEach(() => {
		CONFIG.USE_MOCK_API = true;
		CONFIG.MOCK_API_DELAY_MS = 0;
		resetMockCheckInState();
		mockedApiRequest.mockReset();
	});

	afterEach(() => {
		CONFIG.USE_MOCK_API = originalUseMockApi;
		CONFIG.MOCK_API_DELAY_MS = originalDelay;
	});

	it('filters attendees by search query in mock mode', async () => {
		const result = await fetchSliceAttendees(programId, eventId, { q: 'Jane' });

		expect(result.attendees).toHaveLength(1);
		expect(result.attendees[0]?.firstName).toBe('Jane');
		expect(mockedApiRequest).not.toHaveBeenCalled();
	});

	it('filters attendees by checked-in status in mock mode', async () => {
		const result = await fetchSliceAttendees(programId, eventId, { checkedIn: false });

		expect(result.attendees).toHaveLength(1);
		expect(result.attendees[0]?.contactId).toBe('mock-101');
	});
});

describe('checkInScan mock path', () => {
	const originalUseMockApi = CONFIG.USE_MOCK_API;
	const originalDelay = CONFIG.MOCK_API_DELAY_MS;
	const programId = 'prog-atlassian-2026';
	const eventId = 'ev-mr-2026';

	beforeEach(() => {
		CONFIG.USE_MOCK_API = true;
		CONFIG.MOCK_API_DELAY_MS = 0;
		resetMockCheckInState();
		mockedApiRequest.mockReset();
	});

	afterEach(() => {
		CONFIG.USE_MOCK_API = originalUseMockApi;
		CONFIG.MOCK_API_DELAY_MS = originalDelay;
	});

	it('returns contact summary from mock scan without calling apiRequest', async () => {
		const jwt = buildMockCheckInJwt('mock-101', eventId);
		const result = await checkInScan(programId, eventId, jwt);

		expect(result).toMatchObject({
			programId,
			eventId,
			contact: {
				contactId: 'mock-101',
				firstName: 'Jane',
				lastName: 'Doe',
				checkedIn: false,
				attendeeType: 'customer',
			},
		});
		expect(mockedApiRequest).not.toHaveBeenCalled();
	});
});

describe('confirmCheckIn mock path', () => {
	const originalUseMockApi = CONFIG.USE_MOCK_API;
	const originalDelay = CONFIG.MOCK_API_DELAY_MS;
	const programId = 'prog-atlassian-2026';
	const eventId = 'ev-mr-2026';

	beforeEach(() => {
		CONFIG.USE_MOCK_API = true;
		CONFIG.MOCK_API_DELAY_MS = 0;
		resetMockCheckInState();
		mockedApiRequest.mockReset();
	});

	afterEach(() => {
		CONFIG.USE_MOCK_API = originalUseMockApi;
		CONFIG.MOCK_API_DELAY_MS = originalDelay;
	});

	it('checks in a contact and is idempotent on repeat', async () => {
		const first = await confirmCheckIn(programId, eventId, 'mock-101');
		expect(first).toEqual({
			contactId: 'mock-101',
			checkedIn: true,
			alreadyCheckedIn: false,
			attendeeType: 'customer',
		});

		const second = await confirmCheckIn(programId, eventId, 'mock-101');
		expect(second).toEqual({
			contactId: 'mock-101',
			checkedIn: true,
			alreadyCheckedIn: true,
			attendeeType: 'customer',
		});
		expect(mockedApiRequest).not.toHaveBeenCalled();
	});

	it('returns alreadyCheckedIn for contacts checked in in mock seed data', async () => {
		const result = await confirmCheckIn(programId, eventId, 'mock-202');

		expect(result).toEqual({
			contactId: 'mock-202',
			checkedIn: true,
			alreadyCheckedIn: true,
			attendeeType: 'partner',
		});
	});
});

describe('fetchCapacityStatus mock path', () => {
	const originalUseMockApi = CONFIG.USE_MOCK_API;
	const originalDelay = CONFIG.MOCK_API_DELAY_MS;
	const programId = 'prog-atlassian-2026';
	const eventId = 'ev-mr-2026';

	beforeEach(() => {
		CONFIG.USE_MOCK_API = true;
		CONFIG.MOCK_API_DELAY_MS = 0;
		resetMockCheckInState();
		mockedApiRequest.mockReset();
	});

	afterEach(() => {
		CONFIG.USE_MOCK_API = originalUseMockApi;
		CONFIG.MOCK_API_DELAY_MS = originalDelay;
	});

	it('returns live attendance snapshot from mock seed', async () => {
		const result = await fetchCapacityStatus(programId, eventId);
		expect(result).toMatchObject({
			programId,
			eventId,
			capacity: 100,
			checkedInCount: 1,
			departureCount: 0,
			liveAttendance: 1,
		});
		expect(mockedApiRequest).not.toHaveBeenCalled();
	});
});

describe('adjustCapacity mock path', () => {
	const originalUseMockApi = CONFIG.USE_MOCK_API;
	const originalDelay = CONFIG.MOCK_API_DELAY_MS;
	const programId = 'prog-atlassian-2026';
	const eventId = 'ev-mr-2026';

	beforeEach(() => {
		CONFIG.USE_MOCK_API = true;
		CONFIG.MOCK_API_DELAY_MS = 0;
		resetMockCheckInState();
		mockedApiRequest.mockReset();
	});

	afterEach(() => {
		CONFIG.USE_MOCK_API = originalUseMockApi;
		CONFIG.MOCK_API_DELAY_MS = originalDelay;
	});

	it('adjusts down and up within bounds', async () => {
		const down = await adjustCapacity(programId, eventId, 'down');
		expect(down.liveAttendance).toBe(0);
		expect(down.departureCount).toBe(1);

		const up = await adjustCapacity(programId, eventId, 'up');
		expect(up.liveAttendance).toBe(1);
		expect(up.departureCount).toBe(0);
	});

	it('rejects adjust down at floor', async () => {
		await adjustCapacity(programId, eventId, 'down');
		await expect(adjustCapacity(programId, eventId, 'down')).rejects.toThrow('capacity_at_floor');
	});
});

describe('email dataService catalog-scoped paths', () => {
	const originalUseMockApi = CONFIG.USE_MOCK_API;
	const originalDelay = CONFIG.MOCK_API_DELAY_MS;
	const programId = 'prog-atlassian-2026';
	const eventId = 'ev-mr-2026';

	beforeEach(() => {
		CONFIG.USE_MOCK_API = true;
		CONFIG.MOCK_API_DELAY_MS = 0;
		resetMockEmailDispatchState();
		mockedApiRequest.mockReset();
	});

	afterEach(() => {
		CONFIG.USE_MOCK_API = originalUseMockApi;
		CONFIG.MOCK_API_DELAY_MS = originalDelay;
	});

	it('returns mock email limits without calling apiRequest', async () => {
		const result = await fetchEmailLimits(programId, eventId);
		expect(result).toMatchObject({
			dispatchLimitPerHour: 10,
			largeSendThreshold: CONFIG.EMAIL_SEND_CONFIRM_THRESHOLD,
		});
		expect(mockedApiRequest).not.toHaveBeenCalled();
	});

	it('calls catalog-scoped live routes with bearer token when USE_MOCK_API is false', async () => {
		CONFIG.USE_MOCK_API = false;
		mockedApiRequest.mockImplementation(async (route) => {
			if (route.endsWith('/email/limits')) {
				return { dispatchLimitPerHour: 10, dispatchUsedThisHour: 1, largeSendThreshold: 50 };
			}
			if (route.endsWith('/email/templates')) {
				return { templates: [{ id: '123456789', name: '48-hour reminder', description: 'Marketing Hub' }] };
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
		await service.fetchEmailLimits(programId, eventId);
		await service.fetchEmailTemplates(programId, eventId);
		await service.previewEmailDispatch(programId, eventId, {
			templateId: '123456789',
			audience: { type: 'registered_all' },
		});
		await service.createEmailDispatch(programId, eventId, {
			dispatchName: 'Live send',
			templateId: '123456789',
			audience: { type: 'registered_all' },
			scheduledAtUtc: null,
			timezone: null,
			idempotencyKey: '550e8400-e29b-41d4-a716-446655440000',
		});
		await service.fetchEmailDispatches(programId, eventId, { view: 'log' });

		expect(mockedApiRequest).toHaveBeenCalledWith(
			`programs/${programId}/events/${eventId}/email/limits`,
			{},
			{ token: 'email-token' },
		);
		expect(mockedApiRequest).toHaveBeenCalledWith(
			`programs/${programId}/events/${eventId}/email/templates`,
			{},
			{ token: 'email-token' },
		);
		expect(mockedApiRequest).toHaveBeenCalledWith(
			`programs/${programId}/events/${eventId}/email/preview`,
			expect.objectContaining({ method: 'POST' }),
			{ token: 'email-token' },
		);
		expect(mockedApiRequest).toHaveBeenCalledWith(
			`programs/${programId}/events/${eventId}/email/dispatches`,
			expect.objectContaining({ method: 'POST' }),
			{ token: 'email-token' },
		);
		expect(mockedApiRequest).toHaveBeenCalledWith(
			`programs/${programId}/events/${eventId}/email/dispatches?view=log`,
			{},
			{ token: 'email-token' },
		);
	});

	it('dedupes createEmailDispatch in mock mode via idempotency key', async () => {
		const body = {
			dispatchName: 'QA immediate send',
			templateId: '123456789',
			audience: { type: 'registered_all' as const },
			scheduledAtUtc: null,
			timezone: null,
			idempotencyKey: '660e8400-e29b-41d4-a716-446655440001',
		};

		const first = await createEmailDispatch(programId, eventId, body);
		const second = await createEmailDispatch(programId, eventId, body);

		expect(second.dispatchId).toBe(first.dispatchId);
		expect(mockedApiRequest).not.toHaveBeenCalled();
	});

	it('fetches dispatch detail from mock store with catalog context', async () => {
		const created = await createEmailDispatch(programId, eventId, {
			dispatchName: 'Detail test',
			templateId: '123456789',
			audience: { type: 'registered_all' },
			scheduledAtUtc: null,
			timezone: null,
			idempotencyKey: '770e8400-e29b-41d4-a716-446655440002',
		});

		const detail = await fetchEmailDispatchDetail(programId, eventId, created.dispatchId);
		expect(detail.dispatch.dispatchId).toBe(created.dispatchId);
		expect(detail.recipients.length).toBeGreaterThan(0);
		expect(detail.recipients.every((row) => row.outcome === 'sent')).toBe(true);
	});
});
