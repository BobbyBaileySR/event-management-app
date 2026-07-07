---
description: "Task list for Public Registration (006-public-registration) — Slice 3"
---

# Tasks: Public Registration (Slice 3)

**Input**: Design documents from `/specs/006-public-registration/`

**Prerequisites**: [plan.md](./plan.md) · [spec.md](./spec.md) · [data-model.md](./data-model.md) · [contracts/catalog-registration.md](./contracts/catalog-registration.md) · **001–003** shipped (catalog admin, metadata modals, walk-in URL pattern)

**Tests**: Included — [ems-testing-discipline](../../../.cursor/rules/ems-testing-discipline.mdc) requires Jest + Vitest with each behaviour change.

**Organization**: US1 + US2 (P1), US3 + US4 (P2). Foundational phase delivers catalog fields, validators, types, and catalog selection before Registration panel UI.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story label (US1–US4)

## Path Conventions

- **Backend**: `Backend/scripts/`, `Backend/node/tests/`
- **Frontend**: `Frontend/src/`, `Frontend/docs/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm prerequisites and review design artifacts

- [ ] T001 Confirm **001–003** catalog pickers, Settings hub module, and admin RBAC per `specs/006-public-registration/quickstart.md` §Prerequisites
- [ ] T002 [P] Review design artifacts in `specs/006-public-registration/` (spec, plan, research, data-model, contract, quickstart)
- [ ] T003 [P] Park unresolved HubSpot editor URL derivation gaps in `Frontend/TODO.md` (e.g. `FE-REG-EDITOR-001`) if UAT finds new public URL shapes

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Landing-page validator, catalog metadata fields, types, normalization, catalog selection — **blocks all user stories**

**⚠️ CRITICAL**: No Registration panel until `GET catalog` returns registration fields and `resolveRegistration` exists

### Shared validation + types

- [ ] T004 [P] Add `isAllowedRegistrationPageUrl` in `Frontend/src/utils/hubspotRegistrationPageUrl.ts` per `specs/006-public-registration/research.md` R-002
- [ ] T005 [P] Add allowlist unit tests in `Frontend/src/utils/hubspotRegistrationPageUrl.test.ts`
- [ ] T006 [P] Add `resolveRegistration` helper + `ResolvedRegistration` type in `Frontend/src/utils/resolveRegistration.ts` per `specs/006-public-registration/data-model.md`
- [ ] T007 [P] Add `resolveRegistration` unit tests in `Frontend/src/utils/resolveRegistration.test.ts`
- [ ] T008 Add `registrationPageUrl` + `registrationPublishState` to `PROGRAM_METADATA_KEYS` and `EVENT_METADATA_KEYS` with `validateRegistrationPageUrl`, publish-state enum, and default `draft` on first URL save in `Backend/scripts/Utils/Catalog.ts`
- [ ] T009 [P] Extend `CatalogProgramRecord` / `CatalogEventRecord` + create/patch bodies in `Backend/scripts/Utils/Types.ts`
- [ ] T010 [P] Extend `CatalogProgram` / `CatalogEvent` + create/patch bodies in `Frontend/src/types.ts`
- [ ] T011 Add normalize helpers for registration fields on catalog nodes in `Frontend/src/utils/normalizeApi.ts`
- [ ] T012 [P] Add registration field normalizer tests in `Frontend/src/utils/normalizeApi.test.ts`

### Catalog selection + mock

- [ ] T013 Extend `CatalogSelection` + `CatalogPickers` with Program/Event `registrationPageUrl` and `registrationPublishState` in `Frontend/src/state/catalogContext.tsx` and `Frontend/src/components/CatalogPickers.tsx`
- [ ] T014 [P] Add sample `registrationPageUrl` / `registrationPublishState` on mock Programs/Events in `Frontend/src/data/mockData.ts`

**Checkpoint**: `GET catalog` (mock) exposes registration fields; `resolveRegistration` unit tests pass

---

## Phase 3: User Story 1 — View resolved registration link (Priority: P1) 🎯 MVP

**Goal**: Admin opens Settings → Registration panel shows resolved URL, source indicator, publish state; **Copy registration link** when published; panel hidden for non-admin.

**Independent Test**: `specs/006-public-registration/quickstart.md` §B1 — Program URL published → panel shows Program default → copy works; draft blocks copy; non-admin omits panel

### Tests for User Story 1

- [ ] T015 [P] [US1] Add `RegistrationPanel` display/copy/source/RBAC tests in `Frontend/src/components/RegistrationPanel.test.tsx`
- [ ] T016 [P] [US1] Add hostile URL XSS guard test in `Frontend/src/components/RegistrationPanel.test.tsx`
- [ ] T017 [P] [US1] Add `SettingsView` non-admin hides Registration panel test in `Frontend/src/views/SettingsView.test.tsx`

### Implementation for User Story 1

- [ ] T018 [P] [US1] Create panel layout styles in `Frontend/src/components/RegistrationPanel.module.css`
- [ ] T019 [US1] Implement `RegistrationPanel` read-only view (resolved URL, source badge, publish state, copy when published, empty/draft states) in `Frontend/src/components/RegistrationPanel.tsx`
- [ ] T020 [US1] Replace mock “Registration & access” card; embed `RegistrationPanel` for `admin` only; catalog context gate in `Frontend/src/views/SettingsView.tsx`

**Checkpoint**: US1 view + copy usable in mock mode (quickstart §B1)

---

## Phase 4: User Story 2 — Configure Program registration URL (Priority: P1)

**Goal**: Admin sets Program `registrationPageUrl` + `registrationPublishState` in Program modal or Registration panel (no Event override); defaults to **draft** on first save; modal and panel stay in sync.

**Independent Test**: `specs/006-public-registration/quickstart.md` §B2 — modal save draft → panel shows draft → panel publish → modal matches

### Tests for User Story 2

- [ ] T021 [P] [US2] Add `CatalogProgramModal` registration URL/state validation tests in `Frontend/src/components/CatalogProgramModal.test.tsx`
- [ ] T022 [P] [US2] Add POST/PATCH program `registrationPageUrl` valid/invalid + default `draft` cases in `Backend/node/tests/CatalogRoutes.test.ts`

### Implementation for User Story 2

- [ ] T023 [US2] Add **Public registration page URL** + **Publish state** fields with client validation in `Frontend/src/components/CatalogProgramModal.tsx`
- [ ] T024 [US2] Add Registration panel inline edit → `PATCH catalog/program/{id}` when Event has no override; call `bumpCatalog()` on save in `Frontend/src/components/RegistrationPanel.tsx`

**Checkpoint**: US1 + US2 — Program configure + view/copy end-to-end (quickstart §B1–B2)

---

## Phase 5: User Story 3 — Event override URL (Priority: P2)

**Goal**: Admin sets Event override URL + independent publish state; siblings keep Program default; clearing override falls back to Program.

**Independent Test**: `specs/006-public-registration/quickstart.md` §B3 — VIP override draft blocks copy; Meeting Room still Program published

### Tests for User Story 3

- [ ] T025 [P] [US3] Add `CatalogEventModal` override registration field tests in `Frontend/src/components/CatalogEventModal.test.tsx`
- [ ] T026 [P] [US3] Add POST/PATCH event override + clear override cases in `Backend/node/tests/CatalogRoutes.test.ts`

### Implementation for User Story 3

- [ ] T027 [US3] Add **Override registration page URL** + **Override publish state** fields in `Frontend/src/components/CatalogEventModal.tsx`
- [ ] T028 [US3] Add Registration panel inline edit → `PATCH catalog/event/{id}` when Event override active in `Frontend/src/components/RegistrationPanel.tsx`
- [ ] T029 [US3] Add walk-in distinction hint when `walkInFormUrl` set (FR-011) in `Frontend/src/components/RegistrationPanel.tsx`

**Checkpoint**: Event override independent of Program (quickstart §B3)

---

## Phase 6: User Story 4 — Open in HubSpot (Priority: P2)

**Goal**: **Open in HubSpot** opens editor deep link when derivable; otherwise HubSpot Marketing → Landing pages fallback with inline note.

**Independent Test**: `specs/006-public-registration/quickstart.md` §B4 — one click opens tab; fallback note when derivation fails

### Tests for User Story 4

- [ ] T030 [P] [US4] Add `tryResolveHubSpotPageEditorUrl` unit tests in `Frontend/src/utils/hubspotPageEditorUrl.test.ts`
- [ ] T031 [P] [US4] Add Open in HubSpot + fallback note tests in `Frontend/src/components/RegistrationPanel.test.tsx`

### Implementation for User Story 4

- [ ] T032 [P] [US4] Add `HUBSPOT_LANDING_PAGES_FALLBACK_URL` constant in `Frontend/src/config.ts`
- [ ] T033 [P] [US4] Add `tryResolveHubSpotPageEditorUrl` in `Frontend/src/utils/hubspotPageEditorUrl.ts` per `specs/006-public-registration/research.md` R-003
- [ ] T034 [US4] Wire **Open in HubSpot** button + fallback inline note in `Frontend/src/components/RegistrationPanel.tsx`

**Checkpoint**: US4 complete — editor or fallback (quickstart §B4)

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Contract merge, changelog, regression, manual QA

- [ ] T035 [P] Merge `specs/006-public-registration/contracts/catalog-registration.md` into `Frontend/docs/api-contract.md`
- [ ] T036 [P] Add Slice 3 entries to `Frontend/CHANGELOG.md` and `Backend/CHANGELOG.md`
- [ ] T037 Run `Backend/npm test` and `npm run lint:fix` after catalog registration changes
- [ ] T038 Run `Frontend/npm run check:quick` after Slice 3 frontend changes
- [ ] T039 Execute manual QA in `specs/006-public-registration/quickstart.md` §B (US1–US4, RBAC §B5, walk-in regression §B6)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories**
- **US1 (Phase 3)**: Depends on Foundational — no dependency on US2–US4 for read/copy with pre-seeded mock data
- **US2 (Phase 4)**: Depends on Foundational + US1 panel shell (T019–T020)
- **US3 (Phase 5)**: Depends on US2 Program path (modal pattern) — independently testable with Program already configured
- **US4 (Phase 6)**: Depends on US1 panel (T019) — can parallel with US3 after US1
- **Polish (Phase 7)**: Depends on desired user stories complete

### User Story Dependencies

| Story | Depends on | Independent test |
| :--- | :--- | :--- |
| **US1** | Phase 2 | View/copy with mock Program URL |
| **US2** | US1 panel shell | Program modal ↔ panel sync |
| **US3** | US2 (optional Program baseline) | Event override vs sibling Event |
| **US4** | US1 panel | Open in HubSpot / fallback |

### Parallel Opportunities

- **Phase 2**: T004–T007, T009–T010, T012, T014 in parallel after T008 types agreed
- **US1 tests**: T015–T017 parallel
- **US2 + US3 backend tests**: T022 + T026 parallel (same file — sequence if conflict)
- **US4**: T030–T033 parallel before T034 integration

### Parallel Example: Foundational

```bash
# Validator + resolver (Frontend, no backend dep):
T004 hubspotRegistrationPageUrl.ts
T006 resolveRegistration.ts
T005 + T007 tests

# Types (after Catalog.ts keys designed):
T009 Backend Types.ts
T010 Frontend types.ts
```

### Parallel Example: After US1

```bash
# US2 modal + US4 editor util in parallel:
T023 CatalogProgramModal.tsx
T032–T033 hubspotPageEditorUrl.ts + config.ts
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: quickstart §B1
5. Demo copy-link workflow with pre-seeded mock Program URL

### Incremental Delivery

1. Setup + Foundational → catalog fields live in mock
2. US1 → view + copy (MVP)
3. US2 → Program configure + panel edit
4. US3 → Event override
5. US4 → Open in HubSpot
6. Polish → contract, changelog, full quickstart sign-off

### Suggested MVP Scope

**User Story 1** (Phases 1–3): Registration panel read + copy + admin RBAC — sufficient for “find and share the published link” without inline edit or modals.

---

## Notes

- Reuse existing `patchCatalogProgram` / `patchCatalogEvent` in `Frontend/src/services/dataService.ts` — no new routes
- `walkInFormUrl` validator in `hubspotFormUrl.ts` — **do not** merge with landing-page validator
- Settings legacy `fetchEvent(eventId)` mock may remain for event details card; Registration panel uses **catalog selection** only
- Stop at any checkpoint to validate story independently
