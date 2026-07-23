import { useEffect } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { IconRail } from './IconRail';
import { SessionProvider, useSession } from '../state/appState';
import type { Session } from '../types';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
	const actual = await importOriginal<typeof import('react-router-dom')>();
	return {
		...actual,
		useNavigate: () => mockNavigate,
	};
});

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

function renderRail({
	session = adminSession,
	path = '/overview',
	onOpenDrawer = vi.fn(),
	eventName = null,
}: {
	session?: Session;
	path?: string;
	onOpenDrawer?: () => void;
	eventName?: string | null;
} = {}) {
	const rail = (
		<IconRail
			eventName={eventName}
			theme="aurora"
			celebrationAllowed={false}
			onThemeChange={vi.fn()}
			onOpenDrawer={onOpenDrawer}
		/>
	);
	return render(
		<MemoryRouter initialEntries={[path]}>
			<SessionProvider>
				<SessionHarness session={session} />
				<Routes>
					<Route path="/events/:eventId/:module" element={rail} />
					<Route path="/events/:eventId" element={rail} />
					<Route path="*" element={rail} />
				</Routes>
			</SessionProvider>
		</MemoryRouter>,
	);
}

describe('IconRail', () => {
	beforeEach(() => {
		mockNavigate.mockReset();
	});

	it('renders icon-only nav buttons with accessible labels for an admin session', () => {
		renderRail();

		expect(screen.getByRole('button', { name: 'Overview' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Programs & Events' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Audit log' })).toBeInTheDocument();
	});

	it('hides nav buttons for a non-admin session but still renders the hamburger', () => {
		renderRail({ session: staffSession });

		expect(screen.getByRole('button', { name: 'Open navigation menu' })).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Overview' })).not.toBeInTheDocument();
	});

	it('navigates when a rail icon is clicked', () => {
		renderRail({ path: '/events' });

		fireEvent.click(screen.getByRole('button', { name: 'Overview' }));
		expect(mockNavigate).toHaveBeenCalledWith('/overview');
	});

	it('opens the drawer when the hamburger is clicked', () => {
		const onOpenDrawer = vi.fn();
		renderRail({ onOpenDrawer });

		fireEvent.click(screen.getByRole('button', { name: 'Open navigation menu' }));
		expect(onOpenDrawer).toHaveBeenCalledTimes(1);
	});

	it('opens the drawer when the working-event icon is clicked (rail has no room for the search picker)', () => {
		const onOpenDrawer = vi.fn();
		renderRail({ onOpenDrawer, path: '/events/ev-1', eventName: 'Meeting Room' });

		fireEvent.click(screen.getByRole('button', { name: /Working event: Meeting Room/i }));
		expect(onOpenDrawer).toHaveBeenCalledTimes(1);
	});

	it('gives the working-event icon a placeholder accessible name when no event is selected', () => {
		renderRail({ path: '/overview' });

		expect(screen.getByRole('button', { name: /No working event selected/i })).toBeInTheDocument();
	});

	it("names the working-event icon after the selected event, for screen readers (the rail itself stays icon-only — see TopBar's workingEvent pill for the visible name)", () => {
		renderRail({ path: '/events/ev-1', eventName: 'Meeting Room' });

		expect(screen.getByRole('button', { name: /Working event: Meeting Room/i })).toBeInTheDocument();
	});

	it('disables event-module buttons when no working event is selected', () => {
		renderRail({ path: '/overview' });

		expect(screen.getByRole('button', { name: 'Registered Attendees' })).toBeDisabled();
	});

	it('enables event-module buttons and navigates to the event-scoped path once a working event is selected', () => {
		renderRail({ path: '/events/ev-1' });

		const attendees = screen.getByRole('button', { name: 'Registered Attendees' });
		expect(attendees).not.toBeDisabled();
		fireEvent.click(attendees);
		expect(mockNavigate).toHaveBeenCalledWith('/events/ev-1/attendees');
	});
});
