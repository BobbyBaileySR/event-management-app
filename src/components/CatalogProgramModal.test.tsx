import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CatalogProgramModal } from './CatalogProgramModal';
import styles from './CatalogProgramModal.module.css';

describe('CatalogProgramModal', () => {
	const onCancel = vi.fn();
	const onSave = vi.fn().mockResolvedValue(undefined);

	beforeEach(() => {
		onCancel.mockReset();
		onSave.mockReset();
		onSave.mockResolvedValue(undefined);
	});

	it('marks required fields with a visible asterisk', () => {
		const { container } = render(
			<CatalogProgramModal mode="create" open onCancel={onCancel} onSave={onSave} />,
		);

		expect(container.querySelectorAll(`.${styles.requiredMark}`)).toHaveLength(1);
	});

	it('renders create dialog with a11y attributes and focuses first field', async () => {
		render(<CatalogProgramModal mode="create" open onCancel={onCancel} onSave={onSave} />);

		const dialog = screen.getByRole('dialog');
		expect(dialog).toHaveAttribute('aria-modal', 'true');
		expect(screen.getByRole('heading', { name: 'Create Program' })).toHaveAttribute('id', dialog.getAttribute('aria-labelledby'));

		const nameField = screen.getByLabelText(/^Program name/);
		expect(nameField).toHaveFocus();
	});

	it('submits create payload without empty optional metadata', async () => {
		render(<CatalogProgramModal mode="create" open onCancel={onCancel} onSave={onSave} />);
		const user = userEvent.setup();

		await user.type(screen.getByLabelText(/^Program name/), 'Summit 2026');
		await user.type(screen.getByLabelText('Description'), 'Annual event');
		await user.click(screen.getByRole('button', { name: 'Save Program' }));

		expect(onSave).toHaveBeenCalledWith({
			name: 'Summit 2026',
			description: 'Annual event',
		});
	});

	it('pre-fills edit mode and sends null to clear optional metadata', async () => {
		render(
			<CatalogProgramModal
				mode="edit"
				open
				program={{
					id: 'prog-1',
					name: 'Summit',
					archived: false,
					description: 'Old blurb',
					startDate: '2026-09-01',
				}}
				onCancel={onCancel}
				onSave={onSave}
			/>,
		);
		const user = userEvent.setup();

		await user.clear(screen.getByLabelText('Description'));
		await user.click(screen.getByRole('button', { name: 'Save Program' }));

		expect(onSave).toHaveBeenCalledWith(
			expect.objectContaining({
				description: null,
			}),
		);
	});

	it('renders hostile description as text, not markup', () => {
		render(
			<CatalogProgramModal
				mode="edit"
				open
				program={{
					id: 'prog-xss',
					name: 'XSS Program',
					archived: false,
					description: '<img onerror=alert(1)>',
				}}
				onCancel={onCancel}
				onSave={onSave}
			/>,
		);

		expect(screen.getByLabelText('Description')).toHaveValue('<img onerror=alert(1)>');
		expect(document.querySelector('img')).toBeNull();
	});

	it('shows Archive Program in edit mode and calls onArchive', async () => {
		const onArchive = vi.fn().mockResolvedValue(undefined);
		render(
			<CatalogProgramModal
				mode="edit"
				open
				program={{ id: 'prog-1', name: 'Summit', archived: false }}
				onCancel={onCancel}
				onSave={onSave}
				onArchive={onArchive}
			/>,
		);
		await userEvent.setup().click(screen.getByRole('button', { name: 'Archive Program' }));
		expect(onArchive).toHaveBeenCalled();
	});

	it('calls onCancel from cancel button', async () => {
		render(<CatalogProgramModal mode="create" open onCancel={onCancel} onSave={onSave} />);
		await userEvent.setup().click(screen.getByRole('button', { name: 'Cancel' }));
		expect(onCancel).toHaveBeenCalled();
	});

	it('dismisses on Escape', async () => {
		render(<CatalogProgramModal mode="create" open onCancel={onCancel} onSave={onSave} />);
		await userEvent.setup().keyboard('{Escape}');
		expect(onCancel).toHaveBeenCalled();
	});

	it('does not overflow body horizontally at 375px viewport', () => {
		Object.defineProperty(document.body, 'clientWidth', { configurable: true, value: 375 });
		document.documentElement.style.width = '375px';
		render(<CatalogProgramModal mode="create" open onCancel={onCancel} onSave={onSave} />);
		expect(document.body.scrollWidth).toBeLessThanOrEqual(document.body.clientWidth + 1);
	});
});
