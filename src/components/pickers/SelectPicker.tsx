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
	className?: string;
	/** Extra class on the trigger button (e.g. clock icon for TimePicker). */
	triggerClassName?: string;
	testId?: string;
	onChange: (value: string) => void;
}

/**
 * Accessible listbox popover extending the `CatalogPickerSelect` pattern (research R-004):
 * button trigger + `role="listbox"` menu, keyboard arrow/Home/End navigation via
 * `aria-activedescendant`, Enter/Space to select, Escape to close and return focus to the
 * trigger, outside-click to dismiss.
 */
export function SelectPicker({
	id,
	label,
	value,
	placeholder,
	options,
	disabled = false,
	className,
	triggerClassName,
	testId,
	onChange,
}: SelectPickerProps) {
	const listboxId = useId();
	const containerRef = useRef<HTMLDivElement>(null);
	const triggerRef = useRef<HTMLButtonElement>(null);
	const listboxRef = useRef<HTMLUListElement>(null);
	const [open, setOpen] = useState(false);
	const [activeIndex, setActiveIndex] = useState(0);

	const selectedIndex = options.findIndex((option) => option.value === value);
	const selectedLabel = selectedIndex >= 0 ? options[selectedIndex].label : placeholder;

	function openMenu() {
		if (disabled || options.length === 0) {
			return;
		}
		setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
		setOpen(true);
	}

	function closeMenu(returnFocus: boolean) {
		setOpen(false);
		if (returnFocus) {
			triggerRef.current?.focus();
		}
	}

	function chooseOption(index: number) {
		const option = options[index];
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
		listboxRef.current?.focus();

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

	function handleListboxKeyDown(event: KeyboardEvent<HTMLUListElement>) {
		switch (event.key) {
			case 'ArrowDown':
				event.preventDefault();
				setActiveIndex((current) => Math.min(current + 1, options.length - 1));
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
				setActiveIndex(options.length - 1);
				break;
			case 'Enter':
			case ' ':
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
			<label htmlFor={id} id={`${id}-label`} className={styles.fieldLabel}>
				{label}
			</label>
			<div className={styles.wrap}>
				<button
					ref={triggerRef}
					type="button"
					id={id}
					className={`${styles.trigger} ${triggerClassName ?? ''}`.trim()}
					data-testid={testId}
					aria-haspopup="listbox"
					aria-expanded={open}
					aria-label={`${label}: ${selectedLabel}`}
					disabled={disabled}
					onClick={() => (open ? closeMenu(true) : openMenu())}
				>
					{selectedLabel}
				</button>
				{open ? (
					<ul
						ref={listboxRef}
						id={listboxId}
						className={styles.menu}
						role="listbox"
						tabIndex={0}
						aria-labelledby={`${id}-label`}
						aria-activedescendant={options[activeIndex] ? `${id}-option-${activeIndex}` : undefined}
						onKeyDown={handleListboxKeyDown}
					>
						{options.map((option, index) => (
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
						))}
					</ul>
				) : null}
			</div>
		</div>
	);
}
