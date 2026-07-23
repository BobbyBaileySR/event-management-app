import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { RefetchFailureBanner } from './RefetchFailureBanner';

describe('RefetchFailureBanner', () => {
	it('renders an alert row with the retry action', () => {
		const onRetry = vi.fn();
		render(<RefetchFailureBanner onRetry={onRetry} />);

		const alert = screen.getByRole('alert');
		expect(alert).toHaveTextContent("Couldn't refresh — showing the last loaded data.");

		fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
		expect(onRetry).toHaveBeenCalledTimes(1);
	});

	it('renders hostile message text, never as markup (XSS guard)', () => {
		const hostileMessage = '"><img src=x onerror=alert(1)>Refresh failed';
		render(<RefetchFailureBanner message={hostileMessage} onRetry={() => {}} />);

		expect(screen.getByText(hostileMessage)).toBeInTheDocument();
		expect(document.querySelector('img')).toBeNull();
	});
});
