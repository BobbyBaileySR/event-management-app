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

## R-005 — Feasibility gates (Phase B blocker — `X-REDESIGN-001`) — CLEARED

- **Decision**: Phase B does not start implementation until all four gates pass: (1) HubSpot frees **2 custom-object slots** (Program + Event); (2) workflows can **create/set custom-object associations** on the tier; (3) association-label model fits within **≤10 labels** per object pairing for `registered`/`checked-in`/`customer`/`partner`; (4) standard security write-gate (schema verified, RBAC, audit, validation + rate limit, handler order).
- **Rationale**: The whole event-first data model depends on registration living on the Event ([ADR-007] Gates; [ADR-008] dependency).
- **Status (updated 2026-07-14): ALL FOUR GATES CLEARED**:
  - **Gate #1 (slots) ✔** — Program (`2-65757052`, "Event Programs") + Event (`2-65757130`, "Event Items") exist in UAT.
  - **Gate #2 (workflow can set Contact↔Event association) ✔ CONFIRMED 2026-07-14** — tested directly with HubSpot admin access. The only association-creation workflow action available on this portal is **"Create association when there are matching property values"** (not a direct record-picker) — proved working with a manual test workflow. This shapes the registration mechanism itself; see R-008 below.
  - **Gate #3 (label limit) ✔** — Program→Event/Event→Program are a 1-to-many pairing (type IDs `286`/`287`); Event↔Contact is a **confirmed many-to-many** pairing (type IDs `288`/`289`) needing only **2** labels (`registered` type ID `290`, `checked-in` type ID `292`), well under the ≤10 limit.
  - **Gate #4 / `X-REDESIGN-004` (schema verify) ✔ CONFIRMED 2026-07-14** — all properties + associations created and verified directly against live HubSpot UAT (one rename: proposed `public_registration_url` → confirmed `registration_form`). Full detail in [docs/hubspot-schema.md](../../docs/hubspot-schema.md). One follow-up remains: confirm whether the `290`/`292` label type IDs are directional (a reverse-direction ID may exist) before the adapter writes labeled associations.
  - **Target env = UAT.** Object/association IDs stored as **ScriptRunner Connect Parameters** (see R-012), not hardcoded.
- **Alternatives rejected**: a third "registration" join object (needs a slot the account can't spare); association-level properties (not a real HubSpot feature — labels only, verified 2026-07-12).
- **`X-REDESIGN-002` (`CustomObjectAdapter` design-it-twice, R-006) DECIDED 2026-07-14** — see R-006 below.

## R-006 — `CustomObjectAdapter` interface (Phase B design-it-twice — `X-REDESIGN-002`) — DECIDED

- **Decision**: Ran a `codebase-design` design-it-twice (4 parallel designs, each under a different constraint: minimize-interface, maximize-flexibility, optimize-for-real-common-caller, explicit-ports-and-adapters) as the **second** implementation of the ADR-005 `RegistrationAdapter`/`CheckInAdapter` seam. All 4 designs independently reached the same conclusion on the biggest structural question (catalog CRUD is a separate sibling adapter, not folded in) — treated as settled. On the remaining points of difference, synthesized a hybrid, detailed below.
- **Rationale**: Proves the seam is real and avoids coupling the new UI to a transitional data shape ([ADR-007] consequences). Design-it-twice surfaced a real fact the naive first draft missed: only 2 of the 7 current callers of `RegistrationAdapter`/`CheckInAdapter` are check-in-desk callers — the other 5 (attendee list, capacity status, capacity adjust, and 2 email-campaign audience call sites) are list/count/audience-shaped, and 2 of those 5 were actively abusing a paginated list call (`listRegisteredAttendees({checkedIn:true, page:1, pageSize:1})`, reading only `.total`) to fake a count. The chosen design fixes that misuse directly rather than perpetuating it.

**Decided interface shape:**

```ts
export interface CustomObjectAdapter {
  readonly version: string; // bump from 'contact-workaround-v1'

  listRegisteredAttendees(params: ListAttendeesParams): Promise<ListAttendeesResult>;
  getContactSummary(contactId: string, eventId: string): Promise<ContactSummary | null>;
  countAttendees(query: AttendeeQuery): Promise<number>;              // one count method — serves capacity status/adjust AND campaign audience-estimate
  resolveAudience(query: AttendeeQuery): Promise<AudienceRecipient[]>; // materialized array, not streamed — see "rejected" below

  confirmCheckIn(contactId: string, eventId: string, input: CheckInInput): Promise<CheckInStateResult>;
  undoCheckIn(contactId: string, eventId: string): Promise<CheckInStateResult>;   // NEW capability, didn't exist before
  removeAttendee(contactId: string, eventId: string): Promise<RemoveAttendeeResult>; // NEW capability; internally re-reads live HubSpot state before deleting — never trusts the Record Storage cache for this gate
}

export interface AttendeeQuery {
  eventId: string;                    // no programId — Event is self-sufficient, Program is optional
  checkedIn?: boolean;                // undefined = both states
  excludeContactIds?: string[];       // generic exclusion set — see "rejected" below on why this isn't campaign-specific
}
```

**Decisions made across the 4 designs, and why:**
1. **No `query()`/`mutate()` mega-compression** (one design proposed 2 total entry points via TypeScript-overload discriminated unions). Rejected — more compressed on paper, but worse call-site readability/greppability than named methods (`confirmCheckIn` vs. `mutate({action:'check-in',...})`) for a small team maintaining route handlers; the interface is already small enough (7 methods) that further compression wasn't worth the ergonomics cost.
2. **`resolveAudience` returns a materialized array, not an `AsyncIterable`/stream** (two designs proposed streaming). Rejected streaming as the default — one of those two designs itself flagged that ScriptRunner Connect's bounded-execution model may not support long-lived async generators, and this was never independently verified. Materialized array is the safe default; if audience sizes ever become a real problem, ordinary cursor-based pagination is a proven fallback on this platform, unverified streaming is not.
3. **`excludeContactIds: string[]` (generic), not `excludeCampaignId` (campaign-aware)** — one design proposed baking "already received campaign X" logic directly into this adapter. Rejected (2 of 4 designs independently reached the same rejection): this adapter has no other reason to know what a "campaign" is; `DispatchAudience.ts`/`DispatchQueue.ts` compute the exclusion set from their own campaign-log domain and hand it over as plain contact IDs, keeping this adapter's job narrowly "resolve/count the registered set, minus this set."
4. **One `countAttendees(query)` method, not two** (`checkedInCount` + `countAudience` separately, as one design proposed) — a single parameterized count call covers both the capacity use case (`{eventId, checkedIn:true}`) and the campaign-estimate use case (`{eventId, excludeContactIds}`) without adding a second near-duplicate method.
5. **One `HubSpotAssociationPort`, not three split ports** (one design split HubSpot access into 3 separate port interfaces — associations, contact-read, event-read). Rejected the 3-way split as unnecessary construction-time wiring complexity — nothing in this codebase needs contact-property reads swapped independently of association reads; a single port covering the whole HubSpot dependency is right-sized.
6. **No `PortalConfig`/multi-portal support** (one design built this in from the start). Rejected as premature — EMS only ever talks to one HubSpot portal per environment (UAT xor Prod), never two simultaneously; nothing in ADR-005/ADR-007 calls for multi-portal support. Revisit only if a real multi-portal requirement appears.
7. **Adopted as the internal (behind-the-seam) implementation strategy, not part of the public interface**: a maintained checked-in counter in Record Storage, updated via compare-and-swap (`trySet`) on every `confirmCheckIn`/`undoCheckIn`/`removeAttendee`, with a recompute-from-HubSpot fallback if drift is detected — since HubSpot's v4 Associations API has no native cheap count endpoint, and capacity status/adjust are plausibly polled repeatedly during a live event. This is invisible to callers (`countAttendees` still just returns `Promise<number>`) and can change without any interface impact.
8. **`removeAttendee` invariant, stated explicitly since it isn't visible in the types**: must re-read the association's live label directly from HubSpot immediately before deleting — never gate on the Record Storage cache, since that cache is documented as convenience-only, not the state source. This closes a stale-cache race where a `remove` could delete an association for someone who just checked in.
9. **Catalog CRUD is a separate `CatalogAdapter`, unanimous across all 4 designs** — different caller population (catalog-admin screens vs. attendee/check-in/campaign screens), different RBAC surface (per `docs/rbac.md`), no caller ever needs both halves. The one real coupling point — archiving an Event must purge its per-registration Record Storage cache — is an explicit, typed call from `CatalogAdapter`'s archive path into a narrow purge method (e.g. `deleteAllForEvent(eventId)`) on the shared Record Storage cache port, not a merge of the two adapters. `Catalog.ts`'s existing validation/uniqueness/archive-cascade logic (in-process, Category 1) relocates into `CatalogAdapter`'s implementation as-is — that logic never depended on where the underlying object data lives.
- **Alternatives rejected**: see points 1–6 above.
- **Open, not blocking**: whether ScriptRunner Connect actually supports long-lived async-generator responses was never verified either way — moot for now since the decided shape doesn't require it, but worth confirming later if a future need for true streaming arises.
- **Status**: **OPEN** — do before Phase B build; pairs `BE-REDESIGN-001`.

## R-007 — Event-first routing shape (Phase B design-it-twice — `X-REDESIGN-003`) — DECIDED

- **Decision**: Move from `programs/{programId}/events/{eventId}/…` to **event-scoped routes** (`events/{eventId}/…`). Program membership is a **HubSpot association (ID `286`)** resolved by the adapter, **not** a route param or `programId` property. Breaking contract change; update `api-contract.md` + `rbac.md` + `RouteGuard` in the **same change**. Every Event-scoped operation must work with no Program association present. `catalog` reshapes from a Program→Event tree to a flat `events[]` (each carrying an optional `programId`) + `programs[]` for grouping/filter UI only.
- **Rationale**: Standalone Events + event-first navigation ([ADR-008] §2–§4). Confirmed against the current codebase: `events/:eventId/audit` already proves this exact shape works alongside the Program-scoped Slice 1 routes. More decisively, today's Slice 1 handlers call `resolveCatalogEvent(programId, eventId)` because Plan-C Record Storage nests Events under their Program — that lookup constraint disappears once `CustomObjectAdapter` makes Events root-level HubSpot objects addressable by id alone, so event-scoped routing isn't just a URL preference, it's what the Phase B data model actually enables.
- **Alternative considered (rejected)**: keep `programs/{programId}/events/{eventId}/…` with an optional/sentinel `{programId}` segment (e.g. `programs/_/events/…`). Rejected — needs new "optional path segment" capability the router doesn't have today, invents a sentinel-collision risk, and keeps Program in the URL as a structural parent, working against ADR-008's actual decision rather than expressing it.
- **Status**: **DECIDED 2026-07-13** — full target route table + `catalog` reshape in [contracts/event-first-routes-api.md](./contracts/event-first-routes-api.md). Left open (not part of this decision): whether `checkin/scan` collapses into `checkin` — a Phase B check-in-handler question (T052/T054), not a routing-shape one.

## R-008 — Registration & check-in write surface (Phase B)

- **Decision**: Registration = a Contact↔Event association; labels `registered`/`checked-in` (`customer`/`partner` stay on the existing Parts-Attended contact fields, not association labels). EMS write surface = **check-in** (flip `registered`→`checked-in`, write cache, audit), **undo check-in**, **remove attendee** (delete association; blocked while `checked-in`), **catalog CRUD**. Public + walk-in registration are **HubSpot-workflow-side** (EMS gains no register-attendee write). All check-ins flow through the audited EMS path.
- **Rationale**: One class of check-in with one governance guarantee; no HubSpot-only writes bypassing audit ([ADR-007] §2, §4, §6).
- **Alternatives rejected**: EMS-side registration writes (breaks the single audited path); global attendance Contact property (breaks when a Contact attends >1 Event).
- **Mechanism confirmed 2026-07-14** — the registration-side workflow can only create associations via **"matching property values"** (no direct record-picker action on this portal), so registration requires a shared key on both sides:
  - Contact property `ems_registration_match_key` (single-line text, internal/hidden group) — set by the registration form submission at the time of Event-specific submission; cleared back to blank by the same workflow immediately after the association is created (one-shot trigger, not persistent state).
  - Event Items property `registration_slug` (single-line text) — stable, human-readable per-Event identifier the workflow matches against.
  - The workflow's enrollment trigger must allow **re-enrollment** so a Contact who registers for Event A can trigger it again later for Event B — the durable "registered for which events" record is the accumulated set of labeled associations, never this transient property.
  - Full detail: [docs/hubspot-schema.md](../../docs/hubspot-schema.md) § *Registration match-key mechanism*.
  - **Still open**: how the registration form itself gets `registration_slug` into `ems_registration_match_key` at submission time (effectively a hidden/pre-filled field per Event's registration page) — not yet designed. Also open: who populates `registration_slug` on new Events — manual today, should be auto-generated by EMS's Catalog Admin write path once it exists (Phase B build item, not yet scoped as its own task).

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

## R-012 — HubSpot object/association IDs via ScriptRunner Connect Parameters (Phase B)

- **Decision**: Store **portal-specific** HubSpot object type IDs and association type/label IDs in **ScriptRunner Connect Parameters** (`HUBSPOT_OBJECT_TYPE_PROGRAM`, `HUBSPOT_OBJECT_TYPE_EVENT`, `HUBSPOT_ASSOC_PROGRAM_TO_EVENT`, `HUBSPOT_ASSOC_EVENT_TO_PROGRAM`, `HUBSPOT_ASSOC_EVENT_TO_CONTACT`, `HUBSPOT_ASSOC_CONTACT_TO_EVENT`, `HUBSPOT_ASSOC_LABEL_REGISTERED`, `HUBSPOT_ASSOC_LABEL_CHECKED_IN`). The `CustomObjectAdapter` reads them at runtime; stable property **API names** + label conventions live in code (`HubSpotSchema.ts`) + [docs/hubspot-schema.md](../../docs/hubspot-schema.md). Never hardcode IDs.
- **Rationale**: IDs differ between UAT and Prod; Parameters give env portability with no code change, matching how existing secrets/config are handled ([ADR-005] seam; hubspot-schema.md).
- **Updated 2026-07-14**: expanded from one assumed bidirectional `HUBSPOT_ASSOC_CONTACT_EVENT` parameter to four directional parameters (`_PROGRAM_TO_EVENT`/`_EVENT_TO_PROGRAM`/`_EVENT_TO_CONTACT`/`_CONTACT_TO_EVENT`) once real values showed each direction gets its own type ID (`286`/`287`/`288`/`289`). All values confirmed in UAT; see [docs/hubspot-schema.md](../../docs/hubspot-schema.md) for the current table, including the still-open question of whether the `290`/`292` label IDs are directional too.
- **Alternatives rejected**: hardcoding IDs (breaks UAT→Prod promotion); a checked-in config file (leaks env-specific IDs into VCS).

---

## Post-research Constitution re-check

No new violations. Phase A adds exactly one small, non-PII, write-gated backend route and a self-hosted-font CSP addition (`font-src 'self'`). Phase B introduces HubSpot writes but only behind the ADR-005 seam and the blocking feasibility gates, with schema/RBAC/audit/validation/rate-limit all required before any write ships. Open items R-005/006/007 are gated/design-it-twice, not unjustified complexity.
