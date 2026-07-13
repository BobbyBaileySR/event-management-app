import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeSwitcher } from './ThemeSwitcher';

describe('ThemeSwitcher (research R-002: Celebration hidden unless allowlisted)', () => {
	it('hides Celebration when the user is not allowlisted', () => {
		render(<ThemeSwitcher theme="aurora" celebrationAllowed={false} onSelect={vi.fn()} />);

		expect(screen.getByRole('button', { name: 'Aurora' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Dark Aurora' })).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Celebration' })).not.toBeInTheDocument();
	});

	it('shows Celebration when the user is allowlisted', () => {
		render(<ThemeSwitcher theme="aurora" celebrationAllowed onSelect={vi.fn()} />);

		expect(screen.getByRole('button', { name: 'Celebration' })).toBeInTheDocument();
	});

	it('marks the current theme as pressed and calls onSelect with the chosen id', () => {
		const onSelect = vi.fn();
		render(<ThemeSwitcher theme="darkAurora" celebrationAllowed onSelect={onSelect} />);

		expect(screen.getByRole('button', { name: 'Dark Aurora' })).toHaveAttribute('aria-pressed', 'true');
		expect(screen.getByRole('button', { name: 'Aurora' })).toHaveAttribute('aria-pressed', 'false');

		fireEvent.click(screen.getByRole('button', { name: 'Celebration' }));
		expect(onSelect).toHaveBeenCalledWith('celebration');
	});
});
