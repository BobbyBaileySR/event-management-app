import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ToastProvider } from '../components/Toast';
import type { Attendee, Event } from '../types';
import { AttendeesView } from './AttendeesView';

const mockEvent: Event = {
	id: 'evt-london-q3',
	name: 'London Q3 Summit',
	date: 'Oct 15, 2026',
	dateIso: '2026-10-15',
	location: 'London',
	status: 'active',
	attendeeCount: 2,
	capacity: 100,
	type: 'In-person',
	owner: 'events@adaptavist.com',
	registrationClose: 'Oct 10, 2026',
	hubspotId: 'HS-1',
	description: 'Test',
};

const mockAttendees: Attendee[] = [
	{
		id: 'c-001',
		name: 'Jane Doe',
		email: 'jane@example.com',
		company: 'Adaptavist',
		status: 'Registered',
		ticketType: 'General',
		registeredAt: '2026-08-01',
		source: 'HubSpot form',
	},
	{
		id: 'c-002',
		name: 'John Smith',
		email: 'john@example.com',
		company: 'Atlassian',
		status: 'Checked In',
		ticketType: 'VIP',
		registeredAt: '2026-08-12',
		source: 'Partner invite',
	},
];

const mockDataService = {
	fetchEvent: vi.fn().mockResolvedValue({ event: mockEvent }),
	fetchAttendees: vi.fn().mockResolvedValue({ attendees: mockAttendees }),
};

vi.mock('../hooks/useDataService', () => ({
	useDataService: () => mockDataService,
}));

function resetMockAttendees() {
	mockAttendees.splice(
		0,
		mockAttendees.length,
		{
			id: 'c-001',
			name: 'Jane Doe',
			email: 'jane@example.com',
			company: 'Adaptavist',
			status: 'Registered',
			ticketType: 'General',
			registeredAt: '2026-08-01',
			source: 'HubSpot form',
		},
		{
			id: 'c-002',
			name: 'John Smith',
			email: 'john@example.com',
			company: 'Atlassian',
			status: 'Checked In',
			ticketType: 'VIP',
			registeredAt: '2026-08-12',
			source: 'Partner invite',
		},
	);
}

function renderAttendees(eventId = 'evt-london-q3') {
	return render(
		<MemoryRouter initialEntries={[`/events/${eventId}/attendees`]}>
			<ToastProvider>
				<Routes>
					<Route path="/events/:eventId/:module" element={<AttendeesView />} />
				</Routes>
			</ToastProvider>
		</MemoryRouter>,
	);
}

describe('AttendeesView', () => {
	beforeEach(() => {
		resetMockAttendees();
	});

	it('renders the attendee table and segment filters', async () => {
		renderAttendees();

		await waitFor(() => {
			expect(screen.getByRole('heading', { name: 'London Q3 Summit — Attendees' })).toBeInTheDocument();
		});

		expect(screen.getByText('Jane Doe')).toBeInTheDocument();
		expect(screen.getByText('John Smith')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Registered' })).toBeInTheDocument();
	});

	it('shows the detail panel when a row is selected', async () => {
		renderAttendees();

		await waitFor(() => {
			expect(screen.getByText('Jane Doe')).toBeInTheDocument();
		});

		fireEvent.click(document.querySelector('tr[data-attendee-id="c-001"]')!);

		expect(document.getElementById('attendee-detail-panel')).toBeInTheDocument();
		expect(within(document.getElementById('attendee-detail-panel')!).getByText('jane@example.com')).toBeInTheDocument();
	});

	it('renders hostile attendee data as text, never as markup (XSS guard)', async () => {
		const hostile = '"><img src=x onerror=alert(1)>';
		mockAttendees[0] = { ...mockAttendees[0], name: hostile };

		renderAttendees();

		await waitFor(() => {
			expect(screen.getAllByText(hostile).length).toBeGreaterThan(0);
		});

		expect(document.querySelector('img')).toBeNull();
	});
});
