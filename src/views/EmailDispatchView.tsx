import { CatalogPickerSelect } from '../components/CatalogPickerSelect';
import { useConfirm } from '../components/ConfirmModal';
import { LoadingState } from '../components/LoadingState';
import { TopBar } from '../components/TopBar';
import { useToast } from '../components/Toast';
import { useDataService } from '../hooks/useDataService';
import {
	DETAIL_RECIPIENTS_PAGE_SIZE,
	useEmailDispatchWorkflow,
	type CheckedInFilter,
} from '../hooks/useEmailDispatchWorkflow';
import { useCatalogSelection } from '../state/catalogContext';
import type { SliceAttendee } from '../types';
import {
	SCHEDULE_MINUTE_OPTIONS,
	buildTimeSlot,
	formatScheduledDisplay,
	listTimezoneOptions,
} from '../utils/emailSchedule';
import styles from './EmailDispatchView.module.css';

const SCHEDULE_HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const TIMEZONE_OPTIONS = listTimezoneOptions();

const SCHEDULE_HOUR_OPTIONS = SCHEDULE_HOURS.map((hour) => ({
	value: String(hour),
	label: `${buildTimeSlot(hour, 0).slice(0, 2)}:00`,
}));

const TIMEZONE_SELECT_OPTIONS = TIMEZONE_OPTIONS.map((zone) => ({
	value: zone,
	label: zone,
}));

function attendeeDisplayName(person: SliceAttendee): string {
	return `${person.firstName} ${person.lastName}`.trim();
}

export function EmailDispatchView() {
	const data = useDataService();
	const { confirm } = useConfirm();
	const { showToast } = useToast();
	const { programId, evId, programName, eventName } = useCatalogSelection();

	const {
		activeTab,
		setActiveTab,
		sendMode,
		setSendMode,
		scheduleDate,
		setScheduleDate,
		scheduleHour,
		setScheduleHour,
		scheduleMinute,
		setScheduleMinute,
		scheduleTimezone,
		setScheduleTimezone,
		limits,
		segments,
		scheduledDispatches,
		logDispatches,
		templateOptions,
		segmentOptions,
		dispatchName,
		setDispatchName,
		templateId,
		setTemplateId,
		audienceSource,
		setAudienceSource,
		audienceMode,
		setAudienceMode,
		segmentId,
		setSegmentId,
		recipientCount,
		previewLoading,
		manualContactIds,
		toggleManualContact,
		pickerAttendees,
		pickerSearch,
		setPickerSearch,
		pickerFilter,
		setPickerFilter,
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
		editScheduleTimezone,
		setEditScheduleTimezone,
		openEditModal,
		closeEditModal,
		loadComposeData,
		handleSendNow,
		handleScheduleForLater,
		handleSaveEdit,
		handleCancelScheduled,
	} = useEmailDispatchWorkflow({ data, confirm, showToast, programId, evId });

	const title =
		programName && eventName ? `${programName} — ${eventName} — Email` : 'Email dispatch';

	const meta =
		programName && eventName
			? `${programName} · ${eventName}`
			: 'Select Program and Event in the catalog pickers';

	function renderScheduleFields(options: {
		date: string;
		hour: number;
		minute: (typeof SCHEDULE_MINUTE_OPTIONS)[number];
		timezone: string;
		onDateChange: (value: string) => void;
		onHourChange: (value: number) => void;
		onMinuteChange: (value: (typeof SCHEDULE_MINUTE_OPTIONS)[number]) => void;
		onTimezoneChange: (value: string) => void;
		idPrefix: string;
	}) {
		return (
			<div className={styles.scheduleFields}>
				<div className={styles.field}>
					<label htmlFor={`${options.idPrefix}-date`}>Date</label>
					<input
						id={`${options.idPrefix}-date`}
						type="date"
						value={options.date}
						onChange={(event) => options.onDateChange(event.target.value)}
					/>
				</div>
				<CatalogPickerSelect
					id={`${options.idPrefix}-hour`}
					className={styles.field}
					label="Hour"
					value={String(options.hour)}
					placeholder="Select hour"
					options={SCHEDULE_HOUR_OPTIONS}
					onChange={(value) => options.onHourChange(Number(value))}
				/>
				<fieldset className={styles.minuteGrid}>
					<legend>Minute (15-minute grid)</legend>
					<div className={styles.minuteOptions} role="radiogroup" aria-label="Schedule minute">
						{SCHEDULE_MINUTE_OPTIONS.map((minute) => (
							<label key={minute} className={styles.minuteOption}>
								<input
									type="radio"
									name={`${options.idPrefix}-minute`}
									value={minute}
									checked={options.minute === minute}
									onChange={() => options.onMinuteChange(minute)}
								/>
								:{String(minute).padStart(2, '0')}
							</label>
						))}
					</div>
				</fieldset>
				<CatalogPickerSelect
					id={`${options.idPrefix}-timezone`}
					className={styles.field}
					label="Timezone"
					value={options.timezone}
					placeholder="Select timezone"
					options={TIMEZONE_SELECT_OPTIONS}
					onChange={options.onTimezoneChange}
				/>
			</div>
		);
	}

	return (
		<section id="view-email-dispatch" className={styles.view} data-testid="email-dispatch-view">
			<TopBar title={title} meta={meta} />

			<div className={`card ${styles.card}`}>
				<div className={styles.tabList} role="tablist" aria-label="Email dispatch sections">
					<button
						type="button"
						role="tab"
						className={styles.tab}
						aria-selected={activeTab === 'compose'}
						onClick={() => setActiveTab('compose')}
					>
						Compose
					</button>
					<button
						type="button"
						role="tab"
						className={styles.tab}
						aria-selected={activeTab === 'scheduled'}
						onClick={() => setActiveTab('scheduled')}
					>
						Scheduled
					</button>
					<button
						type="button"
						role="tab"
						className={styles.tab}
						aria-selected={activeTab === 'log'}
						onClick={() => setActiveTab('log')}
					>
						Dispatch log
					</button>
				</div>

				{activeTab === 'compose' ? (
					<div className={styles.panel} role="tabpanel">
						{loading ? <LoadingState message="Loading compose options…" /> : null}
						{error ? (
							<div role="alert">
								<p>{error}</p>
								<button type="button" className="btn btn-outline btn-sm" onClick={() => void loadComposeData()}>
									Try again
								</button>
							</div>
						) : null}
						{limits ? (
							<p className={styles.limits}>
								{limits.dispatchUsedThisHour} / {limits.dispatchLimitPerHour} dispatches this hour
								{' · '}
								Large-send confirm at {limits.largeSendThreshold}+ recipients
							</p>
						) : null}
						{!loading ? (
							<>
								<div className={styles.field}>
									<label htmlFor="email-dispatch-name">Dispatch name</label>
									<input
										id="email-dispatch-name"
										type="text"
										value={dispatchName}
										onChange={(event) => setDispatchName(event.target.value)}
										autoComplete="off"
									/>
								</div>
								<CatalogPickerSelect
									id="email-template"
									className={styles.field}
									label="Template"
									value={templateId}
									placeholder="Select template"
									options={templateOptions}
									disabled={templateOptions.length === 0}
									onChange={setTemplateId}
								/>

								<fieldset className={styles.audienceFieldset}>
									<legend>Audience</legend>
									<div className={styles.audienceModes} role="radiogroup" aria-label="Audience source">
										<label className={styles.audienceModeLabel}>
											<input
												type="radio"
												name="audience-source"
												value="registered"
												checked={audienceSource === 'registered'}
												onChange={() => setAudienceSource('registered')}
											/>
											Registered attendees
										</label>
										<label className={styles.audienceModeLabel}>
											<input
												type="radio"
												name="audience-source"
												value="hubspot_segment"
												checked={audienceSource === 'hubspot_segment'}
												onChange={() => setAudienceSource('hubspot_segment')}
											/>
											HubSpot segment
										</label>
									</div>

									{audienceSource === 'registered' ? (
										<>
											<div className={styles.audienceModes} role="radiogroup" aria-label="Registered audience type">
												{(
													[
														['registered_all', 'All registered'],
														['registered_checked_in', 'Checked in only'],
														['registered_not_checked_in', 'Not checked in'],
														['registered_manual', 'Manual selection'],
													] as const
												).map(([mode, label]) => (
													<label key={mode} className={styles.audienceModeLabel}>
														<input
															type="radio"
															name="audience-mode"
															value={mode}
															checked={audienceMode === mode}
															onChange={() => setAudienceMode(mode)}
														/>
														{label}
													</label>
												))}
											</div>

											{audienceMode === 'registered_manual' ? (
												<div className={styles.manualPicker}>
													<p className={styles.manualHint}>
														Select contacts below. Selections stay fixed when you change filters or search.
													</p>
													<div className={styles.toolbar}>
														<div className="form-row">
															{(['all', 'checked-in', 'not-checked-in'] as CheckedInFilter[]).map((filter) => (
																<button
																	key={filter}
																	type="button"
																	className={`btn btn-outline${pickerFilter === filter ? ' active' : ''}`}
																	onClick={() => setPickerFilter(filter)}
																>
																	{filter === 'all'
																		? 'All'
																		: filter === 'checked-in'
																			? 'Checked in'
																			: 'Not checked in'}
																</button>
															))}
														</div>
													</div>
													<input
														type="search"
														className="search-input"
														placeholder="Search name or company…"
														value={pickerSearch}
														onChange={(event) => setPickerSearch(event.target.value)}
														aria-label="Search attendees for manual selection"
													/>
													<p className={styles.selectionCount}>
														{manualContactIds.length} selected
													</p>
													{pickerLoading ? <LoadingState message="Loading attendees…" variant="inline" /> : null}
													{!pickerLoading ? (
														<div className={`table-scroll ${styles.tableScroll}`}>
															<table className="data-table">
																<thead>
																	<tr>
																		<th scope="col" className={styles.colSelect}>
																			Select
																		</th>
																		<th>Name</th>
																		<th>Company</th>
																		<th>Checked in</th>
																	</tr>
																</thead>
																<tbody>
																	{pickerAttendees.length === 0 ? (
																		<tr>
																			<td colSpan={4}>No registered attendees match this view.</td>
																		</tr>
																	) : (
																		pickerAttendees.map((person) => (
																			<tr key={person.contactId}>
																				<td className={styles.colSelect}>
																					<input
																						type="checkbox"
																						checked={manualContactIds.includes(person.contactId)}
																						onChange={(event) =>
																							toggleManualContact(person.contactId, event.target.checked)
																						}
																						aria-label={`Select ${attendeeDisplayName(person)}`}
																					/>
																				</td>
																				<td>{attendeeDisplayName(person)}</td>
																				<td>{person.company}</td>
																				<td>{person.checkedIn ? 'Yes' : 'No'}</td>
																			</tr>
																		))
																	)}
																</tbody>
															</table>
														</div>
													) : null}
												</div>
											) : null}
										</>
									) : (
										<div className={styles.segmentPicker}>
											<p className={styles.manualHint}>
												Segment membership is resolved at preview and send time. Recipients may include
												Contacts who are not registered for this Event.
											</p>
											<CatalogPickerSelect
												id="email-segment"
												className={styles.field}
												testId="segment-picker"
												label="Segment"
												value={segmentId}
												placeholder="Select segment"
												options={segmentOptions}
												disabled={segments.length === 0}
												onChange={setSegmentId}
											/>
										</div>
									)}

									<p className={styles.recipientPreview} aria-live="polite" data-testid="recipient-preview">
										{previewLoading
											? 'Calculating recipient count…'
											: audienceSource === 'hubspot_segment' && !segmentId
												? 'Select a segment to preview recipients'
												: recipientCount === null
													? 'Recipient count unavailable'
													: `${recipientCount} recipient${recipientCount === 1 ? '' : 's'}`}
									</p>
								</fieldset>

								<fieldset className={styles.sendModeFieldset}>
									<legend>Delivery</legend>
									<div className={styles.audienceModes} role="radiogroup" aria-label="Send mode">
										<label className={styles.audienceModeLabel}>
											<input
												type="radio"
												name="send-mode"
												value="now"
												checked={sendMode === 'now'}
												onChange={() => setSendMode('now')}
											/>
											Send now
										</label>
										<label className={styles.audienceModeLabel}>
											<input
												type="radio"
												name="send-mode"
												value="schedule"
												checked={sendMode === 'schedule'}
												onChange={() => setSendMode('schedule')}
											/>
											Schedule for later
										</label>
									</div>

									{sendMode === 'schedule'
										? renderScheduleFields({
												date: scheduleDate,
												hour: scheduleHour,
												minute: scheduleMinute,
												timezone: scheduleTimezone,
												onDateChange: setScheduleDate,
												onHourChange: setScheduleHour,
												onMinuteChange: setScheduleMinute,
												onTimezoneChange: setScheduleTimezone,
												idPrefix: 'compose-schedule',
											})
										: null}

									<div className={styles.actions}>
										{sendMode === 'now' ? (
											<button
												type="button"
												className="btn btn-primary"
												onClick={() => void handleSendNow()}
												disabled={
													sending ||
													previewLoading ||
													recipientCount === 0 ||
													(audienceSource === 'hubspot_segment' && !segmentId)
												}
											>
												Send now
											</button>
										) : (
											<button
												type="button"
												className="btn btn-primary"
												onClick={() => void handleScheduleForLater()}
												disabled={
													sending ||
													previewLoading ||
													recipientCount === 0 ||
													(audienceSource === 'hubspot_segment' && !segmentId)
												}
											>
												Schedule
											</button>
										)}
									</div>
								</fieldset>
							</>
						) : null}
					</div>
				) : null}

				{activeTab === 'scheduled' ? (
					<div className={styles.panel} role="tabpanel">
						{scheduledLockWarnings.length > 0 ? (
							<p className={styles.lockWarningBanner} role="status" data-testid="schedule-lock-warning">
								{scheduledLockWarnings.length === 1
									? `"${scheduledLockWarnings[0]?.dispatchName}" is within 15 minutes of processing — editing and cancelling will be locked soon.`
									: `${scheduledLockWarnings.length} scheduled dispatches are within 15 minutes of processing — editing and cancelling will be locked soon.`}
							</p>
						) : null}
						{scheduledLoading ? <LoadingState message="Loading scheduled dispatches…" /> : null}
						{!scheduledLoading && scheduledDispatches.length === 0 ? (
							<p>No scheduled dispatches yet.</p>
						) : null}
						{!scheduledLoading && scheduledDispatches.length > 0 ? (
							<div className={`table-scroll ${styles.tableScroll}`}>
								<table className="data-table">
									<thead>
										<tr>
											<th>Name</th>
											<th>Template</th>
											<th>Audience</th>
											<th>Scheduled for</th>
											<th>Recipients</th>
											<th>Actions</th>
										</tr>
									</thead>
									<tbody>
										{scheduledDispatches.map((dispatch) => (
											<tr key={dispatch.dispatchId}>
												<td>
													{dispatch.dispatchName}
													{dispatch.lockWarning ? (
														<span className={styles.lockBadge} data-testid="dispatch-lock-badge">
															Locking soon
														</span>
													) : null}
												</td>
												<td>{dispatch.templateName}</td>
												<td>{dispatch.audienceSummary}</td>
												<td>
													{dispatch.scheduledAtUtc && dispatch.timezone
														? formatScheduledDisplay(dispatch.scheduledAtUtc, dispatch.timezone)
														: '—'}
												</td>
												<td>{dispatch.recipientCountPlanned}</td>
												<td>
													<div className={styles.rowActions}>
														<button
															type="button"
															className="btn btn-outline"
															onClick={() => openEditModal(dispatch)}
														>
															Edit
														</button>
														<button
															type="button"
															className="btn btn-outline"
															onClick={() => void handleCancelScheduled(dispatch)}
															disabled={cancellingId === dispatch.dispatchId}
														>
															{cancellingId === dispatch.dispatchId ? 'Cancelling…' : 'Cancel'}
														</button>
													</div>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						) : null}
					</div>
				) : null}

				{activeTab === 'log' ? (
					<div className={styles.panel} role="tabpanel">
						{logLoading ? <LoadingState message="Loading dispatch log…" /> : null}
						{!logLoading && logDispatches.length === 0 ? <p>No dispatches yet.</p> : null}
						{!logLoading && logDispatches.length > 0 ? (
							<>
								<div className={`table-scroll ${styles.tableScroll}`}>
									<table className="data-table">
										<thead>
											<tr>
												<th>Name</th>
												<th>Template</th>
												<th>Audience</th>
												<th>Status</th>
												<th>Sent</th>
											</tr>
										</thead>
										<tbody>
											{logDispatches.map((dispatch) => (
												<tr
													key={dispatch.dispatchId}
													className={
														selectedDispatchId === dispatch.dispatchId ? styles.selectedRow : undefined
													}
												>
													<td>
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
													</td>
													<td>{dispatch.templateName}</td>
													<td>{dispatch.audienceSummary}</td>
													<td>{dispatch.status}</td>
													<td>
														{dispatch.recipientCountSent} / {dispatch.recipientCountPlanned}
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>

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
							</>
						) : null}
					</div>
				) : null}
			</div>

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
							timezone: editScheduleTimezone,
							onDateChange: setEditScheduleDate,
							onHourChange: setEditScheduleHour,
							onMinuteChange: setEditScheduleMinute,
							onTimezoneChange: setEditScheduleTimezone,
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
