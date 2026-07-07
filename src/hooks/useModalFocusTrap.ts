import { type RefObject, useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR =
	'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

function getFocusableElements(container: HTMLElement): HTMLElement[] {
	return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
		(element) => !element.hasAttribute('disabled') && element.tabIndex !== -1,
	);
}

export interface ModalFocusTrapOptions {
	open: boolean;
	containerRef: RefObject<HTMLElement | null>;
	onEscape: () => void;
}

/** Tab cycle, Escape dismiss, and return focus to the element that opened the modal. */
export function useModalFocusTrap({ open, containerRef, onEscape }: ModalFocusTrapOptions): void {
	const returnFocusRef = useRef<Element | null>(null);

	useEffect(() => {
		if (!open) {
			return;
		}

		returnFocusRef.current = document.activeElement;

		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === 'Escape') {
				event.preventDefault();
				onEscape();
				return;
			}

			if (event.key !== 'Tab' || !containerRef.current) {
				return;
			}

			const focusable = getFocusableElements(containerRef.current);
			if (focusable.length === 0) {
				return;
			}

			const first = focusable[0];
			const last = focusable[focusable.length - 1];

			if (event.shiftKey && document.activeElement === first) {
				event.preventDefault();
				last.focus();
			} else if (!event.shiftKey && document.activeElement === last) {
				event.preventDefault();
				first.focus();
			}
		}

		document.addEventListener('keydown', handleKeyDown);

		return () => {
			document.removeEventListener('keydown', handleKeyDown);
			if (returnFocusRef.current instanceof HTMLElement) {
				returnFocusRef.current.focus();
			}
		};
	}, [containerRef, onEscape, open]);
}
