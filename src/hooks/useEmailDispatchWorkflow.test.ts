import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CONFIG } from '../config';
import type { EmailDispatchListItem } from '../types';
import {
	buildAudienceRequest,
	useEmailDispatchWorkflow,
	type EmailDispatchWorkflowDeps,
} from './useEmailDispatchWorkflow';

const programId = 'prog-1';
const evId = 'ev-1';

type WorkflowData = EmailDispatchWorkflowDeps['data'];

/** A fully-resolving fake data service; `recipientCount` drives the large-send gate. */
function makeData(recipientCount = 2, overrides: Partial<WorkflowData> = {}): WorkflowData {
	return {
		fetchEmailLimits: vi
			.fn()
			.mockResolvedValue({ dispatchLimitPerHour: 10, dispatchUsedThisHour: 2, largeSendThreshold: 50 }),
		fetchEmailTemplates: vi
			.fn()
			.mockResolvedValue({ templates: [{ id: 'tpl-1', name: 'Reminder' }] }),
		fetchEmailSegments: vi
			.fn()
			.mockResolvedValue({ segments: [{ id: 'seg-1', name: 'VIP', kind: 'active' as const }] }),
		previewEmailDispatch: vi.fn().mockResolvedValue({ recipientCount }),
		fetchSliceAttendees: vi.fn().mockResolvedValue({ attendees: [], page: 1, pageSize: 50, total: 0 }),
		fetchEmailDispatches: vi.fn().mockResolvedValue({ dispatches: [], page: 1, pageSize: 50, total: 0 }),
		fetchEmailDispatchDetail: vi
			.fn()
			.mockResolvedValue({ recipients: [], page: 1, pageSize: 25, total: 0 }),
		createEmailDispatch: vi.fn().mockResolvedValue({
			dispatchId: 'dsp-new',
			status: 'processing',
			recipientCountPlanned: recipientCount,
			scheduledAtUtc: null,
			timezone: null,
		}),
		updateEmailDispatch: vi.fn().mockResolvedValue({}),
		cancelEmailDispatch: vi.fn().mockResolvedValue({ dispatchId: 'dsp-new', status: 'cancelled' as const }),
		...overrides,
	} as WorkflowData;
}

function scheduledDispatch(overrides: Partial<EmailDispatchListItem> = {}): EmailDispatchListItem {
	return {
		dispatchId: 'dsp-sched',
		dispatchName: 'Reminder blast',
		templateName: 'Reminder',
		audienceSummary: 'All registered (2)',
		audience: { type: 'registered_all' },
		status: 'pending',
		scheduledAtUtc: '2026-12-15T08:00:00.000Z',
		timezone: 'Europe/London',
		recipientCountPlanned: 2,
		recipientCountSent: 0,
		createdBy: 'admin@adaptavist.com',
		createdAt: '2026-10-01T10:00:00.000Z',
		...overrides,
	} as EmailDispatchListItem;
}

function renderWorkflow(deps: Partial<EmailDispatchWorkflowDeps> = {}) {
	const data = deps.data ?? makeData();
	const confirm = deps.confirm ?? vi.fn().mockResolvedValue(true);
	const showToast = deps.showToast ?? vi.fn();
	const result = renderHook(() =>
		useEmailDispatchWorkflow({
			data,
			confirm,
			showToast,
			programId: deps.programId ?? programId,
			evId: deps.evId ?? evId,
		}),
	);
	return { ...result, data, confirm, showToast };
}

/** Render and wait for the initial compose load + first recipient preview to settle. */
async function renderSettled(deps: Partial<EmailDispatchWorkflowDeps> = {}, expectedCount = 2) {
	const harness = renderWorkflow(deps);
	await waitFor(() => expect(harness.result.current.loading).toBe(false));
	await waitFor(() => expect(harness.result.current.recipientCount).toBe(expectedCount));
	return harness;
}

describe('useEmailDispatchWorkflow', () => {
	const originalThreshold = CONFIG.EMAIL_SEND_CONFIRM_THRESHOLD;

	beforeEach(() => {
		CONFIG.EMAIL_SEND_CONFIRM_THRESHOLD = 50;
	});

	afterEach(() => {
		CONFIG.EMAIL_SEND_CONFIRM_THRESHOLD = originalThreshold;
		vi.clearAllMocks();
	});

	describe('buildAudienceRequest', () => {
		it('maps source and mode to the audience request shape', () => {
			expect(buildAudienceRequest('hubspot_segment', 'registered_all', [], 'seg-9')).toEqual({
				type: 'hubspot_segment',
				segmentId: 'seg-9',
			});
			expect(buildAudienceRequest('registered', 'registered_manual', ['c1', 'c2'], '')).toEqual({
				type: 'registered_manual',
				contactIds: ['c1', 'c2'],
			});
			expect(buildAudienceRequest('registered', 'registered_checked_in', [], '')).toEqual({
				type: 'registered_checked_in',
			});
		});
	});

	describe('initial load (draft state)', () => {
		it('loads reference data, defaults the template, and settles into the draft phase', async () => {
			const { result } = await renderSettled();

			expect(result.current.phase).toBe('draft');
			expect(result.current.templateId).toBe('tpl-1');
			expect(result.current.segmentId).toBe('seg-1');
			expect(result.current.recipientCount).toBe(2);
			expect(result.current.limits?.largeSendThreshold).toBe(50);
		});
	});

	describe('send now (draft → submitting → sent)', () => {
		it('creates a dispatch without the large-send flag below the threshold', async () => {
			const { result, data, confirm, showToast } = await renderSettled();

			act(() => result.current.setDispatchName('Small send'));
			await act(async () => {
				await result.current.handleSendNow();
			});

			expect(confirm).not.toHaveBeenCalled();
			expect(data.createEmailDispatch).toHaveBeenCalledWith(
				programId,
				evId,
				expect.objectContaining({ dispatchName: 'Small send', scheduledAtUtc: null }),
			);
			const body = (data.createEmailDispatch as ReturnType<typeof vi.fn>).mock.calls[0][2];
			expect(body).not.toHaveProperty('largeSendConfirmed');
			expect(showToast).toHaveBeenCalledWith('Dispatch accepted — processing in the background.');
			expect(result.current.dispatchName).toBe('');
			expect(result.current.phase).toBe('draft');
		});

		it('blocks send when name is missing and surfaces a validation toast', async () => {
			const { result, data, showToast } = await renderSettled();

			await act(async () => {
				await result.current.handleSendNow();
			});

			expect(data.createEmailDispatch).not.toHaveBeenCalled();
			expect(showToast).toHaveBeenCalledWith('Enter a dispatch name and select a template.', 'error');
		});
	});

	describe('large-send gate (confirming)', () => {
		it('requires confirmation and stamps largeSendConfirmed when confirmed', async () => {
			const confirm = vi.fn().mockResolvedValue(true);
			const { result, data } = await renderSettled({ data: makeData(60), confirm }, 60);

			act(() => result.current.setDispatchName('Big send'));
			await act(async () => {
				await result.current.handleSendNow();
			});

			expect(confirm).toHaveBeenCalledTimes(1);
			expect(confirm).toHaveBeenCalledWith(
				expect.objectContaining({ message: expect.stringContaining('60 recipients') }),
			);
			const body = (data.createEmailDispatch as ReturnType<typeof vi.fn>).mock.calls[0][2];
			expect(body).toMatchObject({ largeSendConfirmed: true });
		});

		it('aborts the send when the large-send confirmation is declined', async () => {
			const confirm = vi.fn().mockResolvedValue(false);
			const { result, data } = await renderSettled({ data: makeData(60), confirm }, 60);

			act(() => result.current.setDispatchName('Big send'));
			await act(async () => {
				await result.current.handleSendNow();
			});

			expect(confirm).toHaveBeenCalledTimes(1);
			expect(data.createEmailDispatch).not.toHaveBeenCalled();
			expect(result.current.phase).toBe('draft');
		});
	});

	describe('schedule for later', () => {
		it('creates a scheduled dispatch and switches to the scheduled tab', async () => {
			const { result, data } = await renderSettled();

			act(() => {
				result.current.setDispatchName('Scheduled blast');
				result.current.setSendMode('schedule');
			});
			await act(async () => {
				await result.current.handleScheduleForLater();
			});

			expect(data.createEmailDispatch).toHaveBeenCalledWith(
				programId,
				evId,
				expect.objectContaining({
					dispatchName: 'Scheduled blast',
					scheduledAtUtc: expect.any(String),
					timezone: expect.any(String),
				}),
			);
			expect(result.current.activeTab).toBe('scheduled');
		});
	});

	describe('editing state', () => {
		it('opens and closes the edit modal', async () => {
			const { result } = await renderSettled();

			act(() => result.current.openEditModal(scheduledDispatch({ dispatchName: 'Editable' })));
			expect(result.current.phase).toBe('editing');
			expect(result.current.editingDispatch?.dispatchName).toBe('Editable');
			expect(result.current.editDispatchName).toBe('Editable');

			act(() => result.current.closeEditModal());
			expect(result.current.editingDispatch).toBeNull();
			expect(result.current.phase).toBe('draft');
		});

		it('maps dispatch_locked errors to a friendly toast on save', async () => {
			const data = makeData(2, {
				updateEmailDispatch: vi.fn().mockRejectedValue(new Error('dispatch_locked')),
			});
			const showToast = vi.fn();
			const { result } = await renderSettled({ data, showToast });

			act(() => result.current.openEditModal(scheduledDispatch()));
			await act(async () => {
				await result.current.handleSaveEdit();
			});

			expect(showToast).toHaveBeenCalledWith('Dispatch is locked and cannot be edited.', 'error');
		});
	});

	describe('cancelling state', () => {
		it('confirms before cancelling a scheduled dispatch', async () => {
			const confirm = vi.fn().mockResolvedValue(true);
			const { result, data } = await renderSettled({ confirm });

			await act(async () => {
				await result.current.handleCancelScheduled(scheduledDispatch({ dispatchId: 'dsp-cancel' }));
			});

			expect(confirm).toHaveBeenCalledTimes(1);
			expect(data.cancelEmailDispatch).toHaveBeenCalledWith(programId, evId, 'dsp-cancel');
		});

		it('does not cancel when the confirmation is declined', async () => {
			const confirm = vi.fn().mockResolvedValue(false);
			const { result, data } = await renderSettled({ confirm });

			await act(async () => {
				await result.current.handleCancelScheduled(scheduledDispatch({ dispatchId: 'dsp-cancel' }));
			});

			expect(data.cancelEmailDispatch).not.toHaveBeenCalled();
		});
	});
});
