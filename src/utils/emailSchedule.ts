export const SCHEDULE_MINUTE_OPTIONS = [0, 15, 30, 45] as const;

const COMMON_TIMEZONES = [
	'Europe/London',
	'Europe/Paris',
	'Europe/Berlin',
	'America/New_York',
	'America/Chicago',
	'America/Los_Angeles',
	'Asia/Singapore',
	'Australia/Sydney',
	'UTC',
] as const;

export function resolveDefaultTimezone(): string {
	try {
		return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/London';
	} catch {
		return 'Europe/London';
	}
}

export function listTimezoneOptions(): string[] {
	const browserZone = resolveDefaultTimezone();
	const options = new Set<string>(COMMON_TIMEZONES);
	options.add(browserZone);
	return [...options];
}

export function buildTimeSlot(hour: number, minute: number): string {
	return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/** Operator-facing schedule label, e.g. `Mar 12, 2026 at 9:00 AM`. */
export function formatScheduleSlotLabel(date: string, hour: number, minute: number): string {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
	if (!match) {
		return '';
	}
	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	const datePart = new Date(year, month - 1, day).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	});
	const period = hour < 12 ? 'AM' : 'PM';
	const displayHour = hour % 12 === 0 ? 12 : hour % 12;
	const timePart = `${displayHour}:${String(minute).padStart(2, '0')} ${period}`;
	return `${datePart} at ${timePart}`;
}

export interface ScheduleSlot {
	/** Calendar date in the default timezone, `YYYY-MM-DD`. */
	date: string;
	hour: number;
	minute: (typeof SCHEDULE_MINUTE_OPTIONS)[number];
}

/**
 * Suggest the next selectable 15-minute schedule slot from a single clock reading.
 *
 * All three parts (date, hour, minute) are derived from one `now`, so rounding the
 * minute up to the next quarter-hour rolls the hour — and the calendar day — forward
 * correctly. This avoids the past-time defaults that occurred when the minute rounded
 * from :46–:59 up to :60 without advancing the hour (e.g. 10:53 → 10:00 today).
 *
 * `now` is injectable for testing.
 */
export function defaultScheduleSlot(now: Date = new Date()): ScheduleSlot {
	const timeZone = resolveDefaultTimezone();
	const parts = readZonedParts(now.toISOString(), timeZone);

	let year = Number(parts.year);
	let month = Number(parts.month);
	let day = Number(parts.day);
	let hour = Number(parts.hour) % 24;
	const minute = Number(parts.minute);

	let roundedMinute = Math.ceil(minute / 15) * 15;
	if (roundedMinute === 60) {
		roundedMinute = 0;
		hour += 1;
	}
	if (hour === 24) {
		hour = 0;
		// Advance one calendar day via UTC math so month/year boundaries are handled.
		const nextDay = new Date(Date.UTC(year, month - 1, day + 1));
		year = nextDay.getUTCFullYear();
		month = nextDay.getUTCMonth() + 1;
		day = nextDay.getUTCDate();
	}

	return {
		date: `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
		hour,
		minute: roundedMinute as (typeof SCHEDULE_MINUTE_OPTIONS)[number],
	};
}

function readZonedParts(isoInstant: string, timeZone: string): Record<string, string> {
	const formatter = new Intl.DateTimeFormat('en-US', {
		timeZone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hour12: false,
	});
	const parts = formatter.formatToParts(new Date(isoInstant));
	return Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
}

/** Convert a local date + 15-minute slot in an IANA timezone to a UTC ISO instant. */
export function buildScheduledAtUtc(date: string, timeSlot: string, timeZone: string): string {
	const [year, month, day] = date.split('-').map((part) => Number(part));
	const [hour, minute] = timeSlot.split(':').map((part) => Number(part));
	const utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0, 0);

	function offsetMs(atMs: number): number {
		const parts = readZonedParts(new Date(atMs).toISOString(), timeZone);
		const asUtc = Date.UTC(
			Number(parts.year),
			Number(parts.month) - 1,
			Number(parts.day),
			Number(parts.hour),
			Number(parts.minute),
			Number(parts.second ?? 0),
		);
		return asUtc - atMs;
	}

	let ms = utcGuess;
	for (let attempt = 0; attempt < 3; attempt += 1) {
		ms = utcGuess - offsetMs(ms);
	}
	return new Date(ms).toISOString();
}

export function parseScheduledAtUtc(isoInstant: string, timeZone: string): { date: string; timeSlot: string } {
	const parts = readZonedParts(isoInstant, timeZone);
	return {
		date: `${parts.year}-${parts.month}-${parts.day}`,
		timeSlot: buildTimeSlot(Number(parts.hour), Number(parts.minute)),
	};
}

export function formatScheduledDisplay(isoInstant: string, timeZone: string): string {
	const formatter = new Intl.DateTimeFormat('en-GB', {
		timeZone,
		dateStyle: 'medium',
		timeStyle: 'short',
	});
	return `${formatter.format(new Date(isoInstant))} (${timeZone})`;
}

export function assertScheduleFields(scheduledAtUtc: string, timezone: string): void {
	const scheduledMs = Date.parse(scheduledAtUtc);
	if (!Number.isFinite(scheduledMs) || scheduledMs <= Date.now()) {
		throw new Error('validation_error');
	}

	const parts = readZonedParts(scheduledAtUtc, timezone);
	const minute = Number(parts.minute);
	const second = Number(parts.second ?? 0);
	if (second !== 0 || minute % 15 !== 0) {
		throw new Error('validation_error');
	}
}
