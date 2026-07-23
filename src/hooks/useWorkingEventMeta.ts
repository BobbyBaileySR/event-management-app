import { useCatalog } from '../data/hooks/useCatalog';

export interface WorkingEventMeta {
	loading: boolean;
	eventName: string | null;
	programName: string | null;
	walkInFormUrl: string | null;
	programId: string | null;
}

const EMPTY_META: Omit<WorkingEventMeta, 'loading'> = {
	eventName: null,
	programName: null,
	walkInFormUrl: null,
	programId: null,
};

/**
 * Resolves display metadata for a working event from the shared, cached catalog query
 * (`useCatalog`) — previously an independent raw `fetchCatalog()` call on every mount.
 * `includeArchived: true` is a deliberately different dataset/cache entry from the
 * non-archived catalog `WorkingEventPicker`/`AppLayout`/the sign-in prefetch share, since an
 * archived event's Event Details page still needs its name/program to resolve here.
 * Soft-fails to nulls on error; skips the fetch entirely when `eventId` is null.
 */
export function useWorkingEventMeta(eventId: string | null): WorkingEventMeta {
	const { data: catalog, isLoading, isError } = useCatalog({
		includeArchived: true,
		enabled: Boolean(eventId),
	});

	if (!eventId) {
		return { loading: false, ...EMPTY_META };
	}

	if (isLoading) {
		return { loading: true, ...EMPTY_META };
	}

	const event = isError ? undefined : catalog?.events.find((entry) => entry.id === eventId);
	if (!event) {
		return { loading: false, ...EMPTY_META };
	}

	const program =
		event.programId != null ? (catalog?.programs.find((entry) => entry.id === event.programId) ?? null) : null;
	return {
		loading: false,
		eventName: event.name,
		programName: program?.name ?? null,
		walkInFormUrl: event.walkInFormUrl ?? null,
		programId: event.programId ?? null,
	};
}
