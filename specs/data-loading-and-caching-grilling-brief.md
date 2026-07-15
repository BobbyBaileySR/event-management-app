# Grilling brief — data loading, caching & perceived performance

> **Purpose.** Seed a `/grilling` session for how EMS fetches, caches, and refreshes data across
> navigation. This brief is **not** a spec — it frames the interview. The grilling should output an
> ADR (or two) under `docs/decisions/`, `CONTEXT.md` term updates, and TODO parking for deferred bits.
> Turn the settled outcome into a speckit `specify → plan → tasks` afterwards, as a new slice.

## The one decision, stated plainly

Today every view re-fetches from scratch on every visit, with no shared cache. The app feels slow
because the backend chain is inherently slow (browser → ScriptRunner Connect → HubSpot) **and** we pay
that cost again on every navigation. The decision to settle: **do we introduce a client-side data
layer (cache + background refresh + scoped prefetch) behind the existing `useDataService` seam, and if
so, what freshness and security rules govern it?** The security question is not a footnote — a
premature "cache/prefetch everything" would corrupt the PII read-audit trail. Grill the performance
gain and the security constraints **together**; they are one design.

## Design vocabulary for this grilling

Use the `codebase-design` skill's vocabulary throughout so the interview and any ADRs stay precise:

- **module / interface / implementation**, **depth**, **seam**, **adapter**, **leverage**, **locality**.
- The **seam already exists**: `useDataService()` (`src/hooks/useDataService.ts`) is where views obtain
  data. Today the implementation behind it is "a thin fetch wrapper, no memory of results." Adopting a
  cache is **deepening the implementation behind an existing interface** — ideally views change little.
- Apply **"one adapter = hypothetical seam, two = real"**: the current no-cache fetch is the first
  implementation; a caching implementation is the second that proves the `useDataService` seam holds.
  If the second implementation forces every view to change, the seam is in the wrong place — surface that.
- Consider `codebase-design`'s **design-it-twice** on the pivotal decision (library vs hand-rolled),
  comparing on depth, locality, and how much of the view layer each one touches.

## Current state (grounded in the code — do not re-investigate from scratch)

- **On-demand, per-view, no shared cache.** Every data view follows one pattern: `useState(loading=true)`
  → `useEffect` on mount / param change → `data.fetch…()` → `setState`. Confirmed in
  `src/views/EventsView.tsx` and `src/views/AttendeesView.tsx`; the others match.
- **`useDataService` memoises the *service*, not *results*** (`src/hooks/useDataService.ts`): it rebinds
  to the session token, nothing more. Navigating away and back = full re-fetch.
- **No caching technology present.** No TanStack Query / SWR in `package.json`; no `localStorage` /
  `sessionStorage` / `IndexedDB` used for data (only the in-memory session in `src/state/appState.tsx`).
- **The HTTP client has no cache** (`src/api/client.ts`): one `fetch` per call to the ScriptRunner
  listener, routes carried as the `route` query param (CORS-preflight-driven design).
- **Programs & Events does an N+1** (`src/views/EventsView.tsx`, `enrichPortfolioWithCapacity` in
  `src/utils/catalogEventPresentation.ts`): fetch catalog, then **one `fetchEventCapacityStatus` call per
  event**. This is likely the single slowest screen and is **non-PII** data.
- **The team already papers over the wait:** rotating "Did you know" facts on loading screens
  (`src/constants/loadingTips.ts`) — a symptom-level treatment of long loads, not a fix.
- **Session is in-memory and dies with the tab** (`src/state/appState.tsx`, `clearSession`). Any cache
  must inherit this lifecycle — it cannot outlive the session.
- **PII reads are audited server-side.** `Backend/scripts/Utils/Audit.ts` `writeReadAudit` logs
  `attendees.list` as a *"PII-sensitive read audit."* This is the crux of the prefetch constraint below.
- **RBAC is server-enforced, deny-by-default** (`Backend/scripts/Utils/RouteGuard.ts`); the CSP
  `connect-src` allowlist is build-time-injected in `vite.config.ts`. A client cache changes neither.
- **A mutation-invalidation hook already exists:** `catalogContext` has `catalogRevision` / `bumpCatalog`
  (`src/state/catalogContext.tsx`) — the current manual "refetch after admin edit" signal. Any cache
  layer should subsume this, not duplicate it.

## Core decisions to resolve in the grilling

1. **Adopt a data-caching layer, and which?** (the pivotal one)
   - (a) **TanStack Query** — in-bundle, industry-standard, gives cache + dedup + background refresh +
     invalidation for the least code; replaces per-view `loading`/`useEffect` boilerplate.
   - (b) **Hand-rolled cache behind `useDataService`** — no dependency, full control, but we re-implement
     staleness, dedup, and invalidation ourselves (and test them).
   - (c) **Status quo** — keep on-demand fetch; invest only in the N+1 fix and prefetch. Weakest gain.
   Compare on depth/locality and blast radius on the view layer.
2. **Freshness model per data type.** What staleness is acceptable, and what is the garbage-collection
   window (`gcTime`), for: catalog (programs/events), capacity, attendee list, audit log? Stale-while-
   revalidate is the default proposal — confirm the acceptable stale window for each, especially PII.
3. **Prefetch scope — the security-critical boundary.** Proposal: **prefetch only non-PII, non-audited
   data** (catalog + capacity — the slow screen), and **never prefetch attendee/registration reads**,
   because a prefetch would fire `writeReadAudit(attendees.list)` for data the operator never opened,
   making the audit trail *falsely* claim PII access. Confirm this rule and where it's enforced.
4. **Cache lifecycle vs session.** Cache must be cleared on logout and on session swap (mirror
   `clearSession`), and must never surface one session's PII into another. Decide the exact clearing
   hook and whether the cache is keyed/partitioned by token.
5. **Fix the N+1.** Options: backend returns capacity **with** the catalog in one response (contract
   change — triggers api-contract / rbac / RouteGuard / dataService sync + tests), or keep per-event
   calls but parallelise + cache them. Decide which, and whether the backend change is in this slice.
6. **Invalidation after mutations.** Map today's `catalogRevision`/`bumpCatalog` onto the chosen layer's
   invalidation (e.g. invalidate catalog queries after catalog CRUD, attendee queries after check-in).
   Decide the query-key scheme that makes this precise.
7. **Optimistic updates — in or out?** Instant check-in UI with server reconcile is premium polish but
   higher effort and interacts with audit (the real audit still writes on the server request). Likely
   **defer to a later slice** — confirm.

## Open questions to surface (not decide unilaterally)

- **Slice placement:** standalone "data layer / performance" slice, or folded into
  `007-redesign-initiative`? (The redesign is the natural sibling.)
- **Owner sign-off on a new dependency:** TanStack Query is in-bundle and adds no CSP origin, but a
  security-first, no-Tailwind/Shadcn posture means new deps are a deliberate choice — confirm appetite.
- **Backend appetite for the N+1 fix** given contract discipline and the portable-boundary rules.
- **Migration order:** which views migrate first (proposal: Programs & Events — worst + non-PII), and
  whether it's incremental (one view per PR) or big-bang.

## Guardrails (must hold — don't let the grilling wander past these)

- **No CSP change.** Same `connect-src` allowlist, same ScriptRunner origin, no CDN — library is bundled
  via npm like Chart.js (`vite.config.ts`).
- **Memory-only cache.** No `localStorage` / `IndexedDB` persistence of PII — the XSS/token threat model
  treats readable-in-memory as compromised-if-injected, so persisting PII would *widen* the blast radius.
- **Cache dies with the session.** Cleared on logout and session swap, mirroring `clearSession`.
- **Audit integrity beats speed.** No prefetch or speculative fetch of audited PII reads
  (`attendees.list`). "Operator viewed this" must stay truthful in the audit log.
- **RBAC unchanged.** Every cached/prefetched request is still an authenticated, `RouteGuard`-checked
  call; the backend stays the enforcement point. Stale-while-revalidate must not cross session/role.
- **Contract + testing discipline.** Any backend route change for the N+1 fix updates
  `docs/api-contract.md`, `docs/rbac.md`, `RouteGuard.ts`, and `dataService.ts` together; new/changed
  `dataService` behaviour and migrated views ship with Vitest specs incl. the XSS-renders-as-text guard.
- **Operator security QA.** When the slice reaches QA, `quickstart.md` §C must cover that cache-clear-on-
  logout works and that no PII persists after sign-out.

## Expected artefacts from the grilling

- **ADR** (`docs/decisions/`) recording the client-data-layer choice + freshness/invalidation model
  (cross-cutting, hard-ish to reverse).
- Possibly a **second ADR / note** pinning the prefetch-vs-PII-audit constraint (decision 3) so it isn't
  lost.
- `CONTEXT.md` updates for new/sharpened terms: **cache**, **stale-while-revalidate**, **prefetch**,
  **cache invalidation**, **query key**.
- TODO parking (`Frontend/TODO.md`, `FE-*`) for anything deferred (optimistic updates, persistent cache,
  later view migrations) — and matching `Backend/TODO.md` rows if the N+1 fix is deferred (`X-*`).
- Then: speckit `specify → plan → tasks` as a new slice, split to the existing write-gate cadence.

## Scope boundaries

- **In:** client-side cache + background refresh behind `useDataService`; per-type freshness model;
  scoped **non-PII** prefetch; the Programs & Events N+1 fix; cache-clear-on-logout + `gcTime` bound;
  invalidation mapped off `catalogRevision`; migrating views to the new pattern.
- **Out (for now):** the total UI redesign (`007` track); optimistic updates; offline / persistent
  cache; realtime / websockets; any change to the ScriptRunner→HubSpot transport itself.

## Reference map

| Topic | Files |
| :--- | :--- |
| Fetch seam + per-view pattern | `src/hooks/useDataService.ts`, `src/views/EventsView.tsx`, `src/views/AttendeesView.tsx` |
| Service + HTTP client | `src/services/dataService.ts`, `src/api/client.ts` |
| N+1 capacity enrichment | `src/utils/catalogEventPresentation.ts` (`enrichPortfolioWithCapacity`) |
| Session + invalidation signal | `src/state/appState.tsx`, `src/state/catalogContext.tsx` |
| Loading-screen symptom | `src/constants/loadingTips.ts`, `src/components/LoadingState.tsx` |
| Security infra (must hold) | `Frontend/vite.config.ts` (CSP), `Backend/scripts/Utils/RouteGuard.ts` (RBAC), `Backend/scripts/Utils/Audit.ts` (`writeReadAudit`) |
| Contract + RBAC docs | `Frontend/docs/api-contract.md`, `Frontend/docs/rbac.md` |
| Slice sibling | `Frontend/specs/007-redesign-initiative/` |
