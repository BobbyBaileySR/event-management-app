import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { CatalogEventModal } from '../components/CatalogEventModal';
import { CatalogProgramModal } from '../components/CatalogProgramModal';
import { TopBar } from '../components/TopBar';
import { useToast } from '../components/Toast';
import { useDataService } from '../hooks/useDataService';
import { useSession } from '../state/appState';
import { useCatalogSelection } from '../state/catalogContext';
import type {
	CatalogEvent,
	CatalogProgram,
	CreateCatalogEventBody,
	CreateCatalogProgramBody,
	PatchCatalogEventBody,
	PatchCatalogProgramBody,
} from '../types';
import { eventMetadataLines, programMetadataLines } from '../utils/catalogMetadata';
import styles from './CatalogAdminView.module.css';

type CatalogTab = 'active' | 'archived';
type ProgramModalState = { mode: 'create' } | { mode: 'edit'; program: CatalogProgram };
type EventModalState =
	| { mode: 'create' }
	| { mode: 'edit'; event: CatalogEvent; parentProgram: CatalogProgram };

function MetadataSummary({ lines }: { lines: Array<{ label: string; value: string }> }) {
	if (lines.length === 0) {
		return null;
	}

	return (
		<div className={styles.metadata}>
			{lines.map((line) => (
				<p key={line.label} className={styles.meta}>
					{line.label}: {line.value}
				</p>
			))}
		</div>
	);
}

export function CatalogAdminView() {
	const { session } = useSession();
	const data = useDataService();
	const { showToast } = useToast();
	const { bumpCatalog } = useCatalogSelection();
	const [tab, setTab] = useState<CatalogTab>('active');
	const [programs, setPrograms] = useState<CatalogProgram[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [programModal, setProgramModal] = useState<ProgramModalState | null>(null);
	const [eventModal, setEventModal] = useState<EventModalState | null>(null);

	const loadCatalog = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const response = await data.fetchCatalog({ includeArchived: tab === 'archived' });
			setPrograms(response.programs);
		} catch (err: unknown) {
			setError(err instanceof Error ? err.message : 'Failed to load catalog');
		} finally {
			setLoading(false);
		}
	}, [data, tab]);

	useEffect(() => {
		void loadCatalog();
	}, [loadCatalog]);

	if (session?.role !== 'admin') {
		return <Navigate to="/events" replace />;
	}

	const isActiveTab = tab === 'active';
	const activeProgramsForCreate = programs.filter((program) => !program.archived);

	async function handleProgramSave(body: CreateCatalogProgramBody | PatchCatalogProgramBody) {
		try {
			if (programModal?.mode === 'create') {
				await data.createProgram(body as CreateCatalogProgramBody);
				showToast('Program created', 'success');
			} else if (programModal?.mode === 'edit') {
				await data.updateProgram(programModal.program.id, body as PatchCatalogProgramBody);
				showToast('Program updated', 'success');
			}
			setProgramModal(null);
			bumpCatalog();
			await loadCatalog();
		} catch (err: unknown) {
			showToast(err instanceof Error ? err.message : 'Failed to save Program', 'error');
		}
	}

	async function handleEventSave(body: CreateCatalogEventBody | PatchCatalogEventBody) {
		try {
			if (eventModal?.mode === 'create') {
				await data.createEvent(body as CreateCatalogEventBody);
				showToast('Event created', 'success');
			} else if (eventModal?.mode === 'edit') {
				await data.updateEvent(eventModal.event.id, body as PatchCatalogEventBody);
				showToast('Event updated', 'success');
			}
			setEventModal(null);
			bumpCatalog();
			await loadCatalog();
		} catch (err: unknown) {
			showToast(err instanceof Error ? err.message : 'Failed to save Event', 'error');
		}
	}

	async function toggleProgramArchive(program: CatalogProgram) {
		try {
			await data.updateProgram(program.id, { archived: !program.archived });
			showToast(program.archived ? 'Program unarchived' : 'Program archived', 'success');
			bumpCatalog();
			await loadCatalog();
		} catch (err: unknown) {
			showToast(err instanceof Error ? err.message : 'Failed to update Program', 'error');
		}
	}

	async function toggleEventArchive(eventId: string, archived: boolean) {
		try {
			await data.updateEvent(eventId, { archived: !archived });
			showToast(archived ? 'Event unarchived' : 'Event archived', 'success');
			bumpCatalog();
			await loadCatalog();
		} catch (err: unknown) {
			showToast(err instanceof Error ? err.message : 'Failed to update Event', 'error');
		}
	}

	function renderProgramTree(program: CatalogProgram) {
		const isArchivedTab = tab === 'archived';
		const programOnlyArchivedEvents = isArchivedTab && !program.archived;

		if (programOnlyArchivedEvents) {
			return (
				<article key={program.id} className={styles.card}>
					<h3 className={styles.sectionLabel}>{program.name}</h3>
					<p className={styles.meta}>Active Program — archived Events only</p>
					<MetadataSummary lines={programMetadataLines(program)} />
					<ul>
						{program.events.map((event) => (
							<li key={event.id}>
								<div className={styles.cardHeader}>
									<div>
										<strong>{event.name}</strong>
										<p className={styles.meta}>Parts Attended: {event.partsAttendedOption}</p>
										<MetadataSummary lines={eventMetadataLines(event)} />
									</div>
									<button
										type="button"
										className={styles.secondary}
										onClick={() => void toggleEventArchive(event.id, event.archived)}
									>
										Unarchive Event
									</button>
								</div>
							</li>
						))}
					</ul>
				</article>
			);
		}

		return (
			<article key={program.id} className={styles.card}>
				<div className={styles.cardHeader}>
					<div>
						<strong>{program.name}</strong>
						<p className={styles.meta}>Form ID: {program.hubspotFormId}</p>
						<MetadataSummary lines={programMetadataLines(program)} />
					</div>
					<div className={styles.actions}>
						{isActiveTab ? (
							<button
								type="button"
								className={styles.secondary}
								onClick={() => setProgramModal({ mode: 'edit', program })}
							>
								Edit Program
							</button>
						) : null}
						<button type="button" className={styles.secondary} onClick={() => void toggleProgramArchive(program)}>
							{program.archived ? 'Unarchive Program' : 'Archive Program'}
						</button>
					</div>
				</div>
				<ul>
					{program.events.map((event) => (
						<li key={event.id}>
							<div className={styles.cardHeader}>
								<div>
									<strong>{event.name}</strong>
									<p className={styles.meta}>Parts Attended: {event.partsAttendedOption}</p>
									<MetadataSummary lines={eventMetadataLines(event)} />
								</div>
								<div className={styles.actions}>
									{isActiveTab ? (
										<button
											type="button"
											className={styles.secondary}
											onClick={() => setEventModal({ mode: 'edit', event, parentProgram: program })}
										>
											Edit Event
										</button>
									) : null}
									<button
										type="button"
										className={program.archived ? styles.secondary : styles.danger}
										onClick={() => void toggleEventArchive(event.id, event.archived)}
									>
										{event.archived ? 'Unarchive Event' : 'Archive Event'}
									</button>
								</div>
							</div>
						</li>
					))}
				</ul>
			</article>
		);
	}

	return (
		<div className={styles.view}>
			<TopBar title="Catalog admin" meta="Programs, Events, archive lifecycle" />

			<div className={styles.tabs}>
				<button
					type="button"
					className={tab === 'active' ? styles.tabActive : styles.tab}
					onClick={() => setTab('active')}
				>
					Active catalog
				</button>
				<button
					type="button"
					className={tab === 'archived' ? styles.tabActive : styles.tab}
					onClick={() => setTab('archived')}
				>
					Archived
				</button>
			</div>

			{loading ? <p>Loading catalog…</p> : null}
			{error ? <p className={styles.error}>{error}</p> : null}

			{isActiveTab ? (
				<section className={styles.panel}>
					<div className={styles.actions}>
						<button type="button" className={styles.primary} onClick={() => setProgramModal({ mode: 'create' })}>
							Create Program
						</button>
						<button
							type="button"
							className={styles.primary}
							onClick={() => setEventModal({ mode: 'create' })}
							disabled={activeProgramsForCreate.length === 0}
						>
							Create Event
						</button>
					</div>
				</section>
			) : null}

			<section className={styles.panel}>
				<h2>{tab === 'archived' ? 'Archived entries' : 'Catalog tree'}</h2>
				<div className={styles.list}>
					{programs.length === 0 ? <p>No entries in this view.</p> : null}
					{programs.map((program) => renderProgramTree(program))}
				</div>
			</section>

			<CatalogProgramModal
				open={programModal !== null}
				mode={programModal?.mode ?? 'create'}
				program={programModal?.mode === 'edit' ? programModal.program : undefined}
				onCancel={() => setProgramModal(null)}
				onSave={handleProgramSave}
			/>
			<CatalogEventModal
				open={eventModal !== null}
				mode={eventModal?.mode ?? 'create'}
				programs={activeProgramsForCreate}
				event={eventModal?.mode === 'edit' ? eventModal.event : undefined}
				parentProgram={eventModal?.mode === 'edit' ? eventModal.parentProgram : undefined}
				onCancel={() => setEventModal(null)}
				onSave={handleEventSave}
			/>
		</div>
	);
}
