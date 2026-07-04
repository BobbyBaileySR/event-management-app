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

const catalogFixture = {
	programs: [
		{
			id: 'prog-1',
			name: '<img onerror=alert(1)> Summit',
			hubspotFormId: 'form-1',
			archived: false,
			events: [
				{ id: 'ev-1', name: 'VIP', partsAttendedOption: 'VIP', archived: false },
				{ id: 'ev-2', name: 'Meeting Room', partsAttendedOption: 'Meeting Room', archived: false },
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

function renderPickers() {
	triggerCatalogRefresh = null;
	return render(
		<CatalogProvider>
			<CatalogRefreshBridge />
			<CatalogPickers />
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
