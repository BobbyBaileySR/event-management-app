import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import { CheckInQrPanel } from '../components/CheckInQrPanel';
import { CapacityBar } from '../components/CapacityBar';
import { useConfirm } from '../components/ConfirmModal';
import { EmptyState } from '../components/EmptyState';
import { LoadingState } from '../components/LoadingState';
import { TopBar } from '../components/TopBar';
import { useToast } from '../components/Toast';
import { useEventCapacity } from '../data/hooks/useCapacity';
import { invalidateAfterAttendeeMutation, invalidateAfterCapacityAdjust } from '../data/invalidation';
import { queryKeys } from '../data/queryKeys';
import { describeQueryStatus } from '../data/queryStatus';
import { useDataService } from '../hooks/useDataService';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useModalFocusTrap } from '../hooks/useModalFocusTrap';
import { useUndoCheckIn } from '../hooks/useUndoCheckIn';
import { useWorkingEventMeta } from '../hooks/useWorkingEventMeta';
import { useActiveRoute } from '../router/navigation';
import { useSession } from '../state/appState';
import type { AdjustCapacityDirection, CheckInContactSummary, SliceAttendee } from '../types';
import { attendeeMutationErrorMessage } from '../utils/attendeeMutationErrors';
import { attendeeInitials, attendeeName } from '../utils/attendeePresentation';
import { formatCheckInTime } from '../utils/format';
import { walkInFormUrlError } from '../utils/hubspotFormUrl';
import styles from './CheckInView.module.css';

type SelectedAttendee = SliceAttendee | CheckInContactSummary;
type ActiveModal = 'scanner' | 'walkin' | 'confirm' | null;

/** Backend caps pageSize at 200 — enough for a typical event roster at the desk. */
const CHECK_IN_SEARCH_PAGE_SIZE = 200;

export function CheckInView() {
	const { session } = useSession();
	const { showToast } = useToast();
	const { confirm } = useConfirm();
	const data = useDataService();
	const queryClient = useQueryClient();
	const { eventId } = useActiveRoute();
	const { eventName, walkInFormUrl } = useWorkingEventMeta(eventId);
	const [activeModal, setActiveModal] = useState<ActiveModal>(null);
	const modalTitleId = useId();
	const dialogRef = useRef<HTMLDivElement>(null);
	const [attendees, setAttendees] = useState<SliceAttendee[]>([]);
	const [searchQuery, setSearchQuery] = useState('');
	const debouncedSearch = useDebouncedValue(searchQuery);
	const [matchTotal, setMatchTotal] = useState(0);
	const [refreshing, setRefreshing] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [selected, setSelected] = useState<SelectedAttendee | null>(null);
	const [confirming, setConfirming] = useState(false);
	const { undoingId, runUndoCheckIn } = useUndoCheckIn(eventId ?? null);
	const undoing = undoingId !== null;
	const [scanning, setScanning] = useState(false);
	const [capacityAdjusting, setCapacityAdjusting] = useState(false);
	const [searchReloadKey, setSearchReloadKey] = useState(0);

	const capacityQuery = useEventCapacity(eventId ?? '', { enabled: Boolean(eventId) });
	const capacityViewStatus = describeQueryStatus(capacityQuery, 'Failed to load capacity');

	useEffect(() => {
		setSearchQuery('');
		setActiveModal(null);
		setSelected(null);
	}, [eventId]);

	const closeModal = useCallback(() => {
		setActiveModal(null);
		setSelected(null);
	}, []);

	useModalFocusTrap({ open: activeModal !== null, containerRef: dialogRef, onEscape: closeModal });

	useEffect(() => {
		if (!eventId) {
			return;
		}

		const query = debouncedSearch.trim();

		let cancelled = false;
		setRefreshing(true);
		setError(null);

		void data
			.fetchEventAttendees(eventId, {
				...(query ? { q: query } : {}),
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
	}, [data, eventId, debouncedSearch, searchReloadKey]);

	const sortedAttendees = useMemo(
		() => [...attendees].sort((left, right) => left.lastName.localeCompare(right.lastName)),
		[attendees],
	);

	const selectAttendee = useCallback((person: SliceAttendee) => {
		setSelected(person);
		setActiveModal('confirm');
	}, []);

	const handleQrDecode = useCallback(
		async (jwt: string) => {
			if (!eventId) {
				return;
			}

			setScanning(true);
			try {
				const result = await data.checkInScan(eventId, jwt);
				setSelected(result.contact);
				setActiveModal('confirm');
			} catch (err: unknown) {
				showToast(err instanceof Error ? err.message : 'QR scan failed', 'error');
			} finally {
				setScanning(false);
			}
		},
		[data, eventId, showToast],
	);

	async function handleConfirmCheckIn() {
		if (!eventId || !selected) {
			return;
		}

		setConfirming(true);
		try {
			const result = await data.confirmCheckIn(eventId, selected.contactId);
			const name = attendeeName(selected);

			if (result.alreadyCheckedIn) {
				showToast(`${name} is already checked in.`, 'success');
			} else {
				showToast(`${name} checked in successfully.`, 'success');
			}

			setAttendees((current) =>
				current.map((person) =>
					person.contactId === result.contactId
						? { ...person, checkedIn: true, checkedInAt: result.checkedInAt }
						: person,
				),
			);
			setSelected(null);
			setActiveModal(null);
			await invalidateAfterAttendeeMutation(queryClient, eventId);
		} catch (err: unknown) {
			showToast(attendeeMutationErrorMessage(err, 'Check-in failed'), 'error');
		} finally {
			setConfirming(false);
		}
	}

	/** Reacts to a successful shared undo — this view's own local roster patch + modal close (candidate 7). */
	function onUndoCheckInSuccess(person: SelectedAttendee) {
		setAttendees((current) =>
			current.map((row) =>
				row.contactId === person.contactId ? { ...row, checkedIn: false, checkedInAt: null } : row,
			),
		);
		setSelected(null);
		setActiveModal(null);
	}

	async function handleUndoFromList(person: SliceAttendee) {
		const name = attendeeName(person);
		const confirmed = await confirm({
			title: 'Undo check-in?',
			message: `${name} will return to Registered for this event. Capacity will update.`,
			confirmLabel: 'Undo check-in',
			cancelLabel: 'Cancel',
		});
		if (!confirmed) {
			return;
		}
		if (await runUndoCheckIn(person)) {
			onUndoCheckInSuccess(person);
		}
	}

	async function handleUndoFromConfirm() {
		if (!selected) {
			return;
		}
		if (await runUndoCheckIn(selected)) {
			onUndoCheckInSuccess(selected);
		}
	}

	async function handleAdjustCapacity(direction: AdjustCapacityDirection) {
		if (!eventId) {
			return;
		}

		setCapacityAdjusting(true);
		try {
			const status = await data.adjustCapacity(eventId, direction);
			queryClient.setQueryData(queryKeys.eventCapacity(eventId), status);
			await invalidateAfterCapacityAdjust(queryClient, eventId);
		} catch (err: unknown) {
			showToast(err instanceof Error ? err.message : 'Capacity adjust failed', 'error');
		} finally {
			setCapacityAdjusting(false);
		}
	}

	if (session && session.role !== 'admin') {
		return <Navigate to="/events" replace />;
	}

	if (!eventId) {
		return (
			<EmptyState
				viewId="view-check-in"
				message="Open an event from Programs & Events or the working-event picker to open check-in."
				action={{ label: 'Go to Programs & Events', to: '/events' }}
			/>
		);
	}

	const isSearching = debouncedSearch.trim().length > 0;
	const resultsTruncated = matchTotal > attendees.length;
	const trimmedWalkInUrl = walkInFormUrl?.trim() ?? '';
	const walkInUrlError = trimmedWalkInUrl ? walkInFormUrlError(trimmedWalkInUrl) : null;
	const walkInIframeSrc = trimmedWalkInUrl && !walkInUrlError ? trimmedWalkInUrl : null;
	const capacityStatus = capacityViewStatus.kind === 'ready' ? (capacityQuery.data ?? null) : null;

	return (
		<section id="view-check-in" className={styles.view}>
			<TopBar title="Check-in" meta="Scan, search or add attendees at the door" workingEvent={eventName} />

			<div className={styles.deskToolbar}>
				{capacityViewStatus.kind === 'loading' ? (
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
								manualAdjustmentCount={capacityStatus.departureCount}
							/>
						</div>
					) : (
						<div className={`card ${styles.capacityCard} ${styles.capacitySection}`}>
							<p className={styles.capacityCountOnly}>
								{capacityStatus.liveAttendance} checked in on site
							</p>
							<p className={styles.capacitySetupHint}>
								Set Event capacity on Programs & Events (edit the event) to monitor room fill percentage.
							</p>
						</div>
					)
				) : capacityViewStatus.kind === 'error' ? (
					<div className={`card ${styles.capacityCard} ${styles.capacitySection}`}>
						<p className={styles.capacityError}>Capacity unavailable: {capacityViewStatus.message}</p>
						<button type="button" className="btn btn-outline btn-sm" onClick={() => void capacityQuery.refetch()}>
							Retry
						</button>
					</div>
				) : null}
			</div>

			<div className={styles.layout}>
				<div className={`card ${styles.findCard}`}>
					<div className={styles.cardHeader}>
						<div>
							<h3>Attendees</h3>
							{!isSearching && capacityStatus ? (
								<p className={styles.checkedInSummary}>
									{capacityStatus.checkedInCount} of {matchTotal} checked in
								</p>
							) : null}
						</div>
						<label className={styles.searchField}>
							<span className="material-symbols-outlined" aria-hidden="true">
								search
							</span>
							<input
								type="search"
								placeholder="Search name or company…"
								value={searchQuery}
								onChange={(changeEvent) => setSearchQuery(changeEvent.target.value)}
								aria-label="Search attendees for check-in"
							/>
						</label>
					</div>
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
									<th scope="col" className={styles.colAction} aria-label="Actions" />
								</tr>
							</thead>
							<tbody>
								{refreshing ? (
									<tr>
										<td colSpan={2}>
											<LoadingState message="Loading attendees…" variant="inline" />
										</td>
									</tr>
								) : sortedAttendees.length === 0 ? (
									<tr>
										<td colSpan={2}>{isSearching ? 'No matching registrants.' : 'No registrants yet.'}</td>
									</tr>
								) : (
									sortedAttendees.map((person) => {
										const isSelected = selected?.contactId === person.contactId;
										return (
											<tr
												key={person.contactId}
												className={[
													isSelected ? styles.selectedRow : '',
													person.checkedIn ? styles.checkedInRow : '',
												]
													.filter(Boolean)
													.join(' ')}
											>
												<td>
													<div className={styles.attendeeCell}>
														<span className={styles.attendeeAvatar} aria-hidden="true">
															{attendeeInitials(person)}
														</span>
														<div>
															<p className={styles.attendeeName}>{attendeeName(person)}</p>
															<p className={styles.attendeeMeta}>
																{person.company} · {person.attendeeType}
															</p>
														</div>
													</div>
												</td>
												<td className={styles.colAction}>
													{person.checkedIn ? (
														<button
															type="button"
															className={styles.checkedInStatus}
															disabled={undoingId === person.contactId}
															title="Click to undo check-in"
															onClick={(clickEvent) => {
																clickEvent.stopPropagation();
																void handleUndoFromList(person);
															}}
														>
															{undoingId === person.contactId
																? 'Undoing…'
																: person.checkedInAt
																	? `In · ${formatCheckInTime(person.checkedInAt)}`
																	: 'In'}
														</button>
													) : (
														<button
															type="button"
															className="btn btn-primary btn-sm"
															onClick={(clickEvent) => {
																clickEvent.stopPropagation();
																selectAttendee(person);
															}}
														>
															Check in
														</button>
													)}
												</td>
											</tr>
										);
									})
								)}
							</tbody>
						</table>
					</div>
				</div>

				<div className={styles.actionColumn}>
					<div className="card">
						<h3>Scan QR code</h3>
						<p className="shell-note">Use a device camera to look up an attendee by their ticket QR code.</p>
						<button
							type="button"
							className="btn btn-primary"
							onClick={() => setActiveModal('scanner')}
						>
							Start scanner
						</button>
					</div>
					<div className="card">
						<h3>Walk-in registration</h3>
						<p className="shell-note">Not on the list? Register them on the spot.</p>
						<button
							type="button"
							className="btn btn-primary"
							onClick={() => setActiveModal('walkin')}
						>
							+ Add walk-in
						</button>
					</div>
				</div>
			</div>

			{activeModal ? (
				<div
					className="modal-overlay"
					role="presentation"
					onClick={(clickEvent) => {
						if (clickEvent.target === clickEvent.currentTarget) {
							closeModal();
						}
					}}
				>
					<div
						ref={dialogRef}
						className={`modal ${styles.modal}`}
						role="dialog"
						aria-modal="true"
						aria-labelledby={modalTitleId}
					>
						{activeModal === 'scanner' ? (
							<>
								<h3 id={modalTitleId}>Scan QR code</h3>
								<div className={styles.modalBody}>
									<CheckInQrPanel onDecode={handleQrDecode} disabled={scanning} />
									<p className="shell-note">Point the camera at an attendee's ticket QR code to look them up.</p>
								</div>
								<div className="modal__actions">
									<button type="button" className="btn btn-outline" onClick={closeModal}>
										Close
									</button>
								</div>
							</>
						) : activeModal === 'walkin' ? (
							<>
								<h3 id={modalTitleId}>Walk-in registration</h3>
								<div className={styles.modalBody}>
									{walkInIframeSrc ? (
										<>
											<p className={styles.walkInHint}>
												After the guest submits the HubSpot form, they will not appear on the roster
												immediately — allow a short sync delay, then open <strong>Attendees</strong> and
												refresh to confirm they are listed. Walk-in registers only; it does not check
												them in.
											</p>
											<iframe
												title="HubSpot walk-in form"
												src={walkInIframeSrc}
												className={styles.walkInFrame}
											/>
										</>
									) : walkInUrlError ? (
										<p className={styles.walkInError} role="alert">
											{walkInUrlError}. Update the Walk-in form URL via Event Details → Edit event
											before using walk-in registration.
										</p>
									) : (
										<EmptyState
											viewId="view-check-in-walk-in-empty"
											message="No walk-in form URL is configured for this Event. An admin can set the Walk-in form URL (HubSpot) via Event Details → Edit event."
											action={
												eventId
													? { label: 'Open Event Details', to: `/events/${eventId}` }
													: { label: 'Go to Programs & Events', to: '/events' }
											}
										/>
									)}
								</div>
								<div className="modal__actions">
									<button type="button" className="btn btn-outline" onClick={closeModal}>
										Close
									</button>
								</div>
							</>
						) : activeModal === 'confirm' && selected ? (
							<>
								<h3 id={modalTitleId}>
									{selected.checkedIn ? 'Already checked in' : 'Confirm check-in'}
								</h3>
								<div className={styles.modalBody}>
									<div className={styles.confirmHeader}>
										<span className={styles.confirmInitials} aria-hidden="true">
											{attendeeInitials(selected)}
										</span>
										<div className={styles.confirmName}>
											<p className={styles.confirmNameText}>{attendeeName(selected)}</p>
										</div>
									</div>
									<dl className={styles.summaryList}>
										<div>
											<dt>Name</dt>
											<dd>{attendeeName(selected)}</dd>
										</div>
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
											<dt>Attendee type</dt>
											<dd>{selected.attendeeType ?? '—'}</dd>
										</div>
										<div>
											<dt>Current status</dt>
											<dd>{selected.checkedIn ? 'Checked in' : 'Registered'}</dd>
										</div>
									</dl>
								</div>
								<div className="modal__actions">
									<button type="button" className="btn btn-outline" onClick={closeModal}>
										Cancel
									</button>
									{selected.checkedIn ? (
										<button
											type="button"
											className="btn btn-primary"
											disabled={undoing}
											onClick={() => void handleUndoFromConfirm()}
										>
											{undoing ? 'Undoing…' : 'Undo check-in'}
										</button>
									) : (
										<button
											type="button"
											className="btn btn-primary"
											disabled={confirming}
											onClick={() => void handleConfirmCheckIn()}
										>
											{confirming ? 'Confirming…' : 'Confirm check-in'}
										</button>
									)}
								</div>
							</>
						) : null}
					</div>
				</div>
			) : null}
		</section>
	);
}
