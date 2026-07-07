import { describe, expect, it } from 'vitest';
import { getCapacityTier, getFillPercent, getOccupancyPercent } from './capacityTier';

describe('capacityTier', () => {
	it('returns normal below 75%', () => {
		expect(getOccupancyPercent(74, 100)).toBe(74);
		expect(getCapacityTier(74, 100)).toBe('normal');
	});

	it('returns caution at 75% and below 90%', () => {
		expect(getCapacityTier(75, 100)).toBe('caution');
		expect(getCapacityTier(89, 100)).toBe('caution');
	});

	it('returns critical at 90% through 100%', () => {
		expect(getCapacityTier(90, 100)).toBe('critical');
		expect(getCapacityTier(100, 100)).toBe('critical');
	});

	it('returns over above 100%', () => {
		expect(getCapacityTier(101, 100)).toBe('over');
		expect(getOccupancyPercent(101, 100)).toBe(101);
		expect(getFillPercent(101, 100)).toBe(100);
	});
});
