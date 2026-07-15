import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDataService } from '../hooks/useDataService';
import { eventPath } from '../router/navigation';
import { catalogEventToPortfolio, type PortfolioEvent } from '../utils/catalogEventPresentation';
import styles from './WorkingEventPicker.module.css';

interface WorkingEventPickerProps {
	/** Name of the event currently open (event-scoped route), or null when none is selected. */
	currentEventName?: string | null;
}

/** Sidebar control (007 redesign T046) for jumping straight into any event's Event Details. */
export function WorkingEventPicker({ currentEventName }: WorkingEventPickerProps) {
	const navigate = useNavigate();
	const data = useDataService();
	const containerRef = useRef<HTMLDivElement>(null);
	const searchRef = useRef<HTMLInputElement>(null);
	const triggerRef = useRef<HTMLButtonElement>(null);
	const [open, setOpen] = useState(false);
	const [search, setSearch] = useState('');
	const [events, setEvents] = useState<PortfolioEvent[]>([]);
	const [loaded, setLoaded] = useState(false);

	useEffect(() => {
		let cancelled = false;
		data
			.fetchCatalog()
			.then(({ events: loadedEvents, programs }) => {
				if (!cancelled) {
					// Capacity fan-out is skipped here for speed — the picker only needs names.
					setEvents(loadedEvents.map((event) => catalogEventToPortfolio(event, programs)));
				}
			})
			.catch(() => {
				// Picker degrades to "no events found" — the trigger and rest of the shell stay usable.
			})
			.finally(() => {
				if (!cancelled) {
					setLoaded(true);
				}
			});
		return () => {
			cancelled = true;
		};
	}, []);

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
					aria-labelledby="working-event-picker-label working-event-picker-value"
					onClick={() => (open ? closeMenu(true) : setOpen(true))}
				>
					<span id="working-event-picker-value" className={styles.triggerLabel}>
						{currentEventName ?? 'Select an event'}
					</span>
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
							{!loaded ? (
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
