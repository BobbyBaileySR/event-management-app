import { describe, expect, it } from 'vitest';
import type { PortfolioEvent } from './catalogEventPresentation';
import { getUpcomingEvents, getEventDateBadgeParts, isInSameMonth, isWithinNextDays, isWithinPastDays } from './overviewStats';

const NOW = new Date('2026-07-14T12:00:00.000Z');

function makeEvent(overrides: Partial<PortfolioEvent>): PortfolioEvent {
	return {
		id: 'evt-1',
		name: 'Sample Event',
		date: 'Jul 20, 2026',
		dateIso: '2026-07-20',
		location: 'Somewhere',
		status: 'active',
		publishState: 'published',
		attendeeCount: 10,
		capacity: 20,
		owner: 'events@adaptavist.com',
		hubspotId: 'HS-1',
		...overrides,
	};
}

describe('isInSameMonth', () => {
	it('is true for a date in the same month/year as the reference', () => {
		expect(isInSameMonth('2026-07-01', NOW)).toBe(true);
	});

	it('is false for a date in a different month', () => {
		expect(isInSameMonth('2026-08-01', NOW)).toBe(false);
	});

	it('is false for an empty or unparsable date', () => {
		expect(isInSameMonth('', NOW)).toBe(false);
		expect(isInSameMonth('not-a-date', NOW)).toBe(false);
	});
});

describe('isWithinPastDays', () => {
	it('is true for a date within the rolling past window', () => {
		expect(isWithinPastDays('2026-07-10', 7, NOW)).toBe(true);
	});

	it('is false for a date further in the past than the window', () => {
		expect(isWithinPastDays('2026-06-01', 7, NOW)).toBe(false);
	});

	it('is false for a future date', () => {
		expect(isWithinPastDays('2026-07-20', 7, NOW)).toBe(false);
	});
});

describe('isWithinNextDays', () => {
	it('is true for a date within the rolling future window', () => {
		expect(isWithinNextDays('2026-07-18T00:00:00.000Z', 7, NOW)).toBe(true);
	});

	it('is false for a date further out than the window', () => {
		expect(isWithinNextDays('2026-08-01T00:00:00.000Z', 7, NOW)).toBe(false);
	});

	it('is false for a past date', () => {
		expect(isWithinNextDays('2026-07-01T00:00:00.000Z', 7, NOW)).toBe(false);
	});
});

describe('getEventDateBadgeParts', () => {
	it('returns uppercase month abbr and day number', () => {
		expect(getEventDateBadgeParts('2026-03-12T09:00:00.000Z')).toEqual({
			month: 'MAR',
			day: '12',
		});
	});

	it('returns placeholders for empty or invalid dates', () => {
		expect(getEventDateBadgeParts('')).toEqual({ month: '—', day: '—' });
		expect(getEventDateBadgeParts('not-a-date')).toEqual({ month: '—', day: '—' });
	});
});

describe('getUpcomingEvents', () => {
	it('includes only active events — cancelled and completed are excluded', () => {
		const events = [
			makeEvent({ id: 'a', status: 'active', dateIso: '2026-07-20' }),
			makeEvent({ id: 'b', status: 'cancelled', dateIso: '2026-07-21' }),
			makeEvent({ id: 'c', status: 'completed', dateIso: '2026-07-22' }),
		];

		const result = getUpcomingEvents(events, 10).map((event) => event.id);
		expect(result).toEqual(['a']);
	});

	it('sorts soonest-first and respects the limit', () => {
		const events = [
			makeEvent({ id: 'later', dateIso: '2026-09-01' }),
			makeEvent({ id: 'soonest', dateIso: '2026-07-15' }),
			makeEvent({ id: 'middle', dateIso: '2026-08-01' }),
		];

		const result = getUpcomingEvents(events, 2).map((event) => event.id);
		expect(result).toEqual(['soonest', 'middle']);
	});
});
