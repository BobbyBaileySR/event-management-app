import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ToastProvider } from '../components/Toast';
import type { CatalogEventSummary, CatalogProgram, SliceAttendee } from '../types';
import { EventHubView } from './EventHubView';

const mockPrograms: CatalogProgram[] = [{ id: 'prog-emea', name: 'EMEA Regional Series', archived: false }];

const mockEvent: CatalogEventSummary = {
	id: 'evt-london-q3',
	programId: 'prog-emea',
	name: 'London Q3 Summit',
	start: '2026-10-15T09:00:00.000Z',
	end: '2026-10-16T17:00:00.000Z',
	location: 'The Shard',
	capacity: 200,
	status: 'active',
	publishState: 'published',
	owner: 'events@adaptavist.com',
	archived: false,
};

const mockAttendees: SliceAttendee[] = [
	{
		contactId: 'c-001',
		firstName: 'Jane',
		lastName: 'Doe',
		company: 'Adaptavist',
		email: 'j@x.com',
		accountManager: '',
		attendeeType: 'customer',
		checkedIn: false,
		checkedInAt: null,
	},
];

const fetchCatalog = vi.fn();
const fetchEventCapacityStatus = vi.fn();
const fetchEventAttendees = vi.fn();
const updateEvent = vi.fn();
const mockNavigate = vi.fn();
/** Stable reference — a new object each render would re-fire EventHub's load effect. */
const dataService = {
	fetchCatalog,
	fetchEventCapacityStatus,
	fetchEventAttendees,
	updateEvent,
};

vi.mock('../hooks/useDataService', () => ({
	useDataService: () => dataService,
}));

vi.mock('react-router-dom', async (importOriginal) => {
	const actual = await importOriginal<typeof import('react-router-dom')>();
	return {
		...actual,
		useNavigate: () => mockNavigate,
	};
});

function renderEventHub(eventId: string) {
	return render(
		<MemoryRouter initialEntries={[`/events/${eventId}`]}>
			<ToastProvider>
				<Routes>
					<Route path="/events/:eventId" element={<EventHubView />} />
				</Routes>
			</ToastProvider>
		</MemoryRouter>,
	);
}

describe('EventHubView (Event Details)', () => {
	beforeEach(() => {
		mockNavigate.mockReset();
		updateEvent.mockReset();
		fetchCatalog.mockImplementation(() => Promise.resolve({ events: [mockEvent], programs: mockPrograms }));
		fetchEventCapacityStatus.mockImplementation(() =>
			Promise.resolve({
				programId: 'prog-emea',
				eventId: 'evt-london-q3',
				capacity: 200,
				checkedInCount: 45,
				departureCount: 0,
				liveAttendance: 45,
			}),
		);
		fetchEventAttendees.mockImplementation(() =>
			Promise.resolve({ attendees: mockAttendees, page: 1, pageSize: 5, total: 98 }),
		);
	});

	afterEach(() => {
		document.documentElement.removeAttribute('data-theme');
		mockEvent.name = 'London Q3 Summit';
		mockEvent.archived = false;
		mockAttendees[0] = { ...mockAttendees[0]!, firstName: 'Jane', lastName: 'Doe' };
	});

	it('renders event summary, stats, and attendee preview', async () => {
		renderEventHub('evt-london-q3');

		await waitFor(() => {
			expect(screen.getByRole('heading', { name: 'London Q3 Summit' })).toBeInTheDocument();
		});

		expect(screen.getByRole('heading', { name: 'Attendees' })).toBeInTheDocument();
		expect(screen.getByRole('heading', { name: 'Capacity' })).toBeInTheDocument();
		expect(screen.getByRole('heading', { name: 'Details' })).toBeInTheDocument();
		expect(screen.getByText('Jane Doe')).toBeInTheDocument();
		expect(screen.getByText('✓ Working event')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'See all ›' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Edit event' })).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: /^Archive$/ })).not.toBeInTheDocument();

		expect(screen.getByText('Registered', { selector: '.hub-stat__label' })).toBeInTheDocument();
		expect(screen.getByText('98', { selector: '.hub-stat__value' })).toBeInTheDocument();

		fireEvent.click(screen.getByRole('button', { name: 'See all ›' }));
		expect(mockNavigate).toHaveBeenCalledWith('/events/evt-london-q3/attendees');
	});

	it('renders the page-level "Event Details" header alongside the event\'s own name (design_handoff 2)', async () => {
		renderEventHub('evt-london-q3');

		await waitFor(() => {
			expect(screen.getByRole('heading', { level: 1, name: 'Event Details' })).toBeInTheDocument();
		});

		expect(screen.getByText('Full record for the selected event')).toBeInTheDocument();
		expect(screen.getByRole('heading', { level: 2, name: 'London Q3 Summit' })).toBeInTheDocument();
	});

	it('top-aligns the Edit event button with the badges/title block, not centered (design_handoff 2)', async () => {
		const { container } = renderEventHub('evt-london-q3');

		await waitFor(() => {
			expect(screen.getByRole('heading', { name: 'London Q3 Summit' })).toBeInTheDocument();
		});

		// The row pairing the title block and the button — its own `align-items` (default
		// `stretch`) is what actually determines whether the button sits at the top or
		// stretches/centers against the row; `.headerActions`'s own flex-start only governs
		// alignment *within* that (possibly stretched) box, which isn't the real fix on its own.
		const row = container.querySelector('[class*="headerRow"]') as HTMLElement;
		expect(getComputedStyle(row).alignItems).toBe('flex-start');

		const actions = container.querySelector('[class*="headerActions"]') as HTMLElement;
		expect(getComputedStyle(actions).alignItems).toBe('flex-start');
	});

	it('splits Attendees/Capacity+Details 2fr/1fr, not an even 1fr/1fr grid (design_handoff 2 layout.split3)', async () => {
		const { container } = renderEventHub('evt-london-q3');

		await waitFor(() => {
			expect(screen.getByRole('heading', { name: 'London Q3 Summit' })).toBeInTheDocument();
		});

		const grid = container.querySelector('[class*="detailGrid"]') as HTMLElement;
		expect(getComputedStyle(grid).gridTemplateColumns).toBe('2fr 1fr');
	});

	it('does not render a stray separator when an event has no location', async () => {
		fetchCatalog.mockImplementationOnce(() =>
			Promise.resolve({ events: [{ ...mockEvent, location: '' }], programs: mockPrograms }),
		);
		renderEventHub('evt-london-q3');

		await waitFor(() => {
			expect(screen.getByRole('heading', { name: 'London Q3 Summit' })).toBeInTheDocument();
		});

		expect(screen.queryByText('·', { exact: true })).not.toBeInTheDocument();
	});

	it('opens CatalogEventModal on Edit event with archive path and does not navigate to settings', async () => {
		renderEventHub('evt-london-q3');

		await waitFor(() => {
			expect(screen.getByRole('heading', { name: 'London Q3 Summit' })).toBeInTheDocument();
		});

		fireEvent.click(screen.getByRole('button', { name: 'Edit event' }));

		expect(screen.getByRole('heading', { name: 'Edit Event' })).toBeInTheDocument();
		expect(screen.getByRole('dialog')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Archive Event' })).toBeInTheDocument();
		expect(mockNavigate).not.toHaveBeenCalled();
		expect(mockNavigate).not.toHaveBeenCalledWith(expect.stringContaining('/settings'));
	});

	it('omits Type and Registration closes from the detail fields (T071)', async () => {
		renderEventHub('evt-london-q3');

		await waitFor(() => {
			expect(screen.getByRole('heading', { name: 'London Q3 Summit' })).toBeInTheDocument();
		});

		expect(screen.queryByText('Type')).not.toBeInTheDocument();
		expect(screen.queryByText('Registration closes')).not.toBeInTheDocument();
		expect(screen.getByText('Program')).toBeInTheDocument();
		expect(screen.getByText('Location')).toBeInTheDocument();
		expect(screen.getByText('Date')).toBeInTheDocument();
		expect(screen.getByText('Owner')).toBeInTheDocument();
		expect(screen.getByText('HubSpot record')).toBeInTheDocument();
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

	it('renders a hostile attendee name as text, never as markup (XSS guard)', async () => {
		const hostile = '"><img src=x onerror=alert(1)>';
		mockAttendees[0] = { ...mockAttendees[0]!, firstName: hostile, lastName: '' };

		renderEventHub('evt-london-q3');

		await waitFor(() => {
			expect(screen.getByText(hostile)).toBeInTheDocument();
		});

		expect(document.querySelector('img')).toBeNull();
	});

	it('renders correctly under the darkAurora theme with no hardcoded inline hex colors', async () => {
		document.documentElement.setAttribute('data-theme', 'darkAurora');

		renderEventHub('evt-london-q3');

		await waitFor(() => {
			expect(screen.getByRole('heading', { name: 'London Q3 Summit' })).toBeInTheDocument();
		});

		expect(screen.getByText('Jane Doe')).toBeInTheDocument();
		expect(document.body.innerHTML).not.toMatch(/style="[^"]*#[0-9a-fA-F]{3,8}/i);
	});
});
