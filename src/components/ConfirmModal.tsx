import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { useModalFocusTrap } from '../hooks/useModalFocusTrap';

export interface ConfirmOptions {
	title: string;
	message: string;
	confirmLabel?: string;
	cancelLabel?: string;
}

interface ConfirmContextValue {
	confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

/** Promise-based confirmation dialog (replaces vanilla `confirmModal`). */
export function ConfirmProvider({ children }: { children: ReactNode }) {
	const [open, setOpen] = useState(false);
	const [options, setOptions] = useState<ConfirmOptions>({ title: '', message: '' });
	const resolveRef = useRef<((value: boolean) => void) | null>(null);
	const dialogRef = useRef<HTMLDivElement>(null);
	const titleId = 'confirm-modal-title';

	const close = useCallback((result: boolean) => {
		setOpen(false);
		resolveRef.current?.(result);
		resolveRef.current = null;
	}, []);

	useModalFocusTrap({
		open,
		containerRef: dialogRef,
		onEscape: () => close(false),
	});

	const confirm = useCallback((opts: ConfirmOptions) => {
		return new Promise<boolean>((resolve) => {
			setOptions(opts);
			resolveRef.current = resolve;
			setOpen(true);
		});
	}, []);

	const value = useMemo(() => ({ confirm }), [confirm]);

	return (
		<ConfirmContext.Provider value={value}>
			{children}
			{open ? (
				<div
					className="modal-overlay"
					role="presentation"
					onClick={(event) => {
						if (event.target === event.currentTarget) {
							close(false);
						}
					}}
				>
					<div
						ref={dialogRef}
						className="modal"
						role="dialog"
						aria-modal="true"
						aria-labelledby={titleId}
						onClick={(event) => event.stopPropagation()}
					>
						<h3 id={titleId}>{options.title}</h3>
						<p>{options.message}</p>
						<div className="modal__actions">
							<button type="button" className="btn btn-outline" onClick={() => close(false)}>
								{options.cancelLabel ?? 'Cancel'}
							</button>
							<button type="button" className="btn btn-primary" onClick={() => close(true)}>
								{options.confirmLabel ?? 'Confirm'}
							</button>
						</div>
					</div>
				</div>
			) : null}
		</ConfirmContext.Provider>
	);
}

export function useConfirm(): ConfirmContextValue {
	const context = useContext(ConfirmContext);
	if (!context) {
		throw new Error('useConfirm must be used within ConfirmProvider');
	}
	return context;
}
