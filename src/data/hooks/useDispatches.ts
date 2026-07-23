import { useQuery } from '@tanstack/react-query';
import { useDataService } from '../../hooks/useDataService';
import type { EmailDispatchListResponse, ScheduledEmailSummary } from '../../types';
import { queryKeys, type DispatchesQueryParams } from '../queryKeys';

const STALE_TIME_MS = 30 * 1000;
const GC_TIME_MS = 5 * 60 * 1000;

export interface UseDispatchesOptions {
	enabled?: boolean;
}

/** Campaign/dispatch list for an Event — mutations invalidate explicitly (data-model.md §3). */
export function useDispatches(
	eventId: string,
	params: DispatchesQueryParams = {},
	options: UseDispatchesOptions = {},
) {
	const data = useDataService();

	return useQuery<EmailDispatchListResponse>({
		queryKey: queryKeys.dispatches(eventId, params),
		queryFn: () => data.fetchEmailDispatches(eventId, params),
		staleTime: STALE_TIME_MS,
		gcTime: GC_TIME_MS,
		enabled: (options.enabled ?? true) && Boolean(eventId),
	});
}

/** Overview "scheduled this week" aggregate — existing `events/scheduled-email-summary` (FE-REDESIGN-020). */
export function useScheduledDispatchSummary() {
	const data = useDataService();

	return useQuery<ScheduledEmailSummary>({
		queryKey: queryKeys.dispatchesScheduledSummary(),
		queryFn: () => data.fetchScheduledEmailSummary(),
		staleTime: STALE_TIME_MS,
		gcTime: GC_TIME_MS,
	});
}
