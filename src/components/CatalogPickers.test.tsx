import { useEffect } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CatalogPickers } from './CatalogPickers';
import { CatalogProvider, useCatalogSelection } from '../state/catalogContext';

const mockFetchCatalog = vi.fn();

const mockDataService = {
	fetchCatalog: mockFetchCatalog,
};

vi.mock('../hooks/useDataService', () => ({
	useDataService: () => mockDataService,
}));

const WALK_IN_URL = 'https://share.hsforms.com/1a2b3c4d-e5f6-7890-abcd-ef1234567890';

const catalogFixture = {
	programs: [
		{
			id: 'prog-1',
			name: '<img onerror=alert(1)> Summit',
			hubspotFormIds: ['form-1'],
			archived: false,
			events: [
				{
					id: 'ev-1',
					name: 'VIP',
					partsAttendedOption: 'VIP',
					attendanceProperty: 'atlassian_event__vip_event_attendance',
					archived: false,
				},
				{
					id: 'ev-2',
					name: 'Meeting Room',
					partsAttendedOption: 'Meeting Room',
					attendanceProperty: 'atlassian_event__customer_event_attendance',
					archived: false,
					walkInFormUrl: WALK_IN_URL,
				},
			],
		},
	],
};

let triggerCatalogRefresh: (() => void) | null = null;

function CatalogRefreshBridge() {
	const { bumpCatalog } = useCatalogSelection();
	useEffect(() => {
		triggerCatalogRefresh = bumpCatalog;
	}, [bumpCatalog]);
	return null;
}

function CatalogSelectionProbe() {
	const { walkInFormUrl } = useCatalogSelection();
	return <p data-testid="walk-in-url">{walkInFormUrl ?? ''}</p>;
}

function renderPickers() {
	triggerCatalogRefresh = null;
	return render(
		<CatalogProvider>
			<CatalogRefreshBridge />
			<CatalogPickers />
		</CatalogProvider>,
	);
}

function renderPickersWithProbe() {
	triggerCatalogRefresh = null;
	return render(
		<CatalogProvider>
			<CatalogRefreshBridge />
			<CatalogPickers />
			<CatalogSelectionProbe />
		</CatalogProvider>,
	);
}

async function chooseProgram(name: string) {
	const user = userEvent.setup();
	await user.click(screen.getByRole('button', { name: 'Program: Select Program' }));
	await user.click(screen.getByRole('option', { name }));
}

async function chooseEvent(name: string) {
	const user = userEvent.setup();
	await user.click(screen.getByRole('button', { name: 'Event: Select Event' }));
	await user.click(screen.getByRole('option', { name }));
}

describe('CatalogPickers', () => {
	beforeEach(() => {
		mockFetchCatalog.mockResolvedValue(catalogFixture);
	});

	it('renders hostile Program names as text', async () => {
		renderPickers();
		await screen.findByRole('button', { name: 'Program: Select Program' });
		await chooseProgram('<img onerror=alert(1)> Summit');
		expect(screen.getByRole('button', { name: 'Program: <img onerror=alert(1)> Summit' })).toBeInTheDocument();
		expect(document.querySelector('img')).toBeNull();
	});

	it('shows Select Program and Select Event placeholders by default', async () => {
		renderPickers();
		expect(await screen.findByRole('button', { name: 'Program: Select Program' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Event: Select Event' })).toBeInTheDocument();
		expect(screen.queryByText(/Working context:/)).toBeNull();
	});

	it('opens the Event menu below the Event control', async () => {
		renderPickers();
		await screen.findByRole('button', { name: 'Program: Select Program' });
		await chooseProgram('<img onerror=alert(1)> Summit');

		const user = userEvent.setup();
		await user.click(screen.getByRole('button', { name: 'Event: Select Event' }));

		expect(screen.getByRole('listbox')).toBeInTheDocument();
		expect(screen.getByRole('option', { name: 'Meeting Room' })).toBeInTheDocument();
	});

	it('sets walkInFormUrl on catalog selection when Event has a walk-in URL', async () => {
		renderPickersWithProbe();
		await screen.findByRole('button', { name: 'Program: Select Program' });
		await chooseProgram('<img onerror=alert(1)> Summit');
		await chooseEvent('Meeting Room');

		expect(await screen.findByTestId('walk-in-url')).toHaveTextContent(WALK_IN_URL);
	});

	it('updates walkInFormUrl after catalog refresh', async () => {
		renderPickersWithProbe();
		await screen.findByRole('button', { name: 'Program: Select Program' });
		await chooseProgram('<img onerror=alert(1)> Summit');
		await chooseEvent('VIP');
		expect(screen.getByTestId('walk-in-url')).toHaveTextContent('');

		mockFetchCatalog.mockResolvedValue({
			programs: [
				{
					...catalogFixture.programs[0],
					events: catalogFixture.programs[0].events.map((event) =>
						event.id === 'ev-1' ? { ...event, walkInFormUrl: WALK_IN_URL } : event,
					),
				},
			],
		});

		triggerCatalogRefresh?.();

		await waitFor(() => {
			expect(screen.getByTestId('walk-in-url')).toHaveTextContent(WALK_IN_URL);
		});
	});

	it('clears selection when the selected Event disappears after catalog refresh', async () => {
		renderPickers();
		await screen.findByRole('button', { name: 'Program: Select Program' });
		await chooseProgram('<img onerror=alert(1)> Summit');
		await chooseEvent('VIP');
		expect(await screen.findByText('Working context: <img onerror=alert(1)> Summit → VIP')).toBeInTheDocument();

		mockFetchCatalog.mockResolvedValue({
			programs: [
				{
					...catalogFixture.programs[0],
					events: [{ id: 'ev-2', name: 'Meeting Room', partsAttendedOption: 'Meeting Room', archived: false }],
				},
			],
		});

		expect(triggerCatalogRefresh).toBeTruthy();
		triggerCatalogRefresh?.();

		await waitFor(() => {
			expect(screen.getByRole('button', { name: 'Program: Select Program' })).toBeInTheDocument();
			expect(screen.getByRole('button', { name: 'Event: Select Event' })).toBeInTheDocument();
		});
		expect(screen.queryByText(/Working context:/)).toBeNull();
	});
});
