import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { renderWithQueryClient } from '../testing/renderWithQueryClient';
import type { AuditLogEntry, CatalogEventSummary, CatalogProgram } from '../types';
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

const mockFetchScheduledEmailSummary = vi
	.fn()
	.mockResolvedValue({ emailsScheduledThisWeek: 0, eventsWithScheduledEmails: 0 });

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

const mockFetchCatalog = vi.fn().mockImplementation(async () => ({ events: mockEvents, programs: mockPrograms }));
const mockFetchCapacitySummary = vi.fn().mockImplementation(async () => ({
	events: mockEvents.map((event) => ({
		eventId: event.id,
		programId: event.programId,
		capacity: event.capacity ?? null,
		registeredCount: 150,
		checkedInCount: 150,
	})),
}));
const mockFetchAuditLog = vi
	.fn()
	.mockImplementation(async () => ({ entries: mockActivity, page: 1, pageSize: 5, total: 1 }));
/** Never called from this view (T034) — present only so a regression to the old per-event fan-out would be caught. */
const mockFetchEventCapacityStatus = vi.fn();

// A stable object reference matters here, not just for tidiness: the domain hooks
// (useCatalog/useCapacitySummary/useAuditLog/useDispatches) call useDataService() internally,
// and the real useDataService() memoizes its return value (useMemo keyed on the session
// token). A mock that returns a *new* object literal on every call would break that
// invariant elsewhere in the app, so keep the same stable-reference shape here too.
const mockDataService = {
	fetchCatalog: mockFetchCatalog,
	fetchCapacitySummary: mockFetchCapacitySummary,
	fetchEventCapacityStatus: mockFetchEventCapacityStatus,
	fetchAuditLog: mockFetchAuditLog,
	fetchScheduledEmailSummary: mockFetchScheduledEmailSummary,
};

vi.mock('../hooks/useDataService', () => ({
	useDataService: () => mockDataService,
}));

function renderOverview() {
	return renderWithQueryClient(
		<MemoryRouter initialEntries={['/overview']}>
			<OverviewView />
		</MemoryRouter>,
	);
}

describe('OverviewView', () => {
	it('renders stat tiles, upcoming events, and recent activity', async () => {
		renderOverview();

		// The loading state renders the same "Overview" heading (different content below it) —
		// wait for loaded-only content first so the assertions below don't race the catalog/
		// audit/scheduled-summary fetches.
		await screen.findByText('Events this month');

		expect(screen.getByRole('heading', { name: 'Overview' })).toBeInTheDocument();
		expect(screen.getByText('Total registered')).toBeInTheDocument();
		expect(screen.getByText('Registered this week')).toBeInTheDocument();
		expect(screen.getByText('Emails scheduled this week')).toBeInTheDocument();

		expect(screen.getByRole('heading', { name: 'Upcoming events' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /London Q3 Summit/ })).toBeInTheDocument();
		expect(screen.getByText('OCT')).toBeInTheDocument();
		expect(screen.getByText('15')).toBeInTheDocument();

		expect(screen.getByRole('heading', { name: 'Recent activity' })).toBeInTheDocument();
		expect(screen.getByText('events@adaptavist.com')).toBeInTheDocument();
		// Timestamp must be its own line (not concatenated onto the action text).
		const activityMeta = document.querySelector('[class*="activityMeta"]');
		expect(activityMeta?.textContent).toMatch(/2026/);
		expect(activityMeta?.tagName).toBe('P');

		await waitFor(() => {
			expect(mockFetchScheduledEmailSummary).toHaveBeenCalledTimes(1);
		});
	});

	it('renders the emails-scheduled stat from the single aggregate call, not a per-event fan-out', async () => {
		mockFetchScheduledEmailSummary.mockResolvedValueOnce({
			emailsScheduledThisWeek: 5,
			eventsWithScheduledEmails: 2,
		});

		renderOverview();

		await waitFor(() => {
			expect(screen.getByText('5')).toBeInTheDocument();
		});
		expect(screen.getByText('Across 2 events')).toBeInTheDocument();
		expect(mockFetchScheduledEmailSummary).toHaveBeenCalledWith();
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

	it('issues exactly one fetchCatalog + one fetchCapacitySummary call regardless of event count (no per-event fan-out)', async () => {
		mockFetchCatalog.mockClear();
		mockFetchCapacitySummary.mockClear();
		mockFetchEventCapacityStatus.mockClear();

		renderOverview();

		await screen.findByText('Events this month');

		expect(mockFetchCatalog).toHaveBeenCalledTimes(1);
		expect(mockFetchCapacitySummary).toHaveBeenCalledTimes(1);
		expect(mockFetchEventCapacityStatus).not.toHaveBeenCalled();
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
