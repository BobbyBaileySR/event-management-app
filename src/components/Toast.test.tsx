import { act } from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ToastProvider, useToast } from './Toast';
import styles from './Toast.module.css';

function Trigger({ onReady }: { onReady: (showToast: ReturnType<typeof useToast>['showToast']) => void }) {
	const { showToast } = useToast();
	onReady(showToast);
	return null;
}

function renderToast() {
	let showToast!: ReturnType<typeof useToast>['showToast'];
	render(
		<ToastProvider>
			<Trigger onReady={(fn) => (showToast = fn)} />
		</ToastProvider>,
	);
	return { showToast };
}

describe('Toast', () => {
	it('shows the title and renders no description paragraph when none is given', () => {
		const { showToast } = renderToast();

		act(() => showToast('Event updated', 'success'));

		expect(screen.getByRole('status')).toHaveTextContent('Event updated');
		expect(document.querySelector(`.${styles.description}`)).toBeNull();
	});

	it('shows a description when provided', () => {
		const { showToast } = renderToast();

		act(() => showToast('Event updated', 'success', 3500, 'Changes to this event were saved successfully.'));

		expect(screen.getByText('Event updated')).toBeInTheDocument();
		expect(screen.getByText('Changes to this event were saved successfully.')).toBeInTheDocument();
	});

	it('renders the success icon for success and the error icon for error', () => {
		const { showToast } = renderToast();

		act(() => showToast('Saved', 'success'));
		expect(screen.getByRole('status')).toHaveTextContent('check_circle');

		act(() => showToast('Failed', 'error'));
		expect(screen.getByRole('status')).toHaveTextContent('error');
	});

	it('dismisses immediately when the close button is clicked', () => {
		const { showToast } = renderToast();
		act(() => showToast('Event updated', 'success'));

		const toast = screen.getByRole('status');
		expect(toast).toHaveClass(styles.show);

		fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }));

		expect(toast).not.toHaveClass(styles.show);
	});

	it('renders a hostile title/description as text, never as markup (XSS guard)', () => {
		const hostile = '"><img src=x onerror=alert(1)>';
		const { showToast } = renderToast();

		act(() => showToast(hostile, 'success', 3500, hostile));

		expect(screen.getAllByText(hostile)).toHaveLength(2);
		expect(document.querySelector('img')).toBeNull();
	});
});
