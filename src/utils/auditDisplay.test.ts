import { describe, expect, it } from 'vitest';
import { actorInitials, categorizeAuditAction, describeAuditAction } from './auditDisplay';

describe('describeAuditAction', () => {
	it('returns a plain-language phrase for known actions', () => {
		expect(describeAuditAction('checkin.confirm')).toBe('checked in an attendee');
		expect(describeAuditAction('auth.exchange')).toBe('signed in');
	});

	it('falls back to a generic phrase for unknown actions', () => {
		expect(describeAuditAction('"><img src=x onerror=alert(1)>')).toBe('performed an action');
	});
});

describe('categorizeAuditAction', () => {
	it('derives a category badge from the action namespace', () => {
		expect(categorizeAuditAction('checkin.scan')).toBe('Check-in');
		expect(categorizeAuditAction('catalog.event.update')).toBe('Event');
		expect(categorizeAuditAction('email.dispatch.create')).toBe('Email');
	});

	it('falls back to Activity for unrecognized namespaces', () => {
		expect(categorizeAuditAction('unknown.thing')).toBe('Activity');
	});
});

describe('actorInitials', () => {
	it('builds initials from a dotted email local-part', () => {
		expect(actorInitials('rbailey@adaptavist.com')).toBe('RB');
		expect(actorInitials('elena.marsh@adaptavist.com')).toBe('EM');
	});

	it('falls back to the first two characters when there is no separator', () => {
		expect(actorInitials('admin@adaptavist.com')).toBe('AD');
	});
});
