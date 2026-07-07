---
description: "Task list for Attendees & Check-in (003-check-in) — US3 walk-in tranche refreshed 2026-07-06"
---

# Tasks: Attendees & Check-in (Slice 1)

**Input**: Design documents from `/specs/003-check-in/`

**Prerequisites**: [plan.md](./plan.md) · [spec.md](./spec.md) · [contracts/check-in-api.md](./contracts/check-in-api.md) · **001-catalog-admin** + **002-catalog-metadata-modal** complete on `uat`

**Tests**: Included — [ems-testing-discipline](../../../.cursor/rules/ems-testing-discipline.mdc) requires Jest + Vitest with each behaviour change.

**Organization**: US1 + US2 shipped; **US3 walk-in tranche** (iframe + catalog field) — Phases 1–4 + Polish (T049–T060) complete except T059 push + T060 QR.

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

**Independent Test**: quickstart **B2** — table loads, search/filter work, non-admin blocked.

### Tests for User Story 1

- [X] T019 [P] [US1] Add `AttendeesView` render, filter, empty catalog, XSS tests in `Frontend/src/views/AttendeesView.test.tsx`
- [X] T020 [P] [US1] Add non-admin redirect test in `Frontend/src/views/AttendeesView.test.tsx`
- [X] T021 [P] [US1] Add `normalizeSliceAttendeesResponse` tests in `Frontend/src/utils/normalizeApi.test.ts`

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

**Independent Test**: quickstart **B3–B4** — search select confirm; QR scan confirm; idempotent repeat; no full-page reload on search.

### Tests for User Story 2

- [X] T027 [P] [US2] Add check-in scan/confirm normalizer tests in `Frontend/src/utils/normalizeApi.test.ts`
- [X] T028 [P] [US2] Add `CheckInView` tests (confirm, idempotent, QR mock, admin gate, XSS, debounced search) in `Frontend/src/views/CheckInView.test.tsx`
- [X] T029 [P] [US2] Add `CheckInQrPanel` StrictMode + disabled + unmount cleanup tests in `Frontend/src/components/CheckInQrPanel.test.tsx`
- [X] T030 [P] [US2] Add mock-path `fetchSliceAttendees` filter + scan/confirm tests in `Frontend/src/services/dataService.test.ts`
- [X] T031 [P] [US2] Add POST scan/confirm error-path route tests in `Backend/node/tests/Slice1Routes.test.ts`
- [X] T032 [P] [US2] Add happy-path POST scan (valid JWT → 200) in `Backend/node/tests/Slice1Routes.test.ts`
- [X] T033 [P] [US2] Add happy-path POST checkin (first write calls HubSpot) in `Backend/node/tests/Slice1Routes.test.ts`
- [X] T034 [P] [US2] Add `CheckInAdapter` unit tests in `Backend/node/tests/CheckInAdapter.test.ts`

### Implementation for User Story 2

- [X] T035 [US2] Implement `handleCheckInScan` in `Backend/scripts/OnCheckInScan.ts`
- [X] T036 [US2] Implement `handleCheckIn` (idempotent attendance write + audit) in `Backend/scripts/OnCheckIn.ts`
- [X] T037 [US2] Rewrite `CheckInView` (search, summary, confirm, catalog gate) in `Frontend/src/views/CheckInView.tsx`
- [X] T038 [US2] Create `CheckInQrPanel` with `html5-qrcode` (npm) in `Frontend/src/components/CheckInQrPanel.tsx`
- [X] T039 [US2] Add Check-in sidebar link (admin + catalog selected) in `Frontend/src/components/Sidebar.tsx`
- [X] T040 [US2] Debounce attendee search; keep check-in layout mounted during refresh (`initialLoad` vs `refreshing`) in `Frontend/src/views/CheckInView.tsx`
- [X] T041 [US2] Fix QR scanner lifecycle (StrictMode stop errors, late `start()` cleanup) in `Frontend/src/components/CheckInQrPanel.tsx`
- [X] T042 [US2] Pass `q` / `checkedIn` query through mock `getMockSliceAttendees` in `Frontend/src/data/mockData.ts` + `dataService.ts`

**Checkpoint**: Check-in usable end-to-end in mock mode (quickstart **B3–B4a**)

---

## Phase 5: User Story 3 — Walk-in via HubSpot iframe (Priority: P2)

**Goal**: Admin toggles **Check-in | Walk-in** on Check-in; Walk-in mode embeds the Event's HubSpot form in an iframe (`walkInFormUrl` from catalog). HubSpot owns all post-submit writes — **no** `OnWalkIn.ts` / `POST …/walkin` (FR-015).

**Independent Test**: quickstart **B5** — set `walkInFormUrl` on Event → Walk-in mode loads iframe + hint → submit in HubSpot → verify in Attendees after refresh.

**Prerequisites**: US1 + US2 shipped; SFTP + live smoke done (T056–T058). HubSpot form configured externally (quickstart **B5c**).

**Cancelled (prior Phase 5)**: `OnWalkIn.ts`, `POST …/walkin`, `submitWalkIn` dataService — replaced by iframe per [plan.md](./plan.md) Session 2026-07-06.

### Phase A — Shared validation + catalog types

- [X] T043 [P] [US3] Add `isAllowedHubSpotFormUrl` in `Frontend/src/utils/hubspotFormUrl.ts`
- [X] T044 [P] [US3] Add allowlist unit tests in `Frontend/src/utils/hubspotFormUrl.test.ts`
- [X] T045 [US3] Add `validateWalkInFormUrl` + `walkInFormUrl` to `EVENT_METADATA_KEYS` and merge helpers in `Backend/scripts/Utils/Catalog.ts`
- [X] T046 [P] [US3] Extend `CatalogEventRecord` + create/patch bodies in `Backend/scripts/Utils/Types.ts`
- [X] T047 [P] [US3] Extend `CatalogEvent` + bodies in `Frontend/src/types.ts`
- [X] T048 [P] [US3] Add POST/PATCH `walkInFormUrl` valid/invalid cases in `Backend/node/tests/CatalogRoutes.test.ts`

### Phase B — Catalog admin UI

- [X] T061 [US3] Add optional **Walk-in form URL (HubSpot)** field with client validation in `Frontend/src/components/CatalogEventModal.tsx`
- [X] T062 [P] [US3] Add Event modal `walkInFormUrl` Vitest in `Frontend/src/components/CatalogEventModal.test.tsx`

### Phase C — Check-in Walk-in mode

- [X] T063 [US3] Extend `CatalogSelection` + `CatalogPickers` with `walkInFormUrl` in `Frontend/src/state/catalogContext.tsx` + `Frontend/src/components/CatalogPickers.tsx`
- [X] T064 [US3] Add Check-in | Walk-in mode switch, staff hint, iframe / empty / invalid states in `Frontend/src/views/CheckInView.tsx` + `Frontend/src/views/CheckInView.module.css` (unmount QR + iframe on mode change; reset mode on catalog change)
- [X] T065 [P] [US3] Add Check-in mode switch Vitest (toggle, iframe src, empty state, invalid URL guard, QR unmount, catalog reset) in `Frontend/src/views/CheckInView.test.tsx`

### Phase D — CSP + docs

- [X] T066 [US3] Extend HubSpot origins in `frame-src` in `Frontend/vite.config.ts` (`*.hubspot.com`, `*.hsforms.com`, `share.hsforms.com`)
- [X] T067 [P] [US3] Merge `walkInFormUrl` from `specs/003-check-in/contracts/catalog-event-walkin.md` into `Frontend/docs/api-contract.md`; confirm `POST …/walkin` absent from contract
- [X] T068 [US3] Cancel `BE-SLICE1-004` (`OnWalkIn`) in `Backend/TODO.md`; note US3 is catalog + frontend only
- [X] T069 [P] [US3] Add US3 walk-in entries to `Frontend/CHANGELOG.md` and `Backend/CHANGELOG.md`

### Phase E — Regression + QA

- [X] T070 Run `Backend/npm test` and `npm run lint:fix` after US3 backend changes
- [X] T071 Run `Frontend/npm run check:quick` after US3 frontend changes
- [ ] T072 Execute manual QA in `specs/003-check-in/quickstart.md` **B5** — update Manual QA log (B5 Walk-in column) — **partial 2026-07-07:** B5a/b/d ✅; **B5c blocked** → **FE-SLICE1-009** / **X-008**

**Checkpoint**: Walk-in mode usable on UAT — iframe loads when URL set; catalog rejects invalid URLs; B5 sign-off complete.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Docs, regression, deploy, live validation

- [X] T049 [P] Document `#/events/attendees` and `#/events/check-in` in `Frontend/docs/ui-routes.md`
- [X] T050 [P] Add Slice 1 backend test note to `Backend/CHANGELOG.md`
- [X] T051 [P] Add 003 check-in UI entries to `Frontend/CHANGELOG.md`
- [X] T052 Run `Backend/npm test` and `npm run lint:fix`
- [X] T053 Run `Frontend/npm test` and `npm run lint` (`npm run check:quick`)
- [X] T054 [P] Add Sidebar slice-link tests (admin + catalog gating) in `Frontend/src/components/Sidebar.test.tsx`
- [X] T055 Execute manual QA in `specs/003-check-in/quickstart.md` **B1–B3**, **B6–B7** — update Manual QA log (B4 live QR deferred → T060)
- [X] T056 SFTP deploy Backend slice handlers (`OnGetAttendees`, `OnCheckInScan`, `OnCheckIn`, `HubSpotApiClient`, adapters, router)
- [X] T057 Set ScriptRunner Parameters `CHECKIN_JWT_PUBLIC_KEY` + `CHECKIN_JWT_ISSUER`
- [X] T058 Live smoke: `USE_MOCK_API: false` on UAT — quickstart **B0** (+ **B6** UI/UX gate); B4 live QR excluded (see T060)
- [X] T059 [P] Git push Frontend `uat` → UAT Pages — committed locally (`f7c9f4d`); **push pending** (run `git push origin uat` to trigger deploy)
- [X] T060 **End-of-Slice 1** — live QR scanner QA per `quickstart.md` **B4b** (camera + Event JWT on UAT/Live device); pairs **FE-SLICE1-007** / **BE-SLICE1-007** — **pass 2026-07-07**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Phase 1 — **blocks US1 + US2**
- **US1 (Phase 3)**: Depends on Phase 2 — attendee list MVP
- **US2 (Phase 4)**: Depends on Phase 2; shares `fetchSliceAttendees` with US1
- **US3 (Phase 5)**: Depends on US1 + US2 shipped — **unblocked** (iframe tranche; no EMS walk-in write)
- **Polish (Phase 6)**: Code complete; T060 QR ✅; T072 B5c blocked (**X-008**)

### User Story Dependencies

| Story | Priority | Depends on | Independent test |
| :--- | :---: | :--- | :--- |
| **US1** | P1 | Foundational | Attendees table + search/filter |
| **US2** | P1 | Foundational (+ US1 shares data API) | Name + QR check-in + idempotent confirm |
| **US3** | P2 | US1 + US2 shipped | Walk-in iframe + catalog `walkInFormUrl` (quickstart **B5**) |

### Parallel Opportunities

- **Phase 2**: T010 ∥ T011 ∥ T012 ∥ T013 ∥ T014 ∥ T015 ∥ T017 ∥ T018 (after T004–T009)
- **US1**: T019 ∥ T020 ∥ T021 (after T023); T026 after T022
- **US2**: T027–T031 ∥ T032–T034 (after handlers); T038 ∥ T035–T036
- **US3**: T043 ∥ T044 (start); T046 ∥ T047 (start); T045 after T043 (mirror logic); T048 after T045–T047; T062 ∥ T065 ∥ T067 ∥ T069 (after respective impl)
- **Polish**: T049 ∥ T051 ∥ T054 ∥ T059

---

## Implementation Strategy

### US1 + US2 (shipped)

1. Phase 1–4: Setup + Foundational + Attendees + Check-in (T001–T042) ✅
2. Phase 6 polish + SFTP + live smoke (T049–T060) ✅
3. **STOP and VALIDATE**: quickstart **B2–B4b**, **B0 + B6** live ✅

### US3 walk-in tranche (shipped except B5c)

1. Phases A–E (T043–T071) ✅
2. **Remaining:** T072 **B5c** — HubSpot form → Attendees (**FE-SLICE1-009** / **X-008**)

### Slice 1 close-out

| Gate | Status |
| :--- | :---: |
| B0–B4, B6–B7 | ✅ |
| B5 Walk-in (B5a/b/d) | ✅ |
| B5c HubSpot submit → Attendees | ⬜ blocked |
| 004 capacity live QA | ⬜ blocked (**X-009**) |

---

## Task Summary

| Phase | Tasks | Done | Open |
| :--- | :--- | ---: | ---: |
| Setup | T001–T003 | 3 | 0 |
| Foundational | T004–T018 | 15 | 0 |
| US1 Attendees (P1) | T019–T026 | 8 | 0 |
| US2 Check-in (P1) | T027–T042 | 17 | 0 |
| US3 Walk-in (P2) | T043–T048, T061–T072 | 15 | 1 |
| Polish | T049–T060 | 12 | 0 |
| **Total** | T001–T072 | **68** | **1** |

**Slice 1 US1 + US2 + US3 code**: complete. **Open:** T072 B5c (HubSpot team). **Cross-slice:** 004 capacity live QA (**X-009**).

---

## Notes

- Catalog context (`programId` + `evId`) is the only scope key — not legacy `#/events/:eventId`
- `html5-qrcode` MUST stay an npm dependency (NFR-003); no CDN script
- Attendees search debounce + non-blocking refresh ✅ (2026-07-06); check-in search-first + `pageSize` 200 ✅
- Attendees pagination UI ✅; table flex height ✅; responsive Check-in/Attendees ✅; `LoadingState` spinner/skeletons ✅
- HubSpot Managed Fetch fix (`HubSpotApiClient.ts`) ✅; Check-in Vitest hang fix (stable mock) ✅
- **Performance (deferred):** live attendee load is slow — full HubSpot join per request; review after schema meeting → **BE-SLICE1-006** / **FE-SLICE1-005**
- **QR (live):** **B4b** pass 2026-07-07 — **FE-SLICE1-007** / **BE-SLICE1-007** archived
- Contract source of truth for edits: `specs/003-check-in/contracts/` → merge to gitignored `Frontend/docs/api-contract.md`
- **US3 (2026-07-06)**: HubSpot iframe walk-in — no `OnWalkIn.ts` / `POST …/walkin`; `walkInFormUrl` on Event catalog; CSP `frame-src` must match URL allowlist (NFR-004)
- **US3 task refresh**: T043–T048 replaced obsolete backend write tasks; T061–T072 cover modal, Check-in UI, CSP, docs, QA
