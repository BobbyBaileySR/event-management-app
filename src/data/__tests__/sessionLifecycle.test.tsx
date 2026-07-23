import { useEffect, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react';
import { SessionProvider, useSession } from '../../state/appState';
import type { Session } from '../../types';
import { useSessionLifecycle } from '../sessionLifecycle';

const mockFetchCatalog = vi.fn().mockResolvedValue({ programs: [], events: [] });
const mockFetchCapacitySummary = vi.fn().mockResolvedValue({ events: [] });

/** A stable object (unlike the real hook's per-token memo) — good enough here since the
 * fetch fns themselves are the only thing under test, but it must stay referentially stable
 * across renders or it would mask the real hook's memoization behaviour. */
const mockDataService = {
	fetchCatalog: mockFetchCatalog,
	fetchCapacitySummary: mockFetchCapacitySummary,
};

vi.mock('../../hooks/useDataService', () => ({
	useDataService: () => mockDataService,
}));

function makeSession(token: string): Session {
	return { token, email: 'admin@adaptavist.com', role: 'admin', expiresAt: '2099-01-01T00:00:00.000Z' };
}

function SessionSetter({ session }: { session: Session | null }) {
	const { setSession } = useSession();
	useEffect(() => {
		setSession(session);
	}, [session, setSession]);
	return null;
}

/** Mounts the effect under test beside a controllable session, mirroring App.tsx's bridge. */
function LifecycleHarness({ session, extra }: { session: Session | null; extra?: ReactNode }) {
	useSessionLifecycle();
	return (
		<>
			<SessionSetter session={session} />
			{extra}
		</>
	);
}

function renderHarness(queryClient: QueryClient, session: Session | null, extra?: ReactNode) {
	return render(
		<QueryClientProvider client={queryClient}>
			<SessionProvider>
				<LifecycleHarness session={session} extra={extra} />
			</SessionProvider>
		</QueryClientProvider>,
	);
}

describe('useSessionLifecycle — session boundary (data-model.md §4)', () => {
	beforeEach(() => {
		mockFetchCatalog.mockClear();
		mockFetchCapacitySummary.mockClear();
	});

	it('clears the cache on any session token change, including sign-out', async () => {
		const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
		const view = renderHarness(queryClient, makeSession('tok-a'));

		await waitFor(() => expect(mockFetchCatalog).toHaveBeenCalledTimes(1));
		await waitFor(() => expect(mockFetchCapacitySummary).toHaveBeenCalledTimes(1));
		expect(queryClient.getQueryCache().getAll().length).toBeGreaterThan(0);

		view.rerender(
			<QueryClientProvider client={queryClient}>
				<SessionProvider>
					<LifecycleHarness session={null} />
				</SessionProvider>
			</QueryClientProvider>,
		);

		await waitFor(() => expect(queryClient.getQueryCache().getAll().length).toBe(0));
	});

	it('clears the cache on a sign-in-as-a-different-user swap, and warms the new prefetch', async () => {
		const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
		const view = renderHarness(queryClient, makeSession('tok-a'));

		await waitFor(() => expect(mockFetchCatalog).toHaveBeenCalledTimes(1));

		queryClient.setQueryData(['catalog'], { programs: [], events: [], marker: 'admin-session-data' });

		view.rerender(
			<QueryClientProvider client={queryClient}>
				<SessionProvider>
					<LifecycleHarness session={makeSession('tok-b')} />
				</SessionProvider>
			</QueryClientProvider>,
		);

		await waitFor(() => expect(mockFetchCatalog).toHaveBeenCalledTimes(2));
		// The pre-swap admin data must never survive into the new token's cache entry.
		expect(queryClient.getQueryData(['catalog'])).not.toMatchObject({ marker: 'admin-session-data' });
	});

	it('discards a resolved in-flight response from the old token instead of writing it back', async () => {
		const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
		let resolveProbe: ((value: string) => void) | undefined;
		const probeQueryFn = vi.fn(
			() =>
				new Promise<string>((resolve) => {
					resolveProbe = resolve;
				}),
		);

		function Probe() {
			useQuery({ queryKey: ['probe'], queryFn: probeQueryFn });
			return null;
		}

		const view = renderHarness(queryClient, makeSession('tok-a'), <Probe />);

		await waitFor(() => expect(probeQueryFn).toHaveBeenCalledTimes(1));
		expect(queryClient.getQueryState(['probe'])?.fetchStatus).toBe('fetching');

		// Token changes while the probe fetch is still in flight — cancelQueries() + clear()
		// (research R4) must discard it before it can resolve into the cleared cache.
		view.rerender(
			<QueryClientProvider client={queryClient}>
				<SessionProvider>
					<LifecycleHarness session={null} />
				</SessionProvider>
			</QueryClientProvider>,
		);

		resolveProbe?.('late-response-from-old-token');
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(queryClient.getQueryData(['probe'])).toBeUndefined();
	});

	it('never writes to localStorage or sessionStorage across sign-in, mutation, and sign-out', async () => {
		const localSetItem = vi.spyOn(Storage.prototype, 'setItem');
		const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

		const view = renderHarness(queryClient, makeSession('tok-a'));
		await waitFor(() => expect(mockFetchCatalog).toHaveBeenCalledTimes(1));

		view.rerender(
			<QueryClientProvider client={queryClient}>
				<SessionProvider>
					<LifecycleHarness session={null} />
				</SessionProvider>
			</QueryClientProvider>,
		);
		await waitFor(() => expect(queryClient.getQueryCache().getAll().length).toBe(0));

		expect(localSetItem).not.toHaveBeenCalled();
		expect(localStorage.length).toBe(0);
		expect(sessionStorage.length).toBe(0);

		localSetItem.mockRestore();
	});
});
