import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { renderWithQueryClient } from '../testing/renderWithQueryClient';
import type { AuditLogEntry } from '../types';
import { AuditView } from './AuditView';

const mockFetchAuditLog = vi.fn().mockResolvedValue({
	entries: [] as AuditLogEntry[],
	page: 1,
	pageSize: 50,
	total: 0,
});

// Stable object reference across renders — matches the real hook's useMemo, which
// keeps `data` referentially stable unless the session token changes. A fresh object
// literal here would spuriously re-trigger the fetch effect on every unrelated re-render.
const mockDataService = { fetchAuditLog: mockFetchAuditLog };

vi.mock('../hooks/useDataService', () => ({
	useDataService: () => mockDataService,
}));

const mockUseSession = vi.fn();

vi.mock('../state/appState', () => ({
	useSession: () => mockUseSession(),
}));

function renderAuditView() {
	return renderWithQueryClient(
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

		// The loading state renders the same "Audit log" heading (different meta) — wait for
		// loaded-only content first so the assertions below don't race the audit-log fetch.
		await screen.findByText('checkin.confirm');

		expect(screen.getByRole('heading', { name: 'Audit log' })).toBeInTheDocument();
		expect(mockFetchAuditLog).toHaveBeenCalledWith(undefined, { page: 1, pageSize: 50 });
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

	it('does not trigger a request until Apply is clicked, then applies the actor filter and resets to page 1', async () => {
		renderAuditView();

		// Wait for the loaded filter form (the fetch call itself fires before the query
		// resolves/re-renders, so waiting on call count alone would race the fetch).
		await screen.findByLabelText('Actor');
		expect(mockFetchAuditLog).toHaveBeenCalledTimes(1);

		fireEvent.change(screen.getByLabelText('Actor'), { target: { value: 'admin@adaptavist.com' } });
		expect(mockFetchAuditLog).toHaveBeenCalledTimes(1);

		fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

		await waitFor(() => {
			expect(mockFetchAuditLog).toHaveBeenCalledTimes(2);
		});
		expect(mockFetchAuditLog).toHaveBeenLastCalledWith(
			undefined,
			expect.objectContaining({ page: 1, pageSize: 50, actor: 'admin@adaptavist.com' }),
		);
	});

	it('shows a distinct empty state (not an error) when an applied filter matches nothing', async () => {
		renderAuditView();

		await waitFor(() => {
			expect(screen.getByText('checkin.confirm')).toBeInTheDocument();
		});

		mockFetchAuditLog.mockResolvedValueOnce({ entries: [], page: 1, pageSize: 50, total: 0 });
		fireEvent.change(screen.getByLabelText('Resource ID'), { target: { value: 'no-such-resource' } });
		fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

		await waitFor(() => {
			expect(screen.getByText('No entries match the selected filters.')).toBeInTheDocument();
		});
		expect(screen.queryByRole('alert')).not.toBeInTheDocument();
	});

	it('Clear resets both the draft and applied filters and re-fetches unfiltered', async () => {
		renderAuditView();

		await screen.findByLabelText('Actor');
		expect(mockFetchAuditLog).toHaveBeenCalledTimes(1);

		fireEvent.change(screen.getByLabelText('Actor'), { target: { value: 'admin@adaptavist.com' } });
		fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
		await waitFor(() => {
			expect(mockFetchAuditLog).toHaveBeenCalledTimes(2);
		});
		// A filter change re-keys the query (same as the old reloadKey ladder), so the view
		// blanks to the loading state again before re-rendering — wait for it to clear before
		// interacting with the form once more.
		await screen.findByLabelText('Actor');

		fireEvent.click(screen.getByRole('button', { name: 'Clear' }));

		await waitFor(() => {
			expect(mockFetchAuditLog).toHaveBeenCalledTimes(3);
		});
		expect(mockFetchAuditLog).toHaveBeenLastCalledWith(
			undefined,
			expect.objectContaining({ page: 1, pageSize: 50, actor: undefined }),
		);
		expect(screen.getByLabelText('Actor')).toHaveValue('');
	});

	it('renders under the darkAurora theme with no hardcoded inline hex colors', async () => {
		document.documentElement.setAttribute('data-theme', 'darkAurora');

		try {
			renderAuditView();

			await screen.findByText('checkin.confirm');

			expect(screen.getByRole('heading', { name: 'Audit log' })).toBeInTheDocument();
			expect(document.body.innerHTML).not.toMatch(/style="[^"]*#[0-9a-fA-F]{3,8}/i);
		} finally {
			document.documentElement.removeAttribute('data-theme');
		}
	});
});
