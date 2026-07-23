import { useRef, type ReactNode } from 'react';
import { useModalFocusTrap } from '../hooks/useModalFocusTrap';
import styles from './NavDrawer.module.css';

interface NavDrawerProps {
	onClose: () => void;
	children: ReactNode;
}

const TITLE_ID = 'nav-drawer-title';

/**
 * Tablet (768-1023px) slide-out nav drawer — opened from `IconRail`'s hamburger button,
 * wraps `Sidebar variant="drawer"` (same full nav content as the desktop shell). Only
 * mounted while open, so the drawer's `Sidebar`/`WorkingEventPicker` don't run a second time
 * in the background; CSS still force-hides it outside 768-1023px as a belt-and-braces guard
 * against a resize happening while it's open.
 */
export function NavDrawer({ onClose, children }: NavDrawerProps) {
	const panelRef = useRef<HTMLDivElement>(null);

	useModalFocusTrap({
		open: true,
		containerRef: panelRef,
		onEscape: onClose,
	});

	return (
		<div
			className={styles.backdrop}
			role="presentation"
			onClick={(event) => {
				if (event.target === event.currentTarget) {
					onClose();
				}
			}}
		>
			<div ref={panelRef} className={styles.panel} role="dialog" aria-modal="true" aria-labelledby={TITLE_ID}>
				<span id={TITLE_ID} className="sr-only">
					Navigation menu
				</span>
				<button type="button" className={styles.close} onClick={onClose} aria-label="Close navigation menu">
					<span aria-hidden="true">×</span>
				</button>
				<div className={styles.panelBody}>{children}</div>
			</div>
		</div>
	);
}
