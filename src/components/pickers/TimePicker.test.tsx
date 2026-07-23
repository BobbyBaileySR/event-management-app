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
		fireEvent.keyDown(screen.getByRole('textbox', { name: /Search Start time/i }), { key: 'Escape' });

		expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
		expect(trigger).toHaveFocus();
	});

	it('selects a time via keyboard (ArrowDown + Enter), not just click (T035)', () => {
		const onChange = vi.fn();
		render(<TimePicker id="start-time" label="Start time" value="" stepMinutes={30} onChange={onChange} />);
		fireEvent.click(screen.getByRole('button', { name: /Start time/i }));
		const search = screen.getByRole('textbox', { name: /Search Start time/i });

		fireEvent.keyDown(search, { key: 'ArrowDown' });
		fireEvent.keyDown(search, { key: 'Enter' });

		expect(onChange).toHaveBeenCalledWith('00:30');
	});

	it('formats midnight and noon without a "0" hour (T035)', () => {
		render(<TimePicker id="start-time" label="Start time" value="" stepMinutes={720} onChange={vi.fn()} />);
		fireEvent.click(screen.getByRole('button', { name: /Start time/i }));

		expect(screen.getByRole('option', { name: '12:00 AM' })).toBeInTheDocument();
		expect(screen.getByRole('option', { name: '12:00 PM' })).toBeInTheDocument();
	});

	it('filters time options by typing (T035 typeahead)', () => {
		render(<TimePicker id="start-time" label="Start time" value="" stepMinutes={30} onChange={vi.fn()} />);
		fireEvent.click(screen.getByRole('button', { name: /Start time/i }));
		const search = screen.getByRole('textbox', { name: /Search Start time/i });

		fireEvent.change(search, { target: { value: '9:00 AM' } });

		expect(screen.getAllByRole('option')).toHaveLength(1);
		expect(screen.getByRole('option', { name: '9:00 AM' })).toBeInTheDocument();
	});

	it('does not open when disabled', () => {
		render(<TimePicker id="start-time" label="Start time" value="" disabled onChange={vi.fn()} />);
		fireEvent.click(screen.getByRole('button', { name: /Start time/i }));
		expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
	});
});
