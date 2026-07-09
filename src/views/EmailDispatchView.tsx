import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useConfirm } from '../components/ConfirmModal';
import { LoadingState } from '../components/LoadingState';
import { TopBar } from '../components/TopBar';
import { useToast } from '../components/Toast';
import { CONFIG } from '../config';
import { useDataService } from '../hooks/useDataService';
import { useCatalogSelection } from '../state/catalogContext';
import type {
	DispatchAudienceRequest,
	DispatchRecipientRow,
	EmailDispatchLimits,
	EmailDispatchListItem,
	MarketingTemplateOption,
	SliceAttendee,
} from '../types';
import styles from './EmailDispatchView.module.css';

type EmailTab = 'compose' | 'scheduled' | 'log';

type AudienceMode =
	| 'registered_all'
	| 'registered_checked_in'
	| 'registered_not_checked_in'
	| 'registered_manual';

type CheckedInFilter = 'all' | 'checked-in' | 'not-checked-in';

const MANUAL_PICKER_PAGE_SIZE = 50;

function buildAudienceRequest(mode: AudienceMode, contactIds: string[]): DispatchAudienceRequest {
	if (mode === 'registered_manual') {
		return { type: 'registered_manual', contactIds };
	}
	return { type: mode };
}

function attendeeDisplayName(person: SliceAttendee): string {
	return `${person.firstName} ${person.lastName}`.trim();
}

export function EmailDispatchView() {
	const data = useDataService();
	const { confirm } = useConfirm();
	const { showToast } = useToast();
	const { programId, evId, programName, eventName } = useCatalogSelection();

	const [activeTab, setActiveTab] = useState<EmailTab>('compose');
	const [limits, setLimits] = useState<EmailDispatchLimits | null>(null);
	const [templates, setTemplates] = useState<MarketingTemplateOption[]>([]);
	const [logDispatches, setLogDispatches] = useState<EmailDispatchListItem[]>([]);
	const [dispatchName, setDispatchName] = useState('');
	const [templateId, setTemplateId] = useState('');
	const [audienceMode, setAudienceMode] = useState<AudienceMode>('registered_all');
	const [recipientCount, setRecipientCount] = useState<number | null>(null);
	const [previewLoading, setPreviewLoading] = useState(false);
	const [manualContactIds, setManualContactIds] = useState<string[]>([]);
	const [pickerAttendees, setPickerAttendees] = useState<SliceAttendee[]>([]);
	const [pickerSearch, setPickerSearch] = useState('');
	const [debouncedPickerSearch, setDebouncedPickerSearch] = useState('');
	const [pickerFilter, setPickerFilter] = useState<CheckedInFilter>('all');
	const [pickerLoading, setPickerLoading] = useState(false);
	const [selectedDispatchId, setSelectedDispatchId] = useState<string | null>(null);
	const [detailRecipients, setDetailRecipients] = useState<DispatchRecipientRow[]>([]);
	const [detailTotal, setDetailTotal] = useState(0);
	const [detailLoading, setDetailLoading] = useState(false);
	const [loading, setLoading] = useState(true);
	const [logLoading, setLogLoading] = useState(false);
	const [sending, setSending] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const manualSelectionRef = useRef(new Set<string>());

	useEffect(() => {
		setDispatchName('');
		setAudienceMode('registered_all');
		setManualContactIds([]);
		manualSelectionRef.current = new Set();
		setRecipientCount(null);
		setSelectedDispatchId(null);
	}, [programId, evId]);

	useEffect(() => {
		const handle = window.setTimeout(() => {
			setDebouncedPickerSearch(pickerSearch);
		}, 300);
		return () => window.clearTimeout(handle);
	}, [pickerSearch]);

	const audienceRequest = useMemo(
		() => buildAudienceRequest(audienceMode, manualContactIds),
		[audienceMode, manualContactIds],
	);

	const loadComposeData = useCallback(async () => {
		if (!programId || !evId) {
			return;
		}

		setLoading(true);
		setError(null);
		try {
			const [limitsResult, templatesResult] = await Promise.all([
				data.fetchEmailLimits(programId, evId),
				data.fetchEmailTemplates(programId, evId),
			]);
			setLimits(limitsResult);
			setTemplates(templatesResult.templates);
			setTemplateId((current) => current || templatesResult.templates[0]?.id || '');
		} catch (err: unknown) {
			setError(err instanceof Error ? err.message : 'Failed to load email compose data');
		} finally {
			setLoading(false);
		}
	}, [data, evId, programId]);

	const loadRecipientPreview = useCallback(async () => {
		if (!programId || !evId || !templateId) {
			return;
		}
		if (audienceMode === 'registered_manual' && manualContactIds.length === 0) {
			setRecipientCount(0);
			return;
		}

		setPreviewLoading(true);
		try {
			const preview = await data.previewEmailDispatch(programId, evId, {
				templateId,
				audience: audienceRequest,
			});
			setRecipientCount(preview.recipientCount);
		} catch (err: unknown) {
			setRecipientCount(null);
			showToast(err instanceof Error ? err.message : 'Failed to preview audience', 'error');
		} finally {
			setPreviewLoading(false);
		}
	}, [audienceMode, audienceRequest, data, evId, manualContactIds.length, programId, showToast, templateId]);

	const loadManualPickerAttendees = useCallback(async () => {
		if (!programId || !evId || audienceMode !== 'registered_manual') {
			return;
		}

		setPickerLoading(true);
		const checkedIn =
			pickerFilter === 'checked-in' ? true : pickerFilter === 'not-checked-in' ? false : undefined;

		try {
			const result = await data.fetchSliceAttendees(programId, evId, {
				q: debouncedPickerSearch || undefined,
				checkedIn,
				page: 1,
				pageSize: MANUAL_PICKER_PAGE_SIZE,
			});
			setPickerAttendees(result.attendees);
		} catch (err: unknown) {
			showToast(err instanceof Error ? err.message : 'Failed to load attendees', 'error');
		} finally {
			setPickerLoading(false);
		}
	}, [audienceMode, data, debouncedPickerSearch, evId, pickerFilter, programId, showToast]);

	const loadLogDispatches = useCallback(async () => {
		if (!programId || !evId) {
			return;
		}

		setLogLoading(true);
		try {
			const result = await data.fetchEmailDispatches(programId, evId, { view: 'log' });
			setLogDispatches(result.dispatches);
		} catch (err: unknown) {
			showToast(err instanceof Error ? err.message : 'Failed to load dispatch log', 'error');
		} finally {
			setLogLoading(false);
		}
	}, [data, evId, programId, showToast]);

	const loadDispatchDetail = useCallback(
		async (dispatchId: string) => {
			if (!programId || !evId) {
				return;
			}

			setDetailLoading(true);
			try {
				const result = await data.fetchEmailDispatchDetail(programId, evId, dispatchId, {
					page: 1,
					pageSize: 50,
				});
				setDetailRecipients(result.recipients);
				setDetailTotal(result.total);
			} catch (err: unknown) {
				showToast(err instanceof Error ? err.message : 'Failed to load dispatch detail', 'error');
			} finally {
				setDetailLoading(false);
			}
		},
		[data, evId, programId, showToast],
	);

	useEffect(() => {
		void loadComposeData();
	}, [loadComposeData]);

	useEffect(() => {
		if (activeTab === 'log') {
			void loadLogDispatches();
		}
	}, [activeTab, loadLogDispatches]);

	useEffect(() => {
		if (!loading && templateId) {
			void loadRecipientPreview();
		}
	}, [loading, templateId, audienceRequest, loadRecipientPreview]);

	useEffect(() => {
		if (audienceMode === 'registered_manual') {
			void loadManualPickerAttendees();
		}
	}, [audienceMode, loadManualPickerAttendees]);

	useEffect(() => {
		if (selectedDispatchId) {
			void loadDispatchDetail(selectedDispatchId);
		} else {
			setDetailRecipients([]);
			setDetailTotal(0);
		}
	}, [selectedDispatchId, loadDispatchDetail]);

	function toggleManualContact(contactId: string, selected: boolean) {
		const next = new Set(manualSelectionRef.current);
		if (selected) {
			next.add(contactId);
		} else {
			next.delete(contactId);
		}
		manualSelectionRef.current = next;
		setManualContactIds([...next]);
	}

	async function handleSendNow() {
		if (!programId || !evId || !templateId || !dispatchName.trim()) {
			showToast('Enter a dispatch name and select a template.', 'error');
			return;
		}

		if (recipientCount === 0) {
			showToast('No recipients in the selected audience.', 'error');
			return;
		}

		setSending(true);
		try {
			const preview = await data.previewEmailDispatch(programId, evId, {
				templateId,
				audience: audienceRequest,
			});

			if (preview.recipientCount === 0) {
				showToast('No recipients in the selected audience.', 'error');
				return;
			}

			const threshold = limits?.largeSendThreshold ?? CONFIG.EMAIL_SEND_CONFIRM_THRESHOLD;
			if (preview.recipientCount >= threshold) {
				const confirmed = await confirm({
					title: 'Confirm large send',
					message: `You are about to send "${dispatchName.trim()}" to ${preview.recipientCount} recipients. Proceed?`,
					confirmLabel: 'Confirm send',
				});
				if (!confirmed) {
					return;
				}
			}

			await data.createEmailDispatch(programId, evId, {
				dispatchName: dispatchName.trim(),
				templateId,
				audience: audienceRequest,
				scheduledAtUtc: null,
				timezone: null,
				idempotencyKey: crypto.randomUUID(),
			});

			showToast('Dispatch accepted — processing in the background.');
			setDispatchName('');
			void loadLogDispatches();
		} catch (err: unknown) {
			showToast(err instanceof Error ? err.message : 'Send failed', 'error');
		} finally {
			setSending(false);
		}
	}

	const title =
		programName && eventName ? `${programName} — ${eventName} — Email` : 'Email dispatch';

	const meta =
		programName && eventName
			? `${programName} · ${eventName}`
			: 'Select Program and Event in the catalog pickers';

	const selectedDispatch = logDispatches.find((entry) => entry.dispatchId === selectedDispatchId) ?? null;

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
						{error ? <p role="alert">{error}</p> : null}
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
								<div className={styles.field}>
									<label htmlFor="email-template">Template</label>
									<select
										id="email-template"
										value={templateId}
										onChange={(event) => setTemplateId(event.target.value)}
									>
										{templates.map((template) => (
											<option key={template.id} value={template.id}>
												{template.name}
											</option>
										))}
									</select>
								</div>

								<fieldset className={styles.audienceFieldset}>
									<legend>Audience — registered attendees</legend>
									<div className={styles.audienceModes} role="radiogroup" aria-label="Audience type">
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

									<p className={styles.recipientPreview} aria-live="polite" data-testid="recipient-preview">
										{previewLoading
											? 'Calculating recipient count…'
											: recipientCount === null
												? 'Recipient count unavailable'
												: `${recipientCount} recipient${recipientCount === 1 ? '' : 's'}`}
									</p>
								</fieldset>

								<div className={styles.actions}>
									<button
										type="button"
										className="btn btn-primary"
										onClick={() => void handleSendNow()}
										disabled={sending || previewLoading || recipientCount === 0}
									>
										Send now
									</button>
								</div>
							</>
						) : null}
					</div>
				) : null}

				{activeTab === 'scheduled' ? (
					<div className={styles.panel} role="tabpanel">
						<p>Scheduled dispatches will appear here.</p>
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
											</>
										) : null}
									</div>
								) : null}
							</>
						) : null}
					</div>
				) : null}
			</div>
		</section>
	);
}
