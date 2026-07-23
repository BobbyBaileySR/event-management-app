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

	it('phrases a negative manual adjustment (live attendance corrected above checked-in) distinctly from the raw negative number', () => {
		render(<CapacityBar variant="live" value={83} capacity={100} checkedInCount={80} manualAdjustmentCount={-3} />);
		expect(screen.getByText('Includes manual adjustment of 3 above checked-in')).toBeInTheDocument();
	});

	it('disables −1 at floor; +1 (BE-CHECKIN-001) is never disabled by hitting the checked-in count', () => {
		const onAdjust = vi.fn();
		const { rerender } = render(
			<CapacityBar variant="live" value={0} capacity={100} checkedInCount={5} onAdjust={onAdjust} />,
		);

		expect(screen.getByLabelText('Record one departure')).toBeDisabled();
		expect(screen.getByLabelText('Correct one departure')).not.toBeDisabled();

		rerender(
			<CapacityBar variant="live" value={5} capacity={100} checkedInCount={5} onAdjust={onAdjust} />,
		);

		// Staff have full discretion to keep correcting up past the checked-in count too
		// (e.g. a walk-in who checked in through a side channel) — no ceiling anymore.
		expect(screen.getByLabelText('Correct one departure')).not.toBeDisabled();
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
