import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CatalogPickerSelect } from '../components/CatalogPickerSelect';
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
	HubSpotSegmentOption,
	MarketingTemplateOption,
	PatchEmailDispatchBody,
	SliceAttendee,
} from '../types';
import {
	SCHEDULE_MINUTE_OPTIONS,
	buildScheduledAtUtc,
	buildTimeSlot,
	defaultScheduleDate,
	defaultScheduleHour,
	defaultScheduleMinute,
	formatScheduledDisplay,
	listTimezoneOptions,
	parseScheduledAtUtc,
	resolveDefaultTimezone,
} from '../utils/emailSchedule';
import styles from './EmailDispatchView.module.css';

type EmailTab = 'compose' | 'scheduled' | 'log';
type SendMode = 'now' | 'schedule';

type AudienceSource = 'registered' | 'hubspot_segment';

type AudienceMode =
	| 'registered_all'
	| 'registered_checked_in'
	| 'registered_not_checked_in'
	| 'registered_manual';

type CheckedInFilter = 'all' | 'checked-in' | 'not-checked-in';

const MANUAL_PICKER_PAGE_SIZE = 50;
const DETAIL_RECIPIENTS_PAGE_SIZE = 25;
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

function buildAudienceRequest(
	source: AudienceSource,
	mode: AudienceMode,
	contactIds: string[],
	segmentId: string,
): DispatchAudienceRequest {
	if (source === 'hubspot_segment') {
		return { type: 'hubspot_segment', segmentId };
	}
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
	const [sendMode, setSendMode] = useState<SendMode>('now');
	const [scheduleDate, setScheduleDate] = useState(defaultScheduleDate);
	const [scheduleHour, setScheduleHour] = useState(defaultScheduleHour);
	const [scheduleMinute, setScheduleMinute] = useState<(typeof SCHEDULE_MINUTE_OPTIONS)[number]>(defaultScheduleMinute);
	const [scheduleTimezone, setScheduleTimezone] = useState(resolveDefaultTimezone);
	const [limits, setLimits] = useState<EmailDispatchLimits | null>(null);
	const [templates, setTemplates] = useState<MarketingTemplateOption[]>([]);
	const [segments, setSegments] = useState<HubSpotSegmentOption[]>([]);
	const [scheduledDispatches, setScheduledDispatches] = useState<EmailDispatchListItem[]>([]);
	const [logDispatches, setLogDispatches] = useState<EmailDispatchListItem[]>([]);
	const [dispatchName, setDispatchName] = useState('');
	const [templateId, setTemplateId] = useState('');
	const [audienceSource, setAudienceSource] = useState<AudienceSource>('registered');
	const [audienceMode, setAudienceMode] = useState<AudienceMode>('registered_all');
	const [segmentId, setSegmentId] = useState('');
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
	const [detailPage, setDetailPage] = useState(1);
	const [detailLoading, setDetailLoading] = useState(false);
	const [loading, setLoading] = useState(true);
	const [logLoading, setLogLoading] = useState(false);
	const [scheduledLoading, setScheduledLoading] = useState(false);
	const [sending, setSending] = useState(false);
	const [savingEdit, setSavingEdit] = useState(false);
	const [cancellingId, setCancellingId] = useState<string | null>(null);
	const [editingDispatch, setEditingDispatch] = useState<EmailDispatchListItem | null>(null);
	const [editDispatchName, setEditDispatchName] = useState('');
	const [editTemplateId, setEditTemplateId] = useState('');
	const [editScheduleDate, setEditScheduleDate] = useState(defaultScheduleDate);
	const [editScheduleHour, setEditScheduleHour] = useState(defaultScheduleHour);
	const [editScheduleMinute, setEditScheduleMinute] = useState<(typeof SCHEDULE_MINUTE_OPTIONS)[number]>(defaultScheduleMinute);
	const [editScheduleTimezone, setEditScheduleTimezone] = useState(resolveDefaultTimezone);
	const [error, setError] = useState<string | null>(null);

	const manualSelectionRef = useRef(new Set<string>());

	useEffect(() => {
		setDispatchName('');
		setAudienceSource('registered');
		setAudienceMode('registered_all');
		setSegmentId('');
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
		() => buildAudienceRequest(audienceSource, audienceMode, manualContactIds, segmentId),
		[audienceSource, audienceMode, manualContactIds, segmentId],
	);

	const loadComposeData = useCallback(async () => {
		if (!programId || !evId) {
			return;
		}

		setLoading(true);
		setError(null);
		try {
			const [limitsResult, templatesResult, segmentsResult] = await Promise.all([
				data.fetchEmailLimits(programId, evId),
				data.fetchEmailTemplates(programId, evId),
				data.fetchEmailSegments(programId, evId),
			]);
			setLimits(limitsResult);
			setTemplates(templatesResult.templates);
			setTemplateId((current) => current || templatesResult.templates[0]?.id || '');
			setSegments(segmentsResult.segments);
			setSegmentId((current) => current || segmentsResult.segments[0]?.id || '');
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
		if (audienceSource === 'hubspot_segment' && !segmentId) {
			setRecipientCount(null);
			return;
		}
		if (audienceSource === 'registered' && audienceMode === 'registered_manual' && manualContactIds.length === 0) {
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
	}, [audienceMode, audienceRequest, audienceSource, data, evId, manualContactIds.length, programId, segmentId, showToast, templateId]);

	const loadManualPickerAttendees = useCallback(async () => {
		if (!programId || !evId || audienceMode !== 'registered_manual' || audienceSource !== 'registered') {
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
	}, [audienceMode, audienceSource, data, debouncedPickerSearch, evId, pickerFilter, programId, showToast]);

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

	const loadScheduledDispatches = useCallback(async () => {
		if (!programId || !evId) {
			return;
		}

		setScheduledLoading(true);
		try {
			const result = await data.fetchEmailDispatches(programId, evId, { view: 'scheduled' });
			setScheduledDispatches(result.dispatches);
		} catch (err: unknown) {
			showToast(err instanceof Error ? err.message : 'Failed to load scheduled dispatches', 'error');
		} finally {
			setScheduledLoading(false);
		}
	}, [data, evId, programId, showToast]);

	const loadDispatchDetail = useCallback(
		async (dispatchId: string, page: number = 1) => {
			if (!programId || !evId) {
				return;
			}

			setDetailLoading(true);
			try {
				const result = await data.fetchEmailDispatchDetail(programId, evId, dispatchId, {
					page,
					pageSize: DETAIL_RECIPIENTS_PAGE_SIZE,
				});
				setDetailRecipients(result.recipients);
				setDetailTotal(result.total);
				setDetailPage(result.page);
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
		if (activeTab === 'scheduled') {
			void loadScheduledDispatches();
		}
	}, [activeTab, loadLogDispatches, loadScheduledDispatches]);

	useEffect(() => {
		if (!loading && templateId) {
			void loadRecipientPreview();
		}
	}, [loading, templateId, audienceRequest, loadRecipientPreview]);

	useEffect(() => {
		if (audienceSource === 'registered' && audienceMode === 'registered_manual') {
			void loadManualPickerAttendees();
		}
	}, [audienceMode, audienceSource, loadManualPickerAttendees]);

	useEffect(() => {
		if (selectedDispatchId) {
			setDetailPage(1);
			void loadDispatchDetail(selectedDispatchId, 1);
		} else {
			setDetailRecipients([]);
			setDetailTotal(0);
			setDetailPage(1);
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

	function buildPatchBody(): PatchEmailDispatchBody {
		const timeSlot = buildTimeSlot(scheduleHour, scheduleMinute);
		return {
			dispatchName: dispatchName.trim(),
			templateId,
			audience: audienceRequest,
			scheduledAtUtc: buildScheduledAtUtc(scheduleDate, timeSlot, scheduleTimezone),
			timezone: scheduleTimezone,
		};
	}

	function openEditModal(dispatch: EmailDispatchListItem) {
		const timezone = dispatch.timezone ?? resolveDefaultTimezone();
		const parsed =
			dispatch.scheduledAtUtc !== null
				? parseScheduledAtUtc(dispatch.scheduledAtUtc, timezone)
				: { date: defaultScheduleDate(), timeSlot: buildTimeSlot(defaultScheduleHour(), defaultScheduleMinute()) };
		const [hourText, minuteText] = parsed.timeSlot.split(':');

		setEditingDispatch(dispatch);
		setEditDispatchName(dispatch.dispatchName);
		setEditTemplateId(templates.find((entry) => entry.name === dispatch.templateName)?.id ?? templateId);
		setEditScheduleDate(parsed.date);
		setEditScheduleHour(Number(hourText));
		setEditScheduleMinute(Number(minuteText) as (typeof SCHEDULE_MINUTE_OPTIONS)[number]);
		setEditScheduleTimezone(timezone);
	}

	function closeEditModal() {
		setEditingDispatch(null);
	}

	async function handleScheduleForLater() {
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
					title: 'Confirm large scheduled send',
					message: `You are about to schedule "${dispatchName.trim()}" for ${preview.recipientCount} recipients. Proceed?`,
					confirmLabel: 'Confirm schedule',
				});
				if (!confirmed) {
					return;
				}
			}

			const patchBody = buildPatchBody();
			await data.createEmailDispatch(programId, evId, {
				...patchBody,
				idempotencyKey: crypto.randomUUID(),
				...(preview.recipientCount >= threshold ? { largeSendConfirmed: true as const } : {}),
			});

			showToast('Dispatch scheduled.');
			setDispatchName('');
			void loadScheduledDispatches();
			setActiveTab('scheduled');
		} catch (err: unknown) {
			showToast(err instanceof Error ? err.message : 'Schedule failed', 'error');
		} finally {
			setSending(false);
		}
	}

	async function handleSaveEdit() {
		if (!programId || !evId || !editingDispatch || !editDispatchName.trim() || !editTemplateId) {
			showToast('Enter a dispatch name and select a template.', 'error');
			return;
		}

		setSavingEdit(true);
		try {
			const preview = await data.previewEmailDispatch(programId, evId, {
				templateId: editTemplateId,
				audience: editingDispatch.audience ?? audienceRequest,
			});

			if (preview.recipientCount <= 0) {
				showToast('No recipients in the selected audience.', 'error');
				return;
			}

			const threshold = limits?.largeSendThreshold ?? CONFIG.EMAIL_SEND_CONFIRM_THRESHOLD;
			if (preview.recipientCount >= threshold) {
				const confirmed = await confirm({
					title: 'Confirm large scheduled send',
					message: `You are about to schedule "${editDispatchName.trim()}" for ${preview.recipientCount} recipients. Proceed?`,
					confirmLabel: 'Confirm schedule',
				});
				if (!confirmed) {
					return;
				}
			}

			const timeSlot = buildTimeSlot(editScheduleHour, editScheduleMinute);
			const body: PatchEmailDispatchBody = {
				dispatchName: editDispatchName.trim(),
				templateId: editTemplateId,
				audience: editingDispatch.audience ?? audienceRequest,
				scheduledAtUtc: buildScheduledAtUtc(editScheduleDate, timeSlot, editScheduleTimezone),
				timezone: editScheduleTimezone,
				...(preview.recipientCount >= threshold ? { largeSendConfirmed: true as const } : {}),
			};

			await data.updateEmailDispatch(programId, evId, editingDispatch.dispatchId, body);
			showToast('Scheduled dispatch updated.');
			closeEditModal();
			void loadScheduledDispatches();
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : 'Update failed';
			showToast(message.includes('dispatch_locked') ? 'Dispatch is locked and cannot be edited.' : message, 'error');
		} finally {
			setSavingEdit(false);
		}
	}

	async function handleCancelScheduled(dispatch: EmailDispatchListItem) {
		if (!programId || !evId) {
			return;
		}

		const confirmed = await confirm({
			title: 'Cancel scheduled dispatch',
			message: `Cancel "${dispatch.dispatchName}"? This cannot be undone.`,
			confirmLabel: 'Cancel dispatch',
		});
		if (!confirmed) {
			return;
		}

		setCancellingId(dispatch.dispatchId);
		try {
			await data.cancelEmailDispatch(programId, evId, dispatch.dispatchId);
			showToast('Scheduled dispatch cancelled.');
			void loadScheduledDispatches();
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : 'Cancel failed';
			showToast(message.includes('dispatch_locked') ? 'Dispatch is locked and cannot be cancelled.' : message, 'error');
		} finally {
			setCancellingId(null);
		}
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
				...(preview.recipientCount >= threshold ? { largeSendConfirmed: true as const } : {}),
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
	const scheduledLockWarnings = scheduledDispatches.filter((entry) => entry.lockWarning);
	const detailTotalPages = Math.max(1, Math.ceil(detailTotal / DETAIL_RECIPIENTS_PAGE_SIZE));
	const detailRangeStart = detailTotal === 0 ? 0 : (detailPage - 1) * DETAIL_RECIPIENTS_PAGE_SIZE + 1;
	const detailRangeEnd = Math.min(detailPage * DETAIL_RECIPIENTS_PAGE_SIZE, detailTotal);

	const templateOptions = useMemo(
		() => templates.map((template) => ({ value: template.id, label: template.name })),
		[templates],
	);

	const segmentOptions = useMemo(
		() =>
			segments.length === 0
				? [{ value: '', label: 'No segments available' }]
				: segments.map((segment) => ({
						value: segment.id,
						label: `${segment.name} (${segment.kind === 'active' ? 'Active' : 'Static'})`,
					})),
		[segments],
	);

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
