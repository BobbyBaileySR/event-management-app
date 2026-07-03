import styles from './CapacityBar.module.css';

interface CapacityBarProps {
	value: number;
	capacity: number;
}

export function CapacityBar({ value, capacity }: CapacityBarProps) {
	const pct = capacity > 0 ? Math.min(100, Math.round((value / capacity) * 100)) : 0;

	return (
		<div className={styles.bar}>
			<div className={styles.labels}>
				<span>{value} / {capacity} registered</span>
				<span>{pct}%</span>
			</div>
			<div className={styles.track}>
				<div className={styles.fill} style={{ width: `${pct}%` }} />
			</div>
		</div>
	);
}
