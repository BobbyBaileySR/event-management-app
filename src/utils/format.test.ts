import { describe, expect, it } from 'vitest';
import { capitalizeStatus, statusBadgeClass } from './format';

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
});
