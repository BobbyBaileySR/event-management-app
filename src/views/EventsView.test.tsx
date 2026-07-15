import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ToastProvider } from '../components/Toast';
import type { CatalogEventSummary, CatalogProgram } from '../types';
import '../styles/fonts.css';
import '../../css/components.css';
import { CatalogAdminView } from './CatalogAdminView';
import { EventsView } from './EventsView';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
	const actual = await importOriginal<typeof import('react-router-dom')>();
	return {
		...actual,
		useNavigate: () => mockNavigate,
	};
});

const mockPrograms: CatalogProgram[] = [
	{
		id: 'prog-emea',
		name: 'EMEA Summit',
		archived: false,
		description: 'Regional program',
		startDate: '2026-09-01',
	},
];

const mockEvents: CatalogEventSummary[] = [
	{
		id: 'evt-1',
		programId: 'prog-emea',
		name: 'London Summit',
		start: '2026-10-15T09:00:00.000Z',
		end: '2026-10-16T17:00:00.000Z',
		location: 'London',
		capacity: 100,
		status: 'active',
		publishState: 'published',
		owner: 'events@adaptavist.com',
		archived: false,
	},
	{
		id: 'evt-2',
		programId: null,
		name: 'Solo Roadshow',
		start: '2026-11-02T09:00:00.000Z',
		end: '2026-11-02T17:00:00.000Z',
		location: 'Dublin',
		capacity: 50,
		status: 'active',
		publishState: 'published',
		owner: 'events@adaptavist.com',
		archived: false,
	},
	{
		id: 'evt-3',
		programId: 'prog-emea',
		name: 'Cancelled Briefing',
		start: '2026-12-01T09:00:00.000Z',
		end: '2026-12-01T12:00:00.000Z',
		location: 'Remote',
		capacity: 20,
		status: 'cancelled',
		publishState: 'published',
		owner: 'events@adaptavist.com',
		archived: false,
	},
];

const archivedPrograms: CatalogProgram[] = [{ ...mockPrograms[0]!, archived: true }];
const archivedEvents: CatalogEventSummary[] = [
	{
		...mockEvents[0]!,
		id: 'evt-archived',
		name: 'Archived Summit',
		archived: true,
	},
];

const {
	mockFetchCatalog,
	mockFetchEventCapacityStatus,
	mockCreateProgram,
	mockCreateEvent,
	mockUpdateProgram,
	mockUpdateEvent,
	mockDataService,
} = vi.hoisted(() => {
	const mockFetchCatalog = vi.fn();
	const mockFetchEventCapacityStatus = vi.fn();
	const mockCreateProgram = vi.fn();
	const mockCreateEvent = vi.fn();
	const mockUpdateProgram = vi.fn();
	const mockUpdateEvent = vi.fn();
	/** Stable service object — a fresh object each render would retrigger loadCatalog via [data]. */
	const mockDataService = {
		fetchCatalog: mockFetchCatalog,
		fetchEventCapacityStatus: mockFetchEventCapacityStatus,
		createProgram: mockCreateProgram,
		createEvent: mockCreateEvent,
		updateProgram: mockUpdateProgram,
		updateEvent: mockUpdateEvent,
	};
	return {
		mockFetchCatalog,
		mockFetchEventCapacityStatus,
		mockCreateProgram,
		mockCreateEvent,
		mockUpdateProgram,
		mockUpdateEvent,
		mockDataService,
	};
});

vi.mock('../hooks/useDataService', () => ({
	useDataService: () => mockDataService,
}));

function renderEventsView() {
	return render(
		<MemoryRouter>
			<ToastProvider>
				<EventsView />
			</ToastProvider>
		</MemoryRouter>,
	);
}

function renderCatalogRedirect() {
	return render(
		<MemoryRouter initialEntries={['/catalog']}>
			<Routes>
				<Route path="/catalog" element={<CatalogAdminView />} />
				<Route path="/events" element={<div>Programs & Events destination</div>} />
			</Routes>
		</MemoryRouter>,
	);
}

describe('EventsView (Programs & Events)', () => {
	beforeEach(() => {
		mockNavigate.mockReset();
		mockFetchCatalog.mockImplementation(async (options?: { includeArchived?: boolean }) => {
			if (options?.includeArchived) {
				return { events: archivedEvents, programs: archivedPrograms };
			}
			return { events: mockEvents, programs: mockPrograms };
		});
		mockFetchEventCapacityStatus.mockImplementation(async (eventId: string) => {
			const event =
				mockEvents.find((entry) => entry.id === eventId) ??
				archivedEvents.find((entry) => entry.id === eventId);
			return {
				programId: event?.programId ?? '_standalone',
				eventId,
				capacity: event?.capacity ?? 0,
				checkedInCount: eventId === 'evt-1' ? 10 : 0,
				departureCount: 0,
				liveAttendance: eventId === 'evt-1' ? 10 : 0,
			};
		});
		mockCreateProgram.mockResolvedValue({ program: mockPrograms[0] });
		mockCreateEvent.mockResolvedValue({ event: mockEvents[0] });
		mockUpdateProgram.mockResolvedValue({ program: mockPrograms[0] });
		mockUpdateEvent.mockResolvedValue({ event: mockEvents[0] });
	});

	afterEach(() => {
		document.documentElement.removeAttribute('data-theme');
	});

	it('renders the search/edit icon glyphs with the Material Symbols font, not literal Manrope text', async () => {
		const { container } = renderEventsView();

		await screen.findByText('London Summit');

		const glyphs = container.querySelectorAll('.material-symbols-outlined');
		expect(glyphs.length).toBeGreaterThan(0);
		for (const glyph of Array.from(glyphs)) {
			expect(getComputedStyle(glyph).fontFamily).toBe('"Material Symbols Outlined"');
		}
	});

	it('renders Programs & Events chrome with Active/Archived tabs and create buttons', async () => {
		renderEventsView();

		await waitFor(() => {
			expect(screen.getByRole('heading', { name: 'Programs & Events' })).toBeInTheDocument();
		});

		expect(screen.getByText('Create, manage and archive your event lineup')).toBeInTheDocument();
		expect(screen.getByRole('tab', { name: 'Active' })).toHaveAttribute('aria-selected', 'true');
		expect(screen.getByRole('tab', { name: 'Archived' })).toHaveAttribute('aria-selected', 'false');
		expect(screen.getByRole('button', { name: '+ New program' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: '+ New event' })).toBeInTheDocument();
		expect(screen.getByText('London Summit')).toBeInTheDocument();
		expect(screen.getByText('10/100')).toBeInTheDocument();
	});

	it('sizes the search field to match the "+ New program"/"+ New event" button next to it (not the reverse)', async () => {
		renderEventsView();
		await screen.findByText('London Summit');

		const programSearch = screen.getByLabelText('Search programs').closest('label') as HTMLElement;
		const eventSearch = screen.getByLabelText('Search events').closest('label') as HTMLElement;
		const newProgramButton = screen.getByRole('button', { name: '+ New program' });
		const newEventButton = screen.getByRole('button', { name: '+ New event' });

		// The button (`.btn.btn-sm`, shared/global) is the fixed point — its vertical
		// padding is the target the search field is sized to match, not the other way
		// around. Neither has an explicit min-height, so they size to this padding.
		expect(getComputedStyle(programSearch).paddingTop).toBe(getComputedStyle(newProgramButton).paddingTop);
		expect(getComputedStyle(eventSearch).paddingTop).toBe(getComputedStyle(newEventButton).paddingTop);
		expect(getComputedStyle(programSearch).minHeight).not.toBe('44px');
		expect(getComputedStyle(eventSearch).minHeight).not.toBe('44px');
	});

	it('styles the Active/Archived lifecycle tabs like the status filter pills (design_handoff 2)', async () => {
		renderEventsView();
		await screen.findByText('London Summit');

		// lifecycleTab defaults to 'active' (Active tab selected); statusFilter defaults to
		// 'all' (All pill selected) — compare the two families' *selected* look to each other.
		const activeTab = screen.getByRole('tab', { name: 'Active' });
		const activePill = screen.getByRole('button', { name: 'All' });

		expect(getComputedStyle(activeTab).borderRadius).toBe(getComputedStyle(activePill).borderRadius);
		expect(getComputedStyle(activeTab).minHeight).toBe(getComputedStyle(activePill).minHeight);
	});

	it('gives inactive tabs/pills a flush, muted look — not a duplicate light-blue fill (design_handoff 2)', async () => {
		renderEventsView();
		await screen.findByText('London Summit');

		const activeTab = screen.getByRole('tab', { name: 'Active' });
		const inactiveTab = screen.getByRole('tab', { name: 'Archived' });
		const activePill = screen.getByRole('button', { name: 'All' });
		const inactivePill = screen.getByRole('button', { name: 'Cancelled' });

		// Active gets the accent token; inactive gets the same muted token as its family
		// counterpart (not the darker --text the pills used before, which read too close
		// to the active accent color once both were filled/bordered the same way).
		expect(getComputedStyle(activeTab).color).toBe('var(--accent)');
		expect(getComputedStyle(activePill).color).toBe('var(--accent)');
		expect(getComputedStyle(inactiveTab).color).toBe('var(--muted)');
		expect(getComputedStyle(inactivePill).color).toBe('var(--muted)');
	});

	it('filters events by program card and clears via the dismissible chip (incl. standalone)', async () => {
		renderEventsView();

		await screen.findByText('London Summit');

		fireEvent.click(screen.getByRole('button', { name: 'Filter by No program (standalone)' }));
		expect(screen.getByText('Filtered by program:')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Filter by No program (standalone)' })).toHaveAttribute(
			'aria-pressed',
			'true',
		);
		expect(screen.getByText('Solo Roadshow')).toBeInTheDocument();
		expect(screen.queryByText('London Summit')).not.toBeInTheDocument();

		fireEvent.click(screen.getByRole('button', { name: 'Clear program filter' }));
		expect(screen.queryByText('Filtered by program:')).not.toBeInTheDocument();
		expect(screen.getByText('London Summit')).toBeInTheDocument();

		fireEvent.click(screen.getByRole('button', { name: 'Filter by EMEA Summit' }));
		expect(screen.getByText('Filtered by program:')).toBeInTheDocument();
		const chipRow = screen.getByText('Filtered by program:').parentElement!;
		expect(within(chipRow).getByText('EMEA Summit')).toBeInTheDocument();
		expect(screen.getByText('London Summit')).toBeInTheDocument();
		expect(screen.queryByText('Solo Roadshow')).not.toBeInTheDocument();
	});

	it('shows status filters on Active only and hides create affordances on Archived', async () => {
		const user = userEvent.setup();
		renderEventsView();

		await screen.findByText('London Summit');
		expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /^Active$/ })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Cancelled' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Completed' })).toBeInTheDocument();

		await user.click(screen.getByRole('button', { name: 'Cancelled' }));
		expect(screen.getByText('Cancelled Briefing')).toBeInTheDocument();
		expect(screen.queryByText('London Summit')).not.toBeInTheDocument();

		await user.click(screen.getByRole('tab', { name: 'Archived' }));

		await waitFor(() => {
			expect(mockFetchCatalog).toHaveBeenCalledWith({ includeArchived: true });
		});
		await screen.findByText('Archived Summit');

		expect(screen.queryByRole('button', { name: '+ New program' })).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: '+ New event' })).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Cancelled' })).not.toBeInTheDocument();
	});

	it('opens create Program / Event modals from the header actions', async () => {
		const user = userEvent.setup();
		renderEventsView();

		await screen.findByText('London Summit');

		await user.click(screen.getByRole('button', { name: '+ New program' }));
		expect(screen.getByRole('heading', { name: 'Create Program' })).toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: 'Cancel' }));

		await user.click(screen.getByRole('button', { name: '+ New event' }));
		expect(screen.getByRole('heading', { name: 'Create Event' })).toBeInTheDocument();
	});

	it('navigates to Event Details on event row click (no row edit/archive controls)', async () => {
		renderEventsView();

		await screen.findByText('London Summit');
		expect(screen.queryByRole('button', { name: /Edit Event/i })).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: /Archive Event/i })).not.toBeInTheDocument();

		fireEvent.click(screen.getByRole('link', { name: 'Open London Summit' }));
		expect(mockNavigate).toHaveBeenCalledWith('/events/evt-1');
	});

	it('renders a trailing chevron column (empty header, "›" per row) and "‹ Prev" / "Next ›" pagination (design_handoff 2)', async () => {
		renderEventsView();

		await screen.findByText('London Summit');

		const table = screen.getByRole('table');
		const headers = within(table).getAllByRole('columnheader');
		expect(headers).toHaveLength(6);
		expect(within(headers[5]!).getByText('Open event')).toBeInTheDocument();

		const row = screen.getByRole('link', { name: 'Open London Summit' });
		// The chevron `<td>` is `aria-hidden` (purely decorative — the row's own role="link"/
		// aria-label already carries the accessible name), so query the DOM directly rather
		// than via role, which would (correctly) exclude it from the accessibility tree.
		expect(row.lastElementChild).toHaveTextContent('›');

		expect(screen.getByRole('button', { name: '‹ Prev' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Next ›' })).toBeInTheDocument();
	});

	it('renders hostile program and event names as text, never as markup (XSS guard)', async () => {
		const hostileProgram = '"><img src=x onerror=alert(1)>Program';
		const hostileEvent = '"><script>alert(1)</script>Event';
		mockFetchCatalog.mockImplementation(async () => ({
			programs: [{ ...mockPrograms[0]!, name: hostileProgram }],
			events: [{ ...mockEvents[0]!, name: hostileEvent }],
		}));

		renderEventsView();

		await waitFor(() => {
			expect(screen.getByText(hostileEvent)).toBeInTheDocument();
		});
		expect(screen.getAllByText(hostileProgram).length).toBeGreaterThan(0);
		expect(document.querySelector('img')).toBeNull();
		expect(document.querySelector('script')).toBeNull();
	});

	it('renders under the darkAurora theme with no hardcoded inline hex colors', async () => {
		document.documentElement.setAttribute('data-theme', 'darkAurora');
		const { container } = renderEventsView();

		await waitFor(() => {
			expect(screen.getByRole('heading', { name: 'Programs & Events' })).toBeInTheDocument();
		});

		expect(container.innerHTML).not.toMatch(/style="[^"]*#[0-9a-fA-F]{3,8}/i);
	});
});

describe('Catalog admin retirement (T079)', () => {
	it('redirects #/catalog to #/events', async () => {
		renderCatalogRedirect();
		expect(await screen.findByText('Programs & Events destination')).toBeInTheDocument();
	});
});
