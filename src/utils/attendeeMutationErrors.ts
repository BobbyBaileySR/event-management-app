/**
 * Friendly, user-facing messages for the shared attendee/check-in mutation error codes
 * the backend returns (`confirmCheckIn` / `undoCheckIn` / `removeAttendee`).
 *
 * Previously each view hand-mapped these inline, and the copies had drifted — `AttendeesView`
 * translated `contact_not_registered` while `CheckInView`'s undo path did not (architecture
 * review candidate 4). One mapper keeps the messages consistent across Check-in and Attendees.
 */
export function attendeeMutationErrorMessage(error: unknown, fallback: string): string {
	if (error instanceof Error) {
		switch (error.message) {
			case 'attendee_checked_in':
				return 'This attendee is checked in — undo check-in before removing.';
			case 'contact_not_registered':
				return 'This attendee is no longer registered.';
			default:
				break;
		}
	}
	return fallback;
}
