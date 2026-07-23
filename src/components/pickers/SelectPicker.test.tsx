import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { SelectPicker } from './SelectPicker';

const OPTIONS = [
	{ value: 'a', label: 'Option A' },
	{ value: 'b', label: 'Option B' },
	{ value: 'c', label: 'Option C' },
];

function Harness() {
	const [value, setValue] = useState('a');
	return <SelectPicker id="fruit" label="Fruit" value={value} placeholder="Select…" options={OPTIONS} onChange={setValue} />;
}

describe('SelectPicker', () => {
	it('opens on click, exposes a labelled listbox, and closes on Escape (focus returns to trigger)', () => {
		render(<Harness />);
		const trigger = screen.getByRole('button', { name: /Fruit: Option A/i });

		fireEvent.click(trigger);
		const listbox = screen.getByRole('listbox');
		expect(listbox).toHaveAttribute('aria-labelledby', 'fruit-label');
		expect(screen.getAllByRole('option')).toHaveLength(3);

		const search = screen.getByRole('textbox', { name: /Search Fruit/i });
		fireEvent.keyDown(search, { key: 'Escape' });
		expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
		expect(trigger).toHaveFocus();
	});

	it('navigates with ArrowDown and selects with Enter', () => {
		const onChange = vi.fn();
		render(
			<SelectPicker id="fruit" label="Fruit" value="a" placeholder="Select…" options={OPTIONS} onChange={onChange} />,
		);
		fireEvent.click(screen.getByRole('button', { name: /Fruit/i }));
		const search = screen.getByRole('textbox', { name: /Search Fruit/i });

		fireEvent.keyDown(search, { key: 'ArrowDown' });
		fireEvent.keyDown(search, { key: 'Enter' });

		expect(onChange).toHaveBeenCalledWith('b');
	});

	it('closes on outside click without changing the value', () => {
		const onChange = vi.fn();
		render(
			<div>
				<SelectPicker id="fruit" label="Fruit" value="a" placeholder="Select…" options={OPTIONS} onChange={onChange} />
				<button type="button">outside</button>
			</div>,
		);
		fireEvent.click(screen.getByRole('button', { name: /Fruit/i }));
		expect(screen.getByRole('listbox')).toBeInTheDocument();

		fireEvent.mouseDown(screen.getByRole('button', { name: 'outside' }));
		expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
		expect(onChange).not.toHaveBeenCalled();
	});

	it('exposes aria-haspopup/aria-expanded on the trigger and marks the selected option (T035)', () => {
		render(<Harness />);
		const trigger = screen.getByRole('button', { name: /Fruit: Option A/i });
		expect(trigger).toHaveAttribute('aria-haspopup', 'listbox');
		expect(trigger).toHaveAttribute('aria-expanded', 'false');

		fireEvent.click(trigger);
		expect(trigger).toHaveAttribute('aria-expanded', 'true');
		expect(screen.getByRole('option', { name: 'Option A' })).toHaveAttribute('aria-selected', 'true');
		expect(screen.getByRole('option', { name: 'Option B' })).toHaveAttribute('aria-selected', 'false');
	});

	it('tracks the keyboard-active option via aria-activedescendant, including Home/End (T035)', () => {
		render(<Harness />);
		fireEvent.click(screen.getByRole('button', { name: /Fruit/i }));
		const search = screen.getByRole('textbox', { name: /Search Fruit/i });

		fireEvent.keyDown(search, { key: 'End' });
		expect(search).toHaveAttribute('aria-activedescendant', 'fruit-option-2');

		fireEvent.keyDown(search, { key: 'ArrowUp' });
		expect(search).toHaveAttribute('aria-activedescendant', 'fruit-option-1');

		fireEvent.keyDown(search, { key: 'Home' });
		expect(search).toHaveAttribute('aria-activedescendant', 'fruit-option-0');
	});

	it('does not open when disabled', () => {
		render(
			<SelectPicker id="fruit" label="Fruit" value="a" placeholder="Select…" options={OPTIONS} disabled onChange={vi.fn()} />,
		);
		fireEvent.click(screen.getByRole('button', { name: /Fruit/i }));
		expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
	});

	it('Tab closes the menu without forcing focus back onto the trigger (T035)', () => {
		render(<Harness />);
		const trigger = screen.getByRole('button', { name: /Fruit/i });
		fireEvent.click(trigger);
		const search = screen.getByRole('textbox', { name: /Search Fruit/i });
		const focusSpy = vi.spyOn(trigger, 'focus');

		fireEvent.keyDown(search, { key: 'Tab' });

		expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
		expect(focusSpy).not.toHaveBeenCalled();
	});

	it('focuses the search input on open so typing filters immediately', () => {
		render(<Harness />);
		fireEvent.click(screen.getByRole('button', { name: /Fruit/i }));
		expect(screen.getByRole('textbox', { name: /Search Fruit/i })).toHaveFocus();
	});

	it('filters options by label substring as the user types', () => {
		render(<Harness />);
		fireEvent.click(screen.getByRole('button', { name: /Fruit/i }));
		const search = screen.getByRole('textbox', { name: /Search Fruit/i });

		fireEvent.change(search, { target: { value: 'b' } });

		expect(screen.getAllByRole('option')).toHaveLength(1);
		expect(screen.getByRole('option', { name: 'Option B' })).toBeInTheDocument();
	});

	it('shows a "no options found" message when the filter matches nothing', () => {
		render(<Harness />);
		fireEvent.click(screen.getByRole('button', { name: /Fruit/i }));
		const search = screen.getByRole('textbox', { name: /Search Fruit/i });

		fireEvent.change(search, { target: { value: 'zzz' } });

		expect(screen.queryAllByRole('option')).toHaveLength(0);
		expect(screen.getByText('No options found.')).toBeInTheDocument();
	});

	it('clears the search term when the menu is reopened', () => {
		render(<Harness />);
		const trigger = screen.getByRole('button', { name: /Fruit/i });
		fireEvent.click(trigger);
		fireEvent.change(screen.getByRole('textbox', { name: /Search Fruit/i }), { target: { value: 'b' } });
		fireEvent.keyDown(screen.getByRole('textbox', { name: /Search Fruit/i }), { key: 'Escape' });

		fireEvent.click(trigger);
		expect(screen.getByRole('textbox', { name: /Search Fruit/i })).toHaveValue('');
		expect(screen.getAllByRole('option')).toHaveLength(3);
	});
});
