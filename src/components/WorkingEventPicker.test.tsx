import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { WorkingEventPicker } from './WorkingEventPicker';
import { renderWithQueryClient } from '../testing/renderWithQueryClient';
import type { CatalogEventSummary, CatalogProgram } from '../types';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
	const actual = await importOriginal<typeof import('react-router-dom')>();
	return {
		...actual,
		useNavigate: () => mockNavigate,
	};
});

const mockFetchCatalog = vi.fn();

vi.mock('../hooks/useDataService', () => ({
	useDataService: () => ({ fetchCatalog: mockFetchCatalog }),
}));

const events: CatalogEventSummary[] = [
	{
		id: 'evt-1',
		programId: null,
		name: 'Spring Summit',
		start: '2026-03-01T09:00:00.000Z',
		status: 'active',
		publishState: 'published',
		archived: false,
	},
	{
		id: 'evt-2',
		programId: null,
		name: 'Autumn Roadshow',
		start: '2026-04-01T09:00:00.000Z',
		status: 'active',
		publishState: 'published',
		archived: false,
	},
];

beforeEach(() => {
	mockNavigate.mockReset();
	mockFetchCatalog.mockReset();
});

function openMenu() {
	fireEvent.click(screen.getByRole('button', { name: /Select an event/ }));
}

describe('WorkingEventPicker', () => {
	it('shows the placeholder label when no current event is selected', async () => {
		mockFetchCatalog.mockResolvedValue({ events, programs: [] });
		renderWithQueryClient(<WorkingEventPicker currentEventName={null} />);

		expect(screen.getByText('Select an event')).toBeInTheDocument();
		await waitFor(() => expect(mockFetchCatalog).toHaveBeenCalled());
	});

	it('shows the current event name on the trigger when provided', () => {
		mockFetchCatalog.mockResolvedValue({ events: [], programs: [] });
		renderWithQueryClient(<WorkingEventPicker currentEventName="Spring Summit" />);

		expect(screen.getByText('Spring Summit')).toBeInTheDocument();
	});

	it('shows a loading row while the catalog fetch is in flight, then the list once resolved', async () => {
		let resolveFetch!: (value: { events: CatalogEventSummary[]; programs: CatalogProgram[] }) => void;
		mockFetchCatalog.mockReturnValue(
			new Promise((resolve) => {
				resolveFetch = resolve;
			}),
		);

		renderWithQueryClient(<WorkingEventPicker currentEventName={null} />);
		openMenu();

		expect(screen.getByText('Loading events…')).toBeInTheDocument();

		resolveFetch({ events, programs: [] });

		await waitFor(() => {
			expect(screen.getByText('Spring Summit')).toBeInTheDocument();
			expect(screen.getByText('Autumn Roadshow')).toBeInTheDocument();
		});
	});

	it('shows "No events found." when the catalog has no events', async () => {
		mockFetchCatalog.mockResolvedValue({ events: [], programs: [] });
		renderWithQueryClient(<WorkingEventPicker currentEventName={null} />);
		openMenu();

		await waitFor(() => expect(screen.getByText('No events found.')).toBeInTheDocument());
	});

	it('filters the list by search text', async () => {
		mockFetchCatalog.mockResolvedValue({ events, programs: [] });
		renderWithQueryClient(<WorkingEventPicker currentEventName={null} />);
		openMenu();

		await waitFor(() => expect(screen.getByText('Spring Summit')).toBeInTheDocument());

		fireEvent.change(screen.getByLabelText('Search events'), { target: { value: 'autumn' } });

		expect(screen.queryByText('Spring Summit')).not.toBeInTheDocument();
		expect(screen.getByText('Autumn Roadshow')).toBeInTheDocument();
	});

	it('navigates to the event and closes the menu when a match is clicked', async () => {
		mockFetchCatalog.mockResolvedValue({ events, programs: [] });
		renderWithQueryClient(<WorkingEventPicker currentEventName={null} />);
		openMenu();

		await waitFor(() => expect(screen.getByText('Spring Summit')).toBeInTheDocument());
		fireEvent.click(screen.getByRole('button', { name: 'Spring Summit' }));

		expect(mockNavigate).toHaveBeenCalledWith('/events/evt-1');
		expect(screen.queryByText('Autumn Roadshow')).not.toBeInTheDocument();
	});

	it('degrades to "No events found." when the catalog fetch fails, without throwing', async () => {
		mockFetchCatalog.mockRejectedValue(new Error('network error'));
		renderWithQueryClient(<WorkingEventPicker currentEventName={null} />);
		openMenu();

		await waitFor(() => expect(screen.getByText('No events found.')).toBeInTheDocument());
	});

	it('renders a hostile event name as text, never as markup (XSS guard)', async () => {
		const hostile = '"><img src=x onerror=alert(1)>';
		mockFetchCatalog.mockResolvedValue({
			events: [{ ...events[0]!, id: 'evt-hostile', name: hostile }],
			programs: [],
		});
		renderWithQueryClient(<WorkingEventPicker currentEventName={null} />);
		openMenu();

		await waitFor(() => expect(screen.getByText(hostile)).toBeInTheDocument());
		expect(document.querySelector('img')).toBeNull();
	});
});
