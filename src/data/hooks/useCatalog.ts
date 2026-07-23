import { useQuery } from '@tanstack/react-query';
import { useDataService } from '../../hooks/useDataService';
import type { CatalogResponse } from '../../types';
import { queryKeys } from '../queryKeys';

const STALE_TIME_MS = 5 * 60 * 1000;
const GC_TIME_MS = 30 * 60 * 1000;

export interface UseCatalogOptions {
	includeArchived?: boolean;
	/** Skip the fetch entirely (e.g. no event selected yet) while still calling the hook unconditionally. */
	enabled?: boolean;
}

/** Programs + events portfolio (data-model.md §2 — changes rarely; own CRUD invalidates explicitly). */
export function useCatalog(options: UseCatalogOptions = {}) {
	const data = useDataService();
	const { includeArchived = false, enabled = true } = options;

	return useQuery<CatalogResponse>({
		queryKey: queryKeys.catalog({ includeArchived }),
		queryFn: () => data.fetchCatalog({ includeArchived }),
		staleTime: STALE_TIME_MS,
		gcTime: GC_TIME_MS,
		enabled,
	});
}
