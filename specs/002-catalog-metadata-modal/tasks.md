---
description: "Task list for Catalog Metadata & Modal Forms (002-catalog-metadata-modal)"
---

# Tasks: Catalog Metadata & Modal Forms

**Input**: Design documents from `/specs/002-catalog-metadata-modal/`

**Prerequisites**: [plan.md](./plan.md) · [spec.md](./spec.md) · [research.md](./research.md) · [data-model.md](./data-model.md) · [contracts/catalog-api.md](./contracts/catalog-api.md) · **001-catalog-admin complete**

**Tests**: Included — [ems-testing-discipline](../../.cursor/rules/ems-testing-discipline.mdc) requires Jest + Vitest with each behaviour change.

**Organization**: Backend metadata API first (Foundational), then user stories P1 → P2. Modals replace inline create forms; edit and legacy compat follow.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story label (US1–US4)

## Path Conventions

- **Backend**: `Backend/scripts/`, `Backend/node/tests/`
- **Frontend**: `Frontend/src/`, `Frontend/docs/` (gitignored locally — still update in same session)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm baseline before extending 001

- [X] T001 Confirm 001-catalog-admin deployed and prerequisites in `specs/002-catalog-metadata-modal/quickstart.md` §Prerequisites
- [X] T002 [P] Ensure working branches `002-catalog-metadata-modal` in Frontend and Backend repos

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Metadata on catalog records (API + types + docs) — **blocks all user stories**

**⚠️ CRITICAL**: No modal UI until Backend accepts metadata and tests pass

- [X] T003 Extend Program/Event record, tree node, and create/patch body types with metadata fields in `Backend/scripts/Utils/Types.ts`
- [X] T004 Implement metadata normalize/validate, clear-on-save (`null`), create/merge on POST/PATCH, and tree projection in `Backend/scripts/Utils/Catalog.ts` (existing `OnPostCatalogProgram.ts` / `OnPatchCatalogProgram.ts` / `OnPostCatalogEvent.ts` / `OnPatchCatalogEvent.ts` handlers must forward extended JSON bodies unchanged into Catalog)
- [X] T005 [P] Add metadata round-trip, PATCH clear-on-save (`null`/empty unset, omit unchanged), and date/capacity type tests in `Backend/node/tests/Catalog.test.ts`
- [X] T006 [P] Add POST/PATCH catalog route tests with metadata bodies end-to-end through handlers (`OnPostCatalogProgram.ts`, etc.) and 403 non-admin regression in `Backend/node/tests/CatalogRoutes.test.ts`
- [X] T007 [P] Merge 002 metadata delta from `specs/002-catalog-metadata-modal/contracts/catalog-api.md` into `Frontend/docs/api-contract.md`
- [X] T008 [P] Add optional metadata fields to `CatalogProgram`, `CatalogEvent`, and record types in `Frontend/src/types.ts`
- [X] T009 [P] Pass optional metadata through `normalizeCatalogProgram` / `normalizeCatalogEvent` in `Frontend/src/utils/normalizeApi.ts`
- [X] T010 [P] Extend mock catalog create/update for metadata and clear-on-save in `Frontend/src/data/mockData.ts`
- [X] T011 Extend `createProgram`, `updateProgram`, `createEvent`, `updateEvent` body types and null-clear handling in `Frontend/src/services/dataService.ts`

**Checkpoint**: API + mock layer accept metadata — verify with Backend `npm test -- Catalog` before UI work

---

## Phase 3: User Story 1 — Create Program with full metadata (Priority: P1) 🎯 MVP

**Goal**: Admin creates Program via **Program modal** with name, form ID, and optional metadata; metadata visible in active catalog tree.

**Independent Test**: Admin opens Program create modal on active tab → saves with metadata → tree shows fields → pickers still name-only.

### Tests for User Story 1

- [X] T012 [P] [US1] Add Program metadata normalizer tests in `Frontend/src/utils/normalizeApi.test.ts`

### Implementation for User Story 1

- [X] T013 [US1] Create `CatalogProgramModal` (create mode, all Program fields; `role="dialog"`, `aria-modal="true"`, `aria-labelledby` on title) in `Frontend/src/components/CatalogProgramModal.tsx`
- [X] T014 [US1] Remove inline **Program create** form; add modal trigger and Program metadata summary (`label: value` lines per FR-023) on active tab in `Frontend/src/views/CatalogAdminView.tsx`
- [X] T015 [P] [US1] Add `CatalogProgramModal` render, save, cancel, XSS, a11y (`role="dialog"`, `aria-modal="true"`), and focus moves to first field on open in `Frontend/src/components/CatalogProgramModal.test.tsx`
- [X] T016 [P] [US1] Assert non-admin `Navigate` away from `#/catalog` (FR-020 / US1 scenario 4) in `Frontend/src/views/CatalogAdminView.test.tsx`

**Checkpoint**: Program modal create works with mock or live API (quickstart §3)

---

## Phase 4: User Story 2 — Create Event with full metadata (Priority: P1)

**Goal**: Admin creates Event via **Event modal** with Program dropdown and optional metadata.

**Independent Test**: Event create modal includes Program selector → save under chosen Program → metadata in tree → pickers unchanged.

### Tests for User Story 2

- [X] T017 [P] [US2] Add Event metadata normalizer tests in `Frontend/src/utils/normalizeApi.test.ts`

### Implementation for User Story 2

- [X] T018 [US2] Create `CatalogEventModal` (create mode, Program `<select>`, all Event fields; same a11y attrs as Program modal) in `Frontend/src/components/CatalogEventModal.tsx`
- [X] T019 [US2] Remove inline **Event create** form; add modal trigger and Event metadata summary (`label: value` lines) in `Frontend/src/views/CatalogAdminView.tsx`
- [X] T020 [P] [US2] Add `CatalogEventModal` render, Program select, save, cancel, XSS, a11y, and focus-first-field-on-open tests in `Frontend/src/components/CatalogEventModal.test.tsx`

**Checkpoint**: Event modal create works; **both Program and Event inline create forms removed** (edit actions added in US3)

---

## Phase 5: User Story 3 — Edit Program and Event metadata (Priority: P2)

**Goal**: Edit via same modals (pre-filled); clear-on-save; **active tab only** — archived tab read-only, no Create/Edit.

**Independent Test**: Edit active Program/Event → change/clear metadata → tree updates; archived tab has no edit buttons (quickstart §5–§6, §8).

### Implementation for User Story 3

- [X] T021 [US3] Add edit mode (pre-fill, submit PATCH with `null` clears) to `Frontend/src/components/CatalogProgramModal.tsx`
- [X] T022 [US3] Add edit mode (read-only parent Program, clear-on-save) to `Frontend/src/components/CatalogEventModal.tsx`
- [X] T023 [US3] Add Edit actions on **active tab only**; confirm no inline create forms remain in `Frontend/src/views/CatalogAdminView.tsx`
- [X] T024 [US3] Archived tab: show metadata read-only (`label: value` lines); hide Create/Edit in `Frontend/src/views/CatalogAdminView.tsx`
- [X] T025 [P] [US3] Extend `CatalogAdminView.test.tsx` under **admin session**: edit, clear-on-save, saved metadata visible as text, archived-tab gating (no Create/Edit on archived tab). FR-020 route gate covered by T016 — do not duplicate non-admin Navigate here.

**Checkpoint**: Full modal CRUD on active tab; archived view matches spec (quickstart §5–§8)

---

## Phase 6: User Story 4 — Existing catalog records remain usable (Priority: P2)

**Goal**: Legacy records without metadata keys load, display, and accept incremental metadata via edit.

**Independent Test**: Legacy Program/Event in pickers and admin → edit modal empty metadata → save optional fields (quickstart §7).

### Tests for User Story 4

- [X] T026 [P] [US4] Add legacy fixture test (Program/Event JSON with **only 001 fields**) — load, GET projection, PATCH add metadata in `Backend/node/tests/Catalog.test.ts`
- [X] T027 [P] [US4] Add legacy catalog normalizer test (missing optional keys) in `Frontend/src/utils/normalizeApi.test.ts`
- [X] T028 [US4] Add incremental metadata on legacy record test in `Frontend/src/views/CatalogAdminView.test.tsx`

**Checkpoint**: SC-004 backward compatibility verified (qualitative — legacy fixture + incremental edit; not a literal “100%” automated count)

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Regression, docs, deploy validation

- [X] T029 [P] Confirm `CatalogPickers` still renders name-only (no metadata leak) in `Frontend/src/components/CatalogPickers.test.tsx`
- [X] T030 [P] Add responsive modal layout smoke tests (375px viewport, no `document.body` horizontal overflow) in `Frontend/src/components/CatalogProgramModal.test.tsx` and `Frontend/src/components/CatalogEventModal.test.tsx`
- [X] T031 Run `Backend/npm test` and `npm run lint:fix` per `specs/002-catalog-metadata-modal/quickstart.md` §1
- [X] T032 Run `Frontend/npm test` and `npm run lint` per `specs/002-catalog-metadata-modal/quickstart.md` §2
- [X] T033 [P] Add 002 entries to `Backend/CHANGELOG.md` and `Frontend/CHANGELOG.md`
- [X] T034 [P] Document catalog admin modal UX (create/edit modals; active vs archived tab) in `Frontend/docs/ui-routes.md` under `#/catalog`
- [X] T035 Execute manual QA in `specs/002-catalog-metadata-modal/quickstart.md` §3–§12 (**§11 responsive is a release gate** before deploy) and update Manual QA log table
- [ ] T036 [P] SFTP deploy `Backend/scripts/`; Git push Frontend after tests green

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Phase 1 — **blocks all user stories**
- **US1 (Phase 3)**: Depends on Phase 2 — **MVP** (Program modal)
- **US2 (Phase 4)**: Depends on Phase 2; sequential after US1 recommended (shared `CatalogAdminView.tsx`)
- **US3 (Phase 5)**: Depends on US1 + US2 (modals exist); extends both components + admin view
- **US4 (Phase 6)**: Depends on Phase 2 (backend); full UI path depends on US3 (edit modal)
- **Polish (Phase 7)**: Depends on US1–US4 as scoped for release

### User Story Dependencies

| Story | Priority | Depends on | Independent test |
| :--- | :---: | :--- | :--- |
| **US1** | P1 | Foundational | Program modal create + tree metadata |
| **US2** | P1 | Foundational (+ US1 for shared view) | Event modal create + Program dropdown |
| **US3** | P2 | US1, US2 | Edit + clear-on-save; archived read-only |
| **US4** | P2 | Foundational; UI via US3 | Legacy load + incremental metadata |

### Within Each User Story

- Backend tests (Foundational) before modal UI
- Modal component before `CatalogAdminView` wiring in same story
- Vitest alongside component changes

### Parallel Opportunities

- **Phase 1**: T001 ∥ T002
- **Phase 2**: T005 ∥ T006 ∥ T007 ∥ T008 ∥ T009 ∥ T010 (after T003–T004)
- **US1**: T012 ∥ T015 ∥ T016 (after T013); T014 after T013
- **US2**: T017 ∥ T020 (after T018); T019 after T018
- **US3**: T021 ∥ T022 (different files); T025 after T023–T024
- **US4**: T026 ∥ T027
- **Polish**: T029 ∥ T030 ∥ T033 ∥ T034 ∥ T036

---

## Parallel Example: Foundational

```bash
# After T003–T004 land:
T005: Backend/node/tests/Catalog.test.ts
T006: Backend/node/tests/CatalogRoutes.test.ts
T007: Frontend/docs/api-contract.md
T008: Frontend/src/types.ts
T009: Frontend/src/utils/normalizeApi.ts
T010: Frontend/src/data/mockData.ts
```

---

## Parallel Example: User Story 1

```bash
T012: Frontend/src/utils/normalizeApi.test.ts
T013: Frontend/src/components/CatalogProgramModal.tsx
# then T014 CatalogAdminView.tsx
T015: Frontend/src/components/CatalogProgramModal.test.tsx
T016: Frontend/src/views/CatalogAdminView.test.tsx (non-admin gate)
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Phase 1–2: Setup + Foundational (T001–T011)
2. Phase 3: US1 Program modal (T012–T016)
3. **STOP and VALIDATE**: quickstart §3; SFTP Backend if API changed; mock OK for UI-only iteration
4. Continue US2 → US3 → US4 → Polish

### Incremental Delivery

1. Foundational → metadata API live
2. **US1** → Program modal (partial MVP)
3. **US2** → Event modal; inline **create** forms removed
4. **US3** → Edit + archived tab rules
5. **US4** → Legacy compat tests
6. Polish → quickstart + changelogs + deploy

### Parallel Team Strategy

1. Developer A: Backend T003–T006, then support US4 tests
2. Developer B: After T011 — US1 modal (T013–T016)
3. US2/US3 sequential on `CatalogAdminView.tsx` to avoid merge conflicts

---

## Notes

- **No new routes** — extend existing POST/PATCH bodies and GET projection only
- **RouteGuard** unchanged from 001
- **FR-014** (replace inline forms) is satisfied by US1–US3 modal work; **FR-016/FR-017** constrain same-modal create/edit pattern — not duplicate scope
- Modal styling: reuse `modal-overlay` / `modal` classes from `Frontend/src/components/ConfirmModal.tsx`
- Modal a11y: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` on title; focus first field on open (full focus trap / Esc-to-close: see FE-TECH-006 in `Frontend/TODO.md`)
- Metadata tree display (FR-023): each non-empty field as plain-text `label: value` line; omit unset fields
- Date inputs: `type="date"` → store `YYYY-MM-DD`
- Capacity: no client-side range validation this release
- Deploy: Backend SFTP; Frontend Git
- Pickers: do **not** display metadata (FR-003)

---

## Task Summary

| Phase | Tasks | Count |
| :--- | :--- | ---: |
| Setup | T001–T002 | 2 |
| Foundational | T003–T011 | 9 |
| US1 Program create (P1) | T012–T016 | 5 |
| US2 Event create (P1) | T017–T020 | 4 |
| US3 Edit + archived UX (P2) | T021–T025 | 5 |
| US4 Legacy compat (P2) | T026–T028 | 3 |
| Polish | T029–T036 | 8 |
| **Total** | T001–T036 | **36** |
