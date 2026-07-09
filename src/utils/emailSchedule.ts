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

export function defaultScheduleDate(): string {
	const formatter = new Intl.DateTimeFormat('en-CA', {
		timeZone: resolveDefaultTimezone(),
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
	});
	return formatter.format(new Date());
}

export function defaultScheduleHour(): number {
	const formatter = new Intl.DateTimeFormat('en-GB', {
		timeZone: resolveDefaultTimezone(),
		hour: '2-digit',
		hour12: false,
	});
	return Number(formatter.format(new Date()));
}

export function defaultScheduleMinute(): (typeof SCHEDULE_MINUTE_OPTIONS)[number] {
	const formatter = new Intl.DateTimeFormat('en-GB', {
		timeZone: resolveDefaultTimezone(),
		minute: '2-digit',
	});
	const minute = Number(formatter.format(new Date()));
	const rounded = Math.ceil(minute / 15) * 15;
	return (rounded === 60 ? 0 : rounded) as (typeof SCHEDULE_MINUTE_OPTIONS)[number];
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
