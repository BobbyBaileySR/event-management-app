import type { QueryClient } from '@tanstack/react-query';
import type { DataService } from '../services/dataService';
import { queryKeys } from './queryKeys';

/**
 * ADR-016 — audit-integrity gate: this module is the ONLY place allowed to warm queries
 * ahead of a real view mount, and it exposes exactly two non-PII, non-audited datasets.
 * There is deliberately no function here for attendee or audit-log reads — a speculative
 * PII prefetch would write a `writeReadAudit` entry for a screen the operator never opened,
 * making the audit trail lie. Any future prefetchable dataset must be verified non-PII and
 * non-audited before a function for it is added here.
 */

/** Mirrors useCatalog.ts's staleTime (data-model.md §2) so a warmed entry isn't immediately stale. */
const CATALOG_STALE_TIME_MS = 5 * 60 * 1000;
/** Mirrors useCapacity.ts's useCapacitySummary staleTime (data-model.md §2). */
const CAPACITY_SUMMARY_STALE_TIME_MS = 30 * 1000;

export function prefetchCatalog(queryClient: QueryClient, dataService: DataService): Promise<void> {
	return queryClient.prefetchQuery({
		queryKey: queryKeys.catalog(),
		queryFn: () => dataService.fetchCatalog(),
		staleTime: CATALOG_STALE_TIME_MS,
	});
}

export function prefetchCapacitySummary(queryClient: QueryClient, dataService: DataService): Promise<void> {
	return queryClient.prefetchQuery({
		queryKey: queryKeys.capacitySummary(),
		queryFn: () => dataService.fetchCapacitySummary(),
		staleTime: CAPACITY_SUMMARY_STALE_TIME_MS,
	});
}
