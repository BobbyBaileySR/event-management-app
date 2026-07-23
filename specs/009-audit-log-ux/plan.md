# Implementation Plan: Audit Log Operator UX — True Paging, Filters, Resource Labels

**Branch**: `009-audit-log-ux` | **Date**: 2026-07-17 | **Spec**: [spec.md](./spec.md)

> **Implementation status 2026-07-17:** bucketed paging and the Frontend Apply/Clear filter bar shipped. Human-readable `resourceLabel` remains a separate follow-on (`FE-/BE-SLICE007-002`); operator sign-off remains pending.

**Input**: `/speckit-plan` — audit log operator UX, architecture pre-settled in [ADR-013](../../docs/decisions/013-audit-index-scope.md) via a `grill-with-docs` session (2026-07-17), alongside the related [ADR-011](../../docs/decisions/011-attendee-index-freshness.md)/[ADR-012](../../docs/decisions/012-attendee-index-write-conflict-resolution.md) attendee-index work tracked separately in `Backend/TODO.md`.

## Summary

`GET audit/recent` / `GET events/{id}/audit` (both served by `OnGetAuditRecent.ts`) call `AuditStore.listAuditEntries()`, which scans the **entire workspace Record Storage keyspace** and does a sequential per-key read before pagination happens in memory — the confirmed cause of 18-21s loads. This feature replaces that with a **bucketed, time-ordered pointer index maintained at write time** inside the existing `writeAudit()` call, so a page read touches only the entries it actually needs. On top of that index: four server-side filters (`action`/`actor`/`resourceType`/`resourceId`, applied via an explicit Apply action, scan-and-discard within the already-bounded time range per ADR-013 — no per-dimension secondary index), and read-time `resourceLabel` resolution against the live HubSpot catalog for `catalog_program`/`catalog_event` resources on the current page only.

**Build order**: research the index mechanics (Record Storage has no sorted-range-query or atomic-append primitive — Phase 0, resolved below) → `AuditStore.ts` bucketed index (write-time) → `Audit.ts` index-backed `listAuditLog` + filters → `resourceLabel` resolution (catalog adapter, current page only) → `OnGetAuditRecent.ts` query params → contract merge → `AuditView.tsx` filter UI + resource-label display → tests → quickstart sign-off.

**Blocked on**: nothing external — no HubSpot access, Parameter, or third-party dependency required. Pure Backend Record Storage + existing HubSpot `CatalogAdapter` (already used elsewhere for Program/Event lookups) plus a Frontend filter UI addition.

## Technical Context

**Language/Version**: TypeScript — ScriptRunner Connect ECMAScript 2020 + Node 20 (Jest); React 19 + Vite (Frontend)

**Primary Dependencies**: `Utils/Platform/AuditStore.ts` (extended — new bucketed index alongside existing entry storage), `Utils/Audit.ts` (`listAuditLog` rewritten to read the index instead of a full scan; filters + `resourceLabel` attachment), `Utils/HubSpot/CatalogAdapter.ts` (`getProgram`/`getEvent` — already exists, reused read-only for `resourceLabel`, not extended), `OnGetAuditRecent.ts` (new query-param parsing). No new third-party packages.

**Storage**: Record Storage — new bucketed pointer-index keys (e.g. `ems-audit-idx-{hourBucket}`) alongside the existing `ems-audit-{requestId}` entries; index entries share the audit log's existing 90-day TTL so the two expire together, never orphaned relative to each other.

**Testing**: Backend Jest — extended `AuditStore.test.ts` (index write/read, TTL alignment, concurrent-write behavior), extended `Audit.test.ts` (filters, `resourceLabel` attachment, fallback on deleted resource), extended `OnGetAuditRecent.test.ts` (new query params, 200/empty-filter cases). Frontend Vitest — extended `AuditView.test.tsx` (filter controls, Apply semantics, empty state, resource-label rendering incl. XSS guard) and `auditDisplay.test.ts` (`formatAuditResource` fallback logic), extended `dataService` mapping test.

**Target Platform**: ScriptRunner Connect (Backend) + GitHub Pages (Frontend) — unchanged.

**Constraints**: One time-ordered index only, no per-filter-dimension secondary index (ADR-013) — filters are scan-and-discard within the bounded time range, not indexed lookups. `resourceLabel` resolution is scoped strictly to the current returned page (FR-008) — never the full log, to avoid reintroducing an unbounded HubSpot-call fan-out. RBAC unchanged — `admin`-only on both routes, no new/loosened access (FR-009). No PII beyond today's exposure (FR-010) — `resourceLabel` is a Program/Event **name**, the same class of data already shown elsewhere in the app (e.g., WorkingEventPicker / Programs & Events), not new PII.

**Scale/Scope**: Audit log is workspace-wide with a 90-day TTL and an unbounded historical entry count today (that unboundedness is the bug). The bucketed index bounds per-request cost to "entries in the buckets actually touched for this page," independent of total historical volume.

## Constitution Check

*GATE: Must pass before Phase 0 research is acted on. Re-checked after Phase 1 design.*

| Gate | Status | Notes |
| :--- | :--- | :--- |
| Security — RBAC unchanged | ✅ | Both routes stay `admin`-only, identical to today — no rbac.md change needed |
| Security — XSS / CSP | ✅ | `resourceLabel` renders through `AuditView.tsx`'s existing JSX text rendering (`formatAuditResource`), same path as today's raw `resourceType`/`resourceId` — no new `dangerouslySetInnerHTML` surface |
| API contract sync | ✅ | Filter/query and bounded-total semantics merged into `docs/api-contract.md`; no RBAC change |
| Tests ship with behaviour | ✅ | Backend index/filter and Frontend filter/mapping coverage shipped |
| No invented HubSpot property names | ✅ | `resourceLabel` reuses `CatalogAdapter.getProgram`/`getEvent`'s existing `name` field — no new HubSpot property |
| Audit on mutations | N/A | This feature touches only how existing audit **reads** are served — no new mutation, no new audited action. The bucketed index write happens inside the existing, already-audited `writeAudit()` call; it's bookkeeping for a read path, not a new write surface requiring its own audit trail |
| Responsive layout | ✅ | Filter controls + Apply/Clear shipped using existing responsive/touch-target rules |
| Deferred work in TODO.md | ✅ | `BE-SLICE007-001`/`BE-SLICE007-002`, `FE-SLICE007-001`/`FE-SLICE007-002`, `X-SLICE007-001` already track this; scope confirmed via ADR-013 |
| Vertical slice write gate | N/A | No new HubSpot or Record Storage write path — the index write extends the existing, already-write-gated `writeAudit()` call; `resourceLabel` resolution is read-only |
| Portable backend boundary (ADR-006) | ✅ | The new index lives inside `Utils/Platform/AuditStore.ts`, already one of the named modules permitted to import `@sr-connect/record-storage` directly — no boundary change |
| Slice operator security QA | ⏳ | Required — this slice reads existing PII-adjacent audit data (staff activity) and is admin-gated; §C in [quickstart.md](./quickstart.md) is mandatory before Live sign-off, not skippable |

**Post-design re-check**: No constitution violations identified. The four ⏳ gates are delivery-phase actions (contract merge, tests, new UI, operator QA) gated on implementation, not open design questions.

## Project Structure

### Documentation (this feature)

```text
specs/009-audit-log-ux/
├── plan.md                       # This file
├── research.md                   # Phase 0 — Record Storage index mechanics (no native sort/atomic-append)
├── data-model.md                 # Phase 1 — bucketed index shape, AuditLogApiEntry.resourceLabel
├── contracts/
│   └── audit-log-ux-delta.md    # Phase 1 — query-param + response-field delta on existing routes
├── quickstart.md                 # Phase 1 — validation scenarios + required §C operator security checks
├── checklists/
│   └── requirements.md          # Spec quality (from /speckit-specify)
└── tasks.md                      # Phase 2 — via /speckit-tasks (not this command)
```

### Source Code (touch points)

```text
Backend/scripts/
  Utils/Platform/AuditStore.ts     # Extend: bucketed time-ordered pointer index written inside writeAudit();
                                    #   new paged/bounded read export (e.g. listAuditIndexPage) replacing the
                                    #   full-keyspace listAuditEntries() as the hot path
  Utils/Audit.ts                   # listAuditLog: read via the new index-backed path; thread action/actor/
                                    #   resourceType/resourceId filters (scan-and-discard within the page's
                                    #   bucket range, per ADR-013); mapAuditEntryToApi: attach resourceLabel
                                    #   for catalog_program/catalog_event entries via CatalogAdapter (current
                                    #   page's distinct resourceIds only, deduped, fallback on null/not-found)
  Utils/Types.ts                   # AuditLogApiEntry: add resourceLabel?: string | null
                                    #   listAuditLog options: add action?/actor?/resourceType?/resourceId?
  OnGetAuditRecent.ts               # Parse action/actor/resourceType/resourceId query params, pass through

Backend/node/tests/
  AuditStore.test.ts               # Extended — bucketed index write/read, shared TTL, same-bucket
                                    #   concurrent-write behavior (documented accepted risk, see research.md)
  Audit.test.ts                    # Extended — filter combinations incl. zero-match, resourceLabel
                                    #   attachment + fallback on deleted/archived catalog resource
  OnGetAuditRecent.test.ts         # Extended — new query params, per-event scope unaffected, 401/403 unchanged

Frontend/src/
  views/AuditView.tsx               # New filter controls (action/actor/resourceType/resourceId selects) +
                                    #   explicit Apply button; empty-state message on zero matches; render
                                    #   resourceLabel when present
  utils/auditDisplay.ts             # formatAuditResource: use resourceLabel when present, fall back to the
                                    #   existing resourceType/resourceId join when absent
  services/dataService.ts           # fetchAuditLog: accept filter options, pass through as query params
  types.ts                          # AuditLogEntry: add resourceLabel?: string | null

Frontend/src/ (tests)
  views/AuditView.test.tsx          # Extended — filter Apply flow, empty state, resourceLabel rendering +
                                    #   hostile-string XSS guard
  utils/auditDisplay.test.ts        # Extended — resourceLabel present/absent/fallback branches
```

**Structure decision**: No new Backend route, no new Frontend view. Every touch point extends an existing file — this is a performance/richness upgrade to an existing admin-only surface, not new architecture. The only genuinely new mechanism is the bucketed index inside `AuditStore.ts`, which stays inside its existing Platform-store boundary.

## Delivery Phases

### Phase 0 — Index mechanics (research, resolved below — see research.md)

`@sr-connect/record-storage` has no sorted-range-query and no atomic append/compare-and-swap on an existing key (confirmed via `types.d.ts`/`index.d.ts` inspection) — a naive "single growing index record" or "rely on `getAllKeys` ordering" approach doesn't work. Resolved: **hour-bucketed pointer records**, each holding that hour's entry ids newest-first, read backward from the current bucket until a page is filled. See research.md for the full rationale and the accepted same-bucket concurrent-write risk.

### Phase A — Backend index + read path

1. `AuditStore.ts` — add `writeAuditIndexEntry` (called from `writeAudit`, same TTL) and a new bounded, bucket-walking read export.
2. `Audit.ts` — rewrite `listAuditLog` to call the new bounded read instead of `listAuditEntries()`; thread filters through as scan-and-discard within the bucket range being read.
3. `Audit.ts` — `resourceLabel` resolution: for `catalog_program`/`catalog_event` entries on the current page, dedupe resourceIds, call `CatalogAdapter.getProgram`/`getEvent` directly (not the throwing `resolveCatalogEvent*` guards), substitute a fallback label (e.g. "No longer available") on `null`.
4. `OnGetAuditRecent.ts` — parse and pass through `action`/`actor`/`resourceType`/`resourceId` query params.

### Phase B — Contract + docs

1. Merge [contracts/audit-log-ux-delta.md](./contracts/audit-log-ux-delta.md) into `Frontend/docs/api-contract.md`.
2. No `rbac.md` change — confirm and note this explicitly in the PR (no new route, no role change).

### Phase C — Frontend filter UI + resource labels

1. `types.ts` + `dataService.ts` — carry filter options and `resourceLabel` through.
2. `AuditView.tsx` — filter controls (single-select per dimension, AND semantics per spec Assumptions) + Apply button; empty-state message; `auditDisplay.ts`'s `formatAuditResource` prefers `resourceLabel`.

### Phase D — Tests + quickstart sign-off

1. Backend + Frontend tests per [quickstart.md](./quickstart.md) §A.
2. Manual sign-off §B (US1/US2/US3) + §C (operator security comfort checks).

## Complexity Tracking

> No constitution violations requiring justification.

| Risk | Mitigation |
| :--- | :--- |
| Record Storage has no atomic append/CAS on an existing key — two audit writes landing in the same hour-bucket at the same moment can race (blind read-modify-write, last write wins) | Accepted, documented risk (research.md): the **audit entry itself is never lost** (it has its own durable key, written independently of the index) — only its presence in the fast-path index could rarely be dropped. Hour-level buckets (not day-level) keep the collision window narrow. If this ever proves material in practice, a per-bucket retry-with-reread loop is a bounded follow-up, not a redesign. |
| `resourceLabel` resolution adds a HubSpot dependency to what was a pure Record Storage read path | Bounded by FR-008 — resolved only for the current page's distinct resourceIds (dedupe first), never the full log. A HubSpot lookup failure for a given id degrades to the fallback label, not a failed request. |
| Filter scan-and-discard (ADR-013) could still be slow for a very active `actor`/`action` filter against a long unfiltered time range | Accepted per ADR-013 — this is an operator/investigative tool, not a hot path; add a per-dimension secondary index later only if this specific case proves genuinely hot. |

## Phase 2

Run **`/speckit-tasks`** to generate `tasks.md` from this plan + spec.
