import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingState } from './LoadingState';

describe('LoadingState', () => {
	it('renders a status region with spinner and message', () => {
		render(<LoadingState message="Loading attendees…" />);

		expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
		expect(screen.getByText('Loading attendees…')).toBeInTheDocument();
	});

	it('renders table skeleton rows when requested', () => {
		const { container } = render(
			<LoadingState message="Loading events…" skeleton="table" skeletonRows={3} />,
		);

		expect(container.querySelectorAll('[class*="skeletonRow"]').length).toBe(3);
	});
});
