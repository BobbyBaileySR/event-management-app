import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { TopBar } from '../components/TopBar';
import { useToast } from '../components/Toast';
import {
	ATTENDANCE_PROPERTY_PRESETS,
	parseFormIdsInput,
	suggestAttendanceProperty,
} from '../constants/hubspot';
import { useDataService } from '../hooks/useDataService';
import { useSession } from '../state/appState';
import { useCatalogSelection } from '../state/catalogContext';
import type { CatalogProgram } from '../types';
import styles from './CatalogAdminView.module.css';

type CatalogTab = 'active' | 'archived';

export function CatalogAdminView() {
	const { session } = useSession();
	const data = useDataService();
	const { showToast } = useToast();
	const { bumpCatalog } = useCatalogSelection();
	const [tab, setTab] = useState<CatalogTab>('active');
	const [programs, setPrograms] = useState<CatalogProgram[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [programName, setProgramName] = useState('');
	const [programFormIds, setProgramFormIds] = useState('');
	const [eventProgramId, setEventProgramId] = useState('');
	const [eventName, setEventName] = useState('');
	const [eventOption, setEventOption] = useState('');
	const [eventAttendanceProperty, setEventAttendanceProperty] = useState(
		ATTENDANCE_PROPERTY_PRESETS[0],
	);

	const loadCatalog = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const response = await data.fetchCatalog({ includeArchived: tab === 'archived' });
			setPrograms(response.programs);
			if (!eventProgramId && response.programs[0]) {
				setEventProgramId(response.programs[0].id);
			}
		} catch (err: unknown) {
			setError(err instanceof Error ? err.message : 'Failed to load catalog');
		} finally {
			setLoading(false);
		}
	}, [data, eventProgramId, tab]);

	useEffect(() => {
		void loadCatalog();
	}, [loadCatalog]);

	if (session?.role !== 'admin') {
		return <Navigate to="/events" replace />;
	}

	async function handleCreateProgram(event: FormEvent) {
		event.preventDefault();
		try {
			await data.createProgram({ name: programName, hubspotFormIds: parseFormIdsInput(programFormIds) });
			setProgramName('');
			setProgramFormIds('');
			showToast('Program created', 'success');
			bumpCatalog();
			await loadCatalog();
		} catch (err: unknown) {
			showToast(err instanceof Error ? err.message : 'Failed to create Program', 'error');
		}
	}

	async function handleCreateEvent(formEvent: FormEvent) {
		formEvent.preventDefault();
		try {
			await data.createEvent({
				programId: eventProgramId,
				name: eventName,
				partsAttendedOption: eventOption,
				attendanceProperty: eventAttendanceProperty,
			});
			setEventName('');
			setEventOption('');
			setEventAttendanceProperty(ATTENDANCE_PROPERTY_PRESETS[0]);
			showToast('Event created', 'success');
			bumpCatalog();
			await loadCatalog();
		} catch (err: unknown) {
			showToast(err instanceof Error ? err.message : 'Failed to create Event', 'error');
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
					<ul>
						{program.events.map((event) => (
							<li key={event.id}>
								<div className={styles.cardHeader}>
									<div>
										<strong>{event.name}</strong>
										<p className={styles.meta}>
											Parts Attended: {event.partsAttendedOption} · Attendance: {event.attendanceProperty}
										</p>
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
						<p className={styles.meta}>Form IDs: {(program.hubspotFormIds ?? []).join(', ') || '—'}</p>
					</div>
					<div className={styles.actions}>
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
								</div>
								<button
									type="button"
									className={program.archived ? styles.secondary : styles.danger}
									onClick={() => void toggleEventArchive(event.id, event.archived)}
								>
									{event.archived ? 'Unarchive Event' : 'Archive Event'}
								</button>
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

			{tab === 'active' ? (
				<section className={styles.panel}>
					<h2>Create Program</h2>
					<form className={styles.formGrid} onSubmit={handleCreateProgram}>
						<label>
							Program name
							<input value={programName} onChange={(event) => setProgramName(event.target.value)} required />
						</label>
						<label>
							HubSpot form IDs (one per line or comma-separated)
							<textarea
								value={programFormIds}
								onChange={(event) => setProgramFormIds(event.target.value)}
								required
								rows={3}
							/>
						</label>
						<div className={styles.actions}>
							<button type="submit" className={styles.primary}>
								Save Program
							</button>
						</div>
					</form>

					<h2>Add Event</h2>
					<form className={styles.formGrid} onSubmit={handleCreateEvent}>
						<label>
							Program
							<select value={eventProgramId} onChange={(event) => setEventProgramId(event.target.value)} required>
								{programs.map((program) => (
									<option key={program.id} value={program.id}>
										{program.name}
									</option>
								))}
							</select>
						</label>
						<label>
							Event name
							<input
								value={eventName}
								onChange={(event) => {
									setEventName(event.target.value);
									if (event.target.value.trim()) {
										setEventAttendanceProperty(suggestAttendanceProperty(event.target.value));
									}
								}}
								required
							/>
						</label>
						<label>
							Parts Attended option
							<input value={eventOption} onChange={(event) => setEventOption(event.target.value)} required />
						</label>
						<label>
							Attendance property (HubSpot internal name)
							<input
								list="attendance-property-presets"
								value={eventAttendanceProperty}
								onChange={(event) => setEventAttendanceProperty(event.target.value)}
								required
							/>
							<datalist id="attendance-property-presets">
								{ATTENDANCE_PROPERTY_PRESETS.map((preset) => (
									<option key={preset} value={preset} />
								))}
							</datalist>
						</label>
						<div className={styles.actions}>
							<button type="submit" className={styles.primary}>
								Save Event
							</button>
						</div>
					</form>
				</section>
			) : null}

			<section className={styles.panel}>
				<h2>{tab === 'archived' ? 'Archived entries' : 'Catalog tree'}</h2>
				<div className={styles.list}>
					{programs.length === 0 ? <p>No entries in this view.</p> : null}
					{programs.map((program) => renderProgramTree(program))}
				</div>
			</section>
		</div>
	);
}
