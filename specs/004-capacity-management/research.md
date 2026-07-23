# Research: Capacity Management (004)

**Feature**: Slice 1 — live attendance on Check-in  
**Date**: 2026-07-07  
**Spec**: [spec.md](./spec.md)

> Historical implementation research. Runtime mock-data and CatalogPickers decisions were superseded by the 2026-07-15 mock removal and the event-first redesign; use `docs/api-contract.md`, `docs/ui-routes.md`, and the current quickstart for live behaviour.

---

## R-001: Live attendance formula

**Decision**: `liveAttendance = max(0, checkedInCount - departureCount)` where `checkedInCount` is HubSpot-backed (003 attendee semantics) and `departureCount` is EMS server-persisted net anonymous departures.

**Rationale**: Matches clarify session — check-in increases HubSpot checked-in; departures are anonymous EMS-side offset; floor at 0 when departures exceed checked-in after refresh.

**Alternatives considered**:
- **Standalone live headcount not tied to checked-in** — rejected: +1 could exceed checked-in without bound (FR-013).
- **Decrement HubSpot checked-in on −1** — rejected: requires knowing who left; contradicts anonymous departure requirement.

---

## R-002: Departure persistence store

**Decision**: Dedicated **Record Storage** document per Program + Event: key `ems-capacity-{programId}--{eventId}`, value `{ departureCount: number }` (non-negative integer). Workspace scope; same platform adapter pattern as `AuditStore` / `RateLimitStore`.

**Rationale**: Operational on-the-day state must not mutate catalog Event records; server persistence satisfies multi-desk sharing (clarify Q2-A); survives page refresh.

**Alternatives considered**:
- **Field on `CatalogEventRecord`** — rejected: conflates venue metadata with live ops counter; catalog PATCH would accidentally reset or expose departures in admin tree.
- **Browser session only** — rejected by clarify session.
- **Audit log replay to derive count** — rejected: expensive, race-prone; store is simpler.

---

## R-003: API surface

**Decision**: Two admin-only routes under existing slice prefix:

| Method | Route | Purpose |
| :--- | :--- | :--- |
| GET | `programs/{programId}/events/{eventId}/capacity` | Snapshot: capacity, checkedInCount, departureCount, liveAttendance |
| POST | `programs/{programId}/events/{eventId}/capacity/adjust` | Body `{ direction: 'up' \| 'down' }` — +1 correction / −1 departure |

**Rationale**: GET supports initial load and refresh after check-in; POST is explicit mutation with audit. Single GET avoids splitting checked-in count and departure fetch on frontend.

**Alternatives considered**:
- **Extend GET attendees with aggregate header** — rejected: wrong resource; check-in page should not pull full attendee list for a count.
- **WebSocket push for concurrent desks** — rejected: spec accepts brief staleness until next action/fetch.

---

## R-004: Checked-in count source

**Decision**: Backend capacity handler calls existing `RegistrationAdapter.listRegisteredAttendees` with `checkedIn: true`, `page: 1`, `pageSize: 1` and uses response **`total`** as checked-in count.

**Rationale**: Reuses shipped HubSpot query; no new adapter method required for Slice 1. Accepts HubSpot latency on capacity refresh (same as attendee list).

**Alternatives considered**:
- **New `countCheckedIn(eventId)` adapter method** — deferred: optimize if performance unacceptable (park in TODO).
- **Frontend counts from loaded search results** — rejected: check-in search is partial (min 2 chars, page cap 200); not full count.

---

## R-005: UI component strategy

**Decision**: Extend **`CapacityBar`** with optional tier styling and ±1 controls via props; add pure helpers in **`utils/capacityTier.ts`**. Event Hub keeps using simple `CapacityBar` without controls (registered vs capacity unchanged).

**Rationale**: Existing bar + CSS in codebase; Check-in needs tiers (75/90%) and controls; optional props avoid breaking Event Hub.

**Alternatives considered**:
- **New `CheckInCapacityBar` duplicate** — rejected: duplicated tier math and styles.
- **Inline markup in CheckInView only** — rejected: harder to test tier boundaries.

**Tier tokens** (Slice 1):

| Tier | Condition | Bar / label |
| :--- | :--- | :--- |
| normal | &lt; 75% | `--color-orange` (existing) |
| caution | ≥ 75% and &lt; 90% | `--color-info` + label “Approaching capacity” |
| critical | ≥ 90% and ≤ 100% | `--color-danger` + label “Nearly full” |
| over | &gt; 100% | `--color-danger` + label “At or over capacity”; bar fill capped 100% |

---

## R-006: Event capacity in Check-in context

**Decision**: Add optional **`capacity`** to `CatalogSelection`; `CatalogPickers` sets it from selected Event on fetch/change. Check-in uses selection for “show bar vs count-only hint”; authoritative capacity in GET response matches catalog.

**Rationale**: Same pattern as 003 plan for `walkInFormUrl` — avoids extra catalog fetch; immediate hide/show when capacity unset.

**Alternatives considered**:
- **Capacity from GET capacity only** — acceptable fallback but slower empty-state; selection enables FR-006 before network round-trip.

---

## R-007: Mock API parity *(superseded 2026-07-15)*

**Historical decision**: `mockData.ts` held in-memory departure counts. The runtime mock path was later removed; Vitest now uses test-local mocks and operator QA uses HubSpot Staging.

**Rationale**: FR/mock edge case in spec; local QA without SFTP.

---

## R-008: Multi-day Event reset

**Decision**: **No automatic reset** in Slice 1. Departure count persists for the Event key until manually corrected or a future admin reset feature.

**Rationale**: Spec deferred reset policy; multi-day Events are edge case for Phase 1; events team can use catalog clone or manual +1/-1 if needed.

**Alternatives considered**:
- **TTL on Record Storage key** — rejected: arbitrary expiry mid-event.
- **Daily reset at midnight** — rejected without product rule; park as TODO if requested.

---

## R-009: Walk-in mode coexistence

**Decision**: Capacity indicator + ±1 render **above** Check-in / Walk-in mode switch (when US3 present); refetch on return to Check-in mode optional polish only.

**Rationale**: Spec requires visibility during walk-in; walk-in does not auto-increment live count until attendee refresh.
