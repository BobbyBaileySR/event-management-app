import { useEffect } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ConfirmProvider } from '../components/ConfirmModal';
import { ToastProvider } from '../components/Toast';
import { renderWithQueryClient } from '../testing/renderWithQueryClient';
import { SessionProvider, useSession } from '../state/appState';
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

const mockFetchEventAttendees = vi.fn().mockResolvedValue({
	attendees: mockSliceAttendees,
	page: 1,
	pageSize: 50,
	total: 2,
});

const mockFetchEventCapacityStatus = vi.fn().mockResolvedValue({
	programId: '_standalone',
	eventId: 'ev-1',
	capacity: 100,
	checkedInCount: 1,
	departureCount: 0,
	liveAttendance: 1,
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

const mockRemoveAttendee = vi.fn().mockResolvedValue({ contactId: 'c-001', removed: true });
const mockUndoCheckIn = vi.fn().mockResolvedValue({
	contactId: 'c-002',
	checkedIn: false,
	alreadyCheckedIn: true,
	attendeeType: 'partner',
});

const mockFetchAttendeeDetail = vi.fn().mockResolvedValue({
	contactId: 'c-001',
	firstName: 'Jane',
	lastName: 'Doe',
	email: 'jane@example.com',
	company: 'Adaptavist',
	accountManager: 'owner-1',
	attendeeType: 'customer',
	checkedIn: false,
	checkedInAt: null,
	phone: null,
	jobTitle: null,
	dietaryRequirement: null,
	registrationSource: null,
	journey: [],
	registrationAnswerHistory: [],
});

const mockGenerateAttendeeLeadsBatch = vi.fn().mockResolvedValue({
	results: [
		{ contactId: 'c-001', outcome: 'created', leadId: 'lead-1' },
		{ contactId: 'c-002', outcome: 'updated', leadId: 'lead-2' },
	],
});

const mockFetchAttendeeNotes = vi.fn().mockResolvedValue({ notes: [] });

const mockFetchCatalog = vi.fn().mockResolvedValue({
	events: [
		{
			id: 'ev-1',
			programId: null,
			name: 'Meeting Room',
			start: '2026-10-01T09:00:00.000Z',
			status: 'active',
			publishState: 'published',
			archived: false,
		},
	],
	programs: [],
});

const mockDataService = {
	fetchEventAttendees: mockFetchEventAttendees,
	fetchEventCapacityStatus: mockFetchEventCapacityStatus,
	fetchEmailDispatches: mockFetchEmailDispatches,
	removeAttendee: mockRemoveAttendee,
	undoCheckIn: mockUndoCheckIn,
	fetchAttendeeDetail: mockFetchAttendeeDetail,
	generateAttendeeLeadsBatch: mockGenerateAttendeeLeadsBatch,
	fetchAttendeeNotes: mockFetchAttendeeNotes,
	fetchCatalog: mockFetchCatalog,
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

function renderAttendees(session: Session = adminSession, path = '/events/ev-1/attendees') {
	return renderWithQueryClient(
		<MemoryRouter initialEntries={[path]}>
			<SessionProvider>
				<ConfirmProvider>
					<ToastProvider>
						<SessionHarness session={session} />
						<Routes>
							<Route path="/events/:eventId/:module" element={<AttendeesView />} />
							<Route path="*" element={<AttendeesView />} />
						</Routes>
					</ToastProvider>
				</ConfirmProvider>
			</SessionProvider>
		</MemoryRouter>,
	);
}

describe('AttendeesView', () => {
	beforeEach(() => {
		mockFetchEventAttendees.mockReset();
		mockFetchEventCapacityStatus.mockReset();
		mockFetchEmailDispatches.mockReset();
		mockRemoveAttendee.mockReset();
		mockUndoCheckIn.mockReset();
		mockFetchAttendeeDetail.mockReset();
		mockGenerateAttendeeLeadsBatch.mockReset();
		mockGenerateAttendeeLeadsBatch.mockResolvedValue({
			results: [
				{ contactId: 'c-001', outcome: 'created', leadId: 'lead-1' },
				{ contactId: 'c-002', outcome: 'updated', leadId: 'lead-2' },
			],
		});

		mockFetchAttendeeDetail.mockResolvedValue({
			contactId: 'c-001',
			firstName: 'Jane',
			lastName: 'Doe',
			email: 'jane@example.com',
			company: 'Adaptavist',
			accountManager: 'owner-1',
			attendeeType: 'customer',
			checkedIn: false,
			checkedInAt: null,
			phone: null,
			jobTitle: null,
			dietaryRequirement: null,
			registrationSource: null,
			journey: [],
			registrationAnswerHistory: [],
		});

		mockFetchEventAttendees.mockResolvedValue({
			attendees: mockSliceAttendees,
			page: 1,
			pageSize: 50,
			total: 2,
		});
		mockFetchEventCapacityStatus.mockResolvedValue({
			programId: '_standalone',
			eventId: 'ev-1',
			capacity: 100,
			checkedInCount: 1,
			departureCount: 0,
			liveAttendance: 1,
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
		mockRemoveAttendee.mockResolvedValue({ contactId: 'c-001', removed: true });
		mockUndoCheckIn.mockResolvedValue({
			contactId: 'c-002',
			checkedIn: false,
			alreadyCheckedIn: true,
			attendeeType: 'partner',
		});
	});

	it('renders fixed title/meta, attendee table, and check-in filters', async () => {
		renderAttendees();

		// The loading state renders the same title/meta as the loaded view (unlike other
		// views, there's no differing meta text here) — wait for loaded-only content first so
		// the assertions below don't race the attendees fetch.
		await screen.findByText('Jane Doe');

		expect(screen.getByRole('heading', { name: 'Registered Attendees' })).toBeInTheDocument();
		expect(screen.getByText('Full attendee roster for the working event')).toBeInTheDocument();
		expect(screen.getByText('John Smith')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Checked in' })).toBeInTheDocument();
		expect(mockFetchEventAttendees).toHaveBeenCalledWith('ev-1', expect.any(Object));
	});

	it("shows the working event in the TopBar pill (rail/tab-bar chrome can collapse the picker to an icon)", async () => {
		renderAttendees();

		await screen.findByText('Jane Doe');
		expect(screen.getByText('Meeting Room')).toBeInTheDocument();
		expect(screen.getByText(/Working on:/)).toBeInTheDocument();
	});

	it('shows unfiltered Registered / Checked in / Not checked in stat tiles', async () => {
		renderAttendees();

		await waitFor(() => {
			expect(screen.getByText('Jane Doe')).toBeInTheDocument();
		});

		function statValueFor(label: string): string {
			const labelEl = screen.getAllByText(label).find((el) => el.tagName === 'P');
			expect(labelEl).toBeTruthy();
			return labelEl!.previousElementSibling?.textContent ?? '';
		}

		expect(statValueFor('Registered')).toBe('2');
		expect(statValueFor('Checked in')).toBe('1');
		expect(statValueFor('Not checked in')).toBe('1');

		expect(mockFetchEventAttendees).toHaveBeenCalledWith('ev-1', { page: 1, pageSize: 1 });
		expect(mockFetchEventCapacityStatus).toHaveBeenCalledWith('ev-1');
	});

	it('shows empty state when no eventId is in the URL', async () => {
		renderAttendees(adminSession, '/events');

		expect(
			await screen.findByText(/Open an event from Programs & Events or the working-event picker/i),
		).toBeInTheDocument();
	});

	it('renders hostile attendee data as text, never as markup (XSS guard)', async () => {
		const hostile = '"><img src=x onerror=alert(1)>';
		mockFetchEventAttendees.mockResolvedValue({
			attendees: [{ ...mockSliceAttendees[0]!, firstName: hostile, lastName: '', email: hostile }],
			page: 1,
			pageSize: 50,
			total: 1,
		});

		renderAttendees();

		await waitFor(() => {
			expect(screen.getAllByText(hostile).length).toBeGreaterThan(0);
		});

		expect(document.querySelector('img')).toBeNull();
	});

	it('puts email under the name and keeps Account manager (no Email column)', async () => {
		renderAttendees();

		await waitFor(() => {
			expect(screen.getByText('Jane Doe')).toBeInTheDocument();
		});

		expect(screen.queryByRole('columnheader', { name: 'Email' })).not.toBeInTheDocument();
		expect(screen.getByRole('columnheader', { name: 'Account manager' })).toBeInTheDocument();
		expect(screen.getByText('jane@example.com')).toBeInTheDocument();
		expect(screen.getByText('john@example.com')).toBeInTheDocument();
	});

	it('restyles filters as pills with search above them', async () => {
		renderAttendees();

		await waitFor(() => {
			expect(screen.getByLabelText('Search attendees')).toBeInTheDocument();
		});

		const search = screen.getByLabelText('Search attendees');
		const typeGroup = screen.getByRole('group', { name: 'Attendee type filter' });
		expect(search.compareDocumentPosition(typeGroup) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

		expect(within(typeGroup).getByRole('button', { name: 'All' })).toBeInTheDocument();
		expect(within(typeGroup).getByRole('button', { name: 'Customer' })).toBeInTheDocument();
		expect(within(typeGroup).getByRole('button', { name: 'Partner' })).toBeInTheDocument();

		const statusGroup = screen.getByRole('group', { name: 'Check-in status filter' });
		expect(within(statusGroup).getByRole('button', { name: 'All' })).toBeInTheDocument();
		expect(within(statusGroup).getByRole('button', { name: 'Checked in' })).toBeInTheDocument();
		expect(within(statusGroup).getByRole('button', { name: 'Not checked in' })).toBeInTheDocument();
	});

	it('shows page summary with total count and ‹ Prev / Next › when multipage', async () => {
		mockFetchEventAttendees.mockResolvedValue({
			attendees: mockSliceAttendees,
			page: 1,
			pageSize: 50,
			total: 120,
		});

		renderAttendees();

		await waitFor(() => {
			expect(screen.getByText('Page 1 of 3 · 120 attendees')).toBeInTheDocument();
		});

		expect(screen.getByRole('button', { name: '‹ Prev' })).toBeDisabled();
		expect(screen.getByRole('button', { name: 'Next ›' })).toBeEnabled();
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

		mockFetchEventAttendees.mockImplementation(async (_eventId, query) => {
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
			expect(screen.getByRole('button', { name: 'Next ›' })).toBeEnabled();
		});

		fireEvent.click(screen.getByRole('button', { name: 'Next ›' }));

		expect(await screen.findByText('Loading page…')).toBeInTheDocument();
		expect(screen.getByText('Updating…')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Next ›' })).toBeDisabled();
		expect(screen.getByRole('button', { name: '‹ Prev' })).toBeDisabled();

		resolvePage2!({
			attendees: [mockSliceAttendees[0]!],
			page: 2,
			pageSize: 50,
			total: 120,
		});

		await waitFor(() => {
			expect(screen.getByText('Page 2 of 3 · 120 attendees')).toBeInTheDocument();
		});
	});

	it('requests the next page when Next › is clicked', async () => {
		mockFetchEventAttendees.mockImplementation(async (_eventId, query) => {
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
			expect(screen.getByRole('button', { name: 'Next ›' })).toBeEnabled();
		});

		fireEvent.click(screen.getByRole('button', { name: 'Next ›' }));

		await waitFor(() => {
			expect(mockFetchEventAttendees).toHaveBeenCalledWith('ev-1', {
				q: undefined,
				checkedIn: undefined,
				page: 2,
				pageSize: 50,
			});
		});

		expect(await screen.findByText('Page 2 of 3 · 120 attendees')).toBeInTheDocument();
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
		expect(screen.getByRole('heading', { name: 'Registered Attendees' })).toBeInTheDocument();

		await waitFor(() => {
			expect(mockFetchEventAttendees).toHaveBeenCalledWith('ev-1', {
				q: 'Jane',
				checkedIn: undefined,
				page: 1,
				pageSize: 50,
			});
		});
	});

	it('opens the Attendee Detail modal when a row is clicked outside the action-button cell', async () => {
		const user = userEvent.setup();
		renderAttendees();

		await waitFor(() => {
			expect(screen.getByText('Jane Doe')).toBeInTheDocument();
		});

		await user.click(screen.getByText('Adaptavist'));

		const dialog = await screen.findByRole('dialog');
		expect(mockFetchAttendeeDetail).toHaveBeenCalledWith('ev-1', 'c-001');
		expect(within(dialog).getByRole('heading', { name: 'Jane Doe' })).toBeInTheDocument();

		await user.click(within(dialog).getByRole('button', { name: 'Close' }));
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
	});

	it('does not open the Attendee Detail modal when clicking Remove or Undo check-in', async () => {
		const user = userEvent.setup();
		renderAttendees();

		await waitFor(() => {
			expect(screen.getByText('Jane Doe')).toBeInTheDocument();
		});

		await user.click(screen.getByRole('button', { name: 'Remove' }));
		expect(screen.queryByRole('dialog', { name: 'Jane Doe' })).not.toBeInTheDocument();
		expect(mockFetchAttendeeDetail).not.toHaveBeenCalled();

		await user.click(within(await screen.findByRole('dialog', { name: 'Remove attendee?' })).getByRole('button', { name: 'Cancel' }));

		await user.click(screen.getByRole('button', { name: 'Undo check-in' }));
		expect(mockFetchAttendeeDetail).not.toHaveBeenCalled();
	});

	it('redirects non-admin users to the events list', async () => {
		renderWithQueryClient(
			<MemoryRouter initialEntries={['/events/ev-1/attendees']}>
				<SessionProvider>
					<ConfirmProvider>
						<ToastProvider>
							<Routes>
								<Route path="/events" element={<div>Events list</div>} />
								<Route
									path="/events/:eventId/:module"
									element={
										<>
											<SessionHarness session={staffSession} />
											<AttendeesView />
										</>
									}
								/>
							</Routes>
						</ToastProvider>
					</ConfirmProvider>
				</SessionProvider>
			</MemoryRouter>,
		);

		expect(await screen.findByText('Events list')).toBeInTheDocument();
		expect(screen.queryByRole('heading', { name: 'Registered Attendees' })).not.toBeInTheDocument();
	});

	it('loads dispatch options and filters attendees by received outcome', async () => {
		const user = userEvent.setup();
		renderAttendees();

		await waitFor(() => {
			expect(screen.getByLabelText('Email dispatch')).toBeInTheDocument();
		});

		expect(mockFetchEmailDispatches).toHaveBeenCalledWith('ev-1', { view: 'log' });

		await user.click(screen.getByRole('button', { name: 'Email dispatch: No dispatch filter' }));
		await user.click(screen.getByRole('option', { name: 'Meeting Room reminder' }));

		await waitFor(() => {
			expect(mockFetchEventAttendees).toHaveBeenCalledWith('ev-1', {
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
			expect(mockFetchEventAttendees).toHaveBeenCalledWith('ev-1', {
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
			expect(mockFetchEventAttendees).toHaveBeenCalledWith('ev-1', {
				q: undefined,
				checkedIn: undefined,
				page: 1,
				pageSize: 50,
			});
		});

		expect(screen.queryByRole('button', { name: 'Did not receive' })).not.toBeInTheDocument();
	});

	it('shows Remove only for non-checked-in attendees and confirms before removing', async () => {
		const user = userEvent.setup();
		renderAttendees();

		await waitFor(() => {
			expect(screen.getByText('Jane Doe')).toBeInTheDocument();
		});

		const removeButtons = screen.getAllByRole('button', { name: 'Remove' });
		expect(removeButtons).toHaveLength(1);

		await user.click(removeButtons[0]!);

		const dialog = await screen.findByRole('dialog', { name: 'Remove attendee?' });
		expect(within(dialog).getByText(/Jane Doe will be removed/i)).toBeInTheDocument();

		await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
		expect(mockRemoveAttendee).not.toHaveBeenCalled();

		await user.click(screen.getByRole('button', { name: 'Remove' }));
		await user.click(within(await screen.findByRole('dialog', { name: 'Remove attendee?' })).getByRole('button', { name: 'Remove' }));

		await waitFor(() => {
			expect(mockRemoveAttendee).toHaveBeenCalledWith('ev-1', 'c-001');
		});

		expect(await screen.findByText('Attendee removed')).toBeInTheDocument();
	});

	it('toasts a checked-in error when remove fails with attendee_checked_in', async () => {
		const user = userEvent.setup();
		mockRemoveAttendee.mockRejectedValue(new Error('attendee_checked_in'));

		renderAttendees();

		await waitFor(() => {
			expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument();
		});

		await user.click(screen.getByRole('button', { name: 'Remove' }));
		await user.click(
			within(await screen.findByRole('dialog', { name: 'Remove attendee?' })).getByRole('button', {
				name: 'Remove',
			}),
		);

		expect(
			await screen.findByText('This attendee is checked in — undo check-in before removing.'),
		).toBeInTheDocument();
	});

	it('shows Undo check-in for checked-in attendees and confirms before undoing', async () => {
		const user = userEvent.setup();
		renderAttendees();

		await waitFor(() => {
			expect(screen.getByText('John Smith')).toBeInTheDocument();
		});

		const undoButtons = screen.getAllByRole('button', { name: 'Undo check-in' });
		expect(undoButtons).toHaveLength(1);

		await user.click(undoButtons[0]!);
		await user.click(
			within(await screen.findByRole('dialog', { name: 'Undo check-in?' })).getByRole('button', {
				name: 'Undo check-in',
			}),
		);

		await waitFor(() => {
			expect(mockUndoCheckIn).toHaveBeenCalledWith('ev-1', 'c-002');
		});
		expect(await screen.findByText('John Smith: check-in undone.')).toBeInTheDocument();
	});

	describe('bulk Generate Leads (014-lead-generation US3)', () => {
		it('shows no bulk action bar until an attendee is selected', async () => {
			renderAttendees();
			await screen.findByText('Jane Doe');
			expect(screen.queryByRole('toolbar', { name: 'Bulk attendee actions' })).not.toBeInTheDocument();
		});

		it('selecting a row shows the bulk bar; Generate Leads calls the batch API with selected contactIds', async () => {
			const user = userEvent.setup();
			renderAttendees();
			await screen.findByText('Jane Doe');

			await user.click(screen.getByRole('checkbox', { name: 'Select Jane Doe' }));

			expect(screen.getByText('1 selected')).toBeInTheDocument();
			await user.click(screen.getByRole('button', { name: 'Generate Leads' }));

			await waitFor(() => {
				expect(mockGenerateAttendeeLeadsBatch).toHaveBeenCalledWith('ev-1', {
					contactIds: ['c-001'],
					includeFullHistory: false,
				});
			});
		});

		it('passes includeFullHistory: true when the expanded-history checkbox is checked (US4)', async () => {
			const user = userEvent.setup();
			renderAttendees();
			await screen.findByText('Jane Doe');

			await user.click(screen.getByRole('checkbox', { name: 'Select Jane Doe' }));
			await user.click(screen.getByRole('checkbox', { name: 'Include full cross-event history' }));
			await user.click(screen.getByRole('button', { name: 'Generate Leads' }));

			await waitFor(() => {
				expect(mockGenerateAttendeeLeadsBatch).toHaveBeenCalledWith('ev-1', {
					contactIds: ['c-001'],
					includeFullHistory: true,
				});
			});
		});

		it('select-all-visible checkbox selects every rendered attendee, and Clear selection empties it', async () => {
			const user = userEvent.setup();
			renderAttendees();
			await screen.findByText('Jane Doe');

			await user.click(screen.getByRole('checkbox', { name: 'Select all visible attendees' }));
			expect(screen.getByText('2 selected')).toBeInTheDocument();

			await user.click(screen.getByRole('button', { name: 'Clear selection' }));
			expect(screen.queryByRole('toolbar', { name: 'Bulk attendee actions' })).not.toBeInTheDocument();
		});

		it('shows a per-outcome summary toast after a successful batch generation and clears the selection', async () => {
			const user = userEvent.setup();
			renderAttendees();
			await screen.findByText('Jane Doe');

			await user.click(screen.getByRole('checkbox', { name: 'Select all visible attendees' }));
			await user.click(screen.getByRole('button', { name: 'Generate Leads' }));

			expect(await screen.findByText('Leads generated: 1 created, 1 updated')).toBeInTheDocument();
			await waitFor(() => {
				expect(screen.queryByRole('toolbar', { name: 'Bulk attendee actions' })).not.toBeInTheDocument();
			});
		});

		it('reports failed outcomes distinctly and does not clobber successes', async () => {
			mockGenerateAttendeeLeadsBatch.mockResolvedValue({
				results: [
					{ contactId: 'c-001', outcome: 'created', leadId: 'lead-1' },
					{ contactId: 'c-002', outcome: 'failed' },
				],
			});
			const user = userEvent.setup();
			renderAttendees();
			await screen.findByText('Jane Doe');

			await user.click(screen.getByRole('checkbox', { name: 'Select all visible attendees' }));
			await user.click(screen.getByRole('button', { name: 'Generate Leads' }));

			expect(await screen.findByText('Leads generated: 1 created, 1 failed')).toBeInTheDocument();
			expect(screen.getByText('Failed for: c-002')).toBeInTheDocument();
		});

		it('shows a confirmation dialog and passes batchConfirmed:true at/above the configured threshold', async () => {
			mockFetchEventAttendees.mockResolvedValue({
				attendees: mockSliceAttendees,
				page: 1,
				pageSize: 50,
				total: 2,
			});
			const user = userEvent.setup();
			renderAttendees();
			await screen.findByText('Jane Doe');

			// Force the threshold path without needing 50 real attendees in the fixture.
			const { CONFIG } = await import('../config');
			const originalThreshold = CONFIG.LEAD_BATCH_CONFIRM_THRESHOLD;
			CONFIG.LEAD_BATCH_CONFIRM_THRESHOLD = 1;
			try {
				await user.click(screen.getByRole('checkbox', { name: 'Select Jane Doe' }));
				await user.click(screen.getByRole('button', { name: 'Generate Leads' }));

				const dialog = await screen.findByRole('dialog', { name: 'Generate Leads for a large selection?' });
				expect(within(dialog).getByText(/1 attendees/)).toBeInTheDocument();

				await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
				expect(mockGenerateAttendeeLeadsBatch).not.toHaveBeenCalled();

				await user.click(screen.getByRole('button', { name: 'Generate Leads' }));
				await user.click(
					within(await screen.findByRole('dialog', { name: 'Generate Leads for a large selection?' })).getByRole(
						'button',
						{ name: 'Generate Leads' },
					),
				);

				await waitFor(() => {
					expect(mockGenerateAttendeeLeadsBatch).toHaveBeenCalledWith('ev-1', {
						contactIds: ['c-001'],
						includeFullHistory: false,
						batchConfirmed: true,
					});
				});
			} finally {
				CONFIG.LEAD_BATCH_CONFIRM_THRESHOLD = originalThreshold;
			}
		});

		it('clears the selection when the page changes', async () => {
			mockFetchEventAttendees.mockResolvedValue({
				attendees: mockSliceAttendees,
				page: 1,
				pageSize: 1,
				total: 2,
			});
			const user = userEvent.setup();
			renderAttendees();
			await screen.findByText('Jane Doe');

			await user.click(screen.getByRole('checkbox', { name: 'Select Jane Doe' }));
			expect(screen.getByText('1 selected')).toBeInTheDocument();

			await user.click(screen.getByRole('button', { name: 'Next ›' }));
			await waitFor(() => {
				expect(screen.queryByRole('toolbar', { name: 'Bulk attendee actions' })).not.toBeInTheDocument();
			});
		});
	});

	it('does not overflow body horizontally at 375px viewport', async () => {
		Object.defineProperty(document.body, 'clientWidth', { configurable: true, value: 375 });
		document.documentElement.style.width = '375px';

		renderAttendees();

		await waitFor(() => {
			expect(screen.getByRole('heading', { name: 'Registered Attendees' })).toBeInTheDocument();
		});

		expect(document.body.scrollWidth).toBeLessThanOrEqual(document.body.clientWidth + 1);
	});

	it('renders correctly under the darkAurora theme with no hardcoded inline hex colors', async () => {
		document.documentElement.setAttribute('data-theme', 'darkAurora');

		try {
			const { container } = renderAttendees();

			await screen.findByText('Jane Doe');

			expect(screen.getByRole('heading', { name: 'Registered Attendees' })).toBeInTheDocument();
			expect(container.innerHTML).not.toMatch(/style="[^"]*#[0-9a-fA-F]{3,8}/i);
		} finally {
			document.documentElement.removeAttribute('data-theme');
		}
	});
});
