import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { CheckInQrPanel } from '../components/CheckInQrPanel';
import { CapacityBar } from '../components/CapacityBar';
import { EmptyState } from '../components/EmptyState';
import { LoadingState } from '../components/LoadingState';
import { TopBar } from '../components/TopBar';
import { useToast } from '../components/Toast';
import { useDataService } from '../hooks/useDataService';
import { useSession } from '../state/appState';
import { useCatalogSelection } from '../state/catalogContext';
import type { AdjustCapacityDirection, CapacityStatus, CheckInContactSummary, SliceAttendee } from '../types';
import { isAllowedHubSpotFormUrl } from '../utils/hubspotFormUrl';
import styles from './CheckInView.module.css';

type SelectedAttendee = SliceAttendee | CheckInContactSummary;
type CheckInMode = 'check-in' | 'walk-in';

/** Server-side search runs across all registrants; require typing before fetch. */
const CHECK_IN_MIN_SEARCH_LENGTH = 2;
/** Backend caps pageSize at 200 — enough for typical name/company matches at the desk. */
const CHECK_IN_SEARCH_PAGE_SIZE = 200;

function attendeeName(person: { firstName: string; lastName: string }): string {
	return `${person.firstName} ${person.lastName}`.trim();
}

function walkInUrlRenderError(url: string): string | null {
	const trimmed = url.trim();
	if (!trimmed) {
		return null;
	}
	if (isAllowedHubSpotFormUrl(trimmed)) {
		return null;
	}

	try {
		const parsed = new URL(trimmed);
		if (parsed.protocol !== 'https:') {
			return 'Walk-in form URL must use HTTPS';
		}
	} catch {
		return 'Walk-in form URL must use HTTPS';
	}

	return 'Walk-in form URL must be a HubSpot form URL';
}

export function CheckInView() {
	const { session } = useSession();
	const { showToast } = useToast();
	const data = useDataService();
	const { programId, evId, programName, eventName, walkInFormUrl } = useCatalogSelection();
	const [checkInMode, setCheckInMode] = useState<CheckInMode>('check-in');
	const [attendees, setAttendees] = useState<SliceAttendee[]>([]);
	const [searchQuery, setSearchQuery] = useState('');
	const [debouncedSearch, setDebouncedSearch] = useState('');
	const [matchTotal, setMatchTotal] = useState(0);
	const [refreshing, setRefreshing] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [selected, setSelected] = useState<SelectedAttendee | null>(null);
	const [confirming, setConfirming] = useState(false);
	const [scanning, setScanning] = useState(false);
	const [capacityStatus, setCapacityStatus] = useState<CapacityStatus | null>(null);
	const [capacityLoading, setCapacityLoading] = useState(false);
	const [capacityError, setCapacityError] = useState<string | null>(null);
	const [capacityAdjusting, setCapacityAdjusting] = useState(false);
	const [searchReloadKey, setSearchReloadKey] = useState(0);

	const loadCapacityStatus = useCallback(async () => {
		if (!programId || !evId) {
			setCapacityStatus(null);
			setCapacityError(null);
			return;
		}

		setCapacityLoading(true);
		setCapacityError(null);
		try {
			const status = await data.fetchCapacityStatus(programId, evId);
			setCapacityStatus(status);
		} catch (err: unknown) {
			setCapacityStatus(null);
			setCapacityError(err instanceof Error ? err.message : 'Failed to load capacity');
		} finally {
			setCapacityLoading(false);
		}
	}, [data, evId, programId]);

	useEffect(() => {
		setSearchQuery('');
		setDebouncedSearch('');
		setCheckInMode('check-in');
		setCapacityStatus(null);
		setCapacityError(null);
	}, [programId, evId]);

	useEffect(() => {
		void loadCapacityStatus();
	}, [loadCapacityStatus]);

	useEffect(() => {
		const handle = window.setTimeout(() => {
			setDebouncedSearch(searchQuery);
		}, 300);

		return () => window.clearTimeout(handle);
	}, [searchQuery]);

	useEffect(() => {
		if (!programId || !evId) {
			return;
		}

		const query = debouncedSearch.trim();
		if (query.length < CHECK_IN_MIN_SEARCH_LENGTH) {
			setAttendees((current) => (current.length === 0 ? current : []));
			setMatchTotal((current) => (current === 0 ? current : 0));
			setRefreshing((current) => (current === false ? current : false));
			setError((current) => (current === null ? current : null));
			return;
		}

		let cancelled = false;
		setRefreshing(true);
		setError(null);

		void data
			.fetchSliceAttendees(programId, evId, {
				q: query,
				page: 1,
				pageSize: CHECK_IN_SEARCH_PAGE_SIZE,
			})
			.then((result) => {
				if (!cancelled) {
					setAttendees(result.attendees);
					setMatchTotal(result.total);
				}
			})
			.catch((err: unknown) => {
				if (!cancelled) {
					setError(err instanceof Error ? err.message : 'Failed to load check-in');
				}
			})
			.finally(() => {
				if (!cancelled) {
					setRefreshing(false);
				}
			});

		return () => {
			cancelled = true;
		};
	}, [data, programId, evId, debouncedSearch, searchReloadKey]);

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
			await loadCapacityStatus();
		} catch (err: unknown) {
			showToast(err instanceof Error ? err.message : 'Check-in failed', 'error');
		} finally {
			setConfirming(false);
		}
	}

	async function handleAdjustCapacity(direction: AdjustCapacityDirection) {
		if (!programId || !evId) {
			return;
		}

		setCapacityAdjusting(true);
		try {
			const status = await data.adjustCapacity(programId, evId, direction);
			setCapacityStatus(status);
		} catch (err: unknown) {
			showToast(err instanceof Error ? err.message : 'Capacity adjust failed', 'error');
		} finally {
			setCapacityAdjusting(false);
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

	const title =
		programName && eventName ? `${programName} — ${eventName} — Check-in` : 'Event check-in';

	const searchReady = debouncedSearch.trim().length >= CHECK_IN_MIN_SEARCH_LENGTH;
	const resultsTruncated = searchReady && matchTotal > attendees.length;
	const trimmedWalkInUrl = walkInFormUrl?.trim() ?? '';
	const walkInUrlError = trimmedWalkInUrl ? walkInUrlRenderError(trimmedWalkInUrl) : null;
	const walkInIframeSrc =
		checkInMode === 'walk-in' && trimmedWalkInUrl && !walkInUrlError ? trimmedWalkInUrl : null;

	return (
		<section id="view-check-in" className={styles.view}>
			<TopBar
				title={title}
				meta={
					checkInMode === 'walk-in'
						? 'Walk-in registration · HubSpot form'
						: searchReady
							? `${matchTotal} match${matchTotal === 1 ? '' : 'es'} · arrival desk`
							: 'Search by name or company · arrival desk'
				}
			/>

			<div className={styles.deskToolbar}>
				{capacityLoading ? (
					<LoadingState message="Loading capacity…" variant="inline" />
				) : capacityStatus ? (
					capacityStatus.capacity && capacityStatus.capacity > 0 ? (
						<div className={`card ${styles.capacityCard} ${styles.capacitySection}`}>
							<CapacityBar
								variant="live"
								value={capacityStatus.liveAttendance}
								capacity={capacityStatus.capacity}
								checkedInCount={capacityStatus.checkedInCount}
								onAdjust={(direction) => void handleAdjustCapacity(direction)}
								adjusting={capacityAdjusting}
							/>
						</div>
					) : (
						<div className={`card ${styles.capacityCard} ${styles.capacitySection}`}>
							<p className={styles.capacityCountOnly}>
								{capacityStatus.liveAttendance} checked in on site
							</p>
							<p className={styles.capacitySetupHint}>
								Set Event capacity in Catalog admin to monitor room fill percentage.
							</p>
						</div>
					)
				) : capacityError ? (
					<div className={`card ${styles.capacityCard} ${styles.capacitySection}`}>
						<p className={styles.capacityError}>Capacity unavailable: {capacityError}</p>
						<button type="button" className="btn btn-outline btn-sm" onClick={() => void loadCapacityStatus()}>
							Retry
						</button>
					</div>
				) : null}

				<div className={styles.modeSwitchGroup}>
					<div className={styles.modeDivider} role="separator" aria-hidden="true" />
					<p className={styles.modeSwitchLabel} id="check-in-mode-label">
						Desk mode
					</p>
					<div
						className={styles.modeSwitch}
						role="radiogroup"
						aria-labelledby="check-in-mode-label"
					>
						<button
							type="button"
							role="radio"
							aria-checked={checkInMode === 'check-in'}
							className={checkInMode === 'check-in' ? styles.modeActive : undefined}
							onClick={() => setCheckInMode('check-in')}
						>
							Check-in
						</button>
						<button
							type="button"
							role="radio"
							aria-checked={checkInMode === 'walk-in'}
							className={checkInMode === 'walk-in' ? styles.modeActive : undefined}
							onClick={() => setCheckInMode('walk-in')}
						>
							Walk-in
						</button>
					</div>
				</div>
			</div>

			{checkInMode === 'walk-in' ? (
				walkInIframeSrc ? (
					<div className={`card ${styles.walkInCard}`}>
						<p className={styles.walkInHint}>
							After the guest submits the HubSpot form, open <strong>Attendees</strong> and refresh to
							confirm they appear in the registrant list.
						</p>
						<iframe
							title="HubSpot walk-in form"
							src={walkInIframeSrc}
							className={styles.walkInFrame}
						/>
					</div>
				) : walkInUrlError ? (
					<div className={`card ${styles.walkInCard}`}>
						<p className={styles.walkInError} role="alert">
							{walkInUrlError}. Update the Walk-in form URL in catalog Settings before using walk-in
							registration.
						</p>
					</div>
				) : (
					<EmptyState
						viewId="view-check-in-walk-in-empty"
						message="No walk-in form URL is configured for this Event. An admin can set the Walk-in form URL (HubSpot) in catalog Settings."
						action={{ label: 'Open catalog Settings', to: '/catalog' }}
					/>
				)
			) : (
			<div className={styles.layout}>
				<div className={`card ${styles.findCard}`}>
					<div className={styles.cardHeader}>
						<h3>Find attendee</h3>
						{refreshing ? <LoadingState message="Searching…" variant="inline" /> : null}
					</div>
					<input
						type="search"
						className="search-input"
						placeholder="Search name or company (min 2 characters)…"
						value={searchQuery}
						onChange={(changeEvent) => setSearchQuery(changeEvent.target.value)}
						aria-label="Search attendees for check-in"
					/>
					{error ? (
						<p className={styles.searchError} role="alert">
							{error}{' '}
							<button
								type="button"
								className="btn btn-link"
								onClick={() => {
									setError(null);
									setSearchReloadKey((current) => current + 1);
								}}
							>
								Try again
							</button>
						</p>
					) : null}
					{resultsTruncated ? (
						<p className={styles.searchHint}>
							Showing {attendees.length} of {matchTotal} matches — type more to narrow results.
						</p>
					) : null}
					<div className={styles.resultsScroll}>
						<table>
							<thead>
								<tr>
									<th scope="col">Name</th>
									<th scope="col" className={styles.colCompany}>Company</th>
									<th scope="col" className={styles.colTrack}>Track</th>
									<th scope="col" className={styles.colAction} aria-label="Actions" />
								</tr>
							</thead>
							<tbody>
								{!searchReady ? (
									<tr>
										<td colSpan={4}>Type at least 2 characters to search registrants.</td>
									</tr>
								) : sortedAttendees.length === 0 ? (
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
											>
												<td>{attendeeName(person)}</td>
												<td className={styles.colCompany}>{person.company}</td>
												<td className={styles.colTrack}>{person.attendeeType}</td>
												<td className={styles.colAction}>
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

				<div className={`card card--accent ${styles.scanCard}`}>
					<div className={styles.cardHeader}>
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
			)}
		</section>
	);
}
