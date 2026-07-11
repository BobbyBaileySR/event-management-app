import { describe, expect, it } from 'vitest';
import { defaultScheduleSlot } from './emailSchedule';

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
