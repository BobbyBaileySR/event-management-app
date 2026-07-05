/** HubSpot property presets — keep in sync with Frontend/docs/hubspot-schema.md */
export const ATTENDANCE_PROPERTY_PRESETS = [
	'atlassian_event__customer_event_attendance',
	'atlassian_event__partner_event_attendance',
	'atlassian_event__vip_event_attendance',
] as const;

export function suggestAttendanceProperty(eventName: string): string {
	const lower = eventName.toLowerCase();
	if (lower.includes('vip')) {
		return 'atlassian_event__vip_event_attendance';
	}
	if (lower.includes('partner')) {
		return 'atlassian_event__partner_event_attendance';
	}
	return 'atlassian_event__customer_event_attendance';
}

/** Parse comma or newline separated form IDs from admin input */
export function parseFormIdsInput(raw: string): string[] {
	return raw
		.split(/[\n,]+/)
		.map((id) => id.trim())
		.filter(Boolean);
}

export function formatFormIdsInput(ids: string[]): string {
	return ids.join('\n');
}
