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

const activeProgramFixture = {
	id: 'prog-1',
	name: 'Atlassian Event 2026',
	hubspotFormIds: ['form-1'],
	archived: false,
	description: 'Annual flagship',
	location: 'London',
	events: [
		{
			id: 'ev-1',
			name: 'Meeting Room',
			partsAttendedOption: 'Meeting Room',
			attendanceProperty: 'atlassian_event__customer_event_attendance',
			archived: false,
			owner: 'Events Team',
			capacity: 100,
		},
	],
};

describe('CatalogAdminView', () => {
	beforeEach(() => {
		mockFetchCatalog.mockResolvedValue({ programs: [] });
		mockCreateProgram.mockResolvedValue({ program: activeProgramFixture });
		mockUpdateProgram.mockResolvedValue({ program: activeProgramFixture });
		mockCreateEvent.mockResolvedValue({ event: activeProgramFixture.events[0] });
		mockUpdateEvent.mockResolvedValue({ event: activeProgramFixture.events[0] });
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

	it('opens Program create modal instead of inline form', async () => {
		renderAdminView();
		const user = userEvent.setup();
		await user.click(await screen.findByRole('button', { name: 'Create Program' }));
		expect(screen.getByRole('dialog')).toBeInTheDocument();
		expect(screen.getByRole('heading', { name: 'Create Program' })).toBeInTheDocument();
		expect(screen.queryByRole('heading', { name: 'Create Program', level: 2 })).toBeNull();
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
		expect(screen.queryByRole('button', { name: 'Create Program' })).toBeNull();
		expect(screen.queryByRole('button', { name: 'Edit Program' })).toBeNull();
	});

	it('shows metadata summary as plain text and supports edit with clear-on-save', async () => {
		mockFetchCatalog.mockResolvedValue({ programs: [activeProgramFixture] });
		renderAdminView();

		expect(await screen.findByText('Description: Annual flagship')).toBeInTheDocument();
		expect(screen.getByText('Location: London')).toBeInTheDocument();
		expect(screen.getByText('Owner: Events Team')).toBeInTheDocument();

		const user = userEvent.setup();
		await user.click(screen.getByRole('button', { name: 'Edit Program' }));
		await user.clear(screen.getByLabelText('Description'));
		await user.click(screen.getByRole('button', { name: 'Save Program' }));

		expect(mockUpdateProgram).toHaveBeenCalledWith(
			'prog-1',
			expect.objectContaining({
				description: null,
			}),
		);
	});

	it('hides Create and Edit actions on archived tab but keeps metadata visible', async () => {
		mockFetchCatalog.mockResolvedValue({
			programs: [
				{
					...activeProgramFixture,
					archived: true,
					events: [{ ...activeProgramFixture.events[0], archived: true }],
				},
			],
		});

		renderAdminView();
		const user = userEvent.setup();
		await user.click(await screen.findByRole('button', { name: 'Archived' }));

		expect(await screen.findByText('Description: Annual flagship')).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Create Program' })).toBeNull();
		expect(screen.queryByRole('button', { name: 'Edit Event' })).toBeNull();
	});

	it('adds metadata to a legacy record via edit modal', async () => {
		mockFetchCatalog.mockResolvedValue({
			programs: [
				{
					id: 'legacy-prog',
					name: 'Legacy Program',
					hubspotFormId: 'legacy-form',
					archived: false,
					events: [
						{
							id: 'legacy-ev',
							name: 'Legacy Event',
							partsAttendedOption: 'Legacy Event',
							archived: false,
						},
					],
				},
			],
		});

		renderAdminView();
		const user = userEvent.setup();
		await user.click(await screen.findByRole('button', { name: 'Edit Event' }));
		await user.type(screen.getByLabelText('Owner'), 'Added Owner');
		await user.click(screen.getByRole('button', { name: 'Save Event' }));

		expect(mockUpdateEvent).toHaveBeenCalledWith(
			'legacy-ev',
			expect.objectContaining({
				owner: 'Added Owner',
			}),
		);
	});
});
