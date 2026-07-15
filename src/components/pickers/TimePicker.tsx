import { useMemo } from 'react';
import { SelectPicker } from './SelectPicker';
import styles from './Pickers.module.css';

interface TimePickerProps {
	id: string;
	label: string;
	/** 24h `HH:MM`, or '' for no selection. */
	value: string;
	placeholder?: string;
	disabled?: boolean;
	className?: string;
	testId?: string;
	/** Minute increment between options. */
	stepMinutes?: number;
	onChange: (value: string) => void;
}

function formatTimeLabel(hour: number, minute: number): string {
	const period = hour < 12 ? 'AM' : 'PM';
	const displayHour = hour % 12 === 0 ? 12 : hour % 12;
	return `${displayHour}:${String(minute).padStart(2, '0')} ${period}`;
}

function buildTimeOptions(stepMinutes: number) {
	const options = [];
	for (let totalMinutes = 0; totalMinutes < 24 * 60; totalMinutes += stepMinutes) {
		const hour = Math.floor(totalMinutes / 60);
		const minute = totalMinutes % 60;
		const value = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
		options.push({ value, label: formatTimeLabel(hour, minute) });
	}
	return options;
}

/** Accessible time-of-day picker — a `SelectPicker` over generated `HH:MM` options (research R-004). */
export function TimePicker({
	id,
	label,
	value,
	placeholder = 'Select time…',
	disabled = false,
	className,
	testId,
	stepMinutes = 15,
	onChange,
}: TimePickerProps) {
	const options = useMemo(() => buildTimeOptions(stepMinutes), [stepMinutes]);

	return (
		<SelectPicker
			id={id}
			label={label}
			value={value}
			placeholder={placeholder}
			options={options}
			disabled={disabled}
			className={className}
			triggerClassName={styles.triggerTime}
			testId={testId}
			onChange={onChange}
		/>
	);
}
