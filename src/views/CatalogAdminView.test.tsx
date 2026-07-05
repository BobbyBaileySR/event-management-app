import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '../components/Toast';
import { CatalogProvider } from '../state/catalogContext';
import { CatalogAdminView } from './CatalogAdminView';

const mockFetchCatalog = vi.fn().mockResolvedValue({ programs: [] });
const mockCreateProgram = vi.fn();
const mockUpdateProgram = vi.fn();
const mockCreateEvent = vi.fn();
const mockUpdateEvent = vi.fn();

vi.mock('../hooks/useDataService', () => ({
	useDataService: () => ({
		fetchCatalog: mockFetchCatalog,
		createProgram: mockCreateProgram,
		updateProgram: mockUpdateProgram,
		createEvent: mockCreateEvent,
		updateEvent: mockUpdateEvent,
	}),
}));

const mockUseSession = vi.fn();

vi.mock('../state/appState', () => ({
	useSession: () => mockUseSession(),
}));

function renderAdminView() {
	return render(
		<MemoryRouter>
			<CatalogProvider>
				<ToastProvider>
					<CatalogAdminView />
				</ToastProvider>
			</CatalogProvider>
		</MemoryRouter>,
	);
}

describe('CatalogAdminView', () => {
	beforeEach(() => {
		mockFetchCatalog.mockResolvedValue({ programs: [] });
		mockUseSession.mockReturnValue({
			session: { role: 'admin', email: 'admin@adaptavist.com', token: 't', expiresAt: '2099-01-01T00:00:00.000Z' },
		});
	});

	it('renders catalog admin for admin users', async () => {
		renderAdminView();
		expect(await screen.findByRole('heading', { name: 'Catalog admin' })).toBeInTheDocument();
	});

	it('redirects non-admin users away from catalog admin', () => {
		mockUseSession.mockReturnValue({
			session: { role: 'viewer', email: 'viewer@adaptavist.com', token: 't', expiresAt: '2099-01-01T00:00:00.000Z' },
		});
		renderAdminView();
		expect(screen.queryByRole('heading', { name: 'Catalog admin' })).toBeNull();
	});

	it('shows archived Events under an active Program without Program archive controls', async () => {
		mockFetchCatalog.mockResolvedValue({
			programs: [
				{
					id: 'prog-1',
					name: 'Atlassian Event 2026',
					hubspotFormIds: ['form-1'],
					archived: false,
					events: [
						{
							id: 'ev-1',
							name: 'Meeting Room',
							partsAttendedOption: 'Meeting Room',
							attendanceProperty: 'atlassian_event__customer_event_attendance',
							archived: true,
						},
					],
				},
			],
		});

		renderAdminView();
		const user = userEvent.setup();
		await user.click(await screen.findByRole('button', { name: 'Archived' }));

		expect(await screen.findByRole('heading', { name: 'Atlassian Event 2026' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Unarchive Event' })).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Archive Program' })).toBeNull();
		expect(screen.queryByRole('button', { name: 'Unarchive Program' })).toBeNull();
	});
});
