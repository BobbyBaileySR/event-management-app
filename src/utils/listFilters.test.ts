import { describe, expect, it } from 'vitest';
import type { AttendeeStatus, Event } from '../types';
import type { PortfolioEvent } from './catalogEventPresentation';
import {
	countSegment,
	filterAttendees,
	filterEventsByStatus,
	filterPortfolioByStatus,
	getPortfolioStats,
	searchAttendees,
	searchEvents,
	searchPortfolioEvents,
} from './listFilters';

const attendees = [
	{ name: 'Ada Lovelace', email: 'ada@example.com', company: 'Analytical', status: 'Registered' as AttendeeStatus },
	{ name: 'Grace Hopper', email: 'grace@example.com', company: 'Navy', status: 'Checked In' as AttendeeStatus },
];

const events: Event[] = [
	{
		id: 'evt-1',
		name: 'London Summit',
		date: 'Oct 15, 2026',
		dateIso: '2026-10-15',
		location: 'London',
		status: 'active',
		attendeeCount: 10,
		capacity: 100,
		type: 'In-person',
		owner: 'events@adaptavist.com',
		registrationClose: 'Oct 10, 2026',
		hubspotId: 'HS-EVT-1',
		description: 'Flagship customer summit.',
	},
	{
		id: 'evt-2',
		name: 'Draft Webinar',
		date: 'Nov 02, 2026',
		dateIso: '2026-11-02',
		location: 'Virtual',
		status: 'draft',
		attendeeCount: 5,
		capacity: 50,
		type: 'Virtual',
		owner: 'events@adaptavist.com',
		registrationClose: 'Nov 01, 2026',
		hubspotId: 'HS-EVT-2',
		description: 'Monthly technical webinar — draft.',
	},
];

const portfolioEvents: PortfolioEvent[] = [
	{
		id: 'evt-1',
		name: 'London Summit',
		date: 'Oct 15, 2026',
		dateIso: '2026-10-15',
		location: 'London',
		status: 'active',
		publishState: 'published',
		attendeeCount: 10,
		capacity: 100,
		owner: 'events@adaptavist.com',
		hubspotId: 'evt-1',
	},
	{
		id: 'evt-2',
		name: 'Draft Webinar',
		date: 'Nov 02, 2026',
		dateIso: '2026-11-02',
		location: 'Virtual',
		status: 'active',
		publishState: 'draft',
		attendeeCount: 5,
		capacity: 50,
		owner: 'events@adaptavist.com',
		hubspotId: 'evt-2',
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
		expect(getPortfolioStats(portfolioEvents)).toEqual({ total: 2, active: 2, registrations: 15 });
	});

	it('filters portfolio events by derived lifecycle status', () => {
		expect(filterPortfolioByStatus('all', portfolioEvents)).toHaveLength(2);
		expect(filterPortfolioByStatus('active', portfolioEvents)).toEqual(portfolioEvents);
		expect(filterPortfolioByStatus('cancelled', portfolioEvents)).toEqual([]);
		expect(filterPortfolioByStatus('completed', portfolioEvents)).toEqual([]);
	});

	it('searches portfolio events by name, location, or hubspotId', () => {
		expect(searchPortfolioEvents('draft', portfolioEvents)).toEqual([portfolioEvents[1]]);
		expect(searchPortfolioEvents('evt-1', portfolioEvents)).toEqual([portfolioEvents[0]]);
	});
});
