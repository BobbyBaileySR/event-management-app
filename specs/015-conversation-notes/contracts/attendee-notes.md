# Contract: Attendee conversation notes (fetch + create + edit + delete)

**Status**: Provisional — new routes, not yet built.

**RBAC**: `admin` only for all four routes below. Note: any admin may edit/delete any note — **not** restricted to the original author (ADR-019 decision #5, gap review).

---

## `GET events/{evId}/attendees/{contactId}/notes?allEvents=false`

```json
{
  "notes": [
    { "noteId": "n-1", "content": "Interested in renewal pricing", "authorEmail": "sam@adaptavist.com", "createdAt": "2026-08-01T10:00:00.000Z", "editHistory": [], "eventId": "evt-1" }
  ]
}
```

`allEvents=true` returns notes across every event for this Contact, each entry tagged with its own `eventId` so the UI can show which event a cross-event note came from (mirroring how cross-event communications tag non-current-event items). Soft-deleted notes are excluded.

**Audit**: `attendee.notes.view` — metadata `eventId`, `contactId`, `allEvents`, `count`. Never note content.

**Errors**: `403 forbidden`, `404 contact_not_registered`/`event_not_found`, `429 rate_limited`.

---

## `POST events/{evId}/attendees/{contactId}/notes`

```json
{ "content": "Interested in renewal pricing" }
```

Response `201`: the created `ConversationNoteEntry`.

**Audit**: `attendee.note.create` — metadata `eventId`, `contactId`, `noteId`. Never content.

---

## `PATCH events/{evId}/attendees/{contactId}/notes/{noteId}`

```json
{ "content": "Interested in renewal pricing — wants a call next week" }
```

Server appends the note's *previous* content + the acting admin's identity + timestamp to `editHistory` before applying the new content. Response `200`: the updated entry, including `editHistory`.

**Errors**: `404 note_not_found` if `noteId` doesn't exist or is already soft-deleted.

**Audit**: `attendee.note.update` — metadata `eventId`, `contactId`, `noteId`, editor identity. Never content (old or new).

---

## `DELETE events/{evId}/attendees/{contactId}/notes/{noteId}`

Sets `softDeleted`. Response `204`. Idempotent — deleting an already-deleted note is a no-op success, not an error.

**Audit**: `attendee.note.delete` — metadata `eventId`, `contactId`, `noteId`, deleter identity.
