---
description: "Task list for Audit Log Operator UX (009-audit-log-ux)"
---

# Tasks: Audit Log Operator UX — True Paging, Filters, Resource Labels

**Input**: Design documents from `/specs/009-audit-log-ux/`

**Prerequisites**: [plan.md](./plan.md) · [spec.md](./spec.md) · [research.md](./research.md) · [data-model.md](./data-model.md) · [contracts/audit-log-ux-delta.md](./contracts/audit-log-ux-delta.md) · Slice 1.5 Tier A audit baseline (`OnGetAuditRecent.ts`, `AuditView.tsx`) already shipped

**Tests**: Included — per the repo-root testing discipline (Backend Jest, Frontend Vitest ship with every behaviour change).

**Organization**: US1 (P1, MVP) is the actual timeout fix — the bucketed index replaces the full-keyspace scan, with zero API-shape change. US2 (P2) adds filters on top of that read path. US3 (P3) adds resource-label resolution on top of the same path. Each story is independently deployable — US1 alone already resolves the production incident that started this work.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story label (US1–US3)

## Path Conventions

- **Backend**: `Backend/scripts/`, `Backend/node/tests/`
- **Frontend**: `Frontend/src/`, `Frontend/docs/`

---

## Phase 1: Setup

**Purpose**: Confirm prerequisites and pin down the one implementation decision research.md left for build time.

- [ ] T001 Confirm the Slice 1.5 Tier A audit baseline (`OnGetAuditRecent.ts`, `AuditView.tsx`, admin-only RBAC) is deployed and passing, per `specs/009-audit-log-ux/quickstart.md` Prerequisites — **code confirmed present and covered by passing tests this session; live SFTP-deployed status not independently verified (no deploy access from this session)**
- [x] T002 [P] Review all design artifacts in `specs/009-audit-log-ux/` (spec, plan, research, data-model, contracts, quickstart)
- [x] T003 Pin the hour-bucket key format as a code comment in `Backend/scripts/Utils/Platform/AuditStore.ts` before implementation starts — UTC-based `ems-audit-idx-{YYYYMMDDHH}` (research.md R-001); using UTC throughout sidesteps DST/local-timezone edge cases entirely, do not use local time anywhere in the bucket key derivation

**Checkpoint**: No open decisions remain before Foundational work starts.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The bucketed index write/read plumbing every user story reads through, plus the shared type extensions.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete — US1 in particular *is* this plumbing wired into `listAuditLog`.

- [ ] T004 [P] Add `resourceLabel?: string | null` to `AuditLogApiEntry` in `Backend/scripts/Utils/Types.ts` — **deferred with BE-SLICE007-002 (resourceLabel), out of scope for this change**
- [ ] T005 [P] Add `resourceLabel?: string | null` to `AuditLogEntry` in `Frontend/src/types.ts` — **deferred with FE-SLICE007-002 (resourceLabel), out of scope for this change**
- [x] T006 Implement the hour-bucketed pointer-index write path in `Backend/scripts/Utils/Platform/AuditStore.ts` — extend `writeAudit()` to read the current hour's bucket record, prepend the new `requestId`, and write it back sharing the entry's existing 90-day TTL (research.md R-001) — depends on T003
- [x] T007 Implement a new bounded, bucket-walking read export in `Backend/scripts/Utils/Platform/AuditStore.ts` (e.g. `listAuditIndexPage`) — walks hour-buckets backward from now, collecting `requestId`s until enough are gathered to satisfy the requested page, then batch-reads just those entries via `getValue` — never falls back to `getAllKeys` — depends on T006

### Foundation tests

- [x] T008 [P] Extend `Backend/node/tests/AuditStore.test.ts` — bucketed index is written on `writeAudit`; the bucket-walking read stops once a page is filled without touching unrelated buckets; index entries carry the same TTL as their parent entry; documents same-bucket concurrent-write behavior as an accepted risk (research.md R-001) rather than asserting it can't happen — depends on T006, T007

**Checkpoint**: Index write/read plumbing works in isolation, proven by tests, before `Audit.ts` is rewired to use it.

---

## Phase 3: User Story 1 — Audit log loads without a long wait (Priority: P1) 🎯 MVP

**Goal**: Replace the full-keyspace scan behind `listAuditLog` with the bucketed index read from Phase 2 — no change to the API's request/response shape, just how it's produced.

**Independent Test**: `specs/009-audit-log-ux/quickstart.md` §B1 — the audit log's most recent page loads well under 3 seconds regardless of total history, and paging deeper into history doesn't degrade.

### Tests for User Story 1

- [x] T009 [P] [US1] Extend `Backend/node/tests/Audit.test.ts` — `listAuditLog` now reads via the bucket-walking path (T007) instead of `AuditStore.listAuditEntries()`; paging to page 5+ of a large fixture doesn't re-scan from scratch; existing `eventId`-scoped filtering behavior is unchanged — **note: this repo's actual `listAuditLog` unit tests already lived in `OnGetAuditRecent.test.ts`, not a separate `Audit.test.ts`; extended in place there instead of creating a new file**
- [x] T010 [P] [US1] Extend `Backend/node/tests/OnGetAuditRecent.test.ts` — existing `page`/`pageSize` behavior, response shape, and 401/403 handling are byte-for-byte unchanged from before this feature

### Implementation for User Story 1

- [x] T011 [US1] Rewire `listAuditLog` in `Backend/scripts/Utils/Audit.ts` to call the new bucket-walking read (T007) instead of `AuditStore.listAuditEntries()` — depends on T007
- [x] T012 [US1] Leave `AuditStore.listAuditEntries()` in place, unchanged, as the ops-tool fallback already used by `DumpAuditEntries.ts` — confirm nothing else in the hot `listAuditLog` path still calls it after T011 — depends on T011 — **one small necessary fix applied: it now also excludes the new `ems-audit-idx-*` index keys from its scan (they share the `ems-audit-` prefix), otherwise the ops dump tool would misread bucket-array values as audit entries**

**Checkpoint**: US1 fully functional and independently testable — quickstart §B1 passes, the log loads quickly regardless of history size, with zero visible API change. This alone resolves the production timeout risk that started this work and can ship on its own.

---

## Phase 4: User Story 2 — Filter the audit log to investigate specific activity (Priority: P2)

**Goal**: Four server-side filters (`action`/`actor`/`resourceType`/`resourceId`), combined with AND semantics, applied only on an explicit Apply action — scan-and-discard within the bucket range being read, not a separate index (ADR-013).

**Independent Test**: `specs/009-audit-log-ux/quickstart.md` §B2.

### Tests for User Story 2

- [x] T013 [P] [US2] Extend `Backend/node/tests/Audit.test.ts` — each filter individually, filters combined (AND semantics), a combination matching zero entries returns an empty result (not an error) — extended in `OnGetAuditRecent.test.ts` (see T009 note)
- [x] T014 [P] [US2] Extend `Backend/node/tests/OnGetAuditRecent.test.ts` — the four new query params are parsed and passed through correctly on both `GET audit/recent` and `GET events/{id}/audit`
- [x] T015 [P] [US2] Extend `Frontend/src/views/AuditView.test.tsx` — filter selections do not trigger a request until Apply is clicked; a zero-match result shows the empty state, not an error

### Implementation for User Story 2

- [x] T016 [US2] Add `action?`/`actor?`/`resourceType?`/`resourceId?` to `listAuditLog`'s options in `Backend/scripts/Utils/Audit.ts`, applied as scan-and-discard against entries fetched while walking buckets for the requested page — depends on T011
- [x] T017 [US2] Parse and pass through the four new query params in `Backend/scripts/OnGetAuditRecent.ts` — depends on T016
- [x] T018 [US2] Add filter controls (single-select per dimension) and an explicit Apply button to `Frontend/src/views/AuditView.tsx`, plus an empty-state message when a filter matches nothing — **implemented without needing T005 (resourceLabel), which stayed out of scope; also added a Clear button (FE-SLICE007-001 TODO scope) alongside Apply**
- [x] T019 [US2] Extend `fetchAuditLog` in `Frontend/src/services/dataService.ts` to accept and forward the four filter options as query params — depends on T017

**Checkpoint**: US1 + US2 both independently functional — quickstart §B2 passes on top of the already-shipped §B1.

---

## Phase 5: User Story 3 — See readable resource names instead of raw IDs (Priority: P3)

**Goal**: Resolve a `resourceLabel` for `catalog_program`/`catalog_event` entries on the current page only, via a direct `CatalogAdapter.getProgram`/`getEvent` call (not the throwing route-guard wrappers), with a `null` fallback for a resource that no longer exists.

**Independent Test**: `specs/009-audit-log-ux/quickstart.md` §B3.

### Tests for User Story 3

- [ ] T020 [P] [US3] Extend `Backend/node/tests/Audit.test.ts` — `resourceLabel` resolved for `catalog_program`/`catalog_event` entries on the returned page; `null` when the referenced resource no longer exists; field absent (not `null`) for other resource types (e.g. `session`); distinct resourceIds are deduped so N entries sharing one id trigger one lookup, not N
- [ ] T021 [P] [US3] Extend `Frontend/src/utils/auditDisplay.test.ts` — `formatAuditResource` prefers `resourceLabel` when present, falls back to the existing `resourceType`/`resourceId` join when absent or `null`
- [ ] T022 [P] [US3] Extend `Frontend/src/views/AuditView.test.tsx` — `resourceLabel` renders as plain text; a hostile string (`<script>`, `<img onerror=…>`) in a `resourceLabel` renders as literal text, never HTML

### Implementation for User Story 3

- [ ] T023 [US3] Implement `resourceLabel` resolution in `Backend/scripts/Utils/Audit.ts` (`listAuditLog`/`mapAuditEntryToApi`) — collect distinct `(resourceType, resourceId)` pairs among the current page's `catalog_program`/`catalog_event` entries, call `CatalogAdapter.getProgram`/`getEvent` directly, attach the resolved name or `null` — depends on T004, T011
- [ ] T024 [US3] Update `formatAuditResource` in `Frontend/src/utils/auditDisplay.ts` to prefer `resourceLabel` when present (including the `null` fallback case), otherwise keep today's `resourceType`/`resourceId` join — depends on T005
- [ ] T025 [US3] Render the resolved (or fallback) resource label in `Frontend/src/views/AuditView.tsx`'s feed row — depends on T024

**Checkpoint**: All three user stories independently functional — the full slice is complete.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Contract sync, documentation, sign-off.

- [x] T026 [P] Merge [contracts/audit-log-ux-delta.md](./contracts/audit-log-ux-delta.md) into `Frontend/docs/api-contract.md` — **only the paging/filter/bounded-total delta merged; the `resourceLabel` portion stays provisional pending BE-SLICE007-002/FE-SLICE007-002**
- [x] T027 [P] Update `Frontend/CHANGELOG.md` and `Backend/CHANGELOG.md` with the shipped behavior, per repo-root changelog discipline
- [x] T028 [P] Move `BE-SLICE007-001`, `FE-SLICE007-001` from `planned` to `done` in `Backend/TODO.md`/`Frontend/TODO.md`, archiving per this repo's existing TODO-DONE convention — **`BE-SLICE007-002`/`FE-SLICE007-002`/`X-SLICE007-001` stay `planned` (resourceLabel enrichment not built this change)**
- [x] T029 Run `specs/009-audit-log-ux/quickstart.md` §A (automated tests) — Backend: `npm test -- --testPathPattern="AuditStore|Audit|OnGetAuditRecent"` + `npm run lint:fix`; Frontend: `npm test -- AuditView auditDisplay dataService` + `npm run lint`
- [ ] T030 Run `specs/009-audit-log-ux/quickstart.md` §C (operator security comfort checks) on UAT — fill the C10 sign-off table — **requires a human on UAT; not runnable from this session**
- [ ] T031 Run `/review-security` per `Frontend/docs/security-review-process.md` before opening the PR(s)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup (specifically T003's key-format decision). **Blocks all user stories.**
- **User Story 1 (Phase 3)**: Depends on Foundational. This is the MVP — the actual timeout fix — and is independently shippable on its own.
- **User Story 2 (Phase 4)**: Depends on Foundational + User Story 1 (filters run through US1's rewired read path).
- **User Story 3 (Phase 5)**: Depends on Foundational + User Story 1 (label resolution attaches to the same rewired read path) — independent of US2, could be built in parallel with it by a second developer.
- **Polish (Phase 6)**: Depends on all desired stories being complete.

### Parallel Opportunities

- Within Phase 2: T004/T005 are `[P]` (different files, no interdependency); T006 → T007 are sequential (read depends on the write shape); T008 depends on both.
- Within Phase 3: T009/T010 (tests) can run in parallel with each other.
- **US2 and US3 (Phases 4 and 5) do not depend on each other** — once US1 ships, a second developer could build US3 (resource labels) while the first builds US2 (filters). Both only depend on Foundational + US1, not on each other.
- Within Phase 4: T013/T014/T015 (tests) are `[P]`.
- Within Phase 5: T020/T021/T022 (tests) are `[P]`.

---

## Parallel Example: Phases 4 and 5 together (two developers)

```bash
# Developer A — User Story 2 (filters), once US1 has shipped:
Task: "Add action?/actor?/resourceType?/resourceId? to listAuditLog's options in Backend/scripts/Utils/Audit.ts"
Task: "Parse and pass through the four new query params in Backend/scripts/OnGetAuditRecent.ts"
Task: "Add filter controls + Apply button to Frontend/src/views/AuditView.tsx"

# Developer B — User Story 3 (resource labels), fully parallel with the above:
Task: "Implement resourceLabel resolution in Backend/scripts/Utils/Audit.ts"
Task: "Update formatAuditResource in Frontend/src/utils/auditDisplay.ts"
Task: "Render the resolved resource label in Frontend/src/views/AuditView.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks everything)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: run quickstart §B1 on UAT — confirm the timeout is actually gone
5. Ship — this alone resolves the production incident; US2/US3 add investigative richness on top, not urgency

### Incremental Delivery

1. Setup + Foundational → index plumbing proven in isolation
2. User Story 1 → the actual fix → validate → **ship this first, independently**
3. User Story 2 → filters → validate → ship
4. User Story 3 → resource labels → validate → ship (can be built in parallel with US2 by a second developer)
5. Polish → contract merge, docs, changelog, TODO close-out, security review

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- US1 is the only phase that matters for the original production incident — resist scope pressure to bundle US2/US3 into the same release if there's any urgency to ship the fix
- T003's UTC decision is small but load-bearing — every downstream bucket-key derivation (write in T006, read in T007) must agree on it; get this right before either is written, not after
- Commit after each task or logical group; stop at either checkpoint to validate independently
