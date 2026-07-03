import { useMemo } from 'react';
import { createDataService } from '../services/dataService';
import { useSession } from '../state/appState';

/**
 * Returns data-service methods bound to the current session token.
 * Views in R3 should use this hook rather than calling dataService directly.
 */
export function useDataService() {
	const { session } = useSession();
	return useMemo(() => createDataService(session?.token), [session?.token]);
}
