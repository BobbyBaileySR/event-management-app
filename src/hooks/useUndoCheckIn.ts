import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { invalidateAfterAttendeeMutation } from '../data/invalidation';
import type { AttendeeName } from '../utils/attendeePresentation';
import { attendeeName } from '../utils/attendeePresentation';
import { attendeeMutationErrorMessage } from '../utils/attendeeMutationErrors';
import { useDataService } from './useDataService';
import { useToast } from '../components/Toast';

/**
 * Shared "undo check-in" orchestration — CheckInView and AttendeesView both used to hand-roll
 * their own copy of the call → toast → refresh sequence (architecture review candidate 7).
 * Each view still owns whether/how it shows its own confirm dialog, and any view-specific
 * reaction to success (e.g. CheckInView's optimistic local roster patch + modal close) —
 * only the part that was byte-for-byte identical moved here.
 */
export function useUndoCheckIn(eventId: string | null) {
	const data = useDataService();
	const { showToast } = useToast();
	const queryClient = useQueryClient();
	const [undoingId, setUndoingId] = useState<string | null>(null);

	async function runUndoCheckIn(person: AttendeeName & { contactId: string }): Promise<boolean> {
		if (!eventId) {
			return false;
		}
		const name = attendeeName(person);
		setUndoingId(person.contactId);
		try {
			await data.undoCheckIn(eventId, person.contactId);
			showToast(`${name}: check-in undone.`, 'success');
			await invalidateAfterAttendeeMutation(queryClient, eventId);
			return true;
		} catch (err: unknown) {
			showToast(attendeeMutationErrorMessage(err, 'Failed to undo check-in'), 'error');
			return false;
		} finally {
			setUndoingId(null);
		}
	}

	return { undoingId, runUndoCheckIn };
}
