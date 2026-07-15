import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { EmailView } from './EmailView';

describe('EmailView', () => {
	it('redirects legacy email URL to Programs & Events', () => {
		render(
			<MemoryRouter initialEntries={['/events/evt-london-q3/email']}>
				<Routes>
					<Route path="/events/:eventId/:module" element={<EmailView />} />
					<Route path="/events" element={<div>Programs & Events</div>} />
				</Routes>
			</MemoryRouter>,
		);

		expect(screen.getByText('Programs & Events')).toBeInTheDocument();
	});
});
