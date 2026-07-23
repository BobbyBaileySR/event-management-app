import { describe, expect, it } from 'vitest';
import { attendeeInitials, attendeeName, initialsFromName } from './attendeePresentation';

describe('attendeeName', () => {
	it('joins first and last name', () => {
		expect(attendeeName({ firstName: 'Jane', lastName: 'Doe' })).toBe('Jane Doe');
	});

	it('trims when a part is missing', () => {
		expect(attendeeName({ firstName: 'Jane', lastName: '' })).toBe('Jane');
		expect(attendeeName({ firstName: '', lastName: '' })).toBe('');
	});
});

describe('attendeeInitials', () => {
	it('takes the first letter of each name, uppercased', () => {
		expect(attendeeInitials({ firstName: 'jane', lastName: 'doe' })).toBe('JD');
	});

	it('ignores leading whitespace', () => {
		expect(attendeeInitials({ firstName: '  jane', lastName: '  doe' })).toBe('JD');
	});

	it('falls back to "?" when both names are empty', () => {
		expect(attendeeInitials({ firstName: '', lastName: '' })).toBe('?');
	});
});

describe('initialsFromName', () => {
	it('uses first and last token of a combined name', () => {
		expect(initialsFromName('Jane Middle Doe')).toBe('JD');
	});

	it('uses a single letter for a one-word name', () => {
		expect(initialsFromName('Jane')).toBe('J');
	});

	it('falls back to "?" for an empty name', () => {
		expect(initialsFromName('   ')).toBe('?');
	});
});
