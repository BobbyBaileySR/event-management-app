import type { AttendeeStatus, Event, EventStatus } from '../types';
import type { PortfolioEvent } from './catalogEventPresentation';

export function filterAttendees<T extends { status: AttendeeStatus | string }>(
	filter: AttendeeStatus | 'All',
	attendees: T[],
): T[] {
	if (filter === 'All') {
		return attendees;
	}
	return attendees.filter((person) => person.status === filter);
}

export function countSegment<T extends { status: AttendeeStatus | string }>(
	segment: AttendeeStatus | 'All',
	attendees: T[],
): number {
	return filterAttendees(segment, attendees).length;
}

export function searchAttendees<T extends { name: string; email: string; company: string }>(
	query: string,
	attendees: T[],
): T[] {
	const needle = query.trim().toLowerCase();
	if (!needle) {
		return attendees;
	}
	return attendees.filter(
		(person) =>
			person.name.toLowerCase().includes(needle) ||
			person.email.toLowerCase().includes(needle) ||
			person.company.toLowerCase().includes(needle),
	);
}

export type PortfolioStatusFilter = 'all' | 'active' | 'completed' | 'cancelled';

/** Filter portfolio events by derived lifecycle status (Programs & Events Active tab). */
export function filterPortfolioByStatus(
	status: PortfolioStatusFilter,
	events: PortfolioEvent[],
): PortfolioEvent[] {
	if (status === 'all') {
		return events;
	}
	return events.filter((event) => event.status === status);
}

export function filterEventsByStatus(status: EventStatus | 'all', events: Event[]): Event[] {
	if (status === 'all') {
		return events;
	}
	return events.filter((event) => event.status === status);
}

export function searchPortfolioEvents(query: string, events: PortfolioEvent[]): PortfolioEvent[] {
	const needle = query.trim().toLowerCase();
	if (!needle) {
		return events;
	}
	return events.filter(
		(event) =>
			event.name.toLowerCase().includes(needle) ||
			event.location.toLowerCase().includes(needle) ||
			event.hubspotId.toLowerCase().includes(needle),
	);
}

export function searchEvents(query: string, events: Event[]): Event[] {
	const needle = query.trim().toLowerCase();
	if (!needle) {
		return events;
	}
	return events.filter(
		(event) =>
			event.name.toLowerCase().includes(needle) ||
			event.location.toLowerCase().includes(needle) ||
			event.hubspotId.toLowerCase().includes(needle),
	);
}

export function getPortfolioStats(events: PortfolioEvent[]): {
	total: number;
	active: number;
	registrations: number;
} {
	const active = events.filter((event) => event.status === 'active').length;
	const registrations = events.reduce((sum, event) => sum + event.attendeeCount, 0);
	return { total: events.length, active, registrations };
}
