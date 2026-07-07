---
description: "Task list for Capacity Management (004-capacity-management) — live attendance on Check-in"
---

# Tasks: Capacity Management (Slice 1)

**Input**: Design documents from `/specs/004-capacity-management/`

**Prerequisites**: [plan.md](./plan.md) · [spec.md](./spec.md) · [data-model.md](./data-model.md) · [contracts/capacity-api.md](./contracts/capacity-api.md) · **003-check-in** US1+US2 shipped · **001/002** Event `capacity` metadata

**Tests**: Included — [ems-testing-discipline](../../../.cursor/rules/ems-testing-discipline.mdc) requires Jest + Vitest with each behaviour change.

**Organization**: Three P1 user stories (monitor, tiers, ±1 adjust) — Phases 3–5. Backend foundation delivers both GET and POST routes before UI stories.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story label (US1–US3)

## Path Conventions

- **Backend**: `Backend/scripts/`, `Backend/node/tests/`
- **Frontend**: `Frontend/src/`, `Frontend/docs/` (gitignored locally — still update in same session)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm prerequisites before capacity work

- [ ] T001 Confirm **003-check-in** US1+US2 working (`specs/004-capacity-management/quickstart.md` §Prerequisites — attendees + confirm check-in mock or live)
- [ ] T002 Confirm catalog Event **`capacity`** field editable and returned on `GET catalog` (001/002 — Catalog admin Event modal)
- [ ] T003 [P] Review design artifacts in `specs/004-capacity-management/` (spec, plan, research, data-model, contract)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Capacity API, store, types, dataService, mock — **blocks all user stories**

**⚠️ CRITICAL**: No Check-in capacity UI until GET/POST routes and `fetchCapacityStatus` exist

### Backend foundation

- [ ] T004 Add `CapacityStatusResponse`, `AdjustCapacityBody`, `CapacityStateRecord` in `Backend/scripts/Utils/Types.ts`
- [ ] T005 Implement Record Storage read/write in `Backend/scripts/Utils/CapacityStore.ts` (key `ems-capacity-{programId}--{eventId}`)
- [ ] T006 Implement `computeLiveAttendance` + `validateAdjustBounds` in `Backend/scripts/Utils/Capacity.ts`
- [ ] T007 Implement `handleGetCapacityStatus` (catalog capacity + adapter checked-in total + departureCount) in `Backend/scripts/OnGetCapacityStatus.ts`
- [ ] T008 Implement `handleAdjustCapacity` (direction up/down, bounds, audit `capacity.adjust`) in `Backend/scripts/OnAdjustCapacity.ts`
- [ ] T009 Wire GET `…/capacity` + POST `…/capacity/adjust` in `Backend/scripts/OnHttpRouter.ts`
- [ ] T010 Add admin-only capacity routes to `Backend/scripts/Utils/RouteGuard.ts`
- [ ] T011 [P] Add GET capacity route tests (401/403/200 shape) in `Backend/node/tests/CapacityRoutes.test.ts`

### Frontend foundation

- [ ] T012 [P] Add `CapacityStatus`, `AdjustCapacityDirection` in `Frontend/src/types.ts`
- [ ] T013 [P] Add `normalizeCapacityStatusResponse` in `Frontend/src/utils/normalizeApi.ts`
- [ ] T014 [P] Merge contract from `specs/004-capacity-management/contracts/capacity-api.md` into `Frontend/docs/api-contract.md`
- [ ] T015 [P] Add capacity route RBAC rows in `Frontend/docs/rbac.md`
- [ ] T016 Add `fetchCapacityStatus`, `adjustCapacity` in `Frontend/src/services/dataService.ts`
- [ ] T017 [P] Add mock departure map + `getMockCapacityStatus` + `mockAdjustCapacity` in `Frontend/src/data/mockData.ts`
- [ ] T018 [P] Add `normalizeCapacityStatusResponse` tests in `Frontend/src/utils/normalizeApi.test.ts`

**Checkpoint**: `fetchCapacityStatus` + `adjustCapacity` work in mock mode via `createDataService`

---

## Phase 3: User Story 1 — Monitor live attendance (Priority: P1) 🎯 MVP

**Goal**: Admin sees live attendance vs Event capacity on Check-in; updates after check-in confirm.

**Independent Test**: quickstart §3–§5 — indicator shows live/capacity/%; confirm check-in increments live; non-admin blocked.

### Tests for User Story 1

- [ ] T019 [P] [US1] Add capacity indicator load + admin gate tests in `Frontend/src/views/CheckInView.test.tsx`
- [ ] T020 [P] [US1] Add mock `fetchCapacityStatus` path tests in `Frontend/src/services/dataService.test.ts`

### Implementation for User Story 1

- [ ] T021 [P] [US1] Extend `CatalogSelection` with optional `capacity` in `Frontend/src/state/catalogContext.tsx`
- [ ] T022 [US1] Pass `capacity` from selected Event on all `setSelection` paths in `Frontend/src/components/CatalogPickers.tsx`
- [ ] T023 [US1] Fetch capacity snapshot on mount and `programId`/`evId` change in `Frontend/src/views/CheckInView.tsx`
- [ ] T024 [US1] Render `CapacityBar` with live/capacity/on-site labels when `capacity > 0` in `Frontend/src/views/CheckInView.tsx`
- [ ] T025 [US1] Show count-only hint (no false 0% bar) when capacity unset/zero per FR-006 in `Frontend/src/views/CheckInView.tsx`
- [ ] T026 [US1] Refetch capacity snapshot after successful `confirmCheckIn` in `Frontend/src/views/CheckInView.tsx`

**Checkpoint**: Live count visible on Check-in; updates after check-in — mock mode (quickstart §3, §5 partial)

---

## Phase 4: User Story 2 — Threshold visuals at 75% and 90% (Priority: P1)

**Goal**: Capacity indicator uses distinct normal / caution / critical / over tiers.

**Independent Test**: quickstart §6 — tier changes at 74→75, 89→90, >100% without reading fraction first.

### Tests for User Story 2

- [ ] T027 [P] [US2] Add tier boundary tests in `Frontend/src/utils/capacityTier.test.ts`
- [ ] T028 [P] [US2] Add tier label + CSS class tests in `Frontend/src/components/CapacityBar.test.tsx`

### Implementation for User Story 2

- [ ] T029 [P] [US2] Implement `getCapacityTier` + `getFillPercent` in `Frontend/src/utils/capacityTier.ts`
- [ ] T030 [US2] Add tier colour tokens and label styles in `Frontend/src/components/CapacityBar.module.css`
- [ ] T031 [US2] Extend `CapacityBar` with tier prop, on-site copy, and bar fill cap at 100% in `Frontend/src/components/CapacityBar.tsx`
- [ ] T032 [US2] Pass tier from `capacityTier` helpers in `Frontend/src/views/CheckInView.tsx`

**Checkpoint**: Visual tiers identifiable at 75% and 90% (SC-003)

---

## Phase 5: User Story 3 — Manual ±1 live attendance adjust (Priority: P1)

**Goal**: Admin uses +1/−1 on Check-in to record anonymous departures or corrections; server-persisted; no HubSpot write.

**Independent Test**: quickstart §4 — −1 lowers live; +1 restores; floor/ceiling disabled; second desk sees same count.

### Tests for User Story 3

- [ ] T033 [P] [US3] Add ±1 disabled-state tests in `Frontend/src/components/CapacityBar.test.tsx`
- [ ] T034 [P] [US3] Add mock adjust integration tests in `Frontend/src/views/CheckInView.test.tsx`
- [ ] T035 [P] [US3] Extend adjust route tests (floor, ceiling, persistence) in `Backend/node/tests/CapacityRoutes.test.ts`

### Implementation for User Story 3

- [ ] T036 [US3] Add paired +1/−1 controls with disabled rules to `Frontend/src/components/CapacityBar.tsx`
- [ ] T037 [US3] Wire `adjustCapacity` handler + optimistic/refetch on success in `Frontend/src/views/CheckInView.tsx`
- [ ] T038 [US3] Keep capacity indicator above Check-in/Walk-in mode switch when US3 mode exists in `Frontend/src/views/CheckInView.tsx`
- [ ] T039 [US3] Add responsive ±1 control layout in `Frontend/src/views/CheckInView.module.css` (NFR-003)

**Checkpoint**: ±1 adjust works mock mode; HubSpot checked-in unchanged (quickstart §4)

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Docs, regression, deploy, live validation

- [ ] T040 [P] Add 004 capacity entries to `Frontend/CHANGELOG.md` and `Backend/CHANGELOG.md`
- [ ] T041 [P] Park multi-day Event capacity reset policy in `Frontend/TODO.md` if not implemented (plan R-008)
- [ ] T042 Run `Backend/npm test` + `npm run lint:fix` and `Frontend/npm run check:quick`
- [ ] T043 Execute manual QA in `specs/004-capacity-management/quickstart.md` §3–§10 — sign-off checklist
- [ ] T044 SFTP deploy capacity handlers (`OnGetCapacityStatus`, `OnAdjustCapacity`, `CapacityStore`, router) + live smoke with `USE_MOCK_API: false`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Phase 1 — **blocks US1 + US2 + US3**
- **US1 (Phase 3)**: Depends on Phase 2 — live indicator MVP
- **US2 (Phase 4)**: Depends on Phase 3 (CapacityBar mounted on Check-in)
- **US3 (Phase 5)**: Depends on Phase 2 (POST adjust) + Phase 4 (tiered CapacityBar with control slot)
- **Polish (Phase 6)**: Depends on Phases 3–5 complete

### User Story Dependencies

| Story | Priority | Depends on | Independent test |
| :--- | :---: | :--- | :--- |
| **US1** | P1 | Foundational | Indicator + check-in refresh (quickstart §3, §5) |
| **US2** | P1 | US1 (bar on Check-in) | Tier boundaries (quickstart §6) |
| **US3** | P1 | Foundational + US2 UI | ±1 adjust + multi-desk (quickstart §4) |

### Parallel Opportunities

- **Phase 1**: T003 ∥ T001–T002 (after skim)
- **Phase 2**: T011 ∥ T012 ∥ T013 ∥ T014 ∥ T015 ∥ T017 ∥ T018 (after T004–T010)
- **US1**: T019 ∥ T020 ∥ T021 (after T016); T025 ∥ T026 after T024
- **US2**: T027 ∥ T028 (after US1); T029 before T030–T032
- **US3**: T033 ∥ T034 ∥ T035 (after T036); T037–T039 sequential on Check-in view
- **Polish**: T040 ∥ T041

---

## Parallel Example: Foundational backend + frontend types

```bash
# After T004–T010 land, in parallel:
Task: "Add CapacityRoutes.test.ts GET tests"
Task: "Add CapacityStatus types in Frontend/src/types.ts"
Task: "Merge capacity-api.md into docs/api-contract.md"
Task: "Add mock capacity handlers in mockData.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Phase 1: Setup (T001–T003)
2. Phase 2: Foundational (T004–T018) — **CRITICAL**
3. Phase 3: US1 monitor (T019–T026)
4. **STOP and VALIDATE**: quickstart §3 + §5 — indicator + check-in refresh in mock mode

### Incremental delivery

1. Setup + Foundational → API ready
2. US1 → live count on Check-in (MVP)
3. US2 → 75%/90% tiers
4. US3 → ±1 adjust + persistence
5. Polish → SFTP + live smoke

### Suggested single-developer order

T001 → T003 → T004 → T010 → T011 → T012 → T018 → T016 → T017 → T019 → T026 → T027 → T032 → T033 → T039 → T040 → T044

---

## Task Summary

| Phase | Tasks | Scope |
| :--- | :--- | :--- |
| Setup | T001–T003 | 3 |
| Foundational | T004–T018 | 15 |
| US1 Monitor (P1) | T019–T026 | 8 |
| US2 Tiers (P1) | T027–T032 | 6 |
| US3 ±1 adjust (P1) | T033–T039 | 7 |
| Polish | T040–T044 | 5 |
| **Total** | **T001–T044** | **44** |

---

## Notes

- **Live attendance** = `max(0, checkedInCount - departureCount)` — see [data-model.md](./data-model.md)
- Event Hub `CapacityBar` (registered vs capacity) **unchanged** — Check-in uses extended bar with optional controls only
- Catalog context (`programId` + `evId`) is the scope key — same as 003-check-in
- **+1 is not check-in** — arrivals still use Confirm check-in; adjust routes write no HubSpot properties
- Contract source of truth: `specs/004-capacity-management/contracts/capacity-api.md` → merge to `Frontend/docs/api-contract.md`
- Multi-day Event departure reset deferred (research R-008) — park in TODO if not built in Slice 1
- Walk-in mode (003 US3): indicator stays visible above mode switch (FR/spec edge case)

---

## Next command

Run **`/speckit-implement`** (or implement Phase 2 manually), starting at **T001**.
