import { useQuery } from '@tanstack/react-query';
import { useDataService } from '../../hooks/useDataService';
import type { AuditEntry, AuditLogListResult } from '../../types';
import { queryKeys, type AuditQueryParams } from '../queryKeys';

const GC_TIME_MS = 5 * 60 * 1000;

export interface UseAuditLogOptions {
	enabled?: boolean;
}

/**
 * Portfolio-wide audit log page. `staleTime: 0` — an investigative surface where a stale
 * page is worse than a spinner (data-model.md §2).
 */
export function useAuditLog(params: AuditQueryParams = {}, options: UseAuditLogOptions = {}) {
	const data = useDataService();

	return useQuery<AuditLogListResult | { entries: AuditEntry[] }>({
		queryKey: queryKeys.auditLog(params),
		queryFn: () => data.fetchAuditLog(undefined, params),
		staleTime: 0,
		gcTime: GC_TIME_MS,
		enabled: options.enabled ?? true,
	});
}
