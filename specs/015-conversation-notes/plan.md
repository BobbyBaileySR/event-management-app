# Implementation Plan: Live Event Conversation Notes

**Branch**: `015-conversation-notes` | **Date**: 2026-07-21 | **Spec**: [spec.md](./spec.md)

**Input**: `/speckit-plan` — architecture pre-settled in [ADR-019](../../docs/decisions/019-live-event-conversation-notes.md) via a `grill-with-docs` session (2026-07-21) plus a follow-on 5-item gap review, same day.

## Summary

Staff need a way to capture live conversation notes with attendees at an event and have them flow through to a generated Lead. ADR-019 settled the mechanics: a new nav item showing checked-in attendees with list/QR-scan lookup (the QR path reusing existing JWT verification without writing a check-in), a new "Notes" section on the existing Attendee Detail modal fed by its own dedicated, audited fetch, notes editable/soft-deletable by any admin with tracked identity, and a one-way sync into individual HubSpot Notes at Lead-generation time only. This plan covers the Backend storage/routes and the Frontend screen/modal-section that implement it.

**Build order**: Phase 0 confirms the JWT-verification reuse is simpler than originally assumed (no extraction refactor needed) and resolves the notes-fetch's exact route shape → Phase 1 designs the store schema (with soft-delete/edit-history), the three route contracts (list checked-in, notes fetch, note write/edit/delete), and the extension to `014`'s Lead-generation flow → implementation (store → screen/lookup → modal section → Lead-sync extension) → tests → quickstart sign-off (operator security §C, given this is a second PII-read surface with its own audit action, and the correction/no-author-lock mechanism is a real safety property to verify).

## Technical Context

**Language/Version**: TypeScript — Backend: ScriptRunner Connect ECMAScript 2020 + Node 20 (Jest). Frontend: React + Vitest (unchanged toolchain).

**Primary Dependencies**: New `Backend/scripts/Utils/Platform/ConversationNoteStore.ts` (composes `KeyValueStore.ts` per ADR-006); new `Backend/scripts/OnGetAttendeeLookup.ts` (QR/read-only lookup, reuses the existing `verifyCheckInJwt` from `Utils/CheckInJwt.ts` and `CustomObjectAdapter.getContactSummary` — both already reusable as-is, confirmed in research.md R-001, no refactor needed); new `Backend/scripts/OnGetAttendeeNotes.ts` / `OnPostAttendeeNote.ts` / `OnPatchAttendeeNote.ts` / `OnDeleteAttendeeNote.ts`; extends `LeadAdapter.ts` (`014-lead-generation`) to push not-yet-synced notes at generation time. Frontend: new `ConversationsView.tsx` (reuses `CheckInQrPanel.tsx` for scanning, a filtered attendee list), a new "Notes" section added to `AttendeeDetailModal.tsx`.

**Storage**: New Record Storage store, one entry-list per `{eventId, contactId}` — each entry: author, timestamp, content, soft-delete flag, an edit-history array (before/after + editor identity per edit), and a "synced to Lead" flag used by the Lead-generation extension to avoid resending. Genuinely different shape from `013`'s append-only `RegistrationAnswerHistoryStore` (edits/deletes are first-class here) and from `BE-LEAD-001`'s stateless live-query design (this store needs its own persisted "already sent" bookkeeping, per spec FR-012).

**Testing**: Backend Jest — new `ConversationNoteStore.test.ts` (add/edit-with-history/soft-delete/any-admin-not-author-locked/mark-synced); `OnGetAttendeeLookup.test.ts` (reuses JWT verification correctly, no check-in write, no `checkin.scan` audit entry); `OnGetAttendeeNotes.test.ts`/`OnPostAttendeeNote.test.ts` family (RBAC, the new audited-read action, this-event-default/all-events-expand); extended `LeadAdapter.test.ts` (pushes only unsynced notes, each as its own HubSpot Note, marks them synced, no duplicates on a second generation). Frontend Vitest — new `ConversationsView.test.tsx`; extended `AttendeeDetailModal.test.tsx` (Notes section, add/edit/delete UI, hostile-string guard since this is staff-typed but still free text rendered back to other staff).

**Target Platform**: ScriptRunner Connect (Backend) + static React SPA (Frontend) — both unchanged platforms.

**Constraints**: No new endpoint reuses or changes `OnCheckInScan.ts`'s existing behavior or `checkin.scan` audit action in any way (ADR-019 decision #3) — the new lookup handler is additive, not a modification. The Lead-sync extension depends on `BE-LEAD-001`/`014` already existing and depends on `HS-018` (Notes/engagement scope) for a real end-to-end test, same blocker `014` already carries. `admin`-only RBAC, matching every other write/PII surface — same explicitly-flagged watch item as `014`. AI transcription is out of scope for every part of this plan (spec FR-015) — no audio capture, no third-party transcription integration, nothing to design around here.

**Scale/Scope**: A per-event checked-in roster is the same bounded scale Check-in itself already handles (hundreds, not unbounded). Notes per attendee are realistically few (a handful per event) — no pagination concerns for a single attendee's notes fetch.

## Constitution Check

*GATE: Must pass before Phase 0 research is acted on. Re-checked after Phase 1 design.*

| Gate | Status | Notes |
| :--- | :--- | :--- |
| Security — RBAC | ✅ | `admin`-only, matching every other write/PII surface — new routes registered with `roles: ['admin']` |
| Security — new PII-read surface | ⏳ | The notes fetch is a **new audited PII-read action** (ADR-019 decision #6) — distinct from the existing unaudited attendee-detail response. Get the audit metadata shape right (no note content in metadata) before shipping |
| Security — no-author-lock is a real access-control property | ⏳ | "Any admin may edit/delete any note, tracked by identity" (ADR-019 decision #5, gap review) is a deliberate access decision, not an oversight — verify the UI doesn't accidentally restrict editing to the original author client-side while the API allows anyone |
| Security — QR lookup must not write a check-in | ⏳ | The new lookup handler must be provably read-only — no call path to the check-in-writing logic in `OnCheckIn.ts`. Dedicated test coverage, not incidental |
| API contract sync | ⏳ | New routes for: list checked-in attendees (may reuse the existing attendees-list route with a filter, see research.md R-003), attendee lookup by QR, notes fetch (with `allEvents` param), note create/edit/delete — all new `docs/api-contract.md`/`docs/rbac.md` entries |
| Tests ship with behaviour | ⏳ | New Jest + Vitest suites required per quickstart.md §A |
| No invented HubSpot property names | ✅ | This feature never reads/writes a HubSpot Contact/Event property directly — it writes HubSpot Notes (engagements) via the same mechanism `014` already designed, blocked on the same `HS-018` scope gap, not a new property-naming concern |
| Audit on mutations | ⏳ | New actions: note create/edit/delete (metadata: eventId, contactId, editor identity, outcome — never note content), plus the new notes-fetch **read** audit (ADR-019 decision #6) |
| Responsive layout | ✅ | New screen and modal section follow existing Check-in / Attendee Detail responsive patterns |
| Deferred work in TODO.md | ✅ | `FE-NOTES-001`, `BE-NOTES-001/002/003/004` already track this; `X-NOTES-002` (AI transcription) tracks what's deliberately out of scope |
| Vertical slice write gate | ⏳ | Schema check: no new HubSpot property, but the Lead-Note write depends on `HS-018` (unconfirmed scope) — same posture as `014`. RBAC defined, audit planned, validation + rate limiting planned |
| Portable backend boundary (ADR-006) | ✅ | `ConversationNoteStore.ts` lives in `Utils/Platform/`, composes `KeyValueStore.ts` — matches every existing Platform store's convention |
| Slice operator security QA | ⏳ | Required — new PII-read surface, new any-admin-can-edit-anyone's-note access property, and a check-in-adjacent lookup that must be proven not to write a check-in. §C in quickstart.md must cover all three explicitly |

**Post-design re-check**: No constitution violations identified. The ⏳ gates are delivery-phase actions gated on implementation and on `HS-018` (shared with `014`) — not open design questions ADR-019 and its gap review left unresolved.

## Project Structure

### Documentation (this feature)

```text
specs/015-conversation-notes/
├── plan.md                       # This file
├── research.md                   # Phase 0 — confirms verifyCheckInJwt needs no extraction; resolves the checked-in-list route question
├── data-model.md                 # Phase 1 — ConversationNoteEntry shape, edit-history, sync-tracking, API route contracts
├── contracts/
│   ├── get-attendee-lookup.md          # Phase 1 — QR/read-only lookup route
│   ├── attendee-notes.md               # Phase 1 — fetch + create + edit + delete routes
│   └── lead-note-sync-delta.md         # Phase 1 — the extension to 014's LeadAdapter
├── quickstart.md                 # Phase 1 — validation scenarios + required §C operator security checks
├── checklists/
│   └── requirements.md          # Spec quality (from /speckit-specify)
└── tasks.md                      # Phase 2 — via /speckit-tasks (not this command)
```

### Source Code (touch points)

```text
Backend/scripts/
  Utils/Platform/ConversationNoteStore.ts  # NEW — list of entries per {eventId, contactId}: author, timestamp,
                                          #   content, softDeleted, editHistory[] (before/after + editor identity),
                                          #   syncedToLeadAt (per-note, tracks Lead-push state per spec FR-012)
  OnGetAttendeeLookup.ts                   # NEW — QR/read-only lookup: reuses verifyCheckInJwt (Utils/CheckInJwt.ts,
                                          #   already standalone, no refactor needed) + CustomObjectAdapter's
                                          #   getContactSummary; does NOT call into OnCheckIn.ts's write path;
                                          #   no checkin.scan audit entry (own action, or none, per research.md R-002)
  OnGetAttendeeNotes.ts                    # NEW — GET, supports ?allEvents=true; new audited read action
  OnPostAttendeeNote.ts                    # NEW — create
  OnPatchAttendeeNote.ts                   # NEW — edit (any admin; appends to editHistory)
  OnDeleteAttendeeNote.ts                  # NEW — soft-delete (any admin; recorded, not destroyed)
  Utils/Routes.ts                          # Register all new routes, roles: ['admin']
  Utils/Audit.ts                           # New actions: attendee.notes.view (read), attendee.note.create/update/delete
  Utils/HubSpot/LeadAdapter.ts (014)        # EXTENDED — on generate/regenerate, reads ConversationNoteStore for
                                          #   this attendee, pushes every entry where syncedToLeadAt is unset as
                                          #   its own HubSpot Note, then marks syncedToLeadAt

Backend/node/tests/
  ConversationNoteStore.test.ts            # NEW — add/edit-with-history/soft-delete/any-admin-can-touch-any-note/
                                          #   mark-synced/unsynced-only-selection
  OnGetAttendeeLookup.test.ts              # NEW — resolves a checked-in contact from a valid JWT; never calls the
                                          #   check-in write path; no checkin.scan audit entry produced
  OnGetAttendeeNotes.test.ts / OnPostAttendeeNote.test.ts (+ Patch/Delete)  # NEW — RBAC, audit, this-event-default/
                                          #   allEvents expansion, edit-history retained, soft-delete hides not destroys
  LeadAdapter.test.ts (014, extended)      # Pushes only unsynced notes as individual Notes; marks them synced;
                                          #   a second generation does not resend already-synced notes

Frontend/src/
  views/ConversationsView.tsx              # NEW — calls the EXISTING fetchEventAttendees with checkedIn: true
                                          #   (no new list route needed — research.md R-003) + reuses
                                          #   CheckInQrPanel.tsx for scanning, unmodified
  services/dataService.ts                 # New methods: lookupAttendeeByQr,
                                          #   fetchAttendeeNotes(eventId, contactId, { allEvents? }),
                                          #   createAttendeeNote/updateAttendeeNote/deleteAttendeeNote
  components/AttendeeDetailModal.tsx       # EXTENDED — new "Notes" section: list, add, edit, soft-delete UI;
                                          #   available to any admin per-note, not gated by original authorship;
                                          #   "show notes from every event" toggle

Frontend/src/**/*.test.tsx
  ConversationsView.test.tsx               # NEW — checked-in-only filter, QR scan resolves to the right attendee,
                                          #   no check-in side effect
  AttendeeDetailModal.test.tsx (existing)  # EXTENDED — Notes section CRUD, hostile-string guard on note content
                                          #   (staff-authored, but still rendered back to other staff as plain text)

Frontend/
  docs/api-contract.md                     # New routes documented
  docs/rbac.md                              # New routes added to the admin-only matrix
  docs/ui-routes.md                         # New #/events/{id}/conversations-style route documented
```

**Structure decision**: One new Frontend view and several new Backend routes — this feature can't ride entirely on existing endpoints (unlike `013`), since it introduces a genuinely new screen and a new PII-read surface. It reuses two existing pieces outright without modification: `CheckInQrPanel.tsx` (scanning UI) and `Utils/CheckInJwt.ts`'s `verifyCheckInJwt` (JWT validation) — confirmed in research.md R-001 that neither needs refactoring first.

## Delivery Phases

### Phase 0 — Confirm reuse mechanics, resolve the checked-in-list route (research, resolved below — see research.md)

Confirms `verifyCheckInJwt` and `getContactSummary` are already standalone and reusable as-is (no extraction work, simpler than ADR-019 anticipated) and resolves how the checked-in-only list is served (filter the existing attendees route vs. a new dedicated one).

### Phase A — Note storage (`BE-NOTES-001`)

1. `ConversationNoteStore.ts` — add, edit (with history), soft-delete, mark-synced, get-unsynced.

### Phase B — Attendee lookup + Conversations screen (`FE-NOTES-001` / `BE-NOTES-002`-equivalent)

1. `OnGetAttendeeLookup.ts` + route registration.
2. `ConversationsView.tsx` (checked-in list + QR scan reusing `CheckInQrPanel.tsx`) + nav entry.

### Phase C — Notes fetch + CRUD + Attendee Detail section (`BE-NOTES-004` / `FE-NOTES-001` continued)

1. `OnGetAttendeeNotes.ts` (+ `allEvents` param) and the new audited read action.
2. `OnPostAttendeeNote.ts` / `OnPatchAttendeeNote.ts` / `OnDeleteAttendeeNote.ts`.
3. `AttendeeDetailModal.tsx`'s new "Notes" section.
4. `docs/api-contract.md` / `docs/rbac.md` / `docs/ui-routes.md` entries.

### Phase D — Lead-sync extension (`BE-NOTES-003`)

1. Extend `LeadAdapter.ts` to push unsynced notes as individual HubSpot Notes and mark them synced.

### Phase E — Tests + quickstart sign-off

1. Backend + Frontend tests per quickstart.md §A.
2. Manual sign-off §B + §C (operator security — the new PII-read audit, the any-admin edit/delete property, and proof the QR lookup never writes a check-in).

## Complexity Tracking

> No constitution violations requiring justification — the new surface (one screen, four routes, one store) is the minimum needed for a genuinely new capability; ADR-019 and its gap review already reasoned through and rejected larger alternatives (author-locked editing, live HubSpot sync, folding notes into the unaudited base response).

| Risk | Mitigation |
| :--- | :--- |
| The new QR lookup accidentally shares a code path with `OnCheckIn.ts`'s write logic | Dedicated test asserting no check-in write occurs and no `checkin.scan` audit entry is produced — called out explicitly in this plan's Constitution Check, not left to incidental coverage. |
| Any-admin editing without an author lock is unusual enough to get implemented backwards (client-side author-only gating, contradicting the server's intentionally open policy) | Explicit test: an admin who is *not* the original author can edit/delete a note through the same UI path — not just a server-side contract test. |
| Forgetting to mark a note `syncedToLeadAt` after pushing it, causing duplicate Lead Notes on a second generation | Dedicated `LeadAdapter.test.ts` case: generate twice, assert the second generation's HubSpot call only includes notes captured after the first. |

## Phase 2

Run **`/speckit-tasks`** to generate `tasks.md` from this plan + spec.
