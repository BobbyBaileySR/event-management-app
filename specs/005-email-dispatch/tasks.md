---
description: "Task list for Email Dispatch (005-email-dispatch) — Slice 2"
---

# Tasks: Email Dispatch (Slice 2)

> Historical implementation task record. Completed mock-data, tabbed-UI, catalog-picker, and Program-scoped-route tasks describe the architecture at implementation time; those surfaces were later replaced by the mock-free event-first unified-list design. Use the current quickstart and `docs/api-contract.md` for live behaviour.

**Input**: Design documents from `/specs/005-email-dispatch/`

**Prerequisites**: [plan.md](./plan.md) · [spec.md](./spec.md) · [data-model.md](./data-model.md) · [contracts/email-api.md](./contracts/email-api.md) · **003-check-in** shipped (catalog context, attendees, admin RBAC)

**Tests**: Included — [ems-testing-discipline](../../../.cursor/rules/ems-testing-discipline.mdc) requires Jest + Vitest with each behaviour change.

**Organization**: US1 + US2 (P1), US3 + US4 (P2). Foundational phase delivers store, routes, navigation, and mock layer before story UI.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story label (US1–US4)

## Path Conventions

- **Backend**: `Backend/scripts/`, `Backend/node/tests/`
- **Frontend**: `Frontend/src/`, `Frontend/docs/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm prerequisites and HubSpot spike before live send

- [ ] T001 Confirm **003-check-in** catalog pickers + `GET …/attendees` working per `specs/005-email-dispatch/quickstart.md` §Prerequisites
- [~] T002 Execute HubSpot API spike (template list, segment list, single test send) and document outcome in `specs/005-email-dispatch/research.md` §R-003 + `Backend/CHANGELOG.md` — **2026-07-16 partial:** T002.3 (segment list) **passes live** — `crm.lists.read` scope confirmed working, adapter fixed and verified against real data. T002.2 (template list) **code-fixed but blocked live** — `GET /marketing/v3/emails` 403s on UAT; the granted `marketing-email` scope isn't sufficient, the endpoint needs `content` scope (gated behind CMS/Marketing Hub Pro+ tier). Tracked as `HS-009`. T002.4 (live test send) — **2026-07-16: `BE-EMAIL-SEND-001` shipped the real `HubSpotSingleSendAdapter`** (no longer mocked by default), gated end-to-end by `EMAIL_SEND_ENABLED`; the actual live test send against real HubSpot is still an outstanding human action before that Parameter is set `true` anywhere real — see `Backend/TODO-DONE.md`.
- [ ] T003 [P] Review design artifacts in `specs/005-email-dispatch/` (spec, plan, research, data-model, contract, quickstart)
- [X] T004 Park unresolved spike blockers in `Backend/TODO.md` (e.g. `BE-EMAIL-SPIKE-001`) if live HubSpot send not proven — **2026-07-16:** parked as `HS-009` (HubSpot-side scope/tier gap, not an EMS code blocker) instead of `BE-EMAIL-SPIKE-001`, since the code itself is correct against HubSpot's real API — see `Frontend/docs/hubspot-ops-todo.md`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Dispatch store, shared types, route guard, docs merge, frontend navigation + mock — **blocks all user stories**

**⚠️ CRITICAL**: No Email module UI until catalog-scoped routes and `dataService` email methods exist in mock mode

### Backend foundation

- [X] T005 Add `EmailDispatchJob`, `DispatchAudience`, `DispatchRecipientRow`, request/response DTOs in `Backend/scripts/Utils/Types.ts` per `specs/005-email-dispatch/data-model.md`
- [X] T006 Implement Record Storage CRUD + Event indexes in `Backend/scripts/Utils/DispatchStore.ts`
- [X] T007 Implement registered-attendee audience resolution (preview count) in `Backend/scripts/Utils/DispatchAudience.ts` (reuse `RegistrationAdapter`)
- [X] T008 Implement idempotency + hourly rate-limit helpers in `Backend/scripts/Utils/DispatchQueue.ts`
- [X] T009 [P] Add HubSpot template list adapter in `Backend/scripts/Utils/HubSpot/EmailTemplatesAdapter.ts` (mockable for tests)
- [X] T010 [P] Add HubSpot segment list adapter in `Backend/scripts/Utils/HubSpot/SegmentsAdapter.ts` (Active + Static)
- [X] T011 [P] Add HubSpot single-send adapter stub in `Backend/scripts/Utils/HubSpot/SingleSendAdapter.ts` (implement after T002 spike)
- [X] T012 Add admin-only `programs/…/email/*` rules to `Backend/scripts/Utils/RouteGuard.ts` (override legacy communications on flat routes)
- [X] T013 Wire email route placeholders in `Backend/scripts/OnHttpRouter.ts` (limits, templates, segments, preview, dispatches CRUD)

### Frontend foundation

- [X] T014 [P] Add dispatch DTO types in `Frontend/src/types.ts`
- [X] T015 [P] Add normalize helpers for email responses in `Frontend/src/utils/normalizeApi.ts`
- [X] T016 [P] Merge `specs/005-email-dispatch/contracts/email-api.md` into `Frontend/docs/api-contract.md` (Slice 2 section; deprecate flat `events/{id}/email/*`)
- [X] T017 [P] Add Slice 2 email route RBAC rows (`admin` only) in `Frontend/docs/rbac.md`
- [X] T018 [P] Update `#/events/email` route map and retire legacy email entry in `Frontend/docs/ui-routes.md`
- [X] T019 Add `sliceModulePath('email')` + catalog route handling in `Frontend/src/router/navigation.ts`
- [X] T020 Register `/events/email` route and admin gate in `Frontend/src/App.tsx` + `Frontend/src/views/ViewRouter.tsx`
- [X] T021 Add catalog-scoped email methods (`fetchEmailLimits`, `fetchEmailTemplates`, `previewEmailDispatch`, `createEmailDispatch`, etc.) in `Frontend/src/services/dataService.ts`
- [X] T022 [P] Add mock dispatches, limits, templates, segments in `Frontend/src/data/mockData.ts`
- [X] T023 [P] Add normalize tests in `Frontend/src/utils/normalizeApi.test.ts`

**Checkpoint**: Mock `USE_MOCK_API: true` — `createDataService` can call email endpoints without legacy `eventId` paths

---

## Phase 3: User Story 1 — Send now to registered attendees (Priority: P1) 🎯 MVP

**Goal**: Admin composes send with template name, dispatch name, registered-attendee audience; **Send now** accepted immediately; dispatch appears in log with **sent** rows.

**Independent Test**: `specs/005-email-dispatch/quickstart.md` §B1 — compose, send, non-blocking success, log + recipient detail (mock or live)

### Tests for User Story 1

- [X] T024 [P] [US1] Add route tests (401/403/400/429, idempotent create) in `Backend/node/tests/EmailDispatchRoutes.test.ts`
- [X] T025 [P] [US1] Add queue processing tests (pending→processing→completed, sent rows) in `Backend/node/tests/DispatchQueue.test.ts`
- [X] T026 [P] [US1] Add Compose tab + send flow tests in `Frontend/src/views/EmailDispatchView.test.tsx`
- [X] T027 [P] [US1] Add email `dataService` path tests in `Frontend/src/services/dataService.test.ts`

### Implementation for User Story 1

- [X] T028 [US1] Implement `handleGetEmailLimits` in `Backend/scripts/OnGetEmailLimits.ts`
- [X] T029 [US1] Implement `handleGetEmailTemplates` in `Backend/scripts/OnGetEmailTemplates.ts`
- [X] T030 [US1] Implement `handlePostEmailPreview` (registered audiences + manual ids) in `Backend/scripts/OnPostEmailPreview.ts`
- [X] T031 [US1] Implement `handlePostEmailDispatch` (send now, idempotency, rate limit, audit) in `Backend/scripts/OnPostEmailDispatch.ts`
- [X] T032 [US1] Implement job claim + HubSpot handoff + recipient rows in `Backend/scripts/Utils/DispatchQueue.ts` + `Backend/scripts/QueueProcessor.ts`
- [X] T033 [US1] Implement `handleGetEmailDispatches` (`view=log`) in `Backend/scripts/OnGetEmailDispatches.ts`
- [X] T034 [US1] Implement `handleGetEmailDispatchDetail` (paginated recipients) in `Backend/scripts/OnGetEmailDispatchDetail.ts`
- [X] T035 [US1] Create `EmailDispatchView` shell with **Compose | Scheduled | Dispatch log** tabs in `Frontend/src/views/EmailDispatchView.tsx`
- [X] T036 [US1] Add Compose tab: limits display, template picker (names), dispatch name, registered audience controls (all / checked-in / not / search / fixed manual multi-select) in `Frontend/src/views/EmailDispatchView.tsx`
- [X] T037 [US1] Add large-send confirm modal using `EMAIL_SEND_CONFIRM_THRESHOLD` from `Frontend/src/config.ts`
- [X] T038 [US1] Wire **Send now** + success toast (non-blocking) + Dispatch log tab list/detail in `Frontend/src/views/EmailDispatchView.tsx`
- [X] T039 [US1] Add responsive styles for tabs, forms, tables in `Frontend/src/views/EmailDispatchView.module.css`
- [X] T040 [US1] Show **Email** sidebar link for **admin** when Program + Event selected in `Frontend/src/components/Sidebar.tsx`
- [X] T041 [US1] Redirect or remove legacy `#/events/:eventId/email` usage from `Frontend/src/views/EmailView.tsx` (retire or thin redirect to `#/events/email`)

**Checkpoint**: MVP — admin can send now to registered attendees in mock mode; log shows dispatch + **sent** rows (quickstart §B1 mock path)

---

## Phase 4: User Story 2 — Schedule an email for later (Priority: P1)

**Goal**: Schedule on 15-min grid with timezone; list/edit/cancel pending; lock warning; blocked when processing.

**Independent Test**: `specs/005-email-dispatch/quickstart.md` §B2

### Tests for User Story 2

- [X] T042 [P] [US2] Add PATCH/DELETE lock tests (`409 dispatch_locked`) in `Backend/node/tests/EmailDispatchRoutes.test.ts`
- [X] T043 [P] [US2] Add scheduled list + lockWarning tests in `Frontend/src/views/EmailDispatchView.test.tsx`

### Implementation for User Story 2

- [X] T044 [US2] Extend `handlePostEmailDispatch` for scheduled jobs (15-min grid, timezone, past rejection) in `Backend/scripts/OnPostEmailDispatch.ts`
- [X] T045 [US2] Implement `handleGetEmailDispatches` (`view=scheduled`, `lockWarning`) in `Backend/scripts/OnGetEmailDispatches.ts`
- [X] T046 [US2] Implement `handlePatchEmailDispatch` (pending only) in `Backend/scripts/OnPatchEmailDispatch.ts`
- [X] T047 [US2] Implement `handleDeleteEmailDispatch` (cancel pending) in `Backend/scripts/OnDeleteEmailDispatch.ts`
- [X] T048 [US2] Extend `QueueProcessor.ts` to claim due `pending` scheduled jobs at cron tick
- [X] T049 [US2] Add **Schedule for later** UI (date, 15-min time grid, timezone picker) on Compose tab in `Frontend/src/views/EmailDispatchView.tsx`
- [X] T050 [US2] Build **Scheduled** tab: list, edit modal, cancel, lockWarning banner in `Frontend/src/views/EmailDispatchView.tsx`
- [X] T051 [US2] Extend mock layer for scheduled CRUD in `Frontend/src/data/mockData.ts`

**Checkpoint**: Schedule create/edit/cancel works in mock; warning visible within 15 minutes (SC-006)

---

## Phase 5: User Story 3 — HubSpot CRM segment audience (Priority: P2)

**Goal**: Wider audience via HubSpot segment name picker; preview/send/schedule; log shows segment summary.

**Independent Test**: `specs/005-email-dispatch/quickstart.md` §B3

### Tests for User Story 3

- [X] T052 [P] [US3] Add segment preview/create tests in `Backend/node/tests/EmailDispatchRoutes.test.ts`
- [X] T053 [P] [US3] Add segment audience UI tests in `Frontend/src/views/EmailDispatchView.test.tsx`

### Implementation for User Story 3

- [X] T054 [US3] Implement `handleGetEmailSegments` in `Backend/scripts/OnGetEmailSegments.ts`
- [X] T055 [US3] Extend `DispatchAudience.ts` for `hubspot_segment` membership at processing time
- [X] T056 [US3] Wire segment resolution in preview/create/queue paths in `Backend/scripts/OnPostEmailPreview.ts`, `OnPostEmailDispatch.ts`, `DispatchQueue.ts`
- [X] T057 [US3] Add audience type toggle + segment name picker on Compose tab in `Frontend/src/views/EmailDispatchView.tsx`
- [X] T058 [US3] Add segment fixtures to mock data in `Frontend/src/data/mockData.ts`

**Checkpoint**: Segment-based preview + send in mock; live segment send after spike (§B3)

---

## Phase 6: User Story 4 — Dispatch log + attendee filter (Priority: P2)

**Goal**: Full log UX; filter Attendees by received / did not receive a dispatch.

**Independent Test**: `specs/005-email-dispatch/quickstart.md` §B4

### Tests for User Story 4

- [X] T059 [P] [US4] Add `dispatchFilter` query tests on attendees route in `Backend/node/tests/EmailDispatchRoutes.test.ts`
- [X] T060 [P] [US4] Add attendee dispatch filter UI tests in `Frontend/src/views/AttendeesView.test.tsx`

### Implementation for User Story 4

- [X] T061 [US4] Extend `OnGetAttendees.ts` with `dispatchId` + `dispatchFilter=received|not_received` (registered attendees only)
- [X] T062 [US4] Extend `RegistrationAdapter` or dispatch join helper for attendee filter in `Backend/scripts/Utils/DispatchAudience.ts` or dedicated util
- [X] T063 [US4] Polish **Dispatch log** tab: newest-first, detail drawer/panel, paginated recipients in `Frontend/src/views/EmailDispatchView.tsx`
- [X] T064 [US4] Add dispatch filter controls (select dispatch + received/not) on Attendees in `Frontend/src/views/AttendeesView.tsx`
- [X] T065 [US4] Wire `fetchAttendees` dispatch query params in `Frontend/src/services/dataService.ts` + mock in `Frontend/src/data/mockData.ts`

**Checkpoint**: Attendee filter + log detail pass quickstart §B4 in mock mode

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Docs, security, live cutover, cleanup

- [ ] T066 [P] Add XSS guard tests for dispatch/template/segment names in `Frontend/src/views/EmailDispatchView.test.tsx`
- [ ] T067 [P] Verify non-admin cannot access Email module (RBAC) in `Frontend/src/views/EmailDispatchView.test.tsx` or router tests
- [ ] T068 Run automated suites per `specs/005-email-dispatch/quickstart.md` §A (`Backend/npm test`, `Frontend/npm test`)
- [ ] T069 Execute manual UAT checklist `specs/005-email-dispatch/quickstart.md` §B through the live ScriptRunner data path after SFTP deploy
- [ ] T070 [P] Update `Frontend/CHANGELOG.md` and `Backend/CHANGELOG.md` for Slice 2 email dispatch
- [X] T071 Remove dead legacy email mock paths — completed as part of the full runtime mock-data removal on 2026-07-15 (`mockData.ts` deleted)
- [ ] T072 Mark spec status ready for implement in `specs/005-email-dispatch/spec.md` after §B sign-off

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately; **T002 spike** blocks live HubSpot send (mock can proceed without it)
- **Foundational (Phase 2)**: Depends on Phase 1 review — **blocks all user stories**
- **US1 (Phase 3)**: Depends on Phase 2 — **MVP**
- **US2 (Phase 4)**: Depends on Phase 2; integrates with US1 compose + queue
- **US3 (Phase 5)**: Depends on Phase 2; extends US1/US2 compose + queue
- **US4 (Phase 6)**: Depends on Phase 2 + dispatch log from US1 (detail polish can parallel US2/US3 backend)
- **Polish (Phase 7)**: Depends on desired stories complete

### User Story Dependencies

| Story | Depends on | Independent test |
| :--- | :--- | :--- |
| **US1** | Foundational | Send now + log (§B1) |
| **US2** | Foundational, US1 compose/queue | Schedule CRUD + lock (§B2) |
| **US3** | Foundational, US1 pipeline | Segment send (§B3) |
| **US4** | Foundational, US1 log data | Attendee filter (§B4) |

### Parallel Opportunities

- **Phase 1**: T003 ∥ T002 (different owners)
- **Phase 2**: T009–T011 ∥ T014–T018 (backend adapters ∥ frontend docs/types)
- **Phase 3**: T024–T027 tests in parallel before T028+
- **Phase 4–6**: Backend route tasks ∥ frontend tab tasks when contracts stable

---

## Parallel Example: User Story 1

```bash
# Tests first (parallel):
T024 Backend/node/tests/EmailDispatchRoutes.test.ts
T025 Backend/node/tests/DispatchQueue.test.ts
T026 Frontend/src/views/EmailDispatchView.test.tsx
T027 Frontend/src/services/dataService.test.ts

# Backend handlers (sequential after store):
T028 → T034 OnGet*/OnPost* handlers + QueueProcessor
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Complete Phase 1–2 (Foundation)
2. Complete Phase 3 (US1)
3. **STOP and VALIDATE**: quickstart §B1 mock path
4. Deploy/demo; defer schedule/segment/attendee filter

### Incremental Delivery

1. Foundation → **US1** (send now + log) → demo
2. **US2** (schedule) → demo
3. **US3** (segments) → demo (live HubSpot)
4. **US4** (attendee filter) → demo
5. Phase 7 live UAT sign-off

### Suggested MVP scope

**Phases 1–3 only** (T001–T041): registered-attendee **Send now**, async queue, dispatch log, `#/events/email` Compose + Log tabs.

---

## Notes

- Do not enable live HubSpot send until **T002** spike passes
- All email routes **`admin` only** — do not expose `communications` role in Slice 2
- Manual multi-select: **fixed selection** — see spec Clarifications Session 2026-07-07
- Queue cron: `*/15 * * * *` — align schedule grid and lock warning
