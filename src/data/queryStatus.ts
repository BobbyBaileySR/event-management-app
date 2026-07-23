export interface QueryLikeState {
	data: unknown;
	isError: boolean;
	error: unknown;
}

export type ViewQueryStatus =
	| { kind: 'loading' }
	| { kind: 'error'; message: string }
	| { kind: 'ready'; refetchFailed: boolean };

function errorMessage(error: unknown, fallback: string): string {
	return error instanceof Error ? error.message : fallback;
}

/**
 * Maps a `useQuery` result to view-level state (research R6): a first-load failure (no data
 * yet) keeps today's full loading → error ladder; a background-refetch failure with data
 * already on screen keeps rendering that snapshot behind a non-blocking retry affordance
 * (`RefetchFailureBanner`) instead of blanking to an error state.
 */
export function describeQueryStatus(query: QueryLikeState, fallbackErrorMessage = 'Failed to load'): ViewQueryStatus {
	if (query.data === undefined) {
		if (query.isError) {
			return { kind: 'error', message: errorMessage(query.error, fallbackErrorMessage) };
		}
		return { kind: 'loading' };
	}
	return { kind: 'ready', refetchFailed: query.isError };
}
