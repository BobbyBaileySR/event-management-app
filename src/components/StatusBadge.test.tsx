import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from './StatusBadge';

describe('StatusBadge', () => {
	it.each([
		['active', 'badge--active', 'Active'],
		['draft', 'badge--draft', 'Draft'],
		['cancelled', 'badge--cancelled', 'Cancelled'],
		['completed', 'badge--draft', 'Completed'],
		['Registered', 'badge--registered', 'Registered'],
		['Checked In', 'badge--checked-in', 'Checked In'],
		['Cancelled', 'badge--cancelled', 'Cancelled'],
	])('renders "%s" with class %s and capitalized text %s', (status, expectedClass, expectedText) => {
		render(<StatusBadge status={status} />);

		const badge = screen.getByText(expectedText);
		expect(badge).toHaveClass('badge', expectedClass);
	});

	it('falls back to the draft class for an unrecognized status', () => {
		render(<StatusBadge status="mystery" />);

		expect(screen.getByText('Mystery')).toHaveClass('badge--draft');
	});

	it('renders an empty status as empty text without throwing', () => {
		const { container } = render(<StatusBadge status="" />);

		expect(container.querySelector('span')).toHaveTextContent('');
	});

	it('renders a hostile status as text, never as markup (XSS guard)', () => {
		const hostile = '<img src=x onerror=alert(1)>';
		render(<StatusBadge status={hostile} />);

		expect(screen.getByText(`${hostile.charAt(0).toUpperCase()}${hostile.slice(1)}`)).toBeInTheDocument();
		expect(document.querySelector('img')).toBeNull();
	});
});
