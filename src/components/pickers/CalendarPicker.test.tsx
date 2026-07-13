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
});
