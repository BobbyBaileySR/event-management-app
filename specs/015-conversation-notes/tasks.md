---
description: "Task list for Live Event Conversation Notes (015-conversation-notes)"
---

# Tasks: Live Event Conversation Notes

**Input**: Design documents from `/specs/015-conversation-notes/`

**Prerequisites**: [plan.md](./plan.md) · [spec.md](./spec.md) · [research.md](./research.md) · [data-model.md](./data-model.md) · [contracts/](./contracts/) · `003-check-in`, `010-attendee-detail-modal`, `014-lead-generation` already shipped

**Tests**: Included — per the repo-root testing discipline.

**Organization**: Five user stories from spec.md. Note that **US1 (find a checked-in attendee) has no dependency on the note-storage Foundational phase at all** — it only needs the existing attendees route (already supports `checkedIn`, research.md R-003) and a new, standalone lookup handler. It can be built fully in parallel with Foundational, not after it.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story label (US1–US5)

## Path Conventions

- **Backend**: `Backend/scripts/`, `Backend/node/tests/`
- **Frontend**: `Frontend/src/`, `Frontend/docs/`

---

## Phase 1: Setup

- [X] T001 Confirm `003-check-in`, `010-attendee-detail-modal`, `014-lead-generation` are deployed and passing, per `specs/015-conversation-notes/quickstart.md` Prerequisites
- [X] T002 [P] Review all design artifacts in `specs/015-conversation-notes/` and [ADR-019](../../docs/decisions/019-live-event-conversation-notes.md)
- [X] T003 [P] Pin the conversation-note storage key format (`ems-convnotes-{eventId}--{contactId}`, data-model.md) and confirm `verifyCheckInJwt`/`getContactSummary` need no refactor before use (research.md R-001) as code comments ahead of implementation — **done (2026-07-21):** key format pinned in `ConversationNoteStore.ts`'s own docstring; `verifyCheckInJwt`/`getContactSummary`-need-no-refactor confirmation was done in the earlier US1 session (`OnGetAttendeeLookup.ts`)

**Checkpoint**: No open decisions remain before Foundational/US1 work starts.

---

## Phase 2: Foundational (Blocking Prerequisites for US2–US5 only)

**Purpose**: `ConversationNoteStore`'s add/edit/soft-delete/sync-tracking/cross-event-read logic — everything except US1 depends on this.

- [X] T004 Implement `add(eventId, contactId, content, authorEmail)` in `Backend/scripts/Utils/Platform/ConversationNoteStore.ts` — composes `KeyValueStore.ts` per ADR-006 — depends on T003
- [X] T005 Implement `edit(eventId, contactId, noteId, newContent, editorEmail)` — appends the note's *previous* content + editor identity + timestamp to `editHistory` before applying the new content — depends on T004
- [X] T006 Implement `softDelete(eventId, contactId, noteId, deleterEmail)` — sets `softDeleted`, idempotent on an already-deleted note — depends on T004
- [X] T007 Implement `get(eventId, contactId, { allEvents })` — default reads only this event's key; `allEvents: true` additionally queries every other event-keyed entry for the same `contactId` and merges; excludes `softDeleted` entries either way — depends on T004
- [X] T008 Implement `getUnsynced(eventId, contactId)` and `markSynced(eventId, contactId, noteId, syncedAt)` — depends on T004

### Foundation tests

- [X] T009 [P] Create `Backend/node/tests/ConversationNoteStore.test.ts` — add; edit retains prior content + editor identity in `editHistory`; soft-delete hides an entry from `get()` without removing it from storage; `allEvents` merges across events, excluding soft-deleted entries; `getUnsynced` returns only entries with `syncedToLeadAt: null`; `markSynced` excludes an entry from future `getUnsynced` calls — depends on T004-T008

**Checkpoint**: Store behavior proven in isolation before any route or UI depends on it.

---

## Phase 3: User Story 1 — Find a checked-in attendee to talk to (Priority: P1) 🎯 Foundation

**Goal**: A new screen lists checked-in attendees and supports finding one via QR scan, without writing a check-in.

**Independent Test**: `specs/015-conversation-notes/quickstart.md` §B1.

**No dependency on Phase 2** — can be built in parallel.

### Tests for User Story 1

- [X] T010 [P] [US1] Create `Backend/node/tests/OnGetAttendeeLookup.test.ts` — resolves a valid JWT to the right contact via the existing `verifyCheckInJwt`/`getContactSummary`; **never calls `OnCheckIn.ts`'s write path**; **produces no `checkin.scan` audit entry** — both asserted explicitly
- [X] T017 [P] [US1] Create `Frontend/src/views/ConversationsView.test.tsx` — checked-in-only filtering (compares against a mixed registered/checked-in fixture); QR scan resolves to the right attendee with no check-in side effect

### Implementation for User Story 1

- [X] T011 [US1] Create `Backend/scripts/OnGetAttendeeLookup.ts` — reuses `verifyCheckInJwt` (`Utils/CheckInJwt.ts`) and `CustomObjectAdapter.getContactSummary` directly, no `checkin.scan` audit call (research.md R-001/R-002) — depends on T010
- [X] T012 [US1] Register `POST events/:eventId/attendees/lookup` in `Backend/scripts/Utils/Routes.ts`, `roles: ['admin']` — depends on T011
- [X] T013 [P] [US1] Add `lookupAttendeeByQr(eventId, jwt)` to `Frontend/src/services/dataService.ts`
- [X] T014 [US1] Create `Frontend/src/views/ConversationsView.tsx` — calls the **existing** `fetchEventAttendees` with `checkedIn: true` (no new list route, research.md R-003), reuses `CheckInQrPanel.tsx` unmodified for scanning — depends on T013
- [X] T015 [US1] Add the new nav item ("Conversations" or similar) routing to `ConversationsView.tsx` — depends on T014
- [X] T016 [P] [US1] Document the lookup route and new nav route in `Frontend/docs/api-contract.md`, `docs/rbac.md`, `docs/ui-routes.md`

**Checkpoint**: US1 fully functional and independently testable — quickstart §B1 passes, with zero notes-related code involved.

---

## Phase 4: User Story 2 — Capture a note about the conversation (Priority: P1)

**Goal**: Staff can view and add notes for an attendee from the (now-reusable) Attendee Detail modal.

**Independent Test**: `specs/015-conversation-notes/quickstart.md` §B2.

### Tests for User Story 2

- [X] T018 [P] [US2] Create `Backend/node/tests/OnGetAttendeeNotes.test.ts` + `OnPostAttendeeNote.test.ts` — RBAC; `attendee.notes.view`/`attendee.note.create` audit entries with no note content in metadata; default (non-`allEvents`) scope returns only this event's notes

### Implementation for User Story 2

- [X] T019 [US2] Create `Backend/scripts/OnGetAttendeeNotes.ts` (`GET`, `allEvents` query param defaulting `false`) — depends on T007
- [X] T020 [US2] Create `Backend/scripts/OnPostAttendeeNote.ts` — depends on T004
- [X] T021 [US2] Register both routes in `Utils/Routes.ts`, `roles: ['admin']` — depends on T019, T020
- [X] T022 [US2] Add `attendee.notes.view` / `attendee.note.create` audited actions in `Utils/Audit.ts` — depends on T019, T020
- [X] T023 [P] [US2] Add `fetchAttendeeNotes(eventId, contactId, { allEvents? })` and `createAttendeeNote(...)` to `dataService.ts`
- [X] T024 [US2] Add a "Notes" section to `Frontend/src/components/AttendeeDetailModal.tsx` — list of existing notes + an add-note form — depends on T023
- [X] T025 [P] [US2] Document both routes in `api-contract.md`/`rbac.md`
- [X] T026 [P] [US2] Extend `AttendeeDetailModal.test.tsx` — Notes section renders captured notes; add-note flow; hostile-string guard on note content display (staff-authored, but still rendered back to other staff as plain text)

**Checkpoint**: US1 + US2 independently functional — quickstart §B1/§B2 pass. This is the feature's core value.

---

## Phase 5: User Story 3 — Correct a mistaken note (Priority: P2)

**Goal**: Any admin — not only the original author — can edit or soft-delete any note, with the change tracked.

**Independent Test**: `specs/015-conversation-notes/quickstart.md` §B3 — using two genuinely different admin accounts.

### Tests for User Story 3

- [X] T027 [P] [US3] Create `Backend/node/tests/OnPatchAttendeeNote.test.ts` + `OnDeleteAttendeeNote.test.ts` — **an admin who is not the original author can edit/delete** (explicit test with a second identity, not just "an admin can"); edit retains previous content + editor identity in `editHistory`; delete is idempotent and hides rather than destroys; audit entries carry no note content

### Implementation for User Story 3

- [X] T028 [US3] Create `Backend/scripts/OnPatchAttendeeNote.ts` — depends on T005
- [X] T029 [US3] Create `Backend/scripts/OnDeleteAttendeeNote.ts` — depends on T006
- [X] T030 [US3] Register both routes in `Utils/Routes.ts` — depends on T028, T029
- [X] T031 [US3] Add `attendee.note.update` / `attendee.note.delete` audited actions — depends on T028, T029
- [X] T032 [P] [US3] Add `updateAttendeeNote(...)` / `deleteAttendeeNote(...)` to `dataService.ts`
- [X] T033 [US3] Add edit/delete controls to the Notes section UI — available to any signed-in admin viewing the note, **not** gated client-side to the original author (matching the server's intentionally open policy) — depends on T032
- [X] T034 [P] [US3] Document both routes in `api-contract.md`/`rbac.md`
- [X] T035 [P] [US3] Extend `AttendeeDetailModal.test.tsx` — a *different* admin identity than a note's author can edit/delete it through the UI, not just via a direct API test

**Checkpoint**: US1 + US2 + US3 independently functional — quickstart §B3 passes, proving the no-author-lock property end-to-end, not just at the API layer.

---

## Phase 6: User Story 4 — Notes reach the Lead (Priority: P2)

**Goal**: Generating/regenerating a Lead pushes every not-yet-synced note as its own HubSpot Note, never resending already-synced ones.

**Independent Test**: `specs/015-conversation-notes/quickstart.md` §B4.

### Tests for User Story 4

- [X] T036 [P] [US4] Extend `Backend/node/tests/LeadAdapter.test.ts` (`014-lead-generation`) — pushes only `syncedToLeadAt: null` entries as individual HubSpot Notes; marks each pushed entry synced; a second generation does not resend already-synced notes; a note edited or soft-deleted after its `syncedToLeadAt` was set is not reconciled with HubSpot in any way (accepted limitation, spec FR-013)

### Implementation for User Story 4

- [X] T037 [US4] Extend `LeadAdapter.createOrUpdateLead` (`014`, `BE-LEAD-001`) to call `ConversationNoteStore.getUnsynced` for the current `{eventId, contactId}`, push each as its own HubSpot Note, then `markSynced` — depends on T008 and `014`'s existing `LeadAdapter`

**Checkpoint**: US1-US4 independently functional — quickstart §B4 passes.

---

## Phase 7: User Story 5 — See everything across every event (Priority: P3)

**Goal**: An opt-in toggle expands the Notes section to every event's notes for that attendee, tagged by event.

**Independent Test**: `specs/015-conversation-notes/quickstart.md` §B5.

### Tests for User Story 5

- [X] T038 [P] [US5] Extend `Backend/node/tests/OnGetAttendeeNotes.test.ts` — `allEvents=true` returns notes from every event for the contact, each tagged with its own `eventId`; default (`allEvents` absent/`false`) still returns only the current event's notes

### Implementation for User Story 5

- [X] T039 [US5] Add a "show all events" toggle to `AttendeeDetailModal.tsx`'s Notes section, passing `allEvents` through to the existing fetch (T023/T024) — depends on T024

**Checkpoint**: All five user stories independently functional — the full feature is complete.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [X] T040 [P] Update `Backend/CHANGELOG.md` and `Frontend/CHANGELOG.md` with the shipped behaviour once Phases 2-7 land
- [X] T041 [P] Move `FE-NOTES-001`, `BE-NOTES-001`/`002`/`003`/`004` from `planned` to `done` in the respective `TODO.md` files — landed as **`done-pending-QA`** (repo convention for this table, matching `BE-LEAD-001`/`BE-REGFORM-001`), since quickstart.md §C operator sign-off and `HS-018` still remain
- [X] T042 Run `specs/015-conversation-notes/quickstart.md` §A (automated tests) — Backend 7 suites/72 tests green, Frontend 2 files/33 tests green, `tsc --noEmit && vite build` clean, `npm run lint:fix` clean both sides
- [ ] T043 Run `specs/015-conversation-notes/quickstart.md` §C (operator security comfort checks) on UAT once `HS-018` is confirmed for the Lead-sync half — **particular attention to C7.1** (QR lookup never writes a check-in) **and C7.2** (any admin can correct/remove any note) — both are load-bearing safety properties for this feature, not routine checks — **blocked:** needs a live UAT environment + two real admin accounts, not available in this session
- [ ] T044 Request a **specific look at the QR-lookup/no-check-in-write proof and the any-admin access property** as part of the general `/review-security` pass before opening the PR(s) — **not run this session**; recommended as the next step before a PR is opened

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup. **Blocks US2, US3, US4, US5 — but not US1.**
- **User Story 1 (Phase 3)**: Depends on Setup only — can proceed fully in parallel with Foundational.
- **User Story 2 (Phase 4)**: Depends on Foundational.
- **User Story 3 (Phase 5)**: Depends on Foundational **and** US2 (needs the base Notes section/routes to exist before adding edit/delete to them).
- **User Story 4 (Phase 6)**: Depends on Foundational (for `getUnsynced`/`markSynced`) and `014`'s existing `LeadAdapter` — not on US2/US3's UI.
- **User Story 5 (Phase 7)**: Depends on Foundational and US2 (extends its fetch/UI).
- **Polish (Phase 8)**: Depends on all five user stories being complete.

### Parallel Opportunities

- **US1 (Phase 3) can run fully in parallel with Foundational (Phase 2) and everything downstream of it** — genuinely independent, zero file overlap.
- Within Phase 2: T004 → T005/T006/T007/T008 can proceed in parallel once T004 lands (different methods on the same new file, but logically independent) → T009 depends on all.
- US4 (Phase 6) has no file overlap with US2/US3/US5 beyond the shared store — could be built by a third developer in parallel with US2/US3, once Foundational ships.

---

## Parallel Example: Phases 2/3 and 4 together (two developers)

```bash
# Developer A — User Story 1, independent of everything else:
Task: "Create Backend/scripts/OnGetAttendeeLookup.ts reusing verifyCheckInJwt + getContactSummary"
Task: "Create Frontend/src/views/ConversationsView.tsx using the existing checkedIn=true filter"

# Developer B — Foundational then User Story 2, in sequence:
Task: "Implement ConversationNoteStore.ts (add/edit/softDelete/get/getUnsynced/markSynced)"
Task: "Create OnGetAttendeeNotes.ts / OnPostAttendeeNote.ts, add the Notes section to AttendeeDetailModal.tsx"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Complete Phase 1: Setup
2. Complete Phase 3 (US1) and Phase 2 (Foundational) in parallel
3. Complete Phase 4 (US2)
4. **STOP and VALIDATE**: staff can find someone and write a note — the feature's core value, even without correction (US3), Lead sync (US4), or cross-event view (US5)

### Incremental Delivery

1. Setup + (Foundational ∥ US1) → both ready together.
2. US2 → core value delivered → validate independently.
3. US3 → correction/safety property added and proven with two admin identities → validate independently.
4. US4 → the connecting piece to Lead generation → validate independently.
5. US5 → cross-event enhancement, lowest priority → validate independently.
6. Ship Phase 8 (tests, docs, sign-off) once all five are complete — Lead-sync's live end-to-end testing additionally waits on `HS-018`, same as `014`.

### Parallel Team Strategy

With two developers: Developer A takes US1 (fully independent) while Developer B builds Foundational then US2 — no coordination needed until US3 (which needs US2's UI to extend). A third developer could take US4 in parallel with US2/US3 once Foundational ships.

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- **US1 is the one story in this feature with zero dependency on the Foundational phase** — don't block it behind `ConversationNoteStore` work; it's pure attendee-lookup plumbing.
- T010/T017's "never writes a check-in" and T027's "a *different* admin can edit/delete" assertions are the two highest-stakes correctness properties in this feature — both are explicitly named in this plan's Constitution Check, not left to incidental test coverage.
- Commit after each task or logical group; stop at any checkpoint to validate independently — all five stories can genuinely ship incrementally.
