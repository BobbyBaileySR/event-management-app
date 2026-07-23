import { useEffect } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { MobileTabBar } from './MobileTabBar';
import { renderWithQueryClient } from '../testing/renderWithQueryClient';
import { SessionProvider, useSession } from '../state/appState';
import type { Session } from '../types';

const mockNavigate = vi.fn();
const mockFetchCatalog = vi.fn().mockResolvedValue({ events: [], programs: [] });

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

function renderTabBar({
	session = adminSession,
	path = '/overview',
	onLogout = vi.fn(),
}: {
	session?: Session;
	path?: string;
	onLogout?: () => void;
} = {}) {
	const tabBar = (
		<MobileTabBar
			onLogout={onLogout}
			eventName={null}
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
					<Route path="/events/:eventId/:module" element={tabBar} />
					<Route path="/events/:eventId" element={tabBar} />
					<Route path="*" element={tabBar} />
				</Routes>
			</SessionProvider>
		</MemoryRouter>,
	);
}

describe('MobileTabBar', () => {
	beforeEach(() => {
		mockNavigate.mockReset();
	});

	it('renders nothing for a non-admin session', () => {
		const { container } = renderTabBar({ session: staffSession });
		expect(container).toBeEmptyDOMElement();
	});

	it('renders the nav tabs, working-event picker, theme switcher, and sign out for an admin session', () => {
		renderTabBar();

		expect(screen.getByRole('button', { name: 'Overview' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Programs & Events' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Audit log' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /Select an event/i })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Aurora' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
	});

	it('navigates when a tab is clicked', () => {
		renderTabBar({ path: '/events' });

		fireEvent.click(screen.getByRole('button', { name: 'Overview' }));
		expect(mockNavigate).toHaveBeenCalledWith('/overview');
	});

	it('disables event-module tabs until a working event is selected', () => {
		renderTabBar({ path: '/overview' });
		expect(screen.getByRole('button', { name: 'Registered Attendees' })).toBeDisabled();
	});

	it('calls onLogout when Sign out is clicked', () => {
		const onLogout = vi.fn();
		renderTabBar({ onLogout });

		fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
		expect(onLogout).toHaveBeenCalledTimes(1);
	});

	it('lets the working-event picker still be opened from the phone chrome', async () => {
		renderTabBar();

		fireEvent.click(screen.getByRole('button', { name: /Select an event/i }));
		await waitFor(() => {
			expect(screen.getByPlaceholderText('Type to search events…')).toBeInTheDocument();
		});
	});
});
