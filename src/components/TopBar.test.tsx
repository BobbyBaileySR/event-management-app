import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TopBar } from './TopBar';

describe('TopBar', () => {
	it('renders the title as an h1 and meta as supporting text', () => {
		render(<TopBar title="Programs & Events" meta="Create, manage and archive your event lineup" />);

		expect(screen.getByRole('heading', { level: 1, name: 'Programs & Events' })).toBeInTheDocument();
		expect(screen.getByText('Create, manage and archive your event lineup')).toBeInTheDocument();
	});

	it('renders without meta or trailing content', () => {
		render(<TopBar title="Overview" />);

		expect(screen.getByRole('heading', { level: 1, name: 'Overview' })).toBeInTheDocument();
	});

	it('renders trailing content', () => {
		render(<TopBar title="Event Details" trailing={<button type="button">Edit event</button>} />);

		expect(screen.getByRole('button', { name: 'Edit event' })).toBeInTheDocument();
	});

	it('keeps the global "top-bar" class other views rely on for flex-shrink hooks', () => {
		const { container } = render(<TopBar title="Audit log" />);

		expect(container.querySelector('.top-bar')).toBeInTheDocument();
	});

	it('renders a hostile title/meta as text, never as markup (XSS guard)', () => {
		const hostile = '"><img src=x onerror=alert(1)>';
		render(<TopBar title={hostile} meta={hostile} />);

		expect(screen.getAllByText(hostile).length).toBeGreaterThan(0);
		expect(document.querySelector('img')).toBeNull();
	});

	it('renders the workingEvent pill when provided', () => {
		render(<TopBar title="Check-in" workingEvent="Meeting Room" />);

		expect(screen.getByText('Meeting Room')).toBeInTheDocument();
		expect(screen.getByText(/Working on:/)).toBeInTheDocument();
	});

	it('omits the workingEvent pill when not provided or null', () => {
		render(<TopBar title="Check-in" workingEvent={null} />);

		expect(screen.queryByText(/Working on:/)).not.toBeInTheDocument();
	});

	it('renders a hostile workingEvent name as text, never as markup (XSS guard)', () => {
		const hostile = '"><img src=x onerror=alert(1)>';
		render(<TopBar title="Check-in" workingEvent={hostile} />);

		expect(screen.getByText(hostile)).toBeInTheDocument();
		expect(document.querySelector('img')).toBeNull();
	});
});
