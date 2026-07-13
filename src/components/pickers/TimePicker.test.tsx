import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { TimePicker } from './TimePicker';

describe('TimePicker', () => {
	it('generates step-based time options and reports the chosen value', () => {
		const onChange = vi.fn();
		render(<TimePicker id="start-time" label="Start time" value="" stepMinutes={30} onChange={onChange} />);

		fireEvent.click(screen.getByRole('button', { name: /Start time/i }));
		expect(screen.getByRole('option', { name: '9:00 AM' })).toBeInTheDocument();

		fireEvent.click(screen.getByRole('option', { name: '9:30 AM' }));
		expect(onChange).toHaveBeenCalledWith('09:30');
	});

	it('closes on Escape and returns focus to the trigger', () => {
		render(<TimePicker id="start-time" label="Start time" value="" onChange={vi.fn()} />);
		const trigger = screen.getByRole('button', { name: /Start time/i });

		fireEvent.click(trigger);
		fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' });

		expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
		expect(trigger).toHaveFocus();
	});
});
