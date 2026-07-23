import { describe, expect, it } from 'vitest';
import { ATTENDANCE_PROPERTY_PRESETS, suggestAttendanceProperty, parseFormIdsInput, formatFormIdsInput } from './hubspot';

describe('suggestAttendanceProperty', () => {
	it('suggests the VIP property when the event name mentions VIP', () => {
		expect(suggestAttendanceProperty('VIP Summit')).toBe('atlassian_event__vip_event_attendance');
	});

	it('suggests the partner property when the event name mentions partner', () => {
		expect(suggestAttendanceProperty('Partner Roadshow')).toBe('atlassian_event__partner_event_attendance');
	});

	it('matches case-insensitively', () => {
		expect(suggestAttendanceProperty('vip Summit')).toBe('atlassian_event__vip_event_attendance');
	});

	it('defaults to the customer property otherwise', () => {
		expect(suggestAttendanceProperty('Spring Summit')).toBe('atlassian_event__customer_event_attendance');
	});

	it('prefers VIP over partner when both appear in the name', () => {
		expect(suggestAttendanceProperty('VIP Partner Dinner')).toBe('atlassian_event__vip_event_attendance');
	});
});

describe('parseFormIdsInput', () => {
	it('splits comma-separated ids and trims whitespace', () => {
		expect(parseFormIdsInput(' id-1 , id-2,id-3 ')).toEqual(['id-1', 'id-2', 'id-3']);
	});

	it('splits newline-separated ids', () => {
		expect(parseFormIdsInput('id-1\nid-2\n\nid-3')).toEqual(['id-1', 'id-2', 'id-3']);
	});

	it('drops empty entries produced by repeated separators', () => {
		expect(parseFormIdsInput('id-1,,  ,id-2')).toEqual(['id-1', 'id-2']);
	});

	it('returns an empty array for blank input', () => {
		expect(parseFormIdsInput('')).toEqual([]);
	});
});

describe('formatFormIdsInput', () => {
	it('joins ids with newlines', () => {
		expect(formatFormIdsInput(['id-1', 'id-2'])).toBe('id-1\nid-2');
	});

	it('returns an empty string for an empty list', () => {
		expect(formatFormIdsInput([])).toBe('');
	});
});

describe('ATTENDANCE_PROPERTY_PRESETS', () => {
	it('contains the three known preset properties', () => {
		expect(ATTENDANCE_PROPERTY_PRESETS).toEqual([
			'atlassian_event__customer_event_attendance',
			'atlassian_event__partner_event_attendance',
			'atlassian_event__vip_event_attendance',
		]);
	});
});
