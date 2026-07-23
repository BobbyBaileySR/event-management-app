import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCatalog } from '../data/hooks/useCatalog';
import { eventPath } from '../router/navigation';
import { catalogEventToPortfolio, type PortfolioEvent } from '../utils/catalogEventPresentation';
import styles from './WorkingEventPicker.module.css';

interface WorkingEventPickerProps {
	/** Name of the event currently open (event-scoped route), or null when none is selected. */
	currentEventName?: string | null;
}

/**
 * Sidebar control (007 redesign T046) for jumping straight into any event's Event Details.
 * Shares the cached catalog query (`useCatalog`) with `AppLayout`'s own event-name lookup and
 * the session-lifecycle prefetch, instead of firing its own independent raw fetch — previously
 * every sign-in triggered up to three separate uncached `/catalog` calls at once.
 */
export function WorkingEventPicker({ currentEventName }: WorkingEventPickerProps) {
	const navigate = useNavigate();
	const { data: catalog, isLoading } = useCatalog();
	const containerRef = useRef<HTMLDivElement>(null);
	const searchRef = useRef<HTMLInputElement>(null);
	const triggerRef = useRef<HTMLButtonElement>(null);
	const [open, setOpen] = useState(false);
	const [search, setSearch] = useState('');

	// Capacity fan-out is skipped here for speed — the picker only needs names. Failed/absent
	// fetch degrades to an empty list ("No events found.") rather than throwing.
	const events: PortfolioEvent[] = catalog
		? catalog.events.map((event) => catalogEventToPortfolio(event, catalog.programs))
		: [];

	function closeMenu(returnFocus: boolean) {
		setOpen(false);
		setSearch('');
		if (returnFocus) {
			triggerRef.current?.focus();
		}
	}

	useEffect(() => {
		if (!open) {
			return;
		}
		searchRef.current?.focus();

		function handlePointerDown(event: MouseEvent | TouchEvent) {
			const target = event.target;
			if (!(target instanceof Node) || !containerRef.current?.contains(target)) {
				closeMenu(false);
			}
		}

		document.addEventListener('mousedown', handlePointerDown);
		document.addEventListener('touchstart', handlePointerDown);
		return () => {
			document.removeEventListener('mousedown', handlePointerDown);
			document.removeEventListener('touchstart', handlePointerDown);
		};
	}, [open]);

	const needle = search.trim().toLowerCase();
	const matches = needle ? events.filter((event) => event.name.toLowerCase().includes(needle)) : events;

	return (
		<div className={styles.field} ref={containerRef}>
			<p className={styles.label} id="working-event-picker-label">
				Working event
			</p>
			<div className={styles.wrap}>
				<button
					ref={triggerRef}
					type="button"
					className={styles.trigger}
					aria-haspopup="true"
					aria-expanded={open}
					aria-busy={isLoading}
					aria-labelledby="working-event-picker-label working-event-picker-value"
					onClick={() => (open ? closeMenu(true) : setOpen(true))}
				>
					<span id="working-event-picker-value" className={styles.triggerLabel}>
						{currentEventName ?? 'Select an event'}
					</span>
					{isLoading ? <span className={styles.spinner} aria-hidden="true" /> : null}
					<span className={styles.chevron} aria-hidden="true">
						▾
					</span>
				</button>
				{open ? (
					<div className={styles.menu}>
						<input
							ref={searchRef}
							type="text"
							className={styles.search}
							aria-label="Search events"
							placeholder="Type to search events…"
							value={search}
							onChange={(event) => setSearch(event.target.value)}
							onKeyDown={(event) => {
								if (event.key === 'Escape') {
									event.preventDefault();
									event.stopPropagation();
									closeMenu(true);
								}
							}}
						/>
						<ul className={styles.matches}>
							{isLoading ? (
								<li className={styles.empty}>Loading events…</li>
							) : matches.length === 0 ? (
								<li className={styles.empty}>No events found.</li>
							) : (
								matches.map((event) => (
									<li key={event.id}>
										<button
											type="button"
											className={styles.match}
											onClick={() => {
												navigate(eventPath(event.id));
												closeMenu(true);
											}}
										>
											{event.name}
										</button>
									</li>
								))
							)}
						</ul>
					</div>
				) : null}
			</div>
		</div>
	);
}
