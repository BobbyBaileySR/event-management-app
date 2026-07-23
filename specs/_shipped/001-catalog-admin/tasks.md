---
description: "Task list for Catalog Admin (001-catalog-admin)"
---

# Tasks: Catalog Admin

**Input**: Design documents from `/specs/_shipped/001-catalog-admin/`

**Prerequisites**: [plan.md](./plan.md) · [spec.md](./spec.md) · [research.md](./research.md) · [data-model.md](./data-model.md) · [contracts/catalog-api.md](./contracts/catalog-api.md)

**Tests**: Included — [ems-testing-discipline](../../../.cursor/rules/ems-testing-discipline.mdc) and [plan.md](./plan.md) require Jest + Vitest with each behaviour change.

**Organization**: Tasks grouped by user story (P1 → P2 → P3). Backend catalog API lands before Frontend consumption.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story label (US1, US2, US3)

## Path Conventions

- **Backend**: `Backend/scripts/`, `Backend/node/tests/`
- **Frontend**: `Frontend/src/`, `Frontend/docs/` (gitignored locally — still update in same session)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Shared types and mock data for dual-repo catalog work

- [x] T001 Add `CatalogProgram`, `CatalogEvent`, and catalog API types to `Backend/scripts/Utils/Types.ts`
- [x] T002 [P] Add matching catalog TypeScript types to `Frontend/src/types/index.ts` (or dedicated `Frontend/src/types/catalog.ts`)
- [x] T003 [P] Add `MOCK_CATALOG` active tree fixture to `Frontend/src/data/mockData.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core catalog storage, RBAC, and contract docs — **blocks all user stories**

**⚠️ CRITICAL**: No user story work until this phase is complete

- [x] T004 Implement Record Storage CRUD, validation, and name-uniqueness helpers in `Backend/scripts/Utils/Catalog.ts`
- [x] T005 [P] Add catalog mutation audit helpers (`catalog.program.*`, `catalog.event.*`) in `Backend/scripts/Utils/Audit.ts`
- [x] T006 [P] Add catalog RouteGuard rules (GET all roles; POST/PATCH admin) in `Backend/scripts/Utils/RouteGuard.ts`
- [x] T007 [P] Merge catalog API shapes and error codes from `specs/_shipped/001-catalog-admin/contracts/catalog-api.md` into `Frontend/docs/api-contract.md`
- [x] T008 [P] Update catalog RBAC rows (GET all roles; `includeArchived` admin-only) in `Frontend/docs/rbac.md`
- [x] T009 Add catalog route map placeholders in `Backend/scripts/OnHttpRouter.ts`

**Checkpoint**: Foundation ready — user story implementation can begin

---

## Phase 3: User Story 1 — Navigate the event catalog (Priority: P1) 🎯 MVP

**Goal**: All authenticated roles select active Program + Event from shared navigation pickers backed by `GET catalog`.

**Independent Test**: Sign in as viewer or admin → pickers show active Programs/Events only → selection persists in session context → archived entries absent from pickers.

### Tests for User Story 1

- [x] T010 [P] [US1] Add unit tests for active tree assembly and filters in `Backend/node/tests/Catalog.test.ts`
- [x] T011 [P] [US1] Add GET `catalog` route tests (200 all roles, 403 `includeArchived` for non-admin) in `Backend/node/tests/CatalogRoutes.test.ts`
- [x] T012 [P] [US1] Add `normalizeCatalogResponse` tests in `Frontend/src/utils/normalizeApi.test.ts`

### Implementation for User Story 1

- [x] T013 [US1] Implement `handleGetCatalog` with `includeArchived` admin gate in `Backend/scripts/OnGetCatalog.ts`
- [x] T014 [US1] Wire GET `catalog` handler in `Backend/scripts/OnHttpRouter.ts`
- [x] T015 [P] [US1] Add `normalizeCatalogResponse` in `Frontend/src/utils/normalizeApi.ts`
- [x] T016 [P] [US1] Add `fetchCatalog` with mock/live switch in `Frontend/src/services/dataService.ts`
- [x] T017 [US1] Add catalog selection context (`programId`, `evId`) in `Frontend/src/state/catalogContext.tsx`
- [x] T018 [US1] Create `CatalogPickers` component (Program then Event, active only) in `Frontend/src/components/CatalogPickers.tsx`
- [x] T019 [US1] Integrate `CatalogPickers` and context provider into `Frontend/src/components/AppLayout.tsx`
- [x] T020 [P] [US1] Add render and XSS safety tests for pickers in `Frontend/src/components/CatalogPickers.test.tsx`

**Checkpoint**: User Story 1 independently testable — navigation pickers work with mock or live API

---

## Phase 4: User Story 2 — Create and maintain Programs and Events (Priority: P2)

**Goal**: Admins create and edit Programs (name, HubSpot form ID) and Events (name, Parts Attended option) via catalog admin UI.

**Independent Test**: Admin creates Program + two Events → appears in pickers after save → non-admin cannot access admin screens or mutate via API (403).

### Tests for User Story 2

- [x] T021 [P] [US2] Add Catalog CRUD unit tests (validation, duplicate Program name 409) in `Backend/node/tests/Catalog.test.ts`
- [x] T022 [P] [US2] Add POST/PATCH catalog route tests (401/403/422/409 happy paths) in `Backend/node/tests/CatalogRoutes.test.ts`

### Implementation for User Story 2

- [x] T023 [US2] Implement `handlePostCatalogProgram` (validate → rate limit → act → audit) in `Backend/scripts/OnPostCatalogProgram.ts`
- [x] T024 [US2] Implement `handlePatchCatalogProgram` for name/form updates in `Backend/scripts/OnPatchCatalogProgram.ts`
- [x] T025 [US2] Implement `handlePostCatalogEvent` in `Backend/scripts/OnPostCatalogEvent.ts`
- [x] T026 [US2] Implement `handlePatchCatalogEvent` for name/partsAttendedOption updates in `Backend/scripts/OnPatchCatalogEvent.ts`
- [x] T027 [US2] Wire POST/PATCH catalog handlers in `Backend/scripts/OnHttpRouter.ts`
- [x] T028 [P] [US2] Add `createProgram`, `updateProgram`, `createEvent`, `updateEvent` to `Frontend/src/services/dataService.ts`
- [x] T029 [US2] Build active catalog CRUD forms/lists in `Frontend/src/views/CatalogAdminView.tsx`
- [x] T030 [US2] Register catalog admin route and admin-only UI gate in `Frontend/src/App.tsx` and `Frontend/src/views/ViewRouter.tsx`
- [x] T031 [P] [US2] Add CatalogAdminView render, XSS, and role-gating tests in `Frontend/src/views/CatalogAdminView.test.tsx`

**Checkpoint**: User Stories 1 + 2 work — staff navigate; admins self-service catalog structure

---

## Phase 5: User Story 3 — Archive Programs and Events (Priority: P3)

**Goal**: Admins archive/unarchive with Program cascade; archived items visible only in dedicated admin view; pickers stay active-only.

**Independent Test**: Archive Event → gone from pickers → visible in archived admin tab → unarchive restores pickers. Archive Program → all Events cascade → Program unarchive restores cascade-archived Events.

### Tests for User Story 3

- [x] T032 [P] [US3] Add cascade archive/unarchive and `archivedViaProgramId` tests in `Backend/node/tests/Catalog.test.ts`
- [x] T033 [P] [US3] Add PATCH archive/unarchive route tests in `Backend/node/tests/CatalogRoutes.test.ts`

### Implementation for User Story 3

- [x] T034 [US3] Extend cascade archive and Program unarchive restore in `Backend/scripts/Utils/Catalog.ts`
- [x] T035 [US3] Extend PATCH handlers for `archived` transitions in `Backend/scripts/OnPatchCatalogProgram.ts` and `Backend/scripts/OnPatchCatalogEvent.ts`
- [x] T036 [US3] Add archived catalog tab using `fetchCatalog({ includeArchived: true })` in `Frontend/src/views/CatalogAdminView.tsx`
- [x] T037 [P] [US3] Add archive/unarchive helpers to `Frontend/src/services/dataService.ts`
- [x] T038 [P] [US3] Add archive/unarchive UI flow tests in `Frontend/src/views/CatalogAdminView.test.tsx`

**Checkpoint**: All three user stories independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Docs, CI checks, and end-to-end validation

- [x] T039 [P] Document catalog admin route and picker behaviour in `Frontend/docs/ui-routes.md`
- [x] T040 Run `Backend/npm test` and `npm run lint:fix` via `Backend/node/tooling/ems-check.sh`
- [x] T041 Run `Frontend/npm test` and `npm run lint` via `Frontend/tooling/ems-check.sh`
- [x] T042 Execute manual scenarios in `specs/_shipped/001-catalog-admin/quickstart.md` — **partial (2026-07-03)**: §1–§3, §7 **pass**; §5 partial (BUG-1–3); §4/§6/§8/§9/§10 not complete — see `quickstart.md` QA log + `bugs.md`
- [x] T043 [P] Add catalog admin entries to `Frontend/CHANGELOG.md` and `Backend/CHANGELOG.md`

---

## Phase 7: Bug fixes (2026-07-03 manual QA)

**Purpose**: Fix issues documented in [bugs.md](./bugs.md). **Do not implement until approved.**

**Independent test**: Re-run quickstart §4–§6, §8 after fixes; §9–§10 when ready.

### BUG-2 — `includeArchived` route (fix first)

- [x] T044 [P] Split query string from `X-EMS-Route` in `Frontend/src/api/client.ts` (path only in header; query on listener URL)
- [x] T045 [P] Align `fetchCatalog({ includeArchived: true })` in `Frontend/src/services/dataService.ts` with fixed client
- [x] T046 [P] Add backend regression test for `GET catalog` + `queryStringParams.includeArchived` in `Backend/node/tests/CatalogRoutes.test.ts`

### BUG-3 — Archived tab lists wrong entities

- [x] T047 [US3] Fix archived-only tree in `Backend/scripts/Utils/Catalog.ts` (programs with archived events only; events array archived-only)
- [x] T048 [P] [US3] Mirror archived-only semantics in `Frontend/src/data/mockData.ts` `getMockCatalog(true)`
- [x] T049 [US3] Update archived tab UI in `Frontend/src/views/CatalogAdminView.tsx` (event-only vs archived program blocks)
- [x] T050 [P] [US3] Extend `Backend/node/tests/Catalog.test.ts` and `CatalogAdminView.test.tsx` for individual-event archive in archived view

### BUG-1 — Pickers stale after archive + placeholders

- [x] T051 [US1] Add “Select Program” / “Select Event” placeholders and clear invalid selection in `Frontend/src/components/CatalogPickers.tsx`
- [x] T052 [US1] Refresh picker catalog after admin archive/unarchive via `Frontend/src/state/catalogContext.tsx` + `CatalogAdminView.tsx`
- [x] T053 [P] [US1] Add picker regression tests in `Frontend/src/components/CatalogPickers.test.tsx`

### Re-validation

- [x] T054 Re-run quickstart §4 (viewer), §5–§6, §8; then §9–§10 per `specs/_shipped/001-catalog-admin/quickstart.md` — **pass (2026-07-04)**
- [x] T055 [P] Add bug-fix entry to `Frontend/CHANGELOG.md` and `Backend/CHANGELOG.md`

**Checkpoint**: Archived tab works live; archived list correct; pickers reset on archive

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — **blocks all user stories**
- **User Story 1 (Phase 3)**: Depends on Phase 2 — **MVP**
- **User Story 2 (Phase 4)**: Depends on Phase 2; benefits from US1 pickers for verification
- **User Story 3 (Phase 5)**: Depends on Phase 2; requires Programs/Events from US2 for realistic flows
- **Polish (Phase 6)**: Depends on desired user stories complete

### User Story Dependencies

| Story | Depends on | Independent test |
| :--- | :--- | :--- |
| **US1** (P1) | Foundational only | Pickers + GET catalog |
| **US2** (P2) | Foundational (+ US1 for picker verification) | Admin CRUD via API + UI |
| **US3** (P3) | Foundational (+ US2 for seed data) | Archive/unarchive + cascade |

### Within Each User Story

- Tests written alongside or immediately before handlers (same PR)
- Backend handlers before Frontend `dataService` methods that call them
- `dataService` before UI components

### Parallel Opportunities

- **Phase 1**: T002 ∥ T003
- **Phase 2**: T005 ∥ T006 ∥ T007 ∥ T008 (after T004 types land in T001)
- **US1**: T010 ∥ T011 ∥ T012; T015 ∥ T016; T020 after T018
- **US2**: T021 ∥ T022; T028 after handlers; T031 after T029
- **US3**: T032 ∥ T033; T037 ∥ T038
- **Polish**: T039 ∥ T043

---

## Parallel Example: User Story 1

```bash
# Backend tests in parallel:
T010: Backend/node/tests/Catalog.test.ts
T011: Backend/node/tests/CatalogRoutes.test.ts

# Frontend normalizer + dataService in parallel (after T013–T014):
T015: Frontend/src/utils/normalizeApi.ts
T016: Frontend/src/services/dataService.ts
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Complete Phase 1: Setup (T001–T003)
2. Complete Phase 2: Foundational (T004–T009)
3. Complete Phase 3: User Story 1 (T010–T020)
4. **STOP and VALIDATE**: Quickstart §3–§4 partial (pickers + empty/active catalog)
5. SFTP deploy Backend GET handler; Frontend Git push with pickers

### Incremental Delivery

1. Setup + Foundational → catalog infrastructure ready
2. **US1** → navigation pickers (MVP for Slice 1 context)
3. **US2** → admin self-service catalog CRUD
4. **US3** → archive lifecycle + archived admin view
5. Polish → full quickstart + changelogs

### Parallel Team Strategy

1. One developer: Backend T004–T014, then Frontend T015–T020 (US1 MVP)
2. Second developer (after T009): Frontend mock/types T002–T003 while Backend finishes Catalog.ts
3. US2 and US3 sequential on Backend handlers; Frontend can trail one phase behind

---

## Notes

- Deploy Backend via **SFTP** (`scripts/` only); Frontend via **Git**
- Do not widen CSP or add HubSpot calls for catalog
- `USE_MOCK_API: true` remains valid until Backend handlers are deployed — mock catalog must mirror contract shapes
- Legacy `#/events/:eventId` routes stay until attendee slice; catalog context (`programId` + `evId`) is Slice 1 source of truth

---

## Task Summary

| Phase | Tasks | Count |
| :--- | :--- | ---: |
| Setup | T001–T003 | 3 |
| Foundational | T004–T009 | 6 |
| US1 Navigate (P1) | T010–T020 | 11 |
| US2 Create/maintain (P2) | T021–T031 | 11 |
| US3 Archive (P3) | T032–T038 | 7 |
| Polish | T039–T043 | 5 |
| Bug fixes | T044–T055 | 12 |
| **Total (original)** | T001–T043 | **43** |
| **Total (incl. bugs)** | T001–T055 | **55** |
