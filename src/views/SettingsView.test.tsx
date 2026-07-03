import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ToastProvider } from '../components/Toast';
import type { Event } from '../types';
import { SettingsView } from './SettingsView';

const mockEvent: Event = {
	id: 'evt-london-q3',
	name: '<img onerror=alert(1)> Summit',
	date: 'Oct 15, 2026',
	dateIso: '2026-10-15',
	endDate: 'Oct 15, 2026',
	location: 'London',
	status: 'active',
	attendeeCount: 150,
	capacity: 200,
	type: 'In-person',
	owner: 'events@adaptavist.com',
	registrationClose: 'Oct 10, 2026',
	hubspotId: 'HS-EVT-8842',
	description: 'Flagship summit.',
};

const mockDataService = {
	fetchEvent: vi.fn().mockResolvedValue({ event: mockEvent }),
};

vi.mock('../hooks/useDataService', () => ({
	useDataService: () => mockDataService,
}));

function renderSettings() {
	return render(
		<MemoryRouter initialEntries={['/events/evt-london-q3/settings']}>
			<ToastProvider>
				<Routes>
					<Route path="/events/:eventId/:module" element={<SettingsView />} />
				</Routes>
			</ToastProvider>
		</MemoryRouter>,
	);
}

describe('SettingsView', () => {
	it('renders event details from mock data', async () => {
		renderSettings();

		await waitFor(() => {
			expect(screen.getByText('Event details')).toBeInTheDocument();
		});

		expect(screen.getByText('HS-EVT-8842')).toBeInTheDocument();
		expect(screen.getByText('Active')).toBeInTheDocument();
	});

	it('escapes hostile event name (XSS)', async () => {
		renderSettings();

		await waitFor(() => {
			expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
				'<img onerror=alert(1)> Summit — Settings',
			);
		});

		expect(document.querySelector('img')).toBeNull();
	});
});
