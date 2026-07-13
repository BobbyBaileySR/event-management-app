# Implementation Plan: Redesign Initiative (Slice 007)

**Branch**: `007-redesign-initiative` | **Date**: 2026-07-13 | **Spec**: [spec.md](./spec.md)

**Input**: `/speckit-plan` — full Redesign initiative: UI redesign + HubSpot custom-objects migration, recreated from `Frontend/design_handoff 2/`, phased A (unblocked) / B (gated on `X-REDESIGN-001`). See [ADR-007](../../docs/decisions/007-hubspot-custom-objects-registration.md), [ADR-008](../../docs/decisions/008-standalone-events-event-first-nav.md), [ADR-009](../../docs/decisions/009-redesign-ui-platform-theming-typography.md).

## Summary

Deliver the EMS redesign in two phases against the `design_handoff 2/` prototype as the visual source of truth:

- **Phase A (unblocked now):** a **two-tier token system** (primitive brand tokens + a semantic role layer remapped per theme), **3 themes** on `data-theme` — Aurora (default light), Celebration (allowlist-gated pink), and net-new **Dark Aurora** — a **user-chosen theme switcher**, **self-hosted Manrope + Material Symbols** subset fonts (`font-src 'self'`), **shared accessible field pickers** (calendar / time / select), and a **write-gated backend theme-preference endpoint** (cross-device, no PII, Celebration re-validated server-side). Applied globally via tokens without rebuilding IA-dependent layouts.
- **Phase B (gated on `X-REDESIGN-001` — objects now created in UAT, remaining gates below):** **event-first navigation**, **standalone Events** (Program membership via 1-to-many **association ID `286`**, no `programId` property), **registration-as-association** (Contact↔Event labels `registered`/`checked-in` only this pass; attendee type deferred to existing Parts Attended flags) behind a new `CustomObjectAdapter`, per-registration detail in Record Storage, live capacity/occupancy ±1, and the Campaign modal. Object/association IDs read from **ScriptRunner Connect Parameters** (research R-012). Nothing in Phase B writes until attributes/labels are created + verified (`X-REDESIGN-004`) and the workflow-association test passes (gate #2).

**Build order**: Phase A token refactor → fonts/icons → pickers → theme switcher + backend pref endpoint → *(gate)* → Phase B design-it-twice (`CustomObjectAdapter`, event-first routing) → backend adapter + routes → frontend event-first shell/views → migration/backfill → tests + quickstart sign-off.

**Gate status (2026-07-13):** Program (`2-65757052`) + Event (`2-65757130`) custom objects **created in HubSpot UAT** — gate #1 (slots) ✔, gate #3 (labels: Program→Event assoc `286`, Contact↔Event needs 2 labels) ✔. **Remaining before any Phase B write:** gate #2 (workflow can set Contact↔Event association — assumed, needs a test) and `X-REDESIGN-004` (attributes + Contact↔Event association/labels created and verified). Design-it-twice (`X-REDESIGN-002/003`) and Parameter setup (research R-012) can proceed now. See [research.md](./research.md) R-005/R-012 and [docs/hubspot-schema.md](../../docs/hubspot-schema.md).

## Technical Context

**Language/Version**: TypeScript — React 19 + Vite (Frontend); ScriptRunner Connect ECMAScript 2020 + Node 20/Jest (Backend)

**Primary Dependencies**: existing CSS-module + `css/tokens.css` token system (extended, not replaced); `data-theme` mechanism (already used by `celebrationTheme.ts`); `CatalogPickerSelect` (extended into shared pickers); self-hosted Manrope + Material Symbols subset woff2 via Vite (chart.js self-host precedent `FE-SEC-005`); **Phase B:** `RegistrationAdapter`/`CheckInAdapter` seam ([ADR-005](../../docs/decisions/005-hubspot-adapter-layer.md)) → new `CustomObjectAdapter`, HubSpot custom objects + association-label APIs, Record Storage, `OnHttpRouter` + `RouteGuard` + `enforceRateLimit`

**Storage**: Phase A — user-preferences store (Record Storage) for theme pref. Phase B — Program/Event as HubSpot custom objects (system of record; object type IDs `2-65757052`/`2-65757130`, Program→Event assoc `286`, all via **ScriptRunner Connect Parameters** — R-012); per-registration operational detail (`checkedInAt`, scan method, QR nonce/JWT) in Record Storage keyed by `contactId + eventId`, purged on Event archive; audit log as durable backstop. QR JWT `emsEventId` = HubSpot Event record id. See [data-model.md](./data-model.md) + [docs/hubspot-schema.md](../../docs/hubspot-schema.md)

**Testing**: Frontend Vitest — token/theme render + switcher gating, picker keyboard/ARIA, XSS guards on new surfaces; Backend Jest — theme-pref route (session/RBAC/validation/rate-limit/allowlist re-validation), and Phase B `CustomObjectAdapter` + check-in/undo/remove routes (401/403/404/405/429)

**Target Platform**: GitHub Pages (Frontend, UAT→Live) + ScriptRunner Connect (Backend)

**Project Type**: Web application (React frontend + ScriptRunner backend)

**Performance Goals**: No render/interaction regression vs current UI; theme switch is instant (no transition); fonts self-hosted to avoid FOUT; built for hundreds (not thousands) of attendees per Event ([ADR-007](../../docs/decisions/007-hubspot-custom-objects-registration.md))

**Constraints**: No new UI framework (Tailwind/Shadcn/Tremor/Mantine); no Google Fonts/icon CDN (`font-src 'self'`); no inline `var(--x)`-per-element (semantic classes only); admin-only shell, role-aware by design; WCAG 2.2 (pickers = hard a11y gate); XSS rule unchanged (JSX text interpolation only); no HubSpot property names until verified in `docs/hubspot-schema.md`; Phase B breaking route change updates api-contract + rbac + RouteGuard together

**Scale/Scope**: Entire Frontend (shell + all views) + one small Phase A backend endpoint + Phase B data-model migration; ~7 redesigned screens (Overview, Programs & Events, Event Details, Attendees, Check-in, Email/Campaign, Audit Log) plus shared chrome

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Gate (linked source) | Status | Notes |
| :--- | :---: | :--- |
| Security — no secrets in frontend ([frontend-security.mdc]) | ✅ | Theme pref + all HubSpot access via ScriptRunner; no tokens in browser |
| Security — XSS / CSP ([frontend-security.mdc]) | ✅ | JSX text-interpolation only (FR-005); CSP adds only `font-src 'self'` (FR-010) |
| Security — RBAC on new surfaces ([rbac.md]) | ✅ | Shell admin-only + role-aware (FR-013); theme-pref route RBAC defined in [contracts/](./contracts/) |
| API contract + RBAC sync ([ems-api-contract-discipline]) | ⏳ | Phase A: merge theme-pref route → `api-contract.md` + `rbac.md` + `RouteGuard`. Phase B: event-first routing change (`X-REDESIGN-003`) |
| Tests ship with behaviour ([ems-testing-discipline]) | ⏳ | Vitest for tokens/themes/pickers/XSS; Jest for theme-pref + Phase B routes |
| No invented HubSpot property names ([hubspot-schema.md]) | ⏳ | Phase B write-gate prerequisite `X-REDESIGN-004`; none used before verified |
| Audit on mutations ([rbac.md]) | ✅ | Phase B check-in/undo/remove audited; theme pref = cosmetic non-PII, audit not required ([ADR-009] §5) |
| Responsive layout ([frontend-responsive.mdc]) | ✅ | 375/768/1024 across all views (FR-004); tablet-first check-in |
| Accessibility WCAG 2.2 ([ui-a11y-audit.md]) | ⏳ | 3-theme contrast audit + picker kbd/ARIA/SR completion gate (FR-003/011) |
| Deferred work in TODO.md ([ems-todo-discipline]) | ✅ | Phase B gates + campaign drafts already parked (`X-REDESIGN-*`, `FE-REDESIGN-008`) |
| Vertical-slice write gate ([ADR-004]) | ⏳ | Phase B blocked on `X-REDESIGN-001`; schema/RBAC/audit/validation/rate-limit before any write |
| Operator security QA §C ([ems-slice-operator-security-qa]) | ⏳ | [quickstart.md](./quickstart.md) §C authored; filled per phase at QA |

**Initial gate result:** PASS (no unjustified violations). Phase B items are sequencing/gated, not violations.

**Post-design re-check:** ✅ See end of [research.md](./research.md) and Phase 1 output — design keeps theming in a single semantic layer, reuses the ADR-005 adapter seam, adds one non-PII backend route in Phase A, and defers all HubSpot writes behind the feasibility gates. No new constitution violations; Complexity Tracking has no unjustified entries.

## Project Structure

### Documentation (this feature)

```text
specs/007-redesign-initiative/
├── plan.md                       # This file (/speckit-plan)
├── research.md                   # Phase 0 — token strategy, fonts, pickers, persistence, adapter, routing
├── data-model.md                 # Phase 1 — ThemePreference (A); custom objects + association + Record Storage (B)
├── contracts/
│   ├── theme-preference-api.md   # Phase 1 — Phase A theme-pref endpoint
│   └── event-first-routes-api.md # Phase 1 — Phase B event-scoped routing + check-in/undo/remove (gated)
├── quickstart.md                 # Phase 1 — §A automated · §B manual · §C operator security
├── checklists/
│   └── requirements.md           # Spec quality (from /speckit-specify + /speckit-clarify)
└── tasks.md                      # Phase 2 — via /speckit-tasks (NOT this command)
```

### Source Code (touch points)

```text
Frontend/css/
  tokens.css                      # Extend: add semantic role layer (surface/panel/border/text/muted/accent/...)
  theme-aurora.css                # (new) Aurora role-token remap (default)
  theme-celebration.css           # Update: prototype pink #EC6C93 role remap (supersede dusty-rose)
  theme-dark-aurora.css           # (new) net-new dark role remap
  base.css / layout.css / components.css   # Move hardcoded hex → semantic tokens

Frontend/src/
  assets/fonts/                   # (new) Manrope + Material Symbols subset woff2 (Vite-bundled)
  styles/fonts.css                # (new) @font-face; font-src 'self'
  theme/themeTokens.ts            # (new) theme ids + metadata + allowlist gating
  theme/useTheme.ts               # (new) apply data-theme, load/persist pref, server re-validation
  utils/celebrationTheme.ts       # Refactor into the 3-theme switcher model (keep allowlist re-check)
  components/ThemeSwitcher.tsx    # (new) 3-swatch switcher (Celebration hidden unless allowlisted)
  components/pickers/             # (new) shared CalendarPicker / TimePicker / SelectPicker (extend CatalogPickerSelect)
  components/AppLayout.tsx        # Role-aware shell; sidebar/rail/tab-bar chrome per breakpoint
  components/Sidebar.tsx          # Event-first nav (Phase B); Working-event picker
  views/*.tsx + *.module.css      # Restyle onto semantic tokens (Phase A); event-first rework (Phase B)
  services/dataService.ts         # getThemePreference/setThemePreference (A); event-scoped methods (B)
  types.ts                        # ThemePreference DTO (A); Registration/association DTOs (B)
  data/mockData.ts                # theme pref mock (A); standalone-event + association fixtures (B)
  config.ts                       # CELEBRATION_THEME_EMAIL (existing)

Backend/scripts/                  # Phase A: theme pref · Phase B: custom objects (gated)
  Utils/UserPrefsStore.ts         # (new, Phase A) Record Storage per-user prefs (theme)
  OnGetUserPrefs.ts               # (new, Phase A) GET user/prefs
  OnPutUserPrefs.ts               # (new, Phase A) PUT user/prefs/theme (write-gated; allowlist re-validate)
  Utils/HubSpot/CustomObjectAdapter.ts   # (new, Phase B) 2nd impl of ADR-005 seam
  Utils/RegistrationStore.ts      # (new, Phase B) per-registration Record Storage cache
  OnPostCheckIn.ts / OnPostUndoCheckIn.ts / OnDeleteAttendee.ts   # (Phase B) association-label writes
  OnHttpRouter.ts / Utils/RouteGuard.ts  # wire + guard new routes
Backend/node/tests/
  UserPrefsRoutes.test.ts         # (Phase A)
  CustomObjectAdapter.test.ts / CheckInRoutes.test.ts   # (Phase B)
```

**Structure decision**: Extend the existing CSS-module + `css/tokens.css` system with a semantic role layer and per-theme remap files (no framework, no inline `var(--x)`). Reuse the existing `data-theme` mechanism and `CatalogPickerSelect` rather than introducing new primitives. Phase B rides the existing ADR-005 adapter seam so the event-first UI never binds to the transitional Plan-C data shape.

## Delivery Phases

### Phase 0 — Research + design-it-twice (see [research.md](./research.md))

1. Confirm token strategy (two-tier semantic layer; map prototype role names → existing `--color-*`).
2. Confirm font/icon self-host subsetting approach + CSP `font-src`.
3. Confirm shared-picker a11y contract (keyboard/ARIA/SR) extending `CatalogPickerSelect`.
4. Confirm theme-preference persistence + server-side Celebration re-validation.
5. **Gate research (`X-REDESIGN-001`)**: slots ✔ (objects created in UAT), labels ✔; **remaining** — workflow-association test (gate #2) + attribute/label creation + verify (`X-REDESIGN-004`). IDs → Parameters (R-012).
6. **`CustomObjectAdapter` design-it-twice (`X-REDESIGN-002`)** and **event-first routing shape (`X-REDESIGN-003`)** via the `codebase-design` skill.

### Phase A — Visual foundation (unblocked)

1. Semantic token layer in `tokens.css`; move component hardcoded hex → semantic tokens.
2. Three theme remap files (Aurora default, Celebration pink, Dark Aurora); WCAG contrast audit (`docs/ui-a11y-audit.md`).
3. Self-hosted Manrope + Material Symbols subset; `@font-face`; update Vite/CSP `font-src 'self'`.
4. Shared accessible pickers (calendar/time/select) — keyboard + ARIA + SR completion gate.
5. `ThemeSwitcher` + `useTheme` (Celebration hidden unless allowlisted).
6. Backend `UserPrefsStore` + `GET user/prefs` + `PUT user/prefs/theme` (session → RBAC → validate → rate limit → act; **Celebration re-validated server-side**, fallback Aurora).
7. Contract/RBAC merge for the theme-pref route; `dataService` + mock parity; Vitest + Jest.

### Phase B — Event-first + custom objects (gated on `X-REDESIGN-001`)

0. **Pre-write gates**: create HubSpot attributes + Contact↔Event association/labels per [docs/hubspot-schema.md](../../docs/hubspot-schema.md), confirm confirmed API names; add ScriptRunner Connect **Parameters** (R-012); run a **workflow-association test** (gate #2) proving a HubSpot workflow can set the Contact↔Event `registered` label.
1. `CustomObjectAdapter` behind the ADR-005 seam (reads IDs from Parameters); catalog CRUD against custom objects; Program↔Event via association `286`.
2. `RegistrationStore` (Record Storage) for per-registration detail; purge-on-archive.
3. Check-in (flip label + cache + audit), undo, remove-attendee (blocked while `checked-in`); no EMS register-attendee write.
4. Event-first routing change (`events/{eventId}/…` or optional `programId`) — update `api-contract.md` + `rbac.md` + `RouteGuard` together.
5. Frontend event-first shell + Overview/Events/Event Details/standalone flows; working-event picker; live capacity ±1; Campaign modal; copy fixes (FR-019).
6. Migration/backfill (`X-REDESIGN-005`); dual-read window.

### Phase C — Tests + sign-off

1. Full Vitest/Jest suites per [quickstart.md](./quickstart.md) §A.
2. Manual §B + operator security §C on UAT (per phase reaching QA).

## Complexity Tracking

> No constitution violations requiring justification. Risks tracked below.

| Risk | Mitigation |
| :--- | :--- |
| Global token refactor breaks components hardcoding hex | Inventory hardcoded hex first; Dark Aurora render test per view; semantic-token lint pass |
| Workflow can't set Contact↔Event association (gate #2) | Run workflow-association test **before** building EMS check-in writes; if it fails, re-plan registration source. Phase A ships standalone value regardless |
| HubSpot attribute API names differ from proposed | Code targets `HubSpotSchema.ts` constants + Parameters, not literals; confirm names on creation (`X-REDESIGN-004`) before writes |
| `CustomObjectAdapter` interface churn | Design-it-twice (`X-REDESIGN-002`) before implementation; ride existing ADR-005 seam |
| Breaking route change (`programs/.../events/...` → event-first) | Single change touching api-contract + rbac + RouteGuard; dual-read migration window |
| Custom pickers regress a11y vs native inputs | Keyboard/ARIA/SR is a hard completion gate (FR-003/011), not a follow-up |
| Celebration theme trusted from stored pref | Server-side re-validation on load/login; render-time gating regardless of store |

## Phase 2

Run **`/speckit-tasks`** to generate `tasks.md` from this plan + spec. Expect Phase A tasks to be immediately actionable; Phase B tasks generated but marked blocked on `X-REDESIGN-001`.
