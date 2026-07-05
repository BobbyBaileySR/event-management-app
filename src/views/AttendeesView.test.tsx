import { useEffect } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
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

vi.mock('../hooks/useDataService', () => ({
	useDataService: () => ({
		fetchSliceAttendees: mockFetchSliceAttendees,
	}),
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
			programId: 'prog-1',
			evId: 'ev-1',
			programName: 'Atlassian Event 2026',
			eventName: 'Meeting Room',
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
});
