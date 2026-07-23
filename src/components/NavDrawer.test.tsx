import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { NavDrawer } from './NavDrawer';

describe('NavDrawer', () => {
	it('renders children inside a labelled dialog', () => {
		render(
			<NavDrawer onClose={vi.fn()}>
				<button type="button">Overview</button>
			</NavDrawer>,
		);

		const dialog = screen.getByRole('dialog');
		expect(dialog).toHaveAttribute('aria-modal', 'true');
		expect(screen.getByRole('button', { name: 'Overview' })).toBeInTheDocument();
	});

	it('calls onClose when the close button is clicked', () => {
		const onClose = vi.fn();
		render(
			<NavDrawer onClose={onClose}>
				<span>content</span>
			</NavDrawer>,
		);

		fireEvent.click(screen.getByRole('button', { name: 'Close navigation menu' }));
		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it('calls onClose when the backdrop is clicked', () => {
		const onClose = vi.fn();
		render(
			<NavDrawer onClose={onClose}>
				<span>content</span>
			</NavDrawer>,
		);

		fireEvent.click(screen.getByRole('presentation'));
		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it('does not close when clicking inside the panel itself', () => {
		const onClose = vi.fn();
		render(
			<NavDrawer onClose={onClose}>
				<span>content</span>
			</NavDrawer>,
		);

		fireEvent.click(screen.getByRole('dialog'));
		expect(onClose).not.toHaveBeenCalled();
	});

	it('calls onClose on Escape', () => {
		const onClose = vi.fn();
		render(
			<NavDrawer onClose={onClose}>
				<span>content</span>
			</NavDrawer>,
		);

		fireEvent.keyDown(document, { key: 'Escape' });
		expect(onClose).toHaveBeenCalledTimes(1);
	});
});
