# Tasks: Data Caching Layer (Slice 012)

**Input**: Design documents from `Frontend/specs/012-data-caching-layer/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/events-capacity-summary.md](contracts/events-capacity-summary.md), [quickstart.md](quickstart.md)

**Tests**: INCLUDED — required by spec FR-014 and the repo's testing discipline (tests ship in the same change).

**Organization**: Grouped by user story. Note: ADR-015 fixed a **big-bang** delivery — the whole slice ships as one change — but phases below are still ordered so each story checkpoint is independently verifiable while building. The backend bulk route sits in Phase 2 (Foundational) because EventsView's clean migration depends on it (serves US1 *and* US4).

**Path conventions**: `Frontend/…` and `Backend/…` from the repo root (two-folder web app per plan.md).

---

## Phase 1: Setup

**Purpose**: Add the one new dependency; nothing else to scaffold.

- [x] T001 Add `@tanstack/react-query` v5 to `Frontend/package.json` (npm install; **no** devtools package per research R1); verify `npm run build` passes and confirm no `vite.config.ts`/CSP change is needed (bundled like Chart.js)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Backend bulk route (blocks EventsView migration) + the core `src/data/` infrastructure every story consumes.

**⚠️ CRITICAL**: No user story phase can begin until this phase is complete.

- [x] T002 [P] Implement `Backend/scripts/OnGetCapacitySummary.ts` per [contracts/events-capacity-summary.md](contracts/events-capacity-summary.md) — portable handler (`EmsRequest` → `jsonResponse()`), mirror `OnGetScheduledEmailSummary.ts`'s list-active-events-and-aggregate loop, reuse the checked-in counter source used by `OnGetCapacityStatus.ts` (no new `@sr-connect/record-storage` importer)
- [x] T003 Add `ROUTE_TABLE` entry in `Backend/scripts/Utils/Routes.ts` — pattern `events/capacity-summary`, GET, `roles: ['admin']`; **must match before any `events/:eventId/*` pattern** (contract §implementation notes)
- [x] T004 [P] Write `Backend/node/tests/CapacitySummary.test.ts` — 401 no session, 403 viewer, 405 POST, empty portfolio `[]`, multi-event aggregation incl. standalone Event (`programId: null`) and null-capacity Event, counter-source agreement with per-event handler; Platform stores mocked
- [x] T005 [P] Contract sync in the same change: add `GET events/capacity-summary` section to `Frontend/docs/api-contract.md` and the admin-only row to `Frontend/docs/rbac.md` (copy from the contract draft; update both docs' changelog/footer lines)
- [x] T006 [P] Add `fetchCapacitySummary()` to `Frontend/src/services/dataService.ts` + `normalizeCapacitySummaryResponse` in `Frontend/src/services/normalizeApi.ts` (pattern: `fetchScheduledEmailSummary`), with a Vitest mapping test (raw JSON → normalized rows, missing/odd fields tolerated)
- [x] T007 [P] Create `Frontend/src/data/queryKeys.ts` — central key factory per [data-model.md](data-model.md) §1, including the param-normalization rule (stable key order, defaults filled) so `{page:1}` ≡ `{}`
- [x] T008 [P] Create `Frontend/src/data/queryClient.ts` — module-scoped `QueryClient` factory with fail-safe global defaults: `staleTime: 0`, **`refetchOnWindowFocus: false`** (a focus refetch of attendees would fire un-viewed PII read-audit entries — breaks SC-004/§C7.2), no retry on 401/403 (401 routes to sign-out per research R6)
- [x] T009 Mount `QueryClientProvider` in `Frontend/src/App.tsx` using the T008 client (token-clear effect comes in US2, T026)
- [x] T010 [P] Create `Frontend/src/testing/renderWithQueryClient.tsx` test util — fresh `QueryClient` per test (retry off, `gcTime: 0`), wrapping Testing Library `render` (research R8)
- [x] T011 Write foundational data-layer spec `Frontend/src/data/__tests__/queryClient.test.tsx` — dedup: two components using the same key issue one request (FR-013); global defaults are conservative (`staleTime: 0`, focus-refetch off)

**Checkpoint**: Backend route live in tests, `src/data/` core exists — story phases can begin.

---

## Phase 3: User Story 1 — Returning to a screen feels instant (Priority: P1) 🎯 MVP

**Goal**: Stale-while-revalidate caching behind typed domain hooks; all six views migrated off the hand-rolled `loading/error/reloadKey` ladder.

**Independent Test**: quickstart §B1 — revisit Programs & Events within 5 min: instant paint, no new catalog request; after expiry: instant paint + background refresh; attendees/audit always issue a fresh read.

### Implementation for User Story 1

- [x] T012 [P] [US1] Create `Frontend/src/data/hooks/useCatalog.ts` — `useQuery` over `dataService.fetchCatalog` via `useDataService()`, key `['catalog', …]`, `staleTime` 5 min / `gcTime` 30 min (incl. `includeArchived` param variant)
- [x] T013 [P] [US1] Create `Frontend/src/data/hooks/useCapacity.ts` — `useCapacitySummary()` (key `['capacity','summary']`, 30 s / 5 min, query fn `fetchCapacitySummary`) and `useEventCapacity(eventId)` (key `['capacity', eventId]`, CheckInView's existing tighter `refetchInterval` preserved as an option)
- [x] T014 [P] [US1] Create `Frontend/src/data/hooks/useAttendees.ts` — key `['attendees', eventId, params]`, **`staleTime: 0`**, `gcTime` 5 min (PII retention bound)
- [x] T015 [P] [US1] Create `Frontend/src/data/hooks/useAuditLog.ts` — key `['audit', params]`, **`staleTime: 0`**, `gcTime` 5 min
- [x] T016 [P] [US1] Create `Frontend/src/data/hooks/useDispatches.ts` — keys `['dispatches', eventId, params]` + `['dispatches','scheduled-summary']`, 30 s / 5 min
- [x] T017 [US1] Implement the shared refetch-failure affordance (research R6) used by the hooks/views: background-refetch failure with data present keeps the snapshot + non-blocking indicator with retry (reuse `useToast()`/inline `role="alert"` row); first-load failure keeps today's full `loading → error` ladder; 401 maps to the existing sign-out flow
- [x] T018 [US1] Migrate `Frontend/src/views/EventsView.tsx` — consume `useCatalog` + `useCapacitySummary`; refactor `enrichPortfolioWithCapacity` in `Frontend/src/utils/catalogEventPresentation.ts` to take summary rows keyed by `eventId` (keep the per-row fallback `{checkedInCount: 0, capacity: event.capacity ?? null}`); delete the `reloadKey` ladder; update its unit tests
- [x] T019 [P] [US1] Migrate `Frontend/src/views/OverviewView.tsx` — `loadStats` reads via `useCatalog`/`useCapacitySummary`/`useAuditLog`/`useDispatches` scheduled-summary; the per-event capacity fan-out switches to the summary (supersedes the FE-REDESIGN-021 keep-the-fan-out decision now the bulk route exists — record in `Frontend/TODO.md` at T036)
- [x] T020 [P] [US1] Migrate `Frontend/src/views/EventHubView.tsx` to the domain hooks; remove its local ladder
- [x] T021 [P] [US1] Migrate `Frontend/src/views/AttendeesView.tsx` — list reads via `useAttendees` (page/filter params in the key so filter swaps never bleed rows); imperative mutation flows stay (invalidation wired in US3)
- [x] T022 [P] [US1] Migrate `Frontend/src/views/CheckInView.tsx` — mount/capacity reads via `useEventCapacity` (existing live-counter cadence preserved); interaction-driven fetches (server search, scan lookups) may remain direct `dataService` calls; do **not** touch the parked `FE-ARCH-004` refactor scope
- [x] T023 [P] [US1] Migrate `Frontend/src/views/AuditView.tsx` — reads via `useAuditLog` with page/filter params in the key
- [x] T024 [US1] Update all six view test suites to `renderWithQueryClient`; keep every existing assertion (incl. XSS hostile-string guards) green — SC-006; add one representative stale-paint-then-update spec and one refetch-failure-keeps-snapshot spec (a view of your choice, e.g. `EventsView.test.tsx`)
- [x] T025 [US1] Seam review (ADR-015 stop signal): confirm the migration forced **no** changes outside `src/data/`, the six views, `catalogEventPresentation.ts`, `App.tsx`, `dataService.ts`/`normalizeApi.ts`, and tests — if it did, stop and reassess before proceeding. **Result: PASS, proceed.** All touched files fall within the declared set or are minor/expected additions: `src/types.ts` (2 new interfaces feeding the declared `dataService.ts`/`normalizeApi.ts` contract), `src/testing/renderWithQueryClient.tsx` (T010's own named deliverable), `src/components/RefetchFailureBanner.{tsx,module.css,test.tsx}` (T017's shared affordance — a new small presentational component alongside existing `ViewErrorState`/`LoadingState`, not new coupling), and `package.json`/`package-lock.json` (T001's dependency, pre-justified in plan.md's Complexity Tracking). One real cross-file effect: `enrichPortfolioWithCapacity`'s signature change forced a **minimal, behavior-preserving** call-site adaptation in `OverviewView.tsx` (still builds its summary rows via its own existing per-event fan-out — no bulk-route switch, that's still T019) so it keeps compiling ahead of its own migration. `OverviewView.tsx` is itself one of "the six views" in the declared set, and the fix required no non-mechanical restructuring — not a seam-in-the-wrong-place signal. EventsView.tsx itself needed only the mechanical hook-swap ADR-015 R2 expects. T019–T024 (other five views' migration + full six-view test-suite update) intentionally **not** started this session per explicit scope — proceeding to them is a future session's work, not blocked by anything found here.

**Checkpoint**: Repeat navigation instant; all suites green — quickstart §B1 passes.

---

## Phase 4: User Story 2 — Sign-out and re-sign-in leave nothing behind (Priority: P1)

**Goal**: The single lifecycle invariant — token change ⇒ cache gone.

**Independent Test**: quickstart §B5 + §C7.1 — sign out, sign in as another user: nothing from the prior session paints; no application data in any browser storage.

### Implementation for User Story 2

- [x] T026 [US2] Add the token-watch effect beside the provider in `Frontend/src/App.tsx` — on any `session?.token` change: `queryClient.cancelQueries()` then `queryClient.clear()` (unconditional; covers sign-out, sign-in, swap; discards in-flight old-token responses per data-model §4)
- [x] T027 [P] [US2] Write `Frontend/src/data/__tests__/sessionLifecycle.test.tsx` — cache empty after token change; a resolved in-flight response from the old token is not written back; no `localStorage`/`sessionStorage` writes occur anywhere in the data layer (spy on Storage prototype)

**Checkpoint**: §C7.1/§C7.4 behaviours provable — quickstart §B5 passes.

---

## Phase 5: User Story 5 — The PII audit trail stays truthful (Priority: P1)

**Goal**: Prefetch exists only for non-PII data, enforced by construction; attendee/audit reads remain one-per-real-view.

**Independent Test**: quickstart §C7.2 — exercise every screen except Registered Attendees: zero `attendees.list` audit entries; open it once: exactly one.

### Implementation for User Story 5

- [x] T028 [P] [US5] Create `Frontend/src/data/prefetch.ts` — exposes **only** `prefetchCatalog(queryClient, dataService)` and `prefetchCapacitySummary(queryClient, dataService)`; header comment states the audit-integrity rule and links ADR-016 (structural enforcement — there is no function to call for PII)
- [x] T029 [US5] Wire the sign-in warming trigger (research R9): after a session is set (live auth + `USE_MOCK_AUTH` paths), fire both prefetches once — in the sign-in completion path (`Frontend/src/services/authService.ts` consumer or the post-login effect in `Frontend/src/App.tsx`, whichever owns "session became available")
- [x] T030 [P] [US5] Write `Frontend/src/data/__tests__/prefetch.test.tsx` — module surface exports exactly the two non-PII functions (a PII prefetch cannot be expressed); `useAttendees`/`useAuditLog` issue a network call on **every** mount (staleTime 0, focus-refetch off ⇒ reads per real view only)

**Checkpoint**: All three P1 stories verifiable — §C7.1/C7.2 runnable.

---

## Phase 6: User Story 3 — Actions are reflected everywhere at once (Priority: P2)

**Goal**: Central invalidation helpers; every mutation refreshes the datasets it affects.

**Independent Test**: quickstart §B3 — check someone in, then visit Registered Attendees and Programs & Events without a refresh: both reflect it.

### Implementation for User Story 3

- [x] T031 [US3] Create `Frontend/src/data/invalidation.ts` — named helpers per [data-model.md](data-model.md) §3: `invalidateAfterCatalogChange()`, `invalidateAfterAttendeeMutation(eventId)` (check-in/undo/walk-in/remove), `invalidateAfterCapacityAdjust(eventId)`, `invalidateAfterCampaignChange(eventId)`; over-invalidate when in doubt; only this module constructs invalidation calls (FR-010)
- [x] T032 [US3] Wire helpers at every mutation success site: catalog CRUD modals (`Frontend/src/views/EventsView.tsx` admin flows), check-in/undo/remove (`Frontend/src/views/CheckInView.tsx`, `Frontend/src/views/AttendeesView.tsx` / shared attendee-mutation flows), capacity ±1 adjust (CheckInView), campaign compose/edit/cancel (`Frontend/src/hooks/useEmailDispatchWorkflow.ts` and/or the campaign modal owner)
- [x] T033 [P] [US3] Write `Frontend/src/data/__tests__/invalidation.test.tsx` — each helper marks exactly its mapped key families stale (and not others); one integration spec: mounted attendees + capacity views refetch after `invalidateAfterAttendeeMutation`

**Checkpoint**: quickstart §B3 passes end-to-end.

---

## Phase 7: User Story 4 — Programs & Events loads fast the first time (Priority: P2)

**Goal**: Verify the request-shape win the Foundational route + US1 migration produced, plus graceful degradation.

**Independent Test**: quickstart §B2 — loading Programs & Events issues exactly `catalog` + `events/capacity-summary`, zero per-event capacity calls; Check-in still uses the per-event route.

### Implementation for User Story 4

- [x] T034 [US4] Add request-shape specs to `Frontend/src/views/EventsView.test.tsx` (and `OverviewView.test.tsx`) — with N events mocked, exactly one `fetchCatalog` + one `fetchCapacitySummary` call, zero `fetchEventCapacityStatus` calls; CheckInView spec asserts the per-event call remains
- [x] T035 [P] [US4] Add summary-failure degradation specs — `fetchCapacitySummary` rejection still renders the catalog with fallback capacity values (per-row fallback from T018), no blank error screen (spec acceptance US4-2)

**Checkpoint**: All five stories functional — quickstart §B complete.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [x] T036 [P] Docs + trackers: update `Frontend/CHANGELOG.md` + `Backend/CHANGELOG.md` (what shipped + why); `Frontend/TODO.md` — `FE-PERF-001` → done-pending-QA with pointer here, note the FE-REDESIGN-021 fan-out supersession (T019), re-scope note on `FE-ARCH-006` (data-fetching ladder now subsumed; pagination remainder stays); `Backend/TODO.md` — `BE-PERF-001` status; confirm `FE-PERF-002` (optimistic updates) still parked with its design notes
- [x] T037 Full verification: `cd Frontend && npm test && npm run build`; `cd Backend/node && npm test && npm run lint:fix` — all green (SC-006)
- [ ] T038 Backend SFTP upload of `Backend/scripts/` (incl. `OnGetCapacitySummary.ts`, `Routes.ts`) to the QA environment, then re-verify quickstart §B2 against the deployed listener — **not run this session** (no SFTP access from this environment); upload list prepared, see [quickstart.md](quickstart.md) status note + session summary
- [ ] T039 Run quickstart §A + §B in full on UAT; record results in [quickstart.md](quickstart.md) sign-off table — **§A done locally** (60/60 FE suites, 42/42 BE suites, lint + build clean); **§B partial** — each scenario's mechanism has local automated-spec coverage (mapped in quickstart.md §B), but the manual steps themselves need a live UAT deploy (T038) — remains open
- [ ] T040 Operator runs quickstart **§C** (C2–C6 + C7.1–C7.4) and signs off — slice QA is **not** complete in this file until §C passes (repo slice-QA rule); if an `EMSDEVELOP-*` Jira item tracks this slice, transition + comment it per the Jira sync discipline

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: none
- **Phase 2 (Foundational)**: T001 for frontend tasks; backend tasks T002–T005 are independent of T001. T003 depends on T002; T009 on T008; T011 on T007–T010. **Blocks all story phases.**
- **Phase 3 (US1)**: needs Phase 2 complete (T018 specifically needs T006/T013). Hooks T012–T016 before views T018–T023; T017 before/with the views; T024–T025 last
- **Phase 4 (US2)**: needs T009 only — can run parallel with Phase 3 after Foundational
- **Phase 5 (US5)**: T028 needs T007–T008 + T012–T013 (prefetch warms catalog/summary); T030 needs T014–T015
- **Phase 6 (US3)**: needs US1's hooks + migrated mutation sites (T018–T023)
- **Phase 7 (US4)**: needs T018–T019 (verification of what US1 built)
- **Phase 8 (Polish)**: needs everything; T040 (§C) is the final gate

### User Story Dependencies

- **US1** → foundation for all others (the hooks + migrated views)
- **US2** → independent of US1 (only needs the provider); testable alone
- **US5** → depends on US1's hooks existing; conceptually independent (verifies boundaries)
- **US3** → depends on US1 (mutation sites live in migrated views)
- **US4** → verification phase over Foundational + US1 output

### Parallel Opportunities

- **Backend vs Frontend Foundational**: T002–T005 (Backend) fully parallel with T006–T011 (Frontend) — different repos
- **US1 hooks**: T012–T016 all parallel (five files)
- **US1 view migrations**: T018–T023 parallel across six view files once hooks exist
- **US2 (T026–T027) parallel with US1's view migrations** — different files
- Test-writing tasks marked [P] parallel with neighboring implementation in other files

## Parallel Example: Foundational Phase

```text
# Stream A (Backend):  T002 → T003 → T004, with T005 alongside
# Stream B (Frontend): T001 → T006 / T007 / T008 / T010 in parallel → T009 → T011
```

## Implementation Strategy

**Big-bang delivery, incremental construction.** ADR-015 fixed that this slice ships as one change (never two data-fetching patterns in `main`), so the story checkpoints are *build-order* validation points, not deploy points:

1. Phase 1–2 (Setup + Foundational) — backend route testable immediately via Jest
2. Phase 3 (US1) — the MVP core; **stop and validate** quickstart §B1 locally
3. Phases 4–5 (US2 + US5) — the P1 security half; validate §B5 + prefetch/audit specs
4. Phases 6–7 (US3 + US4) — invalidation + request-shape verification; validate §B2–B4
5. Phase 8 — docs, full suites, SFTP deploy, quickstart §A/§B on UAT, operator §C sign-off

If T025's seam review fails (migration forces changes beyond the declared file set), **stop** — that is ADR-015's seam-in-the-wrong-place signal, and the design needs reassessment before more views migrate.
