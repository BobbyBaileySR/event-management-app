import { describe, expect, it } from 'vitest';
import { attendeeMutationErrorMessage } from './attendeeMutationErrors';

describe('attendeeMutationErrorMessage', () => {
	it('maps attendee_checked_in to the remove-blocked message', () => {
		expect(attendeeMutationErrorMessage(new Error('attendee_checked_in'), 'fallback')).toBe(
			'This attendee is checked in — undo check-in before removing.',
		);
	});

	it('maps contact_not_registered to the not-registered message', () => {
		expect(attendeeMutationErrorMessage(new Error('contact_not_registered'), 'fallback')).toBe(
			'This attendee is no longer registered.',
		);
	});

	it('returns the fallback for an unknown error code', () => {
		expect(attendeeMutationErrorMessage(new Error('boom'), 'Failed to undo check-in')).toBe(
			'Failed to undo check-in',
		);
	});

	it('returns the fallback for a non-Error value', () => {
		expect(attendeeMutationErrorMessage('nope', 'Check-in failed')).toBe('Check-in failed');
	});
});
