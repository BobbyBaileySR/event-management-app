import type { AdjustCapacityDirection } from '../types';
import { getCapacityTier, getFillPercent, getOccupancyPercent, type CapacityTier } from '../utils/capacityTier';
import styles from './CapacityBar.module.css';

interface CapacityBarProps {
	value: number;
	capacity: number;
	variant?: 'registered' | 'live';
	tier?: CapacityTier;
	checkedInCount?: number;
	onAdjust?: (direction: AdjustCapacityDirection) => void;
	adjusting?: boolean;
	/** Net manual +/-1 corrections applied so far (live variant only) — display only, no reset action yet (FE-REDESIGN-017). */
	manualAdjustmentCount?: number;
}

const TIER_LABELS: Record<CapacityTier, string | null> = {
	normal: null,
	caution: 'Approaching capacity',
	critical: 'Nearly full',
	over: 'At or over capacity',
};

export function CapacityBar({
	value,
	capacity,
	variant = 'registered',
	tier,
	checkedInCount,
	onAdjust,
	adjusting = false,
	manualAdjustmentCount,
}: CapacityBarProps) {
	const resolvedTier = tier ?? (variant === 'live' ? getCapacityTier(value, capacity) : 'normal');
	const pct = variant === 'live' ? getOccupancyPercent(value, capacity) : capacity > 0 ? Math.min(100, Math.round((value / capacity) * 100)) : 0;
	const fillPct = variant === 'live' ? getFillPercent(value, capacity) : pct;
	const unitLabel = variant === 'live' ? 'on site' : 'registered';
	const tierLabel = variant === 'live' ? TIER_LABELS[resolvedTier] : null;
	const showControls = variant === 'live' && onAdjust && checkedInCount !== undefined;
	const disableDown = value <= 0 || adjusting;
	const disableUp = checkedInCount !== undefined && value >= checkedInCount;
	const isLive = variant === 'live';
	const remaining = Math.max(0, capacity - value);

	return (
		<div
			className={`${styles.bar} ${isLive ? styles.live : ''} ${isLive ? styles[`tier-${resolvedTier}`] : ''}`}
			aria-label={isLive ? `Live capacity: ${value} of ${capacity} on site, ${pct} percent full` : undefined}
		>
			{isLive ? (
				<>
					<p className={styles.liveLabel}>Live capacity</p>
					<div className={styles.liveHeader}>
						<div className={styles.liveCountBlock}>
							<p className={styles.liveCount}>
								<span className={styles.liveValue}>{value}</span>
								<span className={styles.liveMeta}> / {capacity}</span>
							</p>
							{manualAdjustmentCount ? (
								<p className={styles.adjustmentNote}>Includes manual adjustment of {manualAdjustmentCount}</p>
							) : null}
						</div>
						{showControls ? (
							<div className={styles.controls} aria-label="Live attendance adjustment">
								<button
									type="button"
									className={styles.adjustBtn}
									disabled={disableDown}
									onClick={() => onAdjust('down')}
									aria-label="Record one departure"
								>
									−
								</button>
								<div className={styles.adjustHint}>
									<p>Adjust count</p>
									<p>for walk-outs</p>
								</div>
								<button
									type="button"
									className={styles.adjustBtn}
									disabled={disableUp}
									onClick={() => onAdjust('up')}
									aria-label="Correct one departure"
								>
									+
								</button>
							</div>
						) : null}
					</div>
					{tierLabel ? <p className={styles.tierLabel}>{tierLabel}</p> : null}
				</>
			) : (
				<div className={styles.header}>
					<div className={styles.labels}>
						<span>
							{value} / {capacity} {unitLabel}
						</span>
						<span>{pct}%</span>
					</div>
				</div>
			)}
			<div className={styles.track}>
				<div className={styles.fill} style={{ width: `${fillPct}%` }} />
			</div>
			{!isLive ? <p className={styles.remaining}>{remaining} spots remaining</p> : null}
		</div>
	);
}
