import { describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react';
import { useAttendees } from '../hooks/useAttendees';
import { useAuditLog } from '../hooks/useAuditLog';
import * as prefetchModule from '../prefetch';
import { queryKeys } from '../queryKeys';

describe('prefetch.ts — ADR-016 structural gate', () => {
	it('exposes exactly the two non-PII prefetch functions — no attendee or audit prefetch is expressible', () => {
		const exportedNames = Object.keys(prefetchModule).sort();
		expect(exportedNames).toEqual(['prefetchCapacitySummary', 'prefetchCatalog']);
	});

	it('prefetchCatalog warms the catalog cache from the injected data service', async () => {
		const queryClient = new QueryClient();
		const fetchCatalog = vi.fn().mockResolvedValue({ programs: [], events: [] });
		const dataService = { fetchCatalog } as unknown as Parameters<typeof prefetchModule.prefetchCatalog>[1];

		await prefetchModule.prefetchCatalog(queryClient, dataService);

		expect(fetchCatalog).toHaveBeenCalledTimes(1);
		expect(queryClient.getQueryData(queryKeys.catalog())).toEqual({ programs: [], events: [] });
	});

	it('prefetchCapacitySummary warms the capacity-summary cache from the injected data service', async () => {
		const queryClient = new QueryClient();
		const fetchCapacitySummary = vi.fn().mockResolvedValue({ events: [] });
		const dataService = {
			fetchCapacitySummary,
		} as unknown as Parameters<typeof prefetchModule.prefetchCapacitySummary>[1];

		await prefetchModule.prefetchCapacitySummary(queryClient, dataService);

		expect(fetchCapacitySummary).toHaveBeenCalledTimes(1);
		expect(queryClient.getQueryData(queryKeys.capacitySummary())).toEqual({ events: [] });
	});
});

const mockFetchEventAttendees = vi.fn().mockResolvedValue({ attendees: [], total: 0, page: 1, pageSize: 50 });
const mockFetchAuditLog = vi.fn().mockResolvedValue({ entries: [], total: 0 });

vi.mock('../../hooks/useDataService', () => ({
	useDataService: () => ({
		fetchEventAttendees: mockFetchEventAttendees,
		fetchAuditLog: mockFetchAuditLog,
	}),
}));

function AttendeesMount({ eventId }: { eventId: string }) {
	useAttendees(eventId);
	return null;
}

function AuditMount() {
	useAuditLog();
	return null;
}

/**
 * A long `gcTime` here (unlike the test util's default `gcTime: 0`) is deliberate: it proves
 * the second mount's fetch is caused by the hook's own `staleTime: 0`, not by the test
 * harness evicting the cache entry between mounts. Cached data survives the unmount, is
 * visible to the second mount immediately, and a fresh network read still fires anyway.
 */
function longLivedTestClient(): QueryClient {
	return new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 5 * 60 * 1000 } } });
}

describe('audited-PII hooks issue a network read on every real mount (staleTime 0)', () => {
	it('useAttendees fetches again on a second mount even though the cached entry survived the first unmount', async () => {
		mockFetchEventAttendees.mockClear();
		const queryClient = longLivedTestClient();

		const first = render(
			<QueryClientProvider client={queryClient}>
				<AttendeesMount eventId="ev-1" />
			</QueryClientProvider>,
		);
		await waitFor(() => expect(mockFetchEventAttendees).toHaveBeenCalledTimes(1));
		first.unmount();

		expect(queryClient.getQueryData(queryKeys.attendees('ev-1'))).toBeDefined();

		render(
			<QueryClientProvider client={queryClient}>
				<AttendeesMount eventId="ev-1" />
			</QueryClientProvider>,
		);
		await waitFor(() => expect(mockFetchEventAttendees).toHaveBeenCalledTimes(2));
	});

	it('useAuditLog fetches again on a second mount even though the cached entry survived the first unmount', async () => {
		mockFetchAuditLog.mockClear();
		const queryClient = longLivedTestClient();

		const first = render(
			<QueryClientProvider client={queryClient}>
				<AuditMount />
			</QueryClientProvider>,
		);
		await waitFor(() => expect(mockFetchAuditLog).toHaveBeenCalledTimes(1));
		first.unmount();

		expect(queryClient.getQueryData(queryKeys.auditLog())).toBeDefined();

		render(
			<QueryClientProvider client={queryClient}>
				<AuditMount />
			</QueryClientProvider>,
		);
		await waitFor(() => expect(mockFetchAuditLog).toHaveBeenCalledTimes(2));
	});
});
