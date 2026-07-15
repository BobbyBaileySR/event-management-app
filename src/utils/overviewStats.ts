import type { PortfolioEvent } from './catalogEventPresentation';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whether an ISO date (`YYYY-MM-DD` or full timestamp) falls in the same calendar month/year as `reference`. */
export function isInSameMonth(dateIso: string, reference: Date): boolean {
	if (!dateIso) {
		return false;
	}
	const parsed = new Date(dateIso);
	if (Number.isNaN(parsed.getTime())) {
		return false;
	}
	return parsed.getUTCFullYear() === reference.getUTCFullYear() && parsed.getUTCMonth() === reference.getUTCMonth();
}

/** Whether a date string falls within the `days` before `reference` (inclusive, rolling window). */
export function isWithinPastDays(dateStr: string, days: number, reference: Date): boolean {
	if (!dateStr) {
		return false;
	}
	const parsed = new Date(dateStr);
	if (Number.isNaN(parsed.getTime())) {
		return false;
	}
	const diff = reference.getTime() - parsed.getTime();
	return diff >= 0 && diff <= days * DAY_MS;
}

/** Whether a date string falls within the `days` after `reference` (inclusive, rolling window). */
export function isWithinNextDays(dateStr: string, days: number, reference: Date): boolean {
	if (!dateStr) {
		return false;
	}
	const parsed = new Date(dateStr);
	if (Number.isNaN(parsed.getTime())) {
		return false;
	}
	const diff = parsed.getTime() - reference.getTime();
	return diff >= 0 && diff <= days * DAY_MS;
}

/** Non-cancelled, non-completed events sorted soonest-first — for the "Upcoming events" card list. */
export function getUpcomingEvents(events: PortfolioEvent[], limit = 4): PortfolioEvent[] {
	return events
		.filter((event) => event.status === 'active')
		.slice()
		.sort((a, b) => a.dateIso.localeCompare(b.dateIso))
		.slice(0, limit);
}
