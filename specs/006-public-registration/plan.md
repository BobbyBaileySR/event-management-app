# Implementation Plan: Public Registration (Slice 3)

**Branch**: `006-public-registration` | **Date**: 2026-07-07 | **Spec**: [spec.md](./spec.md)

**Input**: `/speckit-plan` — HubSpot-hosted public registration links via Registration panel on Event Settings; Program URL + optional Event override; EMS publish state; admin-only.

## Summary

Deliver **Slice 3 public registration** under catalog context: extend **Program** and **Event** catalog records with `registrationPageUrl` and `registrationPublishState`; add **Registration panel** on **Settings** (replace mock “Registration & access” card) with resolved URL, source indicator, inline admin edit, copy link (published only), and **Open in HubSpot** (editor deep link or portal fallback). Catalog modals stay in sync via shared PATCH routes and `bumpCatalog()` after panel saves.

**No** EMS page builder, HubSpot publish API sync, or new public routes — catalog metadata + Settings UI only.

**Build order**: shared landing-page URL validator → catalog fields (backend + types) → Program/Event modal fields → resolved-registration helper → `RegistrationPanel` on Settings (catalog-scoped) → Open in HubSpot util → tests → quickstart sign-off.

## Technical Context

**Language/Version**: TypeScript — ScriptRunner Connect ECMAScript 2020 + Node 20 (Jest); React 19 + Vite (Frontend)

**Primary Dependencies**: Existing catalog handlers (`Catalog.ts`, `OnPostCatalogProgram`, `OnPatchCatalogProgram`, `OnPostCatalogEvent`, `OnPatchCatalogEvent`); `catalogContext` + `CatalogPickers`; `SettingsView`; `CatalogProgramModal` + `CatalogEventModal`; existing catalog audit trail

**Storage**: `registrationPageUrl` + `registrationPublishState` on `CatalogProgramRecord` and `CatalogEventRecord` (Record Storage metadata keys — see [data-model.md](./data-model.md))

**Testing**: Backend `CatalogRoutes.test.ts` (new registration URL/state cases); Frontend Vitest for URL validator, modal fields, `RegistrationPanel` resolve/edit/copy/RBAC, XSS on URLs

**Target Platform**: ScriptRunner Connect + GitHub Pages (UAT)

**Constraints**: Admin-only Registration panel; non-admins keep Settings minus panel; distinct landing-page allowlist (not walk-in form allowlist); default publish state `draft` on first URL save; Open in HubSpot fallback when editor URL cannot be derived; Settings migrates from legacy `eventId` mock to catalog selection for registration features

## Constitution Check

*GATE: Must pass before implementation. Re-checked after Phase 1 design.*

| Gate | Status | Notes |
| :--- | :--- | :--- |
| Security — no secrets in frontend | ✅ | URLs staff-pasted; no HubSpot tokens (NFR-001) |
| Security — XSS / CSP | ✅ | Plain-text URL display; `href` only after validator; no new iframe |
| Security — RBAC admin on Registration panel | ✅ | Panel hidden for non-admin; PATCH routes remain admin-only (001) |
| API contract + RBAC sync | ⏳ | Merge [contracts/catalog-registration.md](./contracts/catalog-registration.md) → `docs/api-contract.md` |
| Tests ship with behaviour | ⏳ | Catalog validation + RegistrationPanel Vitest required |
| No invented HubSpot property names | ✅ | No new HubSpot Contact properties |
| Audit on mutations | ✅ | Existing catalog audit covers POST/PATCH (FR-012) |
| Responsive layout | ✅ | Panel forms/buttons per `frontend-responsive.mdc` |
| Event-centric navigation | ✅ | Registration under Settings in Program + Event context |
| Deferred work in TODO.md | ⏳ | Park HubSpot editor derivation gaps if UAT finds new URL shapes |

**Post-design re-check**: ✅ No constitution violations. Additive catalog metadata + Settings UI; walk-in (`walkInFormUrl`) unchanged.

## Project Structure

### Documentation (this feature)

```text
specs/006-public-registration/
├── plan.md                      # This file
├── research.md                  # Phase 0 — allowlist, editor URL, Settings scope
├── data-model.md                # Phase 1 — catalog fields + resolved registration
├── contracts/
│   └── catalog-registration.md  # Phase 1 — catalog API delta
├── quickstart.md                # Phase 1 — validation scenarios
├── checklists/
│   └── requirements.md          # Spec quality (from /speckit-specify + clarify)
└── tasks.md                     # Phase 2 — via /speckit-tasks (not this command)
```

### Source Code (touch points)

```text
Backend/scripts/
  Utils/Catalog.ts               # PROGRAM/EVENT_METADATA_KEYS + validators + defaults
  Utils/Types.ts                 # CatalogProgram/Event record + bodies

Backend/node/tests/
  CatalogRoutes.test.ts          # registrationPageUrl + registrationPublishState cases

Frontend/src/
  types.ts                       # CatalogProgram/Event + bodies
  utils/hubspotRegistrationPageUrl.ts   # landing-page allowlist (new)
  utils/resolveRegistration.ts        # resolved URL/state/source (new)
  utils/hubspotPageEditorUrl.ts       # editor deep link + fallback (new)
  config.ts                      # HUBSPOT_LANDING_PAGES_FALLBACK_URL (new constant)
  state/catalogContext.tsx       # registration fields on CatalogSelection
  components/CatalogPickers.tsx  # pass registration fields on setSelection
  components/CatalogProgramModal.tsx
  components/CatalogEventModal.tsx
  components/RegistrationPanel.tsx    # new — panel UI
  components/RegistrationPanel.module.css
  views/SettingsView.tsx         # catalog-scoped; embed RegistrationPanel (admin)
  services/dataService.ts        # patch helpers if needed (reuse catalog PATCH)
  data/mockData.ts               # mock catalog registration fields
  utils/normalizeApi.ts          # normalize new fields from GET catalog
```

**Structure decision**: No new routes or hub modules — Registration panel lives inside existing **Settings** (`#/events/settings` or catalog-scoped equivalent). Reuse catalog POST/PATCH; no dedicated registration API.

## Delivery Phases

### Phase A — Shared validation + types

1. Add `isAllowedRegistrationPageUrl(url: string): boolean` in `hubspotRegistrationPageUrl.ts` (HTTPS + HubSpot subdomains or any valid HTTPS host per clarify).
2. Mirror in `Catalog.ts` (`validateRegistrationPageUrl`).
3. Add `registrationPageUrl` + `registrationPublishState` to `PROGRAM_METADATA_KEYS` and `EVENT_METADATA_KEYS`.
4. Validate publish state enum `draft` | `published`; default `draft` when URL newly set without state.
5. Extend types on Frontend + Backend; `normalizeApi` for GET catalog.

### Phase B — Catalog admin UI

1. Program modal: optional **Public registration page URL** + **Publish state** (draft/published).
2. Event modal: optional **Override registration page URL** + **Override publish state** (only when override URL set).
3. Backend tests: valid HubSpot/custom HTTPS URLs; reject `http:`; reject invalid publish state; default draft on first URL.

### Phase C — Registration panel (Settings)

1. Extend `CatalogSelection` with Program + Event registration fields from pickers.
2. `resolveRegistration(selection)` → `{ url, publishState, source: 'program' | 'event' }`.
3. `RegistrationPanel`: source badge, URL field, publish toggle/select, Copy (published only), Open in HubSpot.
4. Inline save → `PATCH catalog/program/{id}` or `PATCH catalog/event/{id}` + `bumpCatalog()`.
5. `SettingsView`: show panel when `session.role === 'admin'`; hide for non-admin; replace mock registration card.
6. Empty states: no URL; draft copy blocked messaging.

### Phase D — Open in HubSpot + docs

1. `tryResolveHubSpotPageEditorUrl(publicUrl)` — best-effort patterns; else `config.HUBSPOT_LANDING_PAGES_FALLBACK_URL`.
2. On fallback open, show brief inline note (FR-009).
3. Merge `contracts/catalog-registration.md` into `docs/api-contract.md`.
4. Vitest: editor util, panel RBAC, copy disabled when draft.

## Complexity Tracking

> No constitution violations requiring justification.

| Item | Notes |
| :--- | :--- |
| Custom-domain HTTPS allowlist | Accepted per clarify — staff-trusted paste model; distinct from strict walk-in embed allowlist |
| Settings catalog migration | Registration panel requires catalog context; legacy mock event details card may remain until broader Settings refactor |

## Agent context

No `.specify` agent-context update script in this repo; domain language in [CONTEXT.md](../../CONTEXT.md) and [spec clarifications](./spec.md#clarifications).
