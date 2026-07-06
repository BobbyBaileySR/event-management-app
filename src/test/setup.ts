import '@testing-library/jest-dom';
import { vi } from 'vitest';

class MockHtml5Qrcode {
	constructor(_elementId: string) {}

	getState() {
		return 0;
	}

	async start() {}

	async stop() {}

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
