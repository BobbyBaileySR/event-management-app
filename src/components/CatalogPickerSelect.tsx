import { useEffect, useId, useRef, useState } from 'react';
import styles from './CatalogPickers.module.css';

export interface PickerOption {
	value: string;
	label: string;
}

interface CatalogPickerSelectProps {
	id: string;
	label: string;
	value: string;
	placeholder: string;
	options: PickerOption[];
	disabled?: boolean;
	className?: string;
	testId?: string;
	onChange: (value: string) => void;
}

export function CatalogPickerSelect({
	id,
	label,
	value,
	placeholder,
	options,
	disabled = false,
	className,
	testId,
	onChange,
}: CatalogPickerSelectProps) {
	const listboxId = useId();
	const containerRef = useRef<HTMLDivElement>(null);
	const [open, setOpen] = useState(false);

	useEffect(() => {
		if (!open) {
			return;
		}

		function handlePointerDown(event: MouseEvent | TouchEvent) {
			const target = event.target;
			if (!(target instanceof Node) || !containerRef.current?.contains(target)) {
				setOpen(false);
			}
		}

		function handleEscape(event: KeyboardEvent) {
			if (event.key === 'Escape') {
				setOpen(false);
			}
		}

		document.addEventListener('mousedown', handlePointerDown);
		document.addEventListener('touchstart', handlePointerDown);
		document.addEventListener('keydown', handleEscape);

		return () => {
			document.removeEventListener('mousedown', handlePointerDown);
			document.removeEventListener('touchstart', handlePointerDown);
			document.removeEventListener('keydown', handleEscape);
		};
	}, [open]);

	const selectedLabel = options.find((option) => option.value === value)?.label ?? placeholder;

	function chooseOption(nextValue: string) {
		onChange(nextValue);
		setOpen(false);
	}

	return (
		<div className={`${styles.field} ${className ?? ''}`.trim()} ref={containerRef}>
			<label htmlFor={id} id={`${id}-label`} className={styles.fieldLabel}>
				{label}
			</label>
			<div className={styles.selectWrap}>
				<button
					type="button"
					id={id}
					className={styles.selectTrigger}
					data-testid={testId}
					aria-haspopup="listbox"
					aria-expanded={open}
					aria-label={`${label}: ${selectedLabel}`}
					disabled={disabled}
					onClick={() => setOpen((current) => !current)}
				>
					{selectedLabel}
				</button>
				{open ? (
					<ul id={listboxId} className={styles.selectMenu} role="listbox" aria-labelledby={`${id}-label`}>
						{options.map((option) => (
							<li key={option.value || '__empty__'} role="none">
								<button
									type="button"
									role="option"
									className={styles.selectOption}
									aria-selected={value === option.value}
									onClick={() => chooseOption(option.value)}
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
