import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { EmailView } from './EmailView';

describe('EmailView', () => {
	it('redirects legacy event-scoped email URL to catalog-scoped route', () => {
		render(
			<MemoryRouter initialEntries={['/events/evt-london-q3/email']}>
				<Routes>
					<Route path="/events/:eventId/:module" element={<EmailView />} />
					<Route path="/events/email" element={<div>Email dispatch module</div>} />
				</Routes>
			</MemoryRouter>,
		);

		expect(screen.getByText('Email dispatch module')).toBeInTheDocument();
	});
});
