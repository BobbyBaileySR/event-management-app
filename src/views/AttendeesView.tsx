import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import { SelectPicker } from '../components/pickers/SelectPicker';
import { AttendeeDetailModal } from '../components/AttendeeDetailModal';
import { useConfirm } from '../components/ConfirmModal';
import { EmptyState } from '../components/EmptyState';
import { LoadingState } from '../components/LoadingState';
import { RefetchFailureBanner } from '../components/RefetchFailureBanner';
import { TopBar } from '../components/TopBar';
import { useToast } from '../components/Toast';
import { ViewErrorState } from '../components/ViewErrorState';
import { useAttendees } from '../data/hooks/useAttendees';
import { useEventCapacity } from '../data/hooks/useCapacity';
import { useDispatches } from '../data/hooks/useDispatches';
import { invalidateAfterAttendeeMutation } from '../data/invalidation';
import { describeQueryStatus } from '../data/queryStatus';
import { useDataService } from '../hooks/useDataService';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useUndoCheckIn } from '../hooks/useUndoCheckIn';
import { useWorkingEventMeta } from '../hooks/useWorkingEventMeta';
import { useActiveRoute } from '../router/navigation';
import { useSession } from '../state/appState';
import { CONFIG } from '../config';
import type { GenerateLeadBatchResultEntry, SliceAttendee } from '../types';
import { attendeeMutationErrorMessage } from '../utils/attendeeMutationErrors';
import { attendeeInitials, attendeeName } from '../utils/attendeePresentation';
import styles from './AttendeesView.module.css';

function summarizeLeadBatchResults(results: GenerateLeadBatchResultEntry[]): { message: string; description?: string } {
	const counts = { created: 0, updated: 0, created_separate: 0, failed: 0 };
	for (const result of results) {
		counts[result.outcome] += 1;
	}
	const parts: string[] = [];
	if (counts.created) parts.push(`${counts.created} created`);
	if (counts.updated) parts.push(`${counts.updated} updated`);
	if (counts.created_separate) parts.push(`${counts.created_separate} new (existing Lead left untouched)`);
	if (counts.failed) parts.push(`${counts.failed} failed`);
	const message = `Leads generated: ${parts.join(', ') || 'no attendees processed'}`;
	if (counts.failed > 0) {
		const failedIds = results
			.filter((result) => result.outcome === 'failed')
			.map((result) => result.contactId)
			.join(', ');
		return { message, description: `Failed for: ${failedIds}` };
	}
	return { message };
}

type CheckedInFilter = 'all' | 'checked-in' | 'not-checked-in';
type AttendeeTypeFilter = 'all' | 'customer' | 'partner';
type DispatchOutcomeFilter = 'received' | 'not_received';

const DEFAULT_PAGE_SIZE = 50;

export function AttendeesView() {
	const { session } = useSession();
	const data = useDataService();
	const queryClient = useQueryClient();
	const { showToast } = useToast();
	const { confirm } = useConfirm();
	const { eventId } = useActiveRoute();
	const { eventName } = useWorkingEventMeta(eventId);
	const [searchQuery, setSearchQuery] = useState('');
	const debouncedSearch = useDebouncedValue(searchQuery);
	const [checkedInFilter, setCheckedInFilter] = useState<CheckedInFilter>('all');
	const [attendeeTypeFilter, setAttendeeTypeFilter] = useState<AttendeeTypeFilter>('all');
	const [selectedDispatchId, setSelectedDispatchId] = useState('');
	const [dispatchOutcomeFilter, setDispatchOutcomeFilter] = useState<DispatchOutcomeFilter>('received');
	const [page, setPage] = useState(1);
	const [removingId, setRemovingId] = useState<string | null>(null);
	const { undoingId, runUndoCheckIn } = useUndoCheckIn(eventId ?? null);
	const [detailContactId, setDetailContactId] = useState<string | null>(null);
	const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
	const [generatingLeads, setGeneratingLeads] = useState(false);
	const [includeFullHistoryBatch, setIncludeFullHistoryBatch] = useState(false);

	useEffect(() => {
		setSearchQuery('');
		setCheckedInFilter('all');
		setAttendeeTypeFilter('all');
		setSelectedDispatchId('');
		setDispatchOutcomeFilter('received');
		setPage(1);
		setSelectedContactIds(new Set());
	}, [eventId]);

	useEffect(() => {
		setSelectedContactIds(new Set());
	}, [page]);

	const hasEventId = Boolean(eventId);
	const checkedIn = checkedInFilter === 'checked-in' ? true : checkedInFilter === 'not-checked-in' ? false : undefined;
	const dispatchFilter =
		selectedDispatchId && dispatchOutcomeFilter
			? { dispatchId: selectedDispatchId, dispatchFilter: dispatchOutcomeFilter }
			: {};

	const attendeesQuery = useAttendees(
		eventId ?? '',
		{
			q: debouncedSearch || undefined,
			checkedIn,
			page,
			pageSize: DEFAULT_PAGE_SIZE,
			...dispatchFilter,
		},
		{ enabled: hasEventId },
	);
	/** Stat tiles reflect the whole event, independent of the filters applied to the table below. */
	const totalsQuery = useAttendees(eventId ?? '', { page: 1, pageSize: 1 }, { enabled: hasEventId });
	const capacityQuery = useEventCapacity(eventId ?? '', { enabled: hasEventId });
	const dispatchQuery = useDispatches(eventId ?? '', { view: 'log' }, { enabled: hasEventId });

	const attendees: SliceAttendee[] = attendeesQuery.data?.attendees ?? [];
	const total = attendeesQuery.data?.total ?? 0;
	const pageSize = attendeesQuery.data?.pageSize ?? DEFAULT_PAGE_SIZE;
	const registeredTotal = totalsQuery.data?.total ?? 0;
	const checkedInCount = capacityQuery.data?.checkedInCount ?? 0;
	const dispatchOptions = dispatchQuery.data?.dispatches ?? [];

	async function refreshAfterMutation() {
		await invalidateAfterAttendeeMutation(queryClient, eventId ?? '');
	}

	const sortedAttendees = useMemo(
		() => [...attendees].sort((left, right) => left.lastName.localeCompare(right.lastName)),
		[attendees],
	);

	const visibleAttendees = useMemo(
		() =>
			attendeeTypeFilter === 'all'
				? sortedAttendees
				: sortedAttendees.filter((person) => person.attendeeType === attendeeTypeFilter),
		[sortedAttendees, attendeeTypeFilter],
	);

	const dispatchSelectOptions = useMemo(
		() => [
			{ value: '', label: 'No dispatch filter' },
			...dispatchOptions.map((dispatch) => ({
				value: dispatch.dispatchId,
				label: dispatch.dispatchName,
			})),
		],
		[dispatchOptions],
	);

	const totalPages = Math.max(1, Math.ceil(total / pageSize));
	const showPagination = total > pageSize;

	async function handleRemove(person: SliceAttendee) {
		if (!eventId) {
			return;
		}
		const name = attendeeName(person) || 'This attendee';
		const confirmed = await confirm({
			title: 'Remove attendee?',
			message: `${name} will be removed from the registered attendee list for this event. This cannot be undone.`,
			confirmLabel: 'Remove',
			cancelLabel: 'Cancel',
		});
		if (!confirmed) {
			return;
		}
		setRemovingId(person.contactId);
		try {
			await data.removeAttendee(eventId, person.contactId);
			showToast('Attendee removed', 'success');
			await refreshAfterMutation();
		} catch (err: unknown) {
			showToast(attendeeMutationErrorMessage(err, 'Failed to remove attendee'), 'error');
		} finally {
			setRemovingId(null);
		}
	}

	async function handleUndoCheckIn(person: SliceAttendee) {
		if (!eventId) {
			return;
		}
		const name = attendeeName(person) || 'This attendee';
		const confirmed = await confirm({
			title: 'Undo check-in?',
			message: `${name} will return to Registered for this event. Capacity will update.`,
			confirmLabel: 'Undo check-in',
			cancelLabel: 'Cancel',
		});
		if (!confirmed) {
			return;
		}
		await runUndoCheckIn(person);
	}

	function toggleContactSelected(contactId: string, checked: boolean) {
		setSelectedContactIds((current) => {
			const next = new Set(current);
			if (checked) {
				next.add(contactId);
			} else {
				next.delete(contactId);
			}
			return next;
		});
	}

	function toggleSelectAllVisible(checked: boolean) {
		setSelectedContactIds(checked ? new Set(visibleAttendees.map((person) => person.contactId)) : new Set());
	}

	async function handleGenerateLeadsBatch() {
		if (!eventId || selectedContactIds.size === 0 || generatingLeads) {
			return;
		}
		const contactIds = Array.from(selectedContactIds);
		const threshold = CONFIG.LEAD_BATCH_CONFIRM_THRESHOLD;
		const atOrAboveThreshold = contactIds.length >= threshold;
		if (atOrAboveThreshold) {
			const confirmed = await confirm({
				title: 'Generate Leads for a large selection?',
				message: `You are about to generate HubSpot Leads for ${contactIds.length} attendees. Proceed?`,
				confirmLabel: 'Generate Leads',
				cancelLabel: 'Cancel',
			});
			if (!confirmed) {
				return;
			}
		}
		setGeneratingLeads(true);
		try {
			const response = await data.generateAttendeeLeadsBatch(eventId, {
				contactIds,
				includeFullHistory: includeFullHistoryBatch,
				...(atOrAboveThreshold ? { batchConfirmed: true as const } : {}),
			});
			const { message, description } = summarizeLeadBatchResults(response.results);
			showToast(message, response.results.some((r) => r.outcome === 'failed') ? 'error' : 'success', 3500, description);
			setSelectedContactIds(new Set());
		} catch (err: unknown) {
			showToast(err instanceof Error ? err.message : 'Failed to generate Leads', 'error');
		} finally {
			setGeneratingLeads(false);
		}
	}

	if (session && session.role !== 'admin') {
		return <Navigate to="/events" replace />;
	}

	if (!eventId) {
		return (
			<EmptyState
				viewId="view-attendees"
				message="Open an event from Programs & Events or the working-event picker to view registered attendees."
				action={{ label: 'Go to Programs & Events', to: '/events' }}
			/>
		);
	}

	const attendeesStatus = describeQueryStatus(attendeesQuery, 'Failed to load attendees');

	if (attendeesStatus.kind === 'loading') {
		return (
			<section id="view-attendees" className={styles.view}>
				<TopBar title="Registered Attendees" meta="Full attendee roster for the working event" workingEvent={eventName} />
				<LoadingState message="Loading attendees…" />
			</section>
		);
	}

	if (attendeesStatus.kind === 'error') {
		return (
			<ViewErrorState
				viewId="view-attendees"
				title="Registered Attendees"
				meta="Full attendee roster for the working event"
				workingEvent={eventName}
				message={attendeesStatus.message}
				onRetry={() => void attendeesQuery.refetch()}
			/>
		);
	}

	const refreshing = attendeesQuery.isFetching;
	const showRefetchFailureBanner = attendeesStatus.refetchFailed || totalsQuery.isError || capacityQuery.isError;

	return (
		<section id="view-attendees" className={styles.view}>
			<TopBar title="Registered Attendees" meta="Full attendee roster for the working event" workingEvent={eventName} />

			{showRefetchFailureBanner ? (
				<RefetchFailureBanner
					message="Couldn't refresh attendee data — showing the last loaded values."
					onRetry={() => void refreshAfterMutation()}
				/>
			) : null}

			<div className={styles.statsGrid}>
				<div className={styles.statTile}>
					<p className={styles.statValue}>{registeredTotal.toLocaleString()}</p>
					<p className={styles.statLabel}>Registered</p>
				</div>
				<div className={styles.statTile}>
					<p className={styles.statValue}>{checkedInCount.toLocaleString()}</p>
					<p className={styles.statLabel}>Checked in</p>
				</div>
				<div className={styles.statTile}>
					<p className={styles.statValue}>{Math.max(0, registeredTotal - checkedInCount).toLocaleString()}</p>
					<p className={styles.statLabel}>Not checked in</p>
				</div>
			</div>

			<div className={`card ${styles.card}`}>
				<label className={styles.searchField}>
					<span className="material-symbols-outlined" aria-hidden="true">
						search
					</span>
					<input
						type="search"
						placeholder="Search name, email or company"
						value={searchQuery}
						onChange={(changeEvent) => {
							setSearchQuery(changeEvent.target.value);
							setPage(1);
						}}
						aria-label="Search attendees"
					/>
				</label>

				<div className={styles.filterGroup}>
					<p className={styles.filterLabel}>Attendee type</p>
					<div className={styles.filterRow} role="group" aria-label="Attendee type filter">
						{(['all', 'customer', 'partner'] as AttendeeTypeFilter[]).map((filter) => (
							<button
								key={filter}
								type="button"
								className={attendeeTypeFilter === filter ? styles.pillActive : styles.pill}
								onClick={() => setAttendeeTypeFilter(filter)}
							>
								{filter === 'all' ? 'All' : filter === 'customer' ? 'Customer' : 'Partner'}
							</button>
						))}
					</div>
				</div>

				<div className={styles.filterGroup}>
					<p className={styles.filterLabel}>Status</p>
					<div className={styles.filterRow} role="group" aria-label="Check-in status filter">
						{(['all', 'checked-in', 'not-checked-in'] as CheckedInFilter[]).map((filter) => (
							<button
								key={filter}
								type="button"
								className={checkedInFilter === filter ? styles.pillActive : styles.pill}
								onClick={() => {
									setCheckedInFilter(filter);
									setPage(1);
								}}
							>
								{filter === 'all' ? 'All' : filter === 'checked-in' ? 'Checked in' : 'Not checked in'}
							</button>
						))}
					</div>
				</div>

				<div className={styles.dispatchFilterRow}>
					<SelectPicker
						id="attendees-dispatch-select"
						className={styles.dispatchSelect}
						label="Email dispatch"
						value={selectedDispatchId}
						placeholder="No dispatch filter"
						options={dispatchSelectOptions}
						onChange={(value) => {
							setSelectedDispatchId(value);
							setDispatchOutcomeFilter('received');
							setPage(1);
						}}
					/>
					{selectedDispatchId ? (
						<div className={styles.dispatchOutcomeFilters} role="group" aria-label="Dispatch outcome filter">
							{(
								[
									['received', 'Received'],
									['not_received', 'Did not receive'],
								] as const
							).map(([value, label]) => (
								<button
									key={value}
									type="button"
									className={dispatchOutcomeFilter === value ? styles.pillActive : styles.pill}
									onClick={() => {
										setDispatchOutcomeFilter(value);
										setPage(1);
									}}
								>
									{label}
								</button>
							))}
						</div>
					) : null}
				</div>

				{selectedContactIds.size > 0 ? (
					<div className={`toolbar ${styles.bulkActionBar}`} role="toolbar" aria-label="Bulk attendee actions">
						<span className={styles.bulkSelectionCount}>{selectedContactIds.size} selected</span>
						<label className={styles.fullHistoryOption}>
							<input
								type="checkbox"
								checked={includeFullHistoryBatch}
								onChange={(changeEvent) => setIncludeFullHistoryBatch(changeEvent.target.checked)}
							/>
							Include full cross-event history
						</label>
						<div className="filter-row">
							<button
								type="button"
								className="btn btn-outline btn-sm"
								onClick={() => setSelectedContactIds(new Set())}
								disabled={generatingLeads}
							>
								Clear selection
							</button>
							<button
								type="button"
								className="btn btn-primary btn-sm"
								onClick={() => void handleGenerateLeadsBatch()}
								disabled={generatingLeads}
								aria-busy={generatingLeads}
							>
								{generatingLeads ? 'Generating…' : 'Generate Leads'}
							</button>
						</div>
					</div>
				) : null}

				<div className={styles.tableWrap}>
					<div
						className={`table-scroll ${styles.tableScroll}${refreshing ? ` ${styles.tableScrollLoading}` : ''}`}
						aria-busy={refreshing}
					>
						<table>
							<thead>
								<tr>
									<th scope="col" className={styles.colCheckbox}>
										<input
											type="checkbox"
											aria-label="Select all visible attendees"
											checked={visibleAttendees.length > 0 && selectedContactIds.size === visibleAttendees.length}
											onChange={(changeEvent) => toggleSelectAllVisible(changeEvent.target.checked)}
											disabled={visibleAttendees.length === 0}
										/>
									</th>
									<th scope="col">Name</th>
									<th scope="col" className={styles.colCompany}>Company</th>
									<th scope="col" className={styles.colAccountManager}>Account manager</th>
									<th scope="col" className={styles.colType}>Type</th>
									<th scope="col">Status</th>
									<th scope="col" className={styles.colAction}>
										<span className="sr-only">Actions</span>
									</th>
								</tr>
							</thead>
							<tbody>
								{visibleAttendees.length === 0 ? (
									<tr>
										<td colSpan={7}>No registered attendees match this view.</td>
									</tr>
								) : (
									visibleAttendees.map((person) => (
										<tr
											key={person.contactId}
											className={styles.attendeeRow}
											onClick={() => setDetailContactId(person.contactId)}
										>
											<td className={styles.colCheckbox} onClick={(clickEvent) => clickEvent.stopPropagation()}>
												<input
													type="checkbox"
													aria-label={`Select ${attendeeName(person)}`}
													checked={selectedContactIds.has(person.contactId)}
													onChange={(changeEvent) => toggleContactSelected(person.contactId, changeEvent.target.checked)}
												/>
											</td>
											<td>
												<button
													type="button"
													className={styles.nameButton}
													onClick={(clickEvent) => {
														clickEvent.stopPropagation();
														setDetailContactId(person.contactId);
													}}
												>
													<span className={styles.avatar} aria-hidden="true">
														{attendeeInitials(person)}
													</span>
													<span className={styles.nameInfo}>
														<span>{attendeeName(person)}</span>
														<span className={styles.nameEmail}>{person.email}</span>
													</span>
												</button>
											</td>
											<td className={styles.colCompany}>{person.company}</td>
											<td className={styles.colAccountManager}>{person.accountManager}</td>
											<td className={styles.colType}>
												<span className={`badge ${styles.typeBadge}`}>
													{person.attendeeType === 'partner' ? 'Partner' : 'Customer'}
												</span>
											</td>
											<td>
												<span className={`badge ${person.checkedIn ? 'badge--checked-in' : 'badge--registered'}`}>
													{person.checkedIn ? 'Checked in' : 'Registered'}
												</span>
											</td>
											<td className={styles.colAction} onClick={(clickEvent) => clickEvent.stopPropagation()}>
												{person.checkedIn ? (
													<button
														type="button"
														className={`btn btn-outline btn-sm ${styles.removeButton}`}
														onClick={() => void handleUndoCheckIn(person)}
														disabled={undoingId === person.contactId}
													>
														{undoingId === person.contactId ? 'Undoing…' : 'Undo check-in'}
													</button>
												) : (
													<button
														type="button"
														className={`btn btn-outline btn-sm ${styles.removeButton}`}
														onClick={() => void handleRemove(person)}
														disabled={removingId === person.contactId}
													>
														{removingId === person.contactId ? 'Removing…' : 'Remove'}
													</button>
												)}
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>
					{refreshing ? (
						<div className={styles.tableLoadingOverlay}>
							<LoadingState message="Updating…" variant="inline" />
						</div>
					) : null}
				</div>

				{showPagination ? (
					<nav className={`toolbar ${styles.pagination}`} aria-label="Attendee list pages">
						<span className={styles.pageSummary}>
							{refreshing ? 'Loading page…' : `Page ${page} of ${totalPages} · ${total} attendees`}
						</span>
						<div className="filter-row">
							<button
								type="button"
								className="btn btn-outline btn-sm"
								disabled={page <= 1 || refreshing}
								onClick={() => setPage((current) => Math.max(1, current - 1))}
							>
								‹ Prev
							</button>
							<button
								type="button"
								className="btn btn-outline btn-sm"
								disabled={page >= totalPages || refreshing}
								onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
							>
								Next ›
							</button>
						</div>
					</nav>
				) : null}
			</div>

			<AttendeeDetailModal
				open={detailContactId !== null}
				eventId={eventId}
				contactId={detailContactId}
				onClose={() => setDetailContactId(null)}
				variant="registered"
			/>
		</section>
	);
}
