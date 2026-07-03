import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ToastProvider } from '../components/Toast';
import type { Attendee, Event } from '../types';
import { CheckInView } from './CheckInView';

const mockEvent: Event = {
	id: 'evt-london-q3',
	name: 'London Q3 Summit',
	date: 'Oct 15, 2026',
	dateIso: '2026-10-15',
	location: 'London',
	status: 'active',
	attendeeCount: 150,
	capacity: 200,
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

function renderCheckIn(eventId = 'evt-london-q3') {
	return render(
		<MemoryRouter initialEntries={[`/events/${eventId}/check-in`]}>
			<ToastProvider>
				<Routes>
					<Route path="/events/:eventId/:module" element={<CheckInView />} />
				</Routes>
			</ToastProvider>
		</MemoryRouter>,
	);
}

describe('CheckInView', () => {
	beforeEach(() => {
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
	});

	it('shows only registered attendees and supports check-in toast', async () => {
		renderCheckIn();

		await waitFor(() => {
			expect(screen.getByRole('heading', { name: 'London Q3 Summit — Check-in' })).toBeInTheDocument();
		});

		expect(screen.getByText('Jane Doe')).toBeInTheDocument();
		expect(screen.queryByText('John Smith')).not.toBeInTheDocument();

		fireEvent.click(screen.getByRole('button', { name: 'Check in' }));

		await waitFor(() => {
			expect(screen.getByRole('status')).toHaveTextContent('Jane Doe checked in (PoC — no HubSpot write yet).');
		});
	});

	it('renders a hostile attendee name as text, never as markup (XSS guard)', async () => {
		const hostile = '"><img src=x onerror=alert(1)>';
		mockAttendees[0] = { ...mockAttendees[0], name: hostile };

		renderCheckIn();

		await waitFor(() => {
			expect(screen.getByText(hostile)).toBeInTheDocument();
		});

		expect(document.querySelector('img')).toBeNull();
	});
});
