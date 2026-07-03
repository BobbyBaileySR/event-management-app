/** CSS class suffix for status badges (events and attendees). */
export function statusBadgeClass(status: string): string {
	const map: Record<string, string> = {
		active: 'badge--active',
		draft: 'badge--draft',
		cancelled: 'badge--cancelled',
		completed: 'badge--draft',
		Registered: 'badge--registered',
		'Checked In': 'badge--checked-in',
		Cancelled: 'badge--cancelled',
	};
	return map[status] ?? 'badge--draft';
}

export function formatDateTime(iso: string): string {
	return new Intl.DateTimeFormat(undefined, {
		dateStyle: 'medium',
		timeStyle: 'short',
	}).format(new Date(iso));
}

export function capitalizeStatus(status: string): string {
	if (!status) {
		return '';
	}
	return status.charAt(0).toUpperCase() + status.slice(1);
}
