import { createElement, useEffect } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ConfirmProvider } from '../components/ConfirmModal';
import { ToastProvider } from '../components/Toast';
import { renderWithQueryClient } from '../testing/renderWithQueryClient';
import { SessionProvider, useSession } from '../state/appState';
import type { AttendeeDetail, Session, SliceAttendee } from '../types';
import { ConversationsView } from './ConversationsView';

const {
	mockFetchEventAttendees,
	mockLookupAttendeeByQr,
	mockCheckInScan,
	mockFetchAttendeeDetail,
	mockFetchAttendeeCommunications,
	mockFetchAttendeeNotes,
	mockDataService,
} = vi.hoisted(() => {
	const fetchEventAttendees = vi.fn();
	const lookupAttendeeByQr = vi.fn();
	/** Must never be called from this view — scanning here must never write/audit a check-in. */
	const checkInScan = vi.fn();
	const fetchAttendeeDetail = vi.fn();
	const fetchAttendeeCommunications = vi.fn();
	const fetchAttendeeNotes = vi.fn();
	const fetchCatalog = vi.fn().mockResolvedValue({
		events: [
			{
				id: 'ev-mr-2026',
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

	return {
		mockFetchEventAttendees: fetchEventAttendees,
		mockLookupAttendeeByQr: lookupAttendeeByQr,
		mockCheckInScan: checkInScan,
		mockFetchAttendeeDetail: fetchAttendeeDetail,
		mockFetchAttendeeCommunications: fetchAttendeeCommunications,
		mockFetchAttendeeNotes: fetchAttendeeNotes,
		mockFetchCatalog: fetchCatalog,
		mockDataService: {
			fetchEventAttendees,
			lookupAttendeeByQr,
			checkInScan,
			fetchAttendeeDetail,
			fetchAttendeeCommunications,
			fetchAttendeeNotes,
			fetchCatalog,
			generateAttendeeLead: vi.fn(),
		},
	};
});

const checkedInAttendees: SliceAttendee[] = [
	{
		contactId: 'mock-202',
		firstName: 'Pat',
		lastName: 'Lee',
		email: 'pat@partner.com',
		company: 'Partner Ltd',
		accountManager: 'owner-2',
		attendeeType: 'partner',
		checkedIn: true,
		checkedInAt: '2026-07-16T08:52:00.000Z',
	},
];

const baseDetail: AttendeeDetail = {
	contactId: 'mock-202',
	firstName: 'Pat',
	lastName: 'Lee',
	company: 'Partner Ltd',
	email: 'pat@partner.com',
	accountManager: 'owner-2',
	attendeeType: 'partner',
	checkedIn: true,
	checkedInAt: '2026-07-16T08:52:00.000Z',
	phone: null,
	jobTitle: null,
	dietaryRequirement: null,
	registrationSource: null,
	journey: [],
	registrationAnswerHistory: [],
};

vi.mock('../hooks/useDataService', () => ({
	useDataService: () => mockDataService,
}));

vi.mock('../components/CheckInQrPanel', () => ({
	CheckInQrPanel: ({ onDecode }: { onDecode: (jwt: string) => void }) =>
		createElement('button', { type: 'button', onClick: () => onDecode('mock-jwt-token') }, 'Simulate QR scan'),
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

function SessionHarness({ session }: { session: Session }) {
	const { setSession } = useSession();
	useEffect(() => {
		setSession(session);
	}, [session, setSession]);
	return null;
}

function renderConversations(session: Session = adminSession, eventId: string | null = 'ev-mr-2026') {
	const path = eventId ? `/events/${eventId}/conversations` : '/events';
	return renderWithQueryClient(
		<MemoryRouter initialEntries={[path]}>
			<ToastProvider>
				<ConfirmProvider>
					<SessionProvider>
						<SessionHarness session={session} />
						<Routes>
							<Route path="/events/:eventId/:module" element={<ConversationsView />} />
							<Route path="*" element={<ConversationsView />} />
						</Routes>
					</SessionProvider>
				</ConfirmProvider>
			</ToastProvider>
		</MemoryRouter>,
	);
}

describe('ConversationsView', () => {
	beforeEach(() => {
		mockFetchEventAttendees.mockReset();
		mockLookupAttendeeByQr.mockReset();
		mockCheckInScan.mockReset();
		mockFetchAttendeeDetail.mockReset();
		mockFetchAttendeeCommunications.mockReset();
		mockFetchAttendeeNotes.mockReset();
		mockFetchAttendeeNotes.mockResolvedValue({ notes: [] });

		mockFetchEventAttendees.mockResolvedValue({
			attendees: checkedInAttendees,
			page: 1,
			pageSize: 200,
			total: 1,
		});
		mockLookupAttendeeByQr.mockResolvedValue({
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
		mockFetchAttendeeDetail.mockResolvedValue(baseDetail);
		mockFetchAttendeeCommunications.mockResolvedValue({
			contactId: 'mock-202',
			cutoffTimestamp: '2026-07-16T08:52:00.000Z',
			timeline: [],
		});
	});

	it("shows the working event in the TopBar pill (rail/tab-bar chrome can collapse the picker to an icon)", async () => {
		renderConversations();

		await screen.findByText('Pat Lee');
		expect(screen.getByText('Meeting Room')).toBeInTheDocument();
		expect(screen.getByText(/Working on:/)).toBeInTheDocument();
	});

	it('requests only checked-in attendees, not the full registered roster', async () => {
		renderConversations();

		await waitFor(() => {
			expect(mockFetchEventAttendees).toHaveBeenCalledWith('ev-mr-2026', {
				checkedIn: true,
				page: 1,
				pageSize: 200,
			});
		});
		expect(await screen.findByText('Pat Lee')).toBeInTheDocument();
	});

	it('excludes a registered-but-not-checked-in attendee from the list', async () => {
		mockFetchEventAttendees.mockResolvedValue({
			attendees: checkedInAttendees,
			page: 1,
			pageSize: 200,
			total: 1,
		});

		renderConversations();

		expect(await screen.findByText('Pat Lee')).toBeInTheDocument();
		expect(screen.queryByText('Jane Doe')).not.toBeInTheDocument();
	});

	it('opens the Attendee Detail modal when a row is selected from the list', async () => {
		renderConversations();

		fireEvent.click(await screen.findByText('Pat Lee'));

		await waitFor(() => {
			expect(mockFetchAttendeeDetail).toHaveBeenCalledWith('ev-mr-2026', 'mock-202');
		});
		expect(await screen.findByRole('heading', { name: 'Pat Lee' })).toBeInTheDocument();
	});

	it('QR scan resolves to the right attendee via the read-only lookup route, never checkInScan', async () => {
		renderConversations();

		fireEvent.click(await screen.findByRole('button', { name: 'Start scanner' }));
		await screen.findByRole('dialog', { name: 'Scan QR code' });
		fireEvent.click(screen.getByRole('button', { name: 'Simulate QR scan' }));

		await waitFor(() => {
			expect(mockLookupAttendeeByQr).toHaveBeenCalledWith('ev-mr-2026', 'mock-jwt-token');
		});
		expect(mockCheckInScan).not.toHaveBeenCalled();

		expect(screen.queryByRole('dialog', { name: 'Scan QR code' })).not.toBeInTheDocument();
		await waitFor(() => {
			expect(mockFetchAttendeeDetail).toHaveBeenCalledWith('ev-mr-2026', 'mock-202');
		});
		expect(await screen.findByRole('heading', { name: 'Pat Lee' })).toBeInTheDocument();
	});

	it('shows empty state when no eventId is in the URL', async () => {
		renderConversations(adminSession, null);

		expect(
			await screen.findByText(/Open an event from Programs & Events or the working-event picker/i),
		).toBeInTheDocument();
	});

	it('redirects non-admin users to the events list', async () => {
		renderWithQueryClient(
			<MemoryRouter initialEntries={['/events/ev-mr-2026/conversations']}>
				<ToastProvider>
					<SessionProvider>
						<Routes>
							<Route path="/events" element={<div>Events list</div>} />
							<Route
								path="/events/:eventId/:module"
								element={
									<>
										<SessionHarness session={staffSession} />
										<ConversationsView />
									</>
								}
							/>
						</Routes>
					</SessionProvider>
				</ToastProvider>
			</MemoryRouter>,
		);

		expect(await screen.findByText('Events list')).toBeInTheDocument();
	});

	it('renders hostile attendee data as text, never as markup (XSS guard)', async () => {
		const hostile = '"><img src=x onerror=alert(1)>';
		mockFetchEventAttendees.mockResolvedValue({
			attendees: [{ ...checkedInAttendees[0]!, firstName: hostile, lastName: '' }],
			page: 1,
			pageSize: 200,
			total: 1,
		});

		renderConversations();

		expect(await screen.findByText(hostile)).toBeInTheDocument();
		expect(document.querySelector('img')).toBeNull();
	});
});
