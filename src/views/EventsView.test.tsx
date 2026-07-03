import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Event } from '../types';
import { EventsView } from './EventsView';

const mockEvents: Event[] = [
	{
		id: 'evt-1',
		name: 'London Summit',
		date: 'Oct 15, 2026',
		dateIso: '2026-10-15',
		location: 'London',
		status: 'active',
		attendeeCount: 10,
		capacity: 100,
		type: 'In-person',
		owner: 'events@adaptavist.com',
		registrationClose: 'Oct 10, 2026',
		hubspotId: 'HS-1',
		description: 'Test event',
	},
];

vi.mock('../hooks/useDataService', () => ({
	useDataService: () => ({
		fetchEvents: vi.fn().mockResolvedValue({ events: mockEvents }),
	}),
}));

function renderEventsView() {
	return render(
		<MemoryRouter>
			<EventsView />
		</MemoryRouter>,
	);
}

describe('EventsView', () => {
	it('renders the event list from the data service', async () => {
		renderEventsView();

		await waitFor(() => {
			expect(screen.getByRole('heading', { name: 'All Events' })).toBeInTheDocument();
		});

		expect(screen.getByText('London Summit')).toBeInTheDocument();
		expect(screen.getByText('10 / 100')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Open' })).toBeInTheDocument();
	});

	it('renders a hostile event name as text, never as markup (XSS guard)', async () => {
		const hostile = '"><img src=x onerror=alert(1)>';
		mockEvents[0] = { ...mockEvents[0], name: hostile };

		renderEventsView();

		await waitFor(() => {
			expect(screen.getByText(hostile)).toBeInTheDocument();
		});

		expect(document.querySelector('img')).toBeNull();
	});
});
