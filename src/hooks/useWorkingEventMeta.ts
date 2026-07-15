import { useEffect, useState } from 'react';
import { useDataService } from './useDataService';

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
 * Resolves display metadata for a working event from `fetchCatalog()`.
 * Soft-fails to nulls on error; clears when `eventId` is null.
 */
export function useWorkingEventMeta(eventId: string | null): WorkingEventMeta {
	const data = useDataService();
	const [loading, setLoading] = useState(Boolean(eventId));
	const [meta, setMeta] = useState(EMPTY_META);

	useEffect(() => {
		if (!eventId) {
			setMeta(EMPTY_META);
			setLoading(false);
			return;
		}

		let cancelled = false;
		setLoading(true);

		void data
			.fetchCatalog({ includeArchived: true })
			.then(({ events, programs }) => {
				if (cancelled) {
					return;
				}
				const event = events.find((entry) => entry.id === eventId);
				if (!event) {
					setMeta(EMPTY_META);
					return;
				}
				const program =
					event.programId != null
						? (programs.find((entry) => entry.id === event.programId) ?? null)
						: null;
				setMeta({
					eventName: event.name,
					programName: program?.name ?? null,
					walkInFormUrl: event.walkInFormUrl ?? null,
					programId: event.programId ?? null,
				});
			})
			.catch(() => {
				if (!cancelled) {
					setMeta(EMPTY_META);
				}
			})
			.finally(() => {
				if (!cancelled) {
					setLoading(false);
				}
			});

		return () => {
			cancelled = true;
		};
	}, [data, eventId]);

	return { loading, ...meta };
}
