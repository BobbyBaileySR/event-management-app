import { useCallback, useEffect, useState } from 'react';
import { useConfirm } from './ConfirmModal';
import { useDataService } from '../hooks/useDataService';
import { useToast } from './Toast';
import type { ConversationNoteEntry } from '../types';
import { formatDateTime } from '../utils/format';
import { LoadingState } from './LoadingState';
import styles from './ConversationNotesPanel.module.css';

/** `compose` — add/edit/delete + history (Conversations). `history` — read-only list (Registered Attendees). */
export type ConversationNotesPanelMode = 'compose' | 'history';

export interface ConversationNotesPanelProps {
	eventId: string;
	contactId: string;
	headingId: string;
	mode?: ConversationNotesPanelMode;
}

/**
 * Notes section (015-conversation-notes, US2/US3/US5; ADR-019 decisions #4/#5/#6) — a flat
 * `<section>` matching the modal's existing non-tabbed pattern (Basic Information / Attendee
 * Journey / Registration history). Any signed-in admin viewing this panel may edit or delete any
 * note here — deliberately **not** gated to the original author client-side, matching the
 * server's intentionally open policy (any admin, tracked by editor identity, not restricted by
 * it). Note content is staff-authored free text — rendered with JSX `{text}` only, never
 * `dangerouslySetInnerHTML`.
 *
 * `mode="history"` (Registered Attendees) hides the add form and per-note edit/delete controls;
 * `mode="compose"` (Conversations) keeps the full capture UI.
 */
export function ConversationNotesPanel({
	eventId,
	contactId,
	headingId,
	mode = 'compose',
}: ConversationNotesPanelProps) {
	const allowCompose = mode === 'compose';
	const data = useDataService();
	const { showToast } = useToast();
	const { confirm } = useConfirm();

	const [notes, setNotes] = useState<ConversationNoteEntry[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [allEvents, setAllEvents] = useState(false);

	const [newContent, setNewContent] = useState('');
	const [submitting, setSubmitting] = useState(false);

	const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
	const [editContent, setEditContent] = useState('');
	const [savingEdit, setSavingEdit] = useState(false);

	const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);

	const loadNotes = useCallback(
		(scope: boolean) => {
			let cancelled = false;
			setLoading(true);
			setError(null);
			data
				.fetchAttendeeNotes(eventId, contactId, { allEvents: scope })
				.then((result) => {
					if (!cancelled) {
						setNotes(result.notes);
					}
				})
				.catch((err: unknown) => {
					if (!cancelled) {
						setError(err instanceof Error ? err.message : 'Failed to load notes');
					}
				})
				.finally(() => {
					if (!cancelled) {
						setLoading(false);
					}
				});
			return () => {
				cancelled = true;
			};
		},
		[data, eventId, contactId],
	);

	useEffect(() => loadNotes(allEvents), [loadNotes, allEvents]);

	async function handleAddNote() {
		const content = newContent.trim();
		if (!content || submitting) {
			return;
		}
		setSubmitting(true);
		try {
			const created = await data.createAttendeeNote(eventId, contactId, content);
			setNotes((current) => [created, ...current]);
			setNewContent('');
			showToast('Note added', 'success');
		} catch (err: unknown) {
			showToast(err instanceof Error ? err.message : 'Failed to add note', 'error');
		} finally {
			setSubmitting(false);
		}
	}

	function startEdit(note: ConversationNoteEntry) {
		setEditingNoteId(note.noteId);
		setEditContent(note.content);
	}

	function cancelEdit() {
		setEditingNoteId(null);
		setEditContent('');
	}

	async function handleSaveEdit(noteId: string) {
		const content = editContent.trim();
		if (!content || savingEdit) {
			return;
		}
		setSavingEdit(true);
		try {
			const updated = await data.updateAttendeeNote(eventId, contactId, noteId, content);
			setNotes((current) => current.map((note) => (note.noteId === noteId ? updated : note)));
			setEditingNoteId(null);
			setEditContent('');
			showToast('Note updated', 'success');
		} catch (err: unknown) {
			showToast(err instanceof Error ? err.message : 'Failed to update note', 'error');
		} finally {
			setSavingEdit(false);
		}
	}

	async function handleDelete(note: ConversationNoteEntry) {
		const confirmed = await confirm({
			title: 'Delete note?',
			message: 'This note will be removed from view. This cannot be undone by you later.',
			confirmLabel: 'Delete',
			cancelLabel: 'Cancel',
		});
		if (!confirmed) {
			return;
		}
		setDeletingNoteId(note.noteId);
		try {
			await data.deleteAttendeeNote(eventId, contactId, note.noteId);
			setNotes((current) => current.filter((existing) => existing.noteId !== note.noteId));
			showToast('Note deleted', 'success');
		} catch (err: unknown) {
			showToast(err instanceof Error ? err.message : 'Failed to delete note', 'error');
		} finally {
			setDeletingNoteId(null);
		}
	}

	return (
		<section aria-labelledby={headingId}>
			<div className={styles.header}>
				<h4 id={headingId} className={styles.sectionTitle}>
					Notes
				</h4>
				<label className={styles.allEventsToggle}>
					<input
						type="checkbox"
						checked={allEvents}
						onChange={(changeEvent) => setAllEvents(changeEvent.target.checked)}
					/>
					Show notes from all events
				</label>
			</div>

			{allowCompose ? (
				<div className={styles.addForm}>
					<label htmlFor={`${headingId}-new-note`} className="sr-only">
						Add a note
					</label>
					<textarea
						id={`${headingId}-new-note`}
						className={styles.textarea}
						placeholder="Write a note about this conversation…"
						value={newContent}
						onChange={(changeEvent) => setNewContent(changeEvent.target.value)}
						rows={3}
					/>
					<button
						type="button"
						className="btn btn-primary btn-sm"
						onClick={() => void handleAddNote()}
						disabled={submitting || !newContent.trim()}
						aria-busy={submitting}
					>
						{submitting ? 'Saving…' : 'Save note'}
					</button>
				</div>
			) : null}

			{loading ? <LoadingState message="Loading notes…" variant="inline" /> : null}

			{!loading && error ? (
				<div className={styles.errorBlock}>
					<p role="alert" className={styles.errorMessage}>
						{error}
					</p>
					<button type="button" className="btn btn-outline btn-sm" onClick={() => loadNotes(allEvents)}>
						Try again
					</button>
				</div>
			) : null}

			{!loading && !error && notes.length === 0 ? (
				<p className={styles.empty}>No notes recorded yet.</p>
			) : null}

			{!loading && !error && notes.length > 0 ? (
				<ol className={styles.list}>
					{notes.map((note) => (
						<li key={note.noteId} className={styles.entry}>
							{editingNoteId === note.noteId ? (
								<div className={styles.editForm}>
									<label htmlFor={`${headingId}-edit-${note.noteId}`} className="sr-only">
										Edit note
									</label>
									<textarea
										id={`${headingId}-edit-${note.noteId}`}
										className={styles.textarea}
										value={editContent}
										onChange={(changeEvent) => setEditContent(changeEvent.target.value)}
										rows={3}
									/>
									<div className={styles.editActions}>
										<button
											type="button"
											className="btn btn-primary btn-sm"
											onClick={() => void handleSaveEdit(note.noteId)}
											disabled={savingEdit || !editContent.trim()}
											aria-busy={savingEdit}
										>
											{savingEdit ? 'Saving…' : 'Save'}
										</button>
										<button type="button" className="btn btn-outline btn-sm" onClick={cancelEdit} disabled={savingEdit}>
											Cancel
										</button>
									</div>
								</div>
							) : (
								<>
									<div className={styles.entryMeta}>
										<span className={styles.entryAuthor}>{note.authorEmail}</span>
										<span className={styles.entryTimestamp}>{formatDateTime(note.createdAt)}</span>
										{allEvents && note.eventId !== eventId ? (
											<span className="badge">Other event</span>
										) : null}
										{note.editHistory.length > 0 ? <span className={styles.editedTag}>Edited</span> : null}
									</div>
									<p className={`${styles.content}${allowCompose ? ` ${styles.contentWithActions}` : ''}`}>
										{note.content}
									</p>
									{allowCompose ? (
										<div className={styles.entryActions}>
											<button type="button" className="btn btn-outline btn-sm" onClick={() => startEdit(note)}>
												Edit
											</button>
											<button
												type="button"
												className="btn btn-outline btn-sm"
												onClick={() => void handleDelete(note)}
												disabled={deletingNoteId === note.noteId}
												aria-busy={deletingNoteId === note.noteId}
											>
												{deletingNoteId === note.noteId ? 'Deleting…' : 'Delete'}
											</button>
										</div>
									) : null}
								</>
							)}
						</li>
					))}
				</ol>
			) : null}
		</section>
	);
}
