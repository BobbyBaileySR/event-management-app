import { useEffect } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { renderWithQueryClient } from '../testing/renderWithQueryClient';
import { SessionProvider, useSession } from '../state/appState';
import type { Session } from '../types';

const mockNavigate = vi.fn();
const mockFetchCatalog = vi.fn().mockResolvedValue({
	events: [
		{ id: 'evt-1', programId: null, name: 'London Q3 Summit', start: '2026-10-15T09:00:00.000Z', status: 'active', publishState: 'published', archived: false },
		{ id: 'evt-2', programId: null, name: 'Dublin Roadshow', start: '2026-11-02T09:00:00.000Z', status: 'active', publishState: 'published', archived: false },
	],
	programs: [],
});

vi.mock('react-router-dom', async (importOriginal) => {
	const actual = await importOriginal<typeof import('react-router-dom')>();
	return {
		...actual,
		useNavigate: () => mockNavigate,
	};
});

vi.mock('../hooks/useDataService', () => ({
	useDataService: () => ({
		fetchCatalog: mockFetchCatalog,
	}),
}));

const adminSession: Session = {
	token: 't',
	email: 'admin@adaptavist.com',
	role: 'admin',
	expiresAt: '2099-01-01T00:00:00.000Z',
};

const staffSession: Session = {
	token: 't',
	email: 'staff@adaptavist.com',
	role: 'staff',
	expiresAt: '2099-01-01T00:00:00.000Z',
};

function SessionHarness({ session }: { session: Session }) {
	const { setSession } = useSession();
	useEffect(() => {
		setSession(session);
	}, [session, setSession]);
	return null;
}

function renderSidebar({
	session = adminSession,
	path = '/events',
	eventName = null,
}: {
	session?: Session;
	path?: string;
	eventName?: string | null;
} = {}) {
	const sidebar = (
		<Sidebar
			onLogout={vi.fn()}
			eventName={eventName}
			theme="aurora"
			celebrationAllowed={false}
			onThemeChange={vi.fn()}
		/>
	);
	return renderWithQueryClient(
		<MemoryRouter initialEntries={[path]}>
			<SessionProvider>
				<SessionHarness session={session} />
				<Routes>
					<Route path="/events/:eventId/:module" element={sidebar} />
					<Route path="/events/:eventId" element={sidebar} />
					<Route path="*" element={sidebar} />
				</Routes>
			</SessionProvider>
		</MemoryRouter>,
	);
}

describe('Sidebar navigation', () => {
	beforeEach(() => {
		mockNavigate.mockReset();
	});

	it('shows event-scoped Registered Attendees, Check-in, and Email when on an event route', () => {
		renderSidebar({
			path: '/events/ev-1',
			eventName: 'Meeting Room',
		});

		expect(screen.getByRole('button', { name: /^Registered Attendees$/i })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /^Check-in$/i })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /^Email$/i })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /Meeting Room/i })).toBeInTheDocument();
	});

	it('shows Audit log for admin users', () => {
		renderSidebar({ session: adminSession });

		expect(screen.getByRole('button', { name: /Audit log/i })).toBeInTheDocument();
	});

	it('hides Audit log for non-admin users', () => {
		renderSidebar({ session: staffSession });

		expect(screen.queryByRole('button', { name: /Audit log/i })).not.toBeInTheDocument();
	});

	it('navigates to audit path when Audit log is clicked', () => {
		renderSidebar({ path: '/audit' });

		fireEvent.click(screen.getByRole('button', { name: /Audit log/i }));
		expect(mockNavigate).toHaveBeenCalledWith('/audit');
	});

	it('shows event modules for admin, muted/disabled, when no eventId is in the URL (007 event-first)', () => {
		renderSidebar({ session: adminSession });

		const attendees = screen.getByRole('button', { name: /^Registered Attendees$/i });
		const checkIn = screen.getByRole('button', { name: /^Check-in$/i });
		const email = screen.getByRole('button', { name: /^Email$/i });
		const eventDetails = screen.getByRole('button', { name: /^Event Details$/i });

		for (const button of [eventDetails, attendees, checkIn, email]) {
			expect(button).toBeDisabled();
		}
		expect(screen.getByRole('button', { name: /Programs & Events/i })).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: /Catalog admin/i })).not.toBeInTheDocument();
	});

	it('does not navigate when a disabled (no working event) module is clicked', () => {
		renderSidebar({ session: adminSession });

		fireEvent.click(screen.getByRole('button', { name: /^Registered Attendees$/i }));
		expect(mockNavigate).not.toHaveBeenCalled();
	});

	it('hides Programs & Events and event modules for non-admin users (FR-013)', () => {
		renderSidebar({
			session: staffSession,
			path: '/events/ev-1',
			eventName: 'Meeting Room',
		});

		expect(screen.queryByRole('button', { name: /Catalog admin/i })).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: /Programs & Events/i })).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: /^Registered Attendees$/i })).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: /^Check-in$/i })).not.toBeInTheDocument();
	});

	it('labels the events nav item Programs & Events and omits Catalog admin (T076)', () => {
		renderSidebar({ session: adminSession });

		expect(screen.getByRole('button', { name: /Programs & Events/i })).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: /Catalog admin/i })).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: /All Events/i })).not.toBeInTheDocument();
	});

	it('navigates to event-scoped module paths when Registered Attendees, Check-in, or Email is clicked', () => {
		renderSidebar({
			path: '/events/ev-1',
			eventName: 'Meeting Room',
		});

		fireEvent.click(screen.getByRole('button', { name: /^Email$/i }));
		expect(mockNavigate).toHaveBeenCalledWith('/events/ev-1/email');

		fireEvent.click(screen.getByRole('button', { name: /^Check-in$/i }));
		expect(mockNavigate).toHaveBeenCalledWith('/events/ev-1/check-in');

		fireEvent.click(screen.getByRole('button', { name: /^Registered Attendees$/i }));
		expect(mockNavigate).toHaveBeenCalledWith('/events/ev-1/attendees');
	});

	it('shows Overview for admin and navigates to /overview when clicked', () => {
		renderSidebar({ session: adminSession });

		fireEvent.click(screen.getByRole('button', { name: /Overview/i }));
		expect(mockNavigate).toHaveBeenCalledWith('/overview');
	});

	it('hides Overview for non-admin users', () => {
		renderSidebar({ session: staffSession });

		expect(screen.queryByRole('button', { name: /Overview/i })).not.toBeInTheDocument();
	});
});

describe('Sidebar desktop nav styling (design_handoff 2)', () => {
	it('renders the accessible name without the decorative icon glyph text', () => {
		renderSidebar({ session: adminSession });

		expect(screen.getByRole('button', { name: 'Overview' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Programs & Events' })).toBeInTheDocument();
	});

	it('hides the decorative nav icon glyph at desktop widths, keeping only label + accent bar', () => {
		renderSidebar({ session: adminSession });

		const overviewButton = screen.getByRole('button', { name: 'Overview' });
		const icon = overviewButton.querySelector('[class*="navIcon"]');
		expect(icon).not.toBeNull();
		expect(getComputedStyle(icon as Element).display).toBe('none');
	});

	it('uses the semantic accent token (not a hardcoded cool/blue leftover) for the active nav item', () => {
		renderSidebar({ session: adminSession, path: '/events' });

		const eventsButton = screen.getByRole('button', { name: 'Programs & Events' });
		expect(getComputedStyle(eventsButton).color).toBe('var(--accent)');
	});

	it('gives enabled nav items the dark --text color and disabled ones the lighter --muted color', () => {
		renderSidebar({ session: adminSession });

		const overviewButton = screen.getByRole('button', { name: 'Overview' });
		expect(getComputedStyle(overviewButton).color).toBe('var(--text)');

		const attendeesButton = screen.getByRole('button', { name: /^Registered Attendees$/i });
		expect(attendeesButton).toBeDisabled();
		expect(getComputedStyle(attendeesButton).color).toBe('var(--muted)');
	});

	it('insets the footer divider (Audit log ↔ Theme) to match the other section dividers, not full-width', () => {
		const { container } = renderSidebar({ session: adminSession });

		const nav = screen.getByRole('navigation', { name: 'Main navigation' });
		const footer = container.querySelector('[class*="footer"]') as HTMLElement;
		expect(footer).not.toBeNull();

		// The other dividers (`.section`) are inset by `.nav`'s own side padding; `.footer`
		// is a sibling of `.nav`, not a child of it, so it needs matching margin to line up
		// instead of spanning full sidebar width.
		expect(getComputedStyle(footer).marginLeft).toBe(getComputedStyle(nav).paddingLeft);
		expect(getComputedStyle(footer).marginRight).toBe(getComputedStyle(nav).paddingRight);
	});

	it('does not render a redundant working-event label above the module list — the picker already shows it', () => {
		renderSidebar({ session: adminSession, path: '/events/ev-1', eventName: 'Meeting Room' });

		expect(screen.queryByText('Selected event')).not.toBeInTheDocument();
		// "Meeting Room" should appear exactly once — in the working-event picker trigger —
		// not a second time in a duplicate section label above the module list.
		expect(screen.getAllByText('Meeting Room')).toHaveLength(1);
	});
});

describe('Sidebar event modules (T080)', () => {
	beforeEach(() => {
		mockNavigate.mockReset();
	});

	it('omits Analytics, Agenda, and Settings from the working-event module list', () => {
		renderSidebar({ session: adminSession, path: '/events/evt-1' });

		expect(screen.getByRole('button', { name: /Event Details/i })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /^Registered Attendees$/i })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /^Check-in$/i })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /^Email$/i })).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: /Analytics/i })).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: /Agenda/i })).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: /^Settings$/i })).not.toBeInTheDocument();
	});
});

describe('Sidebar working-event picker', () => {
	beforeEach(() => {
		mockNavigate.mockReset();
		mockFetchCatalog.mockClear();
	});

	it('shows a placeholder when no event is selected', () => {
		renderSidebar({ session: adminSession });

		expect(screen.getByRole('button', { name: /Select an event/i })).toBeInTheDocument();
	});

	it('opens the search popover, filters matches, and navigates on selection', async () => {
		renderSidebar({ session: adminSession });

		fireEvent.click(screen.getByRole('button', { name: /Select an event/i }));

		await waitFor(() => {
			expect(screen.getByPlaceholderText('Type to search events…')).toBeInTheDocument();
		});
		await waitFor(() => {
			expect(screen.getByRole('button', { name: 'London Q3 Summit' })).toBeInTheDocument();
		});

		fireEvent.change(screen.getByPlaceholderText('Type to search events…'), { target: { value: 'dublin' } });

		expect(screen.queryByRole('button', { name: 'London Q3 Summit' })).not.toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Dublin Roadshow' })).toBeInTheDocument();

		fireEvent.click(screen.getByRole('button', { name: 'Dublin Roadshow' }));
		expect(mockNavigate).toHaveBeenCalledWith('/events/evt-2');
	});

	it('renders a hostile event name as text, never as markup (XSS guard)', async () => {
		const hostile = '"><img src=x onerror=alert(1)>';
		mockFetchCatalog.mockResolvedValueOnce({
			events: [{ id: 'evt-x', programId: null, name: hostile, start: '2026-10-15T09:00:00.000Z', status: 'active', publishState: 'published', archived: false }],
			programs: [],
		});

		renderSidebar({ session: adminSession });
		fireEvent.click(screen.getByRole('button', { name: /Select an event/i }));

		await waitFor(() => {
			expect(screen.getByRole('button', { name: hostile })).toBeInTheDocument();
		});
		expect(document.querySelector('img')).toBeNull();
	});
});
