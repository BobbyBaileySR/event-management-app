import '@testing-library/jest-dom';
import { vi } from 'vitest';

class MockHtml5Qrcode {
	constructor(_elementId: string) {}

	getState() {
		return 0;
	}

	async start(): Promise<null> {
		return null;
	}

	async stop(): Promise<void> {}

	clear() {}
}

vi.mock('html5-qrcode', () => ({
	Html5Qrcode: MockHtml5Qrcode,
	Html5QrcodeScannerState: {
		NOT_STARTED: 0,
		SCANNING: 1,
		PAUSED: 2,
	},
}));

class MockResizeObserver {
	observe() {}
	unobserve() {}
	disconnect() {}
}

vi.stubGlobal('ResizeObserver', MockResizeObserver);
