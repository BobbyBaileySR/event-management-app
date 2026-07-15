import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { CapacityBar } from './CapacityBar';

describe('CapacityBar', () => {
	it('renders registered variant for Event Hub, incl. spots remaining', () => {
		render(<CapacityBar value={42} capacity={100} />);
		expect(screen.getByText('42 / 100 registered')).toBeInTheDocument();
		expect(screen.getByText('42%')).toBeInTheDocument();
		expect(screen.getByText('58 spots remaining')).toBeInTheDocument();
	});

	it('shows tier label for live caution state', () => {
		render(<CapacityBar variant="live" value={75} capacity={100} checkedInCount={80} tier="caution" />);
		expect(screen.getByLabelText('Live capacity: 75 of 100 on site, 75 percent full')).toBeInTheDocument();
		expect(screen.getByText('Approaching capacity')).toBeInTheDocument();
	});

	it('shows the manual-adjustment note only when a manual adjustment has been made', () => {
		const { rerender } = render(<CapacityBar variant="live" value={75} capacity={100} checkedInCount={80} />);
		expect(screen.queryByText(/Includes manual adjustment of/)).toBeNull();

		rerender(<CapacityBar variant="live" value={75} capacity={100} checkedInCount={80} manualAdjustmentCount={2} />);
		expect(screen.getByText('Includes manual adjustment of 2')).toBeInTheDocument();
	});

	it('disables −1 at floor and +1 at ceiling', () => {
		const onAdjust = vi.fn();
		const { rerender } = render(
			<CapacityBar variant="live" value={0} capacity={100} checkedInCount={5} onAdjust={onAdjust} />,
		);

		expect(screen.getByLabelText('Record one departure')).toBeDisabled();
		expect(screen.getByLabelText('Correct one departure')).not.toBeDisabled();

		rerender(
			<CapacityBar variant="live" value={5} capacity={100} checkedInCount={5} onAdjust={onAdjust} />,
		);

		expect(screen.getByLabelText('Correct one departure')).toBeDisabled();
	});

	it('calls onAdjust for live controls', () => {
		const onAdjust = vi.fn();
		render(
			<CapacityBar variant="live" value={3} capacity={100} checkedInCount={5} onAdjust={onAdjust} />,
		);

		fireEvent.click(screen.getByLabelText('Record one departure'));
		expect(onAdjust).toHaveBeenCalledWith('down');
	});
});
