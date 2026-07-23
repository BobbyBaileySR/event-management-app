import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { AttendeeDetailModal } from '../components/AttendeeDetailModal';
import { CheckInQrPanel } from '../components/CheckInQrPanel';
import { EmptyState } from '../components/EmptyState';
import { LoadingState } from '../components/LoadingState';
import { TopBar } from '../components/TopBar';
import { useToast } from '../components/Toast';
import { useModalFocusTrap } from '../hooks/useModalFocusTrap';
import { useDataService } from '../hooks/useDataService';
import { useWorkingEventMeta } from '../hooks/useWorkingEventMeta';
import { useActiveRoute } from '../router/navigation';
import { useSession } from '../state/appState';
import type { SliceAttendee } from '../types';
import { attendeeInitials, attendeeName } from '../utils/attendeePresentation';
import styles from './ConversationsView.module.css';

/** Backend caps pageSize at 200 — enough for a typical event's checked-in roster. */
const CONVERSATIONS_PAGE_SIZE = 200;

/**
 * `#/events/{id}/conversations` (015-conversation-notes, US1) — a checked-in-only roster with
 * list selection or QR scan, both landing on the same existing `AttendeeDetailModal` (010).
 * Reuses `CheckInQrPanel.tsx` unmodified and the existing `fetchEventAttendees` with
 * `checkedIn: true` — no new list route (research.md R-003). Scanning here never writes a
 * check-in and is not audited as `checkin.scan` (research.md R-001/R-002) — `lookupAttendeeByQr`
 * calls the dedicated, read-only lookup route instead of `checkInScan`.
 */
export function ConversationsView() {
	const { session } = useSession();
	const { showToast } = useToast();
	const data = useDataService();
	const { eventId } = useActiveRoute();
	const { eventName } = useWorkingEventMeta(eventId);
	const [attendees, setAttendees] = useState<SliceAttendee[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [reloadKey, setReloadKey] = useState(0);
	const [scannerOpen, setScannerOpen] = useState(false);
	const [scanning, setScanning] = useState(false);
	const [detailContactId, setDetailContactId] = useState<string | null>(null);
	const modalTitleId = useId();
	const dialogRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		setDetailContactId(null);
		setScannerOpen(false);
	}, [eventId]);

	const closeScanner = useCallback(() => setScannerOpen(false), []);
	useModalFocusTrap({ open: scannerOpen, containerRef: dialogRef, onEscape: closeScanner });

	useEffect(() => {
		if (!eventId) {
			return;
		}

		let cancelled = false;
		setLoading(true);
		setError(null);

		void data
			.fetchEventAttendees(eventId, { checkedIn: true, page: 1, pageSize: CONVERSATIONS_PAGE_SIZE })
			.then((result) => {
				if (!cancelled) {
					setAttendees(result.attendees);
				}
			})
			.catch((err: unknown) => {
				if (!cancelled) {
					setError(err instanceof Error ? err.message : 'Failed to load checked-in attendees');
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
	}, [data, eventId, reloadKey]);

	const sortedAttendees = useMemo(
		() => [...attendees].sort((left, right) => left.lastName.localeCompare(right.lastName)),
		[attendees],
	);

	const handleQrDecode = useCallback(
		async (jwt: string) => {
			if (!eventId) {
				return;
			}

			setScanning(true);
			try {
				const result = await data.lookupAttendeeByQr(eventId, jwt);
				setScannerOpen(false);
				setDetailContactId(result.contact.contactId);
			} catch (err: unknown) {
				showToast(err instanceof Error ? err.message : 'QR lookup failed', 'error');
			} finally {
				setScanning(false);
			}
		},
		[data, eventId, showToast],
	);

	if (session && session.role !== 'admin') {
		return <Navigate to="/events" replace />;
	}

	if (!eventId) {
		return (
			<EmptyState
				viewId="view-conversations"
				message="Open an event from Programs & Events or the working-event picker to find a checked-in attendee."
				action={{ label: 'Go to Programs & Events', to: '/events' }}
			/>
		);
	}

	return (
		<section id="view-conversations" className={styles.view}>
			<TopBar title="Conversations" meta="Find a checked-in attendee to talk to" workingEvent={eventName} />

			<div className={styles.layout}>
				<div className={`card ${styles.listCard}`}>
					<div className={styles.cardHeader}>
						<h3>Checked in</h3>
						{!loading ? <p className={styles.countSummary}>{sortedAttendees.length} checked in</p> : null}
					</div>
					{error ? (
						<p className={styles.listError} role="alert">
							{error}{' '}
							<button
								type="button"
								className="btn btn-link"
								onClick={() => {
									setError(null);
									setReloadKey((current) => current + 1);
								}}
							>
								Try again
							</button>
						</p>
					) : null}
					<div className={styles.resultsScroll}>
						<table>
							<thead>
								<tr>
									<th scope="col">Name</th>
								</tr>
							</thead>
							<tbody>
								{loading ? (
									<tr>
										<td>
											<LoadingState message="Loading checked-in attendees…" variant="inline" />
										</td>
									</tr>
								) : sortedAttendees.length === 0 ? (
									<tr>
										<td>No one is checked in yet.</td>
									</tr>
								) : (
									sortedAttendees.map((person) => (
										<tr key={person.contactId} onClick={() => setDetailContactId(person.contactId)}>
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
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>
				</div>

				<div className={styles.actionColumn}>
					<div className="card">
						<h3>Scan QR code</h3>
						<p className="shell-note">Scan a checked-in attendee's ticket QR code to pull up their information.</p>
						<button type="button" className="btn btn-primary" onClick={() => setScannerOpen(true)}>
							Start scanner
						</button>
					</div>
				</div>
			</div>

			{scannerOpen ? (
				<div
					className="modal-overlay"
					role="presentation"
					onClick={(clickEvent) => {
						if (clickEvent.target === clickEvent.currentTarget) {
							closeScanner();
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
						<h3 id={modalTitleId}>Scan QR code</h3>
						<div className={styles.modalBody}>
							<CheckInQrPanel onDecode={(jwt) => void handleQrDecode(jwt)} disabled={scanning} />
							<p className="shell-note">Point the camera at an attendee's ticket QR code to look them up.</p>
						</div>
						<div className="modal__actions">
							<button type="button" className="btn btn-outline" onClick={closeScanner}>
								Close
							</button>
						</div>
					</div>
				</div>
			) : null}

			<AttendeeDetailModal
				open={detailContactId !== null}
				eventId={eventId}
				contactId={detailContactId}
				onClose={() => setDetailContactId(null)}
				variant="conversations"
			/>
		</section>
	);
}
