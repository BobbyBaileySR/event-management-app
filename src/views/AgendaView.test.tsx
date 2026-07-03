import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { AgendaSession, Event } from '../types';
import { AgendaView } from './AgendaView';

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

const mockSessions: AgendaSession[] = [
	{
		id: 'ag-1',
		time: '09:00',
		title: 'Opening keynote',
		speaker: 'CEO',
		location: 'Main hall',
		track: 'Keynote',
	},
];

const mockDataService = {
	fetchEvent: vi.fn().mockResolvedValue({ event: mockEvent }),
	fetchAgenda: vi.fn().mockResolvedValue({ sessions: mockSessions }),
};

vi.mock('../hooks/useDataService', () => ({
	useDataService: () => mockDataService,
}));

function renderAgenda(eventId = 'evt-london-q3') {
	return render(
		<MemoryRouter initialEntries={[`/events/${eventId}/agenda`]}>
			<Routes>
				<Route path="/events/:eventId/:module" element={<AgendaView />} />
			</Routes>
		</MemoryRouter>,
	);
}

describe('AgendaView', () => {
	beforeEach(() => {
		mockSessions.splice(0, mockSessions.length, {
			id: 'ag-1',
			time: '09:00',
			title: 'Opening keynote',
			speaker: 'CEO',
			location: 'Main hall',
			track: 'Keynote',
		});
	});

	it('renders the session schedule table', async () => {
		renderAgenda();

		await waitFor(() => {
			expect(screen.getByRole('heading', { name: 'London Q3 Summit — Agenda' })).toBeInTheDocument();
		});

		expect(screen.getByText('Opening keynote')).toBeInTheDocument();
		expect(screen.getByText('Main hall')).toBeInTheDocument();
		expect(screen.getByText('Keynote')).toBeInTheDocument();
	});

	it('renders a hostile session title as text, never as markup (XSS guard)', async () => {
		const hostile = '"><img src=x onerror=alert(1)>';
		mockSessions[0] = { ...mockSessions[0], title: hostile };

		renderAgenda();

		await waitFor(() => {
			expect(screen.getByText(hostile)).toBeInTheDocument();
		});

		expect(document.querySelector('img')).toBeNull();
	});
});
