import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSession } from '../state/appState';
import { useDataService } from '../hooks/useDataService';
import { prefetchCatalog, prefetchCapacitySummary } from './prefetch';

/**
 * The session boundary (ADR-015 §Consequences, data-model.md §4): any `session?.token`
 * change — sign-out, sign-in, or a swap — cancels in-flight queries and clears the cache
 * unconditionally, so a response from the old token can never be written back or repainted
 * for a new one (quickstart §C7.1/§C7.4). When the new token is truthy (a session became
 * available), warm the two non-PII datasets once (research R9, ADR-016) so Programs & Events
 * is ready by the time the operator lands there.
 *
 * The effect is keyed on `session?.token` alone (read via a ref, not a dependency) so this
 * unconditional clear can never be retriggered by an unrelated re-render — e.g. if
 * `useDataService()`'s memoization ever changed, that must not turn into a spurious cache
 * wipe here.
 */
export function useSessionLifecycle(): void {
	const { session } = useSession();
	const data = useDataService();
	const queryClient = useQueryClient();

	const dataRef = useRef(data);
	dataRef.current = data;

	useEffect(() => {
		queryClient.cancelQueries();
		queryClient.clear();

		if (session?.token) {
			void prefetchCatalog(queryClient, dataRef.current);
			void prefetchCapacitySummary(queryClient, dataRef.current);
		}
	}, [session?.token, queryClient]);
}
