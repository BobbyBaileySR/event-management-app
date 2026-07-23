import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import styles from './Pickers.module.css';

export interface SelectPickerOption {
	value: string;
	label: string;
}

interface SelectPickerProps {
	id: string;
	label: string;
	value: string;
	placeholder: string;
	options: SelectPickerOption[];
	disabled?: boolean;
	/** Shows a red `*` next to the label — the field's own validation still enforces it. */
	required?: boolean;
	className?: string;
	/** Extra class on the trigger button (e.g. clock icon for TimePicker). */
	triggerClassName?: string;
	testId?: string;
	onChange: (value: string) => void;
}

/**
 * Accessible listbox popover (research R-004): button trigger + `role="listbox"` menu,
 * keyboard arrow/Home/End navigation via `aria-activedescendant`, Enter/Space to select,
 * Escape to close and return focus to the trigger, outside-click to dismiss.
 *
 * The single select-popover used across the app — the earlier, keyboard-inaccessible
 * `CatalogPickerSelect` was collapsed into this one (architecture review candidate 7).
 * Opening it focuses a search box (pattern borrowed from `WorkingEventPicker`) that
 * filters the option list by label substring, so keyboard nav below operates on
 * `filteredOptions`, not the full `options` list.
 */
export function SelectPicker({
	id,
	label,
	value,
	placeholder,
	options,
	disabled = false,
	required = false,
	className,
	triggerClassName,
	testId,
	onChange,
}: SelectPickerProps) {
	const listboxId = useId();
	const containerRef = useRef<HTMLDivElement>(null);
	const triggerRef = useRef<HTMLButtonElement>(null);
	const searchRef = useRef<HTMLInputElement>(null);
	const [open, setOpen] = useState(false);
	const [search, setSearch] = useState('');
	const [activeIndex, setActiveIndex] = useState(0);

	const selectedIndex = options.findIndex((option) => option.value === value);
	const selectedLabel = selectedIndex >= 0 ? options[selectedIndex].label : placeholder;

	const needle = search.trim().toLowerCase();
	const filteredOptions = needle
		? options.filter((option) => option.label.toLowerCase().includes(needle))
		: options;

	function openMenu() {
		if (disabled || options.length === 0) {
			return;
		}
		setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
		setOpen(true);
	}

	function closeMenu(returnFocus: boolean) {
		setOpen(false);
		setSearch('');
		if (returnFocus) {
			triggerRef.current?.focus();
		}
	}

	function chooseOption(index: number) {
		const option = filteredOptions[index];
		if (!option) {
			return;
		}
		onChange(option.value);
		closeMenu(true);
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

	// Filtering can shrink the list out from under the current active index.
	useEffect(() => {
		setActiveIndex((current) => Math.min(current, Math.max(filteredOptions.length - 1, 0)));
	}, [filteredOptions.length]);

	function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
		switch (event.key) {
			case 'ArrowDown':
				event.preventDefault();
				setActiveIndex((current) => Math.min(current + 1, filteredOptions.length - 1));
				break;
			case 'ArrowUp':
				event.preventDefault();
				setActiveIndex((current) => Math.max(current - 1, 0));
				break;
			case 'Home':
				event.preventDefault();
				setActiveIndex(0);
				break;
			case 'End':
				event.preventDefault();
				setActiveIndex(filteredOptions.length - 1);
				break;
			case 'Enter':
				event.preventDefault();
				chooseOption(activeIndex);
				break;
			case 'Escape':
				event.preventDefault();
				// Don't let this bubble to a document-level Escape handler (e.g. a parent
				// modal's focus trap) — Escape should close the popover, not the modal.
				event.stopPropagation();
				closeMenu(true);
				break;
			case 'Tab':
				closeMenu(false);
				break;
			default:
				break;
		}
	}

	return (
		<div className={`${styles.field} ${className ?? ''}`.trim()} ref={containerRef}>
			{/* Marker is a sibling of <label>, not nested inside it — see the matching comment
			    in CalendarPicker.tsx. */}
			<span className={styles.labelRow}>
				<label htmlFor={id} id={`${id}-label`} className={styles.fieldLabel}>
					{label}
				</label>
				{required ? (
					<span className="required-mark" aria-hidden="true">
						{' '}
						*
					</span>
				) : null}
			</span>
			<div className={styles.wrap}>
				<button
					ref={triggerRef}
					type="button"
					id={id}
					className={`${styles.trigger} ${triggerClassName ?? ''}`.trim()}
					data-testid={testId}
					aria-haspopup="listbox"
					aria-expanded={open}
					aria-required={required || undefined}
					aria-label={`${label}: ${selectedLabel}`}
					disabled={disabled}
					onClick={() => (open ? closeMenu(true) : openMenu())}
				>
					{selectedLabel}
				</button>
				{open ? (
					<div className={styles.menu}>
						<input
							ref={searchRef}
							type="text"
							className={styles.search}
							aria-label={`Search ${label}`}
							aria-controls={listboxId}
							aria-activedescendant={
								filteredOptions[activeIndex] ? `${id}-option-${activeIndex}` : undefined
							}
							placeholder="Type to filter…"
							value={search}
							onChange={(event) => setSearch(event.target.value)}
							onKeyDown={handleSearchKeyDown}
						/>
						<ul
							id={listboxId}
							className={styles.optionsList}
							role="listbox"
							aria-labelledby={`${id}-label`}
						>
							{filteredOptions.length === 0 ? (
								<li className={styles.empty}>No options found.</li>
							) : (
								filteredOptions.map((option, index) => (
									<li key={option.value || '__empty__'} role="none">
										<button
											type="button"
											id={`${id}-option-${index}`}
											role="option"
											tabIndex={-1}
											className={`${styles.option} ${index === activeIndex ? styles.optionActive : ''}`.trim()}
											aria-selected={value === option.value}
											onMouseEnter={() => setActiveIndex(index)}
											onClick={() => chooseOption(index)}
										>
											{option.label}
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
