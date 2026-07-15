import type { CatalogEvent, CatalogEventPublishState, CatalogEventStatus, CatalogProgram } from '../types';

export interface MetadataLine {
	label: string;
	value: string;
}

/**
 * Event status model (FR-017 / US5-AC4).
 *
 * HubSpot wire uses lowercase `status` (`active`|`cancelled`) and `publishState`
 * (`draft`|`published`). Display helpers map those to title case for the UI.
 * Completed is never chosen manually — it is derived from end date once Active.
 */

/** The only two values a staff member can set directly — Completed is never chosen manually. */
export type EventManualStatus = 'Active' | 'Cancelled';

/** Effective status shown in the UI: Active/Cancelled are manual, Completed is auto-derived once the end date passes. */
export type EventLifecycleStatus = 'Active' | 'Cancelled' | 'Completed';

/** Tracked independently of lifecycle status per FR-017 — never derive one from the other. */
export type EventPublishState = 'Draft' | 'Published';

export interface EventStatusInput {
	manualStatus: EventManualStatus;
	/** ISO date/datetime string. Absent/null = no end date, so the event never auto-completes. */
	endDate?: string | null;
}

/**
 * Derives the effective lifecycle status.
 *
 * Cancelled is a terminal manual override — once cancelled, an event never
 * auto-flips to Completed just because its end date passed. Only an Active
 * event auto-derives to Completed once its end date is in the past.
 */
export function deriveEventLifecycleStatus(input: EventStatusInput, now: Date = new Date()): EventLifecycleStatus {
	if (input.manualStatus === 'Cancelled') {
		return 'Cancelled';
	}
	return isPastEndDate(input.endDate, now) ? 'Completed' : 'Active';
}

/** True only for a real, parseable end date strictly before `now`. */
export function isPastEndDate(endDate: string | null | undefined, now: Date = new Date()): boolean {
	if (!endDate) {
		return false;
	}
	const parsed = new Date(endDate);
	if (Number.isNaN(parsed.getTime())) {
		return false;
	}
	return parsed.getTime() < now.getTime();
}

/** Map HubSpot wire `status` to display label. */
export function formatCatalogEventStatus(status: CatalogEventStatus | string): string {
	if (status === 'active') {
		return 'Active';
	}
	if (status === 'cancelled') {
		return 'Cancelled';
	}
	return status;
}

/** Map HubSpot wire `publishState` to display label. */
export function formatCatalogPublishState(publishState: CatalogEventPublishState | string): string {
	if (publishState === 'draft') {
		return 'Draft';
	}
	if (publishState === 'published') {
		return 'Published';
	}
	return publishState;
}

const PROGRAM_METADATA_FIELDS: Array<{ key: keyof CatalogProgram; label: string }> = [
	{ key: 'description', label: 'Description' },
	{ key: 'startDate', label: 'Start date' },
	{ key: 'endDate', label: 'End date' },
];

const EVENT_METADATA_FIELDS: Array<{ key: keyof CatalogEvent; label: string }> = [
	{ key: 'start', label: 'Start' },
	{ key: 'end', label: 'End' },
	{ key: 'status', label: 'Status' },
	{ key: 'publishState', label: 'Publish state' },
	{ key: 'owner', label: 'Owner' },
	{ key: 'location', label: 'Location' },
	{ key: 'capacity', label: 'Capacity' },
	{ key: 'walkInFormUrl', label: 'Walk-in form URL' },
	{ key: 'registrationFormUrl', label: 'Registration form URL' },
	{ key: 'registrationSlug', label: 'Registration slug' },
];

function formatEventMetadataValue(key: keyof CatalogEvent, value: unknown): string {
	if (key === 'status' && typeof value === 'string') {
		return formatCatalogEventStatus(value);
	}
	if (key === 'publishState' && typeof value === 'string') {
		return formatCatalogPublishState(value);
	}
	return String(value);
}

export function programMetadataLines(program: CatalogProgram): MetadataLine[] {
	return PROGRAM_METADATA_FIELDS.flatMap(({ key, label }) => {
		const value = program[key];
		if (value === undefined || value === null || value === '') {
			return [];
		}
		return [{ label, value: String(value) }];
	});
}

export function eventMetadataLines(event: CatalogEvent): MetadataLine[] {
	return EVENT_METADATA_FIELDS.flatMap(({ key, label }) => {
		const value = event[key];
		if (value === undefined || value === null || value === '') {
			return [];
		}
		return [{ label, value: formatEventMetadataValue(key, value) }];
	});
}

export function optionalTextForPatch(current: string | undefined, next: string): string | null | undefined {
	const trimmed = next.trim();
	if (trimmed) {
		return trimmed;
	}
	if (current) {
		return null;
	}
	return undefined;
}

export function optionalNumberForPatch(current: number | undefined, next: string): number | null | undefined {
	if (!next.trim()) {
		return current !== undefined ? null : undefined;
	}
	const parsed = Number(next);
	return Number.isFinite(parsed) ? parsed : undefined;
}
