import { createElement, useEffect } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, MemoryRouter, Route, RouterProvider, Routes } from 'react-router-dom';
import { ConfirmProvider } from '../components/ConfirmModal';
import { ToastProvider } from '../components/Toast';
import { SessionProvider, useSession } from '../state/appState';
import type { Session, SliceAttendee } from '../types';
import { CheckInView } from './CheckInView';

const {
	mockFetchEventAttendees,
	mockConfirmCheckIn,
	mockUndoCheckIn,
	mockCheckInScan,
	mockFetchEventCapacityStatus,
	mockAdjustCapacity,
	mockFetchCatalog,
	mockDataService,
} = vi.hoisted(() => {
	const fetchEventAttendees = vi.fn().mockResolvedValue({
		attendees: [
			{
				contactId: 'mock-101',
				firstName: 'Jane',
				lastName: 'Doe',
				email: 'jane.doe@acme.com',
				company: 'Acme Corp',
				accountManager: 'owner-1',
				attendeeType: 'customer',
				checkedIn: false,
				checkedInAt: null,
			},
			{
				contactId: 'mock-202',
				firstName: 'Pat',
				lastName: 'Lee',
				email: 'pat@partner.com',
				company: 'Partner Ltd',
				accountManager: 'owner-2',
				attendeeType: 'partner',
				checkedIn: true,
				checkedInAt: null,
			},
		],
		page: 1,
		pageSize: 50,
		total: 2,
	});
	const confirmCheckIn = vi.fn().mockResolvedValue({
		contactId: 'mock-101',
		checkedIn: true,
		alreadyCheckedIn: false,
		attendeeType: 'customer',
	});
	const undoCheckIn = vi.fn().mockResolvedValue({
		contactId: 'mock-202',
		checkedIn: false,
		alreadyCheckedIn: true,
		attendeeType: 'partner',
	});
	const checkInScan = vi.fn().mockResolvedValue({
		programId: '_standalone',
		eventId: 'ev-mr-2026',
		contact: {
			contactId: 'mock-101',
			firstName: 'Jane',
			lastName: 'Doe',
			company: 'Acme Corp',
			email: 'jane.doe@acme.com',
			accountManager: 'owner-1',
			attendeeType: 'customer',
			checkedIn: false,
		},
	});
	const fetchEventCapacityStatus = vi.fn().mockResolvedValue({
		programId: '_standalone',
		eventId: 'ev-mr-2026',
		capacity: 100,
		checkedInCount: 1,
		departureCount: 0,
		liveAttendance: 1,
	});
	const adjustCapacity = vi.fn().mockResolvedValue({
		programId: '_standalone',
		eventId: 'ev-mr-2026',
		capacity: 100,
		checkedInCount: 1,
		departureCount: 1,
		liveAttendance: 0,
	});
	const fetchCatalog = vi.fn().mockResolvedValue({
		events: [
			{
				id: 'ev-mr-2026',
				programId: 'prog-atlassian-2026',
				name: 'Meeting Room',
				start: '2026-10-01T09:00:00.000Z',
				status: 'active',
				publishState: 'published',
				archived: false,
				walkInFormUrl: null,
				capacity: 100,
			},
		],
		programs: [{ id: 'prog-atlassian-2026', name: 'Atlassian Event 2026', archived: false }],
	});

	return {
		mockFetchEventAttendees: fetchEventAttendees,
		mockConfirmCheckIn: confirmCheckIn,
		mockUndoCheckIn: undoCheckIn,
		mockCheckInScan: checkInScan,
		mockFetchEventCapacityStatus: fetchEventCapacityStatus,
		mockAdjustCapacity: adjustCapacity,
		mockFetchCatalog: fetchCatalog,
		mockDataService: {
			fetchEventAttendees,
			confirmCheckIn,
			undoCheckIn,
			checkInScan,
			fetchEventCapacityStatus,
			adjustCapacity,
			fetchCatalog,
		},
	};
});

const mockSliceAttendees: SliceAttendee[] = [
	{
		contactId: 'mock-101',
		firstName: 'Jane',
		lastName: 'Doe',
		email: 'jane.doe@acme.com',
		company: 'Acme Corp',
		accountManager: 'owner-1',
		attendeeType: 'customer',
		checkedIn: false,
		checkedInAt: null,
	},
	{
		contactId: 'mock-202',
		firstName: 'Pat',
		lastName: 'Lee',
		email: 'pat@partner.com',
		company: 'Partner Ltd',
		accountManager: 'owner-2',
		attendeeType: 'partner',
		checkedIn: true,
		checkedInAt: null,
	},
];

vi.mock('../hooks/useDataService', () => ({
	useDataService: () => mockDataService,
}));

vi.mock('../components/CheckInQrPanel', () => ({
	CheckInQrPanel: ({ onDecode }: { onDecode: (jwt: string) => void }) =>
		createElement(
			'button',
			{ type: 'button', onClick: () => onDecode('mock-jwt-token') },
			'Simulate QR scan',
		),
}));

const adminSession: Session = {
	token: 't',
	email: 'admin@adaptavist.com',
	role: 'admin',
	expiresAt: '2099-01-01T00:00:00.000Z',
};

const staffSession: Session = {
	...adminSession,
	role: 'staff',
};

const WALK_IN_URL = 'https://share.hsforms.com/1a2b3c4d-e5f6-7890-abcd-ef1234567890';

function SessionHarness({ session }: { session: Session }) {
	const { setSession } = useSession();
	useEffect(() => {
		setSession(session);
	}, [session, setSession]);
	return null;
}

function renderCheckIn(
	session: Session = adminSession,
	options: { walkInFormUrl?: string | null; eventId?: string | null; capacity?: number | null } = {},
) {
	const eventId = options.eventId === undefined ? 'ev-mr-2026' : options.eventId;
	const walkInFormUrl = options.walkInFormUrl ?? null;
	const capacity = options.capacity === undefined ? 100 : options.capacity;

	mockFetchCatalog.mockResolvedValue({
		events: eventId
			? [
					{
						id: eventId,
						programId: 'prog-atlassian-2026',
						name: 'Meeting Room',
						start: '2026-10-01T09:00:00.000Z',
						status: 'active',
						publishState: 'published',
						archived: false,
						walkInFormUrl,
						capacity,
					},
				]
			: [],
		programs: [{ id: 'prog-atlassian-2026', name: 'Atlassian Event 2026', archived: false }],
	});

	const path = eventId ? `/events/${eventId}/check-in` : '/events';
	return render(
		<MemoryRouter initialEntries={[path]}>
			<ToastProvider>
				<ConfirmProvider>
					<SessionProvider>
						<SessionHarness session={session} />
						<Routes>
							<Route path="/events/:eventId/:module" element={<CheckInView />} />
							<Route path="*" element={<CheckInView />} />
						</Routes>
					</SessionProvider>
				</ConfirmProvider>
			</ToastProvider>
		</MemoryRouter>,
	);
}

describe('CheckInView', () => {
	beforeEach(() => {
		vi.useRealTimers();
		mockFetchEventAttendees.mockClear();
		mockConfirmCheckIn.mockClear();
		mockUndoCheckIn.mockClear();
		mockCheckInScan.mockClear();
		mockFetchEventCapacityStatus.mockClear();
		mockAdjustCapacity.mockClear();
		mockUndoCheckIn.mockResolvedValue({
			contactId: 'mock-202',
			checkedIn: false,
			alreadyCheckedIn: true,
			attendeeType: 'partner',
		});
		mockFetchEventAttendees.mockResolvedValue({
			attendees: mockSliceAttendees,
			page: 1,
			pageSize: 50,
			total: 2,
		});
		mockConfirmCheckIn.mockResolvedValue({
			contactId: 'mock-101',
			checkedIn: true,
			alreadyCheckedIn: false,
			attendeeType: 'customer',
		});
		mockCheckInScan.mockResolvedValue({
			programId: 'prog-atlassian-2026',
			eventId: 'ev-mr-2026',
			contact: {
				contactId: 'mock-101',
				firstName: 'Jane',
				lastName: 'Doe',
				company: 'Acme Corp',
				email: 'jane.doe@acme.com',
				accountManager: 'owner-1',
				attendeeType: 'customer',
				checkedIn: false,
			},
		});
		mockFetchEventCapacityStatus.mockResolvedValue({
			programId: 'prog-atlassian-2026',
			eventId: 'ev-mr-2026',
			capacity: 100,
			checkedInCount: 1,
			departureCount: 0,
			liveAttendance: 1,
		});
		mockAdjustCapacity.mockResolvedValue({
			programId: 'prog-atlassian-2026',
			eventId: 'ev-mr-2026',
			capacity: 100,
			checkedInCount: 1,
			departureCount: 1,
			liveAttendance: 0,
		});
	});

	it('offers Undo check-in for already-checked-in search results', async () => {
		const user = userEvent.setup();
		renderCheckIn();

		fireEvent.change(screen.getByLabelText('Search attendees for check-in'), {
			target: { value: 'Pat' },
		});

		await waitFor(() => {
			expect(screen.getByText('Pat Lee')).toBeInTheDocument();
		});

		await user.click(screen.getByRole('button', { name: 'Undo check-in' }));
		await user.click(
			within(await screen.findByRole('dialog', { name: 'Undo check-in?' })).getByRole('button', {
				name: 'Undo check-in',
			}),
		);

		await waitFor(() => {
			expect(mockUndoCheckIn).toHaveBeenCalledWith('ev-mr-2026', 'mock-202');
		});
		expect(await screen.findByText(/check-in undone/i)).toBeInTheDocument();
	});

	it('opens a confirm-check-in modal from the search results and confirms', async () => {
		renderCheckIn();

		await waitFor(() => {
			expect(
				screen.getByRole('heading', { name: 'Check-in' }),
			).toBeInTheDocument();
		});

		expect(screen.getByText(/Type at least 2 characters to search registrants/i)).toBeInTheDocument();
		expect(mockFetchEventAttendees).not.toHaveBeenCalled();

		fireEvent.change(screen.getByLabelText('Search attendees for check-in'), {
			target: { value: 'Jane' },
		});

		await waitFor(() => {
			expect(screen.getByText('Jane Doe')).toBeInTheDocument();
		});

		expect(mockFetchEventAttendees).toHaveBeenCalledWith('ev-mr-2026', {
			q: 'Jane',
			page: 1,
			pageSize: 200,
		});

		fireEvent.click(screen.getAllByRole('button', { name: 'Check in' })[0]!);

		const dialog = await screen.findByRole('dialog', { name: 'Confirm check-in' });
		expect(dialog).toHaveTextContent('Name');
		expect(dialog).toHaveTextContent('Company');
		expect(dialog).toHaveTextContent('Email');
		expect(dialog).toHaveTextContent('Account manager');
		expect(dialog).toHaveTextContent('Attendee type');
		expect(dialog).toHaveTextContent('Current status');
		expect(dialog).toHaveTextContent('jane.doe@acme.com');
		expect(dialog).toHaveTextContent('owner-1');
		expect(dialog).toHaveTextContent('Registered');
		expect(dialog).not.toHaveTextContent(/auto-checks in/i);

		fireEvent.click(screen.getByRole('button', { name: 'Confirm check-in' }));

		await waitFor(() => {
			expect(mockConfirmCheckIn).toHaveBeenCalledWith('ev-mr-2026', 'mock-101');
			expect(screen.getByRole('status')).toHaveTextContent('Jane Doe checked in successfully.');
		});
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
	});

	it('offers Undo check-in in the confirm modal when scan finds an already-checked-in contact', async () => {
		mockCheckInScan.mockResolvedValue({
			programId: '_standalone',
			eventId: 'ev-mr-2026',
			contact: {
				contactId: 'mock-202',
				firstName: 'Pat',
				lastName: 'Lee',
				company: 'Partner Ltd',
				email: 'pat@partner.com',
				accountManager: 'owner-2',
				attendeeType: 'partner',
				checkedIn: true,
			},
		});

		renderCheckIn();

		fireEvent.click(await screen.findByRole('button', { name: 'Start scanner' }));
		await screen.findByRole('dialog', { name: 'Scan QR code' });
		fireEvent.click(screen.getByRole('button', { name: 'Simulate QR scan' }));

		const dialog = await screen.findByRole('dialog', { name: 'Already checked in' });
		expect(dialog).toHaveTextContent('Checked in');
		expect(screen.getByRole('button', { name: 'Undo check-in' })).toBeEnabled();
		expect(mockConfirmCheckIn).not.toHaveBeenCalled();
	});

	it('cancelling the confirm modal does not check the attendee in', async () => {
		renderCheckIn();

		fireEvent.change(screen.getByLabelText('Search attendees for check-in'), {
			target: { value: 'Jane' },
		});
		await waitFor(() => expect(screen.getByText('Jane Doe')).toBeInTheDocument());

		fireEvent.click(screen.getAllByRole('button', { name: 'Check in' })[0]!);
		await screen.findByRole('dialog', { name: 'Confirm check-in' });

		fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
		expect(mockConfirmCheckIn).not.toHaveBeenCalled();
	});

	it('opens the scanner modal and calls checkInScan when the QR panel decodes a token', async () => {
		renderCheckIn();

		await waitFor(() => {
			expect(screen.getByRole('button', { name: 'Start scanner' })).toBeInTheDocument();
		});
		expect(screen.queryByRole('button', { name: 'Simulate QR scan' })).not.toBeInTheDocument();

		fireEvent.click(screen.getByRole('button', { name: 'Start scanner' }));

		await screen.findByRole('dialog', { name: 'Scan QR code' });
		fireEvent.click(screen.getByRole('button', { name: 'Simulate QR scan' }));

		await waitFor(() => {
			expect(mockCheckInScan).toHaveBeenCalledWith('ev-mr-2026', 'mock-jwt-token');
		});
		expect(screen.queryByRole('dialog', { name: 'Scan QR code' })).not.toBeInTheDocument();
		expect(await screen.findByRole('dialog', { name: 'Confirm check-in' })).toHaveTextContent(
			'jane.doe@acme.com',
		);
	});

	it('closes the scanner modal without side effects', async () => {
		renderCheckIn();

		fireEvent.click(await screen.findByRole('button', { name: 'Start scanner' }));
		await screen.findByRole('dialog', { name: 'Scan QR code' });

		fireEvent.click(screen.getByRole('button', { name: 'Close' }));

		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
		expect(mockCheckInScan).not.toHaveBeenCalled();
	});

	it('shows empty state when no eventId is in the URL', async () => {
		renderCheckIn(adminSession, { eventId: null });

		expect(
			await screen.findByText(/Open an event from Programs & Events or the working-event picker/i),
		).toBeInTheDocument();
	});

	it('redirects non-admin users to the events list', async () => {
		render(
			<MemoryRouter initialEntries={['/events/check-in']}>
				<ToastProvider>
					<ConfirmProvider>
						<SessionProvider>
							<Routes>
								<Route path="/events" element={<div>Events list</div>} />
								<Route
									path="/events/check-in"
									element={
										<>
											<SessionHarness session={staffSession} />
											<CheckInView />
										</>
									}
								/>
							</Routes>
						</SessionProvider>
					</ConfirmProvider>
				</ToastProvider>
			</MemoryRouter>,
		);

		expect(await screen.findByText('Events list')).toBeInTheDocument();
	});

	it('renders hostile attendee data as text, never as markup (XSS guard)', async () => {
		const hostile = '"><img src=x onerror=alert(1)>';
		mockFetchEventAttendees.mockResolvedValue({
			attendees: [{ ...mockSliceAttendees[0]!, firstName: hostile, lastName: '' }],
			page: 1,
			pageSize: 200,
			total: 1,
		});

		renderCheckIn();

		fireEvent.change(screen.getByLabelText('Search attendees for check-in'), {
			target: { value: 'img' },
		});

		await waitFor(() => {
			expect(screen.getByText(hostile)).toBeInTheDocument();
		});

		expect(document.querySelector('img')).toBeNull();
	});

	it('keeps the check-in layout mounted while typing in search', async () => {
		renderCheckIn();

		await waitFor(() => {
			expect(
				screen.getByRole('heading', { name: 'Check-in' }),
			).toBeInTheDocument();
		});
		expect(screen.getByLabelText('Search attendees for check-in')).toBeInTheDocument();

		const callsBeforeSearch = mockFetchEventAttendees.mock.calls.length;

		fireEvent.change(screen.getByLabelText('Search attendees for check-in'), {
			target: { value: 'Jane' },
		});

		expect(screen.queryByText('Loading check-in…')).not.toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Start scanner' })).toBeInTheDocument();

		await waitFor(() => {
			expect(mockFetchEventAttendees.mock.calls.length).toBeGreaterThan(callsBeforeSearch);
		});
		expect(mockFetchEventAttendees).toHaveBeenLastCalledWith('ev-mr-2026', {
			q: 'Jane',
			page: 1,
			pageSize: 200,
		});
	});

	it('searches across the full registrant list via server-side q, not page-1 browse', async () => {
		mockFetchEventAttendees.mockResolvedValue({
			attendees: [mockSliceAttendees[1]!],
			page: 1,
			pageSize: 200,
			total: 1,
		});

		renderCheckIn();

		fireEvent.change(screen.getByLabelText('Search attendees for check-in'), {
			target: { value: 'Zimmerman' },
		});

		await waitFor(() => {
			expect(mockFetchEventAttendees).toHaveBeenCalledWith('ev-mr-2026', {
				q: 'Zimmerman',
				page: 1,
				pageSize: 200,
			});
			expect(screen.getByText('Pat Lee')).toBeInTheDocument();
		});
	});

	it('does not overflow body horizontally at 375px viewport', async () => {
		Object.defineProperty(document.body, 'clientWidth', { configurable: true, value: 375 });
		document.documentElement.style.width = '375px';

		renderCheckIn();

		await waitFor(() => {
			expect(
				screen.getByRole('heading', { name: 'Check-in' }),
			).toBeInTheDocument();
		});

		expect(document.body.scrollWidth).toBeLessThanOrEqual(document.body.clientWidth + 1);
	});

	it('sizes the scan/walk-in action buttons at >=44px', async () => {
		renderCheckIn();

		await waitFor(() => {
			expect(screen.getByRole('button', { name: 'Start scanner' })).toBeInTheDocument();
		});

		for (const button of [
			screen.getByRole('button', { name: 'Start scanner' }),
			screen.getByRole('button', { name: '+ Add walk-in' }),
		]) {
			expect(parseFloat(getComputedStyle(button).minHeight)).toBeGreaterThanOrEqual(44);
		}
	});

	it('renders under the darkAurora theme with no hardcoded inline hex colors', async () => {
		document.documentElement.setAttribute('data-theme', 'darkAurora');

		try {
			const { container } = renderCheckIn();

			await waitFor(() => {
				expect(
					screen.getByRole('heading', { name: 'Check-in' }),
				).toBeInTheDocument();
			});

			expect(container.innerHTML).not.toMatch(/style="[^"]*#[0-9a-fA-F]{3,8}/i);
		} finally {
			document.documentElement.removeAttribute('data-theme');
		}
	});

	describe('walk-in registration modal', () => {
		it('opens the walk-in modal with staff hint and iframe', async () => {
			renderCheckIn(adminSession, { walkInFormUrl: WALK_IN_URL });

			await waitFor(() => {
				expect(screen.getByRole('button', { name: '+ Add walk-in' })).toBeInTheDocument();
			});

			fireEvent.click(screen.getByRole('button', { name: '+ Add walk-in' }));

			const dialog = await screen.findByRole('dialog', { name: 'Walk-in registration' });
			expect(dialog).toHaveTextContent(/will not appear on the roster immediately/i);
			expect(dialog).toHaveTextContent(/does not check them in/i);

			const iframe = screen.getByTitle('HubSpot walk-in form');
			expect(iframe).toHaveAttribute('src', WALK_IN_URL);
			expect(screen.getByLabelText('Search attendees for check-in')).toBeInTheDocument();
		});

		it('shows empty state when walk-in URL is not configured', async () => {
			renderCheckIn(adminSession, { walkInFormUrl: null });

			fireEvent.click(await screen.findByRole('button', { name: '+ Add walk-in' }));

			expect(
				await screen.findByText(/No walk-in form URL is configured for this Event/i),
			).toBeInTheDocument();
			expect(screen.getByRole('button', { name: 'Open Event Details' })).toBeInTheDocument();
			expect(screen.queryByTitle('HubSpot walk-in form')).not.toBeInTheDocument();
		});

		it('blocks iframe when walk-in URL fails the HubSpot allowlist', async () => {
			renderCheckIn(adminSession, { walkInFormUrl: 'https://evil.example.com/form' });

			fireEvent.click(await screen.findByRole('button', { name: '+ Add walk-in' }));

			expect(await screen.findByRole('alert')).toHaveTextContent(
				'Walk-in form URL must be a HubSpot form URL',
			);
			expect(screen.queryByTitle('HubSpot walk-in form')).not.toBeInTheDocument();
		});

		it('closing the walk-in modal unmounts the iframe', async () => {
			renderCheckIn(adminSession, { walkInFormUrl: WALK_IN_URL });

			fireEvent.click(await screen.findByRole('button', { name: '+ Add walk-in' }));
			await screen.findByTitle('HubSpot walk-in form');

			fireEvent.click(screen.getByRole('button', { name: 'Close' }));

			expect(screen.queryByTitle('HubSpot walk-in form')).not.toBeInTheDocument();
			expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
		});

		it('resets any open modal when the URL eventId changes', async () => {
			mockFetchCatalog.mockResolvedValue({
				events: [
					{
						id: 'ev-mr-2026',
						programId: 'prog-atlassian-2026',
						name: 'Meeting Room',
						start: '2026-10-01T09:00:00.000Z',
						status: 'active',
						publishState: 'published',
						archived: false,
						walkInFormUrl: WALK_IN_URL,
						capacity: 100,
					},
					{
						id: 'ev-other-2026',
						programId: 'prog-atlassian-2026',
						name: 'Other Room',
						start: '2026-10-02T09:00:00.000Z',
						status: 'active',
						publishState: 'published',
						archived: false,
						walkInFormUrl: null,
						capacity: null,
					},
				],
				programs: [{ id: 'prog-atlassian-2026', name: 'Atlassian Event 2026', archived: false }],
			});

			const router = createMemoryRouter(
				[
					{
						path: '/events/:eventId/:module',
						element: (
							<>
								<SessionHarness session={adminSession} />
								<CheckInView />
							</>
						),
					},
				],
				{ initialEntries: ['/events/ev-mr-2026/check-in'] },
			);

			render(
				<ToastProvider>
					<ConfirmProvider>
						<SessionProvider>
							<RouterProvider router={router} />
						</SessionProvider>
					</ConfirmProvider>
				</ToastProvider>,
			);

			fireEvent.click(await screen.findByRole('button', { name: '+ Add walk-in' }));
			expect(screen.getByTitle('HubSpot walk-in form')).toBeInTheDocument();

			await router.navigate('/events/ev-other-2026/check-in');

			await waitFor(() => {
				expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
			});
			expect(screen.queryByTitle('HubSpot walk-in form')).not.toBeInTheDocument();
		});
	});

	describe('capacity indicator', () => {
		it('loads and shows live capacity for admin', async () => {
			renderCheckIn();

			await waitFor(() => {
				expect(mockFetchEventCapacityStatus).toHaveBeenCalledWith('ev-mr-2026');
			});
			expect(screen.getByLabelText('Live capacity: 1 of 100 on site, 1 percent full')).toBeInTheDocument();
		});

		it('refetches capacity after confirm check-in', async () => {
			renderCheckIn();

			await waitFor(() => {
				expect(mockFetchEventCapacityStatus).toHaveBeenCalledTimes(1);
			});

			fireEvent.change(screen.getByLabelText('Search attendees for check-in'), {
				target: { value: 'Jane' },
			});

			await waitFor(() => {
				expect(screen.getByText('Jane Doe')).toBeInTheDocument();
			});

			fireEvent.click(screen.getAllByRole('button', { name: 'Check in' })[0]!);
			await screen.findByRole('dialog', { name: 'Confirm check-in' });

			fireEvent.click(screen.getByRole('button', { name: 'Confirm check-in' }));

			await waitFor(() => {
				expect(mockFetchEventCapacityStatus).toHaveBeenCalledTimes(2);
			});
		});

		it('adjusts live attendance with −1 control', async () => {
			renderCheckIn();

			await waitFor(() => {
				expect(screen.getByLabelText('Record one departure')).toBeInTheDocument();
			});

			fireEvent.click(screen.getByLabelText('Record one departure'));

			await waitFor(() => {
				expect(mockAdjustCapacity).toHaveBeenCalledWith('ev-mr-2026', 'down');
			});
			expect(screen.getByLabelText('Live capacity: 0 of 100 on site, 0 percent full')).toBeInTheDocument();
		});

		it('shows count-only hint when Event capacity is unset', async () => {
			mockFetchEventCapacityStatus.mockResolvedValue({
				programId: 'prog-atlassian-2026',
				eventId: 'ev-mr-2026',
				capacity: null,
				checkedInCount: 1,
				departureCount: 0,
				liveAttendance: 1,
			});
			renderCheckIn(adminSession, { capacity: null });

			await waitFor(() => {
				expect(screen.getByText('1 checked in on site')).toBeInTheDocument();
			});
			expect(screen.getByText(/Set Event capacity on Programs & Events/i)).toBeInTheDocument();
			expect(screen.queryByLabelText('Record one departure')).not.toBeInTheDocument();
		});

		it('keeps the capacity indicator visible while the walk-in modal is open', async () => {
			renderCheckIn(adminSession, { walkInFormUrl: WALK_IN_URL });

			await waitFor(() => {
				expect(screen.getByLabelText('Live capacity: 1 of 100 on site, 1 percent full')).toBeInTheDocument();
			});

			fireEvent.click(screen.getByRole('button', { name: '+ Add walk-in' }));

			expect(screen.getByLabelText('Live capacity: 1 of 100 on site, 1 percent full')).toBeInTheDocument();
		});

		it('shows capacity error with retry when snapshot load fails', async () => {
			mockFetchEventCapacityStatus.mockRejectedValueOnce(new Error('Request failed (404)'));
			renderCheckIn();

			await waitFor(() => {
				expect(screen.getByText(/Capacity unavailable: Request failed \(404\)/i)).toBeInTheDocument();
			});
			expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
		});
	});
});
