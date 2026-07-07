import { useEffect, useId, useRef, useState } from 'react';
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

/** Size the scan region from the live viewfinder, not the viewport. */
export function qrBoxDimensions(
	viewfinderWidth: number,
	viewfinderHeight: number,
): { width: number; height: number } {
	const limit = Math.min(viewfinderWidth, viewfinderHeight);
	const size = Math.max(Math.min(Math.floor(limit * 0.75), 280), 160);
	return { width: size, height: size };
}

export function CheckInQrPanel({ onDecode, disabled = false }: CheckInQrPanelProps) {
	const readerId = useId().replace(/:/g, '');
	const readerRef = useRef<HTMLDivElement>(null);
	const onDecodeRef = useRef(onDecode);
	onDecodeRef.current = onDecode;
	const [readerWidth, setReaderWidth] = useState(0);

	useEffect(() => {
		const element = readerRef.current;
		if (!element) {
			return;
		}

		const observer = new ResizeObserver((entries) => {
			const width = Math.round(entries[0]?.contentRect.width ?? 0);
			if (width > 0) {
				setReaderWidth((current) => (current === width ? current : width));
			}
		});

		observer.observe(element);
		return () => observer.disconnect();
	}, []);

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
				{ fps: 8, qrbox: qrBoxDimensions },
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
	}, [disabled, readerId, readerWidth]);

	return (
		<div className={styles.panel}>
			<div
				ref={readerRef}
				id={readerId}
				className={styles.reader}
				aria-label="QR code scanner"
			/>
			{disabled ? <p className={styles.hint}>Processing scan…</p> : null}
		</div>
	);
}
