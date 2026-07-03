import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { Event } from '../types';
import { EventHubView } from './EventHubView';

const mockEvent: Event = {
	id: 'evt-london-q3',
	name: 'London Q3 Summit',
	date: 'Oct 15, 2026',
	dateIso: '2026-10-15',
	location: 'The Shard',
	status: 'active',
	attendeeCount: 150,
	capacity: 200,
	type: 'In-person',
	owner: 'events@adaptavist.com',
	registrationClose: 'Oct 10, 2026',
	hubspotId: 'HS-EVT-8842',
	description: 'Flagship summit',
};

vi.mock('../hooks/useDataService', () => ({
	useDataService: () => ({
		fetchEvent: vi.fn().mockResolvedValue({ event: mockEvent }),
		fetchAnalytics: vi.fn().mockResolvedValue({
			conversion: { checkedIn: 45, registered: 98, cancelled: 7 },
		}),
		fetchActivity: vi.fn().mockResolvedValue({
			activity: [
				{
					id: 'act-1',
					timestamp: '2026-07-01T09:30:00Z',
					summary: 'Reminder email sent',
					actor: 'events@adaptavist.com',
				},
			],
		}),
	}),
}));

function renderEventHub(eventId: string) {
	return render(
		<MemoryRouter initialEntries={[`/events/${eventId}`]}>
			<Routes>
				<Route path="/events/:eventId" element={<EventHubView />} />
			</Routes>
		</MemoryRouter>,
	);
}

describe('EventHubView', () => {
	it('renders event summary and activity', async () => {
		renderEventHub('evt-london-q3');

		await waitFor(() => {
			expect(screen.getByRole('heading', { name: 'London Q3 Summit' })).toBeInTheDocument();
		});

		expect(screen.getByText('Flagship summit')).toBeInTheDocument();
		expect(screen.getByText('Reminder email sent')).toBeInTheDocument();
		expect(screen.getByRole('heading', { name: 'Attendees' })).toBeInTheDocument();
	});

	it('renders a hostile event name as text, never as markup (XSS guard)', async () => {
		const hostile = '"><img src=x onerror=alert(1)>';
		mockEvent.name = hostile;

		renderEventHub('evt-london-q3');

		await waitFor(() => {
			expect(screen.getByRole('heading', { name: hostile })).toBeInTheDocument();
		});

		expect(document.querySelector('img')).toBeNull();
	});
});
