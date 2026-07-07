import type { AuditLogEntry, AuditMetadata, AuditMetadataValue } from '../types';

const PII_METADATA_KEYS = new Set([
	'email',
	'attendeeemail',
	'contactemail',
	'name',
	'firstname',
	'lastname',
	'fullname',
	'contactname',
	'attendeename',
	'contactid',
]);

function isPiiKey(key: string): boolean {
	return PII_METADATA_KEYS.has(key.toLowerCase());
}

function formatMetadataValue(value: AuditMetadataValue): string {
	if (value === null) {
		return 'null';
	}
	if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
		return String(value);
	}
	if (Array.isArray(value)) {
		return value.join(', ');
	}
	return formatMetadataObject(value);
}

function formatMetadataObject(metadata: AuditMetadata, indent = ''): string {
	const lines: string[] = [];
	for (const [key, value] of Object.entries(metadata)) {
		if (isPiiKey(key)) {
			continue;
		}
		if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
			const nested = formatMetadataObject(value, `${indent}  `);
			if (nested) {
				lines.push(`${indent}${key}: ${nested}`);
			}
			continue;
		}
		lines.push(`${indent}${key}: ${formatMetadataValue(value)}`);
	}
	return lines.join('; ');
}

/** Render audit metadata for display — skips keys that may hold attendee PII. */
export function formatAuditMetadata(metadata: AuditMetadata | undefined): string | null {
	if (!metadata || Object.keys(metadata).length === 0) {
		return null;
	}
	const formatted = formatMetadataObject(metadata);
	return formatted || null;
}

export function formatAuditResource(entry: AuditLogEntry): string {
	const parts = [entry.resourceType, entry.resourceId].filter(Boolean);
	return parts.join(' / ');
}
