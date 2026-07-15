import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { CatalogAdminView } from './CatalogAdminView';

describe('CatalogAdminView (retired)', () => {
	it('redirects to Programs & Events (#/events)', async () => {
		render(
			<MemoryRouter initialEntries={['/catalog']}>
				<Routes>
					<Route path="/catalog" element={<CatalogAdminView />} />
					<Route path="/events" element={<div>Programs & Events destination</div>} />
				</Routes>
			</MemoryRouter>,
		);

		expect(await screen.findByText('Programs & Events destination')).toBeInTheDocument();
	});
});
