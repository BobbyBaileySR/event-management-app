import { useEffect } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { SessionProvider, useSession } from '../state/appState';
import { CatalogProvider, useCatalogSelection } from '../state/catalogContext';
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

function CatalogHarness({
	programId,
	evId,
	programName,
	eventName,
}: {
	programId?: string;
	evId?: string;
	programName?: string;
	eventName?: string;
}) {
	const { setSelection } = useCatalogSelection();
	useEffect(() => {
		if (programId && evId) {
			setSelection({
				programId,
				evId,
				programName: programName ?? 'Atlassian Event 2026',
				eventName: eventName ?? 'Meeting Room',
				walkInFormUrl: null,
			});
		}
	}, [programId, evId, programName, eventName, setSelection]);
	return null;
}

function renderSidebar({
	session = adminSession,
	path = '/events',
	catalog,
}: {
	session?: Session;
	path?: string;
	catalog?: { programId: string; evId: string; programName?: string; eventName?: string };
} = {}) {
	return render(
		<MemoryRouter initialEntries={[path]}>
			<SessionProvider>
				<CatalogProvider>
					<SessionHarness session={session} />
					{catalog ? <CatalogHarness {...catalog} /> : null}
					<Sidebar onLogout={vi.fn()} />
				</CatalogProvider>
			</SessionProvider>
		</MemoryRouter>,
	);
}

describe('Sidebar slice links', () => {
	beforeEach(() => {
		mockNavigate.mockReset();
	});

	it('shows Attendees and Check-in for admin when catalog Program + Event are selected', () => {
		renderSidebar({
			catalog: { programId: 'prog-1', evId: 'ev-1' },
		});

		expect(screen.getByRole('button', { name: /Attendees/i })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /Check-in/i })).toBeInTheDocument();
		expect(screen.getByText('Atlassian Event 2026 — Meeting Room')).toBeInTheDocument();
	});

	it('hides Attendees and Check-in for admin when catalog selection is incomplete', () => {
		renderSidebar({ session: adminSession });

		expect(screen.queryByRole('button', { name: /Attendees/i })).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: /Check-in/i })).not.toBeInTheDocument();
		expect(screen.getByRole('button', { name: /Catalog admin/i })).toBeInTheDocument();
	});

	it('hides catalog admin and slice links for non-admin users', () => {
		renderSidebar({
			session: staffSession,
			catalog: { programId: 'prog-1', evId: 'ev-1' },
		});

		expect(screen.queryByRole('button', { name: /Catalog admin/i })).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: /Attendees/i })).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: /Check-in/i })).not.toBeInTheDocument();
		expect(screen.getByRole('button', { name: /All Events/i })).toBeInTheDocument();
	});

	it('navigates to slice module paths when Attendees or Check-in is clicked', () => {
		renderSidebar({
			path: '/events/attendees',
			catalog: { programId: 'prog-1', evId: 'ev-1' },
		});

		fireEvent.click(screen.getByRole('button', { name: /Check-in/i }));
		expect(mockNavigate).toHaveBeenCalledWith('/events/check-in');

		fireEvent.click(screen.getByRole('button', { name: /Attendees/i }));
		expect(mockNavigate).toHaveBeenCalledWith('/events/attendees');
	});
});
