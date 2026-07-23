import { QueryCache, QueryClient } from '@tanstack/react-query';
import { ApiError } from '../api/client';

function isAuthStatus(error: unknown, statuses: readonly number[]): boolean {
	return error instanceof ApiError && statuses.includes(error.status);
}

type UnauthorizedListener = () => void;

let unauthorizedListener: UnauthorizedListener | null = null;

/**
 * Registered once from `App.tsx` (bound to `clearSession`). A 401 on any query — including a
 * silent background refetch — means the session died mid-flight; route straight to the
 * existing sign-out flow rather than leaving a silently-stale screen (research R6).
 */
export function setUnauthorizedListener(listener: UnauthorizedListener | null): void {
	unauthorizedListener = listener;
}

/**
 * App-scoped QueryClient factory. Global defaults are the most conservative direction
 * (`staleTime: 0`, no window-focus refetch) — a missed per-hook override costs latency,
 * never staleness or PII read-audit integrity (research R5). Freshness per data type is set
 * in each domain hook (data-model.md §2), never here.
 */
export function createQueryClient(): QueryClient {
	return new QueryClient({
		queryCache: new QueryCache({
			onError: (error) => {
				if (isAuthStatus(error, [401])) {
					unauthorizedListener?.();
				}
			},
		}),
		defaultOptions: {
			queries: {
				staleTime: 0,
				refetchOnWindowFocus: false,
				retry: (failureCount, error) => {
					// Never retry an auth failure — 401 routes to sign-out above; 403 is a
					// standing RBAC denial retries can't fix.
					if (isAuthStatus(error, [401, 403])) {
						return false;
					}
					return failureCount < 3;
				},
			},
		},
	});
}

/** The one app-scoped QueryClient (research R4) — mounted via `QueryClientProvider` in `App.tsx`. */
export const queryClient = createQueryClient();
