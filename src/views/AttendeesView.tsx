import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import { TopBar } from '../components/TopBar';
import { useDataService } from '../hooks/useDataService';
import { useSession } from '../state/appState';
import { useCatalogSelection } from '../state/catalogContext';
import type { SliceAttendee } from '../types';
import styles from './AttendeesView.module.css';

type CheckedInFilter = 'all' | 'checked-in' | 'not-checked-in';

export function AttendeesView() {
	const { session } = useSession();
	const data = useDataService();
	const { programId, evId, programName, eventName } = useCatalogSelection();
	const [attendees, setAttendees] = useState<SliceAttendee[]>([]);
	const [searchQuery, setSearchQuery] = useState('');
	const [checkedInFilter, setCheckedInFilter] = useState<CheckedInFilter>('all');
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!programId || !evId) {
			setLoading(false);
			return;
		}

		let cancelled = false;
		setLoading(true);
		setError(null);

		const checkedIn =
			checkedInFilter === 'checked-in' ? true : checkedInFilter === 'not-checked-in' ? false : undefined;

		void data
			.fetchSliceAttendees(programId, evId, { q: searchQuery || undefined, checkedIn })
			.then((result) => {
				if (!cancelled) {
					setAttendees(result.attendees);
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
				}
			});

		return () => {
			cancelled = true;
		};
	}, [data, programId, evId, searchQuery, checkedInFilter]);

	const sortedAttendees = useMemo(
		() => [...attendees].sort((left, right) => left.lastName.localeCompare(right.lastName)),
		[attendees],
	);

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

	if (loading) {
		return <div className="loading">Loading attendees…</div>;
	}

	if (error) {
		return <div className="empty-state">{error}</div>;
	}

	const title =
		programName && eventName ? `${programName} — ${eventName} — Attendees` : 'Registered attendees';

	return (
		<section id="view-attendees" className={styles.view}>
			<TopBar title={title} meta={`${attendees.length} registered · HubSpot live`} />

			<div className="card">
				<div className="toolbar">
					<div className="form-row">
						{(['all', 'checked-in', 'not-checked-in'] as CheckedInFilter[]).map((filter) => (
							<button
								key={filter}
								type="button"
								className={`btn btn-outline${checkedInFilter === filter ? ' active' : ''}`}
								onClick={() => setCheckedInFilter(filter)}
							>
								{filter === 'all' ? 'All' : filter === 'checked-in' ? 'Checked in' : 'Not checked in'}
							</button>
						))}
					</div>
				</div>

				<input
					type="search"
					className="search-input"
					placeholder="Search name or company…"
					value={searchQuery}
					onChange={(changeEvent) => setSearchQuery(changeEvent.target.value)}
					aria-label="Search attendees"
				/>

				<div className="table-scroll">
					<table>
						<thead>
							<tr>
								<th>Name</th>
								<th>Company</th>
								<th>Email</th>
								<th>Account manager</th>
								<th>Track</th>
								<th>Checked in</th>
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
										<td>{person.company}</td>
										<td>{person.email}</td>
										<td>{person.accountManager}</td>
										<td>{person.attendeeType}</td>
										<td>{person.checkedIn ? 'Yes' : 'No'}</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</div>
		</section>
	);
}
