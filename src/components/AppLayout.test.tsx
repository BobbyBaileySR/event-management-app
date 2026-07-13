import { useEffect } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppLayout } from './AppLayout';
import { ToastProvider } from './Toast';
import { SessionProvider, useSession } from '../state/appState';
import type { Session } from '../types';

vi.mock('../services/authService', () => ({
	logoutRequest: vi.fn().mockResolvedValue(undefined),
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

function renderAppLayout(session: Session) {
	return render(
		<MemoryRouter initialEntries={['/events']}>
			<SessionProvider>
				<ToastProvider>
					<SessionHarness session={session} />
					<AppLayout />
				</ToastProvider>
			</SessionProvider>
		</MemoryRouter>,
	);
}

describe('AppLayout role gate (FR-013: admin-only shell for now)', () => {
	it('shows a restricted-access message with sign-out for a non-admin session', () => {
		renderAppLayout(staffSession);

		expect(screen.getByRole('heading', { name: /access restricted/i })).toBeInTheDocument();
		expect(screen.queryByLabelText('Sidebar')).not.toBeInTheDocument();

		fireEvent.click(screen.getByRole('button', { name: /sign out/i }));
	});

	it('does not show the restricted-access message for an admin session', () => {
		renderAppLayout(adminSession);

		expect(screen.queryByRole('heading', { name: /access restricted/i })).not.toBeInTheDocument();
	});
});
