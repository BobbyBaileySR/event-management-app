/**
 * Map ScriptRunner API contract shapes to UI display shapes used by views.
 * Mock data already uses the UI shape; live responses are normalized here.
 */

import type { Attendee, Event, CatalogEvent, CatalogProgram, CatalogResponse, SliceAttendeesResponse } from '../types';

const ATTENDEE_STATUS_FROM_API: Record<string, Attendee['status']> = {
	registered: 'Registered',
	checked_in: 'Checked In',
	cancelled: 'Cancelled',
};

function formatEventDate(iso: string | undefined): string {
	if (!iso) {
		return '';
	}
	return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(iso));
}

function toDateIso(iso: string | undefined): string {
	if (!iso) {
		return '';
	}
	return iso.split('T')[0] ?? '';
}

function isUiEventShape(raw: Record<string, unknown>): boolean {
	return Boolean(raw.date && !raw.startDate);
}

function isUiAttendeeShape(raw: Record<string, unknown>): boolean {
	return Boolean(raw.name && !raw.firstName && !raw.lastName);
}

export function normalizeEvent(raw: Record<string, unknown> | null | undefined): Event | null {
	if (!raw || typeof raw !== 'object') {
		return null;
	}

	if (isUiEventShape(raw)) {
		return raw as unknown as Event;
	}

	const startDate = typeof raw.startDate === 'string' ? raw.startDate : '';
	const endDateIso = typeof raw.endDate === 'string' ? raw.endDate : undefined;

	return {
		id: String(raw.id ?? ''),
		name: String(raw.name ?? ''),
		date: typeof raw.date === 'string' ? raw.date : formatEventDate(startDate),
		dateIso: typeof raw.dateIso === 'string' ? raw.dateIso : toDateIso(startDate),
		endDate:
			typeof raw.endDate === 'string' && !endDateIso?.includes('T')
				? raw.endDate
				: endDateIso
					? formatEventDate(endDateIso)
					: undefined,
		location: String(raw.location ?? ''),
		status: String(raw.status ?? 'draft'),
		attendeeCount: Number(raw.attendeeCount ?? 0),
		capacity: Number(raw.capacity ?? raw.attendeeCount ?? 0),
		type: String(raw.type ?? 'In-person'),
		owner: String(raw.owner ?? ''),
		registrationClose: String(raw.registrationClose ?? ''),
		hubspotId: String(raw.hubspotId ?? raw.id ?? ''),
		description: String(raw.description ?? ''),
	};
}

export function normalizeAttendee(raw: Record<string, unknown> | null | undefined): Attendee {
	if (!raw || typeof raw !== 'object') {
		return raw as unknown as Attendee;
	}

	if (isUiAttendeeShape(raw)) {
		return raw as unknown as Attendee;
	}

	const firstName = String(raw.firstName ?? '');
	const lastName = String(raw.lastName ?? '');
	const combinedName = [firstName, lastName].filter(Boolean).join(' ');
	const apiStatus = typeof raw.status === 'string' ? raw.status : '';
	const status = ATTENDEE_STATUS_FROM_API[apiStatus] ?? (raw.status as Attendee['status']) ?? 'Registered';

	return {
		id: String(raw.id ?? ''),
		name: combinedName || String(raw.name ?? ''),
		email: String(raw.email ?? ''),
		company: String(raw.company ?? ''),
		status,
		ticketType: String(raw.ticketType ?? ''),
		registeredAt: String(raw.registeredAt ?? ''),
		source: String(raw.source ?? ''),
	};
}

export function normalizeEventsResponse(response: Record<string, unknown>): { events: Event[] } & Record<string, unknown> {
	const events = Array.isArray(response.events) ? response.events : [];
	return {
		...response,
		events: events.map((event) => normalizeEvent(event as Record<string, unknown>)).filter(Boolean) as Event[],
	};
}

export function normalizeEventResponse(
	response: Record<string, unknown> | null | undefined,
): { event: Event | null } {
	if (response && typeof response === 'object' && 'event' in response) {
		return { event: normalizeEvent(response.event as Record<string, unknown>) };
	}
	return { event: normalizeEvent(response ?? undefined) };
}

export function normalizeAttendeesResponse(
	response: Record<string, unknown>,
): { attendees: Attendee[] } & Record<string, unknown> {
	const attendees = Array.isArray(response.attendees) ? response.attendees : [];
	return {
		...response,
		attendees: attendees.map((attendee) => normalizeAttendee(attendee as Record<string, unknown>)),
	};
}

function copyOptionalString(raw: Record<string, unknown>, key: string): string | undefined {
	const value = raw[key];
	return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function copyOptionalNumber(raw: Record<string, unknown>, key: string): number | undefined {
	const value = raw[key];
	return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function normalizeCatalogEvent(raw: Record<string, unknown>): CatalogEvent {
	return {
		id: String(raw.id ?? ''),
		name: String(raw.name ?? ''),
		partsAttendedOption: String(raw.partsAttendedOption ?? ''),
		attendanceProperty: String(
			raw.attendanceProperty ?? 'atlassian_event__customer_event_attendance',
		),
		archived: Boolean(raw.archived),
		owner: copyOptionalString(raw, 'owner'),
		description: copyOptionalString(raw, 'description'),
		date: copyOptionalString(raw, 'date'),
		location: copyOptionalString(raw, 'location'),
		capacity: copyOptionalNumber(raw, 'capacity'),
	};
}

function normalizeCatalogProgram(raw: Record<string, unknown>): CatalogProgram {
	const events = Array.isArray(raw.events) ? raw.events : [];
	const formIds = raw.hubspotFormIds;
	const legacyFormId = raw.hubspotFormId;
	const hubspotFormIds = Array.isArray(formIds)
		? formIds.map(String)
		: legacyFormId
			? [String(legacyFormId)]
			: [];

	return {
		id: String(raw.id ?? ''),
		name: String(raw.name ?? ''),
		hubspotFormIds,
		archived: Boolean(raw.archived),
		events: events.map((event) => normalizeCatalogEvent(event as Record<string, unknown>)),
		description: copyOptionalString(raw, 'description'),
		startDate: copyOptionalString(raw, 'startDate'),
		endDate: copyOptionalString(raw, 'endDate'),
		location: copyOptionalString(raw, 'location'),
		timezone: copyOptionalString(raw, 'timezone'),
	};
}

export function normalizeSliceAttendeesResponse(response: Record<string, unknown>): SliceAttendeesResponse {
	const attendees = Array.isArray(response.attendees) ? response.attendees : [];
	return {
		attendees: attendees.map((row) => {
			const raw = row as Record<string, unknown>;
			return {
				contactId: String(raw.contactId ?? ''),
				firstName: String(raw.firstName ?? ''),
				lastName: String(raw.lastName ?? ''),
				company: String(raw.company ?? ''),
				email: String(raw.email ?? ''),
				accountManager: String(raw.accountManager ?? ''),
				attendeeType: raw.attendeeType === 'partner' ? 'partner' : 'customer',
				checkedIn: Boolean(raw.checkedIn),
				checkedInAt: null,
			};
		}),
		page: Number(response.page ?? 1),
		pageSize: Number(response.pageSize ?? 50),
		total: Number(response.total ?? attendees.length),
	};
}

export function normalizeCatalogResponse(response: Record<string, unknown>): CatalogResponse {
	const programs = Array.isArray(response.programs) ? response.programs : [];
	return {
		programs: programs.map((program) => normalizeCatalogProgram(program as Record<string, unknown>)),
	};
}
