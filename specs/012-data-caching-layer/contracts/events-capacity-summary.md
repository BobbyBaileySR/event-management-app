# Contract draft: `GET events/capacity-summary`

**Status**: Draft — merge into [docs/api-contract.md](../../../docs/api-contract.md) (and [docs/rbac.md](../../../docs/rbac.md)) in the same change that implements the route, per the api-contract discipline.

**Precedent**: modeled on `GET events/scheduled-email-summary` (portfolio-wide aggregate, no path params) and `GET events/{evId}/capacity` (field semantics).

## Route

Logical route `events/capacity-summary`, sent via the `route` query parameter to the ScriptRunner listener (`X-EMS-Route` header remains the backend fallback). Method **GET**. No path or query parameters.

**Auth**: `Authorization: Bearer <session>` + **`admin` role** (deny-by-default; matches per-event capacity and scheduled-email-summary — see RBAC row below).

**Purpose**: Portfolio-wide capacity/checked-in aggregate for Programs & Events (`FE-PERF-001`) — replaces the frontend's one-`events/{evId}/capacity`-call-per-event fan-out (`enrichPortfolioWithCapacity`) with a single round trip. The per-event route is **unchanged** and remains the source for CheckInView's live counter (which additionally needs `departureCount`/`liveAttendance` — deliberately not duplicated here).

## Response `200`

```json
{
  "events": [
    { "eventId": "ev-mr-2026", "programId": "prog-atlassian-2026", "capacity": 100, "checkedInCount": 42 },
    { "eventId": "ev-solo-2026", "programId": null, "capacity": null, "checkedInCount": 7 }
  ]
}
```

| Field | Notes |
| :--- | :--- |
| `events[]` | One row per **active (non-archived)** Event; `[]` when none. Order not guaranteed — consumers key by `eventId`. |
| `eventId` | HubSpot Event object id (same id space as `catalog` events). |
| `programId` | Resolved from the Event's own association; `null` for a standalone Event. |
| `capacity` | From catalog Event; `null` when unset or non-positive. Same rule as `GET events/{evId}/capacity`. |
| `checkedInCount` | Same maintained checked-in counter (with live-recompute fallback) as the per-event route — values must agree with per-event reads. |

## Errors

| Code | Body `error` | When |
| :--- | :--- | :--- |
| `401` | `missing_session` / `invalid_session` | No/expired Bearer token |
| `403` | `forbidden` | Authenticated non-admin role |
| `405` | `method_not_allowed` | Non-GET method |

No rate limit beyond global defaults (read-only, non-PII, one call per Programs & Events load — same posture as `scheduled-email-summary`). No audit entry (non-PII read; matches both precedents).

## RBAC row (for docs/rbac.md)

| Route *(logical)* | Method | viewer | operator | communications | admin | Phase/Slice |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| `events/capacity-summary` | GET | No | No | No | Yes | 012 |

## Backend implementation notes (non-normative)

- Handler `Backend/scripts/OnGetCapacitySummary.ts` — portable (`EmsRequest` → `EmsResponse` via `jsonResponse()`), mirrors `OnGetScheduledEmailSummary.ts`'s "list active Events, aggregate per Event" loop; composes the existing catalog adapter + `CheckedInCounterStore` path used by `OnGetCapacityStatus.ts`. No new `@sr-connect/record-storage` importer (ADR-006).
- `ROUTE_TABLE` entry in `Utils/Routes.ts`: pattern `events/capacity-summary`, GET, `roles: ['admin']`. **Registration order caveat**: must be matched ahead of any `events/:eventId/...` pattern so `capacity-summary` is not captured as an `eventId` (same consideration `scheduled-email-summary` handled).
- Tests `Backend/node/tests/CapacitySummary.test.ts`: 401 (no session), 403 (viewer), 405 (POST), empty-portfolio `[]`, multi-event aggregation incl. a standalone Event (`programId: null`) and a null-capacity Event, and counter-source agreement with the per-event handler.

## Frontend consumption

- `dataService.ts`: `fetchCapacitySummary(options)` → `apiRequest('events/capacity-summary', …)` → `normalizeCapacitySummaryResponse` (`normalizeApi.ts`).
- Cached as query key `['capacity', 'summary']`, `staleTime` 30 s / `gcTime` 5 min ([data-model.md](../data-model.md) §2).
- `enrichPortfolioWithCapacity` consumes the summary keyed by `eventId`, retaining its existing per-row fallback when a row is missing.
- Vitest: mapping test (raw JSON → normalized shape), hostile-string-renders-as-text guard on any newly rendered field (none expected — fields are numeric/ids), missing-row fallback.
