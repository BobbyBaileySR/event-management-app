---
description: "Task list for Redesign Initiative (Slice 007)"
---

# Tasks: Redesign Initiative (Slice 007)

> **Status update 2026-07-17:** Phase A shipped; Phase B feasibility gates cleared and the event-first/custom-object core substantially shipped. Gate wording in completed task descriptions below is retained as historical execution context, not current status.

**Input**: Design documents from `/specs/007-redesign-initiative/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: INCLUDED — the project's testing-discipline rule and spec FR-006 require tests to ship with behaviour (Vitest for views/dataService + XSS; Jest for backend routes with RBAC/validation/rate-limit guards).

**Organization**: Grouped by user story. Phase A and the Phase B event-first/custom-object core are shipped. Remaining unchecked tasks represent follow-on polish/ops work; IDs come from ScriptRunner Connect Parameters — see [docs/hubspot-schema.md](../../docs/hubspot-schema.md).

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

- [X] T023 [P] [US1] Vitest render tests per redesigned view assert `data-theme` render + no hardcoded hex, in each view's `*.test.tsx`
- [X] T024 [P] [US1] Vitest responsive/touch-target smoke (≥44px targets; no horizontal scroll at 375px) for shell + Check-in in `Frontend/src/components/AppLayout.test.tsx` / `Frontend/src/views/CheckInView.test.tsx`

### Implementation for User Story 1

- [X] T025 [P] [US1] Restyle shared chrome onto semantic tokens: `Frontend/src/components/AppLayout.module.css`, `Sidebar.module.css`, `TopBar.module.css` — scope expanded to also cover `css/base.css`, `css/components.css`, and shared components (`Toast`, `LoadingState`, `EmptyState`, `ViewErrorState`, `CapacityBar`, `CatalogPickers`) since those are the truly shared/global chrome every view depends on
- [X] T026 [P] [US1] Restyle Overview/Events surfaces: `Frontend/src/views/EventsView.tsx`+`.module.css`, `EventHubView`, `AnalyticsView` — already clean (no colors in these module.css files; inherited correct theming from T025's components.css pass)
- [X] T027 [P] [US1] Restyle Attendees: `Frontend/src/views/AttendeesView.tsx`+`.module.css`
- [X] T028 [P] [US1] Restyle Check-in: `Frontend/src/views/CheckInView.tsx`+`.module.css`, `Frontend/src/components/CheckInQrPanel.module.css`
- [X] T029 [P] [US1] Restyle Email/Campaign: `Frontend/src/views/EmailDispatchView.tsx`+`.module.css` — added `--warning`/`--warning-bg` semantic tokens (tokens.css + all 3 theme files) to resolve the lock-warning banner parked as `FE-REDESIGN-009`
- [X] T030 [P] [US1] Restyle Catalog admin + modals: `Frontend/src/views/CatalogAdminView.module.css`, `CatalogEventModal.module.css`, `CatalogProgramModal.module.css` — also fixed hardcoded-color SVG chevron icons (replaced with a Material Symbols glyph) in `components/pickers/Pickers.module.css` and `CatalogPickers.module.css`
- [X] T031 [P] [US1] Restyle Audit: `Frontend/src/views/AuditView.tsx`+`.module.css`
- [X] T032 [US1] Replace remaining native date/time/select inputs with shared pickers (`components/pickers/`) across `CatalogEventModal.tsx`, `CatalogProgramModal.tsx`, `EmailDispatchView.tsx` — also replaced `CatalogEventModal`'s bespoke duplicate Program dropdown with `SelectPicker`; added `stopPropagation()` on picker Escape handlers so closing a popover inside a modal doesn't also close the modal
- [X] T033 [US1] Regression pass: run full `Frontend/` Vitest suite; fix any tests asserting old DOM (edge case in spec); confirm no RBAC/nav behaviour change — 243/243 passing, clean typecheck/lint/build/audit
- [X] T063 [US1] Click-count parity check (SC-003): record clicks-to-complete for check-in, send email, and catalog CRUD on the redesigned UI vs the current UI; log results in [quickstart.md](./quickstart.md) §B (must be same or fewer) — code-level trace done (no live-browser session available); all 3 flows same click count

**Checkpoint**: All existing views redesigned, functionally identical, responsive

---

## Phase 5: User Story 2 - Brand + accessibility constraints (Priority: P2)

**Goal**: Prove the redesign meets WCAG 2.2 across all 3 themes, added no UI framework, and preserves XSS safety.

**Independent Test**: Contrast/focus audit passes for Aurora/Celebration/Dark Aurora; `package.json` shows no new UI framework; hostile data renders as text.

- [X] T034 [P] [US2] WCAG 2.2 contrast + focus-visible audit across all 3 themes; record results and any fixed pairings in `Frontend/docs/ui-a11y-audit.md` — found + fixed 5 real focus/contrast gaps (Celebration's global focus-ring token and `--muted` text color, Dark Aurora's picker-trigger focus ring, skip-link outline on Celebration's denim, and the pickers' roving-tabindex `.optionActive` indicator which had no real outline in any theme); 2 pre-existing/design-mandated limitations documented as monitor-only (brand `--accent` as small text, `--border` contrast — both trace to the approved `design_handoff 2/` source, not app code)
- [X] T035 [P] [US2] Picker a11y completion-gate tests (keyboard nav, `role`/`aria-*`, screen-reader labels, focus return) in `Frontend/src/components/pickers/*.test.tsx` — pickers already had full keyboard/ARIA/focus-return; added coverage for `aria-expanded`/`aria-selected`, `aria-activedescendant` tracking, disabled no-op, Tab-without-refocus (18/18 passing)
- [X] T036 [P] [US2] Dependency + asset guard test/CI check: assert no Tailwind/Shadcn/Tremor/Mantine in `Frontend/package.json` **and** that the self-hosted fonts are the ONLY new front-end assets (no font/icon CDN origins in `vite.config.ts` CSP or `index.html`) — proves SC-002 in full — `Frontend/src/test/redesignDependencyGuard.test.ts` (4/4 passing)
- [X] T037 [P] [US2] XSS render guards (hostile `<script>`/`<img onerror>` strings render as text) added to new/changed view tests — 10/12 already had one; added the missing one to `Frontend/src/views/CatalogAdminView.test.tsx`

**Checkpoint**: Accessibility + dependency + XSS properties verified

---

## Phase 6: User Story 3 - Incremental rollout compatibility (Priority: P3)

**Goal**: Confirm the redesign is foundation-first and per-view, not a big-bang, and does not block in-flight slices.

**Independent Test**: Tokens/themes/fonts/pickers apply globally without IA rework; existing routes and in-progress slice work remain functional.

- [X] T038 [US3] Confirm foundation-first application (Phase A ships via tokens with no IA-dependent layout rebuild); document the per-view rollout order in [plan.md](./plan.md) / [quickstart.md](./quickstart.md) §B — rollout order + rationale documented in quickstart.md §B "Phase 6"; no step required an IA rebuild (routes/nav/module list unchanged)
- [X] T039 [US3] Verify in-flight slice compatibility — existing hash routes and slice views unaffected; no forced simultaneous pause (spec US3 / edge cases) — confirmed `App.tsx` routes, `eventModules.ts`/`shellAccess.ts` RBAC config, and Slice 004/005 business logic all untouched by the redesign; 006 has no view built yet so no conflict possible; 258/258 tests passing

**Checkpoint**: Phase A is independently shippable; Phase B can be scheduled when unblocked

---

## Phase 7: User Story 5 - Event-first navigation + standalone Events (Priority: P2) ⛔ BLOCKED

> **Objects created in UAT** — routing/shell work may start after design-it-twice (`X-REDESIGN-003`) + Parameter setup (T065). Standalone-Event reads are safe; anything touching Contact↔Event writes waits for US6 gates.

**Goal**: Event-first shell; standalone Events (Program membership via association `286`, none required) fully functional; Program is an optional grouping/filter.

**Independent Test**: Create a standalone Event (no Program association); Attendees/Check-in/Capacity/Campaign all work; Program filters/groups without being required.

### Gate + design (blocking)

- [X] T040 [US5] GATE: confirm `X-REDESIGN-001` — objects created in UAT (Program `2-65757052`, Event `2-65757130`) ✔; Program→Event association `286`/`287` ✔; Contact↔Event ≤10 labels ✔ (`288`/`289` pairing, `290`/`292` labels, confirmed many-to-many) — **all 4 gates cleared 2026-07-14**. Outcome recorded in [research.md](./research.md) R-005 (CLEARED) + `Frontend/docs/hubspot-schema.md`
- [X] T041 [US5] Design-it-twice the event-first routing shape (`X-REDESIGN-003`) using the `codebase-design` skill; capture decision in [contracts/event-first-routes-api.md](./contracts/event-first-routes-api.md) (Program membership = association `286`, not a route param/property) — `codebase-design` skill wasn't available in-session; ran the design-it-twice manually (two drafted proposals, compared, decided). **Decision: event-scoped routes** (`events/{eventId}/…`), full 14-route target table + `catalog` reshape (flat `events[]` with optional `programId`) captured in the contract doc; research.md R-007 updated DECIDED
- [X] T065 [US5] Add ScriptRunner Connect **Parameters** (R-012) for HubSpot IDs — `HUBSPOT_OBJECT_TYPE_PROGRAM`=`2-65757052`, `HUBSPOT_OBJECT_TYPE_EVENT`=`2-65757130`, `HUBSPOT_ASSOC_PROGRAM_TO_EVENT`=`286`, `HUBSPOT_ASSOC_EVENT_TO_PROGRAM`=`287`, `HUBSPOT_ASSOC_EVENT_TO_CONTACT`=`288`, `HUBSPOT_ASSOC_CONTACT_TO_EVENT`=`289`, `HUBSPOT_ASSOC_LABEL_REGISTERED`=`290`, `HUBSPOT_ASSOC_LABEL_CHECKED_IN`=`292`. **All 7 Parameters set in ScriptRunner Connect UAT 2026-07-14** (stale `HUBSPOT_ASSOC_CONTACT_EVENT` placeholder deleted), workspace synced locally, `ev_params.ts` confirmed updating. **Remaining, moved to the implementation task itself, not a gate**: add the matching stable property API-name constants to `Backend/scripts/Utils/HubSpotSchema.ts` — that happens as part of building `CustomObjectAdapter`, not before it

### Tests for User Story 5

- [ ] T042 [P] [US5] Backend Jest `Backend/node/tests/EventFirstRoutes.test.ts` (event-scoped routes; optional `programId`; 401/403/404/405)
- [ ] T043 [P] [US5] Vitest standalone-event nav + Event Details flow tests in `Frontend/src/views/EventsView.test.tsx` / `EventHubView.test.tsx`

### Implementation for User Story 5

- [ ] T044 [US5] Backend event-scoped routing (`events/{eventId}/…`; Program membership resolved via association `286`, no `programId` property) in `Backend/scripts/OnHttpRouter.ts` + `Backend/scripts/Utils/RouteGuard.ts` (breaking change; dual-read window)
- [ ] T045 [US5] Doc sync: update `Frontend/docs/api-contract.md`, `Frontend/docs/rbac.md`, `Frontend/docs/ui-routes.md` for event-first (from contracts/event-first-routes-api.md)
- [X] T046 [US5] Frontend event-first shell + Overview/Events/Event Details + working-event picker in `Frontend/src/components/Sidebar.tsx`, `Frontend/src/views/EventsView.tsx`, `EventHubView.tsx`; standalone-event (no `programId`) support in `Frontend/src/services/dataService.ts` — **Done 2026-07-14.** New `Frontend/src/views/OverviewView.tsx` (4 stat tiles, upcoming events, recent activity via `fetchAuditLog()`); `EventHubView.tsx` module-card grid replaced with header/stats/attendee-preview/capacity/details cards (Event Details); new `Frontend/src/components/WorkingEventPicker.tsx` in Sidebar (searches all events via `fetchEvents()`, no catalog selection needed); `Event` gained optional `programId`/`programName` (`types.ts`, `normalizeApi.ts`, 2 sample `mockData.ts` events) for standalone-Event display. `EventsView.tsx` intentionally left unchanged (already event-scoped, out of this task's actual gap). See CHANGELOG.md 2026-07-14 for full detail; `FE-REDESIGN-020` parked for the Overview stat client-side fan-out cost. **scope note (2026-07-13, user comparison of `design_handoff 2/` vs current UI):** both target pages are genuinely new/richer than what exists today, not just a restyle — confirmed against the prototype source:
  - **Overview** (`design_handoff 2/Event Management System.dc.html`, `navDefs` id `overview`) has no current equivalent at all — today's `EventsView.tsx` ("All Events") is a 3-stat-tile + filterable table, not a dashboard. Design needs: 4 stat tiles (events this month, total registered, registered this week, emails scheduled this week), an "Upcoming events" card list (capacity bar + status badge per row, "View all" link), and a "Recent activity" feed panel (actor + action + timestamp).
  - **Event Details** (`isEventDetail` block, ~line 376) replaces today's `EventHubView.tsx` module-card-grid pattern with: a header card (status + program badges, "✓ Working event" pill, "Edit event" button), 4 stat tiles, an "Attendees" preview list (avatar initials + name/company/ticket + status, "See all ›" link), a "Capacity" card (percent + fraction + bar + "N spots remaining" text — not just a bar), and a "Details" key/value definition-list card. The current module-card grid (Attendees/Check-in/Email/etc. as clickable tiles) has no equivalent in the design — event-scoped navigation lives in the sidebar instead (working-event picker + always-visible nav items).
- [ ] T047 [US5] Status model in catalog: Active/Cancelled (manual) + Completed (auto on end date) + publish state separate from status (FR-017), in `Frontend/src/utils/catalogMetadata.ts` + relevant views
- [X] T064 [US5] Re-verify live capacity/occupancy ±1 (from Slice 004) under the new custom-object data model: confirm capacity indicators + adjust flow work for standalone Events; update `Frontend/src/utils/capacityTier.ts` / `Frontend/src/components/CapacityBar.tsx` only if the data-model change requires it (else record "inherited, no rework needed") — **Done 2026-07-14: inherited, no rework needed.** `capacityTier.ts` is pure `live`/`capacity` percent math; `CapacityBar` only renders those numbers + adjust controls; Backend capacity already uses `countAttendees({eventId, checkedIn:true})` (`OnGetCapacityStatus`/`OnAdjustCapacity`). No Frontend capacity-tier change required for the custom-object model.

**Checkpoint**: Standalone Events fully functional; event-first nav live

---

## Phase 8: User Story 6 - Registration & check-in via associations (Priority: P2) ⛔ BLOCKED

> **Writes are hard-gated**: requires `CustomObjectAdapter` design-it-twice (`X-REDESIGN-002` — ✅ decided 2026-07-14, R-006), the **workflow-association test** (T066, gate #2 — ✅ passed 2026-07-14), attributes + Contact↔Event labels created + verified (T067/T049, `X-REDESIGN-004` — ✅ done 2026-07-14, one label-directionality follow-up open), and Parameters filled (T065 — values known, not yet set in ScriptRunner Connect). All design/verification gates are now clear — only the ScriptRunner Connect Parameter-setting (ops action) and the label-directionality check remain before implementation can begin. Do not merge any write before all pass.

**Goal**: Attendance as Contact↔Event association labels; check-in/undo/remove via the audited EMS path; no EMS register-attendee write.

**Independent Test**: Check in a registered attendee (label flips, cache + audit written); undo reverts; remove blocked while checked-in; no register-attendee control exists.

### Gate + design (blocking)

- [X] T048 [US6] Design-it-twice the `CustomObjectAdapter` interface (`X-REDESIGN-002`) using `codebase-design`, as the 2nd implementation of the ADR-005 seam. **Decided 2026-07-14** — 4 parallel designs compared; interface + full rationale in [research.md](./research.md) R-006. Catalog CRUD confirmed as a separate sibling `CatalogAdapter` (unanimous across all 4 designs), not folded into this interface.
- [X] T066 [US6] GATE #2 — **workflow-association test**: build a throwaway HubSpot workflow in UAT that sets the Contact↔Event `registered` label on the Event object; confirm it succeeds and EMS can read it. Record pass/fail in [research.md](./research.md) R-005. **PASSED 2026-07-14** — direct admin test; found the only available action is "matching property values" (no direct record-picker), which drove the new registration match-key design (see hubspot-schema.md § *Registration match-key mechanism*, research.md R-008)
- [X] T067 [US6] Hand the HubSpot team the ready-made spec [hubspot-team-handoff.md](./hubspot-team-handoff.md) (Event/Program properties + Contact↔Event `registered`/`checked-in` labels + workflow-association test + scopes) — **resolved differently 2026-07-14**: user was granted HubSpot admin access directly, so no team handoff was needed; worked through the same checklist themselves. Confirmed property API names + label IDs captured into `docs/hubspot-schema.md`; `HubSpotSchema.ts` constants + Parameter fill (T065) still pending (Backend-rooted session)
- [X] T049 [US6] Verify HubSpot schema in `Frontend/docs/hubspot-schema.md` (`X-REDESIGN-004`) — confirm created object types, **actual** property API names, and Contact↔Event association + label IDs match the code constants — before any write. **Done 2026-07-14** — one property rename (`public_registration_url`→`registration_form`), all 4 association IDs + 2 label IDs confirmed. **Open follow-up**: confirm whether the `290`/`292` label IDs are directional (check from the Contact object's side)

### Tests for User Story 6

- [ ] T050 [P] [US6] Backend Jest `Backend/node/tests/CheckInRoutes.test.ts` + `CustomObjectAdapter.test.ts` (401/403/404/405/409/429; audited writes; no register-attendee path)
- [ ] T051 [P] [US6] Vitest registration/check-in UI + copy-fix tests in `Frontend/src/views/CheckInView.test.tsx` / `AttendeesView.test.tsx`

### Implementation for User Story 6

- [ ] T052 [US6] Backend `Backend/scripts/Utils/HubSpot/CustomObjectAdapter.ts` (association-label read/write behind the ADR-005 seam)
- [ ] T053 [US6] Backend `Backend/scripts/Utils/RegistrationStore.ts` — per-registration Record Storage (`contactId+eventId`: `checkedInAt`, scan method, QR nonce/JWT); purge on Event archive
- [ ] T054 [US6] Backend `Backend/scripts/OnPostCheckIn.ts`, `OnPostUndoCheckIn.ts`, `OnDeleteAttendee.ts` — label writes, audited; remove blocked while `checked-in`; wire + guard in `OnHttpRouter.ts` + `RouteGuard.ts`
- [ ] T055 [US6] Doc sync: `Frontend/docs/api-contract.md` + `Frontend/docs/rbac.md` for check-in/undo/remove (from contracts/event-first-routes-api.md)
- [X] T056 [US6] Frontend check-in/undo/remove affordances (no register-attendee write) + copy fixes FR-019 — **Done 2026-07-15.** FR-019 copy earlier; Remove on Attendees already shipped; Undo check-in on Attendees + Check-in (`dataService.undoCheckIn`) shipped 2026-07-15.
- [ ] T057 [US6] Migration/backfill (`X-REDESIGN-005`): map existing Contact-property attendance + Parts-Attended → objects/associations; dual-read window; in `Backend/scripts/Utils/HubSpot/CustomObjectAdapter.ts` + a one-off migration script — **Parked 2026-07-14** in Frontend + Backend `TODO.md` (`X-REDESIGN-005` / `BE-REDESIGN-006`): retire `programs/{programId}/…` dual-read only after `resolveCatalogEvent*` → CatalogAdapter **and** Frontend full event-scoped cutover. Not done.

**Checkpoint**: Registration-as-association live; all check-ins audited

---

## Phase 9: Polish & Cross-Cutting Concerns

- [X] T058 [P] Update `Frontend/CHANGELOG.md` and `Backend/CHANGELOG.md` per phase shipped (what + why) — **Done 2026-07-14** (convergence cleanup session: T074/T064/T056 FR-019 copy)
- [X] T059 [P] Update `Frontend/TODO.md` + `Backend/TODO.md`: move completed `FE-/BE-REDESIGN-*` to Done; keep Phase B rows gated until `X-REDESIGN-001` — **Done 2026-07-14**
- [ ] T060 Run [quickstart.md](./quickstart.md) §A (both repos `npm test` + `npm run lint` + `npm audit --audit-level=high`)
- [ ] T061 Fill and run [quickstart.md](./quickstart.md) §B manual + §C operator security checks for the phase reaching QA; capture C10 sign-off
- [X] T062 [P] Update `Frontend/docs/ui-component-catalog.md` and `Frontend/docs/ui-routes.md` for new components (ThemeSwitcher, pickers) and any new views — **Done 2026-07-14** (`ui-routes.md` already current from T070/T071; catalog gained `ThemeSwitcher` + `WorkingEventPicker`)

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

## Phase 10: Convergence

- [X] T068 Remove the hardcoded RSA private-key literals from `Backend/scripts/GenerateJWT.ts` and `Backend/scripts/RoundTripTest.ts`; the check-in JWT signing key must come only from a ScriptRunner Connect Parameter, never embedded in `scripts/` source, per Constitution/backend-security.mdc (contradicts) — **CRITICAL** — **Done 2026-07-14.** Found the same embedded private key in a third file, `Backend/scripts/JWTPROOF.ts` (not originally listed here), so it's included in this fix too. All three were disposable, un-imported manual JWT-signing probe scripts (confirmed zero references anywhere in `scripts/`/`node/`) — deleted outright rather than parameterized, since the real production check-in JWT verification path (`Backend/scripts/Utils/CheckInJwt.ts`, `OnCheckInScan.ts`) is separate, already reads only from `context.environment.vars`/Parameters, and was never affected. `JWTtest2.ts` (harmless `console.log` stub, no secret) intentionally left for T074.
- [X] T069 Wire `Backend/scripts/Utils/HubSpot/CatalogAdapter.ts` / `HubSpotCatalogAdapter.ts` into Catalog CRUD — **Done 2026-07-14.** HubSpot UAT Program (`2-65757052`) / Event (`2-65757130`) had **zero records** → no migration/backfill; fresh test data via Catalog Admin. Added `createCatalogAdapter(ctx.config)` factory. Swapped `OnGetCatalog.ts`, `OnPostCatalogEvent.ts`, `OnPostCatalogProgram.ts`, `OnPatchCatalogEvent.ts`, `OnPatchCatalogProgram.ts` onto the adapter (standalone Events allowed; `start`/`end` ISO datetime; `status`/`publishState`; no `partsAttendedOption`/`attendanceProperty`/Program form IDs). Frontend Catalog Admin + types/normalize/mock updated to match. `docs/api-contract.md` reshaped. **Still Plan-C for event-scoped route guards:** `resolveCatalogEvent`/`resolveCatalogEventById` still read Record Storage — check-in/capacity/email look up HubSpot-created Event ids only after that follow-up (BE-REDESIGN-007 note). Backend 292 + Frontend 314 tests green.
- [X] T070 Correct `Frontend/docs/ui-routes.md`, which still documents `GET /events`, `GET /events/{id}`, `/events/{id}/analytics` as real routes backing Overview/Event Details — they don't exist anywhere in `Backend/scripts/Utils/Routes.ts`. **Correction (2026-07-14): `Frontend/docs/rbac.md` does NOT need this fix** — re-checked and it already has full rows for the event-scoped routes (`events/{evId}/attendees`, `/checkin`, `/capacity`, `/email/*`, lines 37-53); the original F3 finding's claim about `rbac.md` was a false positive from a `{eventId}` vs `{evId}` placeholder-name mismatch in the grep that produced it. Only `ui-routes.md` is stale. per FR-018 / `X-REDESIGN-003` (contradicts) — **Done 2026-07-14.** T071 has not shipped (data-model gap found, see below), so `ui-routes.md` was corrected to describe *current reality* rather than the T071-completed state: the `#/overview`, `#/events`, and `#/events/{id}` rows now say plainly that `fetchEvents`/`fetchEvent`/`fetchAnalytics`/`fetchScheduledEmails` have no matching Backend route and those views only render real data under `USE_MOCK_API: true`; `#/catalog` row updated to note `GET catalog` already returns the flat `{events, programs}` shape (T072 frontend half, done same session). A callout below the route table points to the T071 blocker.
- [X] T071 Rewire `Frontend/src/views/OverviewView.tsx`, `EventHubView.tsx`, `EventsView.tsx`, and `Frontend/src/components/WorkingEventPicker.tsx` onto `fetchCatalog()` (+ `events/{id}/capacity` for attendee counts, T073 status derivation, event id as HubSpot record id) — **Done 2026-07-14.** Portfolio UI shape is `PortfolioEvent` (`catalogEventPresentation.ts`); Type / Registration closes removed from Event Details per FE-REDESIGN-021. Retired unused `fetchEvents` / legacy `fetchAttendees` / `fetchActivity` from `dataService`. `fetchEvent`/`fetchAnalytics`/`MOCK_EVENTS` remain for Settings/Analytics/Agenda until **T080** (FE-REDESIGN-022). AppLayout working-event name also resolves via `fetchCatalog`. Vitest 329+; FE-REDESIGN-021 → Done archive. **Superseded for Events UI shape by Phase 11 (T078)** — T071 left `#/events` as portfolio table (“All Events”) + Catalog admin as create; grill 2026-07-14 moves create/manage onto Programs & Events.
- [ ] T072 Commit and deploy the catalog flat-reshape (`Backend/scripts/Utils/Catalog.ts` `flattenCatalogTree`, `Backend/scripts/OnGetCatalog.ts`), and reshape `Frontend/src/types.ts` `CatalogResponse` + `Frontend/src/utils/normalizeApi.ts` `normalizeCatalogResponse`/`normalizeCatalogProgram` to the flat `{events, programs}` shape, per research.md R-007 (partial). **Status 2026-07-14: SFTP deploy of the Backend half done. `git commit` in `Backend/` still pending** (`git status` still shows the same files modified) — commit before the next SFTP deploy overwrites or drifts from this state. **Frontend half done 2026-07-14:** `types.ts` (`CatalogEventSummary`, `CatalogProgram` sans `events`, flat `CatalogResponse`), `normalizeApi.ts`, `mockData.ts` (internal Program→Event tree flattened at the `getMockCatalog` boundary, mirroring Backend's `buildCatalogTree`/`flattenCatalogTree`), and the catalog-tree consumers (`CatalogPickers.tsx`, `CatalogAdminView.tsx`, `dataService.ts` `updateEvent`) all now read/write the flat shape. Typecheck + full Vitest suite (298 tests) pass. Backend `git commit` still pending — out of scope from `Frontend/` per repo `CLAUDE.md`.
- [X] T073 Implement the Event status model (Active/Cancelled manual, Completed auto-derived on end date, publish state tracked separately) in `Frontend/src/utils/catalogMetadata.ts` and relevant views, per FR-017 / US5/AC4 (missing) — **Done 2026-07-14.** Added `EventManualStatus`/`EventLifecycleStatus`/`EventPublishState` types, `deriveEventLifecycleStatus()`, and `isPastEndDate()` to `catalogMetadata.ts` as pure functions — `CatalogEvent` has no `manualStatus`/`endDate`/`publishState` fields yet (that lands with the T069 HubSpot custom-objects work), so these operate on a standalone `EventStatusInput` shape rather than `CatalogEvent` directly. **Decision (user, 2026-07-14):** Cancelled is a terminal manual override — an event manually set to Cancelled never auto-flips to Completed once its end date passes; only a manually-Active event auto-derives to Completed. Publish state (`Draft`/`Published`) is a separate type with no coupling to lifecycle status, per FR-017. **Deliberately not wired into `OverviewView`/`EventHubView`/`EventsView`** — sequenced before T071 (`FE-REDESIGN-021`) specifically so the status field exists before that rewire, but the actual view wiring is T071's job once it's unblocked. 12 new Vitest tests in `catalogMetadata.test.ts` (310 total, was 298); typecheck clean.
- [X] T074 Review and remove or relocate the stray probe script `Backend/scripts/JWTtest2.ts` from the deployable `scripts/` tree — not referenced by any route or task (unrequested). `JWTPROOF.ts` (originally also listed here) was deleted as part of T068 since it carried the same private-key exposure. — **Done 2026-07-14.** Deleted `Backend/scripts/JWTtest2.ts` (harmless `console.log` stub, no secret, zero references).

---

## Phase 11: Programs & Events IA (design handoff convergence)

> **Decided 2026-07-14** (grill): `design_handoff 2/` **Programs & Events** is the single create/manage/archive surface. Catalog admin (`#/catalog`) and PoC modules (Analytics / Agenda / Settings) are retired. See Frontend `TODO.md` **FE-REDESIGN-022**. Source: handoff screens + shared-understanding locks below.

**Shared understanding (do not re-interpret):**
1. Retire Catalog admin — `#/catalog` redirects to `#/events`; no second create surface.
2. `#/events` UI becomes **Programs & Events** (route string unchanged).
3. **Active / Archived** tabs; status filters (All / Active / Cancelled / Completed) on Active only.
4. Remove Analytics / Agenda / Settings from `eventModules`, routes, and views (or redirect stubs).
5. Reuse HubSpot-shaped `CatalogProgramModal` / `CatalogEventModal` (not the simplified mock field set).
6. Program cards **filter** the events table (incl. “No program (standalone)”); show **Filtered by program:** + dismissible chip to clear.
7. Program card **hover → Edit**; **Archive Program** on the Program edit modal.
8. Event **row click** → set Working Event + navigate to Event Details; **Edit / archive Event** only from Event Details **Edit event** (today that button wrongly navigates to Settings — rewire to Event modal).

### Tests

- [X] T075 [P] [US5] Vitest `EventsView` (Programs & Events): Active/Archived tabs, program-card filter + chip clear (incl. standalone), create Program/Event modals, XSS on program/event names — `Frontend/src/views/EventsView.test.tsx` — **Done 2026-07-14.**
- [X] T076 [P] [US5] Vitest Sidebar: label **Programs & Events**; Catalog admin gone; Analytics/Agenda/Settings absent — `Frontend/src/components/Sidebar.test.tsx` + `eventModules` tests if any — **Done 2026-07-14.**
- [X] T077 [P] [US5] Vitest Event Details **Edit event** opens `CatalogEventModal` (create/edit/archive path), no navigate to `#/.../settings` — `Frontend/src/views/EventHubView.test.tsx` — **Done 2026-07-14** with T081 (asserts **Archive Event** inside the modal).

### Implementation

- [X] T078 [US5] Rebuild `Frontend/src/views/EventsView.tsx` (+ `.module.css`) as **Programs & Events** per `design_handoff 2/` + locks above — program strip, events table, Active/Archived, status filters, search, pagination, mount existing Catalog modals, archive lifecycle previously owned by `CatalogAdminView` — **Done 2026-07-14.**
- [X] T079 [US5] Retire Catalog admin UI: remove Sidebar link; `#/catalog` → redirect to `#/events`; delete or thin `CatalogAdminView` once behaviour lives on EventsView; update Check-in / other copy that says “Catalog admin” — **Done 2026-07-14.** `CatalogAdminView` thinned to redirect stub; Sidebar/Check-in/Event Details/Attendees copy updated.
- [X] T080 [US5] Remove PoC modules: drop `analytics` / `agenda` / `settings` from `Frontend/src/config/eventModules.ts`, `ViewRouter`, routes in `App.tsx`; remove or stub `AnalyticsView` / `AgendaView` / `SettingsView` + tests; retire `fetchEvent` / `fetchAnalytics` / `fetchAgenda` / `MOCK_EVENTS` if unused — **Done 2026-07-14.** Views deleted; dead fetches/mocks retired. Generic `/events/:eventId/:module` route kept for legacy Attendees/Check-in/Email redirects + unknown-module placeholder.
- [X] T081 [US5] Event Details **Edit event**: open `CatalogEventModal` (edit + archive/unarchive); stop navigating to Settings — `Frontend/src/views/EventHubView.tsx` — **Done 2026-07-14.** Archive/Unarchive lives on the Edit modal (`onArchive`), not a header button — matches Phase 11 lock 8.
- [X] T082 [US5] Doc sync: `Frontend/docs/ui-routes.md` (Programs & Events, `#/catalog` redirect, modules removed), Sidebar labels, Overview “View all” copy if needed; changelog + `FE-REDESIGN-022` → Done when shipped — **Done 2026-07-14.**

**Checkpoint**: Operators create/edit/archive only from Programs & Events (+ Event Details Edit modal); no Catalog admin; sidebar matches handoff.
