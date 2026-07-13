# Phase 0 Research: Redesign Initiative (Slice 007)

**Plan**: [plan.md](./plan.md) · **Spec**: [spec.md](./spec.md) · **Date**: 2026-07-13

Most decisions here are already settled by the grilling session (2026-07-12) and recorded in [ADR-007](../../docs/decisions/007-hubspot-custom-objects-registration.md), [ADR-008](../../docs/decisions/008-standalone-events-event-first-nav.md), and [ADR-009](../../docs/decisions/009-redesign-ui-platform-theming-typography.md). This file consolidates them into the plan's decision format and flags the two `design-it-twice` items and one blocking gate that remain open before Phase B.

---

## R-001 — Token strategy (Phase A)

- **Decision**: Two-tier tokens. Keep primitive brand tokens (`--color-orange`, `--color-denim`, …) in `css/tokens.css` and add a **semantic role layer** (`--surface`, `--panel`, `--border`, `--text`, `--muted`, `--accent`, `--accent-soft`, `--ice`, status roles). Component CSS modules reference **only** semantic tokens. Each theme remaps the semantic layer in its own file selected by `data-theme`.
- **Rationale**: Enables a single themeable layer incl. Dark Aurora; matches the design agent's explicit callout to map the prototype's inline colours onto a token layer rather than duplicating them per element ([ADR-009] §1).
- **Alternatives rejected**: prototype's inline `var(--x)`-per-element (not themeable, duplicative); adopting the prototype's role names verbatim (`--page-bg`, …) — churns every existing `--color-*` usage for no gain ([ADR-009] alternatives).
- **Implication**: any component hardcoding hex must move onto semantic tokens so Dark Aurora renders — inventory these first (see plan Complexity Tracking).

## R-002 — Three themes + switcher + Celebration gating (Phase A)

- **Decision**: Themes on `data-theme`: **Aurora** (default light, replaces today's unnamed default), **Celebration** (prototype pink `#EC6C93`, WCAG-checked), **Dark Aurora** (net-new dark). User-chosen switcher; **Celebration appears only for allowlisted emails** (`CELEBRATION_THEME_EMAIL`), Aurora + Dark Aurora available to all.
- **Rationale**: Replaces "email forces Celebration" with "email unlocks Celebration as an option" ([ADR-009] §2–§4); reuses the existing `data-theme` mechanism already in `celebrationTheme.ts`.
- **Alternatives rejected**: keeping two forced themes; adding a full theme framework.
- **Implication**: refactor `celeb­rationTheme.ts` into a general 3-theme model, preserving the allowlist re-check at render.

## R-003 — Typography & icons self-host (Phase A)

- **Decision**: Bundle a **Manrope** subset (400/500/600/700/800) and a **Material Symbols Outlined** subset (only used glyphs, 1:1 ligature names) as woff2 via Vite; `@font-face` with `font-src 'self'`; **no** Google Fonts / icon CDN.
- **Rationale**: Follows the chart.js self-host precedent (`FE-SEC-005`); avoids third-party runtime dependency, FOUT, and CSP loosening ([ADR-009] §6–§7).
- **Alternatives rejected**: Google Fonts `<link>` (third-party origin + CSP loosening).
- **Implication**: add `font-src 'self'` to the CSP in `vite.config.ts`; document the glyph subset so it can be regenerated when new icons are used.

## R-004 — Shared accessible field pickers (Phase A)

- **Decision**: Build reusable **calendar / time / select** popovers matching all 3 themes, extending the existing `CatalogPickerSelect` pattern (button + `role="listbox"`/`option`, outside-click + Escape handling). **Keyboard nav + ARIA + screen-reader support is a hard completion gate.**
- **Rationale**: Native date/time inputs cannot be themed (Dark Aurora especially) and won't match the design ([ADR-009] §8); `CatalogPickerSelect` already establishes the accessible-popover pattern to extend.
- **Alternatives rejected**: native inputs as default (accepted only as a possible future touch-device fallback); a third-party date-picker library (new dependency, theming friction).
- **Implication**: a11y is verified in Vitest (keyboard/ARIA) + the `docs/ui-a11y-audit.md` checklist, not deferred.

## R-005 — Feasibility gates (Phase B blocker — `X-REDESIGN-001`) — OPEN

- **Decision**: Phase B does not start implementation until all four gates pass: (1) HubSpot frees **2 custom-object slots** (Program + Event); (2) workflows can **create/set custom-object associations** on the tier; (3) association-label model fits within **≤10 labels** per object pairing for `registered`/`checked-in`/`customer`/`partner`; (4) standard security write-gate (schema verified, RBAC, audit, validation + rate limit, handler order).
- **Rationale**: The whole event-first data model depends on registration living on the Event ([ADR-007] Gates; [ADR-008] dependency).
- **Status**: **OPEN** — user is chasing the slot quota with HubSpot. Tracked as `X-REDESIGN-001` (blocked) and `X-REDESIGN-004` (schema verify, blocked on #1).
- **Alternatives rejected**: a third "registration" join object (needs a slot the account can't spare); association-level properties (not a real HubSpot feature — labels only, verified 2026-07-12).

## R-006 — `CustomObjectAdapter` interface (Phase B design-it-twice — `X-REDESIGN-002`) — OPEN

- **Decision**: The **storage model** is settled (association labels + per-registration Record Storage), but the **adapter interface shape** is not. Run a `codebase-design` design-it-twice before implementing, as the **second** implementation of the ADR-005 `RegistrationAdapter`/`CheckInAdapter` seam.
- **Rationale**: Proves the seam is real and avoids coupling the new UI to a transitional data shape ([ADR-007] consequences).
- **Status**: **OPEN** — do before Phase B build; pairs `BE-REDESIGN-001`.

## R-007 — Event-first routing shape (Phase B design-it-twice — `X-REDESIGN-003`) — OPEN

- **Decision**: Move from `programs/{programId}/events/{eventId}/…` to **event-scoped routes** (`events/{eventId}/…`) or make `programId` optional throughout. Breaking contract change; update `api-contract.md` + `rbac.md` + `RouteGuard` in the **same change**. Every Event-scoped operation must work with `programId` absent.
- **Rationale**: Standalone Events + event-first navigation ([ADR-008] §2–§4).
- **Status**: **OPEN** — design-it-twice first; captured provisionally in [contracts/event-first-routes-api.md](./contracts/event-first-routes-api.md).

## R-008 — Registration & check-in write surface (Phase B)

- **Decision**: Registration = a Contact↔Event association; labels `registered`/`checked-in`/`customer`/`partner`. EMS write surface = **check-in** (flip `registered`→`checked-in`, write cache, audit), **undo check-in**, **remove attendee** (delete association; blocked while `checked-in`), **catalog CRUD**. Public + walk-in registration are **HubSpot-workflow-side** (EMS gains no register-attendee write). All check-ins flow through the audited EMS path.
- **Rationale**: One class of check-in with one governance guarantee; no HubSpot-only writes bypassing audit ([ADR-007] §2, §4, §6).
- **Alternatives rejected**: EMS-side registration writes (breaks the single audited path); global attendance Contact property (breaks when a Contact attends >1 Event).

## R-009 — Per-registration operational detail storage (Phase B)

- **Decision**: `checkedInAt`, scan method (QR/name/walk-in), and check-in QR **nonce/JWT** live in Record Storage keyed by `contactId + eventId`; **purged when the Event is archived**; the **audit log is the durable backstop** for "when".
- **Rationale**: HubSpot has no association-level properties, so per-relationship data can't live on the association; Record Storage covers operational detail at zero extra slot cost ([ADR-007] §3).
- **Alternatives rejected**: registration join object holding these as real properties (needs a 3rd slot).

## R-010 — Status model & copy (Phase B)

- **Decision**: Event status **Active / Cancelled** (manual) + **Completed** (auto when end date passes); **publish state** tracked separately from status. Copy fixes: remove "auto-checks in on scan" wording; QR summary fixed set = name, company, email, account manager, attendee type, current status; walk-in UI communicates roster **propagation lag**; rename prototype "HubSpot list" → **"segment"**.
- **Rationale**: Grilling vocabulary decisions ([ADR-008] §5; spec FR-017/FR-019; CONTEXT.md target model).

## R-011 — Campaign drafts (out of scope)

- **Decision**: No persisted draft-campaign state this pass; the prototype's Drafts stat is omitted/zeroed. Parked as `FE-REDESIGN-008`.
- **Rationale**: [ADR-009] §9; keeps the settled send-now/scheduled Campaign model unchanged.

---

## Post-research Constitution re-check

No new violations. Phase A adds exactly one small, non-PII, write-gated backend route and a self-hosted-font CSP addition (`font-src 'self'`). Phase B introduces HubSpot writes but only behind the ADR-005 seam and the blocking feasibility gates, with schema/RBAC/audit/validation/rate-limit all required before any write ships. Open items R-005/006/007 are gated/design-it-twice, not unjustified complexity.
