import { describe, expect, it } from 'vitest';
import { capitalizeStatus, formatCheckInTime, statusBadgeClass } from './format';

describe('format utilities', () => {
	it('maps event statuses to badge classes', () => {
		expect(statusBadgeClass('active')).toBe('badge--active');
		expect(statusBadgeClass('Registered')).toBe('badge--registered');
		expect(statusBadgeClass('unknown')).toBe('badge--draft');
	});

	it('capitalizes status labels', () => {
		expect(capitalizeStatus('active')).toBe('Active');
		expect(capitalizeStatus('checked_in')).toBe('Checked_in');
	});

	it('formats a check-in timestamp as 24-hour HH:MM', () => {
		expect(formatCheckInTime('2026-07-16T08:52:00.000Z')).toMatch(/^\d{2}:\d{2}$/);
	});
});
