import { StrictMode } from 'react';
import { render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CheckInQrPanel } from './CheckInQrPanel';

describe('CheckInQrPanel', () => {
	it('mounts under StrictMode without surfacing scanner stop errors', async () => {
		const onDecode = vi.fn();

		render(
			<StrictMode>
				<CheckInQrPanel onDecode={onDecode} />
			</StrictMode>,
		);

		await waitFor(() => {
			expect(document.querySelector('[aria-label="QR code scanner"]')).toBeTruthy();
		});
	});

	it('does not start the scanner while disabled', async () => {
		const { Html5Qrcode } = await import('html5-qrcode');
		const startSpy = vi.spyOn(Html5Qrcode.prototype, 'start').mockResolvedValue(undefined);

		render(<CheckInQrPanel onDecode={vi.fn()} disabled />);

		await waitFor(() => {
			expect(startSpy).not.toHaveBeenCalled();
		});

		startSpy.mockRestore();
	});

	it('stops a scanner that finishes starting after unmount', async () => {
		const { Html5Qrcode } = await import('html5-qrcode');
		let resolveStart: (() => void) | undefined;
		const startSpy = vi.spyOn(Html5Qrcode.prototype, 'start').mockImplementation(() => {
			return new Promise<void>((resolve) => {
				resolveStart = resolve;
			});
		});
		const stopSpy = vi.spyOn(Html5Qrcode.prototype, 'stop').mockResolvedValue(undefined);
		vi.spyOn(Html5Qrcode.prototype, 'getState').mockReturnValue(2);
		vi.spyOn(Html5Qrcode.prototype, 'clear').mockImplementation(() => {});

		const { unmount } = render(<CheckInQrPanel onDecode={vi.fn()} />);

		unmount();
		resolveStart?.();
		await waitFor(() => {
			expect(stopSpy).toHaveBeenCalled();
		});

		startSpy.mockRestore();
		stopSpy.mockRestore();
	});
});
