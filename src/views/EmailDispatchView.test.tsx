import { useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ConfirmProvider } from '../components/ConfirmModal';
import { ToastProvider } from '../components/Toast';
import { CONFIG } from '../config';
import { SessionProvider, useSession } from '../state/appState';
import { CatalogProvider, useCatalogSelection } from '../state/catalogContext';
import type { Session } from '../types';
import { EmailDispatchView } from './EmailDispatchView';

const programId = 'prog-atlassian-2026';
const eventId = 'ev-mr-2026';

const mockEmailLimits = {
	dispatchLimitPerHour: 10,
	dispatchUsedThisHour: 2,
	largeSendThreshold: 50,
};

const mockTemplates = {
	templates: [{ id: '123456789', name: '48-hour reminder', description: 'Marketing Hub' }],
};

const mockSegments = {
	segments: [
		{ id: '987', name: 'VIP prospects', kind: 'active' as const },
		{ id: '654', name: 'Static invite list', kind: 'static' as const },
	],
};

const mockPreview = vi.fn().mockResolvedValue({ recipientCount: 2 });
const mockCreateEmailDispatch = vi.fn().mockResolvedValue({
	dispatchId: 'dsp-new-001',
	status: 'processing',
	recipientCountPlanned: 2,
	scheduledAtUtc: null,
	timezone: null,
});
const mockFetchEmailDispatches = vi.fn().mockResolvedValue({
	dispatches: [],
	page: 1,
	pageSize: 50,
	total: 0,
});

const mockFetchSliceAttendees = vi.fn().mockResolvedValue({
	attendees: [
		{
			contactId: 'mock-101',
			firstName: 'Jane',
			lastName: 'Doe',
			company: 'Acme Corp',
			email: 'jane.doe@acme.com',
			accountManager: 'owner-1',
			attendeeType: 'customer' as const,
			checkedIn: false,
			checkedInAt: null,
		},
		{
			contactId: 'mock-202',
			firstName: 'Pat',
			lastName: 'Lee',
			company: 'Partner Ltd',
			email: 'pat@partner.com',
			accountManager: 'owner-2',
			attendeeType: 'partner' as const,
			checkedIn: true,
			checkedInAt: null,
		},
	],
	page: 1,
	pageSize: 50,
	total: 2,
});

const mockDataService = {
	fetchEmailLimits: vi.fn().mockResolvedValue(mockEmailLimits),
	fetchEmailTemplates: vi.fn().mockResolvedValue(mockTemplates),
	fetchEmailSegments: vi.fn().mockResolvedValue(mockSegments),
	fetchSliceAttendees: mockFetchSliceAttendees,
	previewEmailDispatch: mockPreview,
	createEmailDispatch: mockCreateEmailDispatch,
	fetchEmailDispatches: mockFetchEmailDispatches,
	fetchEmailDispatchDetail: vi.fn().mockResolvedValue({
		dispatch: {
			dispatchId: 'dsp-xss',
			dispatchName: 'Test',
			templateName: 'Reminder',
			audienceSummary: 'All registered (2)',
			status: 'completed',
			scheduledAtUtc: null,
			timezone: null,
			recipientCountPlanned: 2,
			recipientCountSent: 2,
			createdBy: 'admin@adaptavist.com',
			createdAt: '2026-10-01T10:00:00.000Z',
			completedAt: '2026-10-01T10:05:00.000Z',
		},
		recipients: [
			{
				dispatchId: 'dsp-xss',
				contactId: 'mock-101',
				email: 'jane.doe@acme.com',
				outcome: 'sent' as const,
				sentAt: '2026-10-01T10:05:00.000Z',
			},
		],
		page: 1,
		pageSize: 50,
		total: 1,
	}),
	updateEmailDispatch: vi.fn(),
	cancelEmailDispatch: vi.fn(),
};

vi.mock('../hooks/useDataService', () => ({
	useDataService: () => mockDataService,
}));

const adminSession: Session = {
	token: 't',
	email: 'admin@adaptavist.com',
	role: 'admin',
	expiresAt: '2099-01-01T00:00:00.000Z',
};

function SessionHarness({ session }: { session: Session }) {
	const { setSession } = useSession();
	useEffect(() => {
		setSession(session);
	}, [session, setSession]);
	return null;
}

function CatalogHarness() {
	const { setSelection } = useCatalogSelection();
	useEffect(() => {
		setSelection({
			programId,
			evId: eventId,
			programName: 'Atlassian Event 2026',
			eventName: 'Meeting Room',
			walkInFormUrl: null,
			capacity: null,
		});
	}, [setSelection]);
	return null;
}

function renderEmailDispatchView() {
	return render(
		<MemoryRouter>
			<SessionProvider>
				<CatalogProvider>
					<ConfirmProvider>
						<ToastProvider>
							<SessionHarness session={adminSession} />
							<CatalogHarness />
							<EmailDispatchView />
						</ToastProvider>
					</ConfirmProvider>
				</CatalogProvider>
			</SessionProvider>
		</MemoryRouter>,
	);
}

describe('EmailDispatchView', () => {
	const originalThreshold = CONFIG.EMAIL_SEND_CONFIRM_THRESHOLD;

	beforeEach(() => {
		CONFIG.EMAIL_SEND_CONFIRM_THRESHOLD = 50;
		mockPreview.mockReset();
		mockPreview.mockResolvedValue({ recipientCount: 2 });
		mockCreateEmailDispatch.mockClear();
		mockFetchEmailDispatches.mockClear();
		mockDataService.fetchEmailLimits.mockClear();
		mockDataService.fetchEmailTemplates.mockClear();
		mockDataService.fetchEmailSegments.mockClear();
		mockFetchSliceAttendees.mockClear();
	});

	afterEach(() => {
		CONFIG.EMAIL_SEND_CONFIRM_THRESHOLD = originalThreshold;
	});

	it('renders Compose, Scheduled, and Dispatch log tabs', async () => {
		renderEmailDispatchView();

		await waitFor(() => {
			expect(screen.getByRole('tab', { name: /compose/i })).toBeInTheDocument();
		});
		expect(screen.getByRole('tab', { name: /scheduled/i })).toBeInTheDocument();
		expect(screen.getByRole('tab', { name: /dispatch log/i })).toBeInTheDocument();
	});

	it('shows hourly dispatch limits on the Compose tab', async () => {
		renderEmailDispatchView();

		await waitFor(() => {
			expect(mockDataService.fetchEmailLimits).toHaveBeenCalledWith(programId, eventId);
		});
		expect(screen.getByText(/2\s*\/\s*10\s+dispatches this hour/i)).toBeInTheDocument();
	});

	it('completes Send now without blocking and shows a success toast', async () => {
		renderEmailDispatchView();

		await waitFor(() => {
			expect(screen.getByLabelText(/dispatch name/i)).toBeInTheDocument();
		});

		fireEvent.change(screen.getByLabelText(/dispatch name/i), {
			target: { value: 'QA immediate send' },
		});
		fireEvent.change(screen.getByLabelText(/template/i), {
			target: { value: '123456789' },
		});
		fireEvent.click(screen.getByRole('button', { name: /send now/i }));

		await waitFor(() => {
			expect(mockCreateEmailDispatch).toHaveBeenCalledWith(
				programId,
				eventId,
				expect.objectContaining({
					dispatchName: 'QA immediate send',
					templateId: '123456789',
					audience: { type: 'registered_all' },
				}),
			);
		});
		expect(screen.getByText(/dispatch accepted/i)).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: /sending/i })).not.toBeInTheDocument();
	});

	it('shows a confirm modal before accepting large sends', async () => {
		mockPreview.mockResolvedValue({ recipientCount: 60 });
		CONFIG.EMAIL_SEND_CONFIRM_THRESHOLD = 50;
		renderEmailDispatchView();

		await waitFor(() => {
			expect(screen.getByLabelText(/dispatch name/i)).toBeInTheDocument();
		});

		fireEvent.change(screen.getByLabelText(/dispatch name/i), {
			target: { value: 'Large audience send' },
		});
		fireEvent.change(screen.getByLabelText(/template/i), {
			target: { value: '123456789' },
		});
		fireEvent.click(screen.getByRole('button', { name: /send now/i }));

		await waitFor(() => {
			expect(screen.getByRole('dialog')).toBeInTheDocument();
		});
		const dialog = screen.getByRole('dialog');
		expect(within(dialog).getByText(/60 recipients/i)).toBeInTheDocument();
		expect(mockCreateEmailDispatch).not.toHaveBeenCalled();

		fireEvent.click(screen.getByRole('button', { name: /confirm send/i }));

		await waitFor(() => {
			expect(mockCreateEmailDispatch).toHaveBeenCalled();
		});
	});

	it('shows recipient count preview on Compose tab', async () => {
		renderEmailDispatchView();

		await waitFor(() => {
			expect(screen.getByTestId('recipient-preview')).toHaveTextContent('2 recipients');
		});
		expect(mockPreview).toHaveBeenCalled();
	});

	it('loads HubSpot segments and shows segment name picker', async () => {
		renderEmailDispatchView();

		await waitFor(() => {
			expect(mockDataService.fetchEmailSegments).toHaveBeenCalledWith(programId, eventId);
		});

		fireEvent.click(screen.getByRole('radio', { name: /hubspot segment/i }));

		await waitFor(() => {
			expect(screen.getByTestId('segment-picker')).toBeInTheDocument();
		});
		expect(screen.getByRole('option', { name: /VIP prospects \(Active\)/i })).toBeInTheDocument();
		expect(screen.getByRole('option', { name: /Static invite list \(Static\)/i })).toBeInTheDocument();
	});

	it('previews and sends with hubspot_segment audience', async () => {
		mockPreview.mockResolvedValue({ recipientCount: 24 });
		renderEmailDispatchView();

		await waitFor(() => {
			expect(screen.getByRole('radio', { name: /hubspot segment/i })).toBeInTheDocument();
		});

		fireEvent.click(screen.getByRole('radio', { name: /hubspot segment/i }));

		await waitFor(() => {
			expect(screen.getByTestId('recipient-preview')).toHaveTextContent('24 recipients');
		});
		expect(mockPreview).toHaveBeenCalledWith(
			programId,
			eventId,
			expect.objectContaining({
				audience: { type: 'hubspot_segment', segmentId: '987' },
			}),
		);

		fireEvent.change(screen.getByLabelText(/dispatch name/i), {
			target: { value: 'VIP segment send' },
		});
		fireEvent.click(screen.getByRole('button', { name: /send now/i }));

		await waitFor(() => {
			expect(mockCreateEmailDispatch).toHaveBeenCalledWith(
				programId,
				eventId,
				expect.objectContaining({
					dispatchName: 'VIP segment send',
					audience: { type: 'hubspot_segment', segmentId: '987' },
				}),
			);
		});
	});

	it('sends with checked-in audience when selected', async () => {
		renderEmailDispatchView();

		await waitFor(() => {
			expect(screen.getByLabelText(/checked in only/i)).toBeInTheDocument();
		});

		fireEvent.click(screen.getByRole('radio', { name: /checked in only/i }));

		await waitFor(() => {
			expect(mockPreview).toHaveBeenCalledWith(
				programId,
				eventId,
				expect.objectContaining({
					audience: { type: 'registered_checked_in' },
				}),
			);
		});

		fireEvent.change(screen.getByLabelText(/dispatch name/i), {
			target: { value: 'Checked-in send' },
		});
		fireEvent.click(screen.getByRole('button', { name: /send now/i }));

		await waitFor(() => {
			expect(mockCreateEmailDispatch).toHaveBeenCalledWith(
				programId,
				eventId,
				expect.objectContaining({
					audience: { type: 'registered_checked_in' },
				}),
			);
		});
	});

	it('keeps manual selections when picker filters change', async () => {
		renderEmailDispatchView();

		await waitFor(() => {
			expect(screen.getByRole('radio', { name: /manual selection/i })).toBeInTheDocument();
		});

		fireEvent.click(screen.getByRole('radio', { name: /manual selection/i }));

		await waitFor(() => {
			expect(screen.getByLabelText(/select jane doe/i)).toBeInTheDocument();
		});

		fireEvent.click(screen.getByLabelText(/select jane doe/i));
		expect(screen.getByText('1 selected')).toBeInTheDocument();

		fireEvent.click(screen.getByRole('button', { name: /^Checked in$/i }));

		await waitFor(() => {
			expect(mockFetchSliceAttendees).toHaveBeenCalledWith(
				programId,
				eventId,
				expect.objectContaining({ checkedIn: true }),
			);
		});

		expect(screen.getByText('1 selected')).toBeInTheDocument();
	});

	it('opens dispatch detail from the log tab', async () => {
		mockFetchEmailDispatches.mockResolvedValue({
			dispatches: [
				{
					dispatchId: 'dsp-detail',
					dispatchName: 'QA send',
					templateName: '48-hour reminder',
					audienceSummary: 'All registered (2)',
					status: 'completed',
					scheduledAtUtc: null,
					timezone: null,
					recipientCountPlanned: 2,
					recipientCountSent: 2,
					createdBy: 'admin@adaptavist.com',
					createdAt: '2026-10-01T10:00:00.000Z',
				},
			],
			page: 1,
			pageSize: 50,
			total: 1,
		});

		renderEmailDispatchView();

		await waitFor(() => {
			expect(screen.getByRole('tab', { name: /dispatch log/i })).toBeInTheDocument();
		});
		fireEvent.click(screen.getByRole('tab', { name: /dispatch log/i }));

		await waitFor(() => {
			expect(screen.getByRole('button', { name: 'QA send' })).toBeInTheDocument();
		});
		fireEvent.click(screen.getByRole('button', { name: 'QA send' }));

		await waitFor(() => {
			expect(mockDataService.fetchEmailDispatchDetail).toHaveBeenCalledWith(
				programId,
				eventId,
				'dsp-detail',
				expect.objectContaining({ page: 1, pageSize: 25 }),
			);
		});
		expect(screen.getByText('jane.doe@acme.com')).toBeInTheDocument();
	});

	it('renders hostile dispatch names as plain text', async () => {
		mockFetchEmailDispatches.mockResolvedValue({
			dispatches: [
				{
					dispatchId: 'dsp-xss',
					dispatchName: '<img src=x onerror=alert(1)>',
					templateName: 'Reminder',
					audienceSummary: 'All registered (2)',
					status: 'completed',
					scheduledAtUtc: null,
					timezone: null,
					recipientCountPlanned: 2,
					recipientCountSent: 2,
					createdBy: 'admin@adaptavist.com',
					createdAt: '2026-10-01T10:00:00.000Z',
				},
			],
			page: 1,
			pageSize: 50,
			total: 1,
		});

		renderEmailDispatchView();

		await waitFor(() => {
			expect(screen.getByRole('tab', { name: /dispatch log/i })).toBeInTheDocument();
		});
		fireEvent.click(screen.getByRole('tab', { name: /dispatch log/i }));

		await waitFor(() => {
			expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument();
		});
		expect(document.querySelector('img[src="x"]')).toBeNull();
	});

	it('lists scheduled dispatches with lock warning banner', async () => {
		mockDataService.fetchEmailDispatches.mockImplementation((_programId, _eventId, query) => {
			if (query?.view === 'scheduled') {
				return Promise.resolve({
					dispatches: [
						{
							dispatchId: 'dsp-lock',
							dispatchName: 'Soon send',
							templateName: '48-hour reminder',
							audienceSummary: 'All registered (2)',
							audience: { type: 'registered_all' },
							status: 'pending',
							scheduledAtUtc: new Date(Date.now() + 10 * 60_000).toISOString(),
							timezone: 'Europe/London',
							recipientCountPlanned: 2,
							recipientCountSent: 0,
							createdBy: 'admin@adaptavist.com',
							createdAt: '2026-10-01T10:00:00.000Z',
							lockWarning: true,
						},
					],
					page: 1,
					pageSize: 50,
					total: 1,
				});
			}
			return Promise.resolve({ dispatches: [], page: 1, pageSize: 50, total: 0 });
		});

		renderEmailDispatchView();

		await waitFor(() => {
			expect(screen.getByRole('tab', { name: /scheduled/i })).toBeInTheDocument();
		});
		fireEvent.click(screen.getByRole('tab', { name: /scheduled/i }));

		await waitFor(() => {
			expect(screen.getByTestId('schedule-lock-warning')).toBeInTheDocument();
		});
		expect(screen.getByText('Soon send')).toBeInTheDocument();
		expect(screen.getByTestId('dispatch-lock-badge')).toHaveTextContent(/locking soon/i);
	});

	it('schedules a dispatch from the compose tab', async () => {
		renderEmailDispatchView();

		await waitFor(() => {
			expect(screen.getByLabelText(/dispatch name/i)).toBeInTheDocument();
		});

		fireEvent.change(screen.getByLabelText(/dispatch name/i), {
			target: { value: 'QA scheduled send' },
		});
		fireEvent.click(screen.getByRole('radio', { name: /schedule for later/i }));
		fireEvent.click(screen.getByRole('button', { name: /^Schedule$/i }));

		await waitFor(() => {
			expect(mockCreateEmailDispatch).toHaveBeenCalledWith(
				programId,
				eventId,
				expect.objectContaining({
					dispatchName: 'QA scheduled send',
					scheduledAtUtc: expect.any(String),
					timezone: expect.any(String),
				}),
			);
		});
		expect(screen.getByText(/dispatch scheduled/i)).toBeInTheDocument();
	});

	it('cancels a scheduled dispatch from the scheduled tab', async () => {
		mockDataService.fetchEmailDispatches.mockImplementation((_programId, _eventId, query) => {
			if (query?.view === 'scheduled') {
				return Promise.resolve({
					dispatches: [
						{
							dispatchId: 'dsp-cancel-me',
							dispatchName: 'Cancel me',
							templateName: '48-hour reminder',
							audienceSummary: 'All registered (2)',
							audience: { type: 'registered_all' },
							status: 'pending',
							scheduledAtUtc: '2026-12-15T08:00:00.000Z',
							timezone: 'Europe/London',
							recipientCountPlanned: 2,
							recipientCountSent: 0,
							createdBy: 'admin@adaptavist.com',
							createdAt: '2026-10-01T10:00:00.000Z',
						},
					],
					page: 1,
					pageSize: 50,
					total: 1,
				});
			}
			return Promise.resolve({ dispatches: [], page: 1, pageSize: 50, total: 0 });
		});
		mockDataService.cancelEmailDispatch = vi.fn().mockResolvedValue({
			dispatchId: 'dsp-cancel-me',
			status: 'cancelled',
		});

		renderEmailDispatchView();

		await waitFor(() => {
			expect(screen.getByRole('tab', { name: /scheduled/i })).toBeInTheDocument();
		});
		fireEvent.click(screen.getByRole('tab', { name: /scheduled/i }));

		await waitFor(() => {
			expect(screen.getByRole('button', { name: /^Cancel$/i })).toBeInTheDocument();
		});
		fireEvent.click(screen.getByRole('button', { name: /^Cancel$/i }));

		await waitFor(() => {
			expect(screen.getByRole('dialog')).toBeInTheDocument();
		});
		fireEvent.click(screen.getByRole('button', { name: /cancel dispatch/i }));

		await waitFor(() => {
			expect(mockDataService.cancelEmailDispatch).toHaveBeenCalledWith(programId, eventId, 'dsp-cancel-me');
		});
	});
});
