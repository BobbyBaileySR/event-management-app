import { useEffect, type ReactNode } from 'react';
import { renderHook } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { useSidebarNavItems } from './useSidebarNavItems';
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

function makeWrapper(session: Session, path: string) {
	function SessionHarness() {
		const { setSession } = useSession();
		useEffect(() => {
			setSession(session);
		}, [setSession]);
		return null;
	}

	return function Wrapper({ children }: { children: ReactNode }) {
		return (
			<MemoryRouter initialEntries={[path]}>
				<SessionProvider>
					<SessionHarness />
					<Routes>
						<Route path="/events/:eventId/:module" element={<>{children}</>} />
						<Route path="/events/:eventId" element={<>{children}</>} />
						<Route path="*" element={<>{children}</>} />
					</Routes>
				</SessionProvider>
			</MemoryRouter>
		);
	};
}

describe('useSidebarNavItems', () => {
	it('returns visible=false and empty groups for a non-admin session', () => {
		const { result } = renderHook(() => useSidebarNavItems(), { wrapper: makeWrapper(staffSession, '/overview') });

		expect(result.current).toEqual({ visible: false, topLevel: [], eventModules: [], admin: [] });
	});

	it('marks Overview active and enabled for an admin session on /overview', () => {
		const { result } = renderHook(() => useSidebarNavItems(), { wrapper: makeWrapper(adminSession, '/overview') });

		expect(result.current.visible).toBe(true);
		const overview = result.current.topLevel.find((item) => item.id === 'overview');
		expect(overview).toMatchObject({ label: 'Overview', active: true, disabled: false });
		const events = result.current.topLevel.find((item) => item.id === 'events');
		expect(events).toMatchObject({ label: 'Programs & Events', active: false });
	});

	it('disables event modules and marks Admin\'s Audit log active on /audit', () => {
		const { result } = renderHook(() => useSidebarNavItems(), { wrapper: makeWrapper(adminSession, '/audit') });

		expect(result.current.eventModules.every((item) => item.disabled)).toBe(true);
		expect(result.current.eventModules.every((item) => item.onClick === undefined)).toBe(true);
		expect(result.current.admin).toEqual([
			expect.objectContaining({ id: 'audit', label: 'Audit log', active: true, disabled: false }),
		]);
	});

	it('enables event modules and calls navigate with the event-scoped path when an event is selected', () => {
		const { result } = renderHook(() => useSidebarNavItems(), {
			wrapper: makeWrapper(adminSession, '/events/ev-1/check-in'),
		});

		const checkIn = result.current.eventModules.find((item) => item.id === 'check-in');
		expect(checkIn).toMatchObject({ active: true, disabled: false });

		checkIn?.onClick?.();
		expect(mockNavigate).toHaveBeenCalledWith('/events/ev-1/check-in');
	});
});
