import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { CheckInQrPanel } from '../components/CheckInQrPanel';
import { EmptyState } from '../components/EmptyState';
import { TopBar } from '../components/TopBar';
import { useToast } from '../components/Toast';
import { useDataService } from '../hooks/useDataService';
import { useSession } from '../state/appState';
import { useCatalogSelection } from '../state/catalogContext';
import type { CheckInContactSummary, SliceAttendee } from '../types';
import styles from './CheckInView.module.css';

type SelectedAttendee = SliceAttendee | CheckInContactSummary;

function attendeeName(person: { firstName: string; lastName: string }): string {
	return `${person.firstName} ${person.lastName}`.trim();
}

export function CheckInView() {
	const { session } = useSession();
	const { showToast } = useToast();
	const data = useDataService();
	const { programId, evId, programName, eventName } = useCatalogSelection();
	const [attendees, setAttendees] = useState<SliceAttendee[]>([]);
	const [searchQuery, setSearchQuery] = useState('');
	const [debouncedSearch, setDebouncedSearch] = useState('');
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [selected, setSelected] = useState<SelectedAttendee | null>(null);
	const [confirming, setConfirming] = useState(false);
	const [scanning, setScanning] = useState(false);
	const awaitingInitialLoadRef = useRef(true);

	useEffect(() => {
		setSearchQuery('');
		setDebouncedSearch('');
		awaitingInitialLoadRef.current = true;
	}, [programId, evId]);

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

		void data
			.fetchSliceAttendees(programId, evId, { q: debouncedSearch || undefined })
			.then((result) => {
				if (!cancelled) {
					setAttendees(result.attendees);
				}
			})
			.catch((err: unknown) => {
				if (!cancelled) {
					setError(err instanceof Error ? err.message : 'Failed to load check-in');
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
	}, [data, programId, evId, debouncedSearch]);

	const sortedAttendees = useMemo(
		() => [...attendees].sort((left, right) => left.lastName.localeCompare(right.lastName)),
		[attendees],
	);

	const selectAttendee = useCallback((person: SliceAttendee) => {
		setSelected(person);
	}, []);

	const handleQrDecode = useCallback(
		async (jwt: string) => {
			if (!programId || !evId) {
				return;
			}

			setScanning(true);
			try {
				const result = await data.checkInScan(programId, evId, jwt);
				setSelected(result.contact);
			} catch (err: unknown) {
				showToast(err instanceof Error ? err.message : 'QR scan failed', 'error');
			} finally {
				setScanning(false);
			}
		},
		[data, evId, programId, showToast],
	);

	async function handleConfirmCheckIn() {
		if (!programId || !evId || !selected) {
			return;
		}

		setConfirming(true);
		try {
			const result = await data.confirmCheckIn(programId, evId, selected.contactId);
			const name = attendeeName(selected);

			if (result.alreadyCheckedIn) {
				showToast(`${name} is already checked in.`, 'success');
			} else {
				showToast(`${name} checked in successfully.`, 'success');
			}

			setAttendees((current) =>
				current.map((person) =>
					person.contactId === result.contactId ? { ...person, checkedIn: true } : person,
				),
			);
			setSelected((current) => (current ? { ...current, checkedIn: true } : null));
		} catch (err: unknown) {
			showToast(err instanceof Error ? err.message : 'Check-in failed', 'error');
		} finally {
			setConfirming(false);
		}
	}

	if (session?.role !== 'admin') {
		return <Navigate to="/events" replace />;
	}

	if (!programId || !evId) {
		return (
			<EmptyState
				viewId="view-check-in"
				message="Select a Program and Event using the catalog pickers to open check-in."
				action={{ label: 'Go to All Events', to: '/events' }}
			/>
		);
	}

	if (loading) {
		return <div className="loading">Loading check-in…</div>;
	}

	if (error) {
		return <div className="empty-state">{error}</div>;
	}

	const title =
		programName && eventName ? `${programName} — ${eventName} — Check-in` : 'Event check-in';

	return (
		<section id="view-check-in" className={styles.view}>
			<TopBar title={title} meta={`${attendees.length} registered · arrival desk`} />

			<div className="grid-2">
				<div className="card">
					<div className="card__header">
						<h3>Find attendee</h3>
						{refreshing ? <span className={styles.refreshHint}>Searching…</span> : null}
					</div>
					<input
						type="search"
						className="search-input"
						placeholder="Search name or company…"
						value={searchQuery}
						onChange={(changeEvent) => setSearchQuery(changeEvent.target.value)}
						aria-label="Search attendees for check-in"
					/>
					<div className="table-scroll table-scroll--short">
						<table>
							<thead>
								<tr>
									<th>Name</th>
									<th>Company</th>
									<th>Track</th>
									<th aria-label="Actions" />
								</tr>
							</thead>
							<tbody>
								{sortedAttendees.length === 0 ? (
									<tr>
										<td colSpan={4}>No matching registrants.</td>
									</tr>
								) : (
									sortedAttendees.map((person) => {
										const isSelected = selected?.contactId === person.contactId;
										return (
											<tr
												key={person.contactId}
												className={isSelected ? styles.selectedRow : undefined}
												onClick={() => selectAttendee(person)}
											>
												<td>{attendeeName(person)}</td>
												<td>{person.company}</td>
												<td>{person.attendeeType}</td>
												<td>
													<button
														type="button"
														className="btn btn-outline btn-sm"
														onClick={(clickEvent) => {
															clickEvent.stopPropagation();
															selectAttendee(person);
														}}
													>
														Check in
													</button>
												</td>
											</tr>
										);
									})
								)}
							</tbody>
						</table>
					</div>
				</div>

				<div className="card card--accent">
					<div className="card__header">
						<h3>QR scan</h3>
					</div>
					<CheckInQrPanel onDecode={handleQrDecode} disabled={scanning} />
					{selected ? (
						<div className={styles.summaryCard} aria-live="polite">
							<h4>{attendeeName(selected)}</h4>
							<dl className={styles.summaryList}>
								<div>
									<dt>Company</dt>
									<dd>{selected.company}</dd>
								</div>
								<div>
									<dt>Email</dt>
									<dd>{selected.email}</dd>
								</div>
								<div>
									<dt>Account manager</dt>
									<dd>{selected.accountManager}</dd>
								</div>
								<div>
									<dt>Track</dt>
									<dd>{selected.attendeeType ?? '—'}</dd>
								</div>
								<div>
									<dt>Checked in</dt>
									<dd>{selected.checkedIn ? 'Yes' : 'No'}</dd>
								</div>
							</dl>
							<button
								type="button"
								className="btn btn-primary"
								disabled={confirming}
								onClick={() => void handleConfirmCheckIn()}
							>
								{confirming ? 'Confirming…' : 'Confirm check-in'}
							</button>
						</div>
					) : (
						<p className="shell-note">Select a row or scan a QR code to review attendee details.</p>
					)}
				</div>
			</div>
		</section>
	);
}
