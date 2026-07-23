import { useEffect, useState } from 'react';

/**
 * Returns `value` after it has stayed unchanged for `delayMs` milliseconds.
 *
 * Replaces the hand-rolled `setTimeout`/`clearTimeout` debounce that was duplicated
 * verbatim across the attendee, check-in, and email-recipient search boxes
 * (architecture review candidate 6) — one place to change the debounce behaviour.
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
	const [debounced, setDebounced] = useState(value);

	useEffect(() => {
		const handle = window.setTimeout(() => setDebounced(value), delayMs);
		return () => window.clearTimeout(handle);
	}, [value, delayMs]);

	return debounced;
}
