import { useEffect } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { SessionProvider, useSession } from '../state/appState';
import { CatalogProvider, useCatalogSelection } from '../state/catalogContext';
import type { Session, SliceAttendee } from '../types';
import { AttendeesView } from './AttendeesView';

const mockSliceAttendees: SliceAttendee[] = [
	{
		contactId: 'c-001',
		firstName: 'Jane',
		lastName: 'Doe',
		email: 'jane@example.com',
		company: 'Adaptavist',
		accountManager: 'owner-1',
		attendeeType: 'customer',
		checkedIn: false,
		checkedInAt: null,
	},
	{
		contactId: 'c-002',
		firstName: 'John',
		lastName: 'Smith',
		email: 'john@example.com',
		company: 'Atlassian',
		accountManager: 'owner-2',
		attendeeType: 'partner',
		checkedIn: true,
		checkedInAt: null,
	},
];

const mockFetchSliceAttendees = vi.fn().mockResolvedValue({
	attendees: mockSliceAttendees,
	page: 1,
	pageSize: 50,
	total: 2,
});

const mockFetchEmailDispatches = vi.fn().mockResolvedValue({
	dispatches: [
		{
			dispatchId: 'dsp-completed-001',
			dispatchName: 'Meeting Room reminder',
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

const mockDataService = {
	fetchSliceAttendees: mockFetchSliceAttendees,
	fetchEmailDispatches: mockFetchEmailDispatches,
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

const staffSession: Session = {
	token: 't',
	email: 'staff@adaptavist.com',
	role: 'staff',
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
			programId: 'prog-1',
			evId: 'ev-1',
			programName: 'Atlassian Event 2026',
			eventName: 'Meeting Room',
			walkInFormUrl: null,
			capacity: null,
		});
	}, [setSelection]);
	return null;
}

function renderAttendees(session: Session = adminSession) {
	return render(
		<MemoryRouter>
			<SessionProvider>
				<CatalogProvider>
					<SessionHarness session={session} />
					<CatalogHarness />
					<AttendeesView />
				</CatalogProvider>
			</SessionProvider>
		</MemoryRouter>,
	);
}

describe('AttendeesView', () => {
	beforeEach(() => {
		mockFetchSliceAttendees.mockResolvedValue({
			attendees: mockSliceAttendees,
			page: 1,
			pageSize: 50,
			total: 2,
		});
		mockFetchEmailDispatches.mockResolvedValue({
			dispatches: [
				{
					dispatchId: 'dsp-completed-001',
					dispatchName: 'Meeting Room reminder',
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
	});

	it('renders the attendee table and checked-in filters', async () => {
		renderAttendees();

		await waitFor(() => {
			expect(
				screen.getByRole('heading', { name: 'Atlassian Event 2026 — Meeting Room — Attendees' }),
			).toBeInTheDocument();
		});

		expect(screen.getByText('Jane Doe')).toBeInTheDocument();
		expect(screen.getByText('John Smith')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Checked in' })).toBeInTheDocument();
		expect(mockFetchSliceAttendees).toHaveBeenCalledWith('prog-1', 'ev-1', expect.any(Object));
	});

	it('shows catalog selection prompt when no Program or Event is selected', async () => {
		render(
			<MemoryRouter>
				<SessionProvider>
					<CatalogProvider>
						<SessionHarness session={adminSession} />
						<AttendeesView />
					</CatalogProvider>
				</SessionProvider>
			</MemoryRouter>,
		);

		expect(
			await screen.findByText(/Select a Program and Event using the catalog pickers/i),
		).toBeInTheDocument();
	});

	it('renders hostile attendee data as text, never as markup (XSS guard)', async () => {
		const hostile = '"><img src=x onerror=alert(1)>';
		mockFetchSliceAttendees.mockResolvedValue({
			attendees: [{ ...mockSliceAttendees[0]!, firstName: hostile, lastName: '' }],
			page: 1,
			pageSize: 50,
			total: 1,
		});

		renderAttendees();

		await waitFor(() => {
			expect(screen.getByText(hostile)).toBeInTheDocument();
		});

		expect(document.querySelector('img')).toBeNull();
	});

	it('shows total count and pagination when more than one page exists', async () => {
		mockFetchSliceAttendees.mockResolvedValue({
			attendees: mockSliceAttendees,
			page: 1,
			pageSize: 50,
			total: 120,
		});

		renderAttendees();

		await waitFor(() => {
			expect(screen.getByText(/120 registered · showing 1–50/i)).toBeInTheDocument();
		});

		expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
		expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();
	});

	it('shows loading feedback while fetching the next page', async () => {
		let resolvePage2: (value: {
			attendees: SliceAttendee[];
			page: number;
			pageSize: number;
			total: number;
		}) => void;
		const page2Promise = new Promise<{
			attendees: SliceAttendee[];
			page: number;
			pageSize: number;
			total: number;
		}>((resolve) => {
			resolvePage2 = resolve;
		});

		mockFetchSliceAttendees.mockImplementation(async (_programId, _eventId, query) => {
			if (query?.page === 2) {
				return page2Promise;
			}
			return {
				attendees: mockSliceAttendees,
				page: 1,
				pageSize: 50,
				total: 120,
			};
		});

		renderAttendees();

		await waitFor(() => {
			expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();
		});

		fireEvent.click(screen.getByRole('button', { name: 'Next' }));

		expect(await screen.findByText('Loading page…')).toBeInTheDocument();
		expect(screen.getByRole('status')).toHaveTextContent('Updating…');
		expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
		expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();

		resolvePage2!({
			attendees: [mockSliceAttendees[0]!],
			page: 2,
			pageSize: 50,
			total: 120,
		});

		await waitFor(() => {
			expect(screen.getByText(/120 registered · showing 51–100/i)).toBeInTheDocument();
		});

		expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();
	});

	it('requests the next page when Next is clicked', async () => {
		mockFetchSliceAttendees.mockImplementation(async (_programId, _eventId, query) => {
			if (query?.page === 2) {
				return {
					attendees: [mockSliceAttendees[0]!],
					page: 2,
					pageSize: 50,
					total: 120,
				};
			}
			return {
				attendees: mockSliceAttendees,
				page: 1,
				pageSize: 50,
				total: 120,
			};
		});

		renderAttendees();

		await waitFor(() => {
			expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();
		});

		fireEvent.click(screen.getByRole('button', { name: 'Next' }));

		await waitFor(() => {
			expect(mockFetchSliceAttendees).toHaveBeenLastCalledWith('prog-1', 'ev-1', {
				q: undefined,
				checkedIn: undefined,
				page: 2,
				pageSize: 50,
			});
		});

		expect(await screen.findByText(/120 registered · showing 51–100/i)).toBeInTheDocument();
	});

	it('keeps the attendees layout mounted while typing in search', async () => {
		renderAttendees();

		await waitFor(() => {
			expect(screen.getByLabelText('Search attendees')).toBeInTheDocument();
		});

		fireEvent.change(screen.getByLabelText('Search attendees'), {
			target: { value: 'Jane' },
		});

		expect(screen.queryByText('Loading attendees…')).not.toBeInTheDocument();
		expect(
			screen.getByRole('heading', { name: 'Atlassian Event 2026 — Meeting Room — Attendees' }),
		).toBeInTheDocument();

		await waitFor(() => {
			expect(mockFetchSliceAttendees).toHaveBeenLastCalledWith('prog-1', 'ev-1', {
				q: 'Jane',
				checkedIn: undefined,
				page: 1,
				pageSize: 50,
			});
		});
	});

	it('redirects non-admin users to the events list', async () => {
		render(
			<MemoryRouter initialEntries={['/events/attendees']}>
				<SessionProvider>
					<CatalogProvider>
						<Routes>
							<Route path="/events" element={<div>Events list</div>} />
							<Route
								path="/events/attendees"
								element={
									<>
										<SessionHarness session={staffSession} />
										<CatalogHarness />
										<AttendeesView />
									</>
								}
							/>
						</Routes>
					</CatalogProvider>
				</SessionProvider>
			</MemoryRouter>,
		);

		expect(await screen.findByText('Events list')).toBeInTheDocument();
		expect(screen.queryByRole('heading', { name: /Attendees/i })).not.toBeInTheDocument();
	});

	it('loads dispatch options and filters attendees by received outcome', async () => {
		const user = userEvent.setup();
		renderAttendees();

		await waitFor(() => {
			expect(screen.getByLabelText('Email dispatch')).toBeInTheDocument();
		});

		expect(mockFetchEmailDispatches).toHaveBeenCalledWith('prog-1', 'ev-1', { view: 'log' });

		await user.click(screen.getByRole('button', { name: 'Email dispatch: No dispatch filter' }));
		await user.click(screen.getByRole('option', { name: 'Meeting Room reminder' }));

		await waitFor(() => {
			expect(mockFetchSliceAttendees).toHaveBeenLastCalledWith('prog-1', 'ev-1', {
				q: undefined,
				checkedIn: undefined,
				page: 1,
				pageSize: 50,
				dispatchId: 'dsp-completed-001',
				dispatchFilter: 'received',
			});
		});

		fireEvent.click(screen.getByRole('button', { name: 'Did not receive' }));

		await waitFor(() => {
			expect(mockFetchSliceAttendees).toHaveBeenLastCalledWith('prog-1', 'ev-1', {
				q: undefined,
				checkedIn: undefined,
				page: 1,
				pageSize: 50,
				dispatchId: 'dsp-completed-001',
				dispatchFilter: 'not_received',
			});
		});
	});

	it('clears dispatch filter when dispatch select is reset', async () => {
		const user = userEvent.setup();
		renderAttendees();

		await waitFor(() => {
			expect(screen.getByLabelText('Email dispatch')).toBeInTheDocument();
		});

		await user.click(screen.getByRole('button', { name: 'Email dispatch: No dispatch filter' }));
		await user.click(screen.getByRole('option', { name: 'Meeting Room reminder' }));

		await waitFor(() => {
			expect(screen.getByRole('button', { name: 'Received' })).toBeInTheDocument();
		});

		await user.click(screen.getByRole('button', { name: 'Email dispatch: Meeting Room reminder' }));
		await user.click(screen.getByRole('option', { name: 'No dispatch filter' }));

		await waitFor(() => {
			expect(mockFetchSliceAttendees).toHaveBeenLastCalledWith('prog-1', 'ev-1', {
				q: undefined,
				checkedIn: undefined,
				page: 1,
				pageSize: 50,
			});
		});

		expect(screen.queryByRole('button', { name: 'Did not receive' })).not.toBeInTheDocument();
	});

	it('does not overflow body horizontally at 375px viewport', async () => {
		Object.defineProperty(document.body, 'clientWidth', { configurable: true, value: 375 });
		document.documentElement.style.width = '375px';

		renderAttendees();

		await waitFor(() => {
			expect(
				screen.getByRole('heading', { name: 'Atlassian Event 2026 — Meeting Room — Attendees' }),
			).toBeInTheDocument();
		});

		expect(document.body.scrollWidth).toBeLessThanOrEqual(document.body.clientWidth + 1);
	});
});
