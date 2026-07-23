import { useEffect } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppLayout } from './AppLayout';
import { ToastProvider } from './Toast';
import { renderWithQueryClient } from '../testing/renderWithQueryClient';
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
	return renderWithQueryClient(
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

describe('AppLayout responsive + touch targets (T024)', () => {
	afterEach(() => {
		document.documentElement.style.width = '';
	});

	it('sizes shell touch targets at >=44px (sign-out, theme swatches)', () => {
		renderAppLayout(adminSession);

		const signOut = screen.getByRole('button', { name: /sign out/i });
		expect(parseFloat(getComputedStyle(signOut).minHeight)).toBeGreaterThanOrEqual(44);

		for (const swatch of screen.getAllByRole('button', { name: /^(Aurora|Dark Aurora|Celebration)$/ })) {
			expect(parseFloat(getComputedStyle(swatch).minHeight)).toBeGreaterThanOrEqual(44);
		}
	});

	it('does not overflow body horizontally at 375px viewport', () => {
		Object.defineProperty(document.body, 'clientWidth', { configurable: true, value: 375 });
		document.documentElement.style.width = '375px';
		renderAppLayout(adminSession);
		expect(document.body.scrollWidth).toBeLessThanOrEqual(document.body.clientWidth + 1);
	});
});

describe('AppLayout app-frame card (design_handoff 2)', () => {
	it('does not clip the frame shadow via an intermediate overflow:hidden wrapper', () => {
		const { container } = renderAppLayout(adminSession);

		const layoutCard = container.querySelector('[class*="layout"]') as HTMLElement;
		expect(layoutCard).not.toBeNull();
		// .layout itself still clips its own children (rounded corners on sidebar/main)...
		expect(getComputedStyle(layoutCard).borderRadius).toBe('20px');
		expect(getComputedStyle(layoutCard).overflow).toBe('hidden');
		// ...but its parent (.shell) must NOT also clip, or .layout's box-shadow (which
		// paints outside its own border box) never reaches .frame's 20px padding —
		// the actual bleed zone — and the shadow becomes invisible.
		const shell = layoutCard.parentElement as HTMLElement;
		expect(getComputedStyle(shell).overflow).not.toBe('hidden');
	});
});

function setInnerWidth(width: number) {
	Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
}

describe('AppLayout 3-tier responsive chrome (design_handoff 2 § Breakpoints)', () => {
	afterEach(() => {
		setInnerWidth(1024);
	});

	it('shows the desktop Sidebar and no rail/tab-bar at >=1024px', () => {
		setInnerWidth(1280);
		renderAppLayout(adminSession);

		expect(screen.getByLabelText('Sidebar')).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Open navigation menu' })).not.toBeInTheDocument();
	});

	it('shows the tablet IconRail (not the desktop Sidebar) at 768-1023px', () => {
		setInnerWidth(900);
		renderAppLayout(adminSession);

		expect(screen.getByRole('button', { name: 'Open navigation menu' })).toBeInTheDocument();
		expect(screen.queryByLabelText('Sidebar')).not.toBeInTheDocument();
	});

	it('opens and closes the nav drawer from the tablet rail hamburger', () => {
		setInnerWidth(900);
		renderAppLayout(adminSession);

		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
		fireEvent.click(screen.getByRole('button', { name: 'Open navigation menu' }));
		expect(screen.getByRole('dialog')).toBeInTheDocument();
		// The drawer's own Sidebar content is now reachable.
		expect(within(screen.getByRole('dialog')).getByLabelText('Sidebar')).toBeInTheDocument();

		fireEvent.click(screen.getByRole('button', { name: 'Close navigation menu' }));
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
	});

	it('shows the phone MobileTabBar (not the desktop Sidebar or tablet rail) below 768px', () => {
		setInnerWidth(500);
		renderAppLayout(adminSession);

		expect(screen.queryByLabelText('Sidebar')).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Open navigation menu' })).not.toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
	});
});
