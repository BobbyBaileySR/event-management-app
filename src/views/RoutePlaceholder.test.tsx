import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { RoutePlaceholder } from './RoutePlaceholder';

function renderAt(path: string) {
	return render(
		<MemoryRouter initialEntries={[path]}>
			<Routes>
				<Route path="/events" element={<RoutePlaceholder />} />
				<Route path="/events/:eventId" element={<RoutePlaceholder />} />
				<Route path="/events/:eventId/:module" element={<RoutePlaceholder />} />
			</Routes>
		</MemoryRouter>,
	);
}

describe('RoutePlaceholder', () => {
	it('shows the module label for the active route', () => {
		renderAt('/events/evt-1/attendees');
		expect(screen.getByRole('heading', { name: 'Registered Attendees' })).toBeInTheDocument();
		expect(screen.getByText('Event: evt-1')).toBeInTheDocument();
	});

	it('renders a hostile event id as text, never as markup (XSS guard)', () => {
		const hostile = '"><img src=x onerror=alert(1)>';
		renderAt(`/events/${encodeURIComponent(hostile)}/attendees`);

		// The value appears as text and no <img> element is injected into the DOM.
		expect(screen.getByText(`Event: ${hostile}`)).toBeInTheDocument();
		expect(document.querySelector('img')).toBeNull();
	});
});
