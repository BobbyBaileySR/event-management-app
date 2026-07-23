# Implementation Plan: US3 Walk-in (003-check-in tranche)

> Historical implementation plan. Runtime mock-data, catalog-picker, Program-scoped route, and full-page mode-switch details were superseded by the mock-free event-first redesign and the shipped scanner/walk-in modals.

**Branch**: `003-check-in` | **Date**: 2026-07-06 | **Spec**: [spec.md](./spec.md) (US3)

**Scope**: **User Story 3 only** — HubSpot iframe walk-in on Check-in. US1 + US2 are shipped; this tranche does not change attendee read or check-in write paths.

**Input**: `/speckit-plan specs/003-check-in — US3 walk-in only`

## Summary

Add **Walk-in mode** to the Check-in page: admin toggles **Check-in | Walk-in**, sees a HubSpot registration form in an **iframe** sourced from the selected Event's **`walkInFormUrl`** (configured in the Event catalog modal). HubSpot owns all post-submit mutations; EMS provides catalog field storage, URL validation, CSP `frame-src`, and the iframe shell with a staff verification hint.

**No** `OnWalkIn.ts` / `POST …/walkin` — prior deferred backend write path is **cancelled** per FR-015.

**Build order**: shared URL validator → catalog field (backend + types) → Event modal field → CSP → Check-in mode switch + iframe UI → tests → quickstart §11.

## Technical Context

**Language/Version**: TypeScript — ScriptRunner Connect ECMAScript 2020 + Node 20 (Jest); React 19 + Vite (Frontend)

**Primary Dependencies**: Existing catalog handlers (`Catalog.ts`, `OnPostCatalogEvent`, `OnPatchCatalogEvent`); `catalogContext` + `CatalogPickers`; `CheckInView` + `CheckInQrPanel` (unmount lifecycle); production CSP in `vite.config.ts`

**Storage**: `walkInFormUrl` on `CatalogEventRecord` (Record Storage) — optional string metadata

**Testing**: Backend catalog validation tests (new `walkInFormUrl` cases); Frontend Vitest for Event modal validation, Check-in mode switch, iframe/empty-state, URL guard, CSP constant alignment

**Target Platform**: ScriptRunner Connect + GitHub Pages (UAT)

**Constraints**: Admin-only; HubSpot HTTPS host allowlist; no EMS walk-in write; iframe unmounted outside Walk-in mode; `USE_MOCK_API` does not gate iframe

## Constitution Check

*GATE: Must pass before implementation. Re-checked after design.*

| Gate | Status | US3 notes |
| :--- | :--- | :--- |
| Security — no secrets in frontend | ✅ | iframe loads public HubSpot URL only |
| Security — XSS / CSP | ✅ | `frame-src` extended for HubSpot; src allowlist matches CSP (research R-007) |
| Security — RBAC admin on slice surfaces | ✅ | Mode switch admin + catalog context; no new public routes |
| API contract + RBAC sync | ⏳ | Implement with `catalog-event-walkin.md` → `docs/api-contract.md`; remove `walkin` POST from contract |
| Tests ship with behaviour | ⏳ | Catalog validation + Check-in mode Vitest required |
| No invented HubSpot property names | ✅ | No new HubSpot properties in EMS |
| Deferred work in TODO.md | ⏳ | Cancel/update `BE-SLICE1-004` (OnWalkIn) when implementing |
| Walk-in does not block US1+US2 | ✅ | FR-010 — additive UI tranche |

## Project Structure

### Documentation (this tranche)

```text
specs/003-check-in/
├── plan.md                      # This file (US3 tranche)
├── research.md                  # Phase 0 — iframe, allowlist, no backend write
├── data-model.md                # Phase 1 — walkInFormUrl + CheckInMode
├── contracts/
│   ├── catalog-event-walkin.md  # Phase 1 — catalog field contract
│   └── check-in-api.md          # Updated — walk-in POST removed
├── quickstart.md                # §11 Walk-in validation added
└── tasks.md                     # Update via /speckit-tasks (not this command)
```

### Source Code (US3 touch points)

```text
Backend/scripts/
  Utils/Catalog.ts               # EVENT_METADATA_KEYS + walkInFormUrl validation
  Utils/Types.ts                 # CatalogEventRecord + bodies
  OnPostCatalogEvent.ts          # (unchanged entry — validation in Catalog)
  OnPatchCatalogEvent.ts

Backend/node/tests/
  CatalogRoutes.test.ts          # walkInFormUrl valid/invalid cases (extend existing)

Frontend/src/
  types.ts                       # CatalogEvent + bodies + CatalogSelection
  state/catalogContext.tsx       # walkInFormUrl in selection
  components/CatalogPickers.tsx  # pass walkInFormUrl on setSelection
  components/CatalogEventModal.tsx
  utils/hubspotFormUrl.ts        # shared allowlist validator (new)
  views/CheckInView.tsx          # mode switch + WalkInPanel
  views/CheckInView.module.css
  vite.config.ts                 # frame-src HubSpot origins
```

**Structure decision**: No new routes or views folder entry — Walk-in is a mode inside existing `#/events/check-in`.

## Delivery Phases (US3)

### Phase A — Shared validation + types

1. Add `isAllowedHubSpotFormUrl(url: string): boolean` (Frontend `utils/hubspotFormUrl.ts`).
2. Mirror validation in `Backend/scripts/Utils/Catalog.ts` (`validateWalkInFormUrl`).
3. Extend `CatalogEventRecord`, API types, `CatalogEvent`, `CreateCatalogEventBody`, `PatchCatalogEventBody` on both sides.
4. Add `walkInFormUrl` to `EVENT_METADATA_KEYS` + normalize/merge helpers (same clear-on-null pattern as `owner`).

### Phase B — Catalog admin UI

1. Event modal: optional **Walk-in form URL (HubSpot)** field with inline validation on save.
2. `eventMetadataLines` — display line when set (optional polish).
3. Backend tests: POST/PATCH accept valid URL; reject `http:`, non-HubSpot host, overlong string.

### Phase C — Check-in Walk-in mode

1. Extend `CatalogSelection` + `CatalogPickers` to carry `walkInFormUrl` from selected Event.
2. `CheckInView`: `checkInMode` state; segmented control **Check-in | Walk-in** below TopBar.
3. **Check-in mode**: existing US2 layout (unchanged).
4. **Walk-in mode**:
   - Persistent hint above iframe.
   - If `walkInFormUrl` valid → `<iframe title="HubSpot walk-in form" src={url} />` full-width in card.
   - If unset → `EmptyState` with link to `#/catalog`.
   - If set but invalid → error message, no iframe.
5. Reset mode to `check-in` on `programId`/`evId` change.
6. Conditional render: `CheckInQrPanel` only in Check-in mode (stops camera).

### Phase D — CSP + docs

1. `vite.config.ts`: append HubSpot origins to `frame-src`.
2. Merge `contracts/catalog-event-walkin.md` into `Frontend/docs/api-contract.md`.
3. Remove `POST …/walkin` from api-contract and `check-in-api.md`.
4. Update `Backend/TODO.md` — cancel `BE-SLICE1-004` OnWalkIn; note US3 is catalog + frontend only.

### Phase E — Tests + QA

1. Vitest: Event modal URL validation; Check-in mode toggle; iframe vs empty state; mode reset on catalog change; QR panel not mounted in Walk-in mode.
2. Manual: quickstart **§11**.

## Complexity Tracking

No constitution violations requiring justification. US3 reduces scope vs prior plan (no backend write handler).

| Prior plan item | Disposition |
| :--- | :--- |
| `OnWalkIn.ts` + `POST …/walkin` | **Cancelled** — HubSpot iframe owns writes (FR-015) |
| `submitWalkIn` dataService | **Cancelled** |
| EMS-native form fields | **Cancelled** — iframe per Session 2026-07-06 |

## Dependencies

| Dependency | Status |
| :--- | :--- |
| US1 Attendees (read) | ✅ Shipped — staff verify walk-in via refresh |
| US2 Check-in | ✅ Shipped — default mode unchanged |
| 001/002 Catalog CRUD | ✅ Shipped — extend Event metadata |
| HubSpot form configured for Program | **External** — events team; documented in quickstart §11 |
| SFTP + live smoke (US1/US2) | ✅ Done per tasks — US3 can proceed |

## Next command

Run **`/speckit-tasks specs/003-check-in — US3 walk-in only`** to replace obsolete T043–T048 (OnWalkIn tasks) with catalog + iframe task list.
