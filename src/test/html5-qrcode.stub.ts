export class Html5Qrcode {
	constructor(_elementId: string) {}

	getState() {
		return 0;
	}

	async start() {}

	async stop() {}

	clear() {}
}

export const Html5QrcodeScannerState = {
	NOT_STARTED: 0,
	SCANNING: 1,
	PAUSED: 2,
};
