# Implementation Plan: Capacity Management (Slice 1)

> Historical implementation plan. Runtime mock-data, CatalogPickers, and catalog-scoped route details were superseded by the mock-free event-first redesign; use the current quickstart and authoritative docs for live behaviour.

**Branch**: `004-capacity-management` | **Date**: 2026-07-07 | **Spec**: [spec.md](./spec.md)

**Input**: `/speckit-plan` — live attendance vs Event capacity on Check-in; 75%/90% visual tiers; server-persisted ±1 manual adjustment.

## Summary

Extend **Check-in** with a **live capacity indicator**: shows **live attendance** (HubSpot checked-in count minus server-persisted departure adjustments) against the Event **`capacity`** from catalog. Visual tiers at **75%** (caution) and **90%** (critical). Admin-only **+1 / −1** controls adjust anonymous departures without HubSpot writes.

**Build order**: backend capacity store + routes → contract/RBAC → catalog selection `capacity` → extend `CapacityBar` (tiers + controls) → wire `CheckInView` → mock layer → tests → quickstart.

**No** check-in blocking at capacity. **No** Attendees/Event Hub changes in this slice.

## Technical Context

**Language/Version**: TypeScript — ScriptRunner Connect ECMAScript 2020 + Node 20 (Jest); React 19 + Vite (Frontend)

**Primary Dependencies**: Existing slice routes (`OnGetAttendees`, `OnCheckIn`); `RegistrationAdapter` (checked-in total); `Catalog.ts` (Event `capacity`); `CheckInView`; `CapacityBar`; `catalogContext` + `CatalogPickers`; `writeMutationAudit`

**Storage**: New Record Storage keys `ems-capacity-{programId}--{eventId}` holding `{ departureCount: number }` — workspace scope, separate from catalog records (operational state, not metadata)

**Testing**: Backend `Slice1Routes` or dedicated capacity route tests (401/403/422/bounds); Frontend Vitest for tier math, control disabled states, Check-in integration, mock parity

**Target Platform**: ScriptRunner Connect + GitHub Pages (UAT)

**Constraints**: Admin-only; no HubSpot writes on adjust; live attendance ∈ [0, checkedInCount]; capacity indicator hidden when Event capacity unset/zero; mock honours same routes

## Constitution Check

*GATE: Must pass before implementation. Re-checked after Phase 1 design.*

| Gate | Status | Notes |
| :--- | :--- | :--- |
| Security — no secrets in frontend | ✅ | Aggregate counts only |
| Security — RBAC admin on slice surfaces | ✅ | New routes admin-only in `RouteGuard` |
| API contract + RBAC sync | ⏳ | Implement with `contracts/capacity-api.md` → `docs/api-contract.md` + `docs/rbac.md` |
| Tests ship with behaviour | ⏳ | Route tests + CheckInView/CapacityBar Vitest |
| No invented HubSpot property names | ✅ | Reuses existing attendance read path only |
| Audit on mutations | ✅ | `capacity.adjust` audit entries (NFR-004) |
| Responsive layout | ✅ | Indicator compact above Check-in card; see research R-005 |
| Deferred work in TODO.md | ⏳ | Multi-day reset policy if not in Slice 1 |

**Post-design re-check**: ✅ No constitution violations. Additive slice on 003-check-in.

## Project Structure

### Documentation (this feature)

```text
specs/004-capacity-management/
├── plan.md                      # This file
├── research.md                  # Phase 0 — storage, API shape, UI reuse
├── data-model.md                # Phase 1 — CapacityState + tiers
├── contracts/
│   └── capacity-api.md          # Phase 1 — GET status + POST adjust
├── quickstart.md                # Phase 1 — validation scenarios
└── tasks.md                     # Phase 2 — via /speckit-tasks (not this command)
```

### Source Code (touch points)

```text
Backend/scripts/
  Utils/CapacityStore.ts         # Record Storage read/write departureCount (new)
  Utils/Capacity.ts              # liveAttendance math + bounds validation (new)
  OnGetCapacityStatus.ts         # GET …/capacity (new)
  OnAdjustCapacity.ts            # POST …/capacity/adjust (new)
  OnHttpRouter.ts                # route wiring
  Utils/RouteGuard.ts            # admin rules for new routes
  Utils/Types.ts                 # CapacityStatusResponse, AdjustCapacityBody

Backend/node/tests/
  CapacityRoutes.test.ts         # auth, bounds, persistence, mock store (new)

Frontend/src/
  types.ts                       # CapacityStatus, AdjustDirection
  state/catalogContext.tsx       # CatalogSelection.capacity?: number
  components/CatalogPickers.tsx  # pass capacity on setSelection
  components/CapacityBar.tsx     # tiers + optional ±1 controls (extend or sibling)
  components/CapacityBar.module.css
  utils/capacityTier.ts          # pure tier + pct helpers (new)
  views/CheckInView.tsx          # mount indicator; refresh on check-in/adjust
  views/CheckInView.module.css
  services/dataService.ts        # fetchCapacityStatus, adjustCapacity
  data/mockData.ts               # mock departure store + get/adjust handlers
```

**Structure decision**: No new view or route hash — capacity UI lives inside existing `#/events/check-in`. Event Hub `CapacityBar` (registered fill) stays unchanged.

## Delivery Phases

### Phase A — Backend capacity state + routes

1. **`CapacityStore.ts`**: `getDepartureCount(programId, eventId)`, `adjustDepartureCount(programId, eventId, delta: 1 | -1)` with read-modify-write on Record Storage key.
2. **`Capacity.ts`**: `computeLiveAttendance(checkedInCount, departureCount)` → `max(0, checkedIn - departures)`; validate adjust bounds before write.
3. **`OnGetCapacityStatus.ts`**:
   - Resolve Event via catalog; read `capacity`.
   - Call `RegistrationAdapter.listRegisteredAttendees({ checkedIn: true, page: 1, pageSize: 1 })` for `total` as checked-in count (or dedicated count helper if added).
   - Read `departureCount` from store; return snapshot JSON per contract.
4. **`OnAdjustCapacity.ts`**: body `{ direction: 'up' | 'down' }` (−1 departure / +1 correction); enforce bounds; audit; return updated snapshot.
5. Wire routes in `OnHttpRouter.ts`; add `RouteGuard` rules (admin only).
6. **`CapacityRoutes.test.ts`**: 401/403; down at live 0 → 422; up at live = checkedIn → 422; happy paths; cross-session read same departureCount.

### Phase B — Contract + docs

1. Finalize [contracts/capacity-api.md](./contracts/capacity-api.md).
2. Merge into `Frontend/docs/api-contract.md` and `Frontend/docs/rbac.md`.
3. Changelog entries (Frontend + Backend) when implementing.

### Phase C — Catalog context + dataService

1. Extend `CatalogSelection` with optional `capacity?: number`.
2. `CatalogPickers`: include `capacity: selectedEvent.capacity` on all `setSelection` paths that set `evId`.
3. `dataService.ts`: `fetchCapacityStatus`, `adjustCapacity` with mock fallback.
4. `mockData.ts`: in-memory departure map keyed by `programId/eventId`; honour bounds; checked-in count from existing mock attendees filter.

### Phase D — Check-in UI

1. **`capacityTier.ts`**: `getCapacityTier(live, capacity)` → `normal | caution | critical | over`; `getFillPercent(live, capacity)`.
2. **Extend `CapacityBar`** (or `CheckInCapacityBar` wrapper):
   - Props: `liveAttendance`, `capacity`, `checkedInCount`, `onAdjust`, `adjusting`.
   - Labels: “N / capacity on site · pct%”; tier label text at caution/critical/over.
   - Bar fill uses tier colours (`--color-orange`, `--color-info`, `--color-danger` or dedicated tokens).
   - ±1 buttons; disable −1 when `live === 0`; disable +1 when `live === checkedInCount`.
3. **`CheckInView`**:
   - Fetch capacity status on mount and when `programId`/`evId` changes.
   - Render indicator below TopBar when `capacity > 0` (FR-001); count-only hint when capacity unset (FR-006).
   - After `confirmCheckIn` success → refetch status (or optimistic +1 live).
   - `adjustCapacity` handler → refetch on success.
   - Keep indicator visible in Walk-in mode when 003 mode switch exists (above mode control).
4. Responsive: stack controls on narrow widths; do not shrink QR panel below usable size (NFR-003).

### Phase E — Tests + QA

1. Vitest: `capacityTier.test.ts`; `CapacityBar` tier labels + disabled buttons; `CheckInView` loads indicator, updates after mock adjust/check-in.
2. `dataService.test.ts`: mock adjust bounds.
3. Manual: [quickstart.md](./quickstart.md).

## Complexity Tracking

No constitution violations requiring justification.

| Topic | Decision |
| :--- | :--- |
| Separate store vs catalog field for departures | **Separate Record Storage** — operational counter, not Event metadata |
| Dedicated checked-in count vs attendee list total | **Reuse adapter `total` with `checkedIn: true`** — no new HubSpot query shape in Slice 1 |
| Multi-day Event reset | **Deferred** — no auto midnight reset; note in TODO if needed |

## Dependencies

| Dependency | Status |
| :--- | :--- |
| 003-check-in US1+US2 (attendees, confirm) | ✅ Required — checked-in source |
| 001/002 Catalog Event `capacity` field | ✅ Shipped — consumed via pickers + catalog lookup |
| 003 US3 Walk-in mode | Optional — indicator stays visible when present |
| SFTP deploy for new handlers | Required before live QA |

## Next command

Run **`/speckit-tasks`** to generate `tasks.md` from this plan.
