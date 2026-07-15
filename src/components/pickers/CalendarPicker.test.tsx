import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { CalendarPicker } from './CalendarPicker';

describe('CalendarPicker', () => {
	it('opens a labelled dialog with a day grid and closes on Escape (focus returns to trigger)', () => {
		render(<CalendarPicker id="event-date" label="Event date" value="2026-07-13" onChange={vi.fn()} />);
		const trigger = screen.getByRole('button', { name: /Event date: 2026-07-13/i });

		fireEvent.click(trigger);
		expect(screen.getByRole('dialog', { name: /Event date/i })).toBeInTheDocument();
		expect(screen.getByText('July 2026')).toBeInTheDocument();
		expect(screen.getByRole('gridcell', { name: '13' })).toHaveAttribute('aria-selected', 'true');

		fireEvent.keyDown(screen.getByRole('grid'), { key: 'Escape' });
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
		expect(trigger).toHaveFocus();
	});

	it('selects a day on click and reports an ISO date', () => {
		const onChange = vi.fn();
		render(<CalendarPicker id="event-date" label="Event date" value="2026-07-13" onChange={onChange} />);

		fireEvent.click(screen.getByRole('button', { name: /Event date/i }));
		fireEvent.click(screen.getByRole('gridcell', { name: '20' }));

		expect(onChange).toHaveBeenCalledWith('2026-07-20');
	});

	it('navigates months with the header controls', () => {
		render(<CalendarPicker id="event-date" label="Event date" value="2026-07-13" onChange={vi.fn()} />);

		fireEvent.click(screen.getByRole('button', { name: /Event date/i }));
		fireEvent.click(screen.getByRole('button', { name: 'Next month' }));

		expect(screen.getByText('August 2026')).toBeInTheDocument();
	});

	it('exposes a modal dialog and tracks the keyboard-active day via aria-activedescendant, including arrow/Home/End (T035)', () => {
		render(<CalendarPicker id="event-date" label="Event date" value="2026-07-13" onChange={vi.fn()} />);
		fireEvent.click(screen.getByRole('button', { name: /Event date/i }));

		const dialog = screen.getByRole('dialog', { name: /Event date/i });
		expect(dialog).toHaveAttribute('aria-modal', 'true');
		const grid = screen.getByRole('grid');
		expect(grid).toHaveAttribute('aria-activedescendant', 'event-date-day-2026-07-13');

		fireEvent.keyDown(grid, { key: 'ArrowRight' });
		expect(grid).toHaveAttribute('aria-activedescendant', 'event-date-day-2026-07-14');

		fireEvent.keyDown(grid, { key: 'ArrowDown' });
		expect(grid).toHaveAttribute('aria-activedescendant', 'event-date-day-2026-07-21');

		fireEvent.keyDown(grid, { key: 'End' });
		expect(grid).toHaveAttribute('aria-activedescendant', 'event-date-day-2026-07-25');

		fireEvent.keyDown(grid, { key: 'Home' });
		expect(grid).toHaveAttribute('aria-activedescendant', 'event-date-day-2026-07-19');
	});

	it('moves the active month with PageUp/PageDown and selects the active day on Enter', () => {
		const onChange = vi.fn();
		render(<CalendarPicker id="event-date" label="Event date" value="2026-07-13" onChange={onChange} />);
		fireEvent.click(screen.getByRole('button', { name: /Event date/i }));
		const grid = screen.getByRole('grid');

		fireEvent.keyDown(grid, { key: 'PageDown' });
		expect(screen.getByText('August 2026')).toBeInTheDocument();

		fireEvent.keyDown(grid, { key: 'PageUp' });
		expect(screen.getByText('July 2026')).toBeInTheDocument();

		fireEvent.keyDown(grid, { key: 'Enter' });
		expect(onChange).toHaveBeenCalledWith('2026-07-13');
	});

	it('does not open when disabled', () => {
		render(<CalendarPicker id="event-date" label="Event date" value="2026-07-13" disabled onChange={vi.fn()} />);
		fireEvent.click(screen.getByRole('button', { name: /Event date/i }));
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
	});
});
