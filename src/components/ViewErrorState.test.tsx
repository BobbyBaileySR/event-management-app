import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ViewErrorState } from './ViewErrorState';

describe('ViewErrorState', () => {
	it('renders alert message and optional retry', async () => {
		const user = userEvent.setup();
		const onRetry = vi.fn();

		render(
			<ViewErrorState
				viewId="view-test"
				title="Test screen"
				message="Load failed"
				onRetry={onRetry}
			/>,
		);

		expect(screen.getByRole('heading', { name: 'Test screen' })).toBeInTheDocument();
		expect(screen.getByRole('alert')).toHaveTextContent('Load failed');
		await user.click(screen.getByRole('button', { name: 'Try again' }));
		expect(onRetry).toHaveBeenCalledOnce();
	});
});
