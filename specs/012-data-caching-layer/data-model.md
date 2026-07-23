# Data Model: Data Caching Layer (Slice 012)

**Date**: 2026-07-19 · **Sources**: [spec.md](spec.md) §Key Entities, [ADR-015](../../docs/decisions/015-client-data-caching-layer.md), [research.md](research.md)

This slice adds no persistent entities anywhere — no HubSpot properties, no Record Storage stores, no browser storage. The "data model" is the in-memory cache's identity/freshness/invalidation scheme plus one new API response shape.

## 1. Query keys (cached-dataset identity)

All keys are produced by `src/data/queryKeys.ts` — the only module allowed to construct them (FR-010). Hierarchical, so invalidation works by prefix.

| Key shape | Dataset | Notes |
| :--- | :--- | :--- |
| `['catalog']` | Programs + events portfolio (active) | One dataset; `includeArchived` admin reads are a param variant: `['catalog', { includeArchived: true }]` |
| `['capacity', 'summary']` | New bulk capacity summary | Non-PII |
| `['capacity', eventId]` | Per-event capacity snapshot | CheckInView live counter; keeps its own refetch cadence |
| `['attendees', eventId, params]` | Attendee page for an Event | `params` = normalized `{ page, pageSize, filters… }`; **PII** |
| `['audit', params]` | Audit log page | `params` = normalized `{ page, pageSize, action?, actor?, resourceType?, resourceId? }` |
| `['dispatches', eventId, params]` | Campaign/dispatch list for an Event | `params` = view/filter variant |
| `['dispatches', 'scheduled-summary']` | Overview "scheduled this week" aggregate | Existing `events/scheduled-email-summary` |

**Param normalization rule**: params objects are normalized (stable key order, defaults filled) before entering a key, so `{page:1}` and `{}` with default page 1 are the *same* dataset — required for the dedup guarantee (FR-013) and the filter-swap edge case (distinct filters = distinct datasets, never bleeding rows).

## 2. Freshness & retention (per data type)

Set per domain hook; the global QueryClient default is `staleTime: 0` (fail-safe — see research R5).

| Key family | `staleTime` | `gcTime` | PII | Why |
| :--- | :--- | :--- | :---: | :--- |
| `['catalog', …]` | 5 min | 30 min | No | Changes rarely; own CRUD invalidates explicitly |
| `['capacity', 'summary']` | 30 s | 5 min | No | Volatile during live events; list-view tolerance |
| `['capacity', eventId]` | 30 s* | 5 min | No | *CheckInView overrides with its own tighter refetch interval (unchanged behaviour) |
| `['attendees', …]` | **0** | **5 min** | **Yes** | Always re-read on view → preserves read-audit truthfulness (ADR-016) + check-in freshness |
| `['audit', …]` | **0** | 5 min | No† | Investigative surface; stale log worse than a spinner. †Audit metadata is PII-free by design (Slice 1.5) but treated with the short retention anyway |
| `['dispatches', …]` | 30 s | 5 min | No | Campaign lists; mutations invalidate explicitly |

## 3. Invalidation map (mutation → key prefixes)

Encoded as named helpers in `src/data/invalidation.ts` — the only invalidation call sites (FR-010). Rule: over-invalidate when in doubt.

| Mutation (existing dataService call) | Invalidates |
| :--- | :--- |
| Catalog CRUD — program/event create, edit, archive/unarchive | `['catalog']`, `['capacity']` (whole family — archive changes the summary population) |
| Check-in (search/scan/walk-in confirm) | `['capacity', eventId]`, `['capacity','summary']`, `['attendees', eventId]` |
| Undo check-in | same as check-in |
| Remove attendee | same as check-in |
| Capacity adjust (±1) | `['capacity', eventId]`, `['capacity','summary']` |
| Campaign create / edit / cancel | `['dispatches', eventId]`, `['dispatches','scheduled-summary']` |

State transition on invalidation: affected datasets are marked stale; actively-mounted views refetch immediately, unmounted ones refetch on next mount (standard stale-while-revalidate — the spec's "reflected on next appearance", SC-005).

## 4. Session boundary

| Trigger | Behaviour |
| :--- | :--- |
| `session?.token` changes (sign-out, sign-in, swap) | `queryClient.cancelQueries()` then `queryClient.clear()` — unconditional, all key families (FR-006) |
| In-flight response for the old token | Cancelled/discarded; never written into the cleared cache (spec edge case) |
| 401 on background refetch | Existing sign-out flow (which itself changes the token → triggers the clear) |

## 5. New API response shape — `GET events/capacity-summary`

Full contract: [contracts/events-capacity-summary.md](contracts/events-capacity-summary.md).

```json
{
  "events": [
    { "eventId": "ev-mr-2026", "programId": "prog-atlassian-2026", "capacity": 100, "checkedInCount": 42 },
    { "eventId": "ev-solo-2026", "programId": null, "capacity": null, "checkedInCount": 7 }
  ]
}
```

| Field | Type | Validation / semantics |
| :--- | :--- | :--- |
| `events[]` | array | One row per **active (non-archived)** Event; empty array when none |
| `eventId` | string | HubSpot Event object id — matches catalog `id` |
| `programId` | string \| null | `null` for standalone Events (mirrors per-event capacity route) |
| `capacity` | number \| null | From catalog; `null` when unset or non-positive (same rule as per-event route) |
| `checkedInCount` | number ≥ 0 | Same counter source as `events/{evId}/capacity` — values MUST match per-event reads (SC-002) |

Frontend normalization: `normalizeCapacitySummaryResponse` in `normalizeApi.ts`, consumed by `fetchCapacitySummary()` in `dataService.ts`; `enrichPortfolioWithCapacity` swaps its per-event `fetchCapacity` fan-out for one summary lookup keyed by `eventId`, keeping its existing per-row fallback (`{checkedInCount: 0, capacity: event.capacity ?? null}`) when a row is missing.

## 6. Explicitly not modeled

- **No `useMutation` entities** — mutations stay imperative in this slice (research R3); optimistic-update state is `FE-PERF-002`.
- **No cross-tab state** — each tab's cache is independent (spec Assumptions).
- **No persistence schema** — nothing is serialized; there is deliberately no storage format to version.
