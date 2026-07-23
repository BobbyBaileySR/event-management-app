---
description: "Task list for Registration Form Bridge (013-registration-form-bridge)"
---

# Tasks: Registration Form Bridge — Multi-Event Slots + Registration-Answer History

**Input**: Design documents from `/specs/013-registration-form-bridge/`

**Prerequisites**: [plan.md](./plan.md) · [spec.md](./spec.md) · [research.md](./research.md) · [data-model.md](./data-model.md) · [contracts/](./contracts/) · `010-attendee-detail-modal` and `011-attendee-index-perf` already shipped

**Tests**: Included — per the repo-root testing discipline (tests ship with every behaviour change on both sides); overrides spec-kit's generic "tests are optional" default, same as `009-audit-log-ux`/`011-attendee-index-perf`.

**Organization**: Four user stories from spec.md. **US1** (multi-event single submission) and **US4** (bounded slot growth/reassignment) are entirely HubSpot-side mechanisms (ADR-017's slot design) with **no EMS code** — tracked as ops work (`HS-001`/`013`/`014`), not task-generated here. **US2** (answer capture/history) and **US3** (staff visibility) are the two EMS-side stories this tasks list actually builds.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story label (US1–US4)

## Path Conventions

- **Backend**: `Backend/scripts/`, `Backend/node/tests/`
- **Frontend**: `Frontend/src/`, `Frontend/docs/`

---

## Phase 1: Setup

**Purpose**: Confirm prerequisites and pin down the implementation decisions research.md/data-model.md left for build time.

- [X] T001 Confirm `010-attendee-detail-modal` (`OnGetAttendeeDetail.ts`, Attendee Detail modal) and `011-attendee-index-perf` (`OnAttendeeRegistrationWebhook.ts`) are deployed and passing, per `specs/013-registration-form-bridge/quickstart.md` Prerequisites
- [X] T002 [P] Review all design artifacts in `specs/013-registration-form-bridge/` (spec, plan, research, data-model, contracts, quickstart) and [ADR-017](../../docs/decisions/017-registration-slots-and-answer-history.md)
- [X] T003 [P] Pin the registration-answer history key format as a code comment ahead of implementation — `ems-regform-answers-{eventId}--{contactId}` (data-model.md), one JSON array value per key, **retained indefinitely, never purged on Event archive** (research.md R-002, confirmed by product owner)

**Checkpoint**: No open decisions remain before Foundational work starts.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The registration-answer history store both US2 and US3 depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T004 Implement `appendEntry(eventId, contactId, entry)` in `Backend/scripts/Utils/Platform/RegistrationAnswerHistoryStore.ts` — read current value (or `{ entries: [] }` if key doesn't exist), append, write back; composes `Utils/Platform/KeyValueStore.ts` per ADR-006, does not import `@sr-connect/record-storage` directly (matches `AttendeeIndexStore.ts`'s existing convention) — depends on T003
- [X] T005 Add the bounded read-verify-retry guard to `appendEntry` — after writing, re-read and confirm the new entry is present at the expected position; retry from the read step (capped at 3 attempts) if not, per ADR-017 decision #3 — depends on T004
- [X] T006 Implement `getHistory(eventId, contactId)` in the same file — returns `entries` (or `[]` if the key doesn't exist) — depends on T004

### Foundation tests

- [X] T007 [P] Create `Backend/node/tests/RegistrationAnswerHistoryStore.test.ts` — `appendEntry` correctly appends without overwriting prior entries across repeated calls for the same key; `getHistory` returns `[]` for a key that's never been written; the retry guard's re-read-and-retry path is exercised (simulate a race by mutating the stored value between the store's internal write and its own verification read) — depends on T004, T005, T006

**Checkpoint**: The store works in isolation, proven by tests, before the webhook or the Attendee Detail route touch it.

---

## Phase 3: User Story 1 — Register for several events in one submission (Priority: P1)

**No EMS tasks.** This story is entirely a HubSpot-side mechanism — ten independent registration slots (ADR-017 decision #1), each an existing-shape match-key/workflow pair. EMS's `OnAttendeeRegistrationWebhook` already fires once per contact+event regardless of how many were selected (true since `011`, unchanged by this feature). Tracked as ops work: [`HS-001`](../../docs/hubspot-ops-todo.md) (slot build), [`HS-013`](../../docs/hubspot-ops-todo.md) (answer-bundling script), [`HS-014`](../../docs/hubspot-ops-todo.md) (slot-repointing discipline).

**Independent Test**: N/A for EMS — validated on the HubSpot side once slots are built (quickstart.md notes this as out of EMS's test scope).

---

## Phase 4: User Story 2 — Follow-up answers are captured and never overwritten (Priority: P1)

**Goal**: `OnAttendeeRegistrationWebhook` accepts an optional `answers` field and appends it to the Phase 2 store; existing (011) roster-field processing is entirely unaffected whether `answers` is present or not.

**Independent Test**: `specs/013-registration-form-bridge/quickstart.md` §B1 — send two manually-constructed webhook requests for the same contact+event with different `answers`, confirm both are preserved.

### Tests for User Story 2

- [X] T008 [P] [US2] Extend `Backend/node/tests/OnAttendeeRegistrationWebhook.test.ts` — request with a parseable `answers` field → appended to `RegistrationAnswerHistoryStore` with `source`/`observedAt`/`slot`, and the existing `attendee.registration.webhook` audit entry gains `answersCaptured: true`/`answerCount: <n>`; request with `answers` absent or unparseable → existing roster-field write-through and audit entry are byte-for-byte unchanged from before this feature; two requests for the same contact+event with different `answers` → both entries present via `getHistory` (proves append, not overwrite)

### Implementation for User Story 2

- [X] T009 [US2] Parse the optional `answers` body field (JSON string → object) in `Backend/scripts/OnAttendeeRegistrationWebhook.ts`'s existing request handling — treat a missing or unparseable value as "no answers this call," never an error — depends on T004
- [X] T010 [US2] Call `RegistrationAnswerHistoryStore.appendEntry` with the parsed `answers`, `source` (`registration` on first entry for this contact+event, `amendment` otherwise — derive by checking `getHistory` first), the request's observed timestamp, and the slot number — depends on T009, T006
- [X] T011 [US2] Extend the existing audit call in `OnAttendeeRegistrationWebhook.ts` with `answersCaptured`/`answerCount` metadata when T010 ran — never the answer text itself — depends on T010

**Checkpoint**: US2 fully functional and independently testable — quickstart §B1 passes. No handler-shape change to the webhook's existing contract; this is additive.

---

## Phase 5: User Story 3 — Staff can see everything an attendee has said (Priority: P2)

**Goal**: `GET events/{evId}/attendees/{contactId}` returns `registrationAnswerHistory`; the Attendee Detail modal renders it in a new panel, as plain text only (FR-007 — hard requirement, not optional).

**Independent Test**: `specs/013-registration-form-bridge/quickstart.md` §B2 — seed history via US2, confirm it's visible (with submission times) in the Attendee Detail modal; confirm the empty state for a contact with none.

### Tests for User Story 3

- [X] T012 [P] [US3] Extend the existing `OnGetAttendeeDetail`-adjacent Backend test — response includes `registrationAnswerHistory` (populated from `getHistory`, and `[]` when none recorded); RBAC (`admin`-only) and rate-limit bucket (`attendees-list`) unchanged
- [X] T013 [P] [US3] Create `Frontend/src/**/RegistrationHistoryPanel.test.tsx` — renders every history entry with its submission time; shows a clear empty state when `registrationAnswerHistory` is `[]`; **hostile-string guard is a hard pass/fail gate** — an answer value containing `<script>alert(1)</script>` or `<img src=x onerror=alert(1)>` renders as literal text, never as an executing script or an HTML node (spec FR-007)
- [X] T014 [P] [US3] Extend the existing Attendee Detail modal Frontend test — the new panel mounts when `registrationAnswerHistory` is present on the response

### Implementation for User Story 3

- [X] T015 [US3] Add `registrationAnswerHistory: RegistrationAnswerHistoryEntry[]` to `AttendeeDetailResponse` in `Backend/scripts/Utils/Types.ts` — depends on T006 (type of `getHistory`'s return)
- [X] T016 [US3] In `Backend/scripts/OnGetAttendeeDetail.ts`'s `act()`, call `RegistrationAnswerHistoryStore.getHistory(eventId, contactId)` and include the result on the response — no RBAC/rate-limit change — depends on T006, T015
- [X] T017 [P] [US3] Map `registrationAnswerHistory` in `Frontend/src/services/normalizeApi.ts` (or wherever `AttendeeDetailResponse` is normalized) — no new `dataService` method needed, rides the existing attendee-detail fetch
- [X] T018 [US3] Create `Frontend/src/**/RegistrationHistoryPanel.tsx` — renders history entries via JSX `{text}` only (never `dangerouslySetInnerHTML`), a length-cap/truncation treatment for pathologically long answers, and the empty state — depends on T017
- [X] T019 [US3] Mount `RegistrationHistoryPanel` in the existing Attendee Detail modal component — depends on T018

**Checkpoint**: US3 fully functional and independently testable — quickstart §B2 passes. Staff can now see the history US2 captures.

---

## Phase 6: User Story 4 — The form can grow without breaking existing registrations (Priority: P3)

**No EMS tasks.** Slot assignment lives entirely in the HubSpot form's own configuration, not EMS's data model (ADR-017 gap review, gap 3) — there is nothing for EMS code to build or track here. Tracked as ops discipline: [`HS-014`](../../docs/hubspot-ops-todo.md).

**Independent Test**: N/A for EMS — this story's guarantee ("reassigning a slot doesn't disturb the reassigned-from event's history") is already true by construction, since history is keyed by `{eventId, contactId}` (Phase 2), never by slot number — slot is stored only as informational metadata on each entry (data-model.md), never used for lookup.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Contract sync, documentation, sign-off.

- [X] T020 [P] Update `Frontend/docs/api-contract.md` with the new `registrationAnswerHistory` response field + change-log row — done during planning (2026-07-20), ahead of implementation, since it documents an additive contract decided in Phase 1 design, not a discovery made during coding
- [X] T021 [P] Update `specs/011-attendee-index-perf/contracts/attendee-webhook-contract.md` with the new optional `answers` request field + processing steps 3a/4 — done during planning (2026-07-20), same rationale as T020
- [X] T022 [P] Update `Frontend/TODO.md`'s `X-REGFORM-001` row to point at this spec folder — done during planning (2026-07-20)
- [X] T023 [P] Update `Backend/CHANGELOG.md` and `Frontend/CHANGELOG.md` with the shipped behaviour once Phases 2-5 land, per repo-root changelog discipline
- [X] T024 [P] Move `BE-REGFORM-001`/`002`, `FE-REGFORM-001` from `planned` to `done` in `Backend/TODO.md`/`Frontend/TODO.md` once shipped — landed as `done-pending-QA` (cross-cutting `X-REGFORM-001`) since quickstart.md §C UAT sign-off and the HubSpot ops slot build remain outstanding
- [X] T025 Run `specs/013-registration-form-bridge/quickstart.md` §A (automated tests) — Backend: `npm test -- --testPathPattern="RegistrationAnswerHistoryStore|AttendeeRegistrationWebhook|AttendeeDetail"` + `npm run lint:fix`; Frontend: `npm test -- RegistrationHistoryPanel AttendeeDetailModal` + `npm run build`
- [ ] T026 Run `specs/013-registration-form-bridge/quickstart.md` §C (operator security comfort checks) on UAT — fill the C10 sign-off table, with particular attention to C7.1 (public-authored text can never execute or render as markup) since this is the first EMS surface with that risk profile
- [ ] T027 Request a **specific look at the new public-text rendering path** as part of the general `/review-security` pass before opening the PR(s) — not a fully separate dedicated review like `011`'s webhook endpoint needed (no new endpoint or auth boundary here), but called out by name per this plan's Constitution Check, not left to be caught incidentally

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup (T003's key-format/retention decision). **Blocks US2 and US3.**
- **User Story 1 (Phase 3)**: No EMS dependency — purely ops-tracked, can proceed in parallel with everything else.
- **User Story 2 (Phase 4)**: Depends on Foundational (Phase 2).
- **User Story 3 (Phase 5)**: Depends on Foundational (Phase 2) for the type/shape of what it reads; does **not** depend on Phase 4 — US3 renders whatever history exists, whether zero or many entries, and can be built/tested against seeded data before US2's webhook wiring lands.
- **User Story 4 (Phase 6)**: No EMS dependency — purely ops-tracked.
- **Polish (Phase 7)**: T020-T022 already done (Phase 1 design output); T023-T027 depend on Phases 2, 4, and 5 being complete.

### Parallel Opportunities

- Within Phase 2: T004 → T005 → T006 are sequential (each builds on the prior); T007 depends on all three.
- **US2 (Phase 4) and US3 (Phase 5) have no file overlap** — two developers could build them in parallel once Foundational ships, since US3 only needs Phase 2's `getHistory` shape, not US2's webhook wiring.
- Within Phase 4: T008 (test) can be written in parallel with reviewing T009-T011, though per this repo's test-first convention it should be written before those implementation tasks and initially fail.
- Within Phase 5: T012/T013/T014 (tests) are `[P]`; T017 (Frontend mapping) is `[P]` relative to T015/T016 (Backend) since they touch different files/repos.

---

## Parallel Example: Phases 4 and 5 together (two developers)

```bash
# Developer A — User Story 2 (webhook answer capture), once Foundational has shipped:
Task: "Parse optional answers field in Backend/scripts/OnAttendeeRegistrationWebhook.ts"
Task: "Call RegistrationAnswerHistoryStore.appendEntry with parsed answers + source + observedAt + slot"
Task: "Extend the existing audit call with answersCaptured/answerCount metadata"

# Developer B — User Story 3 (staff visibility), fully parallel with the above:
Task: "Add registrationAnswerHistory to AttendeeDetailResponse in Backend/scripts/Utils/Types.ts"
Task: "Read RegistrationAnswerHistoryStore.getHistory in OnGetAttendeeDetail.ts"
Task: "Create Frontend RegistrationHistoryPanel.tsx — JSX-{text}-only rendering, empty state, length cap"
```

---

## Implementation Strategy

### MVP First (User Story 2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks US2 and US3)
3. Complete Phase 4: User Story 2 — validate quickstart §B1 (answers are captured and preserved)
4. **STOP and VALIDATE**: confirm history is being appended correctly, even with no visible way to see it yet
5. This alone proves the core data-preservation goal — but has no staff-visible payoff until US3 ships too; don't consider this feature "done" without US3.

### Incremental Delivery

1. Setup + Foundational → store proven in isolation.
2. User Story 2 → answers captured and preserved → validate independently (data exists, even if unseen).
3. User Story 3 → staff can see it → validate independently → this is the point the feature delivers real, visible value.
4. Ship Phase 7 (tests, contract sync already done, sign-off) once both are complete.
5. User Stories 1 and 4 have no EMS shipping gate — they proceed on the HubSpot/ops side independently of this repo's release cadence.

### Parallel Team Strategy

With two developers: both complete Setup + Foundational together, then Developer A takes US2 (Phase 4) while Developer B takes US3 (Phase 5) — no file overlap, per the Parallel Opportunities note above.

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- T003's retention decision (indefinite, no archive-purge) is small but load-bearing for T004 — get it into the store's implementation before writing `appendEntry`, not as an afterthought, since accidentally wiring this into `RegistrationCacheStore.deleteAllForEvent` later would silently defeat the feature.
- US1 and US4 are real user stories in spec.md but generate zero EMS tasks by design — do not interpret their absence here as an oversight; see each phase's note above.
- Commit after each task or logical group; stop at either checkpoint (Phase 4 or Phase 5) to validate independently — unlike `011`, these two stories genuinely can ship to Live independently of each other if there's ever a reason to (US2 alone silently preserves data with no UI; US3 alone would show an always-empty panel until US2 lands) — though shipping both together is the sensible default.
