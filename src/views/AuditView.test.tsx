import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { AuditLogEntry } from '../types';
import { AuditView } from './AuditView';

const mockFetchAuditLog = vi.fn().mockResolvedValue({
	entries: [] as AuditLogEntry[],
	page: 1,
	pageSize: 50,
	total: 0,
});

vi.mock('../hooks/useDataService', () => ({
	useDataService: () => ({
		fetchAuditLog: mockFetchAuditLog,
	}),
}));

const mockUseSession = vi.fn();

vi.mock('../state/appState', () => ({
	useSession: () => mockUseSession(),
}));

function renderAuditView() {
	return render(
		<MemoryRouter initialEntries={['/audit']}>
			<AuditView />
		</MemoryRouter>,
	);
}

describe('AuditView', () => {
	beforeEach(() => {
		mockUseSession.mockReturnValue({
			session: {
				role: 'admin',
				email: 'admin@adaptavist.com',
				token: 't',
				expiresAt: '2099-01-01T00:00:00.000Z',
			},
		});
		mockFetchAuditLog.mockClear();
		mockFetchAuditLog.mockResolvedValue({
			entries: [
				{
					id: 'req-checkin-beta',
					timestamp: '2026-07-07T12:00:00.000Z',
					action: 'checkin.confirm',
					actor: 'admin@adaptavist.com',
					eventId: 'ev-mr-2026',
					resourceType: 'catalog_event',
					resourceId: 'ev-mr-2026',
					outcome: 'success',
					metadata: { programId: 'prog-atlassian-2026', alreadyCheckedIn: false },
				},
			],
			page: 1,
			pageSize: 50,
			total: 1,
		});
	});

	it('loads recent audit entries for admin', async () => {
		renderAuditView();

		await waitFor(() => {
			expect(screen.getByRole('heading', { name: 'Audit log' })).toBeInTheDocument();
		});

		expect(mockFetchAuditLog).toHaveBeenCalledWith(undefined, { page: 1, pageSize: 50 });
		expect(screen.getByText('checkin.confirm')).toBeInTheDocument();
		expect(screen.getByText('admin@adaptavist.com')).toBeInTheDocument();
		expect(screen.getByText(/programId: prog-atlassian-2026/)).toBeInTheDocument();
	});

	it('renders a hostile action name as text, never as markup (XSS guard)', async () => {
		const hostile = '"><img src=x onerror=alert(1)>';
		mockFetchAuditLog.mockResolvedValue({
			entries: [
				{
					id: 'req-hostile',
					timestamp: '2026-07-07T12:00:00.000Z',
					action: hostile,
					actor: 'admin@adaptavist.com',
					eventId: null,
					resourceType: 'session',
					resourceId: 'sess-1',
					outcome: 'success',
				},
			],
			page: 1,
			pageSize: 50,
			total: 1,
		});

		renderAuditView();

		await waitFor(() => {
			expect(screen.getByText(hostile)).toBeInTheDocument();
		});

		expect(document.querySelector('img')).toBeNull();
	});

	it('redirects non-admin users away from the audit log', () => {
		mockUseSession.mockReturnValue({
			session: {
				role: 'viewer',
				email: 'viewer@adaptavist.com',
				token: 't',
				expiresAt: '2099-01-01T00:00:00.000Z',
			},
		});

		renderAuditView();

		expect(screen.queryByRole('heading', { name: 'Audit log' })).toBeNull();
		expect(mockFetchAuditLog).not.toHaveBeenCalled();
	});

	it('renders under the darkAurora theme with no hardcoded inline hex colors', async () => {
		document.documentElement.setAttribute('data-theme', 'darkAurora');

		try {
			renderAuditView();

			await waitFor(() => {
				expect(screen.getByRole('heading', { name: 'Audit log' })).toBeInTheDocument();
			});

			expect(screen.getByText('checkin.confirm')).toBeInTheDocument();
			expect(document.body.innerHTML).not.toMatch(/style="[^"]*#[0-9a-fA-F]{3,8}/i);
		} finally {
			document.documentElement.removeAttribute('data-theme');
		}
	});
});
