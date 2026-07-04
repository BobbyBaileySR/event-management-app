import type { CatalogEvent, CatalogProgram } from '../types';

export interface MetadataLine {
	label: string;
	value: string;
}

const PROGRAM_METADATA_FIELDS: Array<{ key: keyof CatalogProgram; label: string }> = [
	{ key: 'description', label: 'Description' },
	{ key: 'startDate', label: 'Start date' },
	{ key: 'endDate', label: 'End date' },
	{ key: 'location', label: 'Location' },
	{ key: 'timezone', label: 'Timezone' },
];

const EVENT_METADATA_FIELDS: Array<{ key: keyof CatalogEvent; label: string }> = [
	{ key: 'owner', label: 'Owner' },
	{ key: 'description', label: 'Description' },
	{ key: 'date', label: 'Date' },
	{ key: 'location', label: 'Location' },
	{ key: 'capacity', label: 'Capacity' },
];

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
		return [{ label, value: String(value) }];
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
