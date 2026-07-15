import { describe, expect, it } from 'vitest';
import { deriveEventLifecycleStatus, isPastEndDate } from './catalogMetadata';

const NOW = new Date('2026-07-14T12:00:00Z');

describe('isPastEndDate', () => {
	it('returns false when there is no end date', () => {
		expect(isPastEndDate(undefined, NOW)).toBe(false);
		expect(isPastEndDate(null, NOW)).toBe(false);
	});

	it('returns false for an unparseable end date', () => {
		expect(isPastEndDate('not-a-date', NOW)).toBe(false);
	});

	it('returns false when the end date is in the future', () => {
		expect(isPastEndDate('2026-07-15T00:00:00Z', NOW)).toBe(false);
	});

	it('returns false when the end date is exactly now', () => {
		expect(isPastEndDate(NOW.toISOString(), NOW)).toBe(false);
	});

	it('returns true when the end date is in the past', () => {
		expect(isPastEndDate('2026-07-01T00:00:00Z', NOW)).toBe(true);
	});
});

describe('deriveEventLifecycleStatus', () => {
	it('returns Active for a manually-Active event whose end date has not passed', () => {
		expect(
			deriveEventLifecycleStatus({ manualStatus: 'Active', endDate: '2026-07-20T00:00:00Z' }, NOW),
		).toBe('Active');
	});

	it('returns Active for a manually-Active event with no end date', () => {
		expect(deriveEventLifecycleStatus({ manualStatus: 'Active', endDate: undefined }, NOW)).toBe('Active');
	});

	it('auto-derives Completed once a manually-Active event\'s end date has passed', () => {
		expect(
			deriveEventLifecycleStatus({ manualStatus: 'Active', endDate: '2026-07-01T00:00:00Z' }, NOW),
		).toBe('Completed');
	});

	it('keeps Cancelled as a terminal manual override, even after the end date passes', () => {
		expect(
			deriveEventLifecycleStatus({ manualStatus: 'Cancelled', endDate: '2026-07-01T00:00:00Z' }, NOW),
		).toBe('Cancelled');
	});

	it('keeps Cancelled when the end date has not passed', () => {
		expect(
			deriveEventLifecycleStatus({ manualStatus: 'Cancelled', endDate: '2026-07-20T00:00:00Z' }, NOW),
		).toBe('Cancelled');
	});

	it('keeps Cancelled when there is no end date at all', () => {
		expect(deriveEventLifecycleStatus({ manualStatus: 'Cancelled', endDate: null }, NOW)).toBe('Cancelled');
	});

	it('defaults `now` to the current time when omitted', () => {
		const farFuture = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString();
		expect(deriveEventLifecycleStatus({ manualStatus: 'Active', endDate: farFuture })).toBe('Active');
	});
});
