# Research: Data Caching Layer (Slice 012)

**Date**: 2026-07-19 · **Input**: [spec.md](spec.md), [ADR-015](../../docs/decisions/015-client-data-caching-layer.md), [ADR-016](../../docs/decisions/016-no-prefetch-of-audited-pii.md)

Most "unknowns" for this slice were resolved *before* specify, in the 2026-07-19 grill-with-docs session — those are cited to the ADRs rather than re-argued. This file resolves the remaining plan-level questions.

## R1. Data layer technology

- **Decision**: `@tanstack/react-query` v5, npm-bundled, wrapped behind hooks in `src/data/hooks/`.
- **Rationale**: ADR-015 (settled). v5 supports React 18+ — compatible with the repo's React 19.2. In-bundle like Chart.js: no CDN, no CSP change, no new network origin. Devtools package is **not** added (extra dependency, no production value; revisit only if debugging demands it).
- **Alternatives considered**: hand-rolled cache; status quo — both rejected in ADR-015 with reasons recorded there.

## R2. Integration shape — how TanStack sits behind the seam

- **Decision**: Views consume **typed domain hooks** (`useCatalog()`, `useCapacitySummary()`, `useAttendees(eventId, params)`, …) from `src/data/hooks/`. Each hook composes `useQuery` + the existing `useDataService()` binding (query functions call the same `dataService` methods views call today). `dataService.ts` and `client.ts` are unchanged in role; `useDataService.ts` is unchanged entirely.
- **Rationale**: ADR-015's "second adapter proves the seam" test: the cache deepens the implementation *behind* the existing interface. Domain hooks keep query keys/options out of views (FR-010) and make each view's migration a mechanical swap: `useState`+`useEffect`+`reloadKey` ladder → one hook call. If a view needs changes beyond that swap to compile, that's the seam-in-the-wrong-place stop signal (ADR-015 §Consequences).
- **Alternatives considered**: views calling `useQuery` directly with keys from a factory — rejected: leaks query options into 6 views, violates FR-010's "views never define dataset identities". Replacing `dataService` with query functions — rejected: needless churn of a working, tested seam.

## R3. Mutations and invalidation wiring

- **Decision**: Mutations keep their existing imperative `dataService` calls inside views/workflow hooks; after success they call **named invalidation helpers** from `src/data/invalidation.ts` (e.g. `invalidateAfterCheckIn(queryClient, eventId)`), which encode ADR-015's mutation → invalidation map. No `useMutation` adoption in this slice.
- **Rationale**: The views' mutation clusters (confirm/undo/toast flows) are already built and tested; wrapping them in `useMutation` is churn without user-visible gain and drags this slice toward the deferred optimistic-updates scope (`FE-PERF-002`). Central helpers still satisfy "invalidation lives only in the data layer" (FR-010).
- **Alternatives considered**: full `useMutation` migration — deferred; it is the natural vehicle *for* `FE-PERF-002` later. Event-bus/manual `reloadKey` retention — rejected: exactly the ad-hoc pattern this slice removes.

## R4. Session lifecycle wiring

- **Decision**: One module-scoped `QueryClient` created in `src/data/queryClient.ts`; `App.tsx` mounts `QueryClientProvider` and a small effect watching `session?.token` that calls `queryClient.clear()` on **any** change. `cancelQueries()` runs before `clear()` so in-flight responses from the old token are discarded, not written back (spec edge case "session ends mid-refresh").
- **Rationale**: ADR-015 (settled invariant). Watching the token in one effect beside the provider keeps `appState.tsx`'s public API untouched.
- **Alternatives considered**: token-partitioned query keys — rejected in ADR-015 (keeps old-session PII in memory until gcTime).

## R5. Per-type freshness — where defaults live

- **Decision**: `staleTime`/`gcTime` are set **per domain hook** (attendees hooks hard-code `staleTime: 0`, `gcTime: 5 min`; catalog 5 min/30 min; capacity 30 s/5 min per ADR-015). The `QueryClient` default is the *most conservative* (`staleTime: 0`), so an unconfigured future query is always-fresh by default, never accidentally cached.
- **Rationale**: Freshness is a per-data-type product decision (ADR-015 table), so it belongs beside each dataset's hook, not in global config; the conservative global default is the fail-safe direction (a missed override costs latency, never staleness or audit integrity).
- **Alternatives considered**: global defaults + per-call overrides everywhere — rejected: the safe/unsafe direction is asymmetric; defaults must fail safe.

## R6. Background-refresh failure UX

- **Decision**: When a query has data and a background refetch fails, keep rendering the data and surface a non-blocking indicator (existing `useToast()` or a small inline "Couldn't refresh — Retry" affordance per view family); first-load failures keep today's full error state + retry. Auth failures (401) during silent refresh route to the existing sign-out flow via the same error mapping `client.ts`/views use today.
- **Rationale**: Spec FR-004 and Assumptions ("stale beats blank, but never silently"). Reuses shipped feedback primitives (`useToast`, `role="alert"` error rows) instead of inventing chrome.
- **Alternatives considered**: blanking to full error state on any refetch failure — rejected: strictly worse UX than what the operator was already looking at; silent failure — rejected: violates "never silently".

## R7. `events/capacity-summary` route design

- **Decision**: `GET events/capacity-summary`, **admin-only**, no params; returns one row per **active (non-archived) Event**: `{ eventId, programId, capacity, checkedInCount }`. Handler `OnGetCapacitySummary.ts` mirrors `OnGetScheduledEmailSummary.ts` (same "list active events, aggregate server-side" shape) and reuses the same counter source as `OnGetCapacityStatus.ts` (maintained checked-in counter with live-recompute fallback). `departureCount`/`liveAttendance` are **excluded** — they serve the Check-in live view, which keeps the per-event route.
- **Rationale**: Precedent-matching (route naming, RBAC, handler structure) minimizes review surface. Admin-only matches both the per-event capacity route and the summary-route precedent in [rbac.md](../../docs/rbac.md) — deny-by-default; widen later only with a real viewer use case. Minimal field set = the exact contract `enrichPortfolioWithCapacity` consumes today (`checkedInCount`, `capacity`), so the frontend change is a fan-out-to-one-call swap with identical rendering.
- **Alternatives considered**: folding counts into the catalog response — rejected in ADR-015 (welds different freshness types); including live-attendance fields — rejected: no consumer, and it would tempt Programs & Events to show occupancy semantics that belong to Check-in.
- **Correction recorded**: `Backend/TODO.md` `BE-PERF-001` briefly said "admin+viewer per existing capacity RBAC" — existing capacity RBAC is **admin-only**; the TODO row is corrected as part of this plan.

## R8. Testing approach for cached views

- **Decision**: A shared test util (`renderWithQueryClient`) wraps components in a fresh `QueryClientProvider` per test (retry off, `gcTime: 0` in tests to avoid cross-test leakage). Existing per-view specs keep asserting rendered output (they mock `useDataService`, which remains the query-function source — mocks keep working). New data-layer specs cover: clear-on-token-change, invalidation helpers hitting the right key families, dedup (two hooks, one fetch), stale-paint-then-update, and the prefetch module's non-PII-only surface. Backend: `CapacitySummary.test.ts` with the standard guard matrix (401/403/405) + aggregation/shape cases, Platform stores mocked.
- **Rationale**: FR-014; keeps the "existing view suites pass after migration" success criterion (SC-006) honest — the mock seam is unchanged, so surviving tests genuinely prove the views still render the same states.
- **Alternatives considered**: MSW-style network-level mocking — rejected: the repo's established mock seam is `useDataService`, and changing test strategy mid-migration would invalidate the SC-006 signal.

## R9. Warming (prefetch) trigger points

- **Decision**: `prefetch.ts` exposes exactly `prefetchCatalog()` and `prefetchCapacitySummary()` (ADR-016). They are invoked once after successful sign-in (post-session-set) — warming the two datasets Programs & Events needs. No route-hover or speculative-navigation triggers in this slice.
- **Rationale**: Sign-in is the one moment we *know* the operator is headed into the app and the cache is empty; hover-triggers add complexity for marginal gain over an already-cached dataset. Keeping trigger points minimal also keeps the ADR-016 §C audit check ("no attendee audit entries without opening the screen") easy to verify.
- **Alternatives considered**: prefetch-on-hover/route-intent — deferred; measurable win only if sign-in warming proves insufficient.
