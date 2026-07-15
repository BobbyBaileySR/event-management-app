import { useId, useMemo, useRef, useState } from 'react';
import { CatalogPickerSelect } from '../components/CatalogPickerSelect';
import { useConfirm } from '../components/ConfirmModal';
import { LoadingState } from '../components/LoadingState';
import { CalendarPicker } from '../components/pickers/CalendarPicker';
import { TimePicker } from '../components/pickers/TimePicker';
import { TopBar } from '../components/TopBar';
import { useToast } from '../components/Toast';
import { useDataService } from '../hooks/useDataService';
import {
	DETAIL_RECIPIENTS_PAGE_SIZE,
	type ScheduleMinute,
	useEmailDispatchWorkflow,
} from '../hooks/useEmailDispatchWorkflow';
import { useModalFocusTrap } from '../hooks/useModalFocusTrap';
import { useWorkingEventMeta } from '../hooks/useWorkingEventMeta';
import { useActiveRoute } from '../router/navigation';
import type { DispatchStatus, EmailDispatchListItem, SliceAttendee } from '../types';
import {
	SCHEDULE_MINUTE_OPTIONS,
	buildTimeSlot,
	formatScheduleSlotLabel,
} from '../utils/emailSchedule';
import styles from './EmailDispatchView.module.css';

function attendeeDisplayName(person: SliceAttendee): string {
	return `${person.firstName} ${person.lastName}`.trim();
}

function attendeeInitials(person: SliceAttendee): string {
	const first = person.firstName.trim().charAt(0);
	const last = person.lastName.trim().charAt(0);
	return `${first}${last}`.toUpperCase() || '?';
}

const AUDIENCE_MODE_LABELS: Record<string, string> = {
	registered_all: 'All attendees',
	registered_checked_in: 'Checked-in attendees',
	registered_not_checked_in: 'Not-checked-in attendees',
	registered_manual: 'Manual selection',
};

type ScheduleRow = EmailDispatchListItem & { source: 'scheduled' | 'log' };

const LOG_STATUS_LABELS: Record<DispatchStatus, string> = {
	pending: 'Pending',
	processing: 'Sending',
	completed: 'Sent',
	failed: 'Failed',
	cancelled: 'Cancelled',
};

export function EmailDispatchView() {
	const data = useDataService();
	const { confirm } = useConfirm();
	const { showToast } = useToast();
	const { eventId } = useActiveRoute();
	const { eventName, programName } = useWorkingEventMeta(eventId);

	const {
		sendMode,
		setSendMode,
		scheduleDate,
		setScheduleDate,
		scheduleHour,
		setScheduleHour,
		scheduleMinute,
		setScheduleMinute,
		segments,
		scheduledDispatches,
		logDispatches,
		templateOptions,
		segmentOptions,
		templateId,
		setTemplateId,
		audienceSource,
		setAudienceSource,
		audienceMode,
		segmentId,
		setSegmentId,
		recipientCount,
		previewLoading,
		manualContactIds,
		selectAllRegistered,
		selectCheckedInRegistered,
		clearRegisteredSelection,
		toggleRegisteredContact,
		pickerAttendees,
		pickerTotal,
		pickerSearch,
		setPickerSearch,
		pickerLoading,
		selectedDispatchId,
		setSelectedDispatchId,
		selectedDispatch,
		detailRecipients,
		detailTotal,
		detailPage,
		detailLoading,
		detailTotalPages,
		detailRangeStart,
		detailRangeEnd,
		loadDispatchDetail,
		loading,
		logLoading,
		scheduledLoading,
		sending,
		savingEdit,
		cancellingId,
		error,
		scheduledLockWarnings,
		editingDispatch,
		editDispatchName,
		setEditDispatchName,
		editTemplateId,
		setEditTemplateId,
		editScheduleDate,
		setEditScheduleDate,
		editScheduleHour,
		setEditScheduleHour,
		editScheduleMinute,
		setEditScheduleMinute,
		openEditModal,
		closeEditModal,
		loadComposeData,
		handleSendNow,
		handleScheduleForLater,
		handleSaveEdit,
		handleCancelScheduled,
	} = useEmailDispatchWorkflow({ data, confirm, showToast, eventId });

	const [composeOpen, setComposeOpen] = useState(false);
	const composeTitleId = useId();
	const composeDialogRef = useRef<HTMLDivElement>(null);
	const closeCompose = () => setComposeOpen(false);
	useModalFocusTrap({ open: composeOpen, containerRef: composeDialogRef, onEscape: closeCompose });

	const title =
		programName && eventName ? `${programName} — ${eventName} — Email` : eventName ? `${eventName} — Email` : 'Email dispatch';

	const meta =
		programName && eventName
			? `${programName} · ${eventName}`
			: eventName ?? 'Event-scoped email dispatch';

	const composeContextLabel =
		programName && eventName ? `${programName} — ${eventName}` : eventName ?? 'this event';

	const manualSelectionSet = useMemo(() => new Set(manualContactIds), [manualContactIds]);
	const isContactSelected = (person: SliceAttendee): boolean => {
		switch (audienceMode) {
			case 'registered_all':
				return true;
			case 'registered_checked_in':
				return person.checkedIn;
			case 'registered_not_checked_in':
				return !person.checkedIn;
			default:
				return manualSelectionSet.has(person.contactId);
		}
	};

	const selectedTemplateName =
		templateOptions.find((option) => option.value === templateId)?.label ?? null;
	const selectedSegmentName = segments.find((segment) => segment.id === segmentId)?.name ?? null;
	const audienceSummaryLabel =
		audienceSource === 'hubspot_segment'
			? (selectedSegmentName ?? 'HubSpot list')
			: (AUDIENCE_MODE_LABELS[audienceMode] ?? 'Event attendees');
	const scheduleSummaryLabel = formatScheduleSlotLabel(scheduleDate, scheduleHour, scheduleMinute);

	const scheduleRows: ScheduleRow[] = useMemo(
		() => [
			...scheduledDispatches.map((dispatch) => ({ ...dispatch, source: 'scheduled' as const })),
			...logDispatches.map((dispatch) => ({ ...dispatch, source: 'log' as const })),
		],
		[scheduledDispatches, logDispatches],
	);

	async function handleSendNowAndClose() {
		if (await handleSendNow()) {
			closeCompose();
		}
	}

	async function handleScheduleAndClose() {
		if (await handleScheduleForLater()) {
			closeCompose();
		}
	}

	function renderScheduleFields(options: {
		date: string;
		hour: number;
		minute: ScheduleMinute;
		onDateChange: (value: string) => void;
		onHourChange: (value: number) => void;
		onMinuteChange: (value: ScheduleMinute) => void;
		idPrefix: string;
	}) {
		const timeValue = buildTimeSlot(options.hour, options.minute);
		return (
			<div className={styles.scheduleFields}>
				<CalendarPicker
					id={`${options.idPrefix}-date`}
					className={styles.field}
					label="Date"
					value={options.date}
					onChange={options.onDateChange}
				/>
				<TimePicker
					id={`${options.idPrefix}-time`}
					className={styles.field}
					label="Time"
					value={timeValue}
					placeholder="Select time"
					stepMinutes={15}
					onChange={(value) => {
						const [hourPart, minutePart] = value.split(':').map((part) => Number(part));
						if (!Number.isFinite(hourPart) || !Number.isFinite(minutePart)) {
							return;
						}
						options.onHourChange(hourPart);
						if ((SCHEDULE_MINUTE_OPTIONS as readonly number[]).includes(minutePart)) {
							options.onMinuteChange(minutePart as ScheduleMinute);
						}
					}}
				/>
			</div>
		);
	}

	return (
		<section id="view-email-dispatch" className={styles.view} data-testid="email-dispatch-view">
			<TopBar title={title} meta={meta} />

			<div className={`hub-stats grid-3 ${styles.statRow}`}>
				<div className="card hub-stat">
					<p className="hub-stat__label">Sent</p>
					<p className="hub-stat__value">{logDispatches.length}</p>
				</div>
				<div className="card hub-stat">
					<p className="hub-stat__label">Scheduled</p>
					<p className="hub-stat__value">{scheduledDispatches.length}</p>
				</div>
				<div className="card hub-stat">
					<p className="hub-stat__label">Drafts</p>
					<p className="hub-stat__value">0</p>
				</div>
			</div>

			<div className={`card ${styles.card}`}>
				<div className={styles.cardHeader}>
					<h2>Email schedule</h2>
					<button type="button" className="btn btn-primary" onClick={() => setComposeOpen(true)}>
						+ New campaign
					</button>
				</div>

				{scheduledLockWarnings.length > 0 ? (
					<p className={styles.lockWarningBanner} role="status" data-testid="schedule-lock-warning">
						{scheduledLockWarnings.length === 1
							? `"${scheduledLockWarnings[0]?.dispatchName}" is within 15 minutes of processing — editing and cancelling will be locked soon.`
							: `${scheduledLockWarnings.length} scheduled dispatches are within 15 minutes of processing — editing and cancelling will be locked soon.`}
					</p>
				) : null}

				{scheduledLoading || logLoading ? <LoadingState message="Loading email schedule…" /> : null}

				{!scheduledLoading && !logLoading && scheduleRows.length === 0 ? (
					<div className={styles.emptySchedule}>
						<p>No campaigns yet for this Event.</p>
						<button type="button" className="btn btn-outline" onClick={() => setComposeOpen(true)}>
							+ Create your first campaign
						</button>
					</div>
				) : null}

				{!scheduledLoading && !logLoading && scheduleRows.length > 0 ? (
					<div className={`table-scroll ${styles.tableScroll}`}>
						<table className="data-table">
							<thead>
								<tr>
									<th>Name</th>
									<th>Template</th>
									<th>Audience</th>
									<th>Status</th>
									<th>Recipients</th>
									<th aria-label="Actions" />
								</tr>
							</thead>
							<tbody>
								{scheduleRows.map((dispatch) => (
									<tr
										key={dispatch.dispatchId}
										className={
											selectedDispatchId === dispatch.dispatchId ? styles.selectedRow : undefined
										}
									>
										<td>
											{dispatch.source === 'log' ? (
												<button
													type="button"
													className={styles.rowButton}
													onClick={() =>
														setSelectedDispatchId((current) =>
															current === dispatch.dispatchId ? null : dispatch.dispatchId,
														)
													}
												>
													{dispatch.dispatchName}
												</button>
											) : (
												dispatch.dispatchName
											)}
											{dispatch.lockWarning ? (
												<span className={styles.lockBadge} data-testid="dispatch-lock-badge">
													Locking soon
												</span>
											) : null}
										</td>
										<td>{dispatch.templateName}</td>
										<td>{dispatch.audienceSummary}</td>
										<td>{dispatch.source === 'scheduled' ? 'Scheduled' : LOG_STATUS_LABELS[dispatch.status]}</td>
										<td>
											{dispatch.source === 'scheduled'
												? dispatch.recipientCountPlanned
												: `${dispatch.recipientCountSent} / ${dispatch.recipientCountPlanned}`}
										</td>
										<td>
											{dispatch.source === 'scheduled' ? (
												<div className={styles.rowActions}>
													<button
														type="button"
														className="btn btn-outline btn-sm"
														onClick={() => openEditModal(dispatch)}
													>
														Edit
													</button>
													<button
														type="button"
														className="btn btn-outline btn-sm"
														onClick={() => void handleCancelScheduled(dispatch)}
														disabled={cancellingId === dispatch.dispatchId}
													>
														{cancellingId === dispatch.dispatchId ? 'Cancelling…' : 'Cancel'}
													</button>
												</div>
											) : null}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				) : null}

				{selectedDispatch ? (
					<div className={styles.detailPanel} aria-label="Dispatch detail">
						<h3 className={styles.detailTitle}>{selectedDispatch.dispatchName}</h3>
						<p className={styles.detailMeta}>
							{selectedDispatch.templateName} · {selectedDispatch.audienceSummary} ·{' '}
							{selectedDispatch.status}
						</p>
						{detailLoading ? <LoadingState message="Loading recipients…" variant="inline" /> : null}
						{!detailLoading && detailRecipients.length === 0 ? (
							<p>No sent recipients recorded yet.</p>
						) : null}
						{!detailLoading && detailRecipients.length > 0 ? (
							<>
								<p className={styles.detailCount}>
									{detailTotal} recipient{detailTotal === 1 ? '' : 's'} with sent outcome
									{detailTotal > DETAIL_RECIPIENTS_PAGE_SIZE
										? ` · showing ${detailRangeStart}–${detailRangeEnd}`
										: ''}
								</p>
								<div className={`table-scroll ${styles.tableScroll}`}>
									<table className="data-table">
										<thead>
											<tr>
												<th>Email</th>
												<th>Outcome</th>
												<th>Sent at</th>
											</tr>
										</thead>
										<tbody>
											{detailRecipients.map((row) => (
												<tr key={`${row.dispatchId}-${row.contactId}`}>
													<td>{row.email}</td>
													<td>{row.outcome}</td>
													<td>{row.sentAt}</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
								{detailTotal > DETAIL_RECIPIENTS_PAGE_SIZE ? (
									<nav className={styles.detailPagination} aria-label="Dispatch recipient pages">
										<span className={styles.detailPageSummary}>
											{detailLoading ? 'Loading page…' : `Page ${detailPage} of ${detailTotalPages}`}
										</span>
										<div className="filter-row">
											<button
												type="button"
												className="btn btn-outline btn-sm"
												disabled={detailPage <= 1 || detailLoading}
												onClick={() => {
													if (selectedDispatchId) {
														void loadDispatchDetail(selectedDispatchId, detailPage - 1);
													}
												}}
											>
												Previous
											</button>
											<button
												type="button"
												className="btn btn-outline btn-sm"
												disabled={detailPage >= detailTotalPages || detailLoading}
												onClick={() => {
													if (selectedDispatchId) {
														void loadDispatchDetail(selectedDispatchId, detailPage + 1);
													}
												}}
											>
												Next
											</button>
										</div>
									</nav>
								) : null}
							</>
						) : null}
					</div>
				) : null}
			</div>

			{composeOpen ? (
				<div
					className="modal-overlay"
					role="presentation"
					onClick={(clickEvent) => {
						if (clickEvent.target === clickEvent.currentTarget) {
							closeCompose();
						}
					}}
				>
					<div
						ref={composeDialogRef}
						className={`modal ${styles.composeModal}`}
						role="dialog"
						aria-modal="true"
						aria-labelledby={composeTitleId}
					>
						<div className={styles.composeHeader}>
							<div>
								<h2 id={composeTitleId}>New campaign</h2>
								<p className={styles.composeSubtitle}>Compose and send to {composeContextLabel}</p>
							</div>
							<button type="button" className={styles.closeButton} onClick={closeCompose} aria-label="Close">
								×
							</button>
						</div>
						{loading ? <LoadingState message="Loading compose options…" /> : null}
						{error ? (
							<div role="alert">
								<p>{error}</p>
								<button type="button" className="btn btn-outline btn-sm" onClick={() => void loadComposeData()}>
									Try again
								</button>
							</div>
						) : null}
						{!loading ? (
							<>
								<div className={styles.section}>
									<div className={styles.sectionHeading}>
										<p className={styles.sectionTitle}>Template</p>
										<p className={styles.sectionHint}>Choose a HubSpot email template to send.</p>
									</div>
									<CatalogPickerSelect
										id="email-template"
										className={styles.templatePicker}
										label="Template"
										value={templateId}
										placeholder="Select template"
										options={templateOptions}
										disabled={templateOptions.length === 0}
										onChange={setTemplateId}
									/>
								</div>

								<div className={styles.section}>
									<p className={styles.sectionTitle}>Recipients</p>
									<div className={styles.segmentToggle} role="group" aria-label="Recipient source">
										<button
											type="button"
											className={styles.segmentButton}
											aria-pressed={audienceSource === 'registered'}
											onClick={() => setAudienceSource('registered')}
										>
											Event attendees
										</button>
										<button
											type="button"
											className={styles.segmentButton}
											aria-pressed={audienceSource === 'hubspot_segment'}
											onClick={() => setAudienceSource('hubspot_segment')}
										>
											HubSpot list
										</button>
									</div>

									{audienceSource === 'registered' ? (
										<>
											<div className={styles.recipientToolbar}>
												<label className={styles.recipientSearch}>
													<span className="material-symbols-outlined" aria-hidden="true">
														search
													</span>
													<input
														type="search"
														placeholder="Search registered attendees"
														value={pickerSearch}
														onChange={(event) => setPickerSearch(event.target.value)}
														aria-label="Search registered attendees"
													/>
												</label>
												<div className={styles.recipientQuickActions}>
													<button type="button" className="btn btn-outline btn-sm" onClick={selectAllRegistered}>
														Select all
													</button>
													<button
														type="button"
														className="btn btn-outline btn-sm"
														onClick={selectCheckedInRegistered}
													>
														Checked-in only
													</button>
													<button type="button" className="btn btn-outline btn-sm" onClick={clearRegisteredSelection}>
														Clear
													</button>
												</div>
											</div>
											{pickerLoading ? (
												<LoadingState message="Loading attendees…" variant="inline" />
											) : pickerAttendees.length === 0 ? (
												<p className={styles.manualHint}>No registered attendees match this view.</p>
											) : (
												<div className={styles.recipientList}>
													{pickerAttendees.map((person) => (
														<label key={person.contactId} className={styles.recipientRow}>
															<input
																type="checkbox"
																checked={isContactSelected(person)}
																onChange={(event) => toggleRegisteredContact(person, event.target.checked)}
																aria-label={`Select ${attendeeDisplayName(person)}`}
															/>
															<span className={styles.recipientAvatar} aria-hidden="true">
																{attendeeInitials(person)}
															</span>
															<span className={styles.recipientInfo}>
																<span className={styles.recipientName}>{attendeeDisplayName(person)}</span>
																<span className={styles.recipientMeta}>
																	{person.company} · {person.attendeeType}
																</span>
															</span>
														</label>
													))}
												</div>
											)}
											{pickerTotal > pickerAttendees.length ? (
												<p className={styles.manualHint}>
													Showing the first {pickerAttendees.length} of {pickerTotal} — search to narrow the list.
												</p>
											) : null}
											<div className={styles.selectionInfo} data-testid="recipient-preview">
												<p className={styles.selectionCount}>
													{previewLoading
														? 'Calculating recipients…'
														: `${recipientCount ?? 0} of ${pickerTotal} attendees selected`}
												</p>
												<p className={styles.selectionMeta}>
													From registered attendees of {composeContextLabel}
												</p>
											</div>
										</>
									) : (
										<div className={styles.segmentPicker}>
											<CatalogPickerSelect
												id="email-segment"
												className={styles.segmentListPicker}
												testId="segment-picker"
												label="HubSpot list"
												value={segmentId}
												placeholder="Select HubSpot list"
												options={segmentOptions}
												disabled={segments.length === 0}
												onChange={setSegmentId}
											/>
											<div className={styles.selectionInfo} data-testid="recipient-preview">
												<p className={styles.selectionCount}>
													{previewLoading
														? 'Calculating recipients…'
														: !segmentId
															? 'Select a HubSpot list'
															: recipientCount === null
																? 'Recipient count unavailable'
																: `${recipientCount} recipient${recipientCount === 1 ? '' : 's'} selected`}
												</p>
												<p className={styles.selectionMeta}>
													{selectedSegmentName
														? `Synced from HubSpot list ${selectedSegmentName}`
														: 'Choose a HubSpot list to sync recipients'}
												</p>
											</div>
										</div>
									)}
								</div>

								<div className={styles.section}>
									<p className={styles.sectionTitle}>Delivery</p>
									<div className={styles.segmentToggle} role="group" aria-label="Delivery timing">
										<button
											type="button"
											className={styles.segmentButton}
											aria-pressed={sendMode === 'now'}
											onClick={() => setSendMode('now')}
										>
											Send now
										</button>
										<button
											type="button"
											className={styles.segmentButton}
											aria-pressed={sendMode === 'schedule'}
											onClick={() => setSendMode('schedule')}
										>
											Schedule
										</button>
									</div>

									{sendMode === 'schedule'
										? renderScheduleFields({
												date: scheduleDate,
												hour: scheduleHour,
												minute: scheduleMinute,
												onDateChange: setScheduleDate,
												onHourChange: setScheduleHour,
												onMinuteChange: setScheduleMinute,
												idPrefix: 'compose-schedule',
											})
										: null}
								</div>

								<div className={`card ${styles.summaryCard}`}>
									<p className={styles.summaryTitle}>Summary</p>
									<dl className={styles.summaryList}>
										<div className={styles.summaryRow}>
											<dt>Event</dt>
											<dd>{eventName ?? '—'}</dd>
										</div>
										<div className={styles.summaryRow}>
											<dt>Template</dt>
											<dd>{selectedTemplateName ?? '—'}</dd>
										</div>
										<div className={styles.summaryRow}>
											<dt>Audience</dt>
											<dd>{audienceSummaryLabel}</dd>
										</div>
										<div className={styles.summaryRow}>
											<dt>Recipients</dt>
											<dd>{previewLoading ? '…' : (recipientCount ?? '—')}</dd>
										</div>
										<div className={styles.summaryRow}>
											<dt>Delivery</dt>
											<dd>
												{sendMode === 'now'
													? 'Send immediately'
													: scheduleSummaryLabel || 'Scheduled'}
											</dd>
										</div>
									</dl>
								</div>

								<div className="modal__actions">
									<button type="button" className="btn btn-outline" onClick={closeCompose} disabled={sending}>
										Cancel
									</button>
									<button
										type="button"
										className="btn btn-primary"
										onClick={() => {
											if (sendMode === 'now') {
												void handleSendNowAndClose();
											} else {
												void handleScheduleAndClose();
											}
										}}
										disabled={
											sending ||
											previewLoading ||
											recipientCount === 0 ||
											(audienceSource === 'hubspot_segment' && !segmentId)
										}
									>
										{sending
											? sendMode === 'now'
												? 'Sending…'
												: 'Scheduling…'
											: sendMode === 'now'
												? 'Send campaign now'
												: scheduleSummaryLabel
													? `Schedule for ${scheduleSummaryLabel}`
													: 'Schedule campaign'}
									</button>
								</div>
							</>
						) : null}
					</div>
				</div>
			) : null}

			{editingDispatch ? (
				<div
					className="modal-overlay"
					role="presentation"
					onClick={closeEditModal}
					onKeyDown={(event) => {
						if (event.key === 'Escape') {
							closeEditModal();
						}
					}}
				>
					<div
						className={`modal ${styles.editModal}`}
						role="dialog"
						aria-modal="true"
						aria-labelledby="edit-dispatch-title"
						onClick={(event) => event.stopPropagation()}
					>
						<h2 id="edit-dispatch-title" className={styles.editTitle}>
							Edit scheduled dispatch
						</h2>
						<p className={styles.editMeta}>{editingDispatch.audienceSummary}</p>
						<div className={styles.field}>
							<label htmlFor="edit-dispatch-name">Dispatch name</label>
							<input
								id="edit-dispatch-name"
								type="text"
								value={editDispatchName}
								onChange={(event) => setEditDispatchName(event.target.value)}
							/>
						</div>
						<CatalogPickerSelect
							id="edit-template"
							className={styles.field}
							label="Template"
							value={editTemplateId}
							placeholder="Select template"
							options={templateOptions}
							disabled={templateOptions.length === 0}
							onChange={setEditTemplateId}
						/>
						{renderScheduleFields({
							date: editScheduleDate,
							hour: editScheduleHour,
							minute: editScheduleMinute,
							onDateChange: setEditScheduleDate,
							onHourChange: setEditScheduleHour,
							onMinuteChange: setEditScheduleMinute,
							idPrefix: 'edit-schedule',
						})}
						<div className="modal__actions">
							<button type="button" className="btn btn-outline" onClick={closeEditModal} disabled={savingEdit}>
								Close
							</button>
							<button type="button" className="btn btn-primary" onClick={() => void handleSaveEdit()} disabled={savingEdit}>
								{savingEdit ? 'Saving…' : 'Save changes'}
							</button>
						</div>
					</div>
				</div>
			) : null}
		</section>
	);
}
