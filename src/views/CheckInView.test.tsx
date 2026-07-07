import { createElement, useEffect } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ToastProvider } from '../components/Toast';
import { SessionProvider, useSession } from '../state/appState';
import { CatalogProvider, useCatalogSelection, type CatalogSelection } from '../state/catalogContext';
import type { Session, SliceAttendee } from '../types';
import { CheckInView } from './CheckInView';

const {
	mockFetchSliceAttendees,
	mockConfirmCheckIn,
	mockCheckInScan,
	mockFetchCapacityStatus,
	mockAdjustCapacity,
	mockDataService,
} = vi.hoisted(() => {
	const fetchSliceAttendees = vi.fn().mockResolvedValue({
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
	const checkInScan = vi.fn().mockResolvedValue({
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
	const fetchCapacityStatus = vi.fn().mockResolvedValue({
		programId: 'prog-atlassian-2026',
		eventId: 'ev-mr-2026',
		capacity: 100,
		checkedInCount: 1,
		departureCount: 0,
		liveAttendance: 1,
	});
	const adjustCapacity = vi.fn().mockResolvedValue({
		programId: 'prog-atlassian-2026',
		eventId: 'ev-mr-2026',
		capacity: 100,
		checkedInCount: 1,
		departureCount: 1,
		liveAttendance: 0,
	});

	return {
		mockFetchSliceAttendees: fetchSliceAttendees,
		mockConfirmCheckIn: confirmCheckIn,
		mockCheckInScan: checkInScan,
		mockFetchCapacityStatus: fetchCapacityStatus,
		mockAdjustCapacity: adjustCapacity,
		mockDataService: {
			fetchSliceAttendees,
			confirmCheckIn,
			checkInScan,
			fetchCapacityStatus,
			adjustCapacity,
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

let applyCatalogSelection: ((selection: CatalogSelection) => void) | null = null;

function SessionHarness({ session }: { session: Session }) {
	const { setSession } = useSession();
	useEffect(() => {
		setSession(session);
	}, [session, setSession]);
	return null;
}

function CatalogHarness({
	walkInFormUrl = null,
	evId = 'ev-mr-2026',
	capacity = 100,
}: {
	walkInFormUrl?: string | null;
	evId?: string;
	capacity?: number | null;
} = {}) {
	const { setSelection } = useCatalogSelection();
	useEffect(() => {
		setSelection({
			programId: 'prog-atlassian-2026',
			evId,
			programName: 'Atlassian Event 2026',
			eventName: 'Meeting Room',
			walkInFormUrl,
			capacity,
		});
	}, [setSelection, walkInFormUrl, evId, capacity]);
	return null;
}

function CatalogSelectionBridge() {
	const { setSelection } = useCatalogSelection();
	useEffect(() => {
		applyCatalogSelection = setSelection;
	}, [setSelection]);
	return null;
}

function renderCheckIn(
	session: Session = adminSession,
	catalog: { walkInFormUrl?: string | null; evId?: string } = {},
) {
	return render(
		<MemoryRouter>
			<ToastProvider>
				<SessionProvider>
					<CatalogProvider>
						<SessionHarness session={session} />
						<CatalogHarness {...catalog} />
						<CheckInView />
					</CatalogProvider>
				</SessionProvider>
			</ToastProvider>
		</MemoryRouter>,
	);
}

describe('CheckInView', () => {
	beforeEach(() => {
		vi.useRealTimers();
		applyCatalogSelection = null;
		mockFetchSliceAttendees.mockClear();
		mockConfirmCheckIn.mockClear();
		mockCheckInScan.mockClear();
		mockFetchCapacityStatus.mockClear();
		mockAdjustCapacity.mockClear();
		mockFetchSliceAttendees.mockResolvedValue({
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
		mockFetchCapacityStatus.mockResolvedValue({
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

	it('renders attendee search, summary card, and confirm check-in', async () => {
		renderCheckIn();

		await waitFor(() => {
			expect(
				screen.getByRole('heading', { name: 'Atlassian Event 2026 — Meeting Room — Check-in' }),
			).toBeInTheDocument();
		});

		expect(screen.getByText(/Type at least 2 characters to search registrants/i)).toBeInTheDocument();
		expect(mockFetchSliceAttendees).not.toHaveBeenCalled();

		fireEvent.change(screen.getByLabelText('Search attendees for check-in'), {
			target: { value: 'Jane' },
		});

		await waitFor(() => {
			expect(screen.getByText('Jane Doe')).toBeInTheDocument();
		});

		expect(mockFetchSliceAttendees).toHaveBeenCalledWith('prog-atlassian-2026', 'ev-mr-2026', {
			q: 'Jane',
			page: 1,
			pageSize: 200,
		});

		fireEvent.click(screen.getAllByRole('button', { name: 'Check in' })[0]!);

		await waitFor(() => {
			expect(screen.getByText('jane.doe@acme.com')).toBeInTheDocument();
		});
		expect(screen.getByText('owner-1')).toBeInTheDocument();

		fireEvent.click(screen.getByRole('button', { name: 'Confirm check-in' }));

		await waitFor(() => {
			expect(mockConfirmCheckIn).toHaveBeenCalledWith('prog-atlassian-2026', 'ev-mr-2026', 'mock-101');
			expect(screen.getByRole('status')).toHaveTextContent('Jane Doe checked in successfully.');
		});
	});

	it('shows idempotent message when contact is already checked in', async () => {
		mockConfirmCheckIn.mockResolvedValue({
			contactId: 'mock-202',
			checkedIn: true,
			alreadyCheckedIn: true,
			attendeeType: 'partner',
		});

		renderCheckIn();

		fireEvent.change(screen.getByLabelText('Search attendees for check-in'), {
			target: { value: 'Pat' },
		});

		await waitFor(() => {
			expect(screen.getByText('Pat Lee')).toBeInTheDocument();
		});

		fireEvent.click(screen.getAllByRole('button', { name: 'Check in' })[1]!);

		await waitFor(() => {
			expect(screen.getByRole('button', { name: 'Confirm check-in' })).toBeInTheDocument();
		});

		fireEvent.click(screen.getByRole('button', { name: 'Confirm check-in' }));

		await waitFor(() => {
			expect(screen.getByRole('status')).toHaveTextContent('Pat Lee is already checked in.');
		});
	});

	it('calls checkInScan when QR panel decodes a token', async () => {
		renderCheckIn();

		await waitFor(() => {
			expect(screen.getByRole('button', { name: 'Simulate QR scan' })).toBeInTheDocument();
		});

		fireEvent.click(screen.getByRole('button', { name: 'Simulate QR scan' }));

		await waitFor(() => {
			expect(mockCheckInScan).toHaveBeenCalledWith('prog-atlassian-2026', 'ev-mr-2026', 'mock-jwt-token');
			expect(screen.getByText('jane.doe@acme.com')).toBeInTheDocument();
		});
	});

	it('shows catalog selection prompt when no Program or Event is selected', async () => {
		render(
			<MemoryRouter>
				<ToastProvider>
					<SessionProvider>
						<CatalogProvider>
							<SessionHarness session={adminSession} />
							<CheckInView />
						</CatalogProvider>
					</SessionProvider>
				</ToastProvider>
			</MemoryRouter>,
		);

		expect(
			await screen.findByText(/Select a Program and Event using the catalog pickers/i),
		).toBeInTheDocument();
	});

	it('redirects non-admin users to the events list', async () => {
		render(
			<MemoryRouter initialEntries={['/events/check-in']}>
				<ToastProvider>
					<SessionProvider>
						<CatalogProvider>
							<Routes>
								<Route path="/events" element={<div>Events list</div>} />
								<Route
									path="/events/check-in"
									element={
										<>
											<SessionHarness session={staffSession} />
											<CatalogHarness />
											<CheckInView />
										</>
									}
								/>
							</Routes>
						</CatalogProvider>
					</SessionProvider>
				</ToastProvider>
			</MemoryRouter>,
		);

		expect(await screen.findByText('Events list')).toBeInTheDocument();
	});

	it('renders hostile attendee data as text, never as markup (XSS guard)', async () => {
		const hostile = '"><img src=x onerror=alert(1)>';
		mockFetchSliceAttendees.mockResolvedValue({
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

		expect(screen.getByLabelText('Search attendees for check-in')).toBeInTheDocument();

		const callsBeforeSearch = mockFetchSliceAttendees.mock.calls.length;

		fireEvent.change(screen.getByLabelText('Search attendees for check-in'), {
			target: { value: 'Jane' },
		});

		expect(screen.queryByText('Loading check-in…')).not.toBeInTheDocument();
		expect(
			screen.getByRole('heading', { name: 'Atlassian Event 2026 — Meeting Room — Check-in' }),
		).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Simulate QR scan' })).toBeInTheDocument();

		await waitFor(() => {
			expect(mockFetchSliceAttendees.mock.calls.length).toBeGreaterThan(callsBeforeSearch);
		});
		expect(mockFetchSliceAttendees).toHaveBeenLastCalledWith('prog-atlassian-2026', 'ev-mr-2026', {
			q: 'Jane',
			page: 1,
			pageSize: 200,
		});
	});

	it('searches across the full registrant list via server-side q, not page-1 browse', async () => {
		mockFetchSliceAttendees.mockResolvedValue({
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
			expect(mockFetchSliceAttendees).toHaveBeenCalledWith('prog-atlassian-2026', 'ev-mr-2026', {
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
				screen.getByRole('heading', { name: 'Atlassian Event 2026 — Meeting Room — Check-in' }),
			).toBeInTheDocument();
		});

		expect(document.body.scrollWidth).toBeLessThanOrEqual(document.body.clientWidth + 1);
	});

	describe('walk-in mode', () => {
		it('shows mode switch and toggles to walk-in with staff hint and iframe', async () => {
			renderCheckIn(adminSession, { walkInFormUrl: WALK_IN_URL });

			await waitFor(() => {
				expect(screen.getByRole('radiogroup', { name: 'Desk mode' })).toBeInTheDocument();
			});

			expect(screen.getByLabelText('Search attendees for check-in')).toBeInTheDocument();
			expect(screen.getByRole('button', { name: 'Simulate QR scan' })).toBeInTheDocument();

			fireEvent.click(screen.getByRole('radio', { name: 'Walk-in' }));

			expect(screen.queryByLabelText('Search attendees for check-in')).not.toBeInTheDocument();
			expect(screen.queryByRole('button', { name: 'Simulate QR scan' })).not.toBeInTheDocument();
			expect(
				screen.getByText(/After the guest submits the HubSpot form/i),
			).toBeInTheDocument();

			const iframe = screen.getByTitle('HubSpot walk-in form');
			expect(iframe).toHaveAttribute('src', WALK_IN_URL);
		});

		it('shows empty state when walk-in URL is not configured', async () => {
			renderCheckIn(adminSession, { walkInFormUrl: null });

			await waitFor(() => {
				expect(screen.getByRole('radio', { name: 'Walk-in' })).toBeInTheDocument();
			});

			fireEvent.click(screen.getByRole('radio', { name: 'Walk-in' }));

			expect(
				screen.getByText(/No walk-in form URL is configured for this Event/i),
			).toBeInTheDocument();
			expect(screen.getByRole('button', { name: 'Open catalog Settings' })).toBeInTheDocument();
			expect(screen.queryByTitle('HubSpot walk-in form')).not.toBeInTheDocument();
		});

		it('blocks iframe when walk-in URL fails the HubSpot allowlist', async () => {
			renderCheckIn(adminSession, { walkInFormUrl: 'https://evil.example.com/form' });

			await waitFor(() => {
				expect(screen.getByRole('radio', { name: 'Walk-in' })).toBeInTheDocument();
			});

			fireEvent.click(screen.getByRole('radio', { name: 'Walk-in' }));

			expect(
				screen.getByRole('alert'),
			).toHaveTextContent('Walk-in form URL must be a HubSpot form URL');
			expect(screen.queryByTitle('HubSpot walk-in form')).not.toBeInTheDocument();
		});

		it('unmounts the QR panel when switching to walk-in and restores it on return', async () => {
			renderCheckIn(adminSession, { walkInFormUrl: WALK_IN_URL });

			await waitFor(() => {
				expect(screen.getByRole('button', { name: 'Simulate QR scan' })).toBeInTheDocument();
			});

			fireEvent.click(screen.getByRole('radio', { name: 'Walk-in' }));
			expect(screen.queryByRole('button', { name: 'Simulate QR scan' })).not.toBeInTheDocument();

			fireEvent.click(screen.getByRole('radio', { name: 'Check-in' }));
			expect(screen.getByRole('button', { name: 'Simulate QR scan' })).toBeInTheDocument();
			expect(screen.queryByTitle('HubSpot walk-in form')).not.toBeInTheDocument();
		});

		it('resets to check-in mode when catalog context changes', async () => {
			render(
				<MemoryRouter>
					<ToastProvider>
						<SessionProvider>
							<CatalogProvider>
								<SessionHarness session={adminSession} />
								<CatalogSelectionBridge />
								<CatalogHarness walkInFormUrl={WALK_IN_URL} />
								<CheckInView />
							</CatalogProvider>
						</SessionProvider>
					</ToastProvider>
				</MemoryRouter>,
			);

			await waitFor(() => {
				expect(applyCatalogSelection).toBeTruthy();
			});

			fireEvent.click(screen.getByRole('radio', { name: 'Walk-in' }));
			expect(screen.getByTitle('HubSpot walk-in form')).toBeInTheDocument();

			applyCatalogSelection?.({
				programId: 'prog-atlassian-2026',
				evId: 'ev-other-2026',
				programName: 'Atlassian Event 2026',
				eventName: 'Other Room',
				walkInFormUrl: null,
				capacity: null,
			});

			await waitFor(() => {
				expect(screen.getByLabelText('Search attendees for check-in')).toBeInTheDocument();
			});
			expect(screen.getByRole('radio', { name: 'Check-in' })).toHaveAttribute('aria-checked', 'true');
			expect(screen.queryByTitle('HubSpot walk-in form')).not.toBeInTheDocument();
		});
	});

	describe('capacity indicator', () => {
		it('loads and shows live capacity for admin', async () => {
			renderCheckIn();

			await waitFor(() => {
				expect(mockFetchCapacityStatus).toHaveBeenCalledWith('prog-atlassian-2026', 'ev-mr-2026');
			});
			expect(screen.getByLabelText('Room capacity: 1 of 100 on site, 1 percent full')).toBeInTheDocument();
		});

		it('refetches capacity after confirm check-in', async () => {
			renderCheckIn();

			await waitFor(() => {
				expect(mockFetchCapacityStatus).toHaveBeenCalledTimes(1);
			});

			fireEvent.change(screen.getByLabelText('Search attendees for check-in'), {
				target: { value: 'Jane' },
			});

			await waitFor(() => {
				expect(screen.getByText('Jane Doe')).toBeInTheDocument();
			});

			fireEvent.click(screen.getByText('Jane Doe'));

			await waitFor(() => {
				expect(screen.getByRole('button', { name: 'Confirm check-in' })).toBeInTheDocument();
			});

			fireEvent.click(screen.getByRole('button', { name: 'Confirm check-in' }));

			await waitFor(() => {
				expect(mockFetchCapacityStatus).toHaveBeenCalledTimes(2);
			});
		});

		it('adjusts live attendance with −1 control', async () => {
			renderCheckIn();

			await waitFor(() => {
				expect(screen.getByLabelText('Record one departure')).toBeInTheDocument();
			});

			fireEvent.click(screen.getByLabelText('Record one departure'));

			await waitFor(() => {
				expect(mockAdjustCapacity).toHaveBeenCalledWith('prog-atlassian-2026', 'ev-mr-2026', 'down');
			});
			expect(screen.getByLabelText('Room capacity: 0 of 100 on site, 0 percent full')).toBeInTheDocument();
		});

		it('shows count-only hint when Event capacity is unset', async () => {
			mockFetchCapacityStatus.mockResolvedValue({
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
			expect(screen.getByText(/Set Event capacity in Catalog admin/i)).toBeInTheDocument();
			expect(screen.queryByLabelText('Record one departure')).not.toBeInTheDocument();
		});

		it('keeps capacity indicator visible in walk-in mode', async () => {
			renderCheckIn(adminSession, { walkInFormUrl: WALK_IN_URL });

			await waitFor(() => {
				expect(screen.getByLabelText('Room capacity: 1 of 100 on site, 1 percent full')).toBeInTheDocument();
			});

			fireEvent.click(screen.getByRole('radio', { name: 'Walk-in' }));

			expect(screen.getByLabelText('Room capacity: 1 of 100 on site, 1 percent full')).toBeInTheDocument();
		});

		it('shows capacity error with retry when snapshot load fails', async () => {
			mockFetchCapacityStatus.mockRejectedValueOnce(new Error('Request failed (404)'));
			renderCheckIn();

			await waitFor(() => {
				expect(screen.getByText(/Capacity unavailable: Request failed \(404\)/i)).toBeInTheDocument();
			});
			expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
		});
	});
});
