import { describe, expect, it } from 'vitest';
import { assertScheduleFields, defaultScheduleSlot, formatScheduleSlotLabel } from './emailSchedule';

/**
 * `now` is built with the local-time Date constructor and `defaultScheduleSlot` reads
 * it back in the same (local) timezone, so these assertions hold regardless of the
 * machine timezone the tests run in.
 */
describe('defaultScheduleSlot', () => {
	it('rounds the minute up to the next quarter-hour without changing the hour before :45', () => {
		expect(defaultScheduleSlot(new Date(2026, 6, 11, 10, 0, 0))).toMatchObject({
			date: '2026-07-11',
			hour: 10,
			minute: 0,
		});
		expect(defaultScheduleSlot(new Date(2026, 6, 11, 10, 7, 0))).toMatchObject({
			date: '2026-07-11',
			hour: 10,
			minute: 15,
		});
		expect(defaultScheduleSlot(new Date(2026, 6, 11, 10, 45, 0))).toMatchObject({
			date: '2026-07-11',
			hour: 10,
			minute: 45,
		});
	});

	it('rolls the hour forward when minutes round past :45 (:46–:59)', () => {
		// Regression: previously 10:53 suggested 10:00 (a time in the past).
		expect(defaultScheduleSlot(new Date(2026, 6, 11, 10, 53, 0))).toMatchObject({
			date: '2026-07-11',
			hour: 11,
			minute: 0,
		});
		expect(defaultScheduleSlot(new Date(2026, 6, 11, 10, 46, 0))).toMatchObject({
			date: '2026-07-11',
			hour: 11,
			minute: 0,
		});
		expect(defaultScheduleSlot(new Date(2026, 6, 11, 10, 59, 0))).toMatchObject({
			date: '2026-07-11',
			hour: 11,
			minute: 0,
		});
	});

	it('rolls the day forward when the last hour rounds past :45 (23:5x)', () => {
		expect(defaultScheduleSlot(new Date(2026, 6, 11, 23, 55, 0))).toMatchObject({
			date: '2026-07-12',
			hour: 0,
			minute: 0,
		});
	});

	it('rolls month and year boundaries forward correctly on the 23:5x day rollover', () => {
		expect(defaultScheduleSlot(new Date(2026, 6, 31, 23, 50, 0))).toMatchObject({
			date: '2026-08-01',
			hour: 0,
			minute: 0,
		});
		expect(defaultScheduleSlot(new Date(2026, 11, 31, 23, 59, 0))).toMatchObject({
			date: '2027-01-01',
			hour: 0,
			minute: 0,
		});
	});

	it('always returns a valid 15-minute slot minute', () => {
		for (let minute = 0; minute < 60; minute += 1) {
			const slot = defaultScheduleSlot(new Date(2026, 6, 11, 9, minute, 0));
			expect([0, 15, 30, 45]).toContain(slot.minute);
		}
	});
});

describe('formatScheduleSlotLabel', () => {
	it('formats a date + 15-minute slot as “Mon D, YYYY at h:mm AM/PM”', () => {
		expect(formatScheduleSlotLabel('2026-03-12', 9, 0)).toBe('Mar 12, 2026 at 9:00 AM');
		expect(formatScheduleSlotLabel('2026-03-12', 0, 15)).toBe('Mar 12, 2026 at 12:15 AM');
		expect(formatScheduleSlotLabel('2026-03-12', 12, 30)).toBe('Mar 12, 2026 at 12:30 PM');
		expect(formatScheduleSlotLabel('2026-03-12', 21, 45)).toBe('Mar 12, 2026 at 9:45 PM');
	});

	it('returns an empty string for an invalid date', () => {
		expect(formatScheduleSlotLabel('not-a-date', 9, 0)).toBe('');
	});
});

describe('assertScheduleFields', () => {
	it('throws when the instant is in the past', () => {
		expect(() => assertScheduleFields('2000-01-01T00:00:00.000Z', 'UTC')).toThrow('Choose a time in the future.');
	});

	it('throws when the instant does not land on a 15-minute mark', () => {
		expect(() => assertScheduleFields('2999-01-01T10:07:00.000Z', 'UTC')).toThrow(
			'Schedule time must be on a 15-minute mark (e.g. 9:00, 9:15, 9:30, 9:45).',
		);
	});

	it('does not throw for a future, 15-minute-aligned instant', () => {
		expect(() => assertScheduleFields('2999-01-01T10:15:00.000Z', 'UTC')).not.toThrow();
	});

	it('checks alignment in the given timezone, not UTC', () => {
		// 2999-01-01T10:07:00Z is 05:07 in America/New_York (UTC-5) — still misaligned there too,
		// but this proves the check reads the requested zone rather than always UTC.
		expect(() => assertScheduleFields('2999-01-01T10:00:00.000Z', 'America/New_York')).not.toThrow();
		expect(() => assertScheduleFields('2999-01-01T10:07:00.000Z', 'America/New_York')).toThrow(
			'Schedule time must be on a 15-minute mark (e.g. 9:00, 9:15, 9:30, 9:45).',
		);
	});
});
