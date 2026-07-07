import { StrictMode } from 'react';
import { render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CheckInQrPanel, qrBoxDimensions } from './CheckInQrPanel';

describe('qrBoxDimensions', () => {
	it('sizes from the smaller viewfinder edge with a 75% margin', () => {
		expect(qrBoxDimensions(320, 320)).toEqual({ width: 240, height: 240 });
	});

	it('caps the scan box at 280px for large viewfinders', () => {
		expect(qrBoxDimensions(800, 600)).toEqual({ width: 280, height: 280 });
	});

	it('floors the scan box at 160px for compact viewfinders', () => {
		expect(qrBoxDimensions(180, 180)).toEqual({ width: 160, height: 160 });
	});

	it('uses height when it is the limiting dimension', () => {
		expect(qrBoxDimensions(500, 240)).toEqual({ width: 180, height: 180 });
	});
});

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
		const startSpy = vi.spyOn(Html5Qrcode.prototype, 'start').mockResolvedValue(null);

		render(<CheckInQrPanel onDecode={vi.fn()} disabled />);

		await waitFor(() => {
			expect(startSpy).not.toHaveBeenCalled();
		});

		startSpy.mockRestore();
	});

	it('passes a viewfinder-aware qrbox function to the scanner', async () => {
		const { Html5Qrcode } = await import('html5-qrcode');
		const startSpy = vi.spyOn(Html5Qrcode.prototype, 'start').mockResolvedValue(null);

		render(<CheckInQrPanel onDecode={vi.fn()} />);

		await waitFor(() => {
			expect(startSpy).toHaveBeenCalled();
		});

		const scanConfig = startSpy.mock.calls[0]?.[1] as { qrbox: typeof qrBoxDimensions };
		expect(scanConfig.qrbox(320, 320)).toEqual({ width: 240, height: 240 });

		startSpy.mockRestore();
	});

	it('stops a scanner that finishes starting after unmount', async () => {
		const { Html5Qrcode } = await import('html5-qrcode');
		let resolveStart: (() => void) | undefined;
		const startSpy = vi.spyOn(Html5Qrcode.prototype, 'start').mockImplementation(() => {
			return new Promise<null>((resolve) => {
				resolveStart = () => resolve(null);
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
