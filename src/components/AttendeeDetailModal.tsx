import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useModalFocusTrap } from '../hooks/useModalFocusTrap';
import { useDataService } from '../hooks/useDataService';
import type { AttendeeCommunicationsResponse, AttendeeDetail, AttendeeJourneyStep, AttendeeTimelineItem, LeadGenerationOutcome } from '../types';
import { attendeeInitials, attendeeName } from '../utils/attendeePresentation';
import { formatDateTime } from '../utils/format';
import { ConversationNotesPanel } from './ConversationNotesPanel';
import { LoadingState } from './LoadingState';
import { RegistrationHistoryPanel } from './RegistrationHistoryPanel';
import { useToast } from './Toast';
import styles from './AttendeeDetailModal.module.css';

/** Where the modal was opened from — controls which sections and actions are shown. */
export type AttendeeDetailModalVariant = 'registered' | 'conversations';

export interface AttendeeDetailModalProps {
	open: boolean;
	eventId: string;
	contactId: string | null;
	onClose: () => void;
	/**
	 * `registered` — Basic Information, Attendee Journey, notes history (read-only),
	 * Registration History, and Create lead in the footer.
	 * `conversations` — Basic Information, notes input + history only (no lead/journey/registration history).
	 */
	variant: AttendeeDetailModalVariant;
}

const JOURNEY_ICON: Record<AttendeeJourneyStep['type'], string> = {
	registered: 'how_to_reg',
	dispatch_sent: 'mail',
	dispatch_opened: 'mark_email_read',
	checked_in: 'check_circle',
};

function registrationSourceLabel(source: AttendeeDetail['registrationSource']): string {
	return source === 'walk-in' ? 'Walk-in' : 'Online registration';
}

/** Generic "OTHER DISPATCH" tag copy per `CONTEXT.md` § Attendee communications view. */
function communicationTagLabel(item: AttendeeTimelineItem): string | null {
	if (!('tag' in item)) {
		return null;
	}
	return item.tag.kind === 'other_event' ? item.tag.eventName : 'OTHER DISPATCH';
}

const LEAD_OUTCOME_MESSAGE: Record<LeadGenerationOutcome, string> = {
	created: 'Lead created in HubSpot',
	updated: 'Lead updated — a new note was added',
	created_separate: 'A new Lead was created (an existing HubSpot Lead was left untouched)',
};

export function AttendeeDetailModal({ open, eventId, contactId, onClose, variant }: AttendeeDetailModalProps) {
	const data = useDataService();
	const { showToast } = useToast();
	const titleId = useId();
	const subtitleId = useId();
	const dialogRef = useRef<HTMLDivElement>(null);
	const [detail, setDetail] = useState<AttendeeDetail | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const [showAllCommunications, setShowAllCommunications] = useState(false);
	const [communications, setCommunications] = useState<AttendeeCommunicationsResponse | null>(null);
	const [communicationsLoading, setCommunicationsLoading] = useState(false);
	const [communicationsError, setCommunicationsError] = useState<string | null>(null);

	const [generatingLead, setGeneratingLead] = useState(false);
	const [includeFullHistory, setIncludeFullHistory] = useState(false);

	const isRegistered = variant === 'registered';

	const loadDetail = useCallback(() => {
		if (!contactId) {
			return;
		}
		let cancelled = false;
		setLoading(true);
		setError(null);
		data
			.fetchAttendeeDetail(eventId, contactId)
			.then((result) => {
				if (!cancelled) {
					setDetail(result);
				}
			})
			.catch((err: unknown) => {
				if (!cancelled) {
					setError(err instanceof Error ? err.message : 'Failed to load attendee');
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
	}, [data, eventId, contactId]);

	const loadCommunications = useCallback(() => {
		if (!contactId) {
			return;
		}
		let cancelled = false;
		setCommunicationsLoading(true);
		setCommunicationsError(null);
		data
			.fetchAttendeeCommunications(contactId, eventId)
			.then((result) => {
				if (!cancelled) {
					setCommunications(result);
				}
			})
			.catch((err: unknown) => {
				if (!cancelled) {
					setCommunicationsError(err instanceof Error ? err.message : 'Failed to load all communications');
				}
			})
			.finally(() => {
				if (!cancelled) {
					setCommunicationsLoading(false);
				}
			});
		return () => {
			cancelled = true;
		};
	}, [data, eventId, contactId]);

	const handleGenerateLead = useCallback(async () => {
		if (!contactId || generatingLead) {
			return;
		}
		setGeneratingLead(true);
		try {
			const result = await data.generateAttendeeLead(eventId, contactId, { includeFullHistory });
			showToast(LEAD_OUTCOME_MESSAGE[result.outcome], 'success', 3500, `HubSpot Lead ID: ${result.leadId}`);
		} catch (err: unknown) {
			showToast(err instanceof Error ? err.message : 'Failed to generate Lead', 'error');
		} finally {
			setGeneratingLead(false);
		}
	}, [data, eventId, contactId, generatingLead, includeFullHistory, showToast]);

	const handleToggleCommunications = useCallback(() => {
		setShowAllCommunications((current) => {
			const next = !current;
			if (next && !communications && !communicationsLoading) {
				loadCommunications();
			}
			return next;
		});
	}, [communications, communicationsLoading, loadCommunications]);

	useModalFocusTrap({ open, containerRef: dialogRef, onEscape: onClose });

	useEffect(() => {
		if (!open || !contactId) {
			setDetail(null);
			setError(null);
			setShowAllCommunications(false);
			setCommunications(null);
			setCommunicationsError(null);
			setCommunicationsLoading(false);
			setIncludeFullHistory(false);
			return;
		}
		return loadDetail();
	}, [open, contactId, loadDetail]);

	if (!open || !contactId) {
		return null;
	}

	const timeline: AttendeeTimelineItem[] =
		showAllCommunications && communications ? communications.timeline : (detail?.journey ?? []);

	return (
		<div
			className="modal-overlay"
			role="presentation"
			onClick={(event) => {
				if (event.target === event.currentTarget) {
					onClose();
				}
			}}
		>
			<div
				ref={dialogRef}
				className={`modal ${styles.modal}`}
				role="dialog"
				aria-modal="true"
				aria-labelledby={titleId}
				aria-describedby={detail ? subtitleId : undefined}
				onClick={(event) => event.stopPropagation()}
			>
				<div className={styles.header}>
					<div>
						<h3 id={titleId}>{detail ? attendeeName(detail) : 'Attendee details'}</h3>
						{detail ? (
							<p id={subtitleId} className={styles.subtitle}>
								{detail.company} · {detail.email}
							</p>
						) : null}
					</div>
					<button
						type="button"
						className={styles.closeButton}
						onClick={onClose}
						aria-label="Close attendee detail"
					>
						×
					</button>
				</div>

				<div className={styles.body}>
					{loading ? <LoadingState message="Loading attendee…" variant="inline" /> : null}

					{!loading && error ? (
						<div className={styles.errorBlock}>
							<p role="alert" className={styles.errorMessage}>
								{error}
							</p>
							<button type="button" className="btn btn-outline btn-sm" onClick={loadDetail}>
								Try again
							</button>
						</div>
					) : null}

					{!loading && !error && detail ? (
						<>
							<div className={styles.summaryRow}>
								<span className={styles.avatar} aria-hidden="true">
									{attendeeInitials(detail)}
								</span>
								<div className={styles.summaryInfo}>
									<span className={styles.summaryName}>{attendeeName(detail)}</span>
									<span className={styles.summaryBadges}>
										<span className="badge">{detail.attendeeType === 'partner' ? 'Partner' : 'Customer'}</span>
										<span className={`badge ${detail.checkedIn ? 'badge--checked-in' : 'badge--registered'}`}>
											{detail.checkedIn && detail.checkedInAt
												? `Checked in · ${formatDateTime(detail.checkedInAt)}`
												: detail.checkedIn
													? 'Checked in'
													: 'Registered'}
										</span>
									</span>
								</div>
							</div>

							<section aria-labelledby={`${titleId}-basic-info`}>
								<h4 id={`${titleId}-basic-info`} className={styles.sectionTitle}>
									Basic Information
								</h4>
								<div className={styles.fieldGrid}>
									<div className={styles.field}>
										<span className={styles.fieldLabel}>Email</span>
										<span className={styles.fieldValue}>{detail.email}</span>
									</div>
									{detail.phone ? (
										<div className={styles.field}>
											<span className={styles.fieldLabel}>Phone</span>
											<span className={styles.fieldValue}>{detail.phone}</span>
										</div>
									) : null}
									<div className={styles.field}>
										<span className={styles.fieldLabel}>Company</span>
										<span className={styles.fieldValue}>{detail.company}</span>
									</div>
									{detail.jobTitle ? (
										<div className={styles.field}>
											<span className={styles.fieldLabel}>Job title</span>
											<span className={styles.fieldValue}>{detail.jobTitle}</span>
										</div>
									) : null}
									{detail.registrationSource ? (
										<div className={styles.field}>
											<span className={styles.fieldLabel}>Registration source</span>
											<span className={styles.fieldValue}>
												{registrationSourceLabel(detail.registrationSource)}
											</span>
										</div>
									) : null}
									{detail.dietaryRequirement ? (
										<div className={styles.field}>
											<span className={styles.fieldLabel}>Dietary requirement</span>
											<span className={styles.fieldValue}>{detail.dietaryRequirement}</span>
										</div>
									) : null}
								</div>
							</section>

							{isRegistered ? (
								<section aria-labelledby={`${titleId}-journey`}>
									<div className={styles.journeyHeader}>
										<h4 id={`${titleId}-journey`} className={styles.sectionTitle}>
											Attendee Journey
										</h4>
										<button
											type="button"
											className={styles.communicationsLink}
											onClick={handleToggleCommunications}
										>
											{showAllCommunications ? 'Hide all communications' : 'Show all communications'}
										</button>
									</div>

									{showAllCommunications && communicationsLoading ? (
										<LoadingState message="Loading all communications…" variant="inline" />
									) : null}

									{showAllCommunications && communicationsError ? (
										<div className={styles.errorBlock}>
											<p role="alert" className={styles.errorMessage}>
												{communicationsError}
											</p>
											<button type="button" className="btn btn-outline btn-sm" onClick={loadCommunications}>
												Try again
											</button>
										</div>
									) : null}

									{timeline.length === 0 ? (
										<p className={styles.journeyEmpty}>No journey steps recorded yet for this event.</p>
									) : (
										<ol className={styles.journey}>
											{timeline.map((step, index) => {
												const tagLabel = communicationTagLabel(step);
												return (
													<li key={`${step.type}-${index}`} className={styles.journeyStep}>
														<span
															className={`${styles.journeyDot} ${step.timestamp ? styles.journeyDotDone : ''}`}
															aria-hidden="true"
														>
															<span className="material-symbols-outlined">{JOURNEY_ICON[step.type]}</span>
														</span>
														<span className={styles.journeyContent}>
															<span className={styles.journeyLabel}>
																{step.label}
																{tagLabel ? <span className="badge">{tagLabel}</span> : null}
															</span>
															<span className={styles.journeyTimestamp}>
																{step.timestamp ? formatDateTime(step.timestamp) : 'Not yet'}
															</span>
														</span>
													</li>
												);
											})}
										</ol>
									)}
								</section>
							) : null}

							<ConversationNotesPanel
								eventId={eventId}
								contactId={contactId}
								headingId={`${titleId}-notes`}
								mode={isRegistered ? 'history' : 'compose'}
							/>

							{isRegistered ? (
								<RegistrationHistoryPanel
									entries={detail.registrationAnswerHistory}
									headingId={`${titleId}-registration-history`}
								/>
							) : null}
						</>
					) : null}
				</div>

				{!loading && !error && detail ? (
					<div className={styles.footer}>
						{isRegistered ? (
							<label className={styles.fullHistoryOption}>
								<input
									type="checkbox"
									checked={includeFullHistory}
									onChange={(changeEvent) => setIncludeFullHistory(changeEvent.target.checked)}
								/>
								Include this attendee's full cross-event history (not just this event)
							</label>
						) : null}
						<div className={`${styles.footerActions}${isRegistered ? '' : ` ${styles.footerActionsEnd}`}`}>
							{isRegistered ? (
								<button
									type="button"
									className="btn btn-primary"
									onClick={() => void handleGenerateLead()}
									disabled={generatingLead}
									aria-busy={generatingLead}
								>
									{generatingLead ? 'Creating…' : 'Create lead'}
								</button>
							) : null}
							<button type="button" className="btn btn-outline" onClick={onClose}>
								Close
							</button>
						</div>
					</div>
				) : null}
			</div>
		</div>
	);
}
