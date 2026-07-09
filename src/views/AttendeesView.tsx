import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { CatalogPickerSelect } from '../components/CatalogPickerSelect';
import { EmptyState } from '../components/EmptyState';
import { LoadingState } from '../components/LoadingState';
import { TopBar } from '../components/TopBar';
import { ViewErrorState } from '../components/ViewErrorState';
import { useDataService } from '../hooks/useDataService';
import { useSession } from '../state/appState';
import { useCatalogSelection } from '../state/catalogContext';
import type { EmailDispatchListItem, SliceAttendee } from '../types';
import styles from './AttendeesView.module.css';

type CheckedInFilter = 'all' | 'checked-in' | 'not-checked-in';
type DispatchOutcomeFilter = 'received' | 'not_received';

const DEFAULT_PAGE_SIZE = 50;

export function AttendeesView() {
	const { session } = useSession();
	const data = useDataService();
	const { programId, evId, programName, eventName } = useCatalogSelection();
	const [attendees, setAttendees] = useState<SliceAttendee[]>([]);
	const [searchQuery, setSearchQuery] = useState('');
	const [debouncedSearch, setDebouncedSearch] = useState('');
	const [checkedInFilter, setCheckedInFilter] = useState<CheckedInFilter>('all');
	const [dispatchOptions, setDispatchOptions] = useState<EmailDispatchListItem[]>([]);
	const [selectedDispatchId, setSelectedDispatchId] = useState('');
	const [dispatchOutcomeFilter, setDispatchOutcomeFilter] = useState<DispatchOutcomeFilter>('received');
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
	const [total, setTotal] = useState(0);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [reloadKey, setReloadKey] = useState(0);
	const awaitingInitialLoadRef = useRef(true);

	useEffect(() => {
		setSearchQuery('');
		setDebouncedSearch('');
		setCheckedInFilter('all');
		setSelectedDispatchId('');
		setDispatchOutcomeFilter('received');
		setPage(1);
		awaitingInitialLoadRef.current = true;
	}, [programId, evId]);

	useEffect(() => {
		if (!programId || !evId) {
			setDispatchOptions([]);
			return;
		}

		let cancelled = false;
		void data
			.fetchEmailDispatches(programId, evId, { view: 'log' })
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
	}, [data, programId, evId]);

	useEffect(() => {
		const handle = window.setTimeout(() => {
			setDebouncedSearch(searchQuery);
		}, 300);

		return () => window.clearTimeout(handle);
	}, [searchQuery]);

	useEffect(() => {
		if (!programId || !evId) {
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
			.fetchSliceAttendees(programId, evId, {
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
	}, [data, programId, evId, debouncedSearch, checkedInFilter, selectedDispatchId, dispatchOutcomeFilter, page, reloadKey]);

	const sortedAttendees = useMemo(
		() => [...attendees].sort((left, right) => left.lastName.localeCompare(right.lastName)),
		[attendees],
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
	const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
	const rangeEnd = Math.min(page * pageSize, total);
	const showPagination = total > pageSize;

	if (session?.role !== 'admin') {
		return <Navigate to="/events" replace />;
	}

	if (!programId || !evId) {
		return (
			<EmptyState
				viewId="view-attendees"
				message="Select a Program and Event using the catalog pickers to view registered attendees."
				action={{ label: 'Go to All Events', to: '/events' }}
			/>
		);
	}

	const title =
		programName && eventName ? `${programName} — ${eventName} — Attendees` : 'Registered attendees';

	if (loading) {
		return (
			<section id="view-attendees" className={styles.view}>
				<TopBar title={title} meta="Loading registered attendees…" />
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
				title={title}
				message={error}
				onRetry={() => {
					setError(null);
					awaitingInitialLoadRef.current = true;
					setReloadKey((current) => current + 1);
				}}
			/>
		);
	}

	const meta =
		total > 0
			? `${total} registered · showing ${rangeStart}–${rangeEnd} · HubSpot live`
			: '0 registered · HubSpot live';

	return (
		<section id="view-attendees" className={styles.view}>
			<TopBar title={title} meta={meta} />

			<div className={`card ${styles.card}`}>
				<div className="toolbar">
					<div className="form-row">
						{(['all', 'checked-in', 'not-checked-in'] as CheckedInFilter[]).map((filter) => (
							<button
								key={filter}
								type="button"
								className={`btn btn-outline${checkedInFilter === filter ? ' active' : ''}`}
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
									className={`btn btn-outline btn-sm${dispatchOutcomeFilter === value ? ' active' : ''}`}
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

				<input
					type="search"
					className="search-input"
					placeholder="Search name or company…"
					value={searchQuery}
					onChange={(changeEvent) => {
						setSearchQuery(changeEvent.target.value);
						setPage(1);
					}}
					aria-label="Search attendees"
				/>

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
									<th scope="col" className={styles.colEmail}>Email</th>
									<th scope="col" className={styles.colAccountManager}>Account manager</th>
									<th scope="col" className={styles.colTrack}>Track</th>
									<th scope="col">Checked in</th>
								</tr>
							</thead>
							<tbody>
								{sortedAttendees.length === 0 ? (
									<tr>
										<td colSpan={6}>No registered attendees match this view.</td>
									</tr>
								) : (
									sortedAttendees.map((person) => (
										<tr key={person.contactId}>
											<td>{`${person.firstName} ${person.lastName}`.trim()}</td>
											<td className={styles.colCompany}>{person.company}</td>
											<td className={styles.colEmail}>{person.email}</td>
											<td className={styles.colAccountManager}>{person.accountManager}</td>
											<td className={styles.colTrack}>{person.attendeeType}</td>
											<td>{person.checkedIn ? 'Yes' : 'No'}</td>
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
							{refreshing ? 'Loading page…' : `Page ${page} of ${totalPages}`}
						</span>
						<div className="filter-row">
							<button
								type="button"
								className="btn btn-outline btn-sm"
								disabled={page <= 1 || refreshing}
								onClick={() => setPage((current) => Math.max(1, current - 1))}
							>
								Previous
							</button>
							<button
								type="button"
								className="btn btn-outline btn-sm"
								disabled={page >= totalPages || refreshing}
								onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
							>
								Next
							</button>
						</div>
					</nav>
				) : null}
			</div>
		</section>
	);
}
