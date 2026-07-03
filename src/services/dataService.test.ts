import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CONFIG } from '../config';
import { MOCK_EVENTS } from '../data/mockData';
import { createDataService, fetchEvents } from './dataService';

vi.mock('../api/client', () => ({
	apiRequest: vi.fn(),
}));

import { apiRequest } from '../api/client';

const mockedApiRequest = vi.mocked(apiRequest);

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
