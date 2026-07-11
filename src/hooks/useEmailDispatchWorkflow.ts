import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ConfirmOptions } from '../components/ConfirmModal';
import { CONFIG } from '../config';
import type { DataService } from '../services/dataService';
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
	defaultScheduleSlot,
	parseScheduledAtUtc,
	resolveDefaultTimezone,
} from '../utils/emailSchedule';

export type EmailTab = 'compose' | 'scheduled' | 'log';
export type SendMode = 'now' | 'schedule';
export type AudienceSource = 'registered' | 'hubspot_segment';
export type AudienceMode =
	| 'registered_all'
	| 'registered_checked_in'
	| 'registered_not_checked_in'
	| 'registered_manual';
export type CheckedInFilter = 'all' | 'checked-in' | 'not-checked-in';
export type ScheduleMinute = (typeof SCHEDULE_MINUTE_OPTIONS)[number];

/**
 * Coarse workflow phase derived from the underlying flags. Not consumed by the
 * view — it exists so the state machine can be asserted directly in unit tests.
 * When several flags overlap (e.g. saving an edit), the most specific phase wins.
 */
export type EmailWorkflowPhase =
	| 'loading'
	| 'draft'
	| 'previewing'
	| 'submitting'
	| 'editing'
	| 'savingEdit'
	| 'cancelling';

const MANUAL_PICKER_PAGE_SIZE = 50;
export const DETAIL_RECIPIENTS_PAGE_SIZE = 25;

/** Data-service methods the email-dispatch workflow depends on. */
type EmailWorkflowDataService = Pick<
	DataService,
	| 'fetchEmailLimits'
	| 'fetchEmailTemplates'
	| 'fetchEmailSegments'
	| 'previewEmailDispatch'
	| 'fetchSliceAttendees'
	| 'fetchEmailDispatches'
	| 'fetchEmailDispatchDetail'
	| 'createEmailDispatch'
	| 'updateEmailDispatch'
	| 'cancelEmailDispatch'
>;

export interface EmailDispatchWorkflowDeps {
	data: EmailWorkflowDataService;
	confirm: (options: ConfirmOptions) => Promise<boolean>;
	showToast: (message: string, type?: 'success' | 'error', durationMs?: number) => void;
	programId: string | null;
	evId: string | null;
}

export function buildAudienceRequest(
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

/**
 * Owns the email-dispatch workflow: compose/preview/send/schedule/edit/cancel
 * state plus the invariants (large-send confirmation, schedule lock warnings,
 * lock-on-processing error handling). The view renders the returned state and
 * calls the returned actions; all data access stays on the injected service.
 */
export function useEmailDispatchWorkflow(deps: EmailDispatchWorkflowDeps) {
	const { data, confirm, showToast, programId, evId } = deps;

	const [activeTab, setActiveTab] = useState<EmailTab>('compose');
	const [sendMode, setSendMode] = useState<SendMode>('now');
	const [scheduleDate, setScheduleDate] = useState(() => defaultScheduleSlot().date);
	const [scheduleHour, setScheduleHour] = useState(() => defaultScheduleSlot().hour);
	const [scheduleMinute, setScheduleMinute] = useState<ScheduleMinute>(() => defaultScheduleSlot().minute);
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
	const [editScheduleDate, setEditScheduleDate] = useState(() => defaultScheduleSlot().date);
	const [editScheduleHour, setEditScheduleHour] = useState(() => defaultScheduleSlot().hour);
	const [editScheduleMinute, setEditScheduleMinute] = useState<ScheduleMinute>(() => defaultScheduleSlot().minute);
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
		const fallbackSlot = defaultScheduleSlot();
		const parsed =
			dispatch.scheduledAtUtc !== null
				? parseScheduledAtUtc(dispatch.scheduledAtUtc, timezone)
				: { date: fallbackSlot.date, timeSlot: buildTimeSlot(fallbackSlot.hour, fallbackSlot.minute) };
		const [hourText, minuteText] = parsed.timeSlot.split(':');

		setEditingDispatch(dispatch);
		setEditDispatchName(dispatch.dispatchName);
		setEditTemplateId(templates.find((entry) => entry.name === dispatch.templateName)?.id ?? templateId);
		setEditScheduleDate(parsed.date);
		setEditScheduleHour(Number(hourText));
		setEditScheduleMinute(Number(minuteText) as ScheduleMinute);
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

	const phase: EmailWorkflowPhase = loading
		? 'loading'
		: savingEdit
			? 'savingEdit'
			: editingDispatch
				? 'editing'
				: cancellingId
					? 'cancelling'
					: sending
						? 'submitting'
						: previewLoading
							? 'previewing'
							: 'draft';

	return {
		phase,
		// Tabs and delivery mode
		activeTab,
		setActiveTab,
		sendMode,
		setSendMode,
		// Compose schedule fields
		scheduleDate,
		setScheduleDate,
		scheduleHour,
		setScheduleHour,
		scheduleMinute,
		setScheduleMinute,
		scheduleTimezone,
		setScheduleTimezone,
		// Loaded reference data
		limits,
		segments,
		scheduledDispatches,
		logDispatches,
		templateOptions,
		segmentOptions,
		// Compose form
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
		// Manual attendee picker
		pickerAttendees,
		pickerSearch,
		setPickerSearch,
		pickerFilter,
		setPickerFilter,
		pickerLoading,
		// Dispatch detail
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
		// Loading and mutation flags
		loading,
		logLoading,
		scheduledLoading,
		sending,
		savingEdit,
		cancellingId,
		error,
		// Scheduled lock warnings
		scheduledLockWarnings,
		// Edit modal
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
		// Actions
		loadComposeData,
		handleSendNow,
		handleScheduleForLater,
		handleSaveEdit,
		handleCancelScheduled,
	};
}

export type EmailDispatchWorkflow = ReturnType<typeof useEmailDispatchWorkflow>;
