# Implementation Plan: Data Caching Layer

**Branch**: `012-data-caching-layer` | **Date**: 2026-07-19 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/012-data-caching-layer/spec.md`

**Design authority**: [ADR-015](../../docs/decisions/015-client-data-caching-layer.md) and [ADR-016](../../docs/decisions/016-no-prefetch-of-audited-pii.md) — settled before this plan; the plan implements them, it does not reopen them.

## Summary

Introduce **TanStack Query (v5)** as the data layer behind the existing `useDataService` seam, giving every view stale-while-revalidate caching with per-type freshness (catalog 5 min, capacity 30 s, attendees/audit always-refetch), a session-scoped memory-only cache cleared on any token change, a central query-key factory with a mutation → invalidation map, and non-PII-only prefetch enforced structurally (ADR-016). Add one backend route — `GET events/capacity-summary` (admin-only, mirroring `events/scheduled-email-summary`) — to replace Programs & Events' per-event capacity fan-out. Migrate all six data views big-bang; `dataService`/`client.ts` are untouched (the cache wraps them, it does not replace them).

## Technical Context

**Language/Version**: TypeScript ~6.0 (Frontend + Backend); React 19.2

**Primary Dependencies**: Frontend: Vite 8, react-router (hash routes), Chart.js (npm-bundled precedent), **new: `@tanstack/react-query` v5** (npm-bundled, no CDN, no CSP change). Backend: ScriptRunner Connect runtime, portable `Utils/` boundary (ADR-006)

**Storage**: Frontend: **in-page memory only** (QueryClient cache; no localStorage/sessionStorage/IndexedDB — FR-001). Backend: existing Record Storage stores (`CheckedInCounterStore`, catalog adapter) — no new stores

**Testing**: Frontend: Vitest + Testing Library (jsdom); Backend: Jest in `node/tests/` with Platform-store mocks

**Target Platform**: Static SPA (GitHub Pages) → ScriptRunner Connect HTTP listener → HubSpot. Responsive web (mobile/tablet/desktop)

**Project Type**: Web application, two folders: `Frontend/` (this repo root for specs) + `Backend/` (ScriptRunner scripts, SFTP-deployed)

**Performance Goals**: Revisited screens paint instantly (no full-screen skeleton) within freshness windows (SC-001); Programs & Events data requests fixed at 2 (catalog + capacity summary) regardless of event count, down from 1 + N (SC-002)

**Constraints**: No CSP change; memory-only cache cleared on token change (SC-003); PII read-audit truthfulness — no speculative audited reads (SC-004, ADR-016); RBAC/backend enforcement unchanged (FR-012); api-contract + RBAC + ROUTE_TABLE + dataService sync in the same change for the new route

**Scale/Scope**: 6 views to migrate (`EventsView`, `OverviewView`, `EventHubView`, `AttendeesView`, `CheckInView`, `AuditView`), 1 new backend route + handler + tests, new `src/data/` module (~4 files), no visual/UX redesign

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The constitution is an index; gates below come from its linked sources (blueprint §3, frontend/backend security rules, repo-root disciplines).

| Gate | Source | Status | Notes |
| :--- | :--- | :---: | :--- |
| Security precedence — feature securable? | blueprint §3 | ✅ | The security design *is* the design: ADR-016 prefetch boundary, memory-only cache, clear-on-token-change. Slice QA §C covers it. |
| No secrets/PII persisted in browser | frontend-security | ✅ | Cache is in-page memory only; FR-001 forbids persistent storage; §C check verifies. |
| No CSP loosening / no CDN scripts | frontend-security | ✅ | TanStack Query bundled via npm exactly like Chart.js; no new origins. |
| XSS: dynamic data rendered as text | frontend-security | ✅ | Cache changes data *transport*, not rendering; existing XSS-guard tests must stay green per view (FR-014). |
| API contract + RBAC sync in same change | ems-api-contract-discipline | ✅ | `events/capacity-summary` ships with api-contract.md, rbac.md, `ROUTE_TABLE`, dataService, tests together (FR-008). Contract draft in [contracts/](contracts/). |
| Backend handler order (session → RBAC → validate → rate limit → act → audit) | backend-security | ✅ | Router enforces session+RBAC; read-only non-PII route, no mutation audit; no read-audit (matches per-event capacity + scheduled-email-summary precedents). |
| Portable backend boundary (ADR-006) | ems-portable-backend | ✅ | New handler is a portable `On*.ts` (EmsRequest→EmsResponse), composes existing stores/adapters; no new `@sr-connect/record-storage` importer. |
| Write gate (no HubSpot/Record Storage writes without schema/RBAC/audit/validation) | backend-security | ✅ | Route is read-only; no new writes anywhere in the slice. |
| Testing discipline (tests ship with change) | ems-testing-discipline | ✅ | FR-014: per-view Vitest incl. XSS guard + cache behaviours; Jest guards (401/403/405) + shape tests for the route. |
| TODO/changelog discipline | ems-todo-discipline / ems-changelog | ✅ | `FE-PERF-001`/`BE-PERF-001` tracked; `FE-PERF-002` parked; changelogs updated at each step. |
| Domain language from CONTEXT.md / ADRs | constitution §Spec Kit | ✅ | Terms **Cache**, **Stale-while-revalidate**, **Prefetch**, **Query key / cache invalidation** already in CONTEXT.md. |

**Post-Phase-1 re-check**: ✅ no design artifact introduces a violation — the contract draft is admin-only deny-by-default, the data model persists nothing, quickstart §C covers the operator security checks.

**New-dependency justification** (closest thing to a violation): the repo's posture is dependency-light ("no Tailwind/Shadcn/Tremor/Mantine"). That rule targets UI framework sprawl; TanStack Query is data infrastructure, explicitly approved in the ADR-015 grilling with the owner. Recorded here so the gate is auditable — see Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
Frontend/specs/012-data-caching-layer/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output (incl. §C operator security comfort checks)
├── contracts/
│   └── events-capacity-summary.md   # Phase 1 output — new route contract draft
├── checklists/
│   └── requirements.md  # From /speckit-specify
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
Frontend/src/
├── data/                          # NEW — the only place query keys/invalidation/prefetch live
│   ├── queryClient.ts             # App-scoped QueryClient factory + per-type defaults
│   ├── queryKeys.ts               # Central query-key factory (ADR-015 scheme)
│   ├── invalidation.ts            # Mutation → invalidation helpers (subsumes ad-hoc reloadKey)
│   ├── prefetch.ts                # ONLY prefetchCatalog()/prefetchCapacitySummary() (ADR-016)
│   └── hooks/
│       ├── useCatalog.ts          # useQuery wrappers over useDataService methods
│       ├── useCapacity.ts         # capacity summary + per-event (CheckInView cadence)
│       ├── useAttendees.ts        # staleTime 0, gcTime 5 min (PII)
│       ├── useAuditLog.ts         # staleTime 0
│       └── useDispatches.ts       # campaign lists + scheduled summary
├── state/appState.tsx             # UNCHANGED API; token-change → cache.clear() wiring lives beside provider
├── services/dataService.ts        # + fetchCapacitySummary(); existing methods untouched
├── hooks/useDataService.ts        # UNCHANGED — the seam holds (ADR-015 "second adapter" test)
├── views/                         # All six data views migrate to data/hooks; local loading/reloadKey ladders removed
└── App.tsx                        # QueryClientProvider + session-clear effect

Frontend/src/views/__tests__ (existing per-view specs)  # updated wrappers (QueryClientProvider test util)

Backend/scripts/
├── OnGetCapacitySummary.ts        # NEW handler (mirrors OnGetScheduledEmailSummary.ts)
└── Utils/Routes.ts                # + ROUTE_TABLE entry `events/capacity-summary` (GET, admin)

Backend/node/tests/
└── CapacitySummary.test.ts        # NEW — guards (401/403/405) + aggregation shape

Frontend/docs/
├── api-contract.md                # + `GET events/capacity-summary` section (from contracts/ draft)
└── rbac.md                        # + route row (admin-only)
```

**Structure Decision**: Frontend-led web app change. The new `src/data/` module is the single home for query keys, invalidation, and prefetch (FR-010, ADR-016 structural enforcement); views consume typed hooks from `src/data/hooks/` and never touch key arrays. `useDataService`/`dataService.ts`/`client.ts` keep their existing roles — the cache layer wraps the service, proving the seam rather than moving it. Backend gets exactly one new portable handler + route-table row, modeled line-for-line on the `scheduled-email-summary` precedent.

## Complexity Tracking

> Constitution Check passes; one deliberate posture exception recorded for auditability.

| Deviation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| New runtime dependency `@tanstack/react-query` in a deliberately dependency-light codebase | Cache + dedup + stale-while-revalidate + invalidation + retry are subtle, failure-prone infrastructure; the library is the industry-hardened implementation (ADR-015) | Hand-rolled cache: we'd own staleness/dedup/race logic and its tests forever; status quo: leaves every navigation a full re-fetch — both rejected in the ADR-015 grilling with owner sign-off |
