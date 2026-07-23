import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';

/**
 * data-model.md §3 — the only module allowed to call `invalidateQueries` (FR-010). Each
 * helper marks its mapped key families stale by prefix; callers pass the app's `QueryClient`
 * (from `useQueryClient()`), matching `prefetch.ts`'s dependency-injected shape. Over-invalidate
 * when in doubt — a spurious refetch costs latency, a missed one shows stale data.
 */

/** Program/Event create, edit, archive/unarchive — the whole capacity family changes population too. */
export function invalidateAfterCatalogChange(queryClient: QueryClient): Promise<void> {
	return Promise.all([
		queryClient.invalidateQueries({ queryKey: queryKeys.catalog() }),
		queryClient.invalidateQueries({ queryKey: queryKeys.capacityAll() }),
	]).then(() => undefined);
}

/** Check-in, undo check-in, walk-in confirm, or remove attendee for an Event. */
export function invalidateAfterAttendeeMutation(queryClient: QueryClient, eventId: string): Promise<void> {
	return Promise.all([
		queryClient.invalidateQueries({ queryKey: queryKeys.eventCapacity(eventId) }),
		queryClient.invalidateQueries({ queryKey: queryKeys.capacitySummary() }),
		queryClient.invalidateQueries({ queryKey: queryKeys.attendeesForEvent(eventId) }),
	]).then(() => undefined);
}

/**
 * Capacity ±1 adjust for an Event. Only `capacity[summary]` is invalidated here — the
 * one call site (CheckInView) already writes the adjusted status straight into
 * `capacity[eventId]` via `setQueryData` (the response of the adjust call itself), which is
 * fresher than anything a refetch could return; invalidating that key too would just force a
 * redundant round trip that could race the optimistic write.
 */
export function invalidateAfterCapacityAdjust(queryClient: QueryClient, _eventId: string): Promise<void> {
	return queryClient.invalidateQueries({ queryKey: queryKeys.capacitySummary() }).then(() => undefined);
}

/** Campaign create, edit, or cancel for an Event. */
export function invalidateAfterCampaignChange(queryClient: QueryClient, eventId: string): Promise<void> {
	return Promise.all([
		queryClient.invalidateQueries({ queryKey: queryKeys.dispatchesForEvent(eventId) }),
		queryClient.invalidateQueries({ queryKey: queryKeys.dispatchesScheduledSummary() }),
	]).then(() => undefined);
}
