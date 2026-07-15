import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { CatalogPickerSelect } from '../components/CatalogPickerSelect';
import { useConfirm } from '../components/ConfirmModal';
import { EmptyState } from '../components/EmptyState';
import { LoadingState } from '../components/LoadingState';
import { TopBar } from '../components/TopBar';
import { useToast } from '../components/Toast';
import { ViewErrorState } from '../components/ViewErrorState';
import { useDataService } from '../hooks/useDataService';
import { useActiveRoute } from '../router/navigation';
import { useSession } from '../state/appState';
import type { EmailDispatchListItem, SliceAttendee } from '../types';
import styles from './AttendeesView.module.css';

type CheckedInFilter = 'all' | 'checked-in' | 'not-checked-in';
type AttendeeTypeFilter = 'all' | 'customer' | 'partner';
type DispatchOutcomeFilter = 'received' | 'not_received';

function attendeeInitials(firstName: string, lastName: string): string {
	return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();
}

const DEFAULT_PAGE_SIZE = 50;

export function AttendeesView() {
	const { session } = useSession();
	const data = useDataService();
	const { showToast } = useToast();
	const { confirm } = useConfirm();
	const { eventId } = useActiveRoute();
	const [attendees, setAttendees] = useState<SliceAttendee[]>([]);
	const [searchQuery, setSearchQuery] = useState('');
	const [debouncedSearch, setDebouncedSearch] = useState('');
	const [checkedInFilter, setCheckedInFilter] = useState<CheckedInFilter>('all');
	const [attendeeTypeFilter, setAttendeeTypeFilter] = useState<AttendeeTypeFilter>('all');
	const [dispatchOptions, setDispatchOptions] = useState<EmailDispatchListItem[]>([]);
	const [selectedDispatchId, setSelectedDispatchId] = useState('');
	const [dispatchOutcomeFilter, setDispatchOutcomeFilter] = useState<DispatchOutcomeFilter>('received');
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
	const [total, setTotal] = useState(0);
	const [registeredTotal, setRegisteredTotal] = useState(0);
	const [checkedInCount, setCheckedInCount] = useState(0);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [reloadKey, setReloadKey] = useState(0);
	const [removingId, setRemovingId] = useState<string | null>(null);
	const [undoingId, setUndoingId] = useState<string | null>(null);
	const awaitingInitialLoadRef = useRef(true);

	useEffect(() => {
		setSearchQuery('');
		setDebouncedSearch('');
		setCheckedInFilter('all');
		setAttendeeTypeFilter('all');
		setSelectedDispatchId('');
		setDispatchOutcomeFilter('received');
		setPage(1);
		awaitingInitialLoadRef.current = true;
	}, [eventId]);

	useEffect(() => {
		if (!eventId) {
			setDispatchOptions([]);
			return;
		}

		let cancelled = false;
		void data
			.fetchEmailDispatches(eventId, { view: 'log' })
			.then((result) => {
				if (!cancelled) {
					setDispatchOptions(result.dispatches);
				}
			})
			.catch(() => {
				if (!cancelled) {
					setDispatchOptions([]);
				}
			});

		return () => {
			cancelled = true;
		};
	}, [data, eventId]);

	/** Stat tiles reflect the whole event, independent of the filters applied below. */
	useEffect(() => {
		if (!eventId) {
			setRegisteredTotal(0);
			setCheckedInCount(0);
			return;
		}

		let cancelled = false;
		void Promise.all([
			data.fetchEventAttendees(eventId, { page: 1, pageSize: 1 }),
			data.fetchEventCapacityStatus(eventId),
		])
			.then(([attendeesResult, capacityResult]) => {
				if (!cancelled) {
					setRegisteredTotal(attendeesResult.total);
					setCheckedInCount(capacityResult.checkedInCount);
				}
			})
			.catch(() => {
				if (!cancelled) {
					setRegisteredTotal(0);
					setCheckedInCount(0);
				}
			});

		return () => {
			cancelled = true;
		};
	}, [data, eventId, reloadKey]);

	useEffect(() => {
		const handle = window.setTimeout(() => {
			setDebouncedSearch(searchQuery);
		}, 300);

		return () => window.clearTimeout(handle);
	}, [searchQuery]);

	useEffect(() => {
		if (!eventId) {
			setLoading(false);
			return;
		}

		let cancelled = false;
		if (awaitingInitialLoadRef.current) {
			setLoading(true);
		} else {
			setRefreshing(true);
		}
		setError(null);

		const checkedIn =
			checkedInFilter === 'checked-in' ? true : checkedInFilter === 'not-checked-in' ? false : undefined;
		const dispatchFilter =
			selectedDispatchId && dispatchOutcomeFilter
				? { dispatchId: selectedDispatchId, dispatchFilter: dispatchOutcomeFilter }
				: {};

		void data
			.fetchEventAttendees(eventId, {
				q: debouncedSearch || undefined,
				checkedIn,
				page,
				pageSize: DEFAULT_PAGE_SIZE,
				...dispatchFilter,
			})
			.then((result) => {
				if (!cancelled) {
					setAttendees(result.attendees);
					setPage(result.page);
					setPageSize(result.pageSize);
					setTotal(result.total);
				}
			})
			.catch((err: unknown) => {
				if (!cancelled) {
					setError(err instanceof Error ? err.message : 'Failed to load attendees');
				}
			})
			.finally(() => {
				if (!cancelled) {
					setLoading(false);
					setRefreshing(false);
					awaitingInitialLoadRef.current = false;
				}
			});

		return () => {
			cancelled = true;
		};
	}, [data, eventId, debouncedSearch, checkedInFilter, selectedDispatchId, dispatchOutcomeFilter, page, reloadKey]);

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
		const name = `${person.firstName} ${person.lastName}`.trim() || 'This attendee';
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
			setReloadKey((current) => current + 1);
		} catch (err: unknown) {
			const message =
				err instanceof Error && err.message === 'attendee_checked_in'
					? 'This attendee is checked in — undo check-in before removing.'
					: err instanceof Error && err.message === 'contact_not_registered'
						? 'This attendee is no longer registered.'
						: 'Failed to remove attendee';
			showToast(message, 'error');
		} finally {
			setRemovingId(null);
		}
	}

	async function handleUndoCheckIn(person: SliceAttendee) {
		if (!eventId) {
			return;
		}
		const name = `${person.firstName} ${person.lastName}`.trim() || 'This attendee';
		const confirmed = await confirm({
			title: 'Undo check-in?',
			message: `${name} will return to Registered for this event. Capacity will update.`,
			confirmLabel: 'Undo check-in',
			cancelLabel: 'Cancel',
		});
		if (!confirmed) {
			return;
		}
		setUndoingId(person.contactId);
		try {
			await data.undoCheckIn(eventId, person.contactId);
			showToast('Check-in undone', 'success');
			setReloadKey((current) => current + 1);
		} catch (err: unknown) {
			const message =
				err instanceof Error && err.message === 'contact_not_registered'
					? 'This attendee is no longer registered.'
					: 'Failed to undo check-in';
			showToast(message, 'error');
		} finally {
			setUndoingId(null);
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

	if (loading) {
		return (
			<section id="view-attendees" className={styles.view}>
				<TopBar title="Registered Attendees" meta="Full attendee roster for the working event" />
				<div className={`card ${styles.card}`}>
					<LoadingState
						message="Loading attendees…"
						variant="panel"
						skeleton="table"
						skeletonRows={8}
					/>
				</div>
			</section>
		);
	}

	if (error) {
		return (
			<ViewErrorState
				viewId="view-attendees"
				title="Registered Attendees"
				meta="Full attendee roster for the working event"
				message={error}
				onRetry={() => {
					setError(null);
					awaitingInitialLoadRef.current = true;
					setReloadKey((current) => current + 1);
				}}
			/>
		);
	}

	return (
		<section id="view-attendees" className={styles.view}>
			<TopBar title="Registered Attendees" meta="Full attendee roster for the working event" />

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
					<CatalogPickerSelect
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

				<div className={styles.tableWrap}>
					<div
						className={`table-scroll ${styles.tableScroll}${refreshing ? ` ${styles.tableScrollLoading}` : ''}`}
						aria-busy={refreshing}
					>
						<table>
							<thead>
								<tr>
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
										<td colSpan={6}>No registered attendees match this view.</td>
									</tr>
								) : (
									visibleAttendees.map((person) => (
										<tr key={person.contactId}>
											<td>
												<div className={styles.nameCell}>
													<span className={styles.avatar} aria-hidden="true">
														{attendeeInitials(person.firstName, person.lastName)}
													</span>
													<span className={styles.nameInfo}>
														<span>{`${person.firstName} ${person.lastName}`.trim()}</span>
														<span className={styles.nameEmail}>{person.email}</span>
													</span>
												</div>
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
											<td className={styles.colAction}>
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
		</section>
	);
}
