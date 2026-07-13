import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import styles from './Pickers.module.css';

interface CalendarPickerProps {
	id: string;
	label: string;
	/** ISO `YYYY-MM-DD`, or '' for no selection. */
	value: string;
	placeholder?: string;
	disabled?: boolean;
	className?: string;
	testId?: string;
	onChange: (value: string) => void;
}

const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTH_LABELS = [
	'January', 'February', 'March', 'April', 'May', 'June',
	'July', 'August', 'September', 'October', 'November', 'December',
];

function formatISODate(date: Date): string {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function parseISODate(value: string): Date | null {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
	if (!match) {
		return null;
	}
	const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
	return Number.isNaN(date.getTime()) ? null : date;
}

function isSameDay(a: Date, b: Date): boolean {
	return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function buildMonthGrid(viewYear: number, viewMonth: number): Date[] {
	const firstOfMonth = new Date(viewYear, viewMonth, 1);
	const gridStart = new Date(viewYear, viewMonth, 1 - firstOfMonth.getDay());
	return Array.from({ length: 42 }, (_, index) => new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index));
}

/**
 * Accessible month-grid date picker (research R-004): button trigger + popover calendar,
 * arrow-key day navigation, Enter/Space to select, Escape to close and return focus to the
 * trigger, outside-click to dismiss.
 */
export function CalendarPicker({ id, label, value, placeholder = 'Select date…', disabled = false, className, testId, onChange }: CalendarPickerProps) {
	const dialogId = useId();
	const containerRef = useRef<HTMLDivElement>(null);
	const triggerRef = useRef<HTMLButtonElement>(null);
	const gridRef = useRef<HTMLDivElement>(null);
	const [open, setOpen] = useState(false);

	const selectedDate = parseISODate(value);
	const today = new Date();
	const [activeDate, setActiveDate] = useState(selectedDate ?? today);

	function openCalendar() {
		if (disabled) {
			return;
		}
		setActiveDate(selectedDate ?? today);
		setOpen(true);
	}

	function closeCalendar(returnFocus: boolean) {
		setOpen(false);
		if (returnFocus) {
			triggerRef.current?.focus();
		}
	}

	function chooseDate(date: Date) {
		onChange(formatISODate(date));
		closeCalendar(true);
	}

	useEffect(() => {
		if (!open) {
			return;
		}
		gridRef.current?.focus();

		function handlePointerDown(event: MouseEvent | TouchEvent) {
			const target = event.target;
			if (!(target instanceof Node) || !containerRef.current?.contains(target)) {
				closeCalendar(false);
			}
		}

		document.addEventListener('mousedown', handlePointerDown);
		document.addEventListener('touchstart', handlePointerDown);

		return () => {
			document.removeEventListener('mousedown', handlePointerDown);
			document.removeEventListener('touchstart', handlePointerDown);
		};
	}, [open]);

	function moveActiveDate(deltaDays: number) {
		setActiveDate((current) => new Date(current.getFullYear(), current.getMonth(), current.getDate() + deltaDays));
	}

	function handleGridKeyDown(event: KeyboardEvent<HTMLDivElement>) {
		switch (event.key) {
			case 'ArrowRight':
				event.preventDefault();
				moveActiveDate(1);
				break;
			case 'ArrowLeft':
				event.preventDefault();
				moveActiveDate(-1);
				break;
			case 'ArrowDown':
				event.preventDefault();
				moveActiveDate(7);
				break;
			case 'ArrowUp':
				event.preventDefault();
				moveActiveDate(-7);
				break;
			case 'PageUp':
				event.preventDefault();
				setActiveDate((current) => new Date(current.getFullYear(), current.getMonth() - 1, current.getDate()));
				break;
			case 'PageDown':
				event.preventDefault();
				setActiveDate((current) => new Date(current.getFullYear(), current.getMonth() + 1, current.getDate()));
				break;
			case 'Home':
				event.preventDefault();
				setActiveDate((current) => new Date(current.getFullYear(), current.getMonth(), current.getDate() - current.getDay()));
				break;
			case 'End':
				event.preventDefault();
				setActiveDate((current) => new Date(current.getFullYear(), current.getMonth(), current.getDate() + (6 - current.getDay())));
				break;
			case 'Enter':
			case ' ':
				event.preventDefault();
				chooseDate(activeDate);
				break;
			case 'Escape':
				event.preventDefault();
				closeCalendar(true);
				break;
			case 'Tab':
				closeCalendar(false);
				break;
			default:
				break;
		}
	}

	const gridDays = buildMonthGrid(activeDate.getFullYear(), activeDate.getMonth());
	const activeCellId = `${id}-day-${formatISODate(activeDate)}`;

	return (
		<div className={`${styles.field} ${className ?? ''}`.trim()} ref={containerRef}>
			<label htmlFor={id} id={`${id}-label`} className={styles.fieldLabel}>
				{label}
			</label>
			<div className={styles.wrap}>
				<button
					ref={triggerRef}
					type="button"
					id={id}
					className={styles.trigger}
					data-testid={testId}
					aria-haspopup="dialog"
					aria-expanded={open}
					aria-label={`${label}: ${selectedDate ? formatISODate(selectedDate) : placeholder}`}
					disabled={disabled}
					onClick={() => (open ? closeCalendar(true) : openCalendar())}
				>
					{selectedDate ? formatISODate(selectedDate) : placeholder}
				</button>
				{open ? (
					<div id={dialogId} role="dialog" aria-modal="true" aria-labelledby={`${id}-label`} className={styles.menu}>
						<div className={styles.calendarHeader}>
							<button
								type="button"
								className={styles.calendarNavBtn}
								aria-label="Previous month"
								tabIndex={-1}
								onClick={() => setActiveDate((current) => new Date(current.getFullYear(), current.getMonth() - 1, current.getDate()))}
							>
								‹
							</button>
							<span className={styles.calendarMonthLabel}>
								{MONTH_LABELS[activeDate.getMonth()]} {activeDate.getFullYear()}
							</span>
							<button
								type="button"
								className={styles.calendarNavBtn}
								aria-label="Next month"
								tabIndex={-1}
								onClick={() => setActiveDate((current) => new Date(current.getFullYear(), current.getMonth() + 1, current.getDate()))}
							>
								›
							</button>
						</div>
						<div
							ref={gridRef}
							role="grid"
							tabIndex={0}
							aria-activedescendant={activeCellId}
							className={styles.calendarGrid}
							onKeyDown={handleGridKeyDown}
						>
							{WEEKDAY_LABELS.map((weekday) => (
								<span key={weekday} className={styles.calendarDayHeading} aria-hidden="true">
									{weekday}
								</span>
							))}
							{gridDays.map((day) => {
								const isOutsideMonth = day.getMonth() !== activeDate.getMonth();
								const isActive = isSameDay(day, activeDate);
								const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
								return (
									<button
										key={formatISODate(day)}
										type="button"
										id={`${id}-day-${formatISODate(day)}`}
										role="gridcell"
										tabIndex={-1}
										aria-selected={isSelected}
										className={`${styles.calendarDay} ${isOutsideMonth ? styles.calendarDayOutside : ''} ${isActive ? styles.optionActive : ''}`.trim()}
										onClick={() => chooseDate(day)}
									>
										{day.getDate()}
									</button>
								);
							})}
						</div>
					</div>
				) : null}
			</div>
		</div>
	);
}
