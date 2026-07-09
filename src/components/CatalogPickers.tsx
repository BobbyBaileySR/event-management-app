import { useEffect, useMemo, useState } from 'react';
import { CatalogPickerSelect } from './CatalogPickerSelect';
import { LoadingState } from './LoadingState';
import { useDataService } from '../hooks/useDataService';
import { useCatalogSelection } from '../state/catalogContext';
import type { CatalogProgram } from '../types';
import styles from './CatalogPickers.module.css';

const EMPTY_SELECTION = {
	programId: null,
	evId: null,
	programName: null,
	eventName: null,
	walkInFormUrl: null,
	capacity: null,
} as const;

export function CatalogPickers() {
	const data = useDataService();
	const { programId, evId, programName, eventName, setSelection, catalogRevision } = useCatalogSelection();
	const [programs, setPrograms] = useState<CatalogProgram[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [reloadKey, setReloadKey] = useState(0);

	useEffect(() => {
		let cancelled = false;
		setLoading(true);
		setError(null);

		data
			.fetchCatalog()
			.then((response) => {
				if (cancelled) {
					return;
				}
				setPrograms(response.programs);
				if (response.programs.length === 0) {
					setSelection({ ...EMPTY_SELECTION });
					return;
				}

				const selectedProgram = programId ? response.programs.find((program) => program.id === programId) : null;

				if (!selectedProgram) {
					if (programId) {
						setSelection({ ...EMPTY_SELECTION });
					}
					return;
				}

				if (!evId) {
					setSelection({
						programId: selectedProgram.id,
						evId: null,
						programName: selectedProgram.name,
						eventName: null,
						walkInFormUrl: null,
						capacity: null,
					});
					return;
				}

				const selectedEvent = selectedProgram.events.find((event) => event.id === evId);
				if (!selectedEvent) {
					setSelection({ ...EMPTY_SELECTION });
					return;
				}

				setSelection({
					programId: selectedProgram.id,
					evId: selectedEvent.id,
					programName: selectedProgram.name,
					eventName: selectedEvent.name,
					walkInFormUrl: selectedEvent.walkInFormUrl ?? null,
					capacity: selectedEvent.capacity ?? null,
				});
			})
			.catch((err: unknown) => {
				if (!cancelled) {
					setError(err instanceof Error ? err.message : 'Failed to load catalog');
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
	}, [data, setSelection, catalogRevision, programId, evId, reloadKey]);

	const activeProgram = useMemo(
		() => programs.find((program) => program.id === programId) ?? null,
		[programs, programId],
	);

	const programOptions = useMemo(
		() => [{ value: '', label: 'Select Program' }, ...programs.map((program) => ({ value: program.id, label: program.name }))],
		[programs],
	);

	const eventOptions = useMemo(() => {
		if (!activeProgram) {
			return [{ value: '', label: 'Select Event' }];
		}
		return [
			{ value: '', label: 'Select Event' },
			...activeProgram.events.map((event) => ({ value: event.id, label: event.name })),
		];
	}, [activeProgram]);

	function handleProgramChange(nextProgramId: string) {
		if (!nextProgramId) {
			setSelection({ ...EMPTY_SELECTION });
			return;
		}
		const program = programs.find((entry) => entry.id === nextProgramId);
		if (!program) {
			setSelection({ ...EMPTY_SELECTION });
			return;
		}
		setSelection({
			programId: program.id,
			evId: null,
			programName: program.name,
			eventName: null,
			walkInFormUrl: null,
			capacity: null,
		});
	}

	function handleEventChange(nextEventId: string) {
		if (!nextEventId) {
			if (!activeProgram) {
				setSelection({ ...EMPTY_SELECTION });
				return;
			}
			setSelection({
				programId: activeProgram.id,
				evId: null,
				programName: activeProgram.name,
				eventName: null,
				walkInFormUrl: null,
				capacity: null,
			});
			return;
		}
		if (!activeProgram) {
			return;
		}
		const event = activeProgram.events.find((entry) => entry.id === nextEventId);
		if (!event) {
			return;
		}
		setSelection({
			programId: activeProgram.id,
			evId: event.id,
			programName: activeProgram.name,
			eventName: event.name,
			walkInFormUrl: event.walkInFormUrl ?? null,
			capacity: event.capacity ?? null,
		});
	}

	if (loading) {
		return (
			<section className={styles.catalogBar} aria-label="Catalog navigation">
				<LoadingState message="Loading catalog…" variant="inline" didYouKnow={false} />
			</section>
		);
	}

	if (error) {
		return (
			<section className={styles.catalogBar} aria-label="Catalog navigation">
				<p className={styles.error} role="alert">
					{error}
				</p>
				<button
					type="button"
					className="btn btn-outline btn-sm"
					onClick={() => {
						setError(null);
						setReloadKey((current) => current + 1);
					}}
				>
					Try again
				</button>
			</section>
		);
	}

	if (programs.length === 0) {
		return (
			<section className={styles.catalogBar} aria-label="Catalog navigation">
				<p className={styles.contextSummary}>No Programs in the catalog yet. An admin can create the first Program.</p>
			</section>
		);
	}

	return (
		<section className={styles.catalogBar} aria-label="Catalog navigation">
			<CatalogPickerSelect
				id="catalog-program-picker"
				label="Program"
				value={programId ?? ''}
				placeholder="Select Program"
				options={programOptions}
				onChange={handleProgramChange}
			/>

			<CatalogPickerSelect
				id="catalog-event-picker"
				label="Event"
				value={evId ?? ''}
				placeholder="Select Event"
				options={eventOptions}
				disabled={!activeProgram}
				onChange={handleEventChange}
			/>

			{programName && eventName ? (
				<p className={styles.contextSummary}>
					Working context: {programName} → {eventName}
				</p>
			) : null}
		</section>
	);
}
