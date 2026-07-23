---
description: "Task list for Attendee Index Performance Fix (011-attendee-index-perf)"
---

# Tasks: Attendee Index Performance Fix — True Paging, Freshness, Reconciliation

**Input**: Design documents from `/specs/011-attendee-index-perf/`

**Prerequisites**: [plan.md](./plan.md) · [spec.md](./spec.md) · [research.md](./research.md) · [data-model.md](./data-model.md) · [contracts/attendee-webhook-contract.md](./contracts/attendee-webhook-contract.md) · Slice 1 attendee list baseline (`OnGetAttendees.ts`, `admin`-only RBAC) already shipped

**Tests**: Included — per the repo-root testing discipline (Backend Jest ships with every behaviour change); this overrides spec-kit's generic "tests are optional" default, same as `009-audit-log-ux`.

**Status (2026-07-17)**: code implementation and automated checks complete through T035. Remaining unchecked items are external/ release gates: confirm the real HubSpot payload if it differs (T032), UAT operator sign-off (T036), and the dedicated webhook security review (T037).

**Organization**: Unlike a phased slice, [ADR-011](../../docs/decisions/011-attendee-index-freshness.md) explicitly rejected a partial (two-legged) version of this fix — US1-US4 below all ship together before this feature is complete. Priorities/build order follow `Backend/TODO.md`'s existing step numbering (`BE-ATTENDEE-IDX-001..004`). Each story is still independently testable in isolation (see spec.md's per-story "Independent Test"), which is why they're organized as separate phases.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story label (US1–US4)

## Path Conventions

- **Backend**: `Backend/scripts/`, `Backend/node/tests/`
- No Frontend paths — this feature does not change `GET attendees`'s request/response shape (plan.md Structure Decision)

---

## Phase 1: Setup

**Purpose**: Confirm prerequisites and pin down the implementation decisions research.md left for build time.

- [X] T001 Confirm the Slice 1 attendee list baseline (`OnGetAttendees.ts`, `HubSpotCustomObjectAdapter.ts`, `admin`-only RBAC via `Utils/Routes.ts`) is deployed and passing, per `specs/011-attendee-index-perf/quickstart.md` Prerequisites
- [X] T002 [P] Review all design artifacts in `specs/011-attendee-index-perf/` (spec, plan, research, data-model, contracts, quickstart)
- [X] T003 Pin the Attendee index key formats as code comments in `Backend/scripts/Utils/Platform/AttendeeIndexStore.ts` before implementation starts — manifest `ems-attidx-manifest-{eventId}`, per-attendee `ems-attidx-{eventId}--{contactId}` (research.md R-001); TTL derives from `event.end ?? event.start` + `Utils/EventTicketPurge.ts`'s existing grace-period constant, not a new fallback scheme (research.md R-006)

**Checkpoint**: No open decisions remain before Foundational work starts.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The Attendee index store every user story reads or writes through.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete — US1 in particular *is* this store wired into the read path.

- [X] T004 [P] Add `ATTENDEE_WEBHOOK_SHARED_SECRET: string` and `ATTENDEE_WEBHOOK_ALLOWED_IPS: string[]` to `EmsConfig` in `Backend/scripts/Utils/Platform/types.ts` (consumed later by US3, declared here since `Config.ts`/`types.ts` are shared foundation)
- [X] T005 Implement manifest CRUD (`addToManifest`, `removeFromManifest`, `getManifest`) in `Backend/scripts/Utils/Platform/AttendeeIndexStore.ts` — composes `Utils/Platform/KeyValueStore.ts` per ADR-006, does not import `@sr-connect/record-storage` directly (matches `RegistrationCacheStore.ts`/`CheckedInCounterStore.ts`'s existing convention) — depends on T003
- [X] T006 Implement the field-scoped read-modify-write for a per-attendee entry (e.g. `writeAttendeeIndexEntry(eventId, contactId, fields, group: 'roster' | 'checkedIn', observedAt)`) in `AttendeeIndexStore.ts` — applies incoming fields only if the incoming group's `observedAt` is `>=` the currently stored value for that group, per ADR-012 (data-model.md's write rule) — depends on T005
- [X] T007 Implement `getAttendeeIndexEntries(eventId)` (batch-read every entry named in the Event's manifest) and `deleteAttendeeIndexEntry(eventId, contactId)` in `AttendeeIndexStore.ts` — never falls back to `getAllKeys` — depends on T005, T006
- [X] T008 Implement TTL derivation helper (`deriveAttendeeIndexTtl(event)`) in `AttendeeIndexStore.ts`, reusing `Utils/EventTicketPurge.ts`'s `event.end ?? event.start` + `EVENT_FINISHED_GRACE_PERIOD_MS` convention (research.md R-006) — applied to both manifest and entry writes so they expire together — depends on T003

### Foundation tests

- [X] T009 [P] Create `Backend/node/tests/AttendeeIndexStore.test.ts` — manifest add/remove/get; field-scoped write applies only when incoming `observedAt` is `>=` stored (both groups independently); a write to one field group never touches the other group's fields; TTL derivation matches `event.end ?? event.start` + grace period, including the no-`end`-date fallback case — depends on T005, T006, T007, T008

**Checkpoint**: Index store works in isolation, proven by tests, before the read path or any writer is rewired to use it.

---

## Phase 3: User Story 1 — Attendee list loads without a long wait (Priority: P1) 🎯 Foundation-facing

**Goal**: Replace the live HubSpot association fetch + N+1 Record Storage read behind `listRegisteredAttendees`/`listRegisteredAttendeesWithDispatchFilter` with the Attendee index from Phase 2 — no change to `GET attendees`'s request/response shape.

**Independent Test**: `specs/011-attendee-index-perf/quickstart.md` §B1 — the attendee list's first page loads well under 3 seconds regardless of roster size, and search/paging deeper into results doesn't degrade. A manually seeded index (via T009's test helpers) is sufficient to prove this story alone, without US2-US4 built yet.

### Tests for User Story 1

- [X] T010 [P] [US1] Extend `Backend/node/tests/CustomObjectAdapter.test.ts` — `listRegisteredAttendees` now reads/searches/paginates via `AttendeeIndexStore` instead of a live HubSpot association fetch + per-checked-in-attendee cache read; existing `checkedIn`/`query`/`page`/`pageSize` filter behavior is unchanged
- [X] T011 [P] [US1] Extend `Backend/node/tests/DispatchAudience.test.ts` (and/or `DispatchFoundation.test.ts`) — `listRegisteredAttendeesWithDispatchFilter` reads via the index instead of looping live HubSpot pages; existing dispatch-sent/not-sent filter behavior is unchanged
- [X] T012 [P] [US1] Extend `Backend/node/tests/Slice1Routes.test.ts` / `Backend/node/tests/EventFirstRoutes.test.ts` — `GET events/{eventId}/attendees` request/response shape, RBAC (`admin`-only), and error codes (403/401/503) are byte-for-byte unchanged from before this feature

### Implementation for User Story 1

- [X] T013 [US1] Rewrite `listRegisteredAttendees` in `Backend/scripts/Utils/HubSpot/HubSpotCustomObjectAdapter.ts` to call `AttendeeIndexStore.getAttendeeIndexEntries`/`getManifest` instead of the live HubSpot association fetch + `getRegistrationCache` loop — apply `checkedIn`/`query` filters and `page`/`pageSize` slicing against the index-backed result set — depends on T007
- [X] T014 [US1] Rewrite `listRegisteredAttendeesWithDispatchFilter` in `Backend/scripts/Utils/DispatchAudience.ts` to read via the index-backed result from T013 instead of looping live HubSpot pages — depends on T013

**Checkpoint**: US1 fully functional and independently testable — quickstart §B1 passes, the attendee list loads quickly regardless of roster size, with zero visible API change. This alone resolves the production timeout risk that started this work.

---

## Phase 4: User Story 2 — Attendee list reflects in-app actions immediately (Priority: P1)

**Goal**: Check-in confirm, undo check-in, and remove-attendee write through to the Attendee index synchronously, so staff never see stale state from their own actions.

**Independent Test**: `specs/011-attendee-index-perf/quickstart.md` §B2.

### Tests for User Story 2

- [X] T015 [P] [US2] Extend `Backend/node/tests/CustomObjectAdapter.test.ts` — `confirmCheckIn` writes `checkedIn: true`/`checkedInAt`/`checkedInObservedAt` to the index (roster fields untouched); `undoCheckIn` writes `checkedIn: false` (roster fields untouched); `removeAttendee` deletes the index entry and removes the contactId from the manifest
- [X] T016 [P] [US2] Extend `Backend/node/tests/AttendeeIndexStore.test.ts` — a stale write-through (older `checkedInObservedAt` than what's stored) is not applied, proving ADR-012's guard against exactly this race

### Implementation for User Story 2

- [X] T017 [US2] Add index write-through to `confirmCheckIn` in `Backend/scripts/Utils/HubSpot/HubSpotCustomObjectAdapter.ts`, alongside its existing HubSpot + `RegistrationCacheStore` writes — depends on T006
- [X] T018 [US2] Add index write-through to `undoCheckIn` in the same file, alongside its existing writes — depends on T006
- [X] T019 [US2] Add index write-through (delete entry + remove from manifest) to `removeAttendee` in the same file, alongside its existing writes — depends on T005, T007

**Checkpoint**: US1 + US2 both independently functional — quickstart §B2 passes on top of the already-shipped §B1. No handler-shape changes needed (`OnCheckInScan.ts`/`OnUndoCheckIn.ts`/`OnRemoveAttendee.ts` already call these adapter methods).

---

## Phase 5: User Story 3 — New registrations appear without a blind spot (Priority: P1)

**Goal**: A new standalone Async HTTP Event Listener receives HubSpot Workflow registration notifications and writes through to the Attendee index — authenticated by shared secret + IP allowlist (no session), rate-limited, and audited. [ADR-011](../../docs/decisions/011-attendee-index-freshness.md) treats this leg as mandatory, not optional.

**Independent Test**: `specs/011-attendee-index-perf/quickstart.md` §B3 — can be validated against a manually-constructed request matching contracts/attendee-webhook-contract.md before the real HubSpot Workflow webhook step is coordinated/configured.

### Tests for User Story 3

- [X] T020 [P] [US3] Create `Backend/node/tests/OnAttendeeRegistrationWebhook.test.ts` — valid shared secret + allowlisted source IP → processed, index updated (manifest gains the contactId, entry's roster fields written with the incoming `rosterObservedAt`), audit entry recorded with no attendee email/name in metadata; wrong secret → rejected, no index write, no audit success entry; source IP not on the allowlist → rejected; missing `eventId`/`contactId` → rejected
- [X] T021 [P] [US3] Extend `Backend/node/tests/RateLimit.test.ts` (or add a rate-limit case within T020) — repeated requests from the same source IP against the new `attendee-webhook` bucket are eventually rate-limited, matching the existing `OnAuthExchange.ts`-style IP-keyed pattern

### Implementation for User Story 3

- [X] T022 [US3] Add `ATTENDEE_WEBHOOK_SHARED_SECRET`/`ATTENDEE_WEBHOOK_ALLOWED_IPS` parsing via `Utils/Platform/Config.ts`'s `getConfig` (type already added in T004) — depends on T004
- [X] T023 [US3] Create `Backend/scripts/OnAttendeeRegistrationWebhook.ts` — new standalone Async HTTP Event Listener (own `export default`, not routed through `OnHttpRouter`/`RouteGuard`, per research.md R-007): verify shared secret (constant-time compare) and source-IP allowlist before any other processing, reject otherwise — depends on T022
- [X] T024 [US3] Add rate limiting to `OnAttendeeRegistrationWebhook.ts` via `Utils/RateLimit.ts`'s `enforceRateLimit('attendee-webhook', req.sourceIp, ...)` — depends on T023
- [X] T025 [US3] Add a new audited action (e.g. `attendee.registration.webhook`) via `Utils/Audit.ts`, called from `OnAttendeeRegistrationWebhook.ts` on both accepted and rejected requests — no attendee email/name in metadata — depends on T023
- [X] T026 [US3] Wire the registration write-through in `OnAttendeeRegistrationWebhook.ts`: add `contactId` to the Event's manifest (if new) and write roster/display fields + `rosterObservedAt` via `AttendeeIndexStore` — depends on T006, T007, T024, T025

**Checkpoint**: US1 + US2 + US3 independently functional — quickstart §B3 passes (against a simulated request if the HubSpot Workflow step isn't configured yet). Flag for a **dedicated security review pass** on this endpoint specifically (ADR-011) before it can go live — separate from the general `/review-security` pass.

---

## Phase 6: User Story 4 — Attendee list self-corrects from missed updates (Priority: P1)

**Goal**: A reconciliation sweep, piggybacked on `QueueProcessor.ts`'s existing 15-minute cron, corrects drifted Attendee index entries and removes orphaned ones — the safety net that makes the other two freshness legs trustworthy over time.

**Independent Test**: `specs/011-attendee-index-perf/quickstart.md` §B4.

### Tests for User Story 4

- [X] T027 [P] [US4] Create `Backend/node/tests/AttendeeIndexReconciliation.test.ts` — a drifted entry (index says one thing, HubSpot says another) is corrected via a field-scoped, observed-timestamp-guarded write (never overwrites a more-recent webhook roster observation); an entry whose contact is no longer associated with the Event is removed from both the manifest and the index; a run that hits `deadlineMs` resumes safely on the next invocation without duplicating completed Event state (R-005 deliberately uses idempotent replay, not a persisted cursor)
- [X] T028 [P] [US4] Extend `Backend/node/tests/RegistrationCacheStore.test.ts` (or wherever `deleteAllForEvent` is tested) — archiving an Event also purges its Attendee index manifest + entries, not just the existing registration cache

### Implementation for User Story 4

- [X] T029 [US4] Create `Backend/scripts/Utils/AttendeeIndexReconciliation.ts` — per-Event drift correction + orphan removal, same time-budgeted shape as `Utils/EventTicketPurge.ts` (`catalogAdapter.listEvents()`, per-Event work, bail via `deadlineMs`) — depends on T006, T007
- [X] T030 [US4] Add the reconciliation sweep as a new time-budgeted step in `Backend/scripts/QueueProcessor.ts`'s existing 15-minute self-rechaining run (same `triggerScript('QueueProcessor', {})` resume pattern already used for dispatch jobs + ticket purge) — depends on T029
- [X] T031 [US4] Extend `deleteAllForEvent` in `Backend/scripts/Utils/Platform/RegistrationCacheStore.ts` to also delete the Event's Attendee index manifest + entries — depends on T005, T007

**Checkpoint**: All four user stories independently functional — the full slice is complete. This is the point at which ADR-011's three-legged freshness strategy is fully in place, not before.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Contract sync, documentation, sign-off.

- [ ] T032 [P] Add a contract note for the new webhook endpoint's shape to `contracts/attendee-webhook-contract.md` if the HubSpot Workflow-configured request body differs from the provisional shape drafted in planning — depends on T023
- [X] T033 [P] Update `Backend/CHANGELOG.md` (and `Frontend/CHANGELOG.md` if any cross-cutting note is warranted, though this feature has no Frontend change) with the shipped behavior, per repo-root changelog discipline
- [X] T034 [P] Move `BE-ATTENDEE-IDX-001..004`, `BE-SLICE1-006` from `planned`/step-table `⬜` to `done` in `Backend/TODO.md`, archiving per this repo's existing TODO-DONE convention
- [X] T035 Run `specs/011-attendee-index-perf/quickstart.md` §A (automated tests) — Backend: `npm test -- --testPathPattern="AttendeeIndex|CustomObjectAdapter|DispatchAudience|DispatchFoundation|AttendeeRegistrationWebhook|Slice1Routes|EventFirstRoutes|EventTicketPurge|RegistrationCacheStore"` + `npm run lint:fix` (2026-07-17: full suite 420 tests / 38 suites green; lint 0 errors, 3 pre-existing unused-parameter warnings)
- [ ] T036 Run `specs/011-attendee-index-perf/quickstart.md` §C (operator security comfort checks) on UAT — fill the C10 sign-off table, including the webhook-specific checks (C7.3-C7.5)
- [ ] T037 Run a **dedicated security review** of `OnAttendeeRegistrationWebhook.ts` specifically (ADR-011) — separate from, and in addition to, the general `/review-security` pass per `Frontend/docs/security-review-process.md` before opening the PR(s)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup (T003's key-format/TTL decisions). **Blocks all user stories.**
- **User Story 1 (Phase 3)**: Depends on Foundational. Read-only against the index — can be validated with a manually seeded index before US2-US4 exist.
- **User Story 2 (Phase 4)**: Depends on Foundational. Touches the same file (`HubSpotCustomObjectAdapter.ts`) as US1's `listRegisteredAttendees` rewrite, so a single developer doing both sequentially avoids merge conflicts; two developers can still work in parallel with care.
- **User Story 3 (Phase 5)**: Depends on Foundational only — entirely new, standalone files, independent of US1/US2.
- **User Story 4 (Phase 6)**: Depends on Foundational only — new standalone files, independent of US1/US2/US3, though it exercises the same field-scoped write path US2/US3 use.
- **Polish (Phase 7)**: Depends on all four user stories being complete — this feature does not ship partially (ADR-011).

### Parallel Opportunities

- Within Phase 2: T004 is `[P]` (different file, no interdependency with T005-T008); T005 → T006 → T007 are sequential (each builds on the prior); T008 can run parallel to T006/T007 (different concern); T009 depends on all of T005-T008.
- **US1, US3, and US4 (Phases 3, 5, 6) have no file overlap with each other** — three developers could build them in parallel once Foundational ships. US2 (Phase 4) shares a file with US1, so is best sequenced with or immediately after US1 by the same developer, or coordinated carefully if split.
- Within Phase 3: T010/T011/T012 (tests) are `[P]`.
- Within Phase 4: T015/T016 (tests) are `[P]`.
- Within Phase 5: T020/T021 (tests) are `[P]`.
- Within Phase 6: T027/T028 (tests) are `[P]`.

---

## Parallel Example: Phases 3, 5, and 6 together (three developers)

```bash
# Developer A — User Story 1 (fast read path), once Foundational has shipped:
Task: "Rewrite listRegisteredAttendees in Backend/scripts/Utils/HubSpot/HubSpotCustomObjectAdapter.ts to read via AttendeeIndexStore"
Task: "Rewrite listRegisteredAttendeesWithDispatchFilter in Backend/scripts/Utils/DispatchAudience.ts"

# Developer B — User Story 3 (registration webhook), fully parallel with the above:
Task: "Create Backend/scripts/OnAttendeeRegistrationWebhook.ts — shared-secret + IP-allowlist auth, rate limit, audit, write-through"

# Developer C — User Story 4 (reconciliation sweep), fully parallel with the above:
Task: "Create Backend/scripts/Utils/AttendeeIndexReconciliation.ts and wire it into QueueProcessor.ts"
```

---

## Implementation Strategy

### Build Order (not a phased-value MVP — see spec.md's note on story structure)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks everything)
3. Complete Phase 3: User Story 1 — validate quickstart §B1 (the read-path fix)
4. Complete Phase 4: User Story 2 — validate quickstart §B2 (write-through freshness)
5. Complete Phase 5: User Story 3 — validate quickstart §B3 (registration webhook), request the dedicated security review (T037) once this lands
6. Complete Phase 6: User Story 4 — validate quickstart §B4 (reconciliation sweep)
7. **Do not ship to Live after Phase 3 alone** — per ADR-011, a read-path-only fix without the freshness legs would reintroduce the exact walk-in blind spot the ADR rejected. All four stories ship together.
8. Phase 7 — contract note, changelog, TODO close-out, dedicated webhook security review, general security review.

### Incremental Delivery (development sequencing, not incremental Live shipping)

1. Setup + Foundational → index store proven in isolation.
2. User Story 1 → the read-path fix → validate against a seeded index — **do not deploy to Live standalone**, since ADR-011 requires the freshness legs before this is safe to rely on in production.
3. User Stories 2-4 → the three freshness legs → validate each independently.
4. Ship the whole feature together once all four stories + Phase 7 are complete.

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Unlike `009-audit-log-ux`, **no story here is independently shippable to Live on its own** — ADR-011 explicitly rejected a partial (two-legged, or here, one-quarter) version. Build and validate incrementally; ship as one unit.
- T003's key-format/TTL decisions are small but load-bearing — every downstream read (T013), write (T017-T019, T026), and sweep (T029) must agree on them; get this right before Phase 2 implementation starts, not after.
- Commit after each task or logical group; stop at either checkpoint to validate independently, but hold the Live deploy until Phase 6 + Phase 7's security review are done.
