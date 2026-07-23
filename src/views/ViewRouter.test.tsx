import { useEffect, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ViewRouter } from './ViewRouter';
import { SessionProvider, useSession } from '../state/appState';
import type { Session } from '../types';

vi.mock('./OverviewView', () => ({ OverviewView: () => <div>OverviewView stub</div> }));
vi.mock('./EventsView', () => ({ EventsView: () => <div>EventsView stub</div> }));
vi.mock('./CatalogAdminView', () => ({ CatalogAdminView: () => <div>CatalogAdminView stub</div> }));
vi.mock('./AuditView', () => ({ AuditView: () => <div>AuditView stub</div> }));
vi.mock('./EventHubView', () => ({ EventHubView: () => <div>EventHubView stub</div> }));
vi.mock('./AttendeesView', () => ({ AttendeesView: () => <div>AttendeesView stub</div> }));
vi.mock('./CheckInView', () => ({ CheckInView: () => <div>CheckInView stub</div> }));
vi.mock('./RoutePlaceholder', () => ({ RoutePlaceholder: () => <div>RoutePlaceholder stub</div> }));
vi.mock('./EmailDispatchView', () => ({ EmailDispatchView: () => <div>EmailDispatchView stub</div> }));

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

/**
 * Sets the session before the route tree mounts (onReady gate) so gates like
 * EmailRouteGate never see a transient null session on the first render — in the real
 * app, AuthGate (App.tsx) already guarantees this by not mounting the router at all
 * until isAuthenticated is true.
 */
function SessionHarness({ session, onReady }: { session: Session | null; onReady: () => void }) {
	const { setSession } = useSession();
	useEffect(() => {
		setSession(session);
		onReady();
	}, [session, setSession, onReady]);
	return null;
}

function Root({ path, session }: { path: string; session: Session | null }) {
	const [ready, setReady] = useState(false);
	return (
		<MemoryRouter initialEntries={[path]}>
			<SessionProvider>
				<SessionHarness session={session} onReady={() => setReady(true)} />
				{ready ? (
					<Routes>
						<Route path="/overview" element={<ViewRouter />} />
						<Route path="/events" element={<ViewRouter />} />
						<Route path="/events/attendees" element={<ViewRouter />} />
						<Route path="/events/check-in" element={<ViewRouter />} />
						<Route path="/events/email" element={<ViewRouter />} />
						<Route path="/catalog" element={<ViewRouter />} />
						<Route path="/audit" element={<ViewRouter />} />
						<Route path="/events/:eventId" element={<ViewRouter />} />
						<Route path="/events/:eventId/:module" element={<ViewRouter />} />
					</Routes>
				) : null}
			</SessionProvider>
		</MemoryRouter>
	);
}

/** Mirrors the real route tree in App.tsx's AuthGate so useActiveRoute() resolves for real. */
function renderAt(path: string, session: Session | null = adminSession) {
	return render(<Root path={path} session={session} />);
}

describe('ViewRouter — logical route -> view mapping', () => {
	it('renders OverviewView for /overview', () => {
		renderAt('/overview');
		expect(screen.getByText('OverviewView stub')).toBeInTheDocument();
	});

	it('renders EventsView for /events', () => {
		renderAt('/events');
		expect(screen.getByText('EventsView stub')).toBeInTheDocument();
	});

	it('renders CatalogAdminView for /catalog', () => {
		renderAt('/catalog');
		expect(screen.getByText('CatalogAdminView stub')).toBeInTheDocument();
	});

	it('renders AuditView for /audit', () => {
		renderAt('/audit');
		expect(screen.getByText('AuditView stub')).toBeInTheDocument();
	});

	it('renders EventHubView for an event-scoped route with no module segment', () => {
		renderAt('/events/evt-1');
		expect(screen.getByText('EventHubView stub')).toBeInTheDocument();
	});

	it('renders AttendeesView for an event-scoped attendees module route', () => {
		renderAt('/events/evt-1/attendees');
		expect(screen.getByText('AttendeesView stub')).toBeInTheDocument();
	});

	it('renders CheckInView for an event-scoped check-in module route', () => {
		renderAt('/events/evt-1/check-in');
		expect(screen.getByText('CheckInView stub')).toBeInTheDocument();
	});

	it('renders EmailDispatchView for an event-scoped email module route when the session is admin', () => {
		renderAt('/events/evt-1/email', adminSession);
		expect(screen.getByText('EmailDispatchView stub')).toBeInTheDocument();
	});
});

describe('ViewRouter — route gates', () => {
	it('redirects the legacy attendees path to /events when the URL has no eventId', () => {
		renderAt('/events/attendees');
		expect(screen.getByText('EventsView stub')).toBeInTheDocument();
		expect(screen.queryByText('AttendeesView stub')).not.toBeInTheDocument();
	});

	it('redirects the legacy check-in path to /events when the URL has no eventId', () => {
		renderAt('/events/check-in');
		expect(screen.getByText('EventsView stub')).toBeInTheDocument();
		expect(screen.queryByText('CheckInView stub')).not.toBeInTheDocument();
	});

	it('redirects the legacy email path to /events when the URL has no eventId', () => {
		renderAt('/events/email');
		expect(screen.getByText('EventsView stub')).toBeInTheDocument();
		expect(screen.queryByText('EmailDispatchView stub')).not.toBeInTheDocument();
	});

	it('redirects email to /events for a non-admin session even with an eventId in the URL', () => {
		renderAt('/events/evt-1/email', staffSession);
		expect(screen.getByText('EventsView stub')).toBeInTheDocument();
		expect(screen.queryByText('EmailDispatchView stub')).not.toBeInTheDocument();
	});
});
