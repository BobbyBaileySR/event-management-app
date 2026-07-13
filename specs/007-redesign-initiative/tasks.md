---
description: "Task list for Redesign Initiative (Slice 007)"
---

# Tasks: Redesign Initiative (Slice 007)

**Input**: Design documents from `/specs/007-redesign-initiative/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: INCLUDED — the project's testing-discipline rule and spec FR-006 require tests to ship with behaviour (Vitest for views/dataService + XSS; Jest for backend routes with RBAC/validation/rate-limit guards).

**Organization**: Grouped by user story. **Phase A (US1, US2, US3, US4) is deliverable now.** **Phase B (US5, US6) is ⛔ GATED**: HubSpot custom objects are **created in UAT** (Program `2-65757052`, Event `2-65757130`, Program→Event association `286` — gate #1/#3 ✔). Remaining before Phase B **writes**: gate #2 (workflow-association test), `X-REDESIGN-004` (attributes + Contact↔Event association/labels created + verified), Parameter setup (R-012), and two design-it-twice items. Design-it-twice, Parameter/schema-constant scaffolding, and read-only work can start now; do not ship writes until the gates clear. IDs come from ScriptRunner Connect Parameters — see [docs/hubspot-schema.md](../../docs/hubspot-schema.md).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1–US6 from spec.md
- Paths are repo-relative (`Frontend/…`, `Backend/…`)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Scaffolding for the token/theme/font work

- [X] T001 [P] Create theme remap file skeletons `Frontend/css/theme-aurora.css` and `Frontend/css/theme-dark-aurora.css` (empty `[data-theme=...]` blocks); confirm `Frontend/css/theme-celebration.css` present
- [X] T002 [P] Create `Frontend/src/assets/fonts/` directory and placeholder `Frontend/src/styles/fonts.css` (`@font-face` stubs)
- [X] T003 [P] Establish green baseline: run `npm test` + `npm run lint` in `Frontend/` and `Backend/`; record counts in [quickstart.md](./quickstart.md) §A

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The two-tier token layer, self-hosted fonts, shared pickers, and role-aware shell that ALL Phase A stories build on

**⚠️ CRITICAL**: No Phase A user-story work begins until this phase is complete

- [X] T004 Add the semantic role-token layer (`--surface`, `--panel`, `--border`, `--text`, `--muted`, `--accent`, `--accent-soft`, `--ice`, status roles) to `Frontend/css/tokens.css`, mapped from existing `--color-*` primitives (research R-001)
- [X] T005 Inventory and migrate hardcoded hex in component styles onto semantic tokens across `Frontend/css/base.css`, `Frontend/css/layout.css`, `Frontend/css/components.css`, and `Frontend/src/**/*.module.css` (so Dark Aurora renders)
- [X] T006 [P] Self-host Manrope subset woff2 (400/500/600/700/800) in `Frontend/src/assets/fonts/` + `@font-face` in `Frontend/src/styles/fonts.css` (research R-003) — **sourced via `@fontsource-variable/manrope` (npm) instead of manually-committed files in `src/assets/fonts/`**, per user decision on font sourcing (2026-07-13); `src/assets/fonts/` stays empty (`.gitkeep` only).
- [X] T007 [P] Self-host Material Symbols Outlined subset woff2 (used glyphs, 1:1 ligature names) in `Frontend/src/assets/fonts/` + `@font-face`; document glyph list in `Frontend/docs/ui-component-catalog.md` — **sourced via `@fontsource/material-symbols-outlined` (npm), weight-400 static build**; not a literal per-glyph subset (see TODO.md `FE-REDESIGN-006`).
- [X] T008 Add `font-src 'self'` to CSP in `Frontend/vite.config.ts` and import `styles/fonts.css` from `Frontend/src/main.tsx`
- [X] T009 [P] Create theme metadata `Frontend/src/theme/themeTokens.ts` (theme ids, labels, `gated` flag per data-model.md)
- [X] T010 Build shared accessible pickers in `Frontend/src/components/pickers/` (`SelectPicker.tsx`, `CalendarPicker.tsx`, `TimePicker.tsx`) extending the `CatalogPickerSelect` pattern with keyboard + ARIA + focus management (research R-004)
- [X] T011 Make the app shell role-aware + admin-only in `Frontend/src/components/AppLayout.tsx` and `Frontend/src/components/Sidebar.tsx` (structure only; existing routes unchanged) (FR-013)

**Checkpoint**: Token layer + fonts + pickers + shell ready — Phase A stories can begin

---

## Phase 3: User Story 4 - Theme choice persists across devices (Priority: P1) 🎯 MVP

**Goal**: Three themes (Aurora, Dark Aurora, allowlist-gated Celebration) with a user switcher and cross-device backend persistence; Celebration re-validated server-side.

**Independent Test**: Switch theme on one device, sign in on a second → same theme; Celebration only for allowlisted email; stored `celebration` for a non-allowlisted user resolves to Aurora.

### Tests for User Story 4

- [X] T012 [P] [US4] Vitest theme switcher gating test in `Frontend/src/components/ThemeSwitcher.test.tsx` (Celebration hidden unless allowlisted)
- [X] T013 [P] [US4] Vitest persistence mapping test in `Frontend/src/services/dataService.test.ts` (`get/setThemePreference` → `user/prefs` routes; stored celebration → Aurora fallback)
- [X] T014 [P] [US4] Backend Jest `Backend/node/tests/UserPrefsRoutes.test.ts` (401 unauth, 400 invalid enum, 405 wrong method, 429 rate limit, 403 celebration_not_allowed, server-side re-validation) — done from a Backend-rooted session (9 tests)

### Implementation for User Story 4

- [X] T015 [P] [US4] Fill `Frontend/css/theme-aurora.css` (default) + `Frontend/css/theme-dark-aurora.css` remaps; update `Frontend/css/theme-celebration.css` to prototype pink `#EC6C93` (research R-002)
- [X] T016 [US4] Create `Frontend/src/theme/useTheme.ts` (apply `data-theme`, load/persist pref, server-side Celebration re-validation) and refactor `Frontend/src/utils/celebrationTheme.ts` into the 3-theme model — `CelebrationThemeEffect.tsx` (+ test) removed, superseded
- [X] T017 [US4] Create `Frontend/src/components/ThemeSwitcher.tsx` (3-swatch, Celebration hidden unless allowlisted) and mount it in the shell (`AppLayout.tsx`/`Sidebar.tsx`)
- [X] T018 [P] [US4] Backend `Backend/scripts/Utils/UserPrefsStore.ts` — Record Storage per-user prefs keyed by **Google account subject ID (non-PII, not email)**; stores theme id only — done from a Backend-rooted session; also added `UserPrefs.ts` (enum validation, allowlist check, resolution rules)
- [X] T019 [US4] Backend `Backend/scripts/OnGetUserPrefs.ts` + `Backend/scripts/OnPutUserPrefs.ts` — write-gate order (session→RBAC→validate→rate limit→persist); rate limit via Parameter `USER_PREFS_RATE_LIMIT_PER_HOUR` (default 60/user/hour → 429); Celebration re-validated against `CELEBRATION_THEME_EMAIL`, fallback Aurora — done from a Backend-rooted session
- [X] T020 [US4] Wire routes in `Backend/scripts/OnHttpRouter.ts` and add allow rules in `Backend/scripts/Utils/RouteGuard.ts` (`user/prefs` GET, `user/prefs/theme` PUT — all authenticated roles) — done from a Backend-rooted session (wired in `Routes.ts`, `ALL_ROLES`, added `PUT` to `HttpMethod`). Scope expansion: the session foundation had no Google subject ID at all — `Auth.ts`/`createSession`/`SessionRecord`/`OnAuthExchange.ts` extended to carry it (backward-compatible), `AuthPipeline.test.ts` updated.
- [X] T021 [P] [US4] Add `getThemePreference`/`setThemePreference` to `Frontend/src/services/dataService.ts`, `ThemePreference` DTO to `Frontend/src/types.ts`, mock parity in `Frontend/src/data/mockData.ts` — mock methods take an extra `email` arg (mock-only, simulates server allowlist re-check; live calls ignore it)
- [X] T022 [US4] Doc sync: add theme-pref rows to `Frontend/docs/api-contract.md` and `Frontend/docs/rbac.md` (from [contracts/theme-preference-api.md](./contracts/theme-preference-api.md))

**Checkpoint**: Theming + persistence fully functional and testable independently

---

## Phase 4: User Story 1 - Modernized, consistent UI (Priority: P1)

**Goal**: Recreate the `design_handoff 2/` visuals across the shell and all existing views onto semantic tokens + Manrope + Material Symbols + shared pickers, with no functional/RBAC regression.

**Independent Test**: Walk existing flows (check-in, email, catalog CRUD) on the redesigned UI — same actions, same-or-fewer steps, responsive at 375/768/1024.

### Tests for User Story 1

- [ ] T023 [P] [US1] Vitest render tests per redesigned view assert `data-theme` render + no hardcoded hex, in each view's `*.test.tsx`
- [ ] T024 [P] [US1] Vitest responsive/touch-target smoke (≥44px targets; no horizontal scroll at 375px) for shell + Check-in in `Frontend/src/components/AppLayout.test.tsx` / `Frontend/src/views/CheckInView.test.tsx`

### Implementation for User Story 1

- [ ] T025 [P] [US1] Restyle shared chrome onto semantic tokens: `Frontend/src/components/AppLayout.module.css`, `Sidebar.module.css`, `TopBar.module.css`
- [ ] T026 [P] [US1] Restyle Overview/Events surfaces: `Frontend/src/views/EventsView.tsx`+`.module.css`, `EventHubView`, `AnalyticsView`
- [ ] T027 [P] [US1] Restyle Attendees: `Frontend/src/views/AttendeesView.tsx`+`.module.css`
- [ ] T028 [P] [US1] Restyle Check-in: `Frontend/src/views/CheckInView.tsx`+`.module.css`, `Frontend/src/components/CheckInQrPanel.module.css`
- [ ] T029 [P] [US1] Restyle Email/Campaign: `Frontend/src/views/EmailDispatchView.tsx`+`.module.css`
- [ ] T030 [P] [US1] Restyle Catalog admin + modals: `Frontend/src/views/CatalogAdminView.module.css`, `CatalogEventModal.module.css`, `CatalogProgramModal.module.css`
- [ ] T031 [P] [US1] Restyle Audit: `Frontend/src/views/AuditView.tsx`+`.module.css`
- [ ] T032 [US1] Replace remaining native date/time/select inputs with shared pickers (`components/pickers/`) across `CatalogEventModal.tsx`, `CatalogProgramModal.tsx`, `EmailDispatchView.tsx`
- [ ] T033 [US1] Regression pass: run full `Frontend/` Vitest suite; fix any tests asserting old DOM (edge case in spec); confirm no RBAC/nav behaviour change
- [ ] T063 [US1] Click-count parity check (SC-003): record clicks-to-complete for check-in, send email, and catalog CRUD on the redesigned UI vs the current UI; log results in [quickstart.md](./quickstart.md) §B (must be same or fewer)

**Checkpoint**: All existing views redesigned, functionally identical, responsive

---

## Phase 5: User Story 2 - Brand + accessibility constraints (Priority: P2)

**Goal**: Prove the redesign meets WCAG 2.2 across all 3 themes, added no UI framework, and preserves XSS safety.

**Independent Test**: Contrast/focus audit passes for Aurora/Celebration/Dark Aurora; `package.json` shows no new UI framework; hostile data renders as text.

- [ ] T034 [P] [US2] WCAG 2.2 contrast + focus-visible audit across all 3 themes; record results and any fixed pairings in `Frontend/docs/ui-a11y-audit.md`
- [ ] T035 [P] [US2] Picker a11y completion-gate tests (keyboard nav, `role`/`aria-*`, screen-reader labels, focus return) in `Frontend/src/components/pickers/*.test.tsx`
- [ ] T036 [P] [US2] Dependency + asset guard test/CI check: assert no Tailwind/Shadcn/Tremor/Mantine in `Frontend/package.json` **and** that the self-hosted fonts are the ONLY new front-end assets (no font/icon CDN origins in `vite.config.ts` CSP or `index.html`) — proves SC-002 in full
- [ ] T037 [P] [US2] XSS render guards (hostile `<script>`/`<img onerror>` strings render as text) added to new/changed view tests

**Checkpoint**: Accessibility + dependency + XSS properties verified

---

## Phase 6: User Story 3 - Incremental rollout compatibility (Priority: P3)

**Goal**: Confirm the redesign is foundation-first and per-view, not a big-bang, and does not block in-flight slices.

**Independent Test**: Tokens/themes/fonts/pickers apply globally without IA rework; existing routes and in-progress slice work remain functional.

- [ ] T038 [US3] Confirm foundation-first application (Phase A ships via tokens with no IA-dependent layout rebuild); document the per-view rollout order in [plan.md](./plan.md) / [quickstart.md](./quickstart.md) §B
- [ ] T039 [US3] Verify in-flight slice compatibility — existing hash routes and slice views unaffected; no forced simultaneous pause (spec US3 / edge cases)

**Checkpoint**: Phase A is independently shippable; Phase B can be scheduled when unblocked

---

## Phase 7: User Story 5 - Event-first navigation + standalone Events (Priority: P2) ⛔ BLOCKED

> **Objects created in UAT** — routing/shell work may start after design-it-twice (`X-REDESIGN-003`) + Parameter setup (T065). Standalone-Event reads are safe; anything touching Contact↔Event writes waits for US6 gates.

**Goal**: Event-first shell; standalone Events (Program membership via association `286`, none required) fully functional; Program is an optional grouping/filter.

**Independent Test**: Create a standalone Event (no Program association); Attendees/Check-in/Capacity/Campaign all work; Program filters/groups without being required.

### Gate + design (blocking)

- [ ] T040 [US5] GATE: confirm `X-REDESIGN-001` — objects created in UAT (Program `2-65757052`, Event `2-65757130`) ✔; Program→Event association `286` ✔; verify Contact↔Event ≤10 labels ✔ and record the security write-gate. Update outcome in [research.md](./research.md) R-005 + `Frontend/docs/hubspot-schema.md`
- [ ] T041 [US5] Design-it-twice the event-first routing shape (`X-REDESIGN-003`) using the `codebase-design` skill; capture decision in [contracts/event-first-routes-api.md](./contracts/event-first-routes-api.md) (Program membership = association `286`, not a route param/property)
- [ ] T065 [US5] Add ScriptRunner Connect **Parameters** (R-012) for HubSpot IDs — `HUBSPOT_OBJECT_TYPE_PROGRAM`=`2-65757052`, `HUBSPOT_OBJECT_TYPE_EVENT`=`2-65757130`, `HUBSPOT_ASSOC_PROGRAM_TO_EVENT`=`286`, plus placeholders `HUBSPOT_ASSOC_CONTACT_EVENT` / `HUBSPOT_ASSOC_LABEL_REGISTERED` / `HUBSPOT_ASSOC_LABEL_CHECKED_IN` (fill once created). Add stable property API-name constants to `Backend/scripts/Utils/HubSpotSchema.ts`; adapter reads IDs from Parameters, never hardcoded

### Tests for User Story 5

- [ ] T042 [P] [US5] Backend Jest `Backend/node/tests/EventFirstRoutes.test.ts` (event-scoped routes; optional `programId`; 401/403/404/405)
- [ ] T043 [P] [US5] Vitest standalone-event nav + Event Details flow tests in `Frontend/src/views/EventsView.test.tsx` / `EventHubView.test.tsx`

### Implementation for User Story 5

- [ ] T044 [US5] Backend event-scoped routing (`events/{eventId}/…`; Program membership resolved via association `286`, no `programId` property) in `Backend/scripts/OnHttpRouter.ts` + `Backend/scripts/Utils/RouteGuard.ts` (breaking change; dual-read window)
- [ ] T045 [US5] Doc sync: update `Frontend/docs/api-contract.md`, `Frontend/docs/rbac.md`, `Frontend/docs/ui-routes.md` for event-first (from contracts/event-first-routes-api.md)
- [ ] T046 [US5] Frontend event-first shell + Overview/Events/Event Details + working-event picker in `Frontend/src/components/Sidebar.tsx`, `Frontend/src/views/EventsView.tsx`, `EventHubView.tsx`; standalone-event (no `programId`) support in `Frontend/src/services/dataService.ts`
- [ ] T047 [US5] Status model in catalog: Active/Cancelled (manual) + Completed (auto on end date) + publish state separate from status (FR-017), in `Frontend/src/utils/catalogMetadata.ts` + relevant views
- [ ] T064 [US5] Re-verify live capacity/occupancy ±1 (from Slice 004) under the new custom-object data model: confirm capacity indicators + adjust flow work for standalone Events; update `Frontend/src/utils/capacityTier.ts` / `Frontend/src/components/CapacityBar.tsx` only if the data-model change requires it (else record "inherited, no rework needed")

**Checkpoint**: Standalone Events fully functional; event-first nav live

---

## Phase 8: User Story 6 - Registration & check-in via associations (Priority: P2) ⛔ BLOCKED

> **Writes are hard-gated**: requires `CustomObjectAdapter` design-it-twice (`X-REDESIGN-002`), the **workflow-association test** (T066, gate #2), attributes + Contact↔Event labels created + verified (T067/T049, `X-REDESIGN-004`), and Parameters filled (T065). Do not merge any write before all pass.

**Goal**: Attendance as Contact↔Event association labels; check-in/undo/remove via the audited EMS path; no EMS register-attendee write.

**Independent Test**: Check in a registered attendee (label flips, cache + audit written); undo reverts; remove blocked while checked-in; no register-attendee control exists.

### Gate + design (blocking)

- [ ] T048 [US6] Design-it-twice the `CustomObjectAdapter` interface (`X-REDESIGN-002`) using `codebase-design`, as the 2nd implementation of the ADR-005 seam
- [ ] T066 [US6] GATE #2 — **workflow-association test**: build a throwaway HubSpot workflow in UAT that sets the Contact↔Event `registered` label on the Event object; confirm it succeeds and EMS can read it. Record pass/fail in [research.md](./research.md) R-005. **If it fails, stop** and re-plan the registration source before any US6 build
- [ ] T067 [US6] Hand the HubSpot team the ready-made spec [hubspot-team-handoff.md](./hubspot-team-handoff.md) (Event/Program properties + Contact↔Event `registered`/`checked-in` labels + workflow-association test + scopes); on creation, capture **confirmed** property API names + label IDs into `docs/hubspot-schema.md` + `HubSpotSchema.ts` + fill the Parameters from T065
- [ ] T049 [US6] Verify HubSpot schema in `Frontend/docs/hubspot-schema.md` (`X-REDESIGN-004`) — confirm created object types, **actual** property API names, and Contact↔Event association + label IDs match the code constants — before any write

### Tests for User Story 6

- [ ] T050 [P] [US6] Backend Jest `Backend/node/tests/CheckInRoutes.test.ts` + `CustomObjectAdapter.test.ts` (401/403/404/405/409/429; audited writes; no register-attendee path)
- [ ] T051 [P] [US6] Vitest registration/check-in UI + copy-fix tests in `Frontend/src/views/CheckInView.test.tsx` / `AttendeesView.test.tsx`

### Implementation for User Story 6

- [ ] T052 [US6] Backend `Backend/scripts/Utils/HubSpot/CustomObjectAdapter.ts` (association-label read/write behind the ADR-005 seam)
- [ ] T053 [US6] Backend `Backend/scripts/Utils/RegistrationStore.ts` — per-registration Record Storage (`contactId+eventId`: `checkedInAt`, scan method, QR nonce/JWT); purge on Event archive
- [ ] T054 [US6] Backend `Backend/scripts/OnPostCheckIn.ts`, `OnPostUndoCheckIn.ts`, `OnDeleteAttendee.ts` — label writes, audited; remove blocked while `checked-in`; wire + guard in `OnHttpRouter.ts` + `RouteGuard.ts`
- [ ] T055 [US6] Doc sync: `Frontend/docs/api-contract.md` + `Frontend/docs/rbac.md` for check-in/undo/remove (from contracts/event-first-routes-api.md)
- [ ] T056 [US6] Frontend check-in/undo/remove affordances (no register-attendee write) + copy fixes FR-019 (drop "auto-checks in" wording; QR summary set; walk-in propagation-lag copy; "HubSpot list"→"segment") in `Frontend/src/views/CheckInView.tsx`, `AttendeesView.tsx`, `EmailDispatchView.tsx`
- [ ] T057 [US6] Migration/backfill (`X-REDESIGN-005`): map existing Contact-property attendance + Parts-Attended → objects/associations; dual-read window; in `Backend/scripts/Utils/HubSpot/CustomObjectAdapter.ts` + a one-off migration script

**Checkpoint**: Registration-as-association live; all check-ins audited

---

## Phase 9: Polish & Cross-Cutting Concerns

- [ ] T058 [P] Update `Frontend/CHANGELOG.md` and `Backend/CHANGELOG.md` per phase shipped (what + why)
- [ ] T059 [P] Update `Frontend/TODO.md` + `Backend/TODO.md`: move completed `FE-/BE-REDESIGN-*` to Done; keep Phase B rows gated until `X-REDESIGN-001`
- [ ] T060 Run [quickstart.md](./quickstart.md) §A (both repos `npm test` + `npm run lint` + `npm audit --audit-level=high`)
- [ ] T061 Fill and run [quickstart.md](./quickstart.md) §B manual + §C operator security checks for the phase reaching QA; capture C10 sign-off
- [ ] T062 [P] Update `Frontend/docs/ui-component-catalog.md` and `Frontend/docs/ui-routes.md` for new components (ThemeSwitcher, pickers) and any new views

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (P1)** → no deps
- **Foundational (P2)** → depends on Setup; **BLOCKS all user stories**
- **US4 (P1)** and **US1 (P1)** → after Foundational; US1's per-view restyle depends on the token layer (T004/T005) and pickers (T010); US4 can proceed in parallel with US1
- **US2 (P2)**, **US3 (P3)** → after US1/US4 land (they verify/roll out Phase A)
- **US5, US6 (P2)** → after Phase A. US5 routing/shell can start after design-it-twice (T041) + Parameters (T065). **US6 writes** are hard-gated on T066 (workflow test), T067/T049 (attributes + labels created + verified), T048 (adapter design). US6 depends on US5's event-scoped routing
- **Polish (P9)** → after each targeted phase

### Within Each User Story

- Tests written before/with implementation (verify red→green)
- CSS token layer before per-view restyle; adapter/design-it-twice before Phase B writes
- Doc sync (api-contract + rbac + RouteGuard) lands in the SAME change as any route add/change

### Parallel Opportunities

- Setup T001–T003 all [P]
- Foundational fonts T006/T007/T009 [P]
- US4 tests T012–T014 [P]; US1 per-view restyle T025–T031 [P]
- US2 checks T034–T037 [P]

---

## Parallel Example: User Story 1

```bash
# After Foundational, restyle independent views in parallel:
Task: "Restyle Attendees in Frontend/src/views/AttendeesView.module.css"
Task: "Restyle Check-in in Frontend/src/views/CheckInView.module.css"
Task: "Restyle Email/Campaign in Frontend/src/views/EmailDispatchView.module.css"
Task: "Restyle Audit in Frontend/src/views/AuditView.module.css"
```

---

## Implementation Strategy

### MVP First (Phase A)

1. Phase 1 Setup → Phase 2 Foundational (token layer + fonts + pickers + role-aware shell)
2. Phase 3 US4 (theming + persistence) — **STOP and VALIDATE** (§C Celebration gating)
3. Phase 4 US1 (restyle all views) — validate flows + responsiveness
4. Phase 5 US2 + Phase 6 US3 — a11y/dependency/XSS proof + rollout confirmation
5. Ship Phase A to UAT → Live (operator §C sign-off)

### Phase B (objects created in UAT; writes still gated)

1. Parameters + schema constants (T065); design-it-twice (T041/T048); confirm gates (T040)
2. US5 event-first routing + shell (reads safe once Parameters set)
3. **Write gates** — workflow-association test (T066), attributes + Contact↔Event labels created + verified (T067/T049)
4. US6 registration-as-association + migration
5. Full write-gate QA (§C7.2) before Live

### Notes

- [P] = different files, no dependencies
- Every route add/change updates api-contract.md + rbac.md + RouteGuard.ts together
- No invented HubSpot property names — verify in `docs/hubspot-schema.md` first (Phase B)
- Do not mark a phase QA-complete until quickstart §C is filled and signed for that phase
- T063 (US1 click parity) and T064 (US5 capacity re-verify) were added via `/speckit-analyze` remediation (2026-07-13); they sit in their story phase despite the higher IDs
- T065 (Parameters + schema constants, US5), T066 (workflow-association test) + T067 (attribute-spec handoff, US6) were added 2026-07-13 after HubSpot created the custom objects in UAT; they sit in their story phase despite the higher IDs
