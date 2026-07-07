export type CapacityTier = 'normal' | 'caution' | 'critical' | 'over';

export function getOccupancyPercent(live: number, capacity: number): number {
	if (capacity <= 0) {
		return 0;
	}
	return Math.round((live / capacity) * 100);
}

export function getFillPercent(live: number, capacity: number): number {
	return Math.min(100, getOccupancyPercent(live, capacity));
}

export function getCapacityTier(live: number, capacity: number): CapacityTier {
	const pct = getOccupancyPercent(live, capacity);
	if (pct > 100) {
		return 'over';
	}
	if (pct >= 90) {
		return 'critical';
	}
	if (pct >= 75) {
		return 'caution';
	}
	return 'normal';
}
