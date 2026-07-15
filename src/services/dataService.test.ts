import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CONFIG } from '../config';
import { getMockCatalog, resetMockCheckInState, resetMockThemePreference } from '../data/mockData';
import { resetMockEmailDispatchState } from '../data/mockData';
import {
	adjustCapacity,
	checkInScan,
	confirmCheckIn,
	createDataService,
	createEmailDispatch,
	fetchEventCapacityStatus,
	fetchCatalog,
	fetchEmailDispatchDetail,
	fetchEmailLimits,
	fetchEventAttendees,
	fetchThemePreference,
	removeAttendee,
	undoCheckIn,
	updateThemePreference,
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

	it('returns mock catalog when USE_MOCK_API is true', async () => {
		const result = await fetchCatalog();
		expect(result).toEqual(getMockCatalog());
		expect(mockedApiRequest).not.toHaveBeenCalled();
	});

	it('calls apiRequest with bearer token when USE_MOCK_API is false', async () => {
		CONFIG.USE_MOCK_API = false;
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
});

describe('createDataService', () => {
	it('binds the session token to fetch methods', async () => {
		CONFIG.USE_MOCK_API = false;
		mockedApiRequest.mockResolvedValue({ events: [], programs: [] });

		const service = createDataService('bound-token');
		await service.fetchCatalog();

		expect(mockedApiRequest).toHaveBeenCalledWith('/catalog', {}, { token: 'bound-token' });
	});
});

describe('fetchEventAttendees mock path', () => {
	const originalUseMockApi = CONFIG.USE_MOCK_API;
	const originalDelay = CONFIG.MOCK_API_DELAY_MS;
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
		const result = await fetchEventAttendees(eventId, { q: 'Jane' });

		expect(result.attendees).toHaveLength(1);
		expect(result.attendees[0]?.firstName).toBe('Jane');
		expect(mockedApiRequest).not.toHaveBeenCalled();
	});

	it('filters attendees by checked-in status in mock mode', async () => {
		const result = await fetchEventAttendees(eventId, { checkedIn: false });

		expect(result.attendees).toHaveLength(1);
		expect(result.attendees[0]?.contactId).toBe('mock-101');
	});
});

describe('removeAttendee mock path', () => {
	const originalUseMockApi = CONFIG.USE_MOCK_API;
	const originalDelay = CONFIG.MOCK_API_DELAY_MS;
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

	it('removes a non-checked-in attendee and drops them from the list', async () => {
		const before = await fetchEventAttendees(eventId);
		expect(before.attendees.some((person) => person.contactId === 'mock-101')).toBe(true);

		const result = await removeAttendee(eventId, 'mock-101');
		expect(result).toEqual({ contactId: 'mock-101', removed: true });

		const after = await fetchEventAttendees(eventId);
		expect(after.attendees.some((person) => person.contactId === 'mock-101')).toBe(false);
		expect(mockedApiRequest).not.toHaveBeenCalled();
	});

	it('rejects while the attendee is checked in', async () => {
		await expect(removeAttendee(eventId, 'mock-202')).rejects.toThrow('attendee_checked_in');
	});

	it('rejects when the contact is not registered', async () => {
		await expect(removeAttendee(eventId, 'missing-contact')).rejects.toThrow('contact_not_registered');
	});

	it('calls DELETE on the live path when USE_MOCK_API is false', async () => {
		CONFIG.USE_MOCK_API = false;
		mockedApiRequest.mockResolvedValue({ contactId: 'c-live', removed: true });

		const result = await removeAttendee(eventId, 'c-live', { token: 'session-token' });

		expect(mockedApiRequest).toHaveBeenCalledWith(
			`events/${eventId}/attendees/c-live`,
			{ method: 'DELETE' },
			{ token: 'session-token' },
		);
		expect(result).toEqual({ contactId: 'c-live', removed: true });
	});
});

describe('checkInScan mock path', () => {
	const originalUseMockApi = CONFIG.USE_MOCK_API;
	const originalDelay = CONFIG.MOCK_API_DELAY_MS;
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
		const result = await checkInScan(eventId, jwt);

		expect(result).toMatchObject({
			programId: '_standalone',
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

describe('undoCheckIn mock path', () => {
	const originalUseMockApi = CONFIG.USE_MOCK_API;
	const originalDelay = CONFIG.MOCK_API_DELAY_MS;
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

	it('undoes a checked-in attendee back to registered', async () => {
		const before = await fetchEventAttendees(eventId);
		expect(before.attendees.find((person) => person.contactId === 'mock-202')?.checkedIn).toBe(true);

		const result = await undoCheckIn(eventId, 'mock-202');
		expect(result).toMatchObject({
			contactId: 'mock-202',
			checkedIn: false,
			alreadyCheckedIn: true,
		});

		const after = await fetchEventAttendees(eventId);
		expect(after.attendees.find((person) => person.contactId === 'mock-202')?.checkedIn).toBe(false);
		expect(mockedApiRequest).not.toHaveBeenCalled();
	});

	it('is a no-op when the attendee is only registered', async () => {
		const result = await undoCheckIn(eventId, 'mock-101');
		expect(result).toMatchObject({
			contactId: 'mock-101',
			checkedIn: false,
			alreadyCheckedIn: false,
		});
	});

	it('calls POST checkin/undo on the live path when USE_MOCK_API is false', async () => {
		CONFIG.USE_MOCK_API = false;
		mockedApiRequest.mockResolvedValue({
			contactId: 'c-live',
			checkedIn: false,
			alreadyCheckedIn: true,
			attendeeType: 'customer',
		});

		const result = await undoCheckIn(eventId, 'c-live', { token: 'session-token' });

		expect(mockedApiRequest).toHaveBeenCalledWith(
			`events/${eventId}/checkin/undo`,
			{ method: 'POST', body: JSON.stringify({ contactId: 'c-live' }) },
			{ token: 'session-token' },
		);
		expect(result).toMatchObject({ contactId: 'c-live', checkedIn: false, alreadyCheckedIn: true });
	});
});

describe('confirmCheckIn mock path', () => {
	const originalUseMockApi = CONFIG.USE_MOCK_API;
	const originalDelay = CONFIG.MOCK_API_DELAY_MS;
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
		const first = await confirmCheckIn(eventId, 'mock-101');
		expect(first).toEqual({
			contactId: 'mock-101',
			checkedIn: true,
			alreadyCheckedIn: false,
			attendeeType: 'customer',
		});

		const second = await confirmCheckIn(eventId, 'mock-101');
		expect(second).toEqual({
			contactId: 'mock-101',
			checkedIn: true,
			alreadyCheckedIn: true,
			attendeeType: 'customer',
		});
		expect(mockedApiRequest).not.toHaveBeenCalled();
	});

	it('returns alreadyCheckedIn for contacts checked in in mock seed data', async () => {
		const result = await confirmCheckIn(eventId, 'mock-202');

		expect(result).toEqual({
			contactId: 'mock-202',
			checkedIn: true,
			alreadyCheckedIn: true,
			attendeeType: 'partner',
		});
	});
});

describe('fetchEventCapacityStatus mock path', () => {
	const originalUseMockApi = CONFIG.USE_MOCK_API;
	const originalDelay = CONFIG.MOCK_API_DELAY_MS;
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
		const result = await fetchEventCapacityStatus(eventId);
		expect(result).toMatchObject({
			programId: '_standalone',
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
		const down = await adjustCapacity(eventId, 'down');
		expect(down.liveAttendance).toBe(0);
		expect(down.departureCount).toBe(1);

		const up = await adjustCapacity(eventId, 'up');
		expect(up.liveAttendance).toBe(1);
		expect(up.departureCount).toBe(0);
	});

	it('rejects adjust down at floor', async () => {
		await adjustCapacity(eventId, 'down');
		await expect(adjustCapacity(eventId, 'down')).rejects.toThrow('capacity_at_floor');
	});
});

describe('theme preference mock path (T013)', () => {
	const originalUseMockApi = CONFIG.USE_MOCK_API;
	const originalDelay = CONFIG.MOCK_API_DELAY_MS;

	beforeEach(() => {
		CONFIG.USE_MOCK_API = true;
		CONFIG.MOCK_API_DELAY_MS = 0;
		resetMockThemePreference();
		mockedApiRequest.mockReset();
	});

	afterEach(() => {
		CONFIG.USE_MOCK_API = originalUseMockApi;
		CONFIG.MOCK_API_DELAY_MS = originalDelay;
	});

	it('defaults to aurora with celebration not allowed for a non-allowlisted email', async () => {
		const result = await fetchThemePreference('staff@adaptavist.com');
		expect(result).toEqual({
			theme: 'aurora',
			celebrationAllowed: false,
			celebrationToastMessage: null,
		});
	});

	it('rejects setting celebration for a non-allowlisted email, stored value unchanged', async () => {
		await expect(updateThemePreference('celebration', 'staff@adaptavist.com')).rejects.toThrow(
			'celebration_not_allowed',
		);

		const after = await fetchThemePreference('staff@adaptavist.com');
		expect(after.theme).toBe('aurora');
	});

	it('a previously-stored celebration preference resolves to aurora once no longer allowlisted', async () => {
		const allowlistedEmail = CONFIG.CELEBRATION_THEME_EMAIL[0];
		await updateThemePreference('celebration', allowlistedEmail);

		const asAllowlisted = await fetchThemePreference(allowlistedEmail);
		expect(asAllowlisted).toEqual({
			theme: 'celebration',
			celebrationAllowed: true,
			celebrationToastMessage: 'Just for you',
		});

		const asOtherUser = await fetchThemePreference('staff@adaptavist.com');
		expect(asOtherUser).toEqual({
			theme: 'aurora',
			celebrationAllowed: false,
			celebrationToastMessage: null,
		});
	});

	it('allows celebration for a second email added to the allowlist, not just the first', async () => {
		const originalList = [...CONFIG.CELEBRATION_THEME_EMAIL];
		CONFIG.CELEBRATION_THEME_EMAIL = [...originalList, 'second@adaptavist.com'];

		try {
			const result = await updateThemePreference('celebration', 'second@adaptavist.com');
			expect(result).toMatchObject({
				theme: 'celebration',
				celebrationAllowed: true,
				celebrationToastMessage: null,
			});
		} finally {
			CONFIG.CELEBRATION_THEME_EMAIL = originalList;
		}
	});

	it('returns a toast message for toast-list emails who are not on the theme list', async () => {
		const originalTheme = [...CONFIG.CELEBRATION_THEME_EMAIL];
		const originalToast = [...CONFIG.CELEBRATION_TOAST_EMAIL];
		CONFIG.CELEBRATION_THEME_EMAIL = ['theme@adaptavist.com'];
		CONFIG.CELEBRATION_TOAST_EMAIL = ['toast@adaptavist.com'];
		CONFIG.CELEBRATION_TOAST_MESSAGE = 'Hello toast';

		try {
			const result = await fetchThemePreference('toast@adaptavist.com');
			expect(result).toEqual({
				theme: 'aurora',
				celebrationAllowed: false,
				celebrationToastMessage: 'Hello toast',
			});
		} finally {
			CONFIG.CELEBRATION_THEME_EMAIL = originalTheme;
			CONFIG.CELEBRATION_TOAST_EMAIL = originalToast;
			CONFIG.CELEBRATION_TOAST_MESSAGE = 'Just for you';
		}
	});

	it('persists a non-gated theme choice', async () => {
		const result = await updateThemePreference('darkAurora', 'staff@adaptavist.com');
		expect(result.theme).toBe('darkAurora');

		const after = await fetchThemePreference('staff@adaptavist.com');
		expect(after.theme).toBe('darkAurora');
	});
});

describe('theme preference live path (T013)', () => {
	const originalUseMockApi = CONFIG.USE_MOCK_API;

	beforeEach(() => {
		CONFIG.USE_MOCK_API = false;
		mockedApiRequest.mockReset();
	});

	afterEach(() => {
		CONFIG.USE_MOCK_API = originalUseMockApi;
	});

	it('maps getThemePreference to GET user/prefs', async () => {
		mockedApiRequest.mockResolvedValue({
			theme: 'darkAurora',
			celebrationAllowed: false,
			celebrationToastMessage: null,
		});

		const result = await fetchThemePreference(undefined, { token: 'session-token' });

		expect(mockedApiRequest).toHaveBeenCalledWith('user/prefs', {}, { token: 'session-token' });
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

		const result = await updateThemePreference('aurora', undefined, { token: 'session-token' });

		expect(mockedApiRequest).toHaveBeenCalledWith(
			'user/prefs/theme',
			{ method: 'PUT', body: JSON.stringify({ theme: 'aurora' }) },
			{ token: 'session-token' },
		);
		expect(result.updatedAt).toBe('2026-07-13T10:00:00.000Z');
	});

	it('never trusts an unrecognized theme value — normalizes to aurora', async () => {
		mockedApiRequest.mockResolvedValue({ theme: 'not-a-real-theme', celebrationAllowed: false });

		const result = await fetchThemePreference(undefined, { token: 'session-token' });

		expect(result.theme).toBe('aurora');
	});
});

describe('email dataService event-scoped paths', () => {
	const originalUseMockApi = CONFIG.USE_MOCK_API;
	const originalDelay = CONFIG.MOCK_API_DELAY_MS;
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
		const result = await fetchEmailLimits(eventId);
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
		await service.fetchEmailLimits(eventId);
		await service.fetchEmailTemplates(eventId);
		await service.previewEmailDispatch(eventId, {
			templateId: '123456789',
			audience: { type: 'registered_all' },
		});
		await service.createEmailDispatch(eventId, {
			dispatchName: 'Live send',
			templateId: '123456789',
			audience: { type: 'registered_all' },
			scheduledAtUtc: null,
			timezone: null,
			idempotencyKey: '550e8400-e29b-41d4-a716-446655440000',
		});
		await service.fetchEmailDispatches(eventId, { view: 'log' });

		expect(mockedApiRequest).toHaveBeenCalledWith(
			`events/${eventId}/email/limits`,
			{},
			{ token: 'email-token' },
		);
		expect(mockedApiRequest).toHaveBeenCalledWith(
			`events/${eventId}/email/templates`,
			{},
			{ token: 'email-token' },
		);
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

	it('dedupes createEmailDispatch in mock mode via idempotency key', async () => {
		const body = {
			dispatchName: 'QA immediate send',
			templateId: '123456789',
			audience: { type: 'registered_all' as const },
			scheduledAtUtc: null,
			timezone: null,
			idempotencyKey: '660e8400-e29b-41d4-a716-446655440001',
		};

		const first = await createEmailDispatch(eventId, body);
		const second = await createEmailDispatch(eventId, body);

		expect(second.dispatchId).toBe(first.dispatchId);
		expect(mockedApiRequest).not.toHaveBeenCalled();
	});

	it('fetches dispatch detail from mock store with catalog context', async () => {
		const created = await createEmailDispatch(eventId, {
			dispatchName: 'Detail test',
			templateId: '123456789',
			audience: { type: 'registered_all' },
			scheduledAtUtc: null,
			timezone: null,
			idempotencyKey: '770e8400-e29b-41d4-a716-446655440002',
		});

		const detail = await fetchEmailDispatchDetail(eventId, created.dispatchId);
		expect(detail.dispatch.dispatchId).toBe(created.dispatchId);
		expect(detail.recipients.length).toBeGreaterThan(0);
		expect(detail.recipients.every((row) => row.outcome === 'sent')).toBe(true);
	});
});
