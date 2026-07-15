import { useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ConfirmProvider } from '../components/ConfirmModal';
import { ToastProvider } from '../components/Toast';
import { CONFIG } from '../config';
import { SessionProvider, useSession } from '../state/appState';
import type { Session } from '../types';
import { EmailDispatchView } from './EmailDispatchView';

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

const mockFetchEventAttendees = vi.fn().mockResolvedValue({
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

const mockFetchCatalog = vi.fn().mockResolvedValue({
	events: [
		{
			id: eventId,
			programId: 'prog-atlassian-2026',
			name: 'Meeting Room',
			start: '2026-10-01T09:00:00.000Z',
			status: 'active',
			publishState: 'published',
			archived: false,
			walkInFormUrl: null,
		},
	],
	programs: [{ id: 'prog-atlassian-2026', name: 'Atlassian Event 2026', archived: false }],
});

const mockDataService = {
	fetchCatalog: mockFetchCatalog,
	fetchEmailLimits: vi.fn().mockResolvedValue(mockEmailLimits),
	fetchEmailTemplates: vi.fn().mockResolvedValue(mockTemplates),
	fetchEmailSegments: vi.fn().mockResolvedValue(mockSegments),
	fetchEventAttendees: mockFetchEventAttendees,
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

function renderEmailDispatchView() {
	return render(
		<MemoryRouter initialEntries={[`/events/${eventId}/email`]}>
			<SessionProvider>
				<ConfirmProvider>
					<ToastProvider>
						<SessionHarness session={adminSession} />
						<Routes>
							<Route path="/events/:eventId/:module" element={<EmailDispatchView />} />
						</Routes>
					</ToastProvider>
				</ConfirmProvider>
			</SessionProvider>
		</MemoryRouter>,
	);
}

async function openCompose() {
	fireEvent.click(await screen.findByRole('button', { name: '+ New campaign' }));
	await screen.findByRole('dialog', { name: 'New campaign' });
}

describe('EmailDispatchView', () => {
	const originalThreshold = CONFIG.EMAIL_SEND_CONFIRM_THRESHOLD;

	beforeEach(() => {
		CONFIG.EMAIL_SEND_CONFIRM_THRESHOLD = 50;
		mockPreview.mockReset();
		mockPreview.mockResolvedValue({ recipientCount: 2 });
		mockCreateEmailDispatch.mockClear();
		mockFetchEmailDispatches.mockClear();
		mockFetchEmailDispatches.mockResolvedValue({ dispatches: [], page: 1, pageSize: 50, total: 0 });
		mockDataService.fetchEmailLimits.mockClear();
		mockDataService.fetchEmailTemplates.mockClear();
		mockDataService.fetchEmailSegments.mockClear();
		mockFetchEventAttendees.mockClear();
	});

	afterEach(() => {
		CONFIG.EMAIL_SEND_CONFIRM_THRESHOLD = originalThreshold;
	});

	it('renders the Email schedule list with a New campaign button (no tabs)', async () => {
		renderEmailDispatchView();

		await waitFor(() => {
			expect(screen.getByRole('heading', { name: 'Email schedule' })).toBeInTheDocument();
		});
		expect(screen.getByRole('button', { name: '+ New campaign' })).toBeInTheDocument();
		expect(screen.queryByRole('tab')).not.toBeInTheDocument();
	});

	it('shows Sent/Scheduled/Drafts stat tiles', async () => {
		renderEmailDispatchView();

		await waitFor(() => {
			expect(screen.getByText('Sent')).toBeInTheDocument();
		});
		expect(screen.getByText('Scheduled')).toBeInTheDocument();
		expect(screen.getByText('Drafts')).toBeInTheDocument();
	});

	it('shows an empty-schedule message with a create-first-campaign action', async () => {
		renderEmailDispatchView();

		expect(await screen.findByText('No campaigns yet for this Event.')).toBeInTheDocument();
		const createFirst = screen.getByRole('button', { name: '+ Create your first campaign' });

		fireEvent.click(createFirst);
		expect(await screen.findByRole('dialog', { name: 'New campaign' })).toBeInTheDocument();
	});

	it('loads the hourly limits and shows the event-context header subtitle', async () => {
		renderEmailDispatchView();
		await openCompose();

		await waitFor(() => {
			expect(mockDataService.fetchEmailLimits).toHaveBeenCalledWith(eventId);
		});
		expect(
			screen.getByText('Compose and send to Atlassian Event 2026 — Meeting Room'),
		).toBeInTheDocument();
	});

	it('auto-names the dispatch from the template, completes Send now, and closes', async () => {
		renderEmailDispatchView();
		await openCompose();

		const sendButton = await screen.findByRole('button', { name: 'Send campaign now' });
		await waitFor(() => {
			expect(sendButton).toBeEnabled();
		});
		fireEvent.click(sendButton);

		await waitFor(() => {
			expect(mockCreateEmailDispatch).toHaveBeenCalledWith(
				eventId,
				expect.objectContaining({
					dispatchName: '48-hour reminder',
					templateId: '123456789',
					audience: { type: 'registered_all' },
				}),
			);
		});
		expect(screen.getByText(/dispatch accepted/i)).toBeInTheDocument();
		expect(screen.queryByRole('dialog', { name: 'New campaign' })).not.toBeInTheDocument();
	});

	it('cancelling the compose modal does not send anything', async () => {
		renderEmailDispatchView();
		await openCompose();

		fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

		expect(screen.queryByRole('dialog', { name: 'New campaign' })).not.toBeInTheDocument();
		expect(mockCreateEmailDispatch).not.toHaveBeenCalled();
	});

	it('shows a confirm modal before accepting large sends', async () => {
		mockPreview.mockResolvedValue({ recipientCount: 60 });
		CONFIG.EMAIL_SEND_CONFIRM_THRESHOLD = 50;
		renderEmailDispatchView();
		await openCompose();

		const sendButton = await screen.findByRole('button', { name: 'Send campaign now' });
		await waitFor(() => {
			expect(sendButton).toBeEnabled();
		});
		fireEvent.click(sendButton);

		await waitFor(() => {
			expect(screen.getByRole('dialog', { name: 'Confirm large send' })).toBeInTheDocument();
		});
		const dialog = screen.getByRole('dialog', { name: 'Confirm large send' });
		expect(within(dialog).getByText(/60 recipients/i)).toBeInTheDocument();
		expect(mockCreateEmailDispatch).not.toHaveBeenCalled();

		fireEvent.click(screen.getByRole('button', { name: /confirm send/i }));

		await waitFor(() => {
			expect(mockCreateEmailDispatch).toHaveBeenCalled();
		});
	});

	it('shows recipient count preview in the compose modal', async () => {
		renderEmailDispatchView();
		await openCompose();

		await waitFor(() => {
			expect(screen.getByTestId('recipient-preview')).toHaveTextContent('2 of 2 attendees selected');
		});
		expect(mockPreview).toHaveBeenCalled();
	});

	it('loads HubSpot segments and shows segment name picker', async () => {
		const user = userEvent.setup();
		renderEmailDispatchView();
		await openCompose();

		await waitFor(() => {
			expect(mockDataService.fetchEmailSegments).toHaveBeenCalledWith(eventId);
		});

		fireEvent.click(screen.getByRole('button', { name: 'HubSpot list' }));

		await waitFor(() => {
			expect(screen.getByTestId('segment-picker')).toBeInTheDocument();
		});

		await user.click(screen.getByTestId('segment-picker'));

		expect(screen.getByRole('option', { name: /VIP prospects \(Active\)/i })).toBeInTheDocument();
		expect(screen.getByRole('option', { name: /Static invite list \(Static\)/i })).toBeInTheDocument();
	});

	it('previews and sends with hubspot_segment audience', async () => {
		mockPreview.mockResolvedValue({ recipientCount: 24 });
		renderEmailDispatchView();
		await openCompose();

		await waitFor(() => {
			expect(screen.getByRole('button', { name: 'HubSpot list' })).toBeInTheDocument();
		});

		fireEvent.click(screen.getByRole('button', { name: 'HubSpot list' }));

		await waitFor(() => {
			expect(screen.getByTestId('recipient-preview')).toHaveTextContent('24 recipients selected');
			expect(screen.getByTestId('recipient-preview')).toHaveTextContent(
				'Synced from HubSpot list VIP prospects',
			);
		});
		expect(screen.queryByText(/Segment membership is resolved/i)).not.toBeInTheDocument();
		expect(mockPreview).toHaveBeenCalledWith(
				eventId,
			expect.objectContaining({
				audience: { type: 'hubspot_segment', segmentId: '987' },
			}),
		);

		fireEvent.click(screen.getByRole('button', { name: 'Send campaign now' }));

		await waitFor(() => {
			expect(mockCreateEmailDispatch).toHaveBeenCalledWith(
				eventId,
				expect.objectContaining({
					dispatchName: '48-hour reminder',
					audience: { type: 'hubspot_segment', segmentId: '987' },
				}),
			);
		});
	});

	it('sends with checked-in audience via the Checked-in only quick action', async () => {
		renderEmailDispatchView();
		await openCompose();

		fireEvent.click(await screen.findByRole('button', { name: 'Checked-in only' }));

		await waitFor(() => {
			expect(mockPreview).toHaveBeenCalledWith(
				eventId,
				expect.objectContaining({
					audience: { type: 'registered_checked_in' },
				}),
			);
		});

		fireEvent.click(screen.getByRole('button', { name: 'Send campaign now' }));

		await waitFor(() => {
			expect(mockCreateEmailDispatch).toHaveBeenCalledWith(
				eventId,
				expect.objectContaining({
					audience: { type: 'registered_checked_in' },
				}),
			);
		});
	});

	it('shows the attendee checklist by default and supports clear + hand-pick', async () => {
		renderEmailDispatchView();
		await openCompose();

		// Everyone is selected by default (registered_all → all boxes checked).
		await waitFor(() => {
			expect(screen.getByLabelText(/select jane doe/i)).toBeInTheDocument();
		});
		expect(screen.getByLabelText(/select jane doe/i)).toBeChecked();
		expect(screen.getByLabelText(/select pat lee/i)).toBeChecked();

		// Clear deselects everyone.
		fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
		expect(screen.getByLabelText(/select jane doe/i)).not.toBeChecked();

		// Hand-picking a single attendee produces a manual audience payload.
		fireEvent.click(screen.getByLabelText(/select jane doe/i));
		expect(screen.getByLabelText(/select jane doe/i)).toBeChecked();

		await waitFor(() => {
			expect(mockPreview).toHaveBeenCalledWith(
				eventId,
				expect.objectContaining({
					audience: { type: 'registered_manual', contactIds: ['mock-101'] },
				}),
			);
		});
	});

	it('opens dispatch detail from the schedule list for a sent dispatch', async () => {
		mockDataService.fetchEmailDispatches.mockImplementation((_eventId, query) => {
			if (query?.view === 'log') {
				return Promise.resolve({
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
			}
			return Promise.resolve({ dispatches: [], page: 1, pageSize: 50, total: 0 });
		});

		renderEmailDispatchView();

		await waitFor(() => {
			expect(screen.getByRole('button', { name: 'QA send' })).toBeInTheDocument();
		});
		fireEvent.click(screen.getByRole('button', { name: 'QA send' }));

		await waitFor(() => {
			expect(mockDataService.fetchEmailDispatchDetail).toHaveBeenCalledWith(
				eventId,
				'dsp-detail',
				expect.objectContaining({ page: 1, pageSize: 25 }),
			);
		});
		expect(screen.getByText('jane.doe@acme.com')).toBeInTheDocument();
	});

	it('renders hostile dispatch names as plain text', async () => {
		mockDataService.fetchEmailDispatches.mockImplementation((_eventId, query) => {
			if (query?.view === 'log') {
				return Promise.resolve({
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
			}
			return Promise.resolve({ dispatches: [], page: 1, pageSize: 50, total: 0 });
		});

		renderEmailDispatchView();

		await waitFor(() => {
			expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument();
		});
		expect(document.querySelector('img[src="x"]')).toBeNull();
	});

	it('lists scheduled dispatches in the unified schedule with a lock warning banner', async () => {
		mockDataService.fetchEmailDispatches.mockImplementation((_eventId, query) => {
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
			expect(screen.getByTestId('schedule-lock-warning')).toBeInTheDocument();
		});
		expect(screen.getByText('Soon send')).toBeInTheDocument();
		expect(screen.getByTestId('dispatch-lock-badge')).toHaveTextContent(/locking soon/i);
	});

	it('schedules a dispatch from the compose modal and closes it', async () => {
		renderEmailDispatchView();
		await openCompose();

		fireEvent.click(await screen.findByRole('button', { name: 'Schedule' }));

		expect(screen.getByRole('button', { name: /^Time:/i })).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: /^Timezone:/i })).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: /^Hour:/i })).not.toBeInTheDocument();

		const scheduleButton = await screen.findByRole('button', { name: /^Schedule for .+ at \d{1,2}:\d{2} (AM|PM)$/ });
		fireEvent.click(scheduleButton);

		await waitFor(() => {
			expect(mockCreateEmailDispatch).toHaveBeenCalledWith(
				eventId,
				expect.objectContaining({
					dispatchName: '48-hour reminder',
					scheduledAtUtc: expect.any(String),
					timezone: expect.any(String),
				}),
			);
		});
		expect(screen.getByText(/dispatch scheduled/i)).toBeInTheDocument();
		expect(screen.queryByRole('dialog', { name: 'New campaign' })).not.toBeInTheDocument();
	});

	it('cancels a scheduled dispatch from the unified schedule list', async () => {
		mockDataService.fetchEmailDispatches.mockImplementation((_eventId, query) => {
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
			expect(screen.getByRole('button', { name: /^Cancel$/i })).toBeInTheDocument();
		});
		fireEvent.click(screen.getByRole('button', { name: /^Cancel$/i }));

		await waitFor(() => {
			expect(screen.getByRole('dialog', { name: 'Cancel scheduled dispatch' })).toBeInTheDocument();
		});
		fireEvent.click(screen.getByRole('button', { name: /cancel dispatch/i }));

		await waitFor(() => {
			expect(mockDataService.cancelEmailDispatch).toHaveBeenCalledWith(eventId, 'dsp-cancel-me');
		});
	});

	it('renders under the darkAurora theme with no hardcoded inline hex colors', async () => {
		document.documentElement.setAttribute('data-theme', 'darkAurora');

		try {
			const { container } = renderEmailDispatchView();

			await waitFor(() => {
				expect(screen.getByRole('heading', { name: 'Email schedule' })).toBeInTheDocument();
			});
			expect(screen.getByRole('button', { name: '+ New campaign' })).toBeInTheDocument();

			expect(container.innerHTML).not.toMatch(/style="[^"]*#[0-9a-fA-F]{3,8}/i);
		} finally {
			document.documentElement.removeAttribute('data-theme');
		}
	});
});
