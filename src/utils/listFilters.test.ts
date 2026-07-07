import { describe, expect, it } from 'vitest';
import type { AttendeeStatus } from '../types';
import {
	countSegment,
	filterAttendees,
	filterEventsByStatus,
	getPortfolioStats,
	searchAttendees,
	searchEvents,
} from './listFilters';

const attendees = [
	{ name: 'Ada Lovelace', email: 'ada@example.com', company: 'Analytical', status: 'Registered' as AttendeeStatus },
	{ name: 'Grace Hopper', email: 'grace@example.com', company: 'Navy', status: 'Checked In' as AttendeeStatus },
];

const events = [
	{
		id: 'evt-1',
		name: 'London Summit',
		date: 'Oct 15, 2026',
		dateIso: '2026-10-15',
		location: 'London',
		status: 'active' as const,
		attendeeCount: 10,
		capacity: 100,
		type: 'In-person',
		owner: 'events@adaptavist.com',
		registrationClose: 'Oct 10, 2026',
		hubspotId: 'HS-EVT-1',
	},
	{
		id: 'evt-2',
		name: 'Draft Webinar',
		date: 'Nov 02, 2026',
		dateIso: '2026-11-02',
		location: 'Virtual',
		status: 'draft' as const,
		attendeeCount: 5,
		capacity: 50,
		type: 'Virtual',
		owner: 'events@adaptavist.com',
		registrationClose: 'Nov 01, 2026',
		hubspotId: 'HS-EVT-2',
	},
];

describe('listFilters', () => {
	it('filters attendees by status', () => {
		expect(filterAttendees('All', attendees)).toHaveLength(2);
		expect(filterAttendees('Checked In', attendees)).toEqual([attendees[1]]);
	});

	it('counts attendee segments', () => {
		expect(countSegment('Registered', attendees)).toBe(1);
	});

	it('searches attendees by name, email, or company', () => {
		expect(searchAttendees('grace', attendees)).toEqual([attendees[1]]);
		expect(searchAttendees('navy', attendees)).toEqual([attendees[1]]);
	});

	it('filters and searches events', () => {
		expect(filterEventsByStatus('active', events)).toEqual([events[0]]);
		expect(searchEvents('draft', events)).toEqual([events[1]]);
		expect(searchEvents('hs-evt-1', events)).toEqual([events[0]]);
	});

	it('summarises portfolio stats', () => {
		expect(getPortfolioStats(events)).toEqual({ total: 2, active: 1, registrations: 15 });
	});
});
