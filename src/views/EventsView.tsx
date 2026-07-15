import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CatalogEventModal } from '../components/CatalogEventModal';
import { CatalogProgramModal } from '../components/CatalogProgramModal';
import { LoadingState } from '../components/LoadingState';
import { StatusBadge } from '../components/StatusBadge';
import { TopBar } from '../components/TopBar';
import { useToast } from '../components/Toast';
import { ViewErrorState } from '../components/ViewErrorState';
import { useDataService } from '../hooks/useDataService';
import { eventPath } from '../router/navigation';
import type {
	CatalogEventSummary,
	CatalogProgram,
	CreateCatalogEventBody,
	CreateCatalogProgramBody,
	PatchCatalogEventBody,
	PatchCatalogProgramBody,
} from '../types';
import { enrichPortfolioWithCapacity, type PortfolioEvent } from '../utils/catalogEventPresentation';
import { filterPortfolioByStatus, searchPortfolioEvents, type PortfolioStatusFilter } from '../utils/listFilters';
import styles from './EventsView.module.css';

const STANDALONE_FILTER_ID = '__unassigned__';
const EVENTS_PAGE_SIZE = 5;
const CURATED_NAMED_PROGRAM_LIMIT = 2;

type LifecycleTab = 'active' | 'archived';
type ProgramModalState = { mode: 'create' } | { mode: 'edit'; program: CatalogProgram };
type EventModalState = { mode: 'create' } | { mode: 'edit'; event: CatalogEventSummary };

const STATUS_FILTERS: { id: PortfolioStatusFilter; label: string }[] = [
	{ id: 'all', label: 'All' },
	{ id: 'active', label: 'Active' },
	{ id: 'cancelled', label: 'Cancelled' },
	{ id: 'completed', label: 'Completed' },
];

function formatEventTime(iso: string): string {
	const parsed = new Date(iso);
	if (Number.isNaN(parsed.getTime())) {
		return '';
	}
	return new Intl.DateTimeFormat(undefined, { timeStyle: 'short' }).format(parsed);
}

function occupancyPercent(registered: number, capacity: number): number {
	if (capacity <= 0) {
		return 0;
	}
	return Math.min(100, Math.round((registered / capacity) * 100));
}

export function EventsView() {
	const navigate = useNavigate();
	const data = useDataService();
	const { showToast } = useToast();
	const [lifecycleTab, setLifecycleTab] = useState<LifecycleTab>('active');
	const [programs, setPrograms] = useState<CatalogProgram[]>([]);
	const [portfolioEvents, setPortfolioEvents] = useState<PortfolioEvent[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [reloadKey, setReloadKey] = useState(0);

	const [programFilter, setProgramFilter] = useState<string | null>(null);
	const [statusFilter, setStatusFilter] = useState<PortfolioStatusFilter>('all');
	const [programSearch, setProgramSearch] = useState('');
	const [eventSearch, setEventSearch] = useState('');
	const [eventsPage, setEventsPage] = useState(1);
	const [hoveredProgramId, setHoveredProgramId] = useState<string | null>(null);

	const [programModal, setProgramModal] = useState<ProgramModalState | null>(null);
	const [eventModal, setEventModal] = useState<EventModalState | null>(null);

	const isActiveTab = lifecycleTab === 'active';

	const loadCatalog = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const response = await data.fetchCatalog({ includeArchived: lifecycleTab === 'archived' });
			setPrograms(response.programs);
			const enriched = await enrichPortfolioWithCapacity(response.events, response.programs, (eventId) =>
				data.fetchEventCapacityStatus(eventId),
			);
			setPortfolioEvents(enriched);
		} catch (err: unknown) {
			setError(err instanceof Error ? err.message : 'Failed to load programs and events');
		} finally {
			setLoading(false);
		}
	}, [data, lifecycleTab]);

	useEffect(() => {
		void loadCatalog();
	}, [loadCatalog, reloadKey]);

	useEffect(() => {
		setProgramFilter(null);
		setStatusFilter('all');
		setEventsPage(1);
	}, [lifecycleTab]);

	const standaloneCount = useMemo(
		() => portfolioEvents.filter((event) => !event.programId).length,
		[portfolioEvents],
	);

	const programCards = useMemo(() => {
		const named = programs.map((program) => {
			const count = portfolioEvents.filter((event) => event.programId === program.id).length;
			const dates = portfolioEvents
				.filter((event) => event.programId === program.id)
				.map((event) => Date.parse(event.dateIso))
				.filter((value) => !Number.isNaN(value));
			const sortDate = dates.length ? Math.min(...dates) : Number.POSITIVE_INFINITY;
			return {
				id: program.id,
				name: program.name,
				countLabel: `${count} ${count === 1 ? 'event' : 'events'}`,
				editable: true,
				sortDate,
				program,
			};
		});
		const standaloneCard = {
			id: STANDALONE_FILTER_ID,
			name: 'No program (standalone)',
			countLabel: `${standaloneCount} ${standaloneCount === 1 ? 'event' : 'events'}`,
			editable: false,
			sortDate: Number.NEGATIVE_INFINITY,
			program: null as CatalogProgram | null,
		};
		const sortedNamed = [...named].sort((a, b) => a.sortDate - b.sortDate);
		const needle = programSearch.trim().toLowerCase();
		const base = needle
			? [standaloneCard, ...named]
			: [standaloneCard, ...sortedNamed.slice(0, CURATED_NAMED_PROGRAM_LIMIT)];
		return base.filter((card) => card.name.toLowerCase().includes(needle));
	}, [programs, portfolioEvents, programSearch, standaloneCount]);

	const filteredEvents = useMemo(() => {
		let rows = portfolioEvents;
		if (programFilter === STANDALONE_FILTER_ID) {
			rows = rows.filter((event) => !event.programId);
		} else if (programFilter) {
			rows = rows.filter((event) => event.programId === programFilter);
		}
		if (isActiveTab) {
			rows = filterPortfolioByStatus(statusFilter, rows);
		}
		return searchPortfolioEvents(eventSearch, rows);
	}, [portfolioEvents, programFilter, statusFilter, eventSearch, isActiveTab]);

	const totalPages = Math.max(1, Math.ceil(filteredEvents.length / EVENTS_PAGE_SIZE));
	const pageNumber = Math.min(eventsPage, totalPages);
	const pageEvents = filteredEvents.slice((pageNumber - 1) * EVENTS_PAGE_SIZE, pageNumber * EVENTS_PAGE_SIZE);

	const activeProgramChip = useMemo(() => {
		if (!programFilter) {
			return null;
		}
		if (programFilter === STANDALONE_FILTER_ID) {
			return { id: STANDALONE_FILTER_ID, name: 'No program (standalone)' };
		}
		const program = programs.find((entry) => entry.id === programFilter);
		return program ? { id: program.id, name: program.name } : null;
	}, [programFilter, programs]);

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
			await loadCatalog();
		} catch (err: unknown) {
			showToast(err instanceof Error ? err.message : 'Failed to save Program', 'error');
		}
	}

	async function handleProgramArchive() {
		if (programModal?.mode !== 'edit') {
			return;
		}
		const program = programModal.program;
		try {
			await data.updateProgram(program.id, { archived: !program.archived });
			showToast(program.archived ? 'Program unarchived' : 'Program archived', 'success');
			setProgramModal(null);
			if (programFilter === program.id) {
				setProgramFilter(null);
			}
			await loadCatalog();
		} catch (err: unknown) {
			showToast(err instanceof Error ? err.message : 'Failed to update Program', 'error');
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
			await loadCatalog();
		} catch (err: unknown) {
			showToast(err instanceof Error ? err.message : 'Failed to save Event', 'error');
		}
	}

	function openEventRow(event: PortfolioEvent) {
		navigate(eventPath(event.id));
	}

	if (loading) {
		return (
			<section id="view-events" className={styles.view}>
				<TopBar title="Programs & Events" meta="Loading…" />
				<LoadingState message="Loading programs and events…" skeleton="cards" />
			</section>
		);
	}

	if (error) {
		return (
			<ViewErrorState
				viewId="view-events"
				title="Programs & Events"
				message={error}
				onRetry={() => {
					setError(null);
					setReloadKey((current) => current + 1);
				}}
			/>
		);
	}

	return (
		<section id="view-events" className={styles.view}>
			<TopBar title="Programs & Events" meta="Create, manage and archive your event lineup" />

			<div className={styles.tabs} role="tablist" aria-label="Catalog lifecycle">
				<button
					type="button"
					role="tab"
					aria-selected={isActiveTab}
					className={isActiveTab ? styles.tabActive : styles.tab}
					onClick={() => setLifecycleTab('active')}
				>
					Active
				</button>
				<button
					type="button"
					role="tab"
					aria-selected={!isActiveTab}
					className={!isActiveTab ? styles.tabActive : styles.tab}
					onClick={() => setLifecycleTab('archived')}
				>
					Archived
				</button>
			</div>

			<section className={styles.panel}>
				<div className={styles.panelHeader}>
					<h2 className={styles.panelTitle}>Programs</h2>
					<div className={styles.panelTools}>
						<label className={styles.searchField}>
							<span className="material-symbols-outlined" aria-hidden="true">
								search
							</span>
							<input
								type="search"
								placeholder="Search programs"
								value={programSearch}
								onChange={(event) => setProgramSearch(event.target.value)}
								aria-label="Search programs"
							/>
						</label>
						{isActiveTab ? (
							<button
								type="button"
								className={`btn btn-primary btn-sm ${styles.createButton}`}
								onClick={() => setProgramModal({ mode: 'create' })}
							>
								+ New program
							</button>
						) : null}
					</div>
				</div>
				<div className={styles.programGrid}>
					{programCards.length === 0 ? (
						<p className={styles.emptyNote}>No programs match your search.</p>
					) : (
						programCards.map((card) => {
							const active = programFilter === card.id;
							const showEdit = card.editable && hoveredProgramId === card.id;
							return (
								<div
									key={card.id}
									className={styles.programCardWrap}
									onMouseEnter={() => setHoveredProgramId(card.id)}
									onMouseLeave={() => setHoveredProgramId((current) => (current === card.id ? null : current))}
								>
									<button
										type="button"
										className={`${styles.programCard}${active ? ` ${styles.programCardActive}` : ''}`}
										onClick={() => {
											setProgramFilter((current) => (current === card.id ? null : card.id));
											setEventsPage(1);
										}}
										aria-pressed={active}
										aria-label={`Filter by ${card.name}`}
									>
										<span className={styles.programCardText}>
											<span className={styles.programCardName}>{card.name}</span>
											<span className={styles.programCardMeta}>{card.countLabel}</span>
										</span>
										<span className={styles.programCardChevron} aria-hidden="true">
											›
										</span>
									</button>
									{card.editable && card.program ? (
										<div className={`${styles.programEditWrap}${showEdit ? ` ${styles.programEditVisible}` : ''}`}>
											<button
												type="button"
												className={styles.programEditButton}
												title="Edit program"
												aria-label={`Edit program ${card.name}`}
												onClick={(event) => {
													event.stopPropagation();
													setProgramModal({ mode: 'edit', program: card.program! });
												}}
											>
												<span className="material-symbols-outlined" aria-hidden="true">
													edit
												</span>
											</button>
										</div>
									) : null}
								</div>
							);
						})
					)}
				</div>
			</section>

			{activeProgramChip ? (
				<div className={styles.filterChipRow}>
					<span className={styles.filterChipLabel}>Filtered by program:</span>
					<span className={styles.filterChip}>
						{activeProgramChip.name}
						<button
							type="button"
							className={styles.filterChipDismiss}
							aria-label="Clear program filter"
							onClick={() => {
								setProgramFilter(null);
								setEventsPage(1);
							}}
						>
							×
						</button>
					</span>
				</div>
			) : null}

			<section className={styles.eventsPanel}>
				<div className={styles.eventsHeader}>
					<div className={styles.panelHeader}>
						<h2 className={styles.panelTitle}>Events</h2>
						<div className={styles.panelTools}>
							<label className={styles.searchField}>
								<span className="material-symbols-outlined" aria-hidden="true">
									search
								</span>
								<input
									type="search"
									placeholder="Search events"
									value={eventSearch}
									onChange={(event) => {
										setEventSearch(event.target.value);
										setEventsPage(1);
									}}
									aria-label="Search events"
								/>
							</label>
							{isActiveTab ? (
								<button
									type="button"
									className={`btn btn-primary btn-sm ${styles.createButton}`}
									onClick={() => setEventModal({ mode: 'create' })}
								>
									+ New event
								</button>
							) : null}
						</div>
					</div>
					{isActiveTab ? (
						<div className={styles.statusFilters}>
							{STATUS_FILTERS.map(({ id, label }) => (
								<button
									key={id}
									type="button"
									className={statusFilter === id ? styles.statusPillActive : styles.statusPill}
									onClick={() => {
										setStatusFilter(id);
										setEventsPage(1);
									}}
								>
									{label}
								</button>
							))}
						</div>
					) : null}
				</div>

				<div className="table-scroll">
					<table className={styles.eventsTable}>
						<thead>
							<tr>
								<th scope="col">Event</th>
								<th scope="col">Program</th>
								<th scope="col">Date</th>
								<th scope="col">Capacity</th>
								<th scope="col">Status</th>
								<th scope="col">
									<span className="sr-only">Open event</span>
								</th>
							</tr>
						</thead>
						<tbody>
							{pageEvents.length === 0 ? (
								<tr>
									<td colSpan={6}>No events match your filters.</td>
								</tr>
							) : (
								pageEvents.map((event) => {
									const pct = occupancyPercent(event.attendeeCount, event.capacity);
									const time = formatEventTime(event.dateIso);
									return (
										<tr
											key={event.id}
											className={styles.eventRow}
											onClick={() => openEventRow(event)}
											onKeyDown={(keyboardEvent) => {
												if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') {
													keyboardEvent.preventDefault();
													openEventRow(event);
												}
											}}
											tabIndex={0}
											role="link"
											aria-label={`Open ${event.name}`}
										>
											<td>
												<strong className={styles.eventName}>{event.name}</strong>
												<span className={styles.eventSub}>{event.location || '—'}</span>
											</td>
											<td>{event.programName ?? 'No program'}</td>
											<td>
												{event.date}
												{time ? <span className={styles.eventSub}>{time}</span> : null}
											</td>
											<td>
												<div className={styles.capacityCell}>
													<div className={styles.capacityMeta}>
														<span>
															{event.attendeeCount}/{event.capacity || 0}
														</span>
														<span>{pct}%</span>
													</div>
													<div className={styles.capacityTrack} aria-hidden="true">
														<div className={styles.capacityFill} style={{ width: `${pct}%` }} />
													</div>
												</div>
											</td>
											<td>
												<StatusBadge status={event.status} />
											</td>
											<td className={styles.eventChevron} aria-hidden="true">
												›
											</td>
										</tr>
									);
								})
							)}
						</tbody>
					</table>
				</div>

				<div className={styles.pager}>
					<span>
						Page {pageNumber} of {totalPages} · {filteredEvents.length} events
					</span>
					<div className={styles.pagerActions}>
						<button
							type="button"
							className="btn btn-outline btn-sm"
							disabled={pageNumber <= 1}
							onClick={() => setEventsPage((current) => Math.max(1, current - 1))}
						>
							‹ Prev
						</button>
						<button
							type="button"
							className="btn btn-outline btn-sm"
							disabled={pageNumber >= totalPages}
							onClick={() => setEventsPage((current) => Math.min(totalPages, current + 1))}
						>
							Next ›
						</button>
					</div>
				</div>
			</section>

			<CatalogProgramModal
				open={programModal !== null}
				mode={programModal?.mode ?? 'create'}
				program={programModal?.mode === 'edit' ? programModal.program : undefined}
				onCancel={() => setProgramModal(null)}
				onSave={handleProgramSave}
				onArchive={programModal?.mode === 'edit' ? handleProgramArchive : undefined}
			/>
			<CatalogEventModal
				open={eventModal !== null}
				mode={eventModal?.mode ?? 'create'}
				programs={activeProgramsForCreate}
				event={eventModal?.mode === 'edit' ? eventModal.event : undefined}
				parentProgram={
					eventModal?.mode === 'edit' && eventModal.event.programId
						? (programs.find((program) => program.id === eventModal.event.programId) ?? null)
						: null
				}
				onCancel={() => setEventModal(null)}
				onSave={handleEventSave}
			/>
		</section>
	);
}
