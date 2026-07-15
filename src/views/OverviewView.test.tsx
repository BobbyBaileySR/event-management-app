import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { AuditLogEntry, CatalogEventSummary, CatalogProgram, ScheduledEmail } from '../types';
import { OverviewView } from './OverviewView';

const mockPrograms: CatalogProgram[] = [{ id: 'prog-emea', name: 'EMEA Regional Series', archived: false }];

const mockEvents: CatalogEventSummary[] = [
	{
		id: 'evt-london-q3',
		programId: 'prog-emea',
		name: 'London Q3 Summit',
		start: '2026-10-15T09:00:00.000Z',
		end: '2026-10-16T17:00:00.000Z',
		location: 'The Shard, London',
		capacity: 200,
		status: 'active',
		publishState: 'published',
		owner: 'events@adaptavist.com',
		archived: false,
	},
];

const mockScheduled: ScheduledEmail[] = [];

const mockActivity: AuditLogEntry[] = [
	{
		id: 'audit-1',
		timestamp: '2026-07-13T09:30:00Z',
		action: 'checkin.confirm',
		actor: 'events@adaptavist.com',
		eventId: 'evt-london-q3',
		resourceType: 'attendee',
		resourceId: 'c-001',
		outcome: 'success',
	},
];

vi.mock('../hooks/useDataService', () => ({
	useDataService: () => ({
		fetchCatalog: vi.fn().mockResolvedValue({ events: mockEvents, programs: mockPrograms }),
		fetchEventCapacityStatus: vi.fn().mockResolvedValue({
			programId: 'prog-emea',
			eventId: 'evt-london-q3',
			capacity: 200,
			checkedInCount: 150,
			departureCount: 0,
			liveAttendance: 150,
		}),
		fetchAuditLog: vi.fn().mockResolvedValue({ entries: mockActivity, page: 1, pageSize: 5, total: 1 }),
		fetchScheduledEmails: vi.fn().mockResolvedValue({ scheduled: mockScheduled }),
	}),
}));

function renderOverview() {
	return render(
		<MemoryRouter initialEntries={['/overview']}>
			<OverviewView />
		</MemoryRouter>,
	);
}

describe('OverviewView', () => {
	it('renders stat tiles, upcoming events, and recent activity', async () => {
		renderOverview();

		await waitFor(() => {
			expect(screen.getByRole('heading', { name: 'Overview' })).toBeInTheDocument();
		});

		expect(screen.getByText('Events this month')).toBeInTheDocument();
		expect(screen.getByText('Total registered')).toBeInTheDocument();
		expect(screen.getByText('Registered this week')).toBeInTheDocument();
		expect(screen.getByText('Emails scheduled this week')).toBeInTheDocument();

		expect(screen.getByRole('heading', { name: 'Upcoming events' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /London Q3 Summit/ })).toBeInTheDocument();

		expect(screen.getByRole('heading', { name: 'Recent activity' })).toBeInTheDocument();
		expect(screen.getByText('events@adaptavist.com')).toBeInTheDocument();
	});

	it('renders a hostile event name as text, never as markup (XSS guard)', async () => {
		const hostile = '"><img src=x onerror=alert(1)>';
		mockEvents[0] = { ...mockEvents[0], name: hostile };

		renderOverview();

		await waitFor(() => {
			expect(screen.getByRole('button', { name: `Open ${hostile}` })).toBeInTheDocument();
		});

		expect(document.querySelector('img')).toBeNull();
		mockEvents[0] = { ...mockEvents[0], name: 'London Q3 Summit' };
	});

	it('renders a hostile audit actor as text, never as markup (XSS guard)', async () => {
		const hostile = '"><img src=x onerror=alert(1)>';
		mockActivity[0] = { ...mockActivity[0], actor: hostile };

		renderOverview();

		await waitFor(() => {
			expect(screen.getByText(hostile)).toBeInTheDocument();
		});

		expect(document.querySelector('img')).toBeNull();
		mockActivity[0] = { ...mockActivity[0], actor: 'events@adaptavist.com' };
	});
});
