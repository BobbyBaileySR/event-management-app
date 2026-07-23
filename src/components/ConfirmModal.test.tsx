import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmProvider, useConfirm } from './ConfirmModal';

function Trigger({ onReady }: { onReady: (confirm: ReturnType<typeof useConfirm>['confirm']) => void }) {
	const { confirm } = useConfirm();
	onReady(confirm);
	return null;
}

function renderConfirm() {
	let confirm!: ReturnType<typeof useConfirm>['confirm'];
	render(
		<ConfirmProvider>
			<Trigger onReady={(fn) => (confirm = fn)} />
		</ConfirmProvider>,
	);
	return { confirm: (...args: Parameters<typeof confirm>) => confirm(...args) };
}

describe('ConfirmModal', () => {
	it('does not render a dialog until confirm() is called', () => {
		renderConfirm();
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
	});

	it('renders the dialog with title/message and default button labels', async () => {
		const { confirm } = renderConfirm();
		confirm({ title: 'Archive event', message: 'This cannot be undone.' });

		const dialog = await screen.findByRole('dialog');
		expect(dialog).toHaveAttribute('aria-modal', 'true');
		expect(screen.getByRole('heading', { name: 'Archive event' })).toBeInTheDocument();
		expect(screen.getByText('This cannot be undone.')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
	});

	it('uses custom confirm/cancel labels when provided', async () => {
		const { confirm } = renderConfirm();
		confirm({ title: 'Delete', message: 'Sure?', confirmLabel: 'Delete', cancelLabel: 'Keep it' });

		await screen.findByRole('dialog');
		expect(screen.getByRole('button', { name: 'Keep it' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
	});

	it('resolves true and closes the dialog when Confirm is clicked', async () => {
		const { confirm } = renderConfirm();
		const resultPromise = confirm({ title: 'Archive event', message: 'This cannot be undone.' });

		await screen.findByRole('dialog');
		fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

		await expect(resultPromise).resolves.toBe(true);
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
	});

	it('resolves false when Cancel is clicked', async () => {
		const { confirm } = renderConfirm();
		const resultPromise = confirm({ title: 'Archive event', message: 'This cannot be undone.' });

		await screen.findByRole('dialog');
		fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

		await expect(resultPromise).resolves.toBe(false);
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
	});

	it('resolves false when the overlay backdrop is clicked', async () => {
		const { confirm } = renderConfirm();
		const resultPromise = confirm({ title: 'Archive event', message: 'This cannot be undone.' });

		await screen.findByRole('dialog');
		fireEvent.click(screen.getByRole('presentation'));

		await expect(resultPromise).resolves.toBe(false);
	});

	it('does not close when clicking inside the dialog body itself', async () => {
		const { confirm } = renderConfirm();
		confirm({ title: 'Archive event', message: 'This cannot be undone.' });

		const dialog = await screen.findByRole('dialog');
		fireEvent.click(dialog);

		expect(screen.getByRole('dialog')).toBeInTheDocument();
	});

	it('renders a hostile title/message as text, never as markup (XSS guard)', async () => {
		const hostile = '"><img src=x onerror=alert(1)>';
		const { confirm } = renderConfirm();
		confirm({ title: hostile, message: hostile });

		await screen.findByRole('dialog');
		expect(screen.getAllByText(hostile)).toHaveLength(2);
		expect(document.querySelector('img')).toBeNull();
	});
});
