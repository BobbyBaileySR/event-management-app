import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CONFIG } from '../config';
import { MOCK_EVENTS, resetMockCheckInState } from '../data/mockData';
import { checkInScan, confirmCheckIn, createDataService, fetchEvents, fetchSliceAttendees } from './dataService';

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
