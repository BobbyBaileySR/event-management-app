# Feature Specification: Live Event Conversation Notes

**Feature Branch**: `015-conversation-notes`

**Created**: 2026-07-21

**Status**: Draft — design settled via `grill-with-docs` (2026-07-21) plus a follow-on 5-item gap review, not yet built. AI transcription explicitly out of scope for this spec.

**Input**: User description: "A new menu item to store conversation notes that happen at the event against an attendee, that are included as notes on the Lead. Reuse the check-in process — a list of checked-in attendees, with an option to scan a QR code to find one. Selecting an attendee, or scanning their QR code, opens a modal with basic information and the option to add notes. Support old-fashioned typing, with AI transcription to be explored later. Notes are stored against the attendee, associated with who captured them, visible on the attendee modal, and follow through as notes when the Lead is created."

> Grounded in [ADR-019](../../docs/decisions/019-live-event-conversation-notes.md) — see that ADR for the full rationale and rejected alternatives. This spec restates its settled decisions as testable requirements; it does not re-derive them. Depends on [014-lead-generation](../014-lead-generation/spec.md) (the Lead this feature's notes flow into).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Find a checked-in attendee to talk to (Priority: P1) 🎯 Foundation

A staff member at an event opens a dedicated screen showing everyone currently checked in, and either picks a person from the list or scans their QR code to pull up their basic information.

**Why this priority**: Nothing else in this feature works without a way to find the right person first.

**Independent Test**: Can be fully tested by opening the screen, confirming it lists only checked-in attendees (not everyone registered), and confirming both picking a row and scanning a QR code land on the same person's information.

**Acceptance Scenarios**:

1. **Given** several attendees are checked in and others are registered but not yet arrived, **When** staff open this screen, **Then** only the checked-in attendees appear in the list.
2. **Given** staff scan a checked-in attendee's QR code, **When** the scan completes, **Then** that same attendee's information opens — without that scan being recorded as a check-in event, since they're already checked in.

---

### User Story 2 - Capture a note about the conversation (Priority: P1)

While or after talking with an attendee, staff type a note about the conversation, which is saved against that attendee and attributed to whoever wrote it.

**Why this priority**: This is the core value of the feature — everything else supports getting a note written down and kept.

**Independent Test**: Can be fully tested by writing a note for an attendee and confirming it's saved, visible afterward, timestamped, and shows who wrote it.

**Acceptance Scenarios**:

1. **Given** staff are viewing an attendee's information, **When** they type and save a note, **Then** it's stored against that attendee, timestamped, and attributed to the staff member who wrote it.
2. **Given** an attendee already has one or more notes, **When** staff view their information again, **Then** every previous note is still visible, most recent context easy to find.

---

### User Story 3 - Correct a mistaken note (Priority: P2)

A note was misattributed to the wrong person, or has an error — any staff member with access, not just the original author, can fix or remove it, and the fact that it was changed is never hidden.

**Why this priority**: Mistakes happen, especially at a busy event — without this, an error or a note attached to the wrong person is stuck there permanently, potentially attached to the wrong person's record indefinitely.

**Independent Test**: Can be fully tested by editing a note (confirming both the old and new content remain knowable) and by removing a note (confirming it no longer appears in the normal view, without needing to be the person who originally wrote it).

**Acceptance Scenarios**:

1. **Given** a note contains an error, **When** any authorized staff member edits it, **Then** the corrected content is shown going forward, and what the note said before the edit and who made the change remain knowable.
2. **Given** a note was attached to the wrong attendee or is otherwise no longer wanted, **When** any authorized staff member removes it, **Then** it no longer appears in the normal view, but the fact that it existed and was removed is not silently erased.
3. **Given** the staff member who originally wrote a note is unavailable, **When** someone else needs to correct or remove that note, **Then** they are able to, the same as they would for a note they wrote themselves.

---

### User Story 4 - Notes reach the Lead (Priority: P2)

When staff generate or update a Lead for an attendee, every conversation note captured for them that hasn't already been sent is carried over as its own separate entry on the Lead, so a salesperson can see exactly what was discussed, not just a summary.

**Why this priority**: This is the stated reason the feature exists — capturing notes has limited value if they never reach the people who'd act on them.

**Independent Test**: Can be fully tested by capturing two notes for an attendee, generating a Lead, confirming both notes appear as separate entries on the Lead, then capturing a third note and regenerating — confirming only the new one is added, not a repeat of the first two.

**Acceptance Scenarios**:

1. **Given** an attendee has one or more captured notes, **When** staff generate a Lead for them, **Then** each note appears as its own separate entry on the Lead, not merged into one block of text.
2. **Given** a Lead has already been generated once for an attendee, **When** staff generate it again after a new note is captured, **Then** only the new note is added — previously-sent notes are not duplicated.
3. **Given** a note is edited or removed after it has already reached a Lead, **When** that Lead is viewed afterward, **Then** the previously-sent version remains as it was sent — this system does not attempt to reach back and change or remove it.

---

### User Story 5 - See everything said across every event (Priority: P3)

By default, staff see only the notes captured for the event they're currently working — but they can choose to expand the view to see everything ever noted about that attendee, across every event they've attended.

**Why this priority**: A genuine enhancement for attendees seen at multiple events, but the default single-event view already delivers this feature's core value; this is a widening of scope, not the foundation.

**Independent Test**: Can be fully tested by capturing notes for the same attendee across two different events, confirming only the current event's notes show by default, and confirming the expanded view shows both.

**Acceptance Scenarios**:

1. **Given** an attendee has notes from more than one event, **When** staff view their information normally, **Then** only the current event's notes appear.
2. **Given** the same situation, **When** staff choose to expand the view, **Then** notes from every event appear together.

---

### Edge Cases

- What happens when a note is misattributed to the wrong attendee entirely? Covered above — any authorized staff member can remove it (User Story 3, scenario 2), even though it doesn't move it to the correct attendee automatically.
- What happens when the original author of a note is no longer available to fix it? Covered above — any authorized staff member can still correct or remove it (User Story 3, scenario 3).
- What happens if a note is changed after already being sent to a Lead? Covered above — the Lead keeps what was sent at the time; this system does not reach back to update it (User Story 4, scenario 3).
- What happens when staff scan a QR code for someone who isn't actually checked in yet? Not the intended flow for this screen — this screen exists to find people already at the event to talk to; the underlying scan mechanism itself does not require checked-in status to resolve to a person, but this screen's list only ever shows checked-in attendees.
- What happens when someone views an attendee's notes but there are none yet? A clear "nothing recorded yet" state, not an empty-looking or broken-looking screen.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a dedicated screen, separate from existing check-in tooling, showing only attendees currently checked in for the event.
- **FR-002**: System MUST let staff find a specific checked-in attendee either by choosing them from that list or by scanning their QR code.
- **FR-003**: Scanning a checked-in attendee's QR code on this screen MUST NOT record a new check-in event — the person is already checked in; this screen only looks them up.
- **FR-004**: System MUST let staff write and save a free-text note about an attendee, recording who wrote it and when.
- **FR-005**: System MUST show every previously captured note for an attendee when staff view their information.
- **FR-006**: System MUST let any authorized staff member — not only the original author — edit or remove any note.
- **FR-007**: When a note is edited, System MUST retain what it said before the edit and who made the change, not just the new content.
- **FR-008**: When a note is removed, System MUST NOT permanently destroy the record of it having existed — it must simply no longer appear in the normal view.
- **FR-009**: System MUST record who viewed an attendee's notes and when, consistent with how this system already tracks access to a person's information beyond the most basic, routine level.
- **FR-010**: System MUST default the notes shown for an attendee to the current event only, and MUST offer staff an explicit option to see notes across every event that attendee has been part of.
- **FR-011**: When a Lead is generated or updated for an attendee, System MUST carry over every note not yet sent to that Lead, each as its own distinct entry — not merged into a single block.
- **FR-012**: System MUST NOT resend a note to a Lead it has already been sent to, even across multiple Lead generations for the same attendee.
- **FR-013**: System MUST NOT attempt to update or remove a previously-sent note's record on a Lead if that note is later edited or removed within this system — the two are allowed to diverge; this is a known, accepted limitation, not an error condition.
- **FR-014**: System MUST NOT let anyone outside the existing staff-admin access level use this feature — no new, broader access is introduced.
- **FR-015**: System MUST NOT provide any audio recording or automated transcription capability in this iteration — note capture is text entry only.

### Key Entities

- **Conversation note**: A staff-authored, free-text record of a conversation with an attendee at a specific event, timestamped and attributed to its author. Editable and removable (not permanently destroyed, just hidden) by any authorized staff member, with a record of who made each change.
- **Note view**: The act of a staff member looking at an attendee's notes — tracked as an access event, separate from the more routine, lower-sensitivity attendee information already shown elsewhere in this system.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A staff member can find any checked-in attendee and see their information in a few seconds, whether by browsing the list or scanning a QR code.
- **SC-002**: A note written about a conversation is never lost — it remains visible (or, if removed, recoverably known to have existed) indefinitely after being written.
- **SC-003**: Correcting or removing a mistaken note never depends on a specific individual being available to do it — any authorized staff member can act.
- **SC-004**: 100% of an attendee's not-yet-sent notes reach their Lead as individually distinct entries the next time a Lead is generated for them, with zero duplicates across repeated generations.
- **SC-005**: Staff can distinguish, at a glance, whether they're viewing one event's notes or an attendee's entire history.

## Assumptions

- This spec is grounded entirely in the already-settled design in [ADR-019](../../docs/decisions/019-live-event-conversation-notes.md) and its 2026-07-21 gap review — decisions made there (checked-in-only list; a split-out, non-check-in-writing QR lookup; reuse of the existing attendee-detail modal with a new section; any-admin edit/delete with tracked identity, not author-locked; soft-delete; a dedicated audited fetch defaulting to this-event-only; accepted HubSpot-sync divergence after the fact; sync only at Lead generation time, never live) are treated as settled inputs here, not re-derived.
- "Authorized staff member" (FR-006 and throughout) means the same access level already used for every other write/PII surface in this system (check-in, attendee lists, catalog admin) — this feature introduces no new or narrower access tier, per ADR-019 decision #1's explicit "watch item, not closed" framing.
- AI transcription is explicitly and entirely out of scope for this spec (FR-015) — it is deferred to its own future specification and design session, pending unresolved consent, third-party data-handling, and retention questions that this system's own design process cannot answer alone.
- The "already sent to a Lead" tracking (FR-012) is an internal bookkeeping concern this system maintains itself — it does not depend on being able to read that state back out of the sales system.
- Coordination work needed on the sales-system side (granting the access needed to create Notes/engagements on a Lead) is tracked separately as operational/coordination work ([hubspot-ops-todo.md](../../docs/hubspot-ops-todo.md) `HS-018`) and is out of scope for this spec's functional requirements, which cover only this system's own behavior once that access exists.
