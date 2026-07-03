import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import styles from './Toast.module.css';

type ToastType = 'success' | 'error';

interface ToastState {
	message: string;
	type: ToastType;
	visible: boolean;
}

interface ToastContextValue {
	showToast: (message: string, type?: ToastType, durationMs?: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
	const [toast, setToast] = useState<ToastState>({ message: '', type: 'success', visible: false });
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

	const showToast = useCallback((message: string, type: ToastType = 'success', durationMs = 3500) => {
		setToast({ message, type, visible: true });
		if (timer.current) {
			clearTimeout(timer.current);
		}
		timer.current = setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), durationMs);
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
				{toast.message}
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
