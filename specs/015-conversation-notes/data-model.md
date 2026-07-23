# Data Model: Live Event Conversation Notes

## ConversationNoteEntry

One per captured note. Stored in a list keyed `{eventId, contactId}` (`Utils/Platform/ConversationNoteStore.ts`).

| Field | Set when | Notes |
| :--- | :--- | :--- |
| `noteId` | Creation | Stable id for edit/delete targeting. |
| `content` | Creation, mutable | Current text — the latest version. |
| `authorEmail` | Creation only | Who originally wrote it — informational, **not** an access restriction (any admin may edit/delete). |
| `createdAt` | Creation only | |
| `editHistory` | Appended on every edit | `{ previousContent, editorEmail, editedAt }[]` — never cleared, proves what changed and who changed it. |
| `softDeleted` | Set on delete | `{ deletedBy, deletedAt } \| null` — hides the entry from normal reads without destroying it. |
| `syncedToLeadAt` | Set after a successful Lead push | `string \| null` — `null` means "not yet sent to any Lead"; once set, this entry is excluded from future pushes (spec FR-012). |

## Storage shape

**Key**: `ems-convnotes-{eventId}--{contactId}` — one key per Contact+Event pair.

**Value**: `{ entries: ConversationNoteEntry[] }`.

**Reads**: default (this-event) reads this one key; an `allEvents` read additionally queries every other event-keyed entry for the same `contactId` (same mechanic already used for registration-answer history's cross-event expansion) and merges, excluding `softDeleted` entries from the normal view either way.

**Writes**: create appends a new entry; edit mutates `content` in place while pushing the prior value onto `editHistory` (no compare-and-swap concern here — an edit is a single, deliberate staff action on one attendee, not a high-concurrency path); soft-delete sets the `softDeleted` field, never removes the entry from the array.

## API routes

### `GET events/{evId}/attendees/{contactId}/lookup?jwt=...` or `POST` with a JWT body (see `contracts/get-attendee-lookup.md`)

Reuses `verifyCheckInJwt` + `getContactSummary` directly (research.md R-001) — no check-in write, no `checkin.scan` audit entry (research.md R-002).

### `GET/POST/PATCH/DELETE events/{evId}/attendees/{contactId}/notes[/{noteId}]` (see `contracts/attendee-notes.md`)

| Field | Direction | Notes |
| :--- | :--- | :--- |
| `allEvents` | GET query param, optional, default `false` | When `true`, returns notes across every event for this Contact, not just `evId`. |
| Audit | Every GET | New `attendee.notes.view` action — metadata: `eventId`, `contactId`, `allEvents`, count — never note content. |
| Audit | Every POST/PATCH/DELETE | `attendee.note.create` / `.update` / `.delete` — metadata includes editor identity, never content. |

### Lead-generation extension (see `contracts/lead-note-sync-delta.md`)

`LeadAdapter.createOrUpdateLead` (`014-lead-generation`, `BE-LEAD-001`) gains a step: after resolving create-vs-update-vs-created_separate, read `ConversationNoteStore` for entries with `syncedToLeadAt: null` (default scope: this event, per ADR-019 decision #6's default), push each as its own HubSpot Note, then set `syncedToLeadAt` on each pushed entry. A note edited or soft-deleted after its `syncedToLeadAt` is set is never re-pushed or retracted (spec FR-013, accepted limitation).
