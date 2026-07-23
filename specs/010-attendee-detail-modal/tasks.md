---

description: "Task list for 010-attendee-detail-modal"
---

# Tasks: Attendee Detail Modal (Attendee Journey)

**Input**: Design documents from `specs/010-attendee-detail-modal/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: Included and **required**, not optional — this repo's testing discipline (root `CLAUDE.md`, `Frontend/CLAUDE.md`, `Backend/CLAUDE.md`) mandates that every new/changed route ships with unit + RBAC/audit coverage, and every new view/`dataService` method ships with render + XSS-guard tests, in the **same change**.

**Organization**: Tasks are grouped by user story (US1 = P1, US2 = P2 from `spec.md`) so each can be shipped independently — US1 alone is a complete MVP.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2)
- File paths are exact, relative to repo root (`Frontend/` / `Backend/`)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Shared scaffolding both routes/stories will register into. No new dependencies — reuses the existing Backend/Frontend stack per `plan.md`'s Technical Context.

- [X] T001 Add route path constants for `events/{evId}/attendees/{contactId}` and `attendees/{contactId}/communications` to `Backend/scripts/Utils/Routes.ts` (registration only — handlers wired in each story's phase) — **2026-07-17: registered with minimal stub handlers (`OnGetAttendeeDetail.ts`/`OnGetAttendeeCommunications.ts`, both `501 not_implemented`) rather than left absent from `ROUTE_TABLE`, so the RBAC gate below is real/testable now — see `Backend/CHANGELOG.md`.**
- [X] T002 [P] Add `admin`-only RBAC rules for both new routes in `Backend/scripts/Utils/RouteGuard.ts` — **2026-07-17: no change needed in `RouteGuard.ts` itself — it enforces RBAC generically off each route's `roles` field; the actual RBAC change is `roles: ['admin']` on the 2 new `Routes.ts` entries (T001).**
- [X] T003 [P] Add the `attendee.communications.view_all` audit action constant in `Backend/scripts/Utils/Audit.ts` (per [research.md](research.md) R-003 — `eventId`/`contactId` metadata only, no PII) — **2026-07-17: typed on `writeReadAudit`'s `WriteReadAuditOptions`; not yet called by a handler (lands with T026).**

**Checkpoint**: Both routes exist as registered-but-unimplemented (405/404 until each story's handler lands) — safe to merge incrementally. **2026-07-17 update: both routes are registered with stub handlers returning `501 not_implemented` (not literal 404/405) — see T001 note above; RBAC (401/403) is fully live. `docs/api-contract.md`/`docs/rbac.md` were also updated now (not deferred to T018/T030) per the repo's API-contract-sync rule, flagged as Setup-phase-stub status.**

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared types and the modal shell both user stories build into. **Must complete before either story.**

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T004 Add shared TypeScript types (`AttendeeDetail`, `AttendeeJourneyStep`, `CommunicationItem`, `AttendeeCommunicationsResponse`) per [data-model.md](data-model.md) to `Frontend/src/types` (wherever `SliceAttendee` currently lives) — **2026-07-17: done as part of the T001/T003 Setup-phase-sync work (also added `CommunicationTag`/`AttendeeTimelineItem` as small supporting types data-model.md implies but doesn't name explicitly).**
- [X] T005 [P] Add modal-open state + row click handler scaffold (excluding the existing action-button cell) to `Frontend/src/views/AttendeesView.tsx`, wired to a not-yet-implemented `AttendeeDetailModal` import — **2026-07-17: done directly against the real `AttendeeDetailModal` (T006/T015 landed together, not staged as a scaffold) — see T015/T016 note.**
- [X] T006 [P] Create `Frontend/src/components/AttendeeDetailModal.tsx` skeleton: modal shell (`role="dialog"`, `useModalFocusTrap`, Close button, no field content yet) — **2026-07-17: built with full US1 field content in the same change rather than staged as an empty skeleton — see T015.**
- [X] T007 [P] Create `Frontend/src/components/AttendeeDetailModal.module.css` using `css/tokens.css` tokens only (per `Frontend/CLAUDE.md` UI stack rules) — no Tailwind/inline hex

**Checkpoint**: Foundation ready — US1 and US2 implementation can now begin.

---

## Phase 3: User Story 1 - Basic Information + event-only Attendee Journey (Priority: P1) 🎯 MVP

**Goal**: Staff click an attendee row and see a read-only Basic Information card plus an Attendee Journey timeline scoped to the currently open Event — no edit controls, no HubSpot contact ID shown.

**Independent Test**: Open the modal for any registered attendee; confirm Basic Information and the event-only journey render correctly per [contracts/get-attendee-detail.md](contracts/get-attendee-detail.md), with no edit affordance and no contact ID anywhere.

### Tests for User Story 1 ⚠️ (write first, confirm they fail before implementing)

- [X] T008 [P] [US1] Backend contract test for `GET events/{evId}/attendees/{contactId}` in `Backend/node/tests/OnGetAttendeeDetail.test.ts` — 200 shape matches [contracts/get-attendee-detail.md](contracts/get-attendee-detail.md); `404 contact_not_registered`; pending fields (`dietaryRequirement`, `registrationSource`, `registered`/`dispatch_opened` timestamps) are `null`, never fabricated — **2026-07-17: done alongside T012; also covers T020's "no audit row for the US1 default view" assertion in the same file.**
- [X] T009 [P] [US1] Backend RBAC test extension in `Backend/node/tests/RouteGuard.test.ts` — non-admin gets `403 forbidden` on the new route — **2026-07-17: the 401/403/405 behavior for both new routes is covered end-to-end via `onHttpRouter` in `node/tests/AttendeeDetailRoutes.test.ts` (now rewritten as RBAC/routing-only, since the real handlers replaced its old 501-stub assertions); T008's full `200` contract coverage now lands with T012.**
- [X] T010 [P] [US1] Frontend render test in `Frontend/src/components/AttendeeDetailModal.test.tsx` — Basic Information + event-only journey render; no edit control anywhere; no HubSpot contact ID anywhere in the DOM; hostile strings (`<script>`, `<img onerror=…>`) in company/job title/dietary requirement render as literal text (`FE-ATTENDEE-DETAIL-002`) — **2026-07-17: also covers field omission (phone/jobTitle/dietaryRequirement/registrationSource absent), "Not yet" for null journey timestamps, fetch-error retry, and Close.**
- [X] T011 [P] [US1] Frontend integration test extension in `Frontend/src/views/AttendeesView.test.tsx` — clicking a row (outside the action-button cell) opens the modal; clicking Remove/Undo does not

### Implementation for User Story 1

- [X] T012 [US1] Implement `Backend/scripts/OnGetAttendeeDetail.ts` — reads the existing per-registration cache ([ADR-011](../../docs/decisions/011-attendee-index-freshness.md)) for `checked_in`, this-Event dispatch records for `dispatch_sent`/`dispatch_opened`, returns `null` for pending fields per [data-model.md](data-model.md) (depends on T004) — **2026-07-17: implemented; the this-Event journey builder lives in a new shared `Backend/scripts/Utils/AttendeeJourney.ts` (`buildThisEventJourney`) so US2's T026 reuses the same logic rather than re-deriving it.**
- [X] T013 [US1] Wire the handler into `Backend/scripts/Utils/Routes.ts` (completing T001's registration for this route) — **2026-07-17: no change needed — T001 already pointed the route at `handleGetAttendeeDetail`; this task closes now that the handler behind it is real.**
- [X] T014 [P] [US1] Add `fetchAttendeeDetail` to `Frontend/src/services/dataService.ts` + response mapping in `Frontend/src/utils/normalizeApi.ts` (depends on T004) — **2026-07-17: done ahead of schedule alongside T001/T003 (contract-sync rule required a callable dataService method once the route was registered); calls the Setup-phase stub, so it currently resolves to a `501` error until T012 lands.**
- [X] T015 [US1] Implement `AttendeeDetailModal.tsx`'s Basic Information card + event-only Attendee Journey timeline rendering, filling the T006 skeleton (depends on T006, T014) — omit any field that is `null`/absent rather than showing a placeholder (spec.md Edge Cases) — **2026-07-17: implemented; component fetches through T014's `fetchAttendeeDetail`, so it currently surfaces the Setup-phase `501` stub's error state (with retry) until T012/T013 land the real Backend handler — expected, not a bug in this change.**
- [X] T016 [US1] Wire `AttendeesView.tsx`'s row click (from T005) to fetch via T014 and render `AttendeeDetailModal` (depends on T005, T015)
- [ ] T017 [US1] Confirm `HS-010` status (phone/jobTitle population, dietary requirement property) with HubSpot admin; update `Frontend/docs/hubspot-schema.md` allowlist once confirmed (tracked in [hubspot-ops-todo.md](../../docs/hubspot-ops-todo.md) — does not block merging T012–T016, which already degrade gracefully to omitted fields) — **2026-07-17: still `open` per `docs/hubspot-ops-todo.md` (HS-010) — not confirmed yet; T012–T016's degrade path is what's implemented here.**
- [X] T018 [US1] Copy the real route shape from [contracts/get-attendee-detail.md](contracts/get-attendee-detail.md) into `Frontend/docs/api-contract.md` and `Frontend/docs/rbac.md` in the same change as T012/T013, per the repo's API-contract-sync rule — **2026-07-17: Setup-phase-stub flag dropped in both docs; shape confirmed real.**

**Checkpoint**: User Story 1 fully functional and independently testable/shippable — this is the MVP.

---

## Phase 4: User Story 2 - "Show all communications" expansion (Priority: P2)

**Goal**: Staff toggle "Show all communications" to see this attendee's cross-Event and external HubSpot communications, each tagged, bounded to their earliest event-related timestamp, without losing the event-only view on failure.

**Independent Test**: With the modal open (US1), click the toggle; expanded timeline includes tagged non-Event items per [contracts/get-attendee-communications.md](contracts/get-attendee-communications.md); toggling again collapses back to the US1 view; an audit row appears.

### Tests for User Story 2 ⚠️ (write first, confirm they fail before implementing)

- [X] T019 [P] [US2] Backend contract test for `GET attendees/{contactId}/communications` in `Backend/node/tests/OnGetAttendeeCommunications.test.ts` — 200 shape matches [contracts/get-attendee-communications.md](contracts/get-attendee-communications.md); dedup doesn't double-count an EMS dispatch also present in the HubSpot pull ([research.md](research.md) R-002); `cutoffTimestamp` correctly excludes older items (R-004); `422 validation_error` when `eventId` query param missing; `502 hubspot_engagement_unavailable` degrade path returns `this_event`-only timeline with `degraded: true`
- [X] T020 [P] [US2] Backend audit test extension — `attendee.communications.view_all` row written with `eventId`/`contactId` metadata only, no attendee email/name (R-003); no row written for the US1 default view — **2026-07-17: no standalone `Audit.test.ts` exists in this repo (the low-level store test is `AuditStore.test.ts`); this coverage instead lives directly in the two route test files — no-PII assertion in `OnGetAttendeeCommunications.test.ts`'s degrade-path test, "no row for US1" assertion in `OnGetAttendeeDetail.test.ts`.**
- [X] T021 [P] [US2] Frontend test extension in `Frontend/src/components/AttendeeDetailModal.test.tsx` — toggle expands/collapses and flips its own label; loading state during fetch; on fetch failure the event-only timeline stays visible with a retry (modal never blanks); empty non-Event result is a silent no-op; tag rendering for both `other_event` (named) and `external` (generic) kinds
- [X] T022 [P] [US2] Frontend `dataService` test extension (same test file as T014's coverage) — `fetchAttendeeCommunications` maps the new response shape correctly through `normalizeApi.ts` — **2026-07-17: done ahead of schedule alongside T014's own coverage (same commit); both currently assert against the Setup-phase `501` stub's route/query construction plus normalizer mapping, not the real T023-T027 response shape.**

### Implementation for User Story 2

- [ ] T023 [US2] Confirm the exact HubSpot API/scope for Contact engagement/timeline reads with a HubSpot admin — [`HS-011`](../../docs/hubspot-ops-todo.md), [research.md](research.md) R-001. Does not block T024–T027 if built against a stub adapter first (per `plan.md`'s Constitution Check note) — **2026-07-17: still open/unresolved — HubSpot-admin-side work, not something EMS engineering can close. T024–T027 proceeded against a stub per the Constitution Check note; see `docs/hubspot-ops-todo.md` HS-011.**
- [X] T024 [US2] Implement the per-Contact HubSpot engagement/timeline adapter method in `Backend/scripts/Utils/HubSpot/` (per [ADR-005](../../docs/decisions/005-hubspot-adapter-layer.md)'s seam) — stub-backed until T023 resolves, real call once the scope is granted — **2026-07-17: `Utils/HubSpot/EngagementAdapter.ts` — `EngagementAdapter` interface + `StubEngagementAdapter` (always throws `EngagementUnavailableError`, since guessing the unconfirmed endpoint would violate R-001's warning), wired via `createEngagementAdapter()`/test overrides in `Utils/HubSpot/index.ts`.**
- [X] T025 [US2] Implement dedup (timestamp + template match, R-002) and `cutoffTimestamp` computation (R-004, computed server-side before the HubSpot call) in the same adapter/handler layer (depends on T024) — **2026-07-17: `computeCutoffTimestamp`/`mergeTimelineChronologically` in `Utils/AttendeeJourney.ts`; `tagExternalEngagements`/`buildOwnOtherEventDispatches` (dedup + other_event/external tagging) in new `Utils/AttendeeCommunications.ts`. Dormant in production until `HS-011` resolves and the stub is swapped, but covered directly by `OnGetAttendeeCommunications.test.ts`'s 200 case with a fake adapter.**
- [X] T026 [US2] Implement `Backend/scripts/OnGetAttendeeCommunications.ts` — merges this-Event journey (reuses T012's logic) with cross-Event EMS dispatch records and the T024/T025 HubSpot result, tags each non-Event item, writes the `attendee.communications.view_all` audit row (T003) (depends on T012, T024, T025) — **2026-07-17: implemented per ADR-014 — the HubSpot engagement pull drives the expansion; EMS's own cross-Event dispatch records are consulted only to name-tag a match as `other_event` (else `external`). Audit row written on both the 200 and 502-degrade branches (`degraded` metadata flag).**
- [X] T027 [US2] Complete route registration from T001 for this route in `Backend/scripts/Utils/Routes.ts`, plus a dedicated rate-limit bucket (conservative, e.g. 20/user/60s — heavier call than the attendee-list bucket per [contracts/get-attendee-communications.md](contracts/get-attendee-communications.md)) (depends on T026) — **2026-07-17: route already pointed at the handler from T001; added the `attendee-communications` rate-limit bucket (20/60s) in the handler's `withRateLimit` call.**
- [X] T028 [P] [US2] Add `fetchAttendeeCommunications` to `Frontend/src/services/dataService.ts` + mapping in `Frontend/src/utils/normalizeApi.ts` (depends on T004) — **2026-07-17: done ahead of schedule alongside T001/T003, same rationale as T014; calls the Setup-phase stub, so it currently resolves to a `501` error until T023-T027 land.**
- [X] T029 [US2] Implement the "Show all communications" toggle in `AttendeeDetailModal.tsx` (extends T015's component) — label flip, loading state, error-preserves-base-timeline, per-item tag rendering (other-Event name vs generic "OTHER DISPATCH" label per `CONTEXT.md` § **Attendee communications view**) (depends on T015, T028) — **2026-07-17: implemented; toggling on fetches once and caches the result (no re-fetch on re-toggle), fetch failure keeps the base this-Event timeline visible with "Try again" rather than blanking the modal.**
- [X] T030 [US2] Copy the real route shape from [contracts/get-attendee-communications.md](contracts/get-attendee-communications.md) into `Frontend/docs/api-contract.md` and `Frontend/docs/rbac.md` in the same change as T026/T027 — **2026-07-17: Setup-phase-stub flag dropped in both docs; noted that real HubSpot data specifically remains gated on `HS-011` (502 degrade path is what ships live today).**

**Checkpoint**: Both User Story 1 and User Story 2 independently functional.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [X] T031 Run [quickstart.md](quickstart.md) §A automated tests end-to-end (Backend `npm test` + `npm run lint:fix`; Frontend `npm test` + `npm run lint`) and confirm all green — **2026-07-17: Backend 433/433 tests (41 suites), Frontend 402/402 tests (46 files), both green.**
- [ ] T032 Run [quickstart.md](quickstart.md) §B manual UAT (both user stories) on UAT before requesting Live sign-off
- [ ] T033 Run [quickstart.md](quickstart.md) §C Operator security comfort checks and complete the C10 sign-off table — required before Live per the repo's slice-operator-security-QA rule
- [X] T034 [P] Update `Frontend/TODO.md` — move `FE-ATTENDEE-DETAIL-001`, `FE-ATTENDEE-DETAIL-002`, `BE-ATTENDEE-DETAIL-001` to **Done (archive)** once merged and QA'd; leave `BE-ATTENDEE-DETAIL-002`/`003` parked (registration timestamp/source, email-open tracking remain real follow-on gaps, not fixed by this feature) — **2026-07-17: done — `FE-ATTENDEE-DETAIL-001`/`002` moved to `Frontend/TODO-DONE.md`; `BE-ATTENDEE-DETAIL-001` moved to `Backend/TODO-DONE.md` (Backend-owned, archived in its own file per this repo's ownership convention); `BE-ATTENDEE-DETAIL-002`/`003` left parked in `Backend/TODO.md` unchanged; `X-ATTENDEE-DETAIL-001` cross-cutting row updated in both TODO.md files to reflect shipped code while flagging the still-open `HS-010`/`HS-011`/`BE-002`/`003` gaps.**
- [ ] T035 [P] Drop the two reference screenshots into `specs/010-attendee-detail-modal/assets/` (per `assets/README.md`) once available from the user, and reference them from `spec.md`/`plan.md` — not code-blocking, but keep it from going stale
- [ ] T036 Add `Frontend/CHANGELOG.md` / `Backend/CHANGELOG.md` entries for the shipped implementation (this feature's design-phase entries already exist; this is the "it actually shipped" entry)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS both user stories**.
- **User Story 1 (Phase 3)**: Depends on Foundational only. No dependency on US2.
- **User Story 2 (Phase 4)**: Depends on Foundational; **also depends on US1's T012 (this-Event journey logic, reused) and T015 (modal component, extended)** — not fully independent of US1 at the implementation level, though it is independently *testable* once US1 has shipped.
- **Polish (Phase 5)**: Depends on both stories being complete (or at minimum US1, if US2 is deferred).

### Parallel Opportunities

- T002/T003 (Setup) — different files, run in parallel.
- T005/T006/T007 (Foundational) — different files, run in parallel after T004.
- T008/T009/T010/T011 (US1 tests) — different files, run in parallel; write and confirm failing before T012–T018.
- T019/T020/T021/T022 (US2 tests) — same, in parallel before T023–T030.
- T014 and T028 (dataService additions) can be done together once T004 lands, even though T028 depends on US2's later handler work landing before it's meaningful to test end-to-end.

---

## Parallel Example: User Story 1

```bash
# Launch all US1 tests together (write first, confirm failing):
Task: "Backend contract test in Backend/node/tests/OnGetAttendeeDetail.test.ts"
Task: "Backend RBAC test extension in Backend/node/tests/RouteGuard.test.ts"
Task: "Frontend render test in Frontend/src/components/AttendeeDetailModal.test.tsx"
Task: "Frontend integration test in Frontend/src/views/AttendeesView.test.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (Setup) + Phase 2 (Foundational).
2. Complete Phase 3 (User Story 1).
3. **STOP and VALIDATE**: run [quickstart.md](quickstart.md) §B1 manually; confirm §A1/§A2 tests green.
4. Ship US1 alone as a complete, useful modal — "Show all communications" (US2) can follow as a separate change.

### Incremental Delivery

1. Setup + Foundational → shared scaffolding ready.
2. User Story 1 → independently tested → ship (MVP).
3. User Story 2 → independently tested → ship.
4. Polish phase → QA sign-off (§C) before Live, TODO cleanup, screenshots backfilled.

### Notes specific to this feature

- Two real backend data gaps (`BE-ATTENDEE-DETAIL-002`/`003` — no registration timestamp/source, no email-open tracking) are **out of scope for this tasks.md** — both US1 and US2 are built to degrade gracefully (render "Not yet"/omit rather than fabricate) until those separate follow-on efforts land. Do not treat their absence as a blocker for shipping either story here.
- `HS-010`/`HS-011` (HubSpot ops work) can each block only the *real-data* portion of one task (T017, T023/T024 respectively) — the surrounding route/RBAC/audit/UI work is not blocked and should proceed against `null`/stub data in the meantime, per `plan.md`'s Constitution Check note.
- **2026-07-17 status**: US1 (T008–T018) and US2 (T019–T030, minus T023 itself) are implemented and tested. `HS-010` and `HS-011` are both still `open` in `docs/hubspot-ops-todo.md` — T017's phone/jobTitle/dietaryRequirement fields and the communications route's real HubSpot engagement data remain gated on those; the communications route degrades to `502 hubspot_engagement_unavailable` (this-Event-only timeline) on every request until `HS-011` resolves and `Utils/HubSpot/EngagementAdapter.ts`'s stub is swapped for a real implementation. Phase 5 (Polish/QA/screenshots) is unstarted.
