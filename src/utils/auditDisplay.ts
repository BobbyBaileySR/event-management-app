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

/** Known audit actions per docs/api-contract.md — plain-language phrase for the feed headline. */
const ACTION_PHRASES: Record<string, string> = {
	'auth.exchange': 'signed in',
	'auth.logout': 'signed out',
	'catalog.program.create': 'created a program',
	'catalog.program.update': 'updated a program',
	'catalog.event.create': 'created an event',
	'catalog.event.update': 'updated an event',
	'attendees.list': 'viewed the attendee list',
	'checkin.scan': 'scanned a ticket',
	'checkin.confirm': 'checked in an attendee',
	'checkin.undo': 'undid a check-in',
	'attendee.remove': 'removed an attendee',
	'capacity.adjust': 'adjusted live capacity',
	'email.dispatch.create': 'created an email dispatch',
	'email.dispatch.update': 'updated an email dispatch',
	'email.dispatch.cancel': 'cancelled an email dispatch',
	'email.dispatch.complete': 'completed an email dispatch',
};

const CATEGORY_PREFIXES: Array<[string, string]> = [
	['auth.', 'Auth'],
	['catalog.program.', 'Program'],
	['catalog.event.', 'Event'],
	['attendees.', 'Attendees'],
	['checkin.', 'Check-in'],
	['capacity.', 'Capacity'],
	['email.dispatch.', 'Email'],
];

/** Plain-language phrase for an audit action; unknown actions get a generic phrase (the raw code is always shown separately). */
export function describeAuditAction(action: string): string {
	return ACTION_PHRASES[action] ?? 'performed an action';
}

/** Static list of known audit actions, for the audit log's action filter dropdown (FE-SLICE007-001 — no reactive search). */
export const KNOWN_AUDIT_ACTIONS: readonly string[] = Object.keys(ACTION_PHRASES).sort();

/** Static list of known audit resourceTypes, for the audit log's resource-type filter dropdown. */
export const KNOWN_AUDIT_RESOURCE_TYPES: readonly string[] = [
	'catalog_program',
	'catalog_event',
	'email_dispatch',
	'session',
];

/** Feed category badge label derived from the action's namespace prefix. */
export function categorizeAuditAction(action: string): string {
	const match = CATEGORY_PREFIXES.find(([prefix]) => action.startsWith(prefix));
	return match ? match[1] : 'Activity';
}

/** Two-letter initials for the actor avatar, derived from their email local-part (no display name is stored). */
export function actorInitials(actor: string): string {
	const local = actor.split('@')[0] ?? actor;
	const segments = local.split(/[._-]/).filter(Boolean);
	if (segments.length >= 2) {
		return `${segments[0]?.[0] ?? ''}${segments[1]?.[0] ?? ''}`.toUpperCase();
	}
	return local.slice(0, 2).toUpperCase();
}
