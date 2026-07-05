---
description: "Task list for Attendees & Check-in (003-check-in / Slice 1)"
---

# Tasks: Attendees & Check-in (Slice 1)

**Input**: Design documents from `/specs/003-check-in/`

**Prerequisites**: [plan.md](./plan.md) · [spec.md](./spec.md) · [contracts/check-in-api.md](./contracts/check-in-api.md) · **001-catalog-admin** + **002-catalog-metadata-modal** complete on `uat`

**Tests**: Included — [ems-testing-discipline](../../.cursor/rules/ems-testing-discipline.mdc) requires Jest + Vitest with each behaviour change.

**Organization**: Backend slice API first (Foundational), then US1 Attendees → US2 Check-in → US3 Walk-in (deferred) → Polish.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story label (US1–US3)

## Path Conventions

- **Backend**: `Backend/scripts/`, `Backend/node/tests/`
- **Frontend**: `Frontend/src/`, `Frontend/docs/` (gitignored locally — still update in same session)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm Slice 1 prerequisites before attendee/check-in work

- [X] T001 Confirm **001** + **002** deployed or merged on `uat` (`specs/003-check-in/quickstart.md` §Prerequisites)
- [X] T002 [P] Confirm HubSpot attendance + registrant rules documented in `Frontend/docs/hubspot-schema.md` (verified 2026-07-05)
- [X] T003 [P] Working branch `uat` (Frontend Git); Backend handlers in git on `main` / local ahead of SFTP

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Slice 1 types, contract, RBAC, data layer — **blocks all user stories**

**⚠️ CRITICAL**: No attendee/check-in UI until Backend handlers and Frontend dataService paths exist

### Backend foundation

- [X] T004 Add slice attendee / check-in response types in `Backend/scripts/Utils/Types.ts`
- [X] T005 Implement `RegistrationAdapter` + `ContactWorkaroundRegistrationAdapter` in `Backend/scripts/Utils/HubSpot/`
- [X] T006 Implement `CheckInAdapter` + `ContactWorkaroundCheckInAdapter` in `Backend/scripts/Utils/HubSpot/`
- [X] T007 Implement `verifyCheckInJwt` (alg-pinned, issuer, expiry, Event-id match) in `Backend/scripts/Utils/CheckInJwt.ts`
- [X] T008 Add admin-only slice routes to `Backend/scripts/Utils/RouteGuard.ts`
- [X] T009 Wire GET attendees + POST checkin/scan + POST checkin in `Backend/scripts/OnHttpRouter.ts`
- [X] T010 [P] Add `RegistrationAdapter` unit tests in `Backend/node/tests/RegistrationAdapter.test.ts`
- [X] T011 [P] Add JWT unit tests in `Backend/node/tests/CheckInJwt.test.ts`

### Frontend foundation

- [X] T012 [P] Add `SliceAttendee`, `SliceAttendeesResponse`, check-in DTOs in `Frontend/src/types.ts`
- [X] T013 [P] Add `normalizeSliceAttendeesResponse`, `normalizeCheckInScanResponse`, `normalizeConfirmCheckInResponse` in `Frontend/src/utils/normalizeApi.ts`
- [X] T014 [P] Merge 003 contract from `specs/003-check-in/contracts/check-in-api.md` into `Frontend/docs/api-contract.md`
- [X] T015 [P] Update slice RBAC rows in `Frontend/docs/rbac.md`
- [X] T016 Add `fetchSliceAttendees`, `checkInScan`, `confirmCheckIn` in `Frontend/src/services/dataService.ts`
- [X] T017 [P] Add mock slice attendees, `mockCheckInScan`, `mockConfirmCheckIn`, `resetMockCheckInState` in `Frontend/src/data/mockData.ts`
- [X] T018 [P] Add `sliceModulePath` / `SLICE_MODULE_PATHS` in `Frontend/src/router/navigation.ts`

**Checkpoint**: `fetchSliceAttendees` + check-in methods work in mock mode via `createDataService`

---

## Phase 3: User Story 1 — Registered attendee list (Priority: P1) 🎯

**Goal**: Admin views searchable, filterable registered attendees for selected Program + Event.

**Independent Test**: quickstart §3 — table loads, search/filter work, non-admin blocked.

### Tests for User Story 1

- [X] T019 [P] [US1] Add `AttendeesView` render, filter, empty catalog, XSS tests in `Frontend/src/views/AttendeesView.test.tsx`
- [ ] T020 [P] [US1] Add non-admin redirect test in `Frontend/src/views/AttendeesView.test.tsx`
- [ ] T021 [P] [US1] Add `normalizeSliceAttendeesResponse` tests in `Frontend/src/utils/normalizeApi.test.ts`

### Implementation for User Story 1

- [X] T022 [US1] Implement `handleGetAttendees` in `Backend/scripts/OnGetAttendees.ts`
- [X] T023 [US1] Build `AttendeesView` (columns, sort, search, checked-in filter, catalog gate) in `Frontend/src/views/AttendeesView.tsx`
- [X] T024 [US1] Register `#/events/attendees` in `Frontend/src/App.tsx` and `Frontend/src/views/ViewRouter.tsx`
- [X] T025 [US1] Add Attendees sidebar link (admin + catalog selected) in `Frontend/src/components/Sidebar.tsx`
- [X] T026 [P] [US1] Add GET attendees route tests (401/403/200) in `Backend/node/tests/Slice1Routes.test.ts`

**Checkpoint**: Attendees list usable with `USE_MOCK_API: true`

---

## Phase 4: User Story 2 — Check-in via QR and name search (Priority: P1)

**Goal**: Admin checks in registrants by name search or QR scan; idempotent confirm; layout stable while searching.

**Independent Test**: quickstart §4–§5 — search select confirm; QR scan confirm; idempotent repeat; no full-page reload on search.

### Tests for User Story 2

- [X] T027 [P] [US2] Add check-in scan/confirm normalizer tests in `Frontend/src/utils/normalizeApi.test.ts`
- [X] T028 [P] [US2] Add `CheckInView` tests (confirm, idempotent, QR mock, admin gate, XSS, debounced search) in `Frontend/src/views/CheckInView.test.tsx`
- [X] T029 [P] [US2] Add `CheckInQrPanel` StrictMode + disabled + unmount cleanup tests in `Frontend/src/components/CheckInQrPanel.test.tsx`
- [X] T030 [P] [US2] Add mock-path `fetchSliceAttendees` filter + scan/confirm tests in `Frontend/src/services/dataService.test.ts`
- [X] T031 [P] [US2] Add POST scan/confirm error-path route tests in `Backend/node/tests/Slice1Routes.test.ts`
- [ ] T032 [P] [US2] Add happy-path POST scan (valid JWT → 200) in `Backend/node/tests/Slice1Routes.test.ts`
- [ ] T033 [P] [US2] Add happy-path POST checkin (first write calls HubSpot) in `Backend/node/tests/Slice1Routes.test.ts`
- [ ] T034 [P] [US2] Add `CheckInAdapter` unit tests in `Backend/node/tests/CheckInAdapter.test.ts`

### Implementation for User Story 2

- [X] T035 [US2] Implement `handleCheckInScan` in `Backend/scripts/OnCheckInScan.ts`
- [X] T036 [US2] Implement `handleCheckIn` (idempotent attendance write + audit) in `Backend/scripts/OnCheckIn.ts`
- [X] T037 [US2] Rewrite `CheckInView` (search, summary, confirm, catalog gate) in `Frontend/src/views/CheckInView.tsx`
- [X] T038 [US2] Create `CheckInQrPanel` with `html5-qrcode` (npm) in `Frontend/src/components/CheckInQrPanel.tsx`
- [X] T039 [US2] Add Check-in sidebar link (admin + catalog selected) in `Frontend/src/components/Sidebar.tsx`
- [X] T040 [US2] Debounce attendee search; keep check-in layout mounted during refresh (`initialLoad` vs `refreshing`) in `Frontend/src/views/CheckInView.tsx`
- [X] T041 [US2] Fix QR scanner lifecycle (StrictMode stop errors, late `start()` cleanup) in `Frontend/src/components/CheckInQrPanel.tsx`
- [X] T042 [US2] Pass `q` / `checkedIn` query through mock `getMockSliceAttendees` in `Frontend/src/data/mockData.ts` + `dataService.ts`

**Checkpoint**: Check-in usable end-to-end in mock mode (quickstart §4–§5)

---

## Phase 5: User Story 3 — Walk-in (Priority: P2) ⏸ Deferred

**Goal**: Staff submit walk-in form → create/update Contact + Parts Attended + attendance + form submission.

**Independent Test**: quickstart walk-in section (to be added when implemented).

**Defer until**: SFTP deploy of US1–US2 + live HubSpot write smoke + contacts-write scope confirmed.

- [ ] T043 [US3] Implement `handleWalkIn` in `Backend/scripts/OnWalkIn.ts`
- [ ] T044 [US3] Wire POST walk-in route in `Backend/scripts/OnHttpRouter.ts`
- [ ] T045 [P] [US3] Add walk-in route tests in `Backend/node/tests/Slice1Routes.test.ts`
- [ ] T046 [US3] Add `submitWalkIn` to `Frontend/src/services/dataService.ts` + mock handler
- [ ] T047 [US3] Add walk-in form UI (Program form fields) to `Frontend/src/views/CheckInView.tsx` or dedicated view
- [ ] T048 [P] [US3] Add walk-in Vitest coverage

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Docs, regression, deploy, live validation

- [ ] T049 [P] Document `#/events/attendees` and `#/events/check-in` in `Frontend/docs/ui-routes.md`
- [X] T050 [P] Add Slice 1 backend test note to `Backend/CHANGELOG.md`
- [ ] T051 [P] Add 003 check-in UI entries to `Frontend/CHANGELOG.md`
- [X] T052 Run `Backend/npm test` and `npm run lint:fix`
- [X] T053 Run `Frontend/npm test` and `npm run lint` (`npm run check:quick`)
- [ ] T054 [P] Add Sidebar slice-link tests (admin + catalog gating) in `Frontend/src/components/Sidebar.test.tsx`
- [ ] T055 Execute manual QA in `specs/003-check-in/quickstart.md` §3–§7 and update Manual QA log table
- [ ] T056 SFTP deploy Backend slice handlers (`OnGetAttendees`, `OnCheckInScan`, `OnCheckIn`, adapters, router)
- [ ] T057 Set ScriptRunner Parameters `CHECKIN_JWT_PUBLIC_KEY` + `CHECKIN_JWT_ISSUER`
- [ ] T058 Live smoke: `USE_MOCK_API: false` on UAT — quickstart §8
- [ ] T059 [P] Git push Frontend `uat` → UAT Pages after §55 pass

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Phase 1 — **blocks US1 + US2**
- **US1 (Phase 3)**: Depends on Phase 2 — attendee list MVP
- **US2 (Phase 4)**: Depends on Phase 2; shares `fetchSliceAttendees` with US1
- **US3 (Phase 5)**: Depends on US2 live write path — **deferred**
- **Polish (Phase 6)**: US1 + US2 mock-complete; live gates (T056–T058) after SFTP

### User Story Dependencies

| Story | Priority | Depends on | Independent test |
| :--- | :---: | :--- | :--- |
| **US1** | P1 | Foundational | Attendees table + search/filter |
| **US2** | P1 | Foundational (+ US1 shares data API) | Name + QR check-in + idempotent confirm |
| **US3** | P2 | US2 live | Walk-in create/update Contact |

### Parallel Opportunities

- **Phase 2**: T010 ∥ T011 ∥ T012 ∥ T013 ∥ T014 ∥ T015 ∥ T017 ∥ T018 (after T004–T009)
- **US1**: T019 ∥ T020 ∥ T021 (after T023); T026 after T022
- **US2**: T027–T031 ∥ T032–T034 (after handlers); T038 ∥ T035–T036
- **Polish**: T049 ∥ T051 ∥ T054 ∥ T059

---

## Implementation Strategy

### MVP (US1 + US2, mock-first)

1. Phase 1–2: Setup + Foundational (T001–T018) ✅
2. Phase 3: Attendees list (T019–T026) — mostly ✅
3. Phase 4: Check-in UI + backend (T027–T042) — mostly ✅
4. **STOP and VALIDATE**: quickstart §3–§5 with `USE_MOCK_API: true`
5. Phase 6 polish + SFTP + live smoke (T049–T059)
6. Phase 5 walk-in when unblocked (T043–T048)

### Pre-SFTP (you are here)

| Done | Remaining before SFTP |
| :--- | :--- |
| Attendees + Check-in UI (mock) | T020, T021, T032–T034 optional test gaps |
| Backend handlers in git | T055 manual QA log |
| Route error-path tests | T049 ui-routes.md sync |
| QR + search fixes | T051 CHANGELOG |

### Post-SFTP (release gate)

- T056–T058: deploy, Parameters, live smoke
- T043–T048: walk-in (separate tranche)

---

## Task Summary

| Phase | Tasks | Done | Open |
| :--- | :--- | ---: | ---: |
| Setup | T001–T003 | 3 | 0 |
| Foundational | T004–T018 | 15 | 0 |
| US1 Attendees (P1) | T019–T026 | 6 | 2 |
| US2 Check-in (P1) | T027–T042 | 14 | 3 |
| US3 Walk-in (P2) | T043–T048 | 0 | 6 |
| Polish | T049–T059 | 2 | 9 |
| **Total** | T001–T059 | **40** | **19** |

**Slice 1 mock MVP**: ~95% complete (US1 + US2). **Production complete**: pending SFTP, live smoke, walk-in, and polish tasks above.

---

## Notes

- Catalog context (`programId` + `evId`) is the only scope key — not legacy `#/events/:eventId`
- `html5-qrcode` MUST stay an npm dependency (NFR-003); no CDN script
- Attendees search on `AttendeesView` still uses immediate refetch (full-page loading) — consider debounce parity with Check-in (optional polish, not blocking)
- Update `Frontend/TODO.md` FE-SLICE1-* and `Backend/TODO.md` BE-SLICE1-* status when closing T058
- Contract source of truth for edits: `specs/003-check-in/contracts/check-in-api.md` → merge to gitignored `Frontend/docs/api-contract.md`
