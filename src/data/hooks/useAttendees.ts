import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useDataService } from '../../hooks/useDataService';
import type { SliceAttendeesResponse } from '../../types';
import { queryKeys, type AttendeesQueryParams } from '../queryKeys';

const GC_TIME_MS = 5 * 60 * 1000;

export interface UseAttendeesOptions {
	enabled?: boolean;
}

/**
 * Attendee page for an Event — PII. `staleTime: 0` so every real view issues a fresh read,
 * preserving read-audit truthfulness (ADR-016); `gcTime` bounds how long a page can linger
 * in memory after the last observer unmounts.
 */
export function useAttendees(eventId: string, params: AttendeesQueryParams = {}, options: UseAttendeesOptions = {}) {
	const data = useDataService();

	return useQuery<SliceAttendeesResponse>({
		queryKey: queryKeys.attendees(eventId, params),
		queryFn: () => data.fetchEventAttendees(eventId, params),
		staleTime: 0,
		gcTime: GC_TIME_MS,
		enabled: (options.enabled ?? true) && Boolean(eventId),
		placeholderData: keepPreviousData,
	});
}
