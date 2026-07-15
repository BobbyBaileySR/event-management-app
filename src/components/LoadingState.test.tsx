import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingState } from './LoadingState';
import { getRandomLoadingTip } from '../constants/loadingTips';

vi.mock('../constants/loadingTips', () => ({
	getRandomLoadingTip: vi.fn(() => null),
}));

const mockGetRandomLoadingTip = vi.mocked(getRandomLoadingTip);

describe('LoadingState', () => {
	beforeEach(() => {
		mockGetRandomLoadingTip.mockReset();
		mockGetRandomLoadingTip.mockReturnValue(null);
	});
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

	it('does not render Did you know when tips list is empty', () => {
		render(<LoadingState message="Loading attendees…" skeleton="table" />);

		expect(screen.queryByText('Did you know?')).not.toBeInTheDocument();
	});

	it('renders Did you know below the spinner for page variant', () => {
		mockGetRandomLoadingTip.mockReturnValueOnce('A fun fact.');

		render(<LoadingState message="Loading compose options…" />);

		expect(screen.getByText('Did you know?')).toBeInTheDocument();
		expect(screen.getByText(/A fun fact\./)).toBeInTheDocument();
	});

	it('renders Did you know for panel variant without a skeleton', () => {
		mockGetRandomLoadingTip.mockReturnValueOnce('Another fact.');

		render(<LoadingState message="Loading settings…" variant="panel" />);

		expect(screen.getByText(/Another fact\./)).toBeInTheDocument();
	});

	it('does not render Did you know for inline variant', () => {
		mockGetRandomLoadingTip.mockReturnValueOnce('Should not appear.');

		render(<LoadingState message="Loading catalog…" variant="inline" didYouKnow={false} />);

		expect(screen.queryByText('Did you know?')).not.toBeInTheDocument();
		expect(mockGetRandomLoadingTip).not.toHaveBeenCalled();
	});
});
