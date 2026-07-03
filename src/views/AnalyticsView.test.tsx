import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { AuditEntry, Event } from '../types';
import { AnalyticsView } from './AnalyticsView';

vi.mock('../components/ConversionChart', () => ({
	ConversionChart: () => <div data-testid="conversion-chart">Chart</div>,
}));

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

const mockAuditEntries: AuditEntry[] = [
	{
		id: 'aud-001',
		eventId: 'evt-london-q3',
		actorEmail: 'events@adaptavist.com',
		action: 'dispatch',
		templateName: '48-Hour Final Reminder',
		recipientCount: 142,
		timestamp: '2026-07-01T09:30:00Z',
		outcome: 'sent',
	},
];

const mockDataService = {
	fetchEvent: vi.fn().mockResolvedValue({ event: mockEvent }),
	fetchAnalytics: vi.fn().mockResolvedValue({
		conversion: { checkedIn: 45, registered: 98, cancelled: 7 },
	}),
	fetchCampaignMetrics: vi.fn().mockResolvedValue({
		metrics: { sent: 247, opened: 231, clicked: 142, bounced: 3 },
	}),
	fetchAuditLog: vi.fn().mockResolvedValue({ entries: mockAuditEntries }),
};

vi.mock('../hooks/useDataService', () => ({
	useDataService: () => mockDataService,
}));

function renderAnalytics(eventId = 'evt-london-q3') {
	return render(
		<MemoryRouter initialEntries={[`/events/${eventId}/analytics`]}>
			<Routes>
				<Route path="/events/:eventId/:module" element={<AnalyticsView />} />
			</Routes>
		</MemoryRouter>,
	);
}

describe('AnalyticsView', () => {
	beforeEach(() => {
		mockAuditEntries[0] = {
			id: 'aud-001',
			eventId: 'evt-london-q3',
			actorEmail: 'events@adaptavist.com',
			action: 'dispatch',
			templateName: '48-Hour Final Reminder',
			recipientCount: 142,
			timestamp: '2026-07-01T09:30:00Z',
			outcome: 'sent',
		};
	});

	it('renders summary stats, chart, campaign metrics, and audit list', async () => {
		renderAnalytics();

		await waitFor(() => {
			expect(screen.getByRole('heading', { name: 'London Q3 Summit — Analytics' })).toBeInTheDocument();
		});

		expect(screen.getByText('150')).toBeInTheDocument();
		expect(screen.getByTestId('conversion-chart')).toBeInTheDocument();
		expect(screen.getByText('231 (94%)')).toBeInTheDocument();
		expect(screen.getByText(/48-Hour Final Reminder — 142 recipients/)).toBeInTheDocument();
	});

	it('renders a hostile audit template name as text, never as markup (XSS guard)', async () => {
		const hostile = '"><img src=x onerror=alert(1)>';
		mockAuditEntries[0] = { ...mockAuditEntries[0], templateName: hostile };

		renderAnalytics();

		await waitFor(() => {
			expect(screen.getByText(new RegExp(hostile.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))).toBeInTheDocument();
		});

		expect(document.querySelector('img')).toBeNull();
	});
});
