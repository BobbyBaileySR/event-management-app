import { useEffect, useId, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
import styles from './CheckInQrPanel.module.css';

interface CheckInQrPanelProps {
	onDecode: (jwt: string) => void;
	disabled?: boolean;
}

function safelyStopScanner(scanner: Html5Qrcode | null): void {
	if (!scanner) {
		return;
	}

	const state = scanner.getState();
	if (state === Html5QrcodeScannerState.NOT_STARTED) {
		try {
			scanner.clear();
		} catch {
			/* ignore */
		}
		return;
	}

	try {
		void scanner
			.stop()
			.then(() => scanner.clear())
			.catch(() => {});
	} catch {
		/* stop() can throw synchronously if start never completed */
	}
}

export function CheckInQrPanel({ onDecode, disabled = false }: CheckInQrPanelProps) {
	const readerId = useId().replace(/:/g, '');
	const onDecodeRef = useRef(onDecode);
	onDecodeRef.current = onDecode;

	useEffect(() => {
		if (disabled || !document.getElementById(readerId)) {
			return;
		}

		let active = true;
		let scanner: Html5Qrcode | null = null;

		try {
			scanner = new Html5Qrcode(readerId);
		} catch {
			return;
		}

		void scanner
			.start(
				{ facingMode: 'environment' },
				{ fps: 8, qrbox: { width: 220, height: 220 } },
				(decodedText) => {
					if (active) {
						onDecodeRef.current(decodedText);
					}
				},
				() => {},
			)
			.then(() => {
				if (!active) {
					safelyStopScanner(scanner);
				}
			})
			.catch(() => {
				/* Camera unavailable — reader element stays empty in PoC environments. */
			});

		return () => {
			active = false;
			safelyStopScanner(scanner);
		};
	}, [disabled, readerId]);

	return (
		<div className={styles.panel}>
			<div id={readerId} className={styles.reader} aria-label="QR code scanner" />
			{disabled ? <p className={styles.hint}>Processing scan…</p> : null}
		</div>
	);
}
