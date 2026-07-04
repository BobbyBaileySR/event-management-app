import { describe, expect, it } from 'vitest';
import {
	normalizeAttendee,
	normalizeAttendeesResponse,
	normalizeCatalogResponse,
	normalizeEvent,
	normalizeEventResponse,
	normalizeEventsResponse,
} from './normalizeApi';

describe('normalizeEvent', () => {
	it('maps API startDate to UI date fields', () => {
		const result = normalizeEvent({
			id: 'evt-123',
			name: 'London Q3 Summit',
			startDate: '2026-10-15T09:00:00.000Z',
			endDate: '2026-10-15T17:00:00.000Z',
			location: 'The Shard',
			status: 'active',
			attendeeCount: 150,
		});

		expect(result).toMatchObject({
			id: 'evt-123',
			name: 'London Q3 Summit',
			dateIso: '2026-10-15',
			location: 'The Shard',
			status: 'active',
			attendeeCount: 150,
		});
		expect(result?.date).toBeTruthy();
	});

	it('passes through UI-shaped mock events unchanged', () => {
		const uiEvent = {
			id: 'evt-mock',
			name: 'Mock Event',
			date: 'Oct 15, 2026',
			dateIso: '2026-10-15',
			location: 'London',
			status: 'active',
			attendeeCount: 10,
			capacity: 20,
			type: 'In-person',
			owner: 'events@adaptavist.com',
			registrationClose: 'Oct 10, 2026',
			hubspotId: 'HS-1',
			description: 'Test',
		};

		expect(normalizeEvent(uiEvent)).toEqual(uiEvent);
	});

	it('returns null for missing input', () => {
		expect(normalizeEvent(null)).toBeNull();
		expect(normalizeEvent(undefined)).toBeNull();
	});
});

describe('normalizeAttendee', () => {
	it('combines firstName and lastName and maps API status', () => {
		const result = normalizeAttendee({
			id: 'c-001',
			firstName: 'Jane',
			lastName: 'Doe',
			email: 'jane@example.com',
			company: 'Adaptavist',
			status: 'checked_in',
		});

		expect(result).toMatchObject({
			id: 'c-001',
			name: 'Jane Doe',
			email: 'jane@example.com',
			company: 'Adaptavist',
			status: 'Checked In',
		});
	});

	it('passes through UI-shaped mock attendees unchanged', () => {
		const uiAttendee = {
			id: 'c-001',
			name: 'Jane Doe',
			email: 'jane@example.com',
			company: 'Adaptavist',
			status: 'Registered',
			ticketType: 'General',
			registeredAt: '2026-08-01',
			source: 'HubSpot form',
		};

		expect(normalizeAttendee(uiAttendee)).toEqual(uiAttendee);
	});
});

describe('normalizeEventsResponse', () => {
	it('normalizes each event in the list', () => {
		const result = normalizeEventsResponse({
			events: [{ id: 'evt-1', name: 'Summit', startDate: '2026-10-15T09:00:00.000Z', status: 'active' }],
			page: 1,
			total: 1,
		});

		expect(result.events).toHaveLength(1);
		expect(result.events[0]?.dateIso).toBe('2026-10-15');
		expect(result.page).toBe(1);
	});
});

describe('normalizeEventResponse', () => {
	it('unwraps { event } wrapper', () => {
		const result = normalizeEventResponse({
			event: { id: 'evt-1', name: 'Summit', startDate: '2026-10-15T09:00:00.000Z' },
		});
		expect(result.event?.id).toBe('evt-1');
	});

	it('accepts a bare event object', () => {
		const result = normalizeEventResponse({ id: 'evt-2', name: 'Webinar', startDate: '2026-11-02T10:00:00.000Z' });
		expect(result.event?.id).toBe('evt-2');
	});
});

describe('normalizeAttendeesResponse', () => {
	it('normalizes each attendee in the list', () => {
		const result = normalizeAttendeesResponse({
			attendees: [{ id: 'c-1', firstName: 'A', lastName: 'B', status: 'registered' }],
			total: 1,
		});

		expect(result.attendees[0]?.name).toBe('A B');
		expect(result.attendees[0]?.status).toBe('Registered');
		expect(result.total).toBe(1);
	});
});

describe('normalizeCatalogResponse', () => {
	it('maps API catalog tree fields to UI types', () => {
		const result = normalizeCatalogResponse({
			programs: [
				{
					id: 'prog-1',
					name: 'Atlassian Event 2026',
					hubspotFormId: 'form-1',
					archived: false,
					events: [{ id: 'ev-1', name: 'Meeting Room', partsAttendedOption: 'Meeting Room', archived: false }],
				},
			],
		});

		expect(result.programs[0]).toMatchObject({
			id: 'prog-1',
			name: 'Atlassian Event 2026',
			hubspotFormId: 'form-1',
			events: [{ id: 'ev-1', name: 'Meeting Room', partsAttendedOption: 'Meeting Room', archived: false }],
		});
	});
});
