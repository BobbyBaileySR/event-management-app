import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmptyState } from './EmptyState';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
	const actual = await importOriginal<typeof import('react-router-dom')>();
	return {
		...actual,
		useNavigate: () => mockNavigate,
	};
});

describe('EmptyState', () => {
	it('renders the message and uses viewId as the section id', () => {
		render(<EmptyState viewId="attendees-empty" message="No attendees yet." />);

		expect(screen.getByText('No attendees yet.')).toBeInTheDocument();
		expect(document.getElementById('attendees-empty')).toBeInTheDocument();
	});

	it('renders no action button when action is omitted', () => {
		render(<EmptyState viewId="v" message="Nothing here." />);

		expect(screen.queryByRole('button')).not.toBeInTheDocument();
	});

	it('renders an action button and navigates on click when action is provided', () => {
		render(<EmptyState viewId="v" message="Nothing here." action={{ label: 'Create event', to: '/events/new' }} />);

		fireEvent.click(screen.getByRole('button', { name: 'Create event' }));

		expect(mockNavigate).toHaveBeenCalledWith('/events/new');
	});

	it('renders a hostile message as text, never as markup (XSS guard)', () => {
		const hostile = '"><img src=x onerror=alert(1)>';
		render(<EmptyState viewId="v" message={hostile} />);

		expect(screen.getByText(hostile)).toBeInTheDocument();
		expect(document.querySelector('img')).toBeNull();
	});
});
