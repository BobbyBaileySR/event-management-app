import { describe, expect, it } from 'vitest';
import { eventPath, isEventScopedRoute, sliceModulePath } from './navigation';

describe('sliceModulePath', () => {
	it('builds catalog-scoped slice routes without a legacy event id', () => {
		expect(sliceModulePath('attendees')).toBe('/events/attendees');
		expect(sliceModulePath('check-in')).toBe('/events/check-in');
		expect(sliceModulePath('email')).toBe('/events/email');
	});
});

describe('eventPath', () => {
	it('builds the event hub path when no module (or the hub) is given', () => {
		expect(eventPath('evt-1')).toBe('/events/evt-1');
		expect(eventPath('evt-1', 'event-hub')).toBe('/events/evt-1');
		expect(eventPath('evt-1', null)).toBe('/events/evt-1');
	});

	it('builds a module path for event-scoped modules', () => {
		expect(eventPath('evt-1', 'attendees')).toBe('/events/evt-1/attendees');
		expect(eventPath('evt-1', 'email')).toBe('/events/evt-1/email');
	});
});

describe('isEventScopedRoute', () => {
	it('treats everything except the events list as event-scoped', () => {
		expect(isEventScopedRoute('events')).toBe(false);
		expect(isEventScopedRoute('event-hub')).toBe(true);
		expect(isEventScopedRoute('attendees')).toBe(true);
	});
});
