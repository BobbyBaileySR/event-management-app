/**
 * Attendee presentation adapter — the single place that turns a `SliceAttendee`'s
 * name fields into display strings. Previously re-authored in four views with three
 * subtly different algorithms (architecture review candidate 8); keep it here so the
 * display of a name/initials never drifts between screens.
 */

export interface AttendeeName {
	firstName: string;
	lastName: string;
}

/** Full display name, e.g. "Jane Doe". Trims so a missing part doesn't leave a stray space. */
export function attendeeName(person: AttendeeName): string {
	return `${person.firstName} ${person.lastName}`.trim();
}

/** Two-letter initials from first + last name, uppercased. Falls back to "?" when empty. */
export function attendeeInitials(person: AttendeeName): string {
	const first = person.firstName.trim().charAt(0);
	const last = person.lastName.trim().charAt(0);
	return `${first}${last}`.toUpperCase() || '?';
}

/**
 * Initials from an already-combined display name (used where only a single `name`
 * string is available, e.g. an `AttendeePreview`). Falls back to "?" when empty.
 */
export function initialsFromName(name: string): string {
	const parts = name.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) {
		return '?';
	}
	const first = parts[0]?.charAt(0) ?? '';
	const last = parts.length > 1 ? (parts[parts.length - 1]?.charAt(0) ?? '') : '';
	return `${first}${last}`.toUpperCase() || '?';
}
