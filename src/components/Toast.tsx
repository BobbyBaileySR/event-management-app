import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import styles from './Toast.module.css';

type ToastType = 'success' | 'error';

interface ToastState {
	message: string;
	description?: string;
	type: ToastType;
	visible: boolean;
	durationMs: number;
	/** Bumped on every showToast() call so the progress-bar animation remounts and restarts. */
	key: number;
}

interface ToastContextValue {
	showToast: (message: string, type?: ToastType, durationMs?: number, description?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const ICONS: Record<ToastType, string> = {
	success: 'check_circle',
	error: 'error',
};

export function ToastProvider({ children }: { children: ReactNode }) {
	const [toast, setToast] = useState<ToastState>({
		message: '',
		type: 'success',
		visible: false,
		durationMs: 3500,
		key: 0,
	});
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const keyRef = useRef(0);

	const showToast = useCallback((message: string, type: ToastType = 'success', durationMs = 3500, description?: string) => {
		keyRef.current += 1;
		setToast({ message, description, type, visible: true, durationMs, key: keyRef.current });
		if (timer.current) {
			clearTimeout(timer.current);
		}
		timer.current = setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), durationMs);
	}, []);

	const dismiss = useCallback(() => {
		if (timer.current) {
			clearTimeout(timer.current);
		}
		setToast((prev) => ({ ...prev, visible: false }));
	}, []);

	const value = useMemo(() => ({ showToast }), [showToast]);

	return (
		<ToastContext.Provider value={value}>
			{children}
			<div
				role="status"
				aria-live="polite"
				className={`${styles.toast} ${toast.visible ? styles.show : ''} ${
					toast.type === 'error' ? styles.error : styles.success
				}`}
			>
				<span className={styles.icon} aria-hidden="true">
					{ICONS[toast.type]}
				</span>
				<div className={styles.content}>
					<p className={styles.title}>{toast.message}</p>
					{toast.description ? <p className={styles.description}>{toast.description}</p> : null}
				</div>
				<button type="button" className={styles.close} onClick={dismiss} aria-label="Dismiss notification">
					<span aria-hidden="true">close</span>
				</button>
				{toast.visible ? (
					<span
						key={toast.key}
						className={styles.progress}
						aria-hidden="true"
						style={{ animationDuration: `${toast.durationMs}ms` }}
					/>
				) : null}
			</div>
		</ToastContext.Provider>
	);
}

export function useToast(): ToastContextValue {
	const context = useContext(ToastContext);
	if (!context) {
		throw new Error('useToast must be used within a ToastProvider');
	}
	return context;
}
