import { describe, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { waitFor } from '@testing-library/react';
import { renderWithQueryClient } from '../../testing/renderWithQueryClient';
import { useAttendees } from '../hooks/useAttendees';
import { useEventCapacity } from '../hooks/useCapacity';
import {
	invalidateAfterAttendeeMutation,
	invalidateAfterCampaignChange,
	invalidateAfterCapacityAdjust,
	invalidateAfterCatalogChange,
} from '../invalidation';
import { queryKeys } from '../queryKeys';

function seedAll(queryClient: QueryClient) {
	queryClient.setQueryData(queryKeys.catalog(), { programs: [], events: [] });
	queryClient.setQueryData(queryKeys.catalog({ includeArchived: true }), { programs: [], events: [] });
	queryClient.setQueryData(queryKeys.capacitySummary(), { events: [] });
	queryClient.setQueryData(queryKeys.eventCapacity('ev-1'), {});
	queryClient.setQueryData(queryKeys.eventCapacity('ev-2'), {});
	queryClient.setQueryData(queryKeys.attendees('ev-1'), { attendees: [], total: 0 });
	queryClient.setQueryData(queryKeys.attendees('ev-1', { page: 2 }), { attendees: [], total: 0 });
	queryClient.setQueryData(queryKeys.attendees('ev-2'), { attendees: [], total: 0 });
	queryClient.setQueryData(queryKeys.auditLog(), { entries: [] });
	queryClient.setQueryData(queryKeys.dispatches('ev-1', { view: 'log' }), { dispatches: [] });
	queryClient.setQueryData(queryKeys.dispatches('ev-1', { view: 'scheduled' }), { dispatches: [] });
	queryClient.setQueryData(queryKeys.dispatches('ev-2', { view: 'log' }), { dispatches: [] });
	queryClient.setQueryData(queryKeys.dispatchesScheduledSummary(), {});
}

function isStale(queryClient: QueryClient, key: readonly unknown[]): boolean {
	return queryClient.getQueryState(key as unknown[])?.isInvalidated ?? false;
}

describe('invalidateAfterCatalogChange', () => {
	it('marks catalog (every variant) and the whole capacity family stale, and nothing else', async () => {
		const queryClient = new QueryClient();
		seedAll(queryClient);

		await invalidateAfterCatalogChange(queryClient);

		expect(isStale(queryClient, queryKeys.catalog())).toBe(true);
		expect(isStale(queryClient, queryKeys.catalog({ includeArchived: true }))).toBe(true);
		expect(isStale(queryClient, queryKeys.capacitySummary())).toBe(true);
		expect(isStale(queryClient, queryKeys.eventCapacity('ev-1'))).toBe(true);
		expect(isStale(queryClient, queryKeys.eventCapacity('ev-2'))).toBe(true);

		expect(isStale(queryClient, queryKeys.attendees('ev-1'))).toBe(false);
		expect(isStale(queryClient, queryKeys.auditLog())).toBe(false);
		expect(isStale(queryClient, queryKeys.dispatches('ev-1', { view: 'log' }))).toBe(false);
		expect(isStale(queryClient, queryKeys.dispatchesScheduledSummary())).toBe(false);
	});
});

describe('invalidateAfterAttendeeMutation', () => {
	it("marks the event's capacity, the capacity summary, and every attendee-page variant for that event stale — nothing for other events or datasets", async () => {
		const queryClient = new QueryClient();
		seedAll(queryClient);

		await invalidateAfterAttendeeMutation(queryClient, 'ev-1');

		expect(isStale(queryClient, queryKeys.eventCapacity('ev-1'))).toBe(true);
		expect(isStale(queryClient, queryKeys.capacitySummary())).toBe(true);
		expect(isStale(queryClient, queryKeys.attendees('ev-1'))).toBe(true);
		expect(isStale(queryClient, queryKeys.attendees('ev-1', { page: 2 }))).toBe(true);

		expect(isStale(queryClient, queryKeys.eventCapacity('ev-2'))).toBe(false);
		expect(isStale(queryClient, queryKeys.attendees('ev-2'))).toBe(false);
		expect(isStale(queryClient, queryKeys.catalog())).toBe(false);
		expect(isStale(queryClient, queryKeys.dispatches('ev-1', { view: 'log' }))).toBe(false);
	});
});

describe('invalidateAfterCapacityAdjust', () => {
	it('marks only the capacity summary stale — the per-event key is left to the caller\'s setQueryData', async () => {
		const queryClient = new QueryClient();
		seedAll(queryClient);

		await invalidateAfterCapacityAdjust(queryClient, 'ev-1');

		expect(isStale(queryClient, queryKeys.capacitySummary())).toBe(true);
		expect(isStale(queryClient, queryKeys.eventCapacity('ev-1'))).toBe(false);
		expect(isStale(queryClient, queryKeys.attendees('ev-1'))).toBe(false);
		expect(isStale(queryClient, queryKeys.catalog())).toBe(false);
	});
});

describe('invalidateAfterCampaignChange', () => {
	it("marks every dispatch-view variant for that event plus the scheduled summary stale — nothing for other events or datasets", async () => {
		const queryClient = new QueryClient();
		seedAll(queryClient);

		await invalidateAfterCampaignChange(queryClient, 'ev-1');

		expect(isStale(queryClient, queryKeys.dispatches('ev-1', { view: 'log' }))).toBe(true);
		expect(isStale(queryClient, queryKeys.dispatches('ev-1', { view: 'scheduled' }))).toBe(true);
		expect(isStale(queryClient, queryKeys.dispatchesScheduledSummary())).toBe(true);

		expect(isStale(queryClient, queryKeys.dispatches('ev-2', { view: 'log' }))).toBe(false);
		expect(isStale(queryClient, queryKeys.catalog())).toBe(false);
		expect(isStale(queryClient, queryKeys.attendees('ev-1'))).toBe(false);
	});
});

const mockFetchEventAttendees = vi.fn().mockResolvedValue({ attendees: [], total: 0, page: 1, pageSize: 50 });
const mockFetchEventCapacityStatus = vi.fn().mockResolvedValue({
	capacity: 10,
	checkedInCount: 0,
	departureCount: 0,
	liveAttendance: 0,
});

vi.mock('../../hooks/useDataService', () => ({
	useDataService: () => ({
		fetchEventAttendees: mockFetchEventAttendees,
		fetchEventCapacityStatus: mockFetchEventCapacityStatus,
	}),
}));

function MountedViews({ eventId }: { eventId: string }) {
	useAttendees(eventId);
	useEventCapacity(eventId);
	return null;
}

describe('invalidateAfterAttendeeMutation — mounted-view integration', () => {
	it('a mounted attendees view and a mounted capacity view both refetch', async () => {
		mockFetchEventAttendees.mockClear();
		mockFetchEventCapacityStatus.mockClear();

		const { queryClient } = renderWithQueryClient(<MountedViews eventId="ev-1" />);

		await waitFor(() => expect(mockFetchEventAttendees).toHaveBeenCalledTimes(1));
		await waitFor(() => expect(mockFetchEventCapacityStatus).toHaveBeenCalledTimes(1));

		await invalidateAfterAttendeeMutation(queryClient, 'ev-1');

		await waitFor(() => expect(mockFetchEventAttendees).toHaveBeenCalledTimes(2));
		await waitFor(() => expect(mockFetchEventCapacityStatus).toHaveBeenCalledTimes(2));
	});
});
