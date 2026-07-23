import { useQuery } from '@tanstack/react-query';
import { useDataService } from '../../hooks/useDataService';
import type { CapacityStatus, CapacitySummaryResponse } from '../../types';
import { queryKeys } from '../queryKeys';

const STALE_TIME_MS = 30 * 1000;
const GC_TIME_MS = 5 * 60 * 1000;

/** Bulk capacity/checked-in aggregate for Programs & Events (data-model.md §2 — non-PII, volatile). */
export function useCapacitySummary() {
	const data = useDataService();

	return useQuery<CapacitySummaryResponse>({
		queryKey: queryKeys.capacitySummary(),
		queryFn: () => data.fetchCapacitySummary(),
		staleTime: STALE_TIME_MS,
		gcTime: GC_TIME_MS,
	});
}

export interface UseEventCapacityOptions {
	/** CheckInView's existing live-counter cadence — pass its interval to preserve today's behaviour. */
	refetchIntervalMs?: number;
	enabled?: boolean;
}

/** Per-event capacity snapshot (data-model.md §2) — CheckInView keeps its own tighter refetch cadence. */
export function useEventCapacity(eventId: string, options: UseEventCapacityOptions = {}) {
	const data = useDataService();
	const { refetchIntervalMs, enabled = true } = options;

	return useQuery<CapacityStatus>({
		queryKey: queryKeys.eventCapacity(eventId),
		queryFn: () => data.fetchEventCapacityStatus(eventId),
		staleTime: STALE_TIME_MS,
		gcTime: GC_TIME_MS,
		refetchInterval: refetchIntervalMs,
		enabled: enabled && Boolean(eventId),
	});
}
