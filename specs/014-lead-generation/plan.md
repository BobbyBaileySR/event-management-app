# Implementation Plan: HubSpot Lead Generation from Event Attendees

**Branch**: `014-lead-generation` | **Date**: 2026-07-21 | **Spec**: [spec.md](./spec.md)

**Input**: `/speckit-plan` — architecture pre-settled in [ADR-018](../../docs/decisions/018-hubspot-lead-generation.md) via a `grill-with-docs` session (2026-07-21) plus a follow-on 5-item gap review, same day.

## Summary

Staff need to convert event attendees into HubSpot Leads, carrying what that attendee said they were interested in (captured by `013-registration-form-bridge`) onto the Lead as sales context — not just a content-free marker that they attended. ADR-018 settled the mechanics: a new custom Lead property set once at first creation (doubling as an EMS-provenance marker), every later update logged as a HubSpot Note rather than growing that property, a live "does this Contact already have an EMS-created Lead" check before every write, and a fixed lead classification with no signal-strength differentiation. This plan covers the two EMS-side pieces: **(1)** a new `LeadAdapter` (create/update via HubSpot's Leads API) plus its two write routes (single-attendee, bulk), and **(2)** the Attendee Detail modal / Attendee list UI that triggers them.

**Build order**: Phase 0 confirms the HubSpot Leads API mechanics ADR-018 already researched are sufficient to build against (no remaining unknown) → Phase 1 designs the adapter interface, the two routes' contracts, and the audit/rate-limit/large-batch-confirmation plumbing → implementation (adapter → single-attendee route/UI → bulk route/UI) → tests → quickstart sign-off (operator security §C, since this is EMS's first write that creates a brand-new HubSpot CRM record, not just an association/property change).

## Technical Context

**Language/Version**: TypeScript — Backend: ScriptRunner Connect ECMAScript 2020 + Node 20 (Jest). Frontend: React + Vitest (unchanged toolchain).

**Primary Dependencies**: New `Backend/scripts/Utils/HubSpot/LeadAdapter.ts` (follows the existing adapter pattern — `CustomObjectAdapter.ts`, `CatalogAdapter.ts` — importing `Utils/HubSpot/HubSpotApiClient.ts`'s generic fetch wrapper, no new package); new `Backend/scripts/OnPostAttendeeLead.ts` (single) and `Backend/scripts/OnPostAttendeeLeadBatch.ts` (bulk) handlers, registered in `Utils/Routes.ts`; reuses `Utils/DispatchValidation.ts`'s large-batch-confirmation shape (currently named for email "sends," generalized here — see research.md R-002) and `Utils/Audit.ts`'s typed-action pattern (new `lead.generate` action, plus `attendee.registration_history.view_all` for the expanded-history read per ADR-014's precedent). Frontend: new "Generate Lead" action in `AttendeeDetailModal.tsx` (single) and a new bulk action on the Attendee list's existing multi-select surface (bulk) — both call new `dataService.ts` methods.

**Storage**: No new Record Storage — this feature reads `013-registration-form-bridge`'s `RegistrationAnswerHistoryStore` (already built) and writes only to HubSpot (a new Lead, or a Note on an existing one). The only new "storage" fact is per-Lead, inside HubSpot itself: the `ems_lead_interest_summary` custom property (written once) doubling as the provenance marker.

**Testing**: Backend Jest — new `LeadAdapter.test.ts` (create path, update-via-Note path, the provenance check's two branches, fixed-classification value); new `OnPostAttendeeLead.test.ts`/`OnPostAttendeeLeadBatch.test.ts` (RBAC, audit, large-batch confirmation gate, per-attendee no-skip behavior for those with no recorded interest). Frontend Vitest — extended `AttendeeDetailModal.test.tsx` (Generate Lead action, success/failure toast); new bulk-action test on the Attendee list (large-batch confirmation dialog, per-row outcome).

**Target Platform**: ScriptRunner Connect (Backend) + static React SPA (Frontend) — both unchanged platforms.

**Constraints**: Two new HubSpot OAuth scopes (`crm.objects.leads.read`/`write`) must be granted before any of this can be tested against real HubSpot data (`HS-015`) — a coordination dependency, not an engineering blocker for building/unit-testing against a mocked adapter. The correct Contact↔Lead `associationTypeId` and `hs_lead_type`/`hs_lead_label` values are also unconfirmed against this live portal (`HS-016`/`HS-017`) — code should read these from Parameters/config, never hardcode a guessed value, so a wrong guess is a config fix, not a redeploy. `admin`-only RBAC, matching every other write surface — explicitly flagged in ADR-018 as a watch item for later, not reopened here. No Company association, no cached existing-lead reference — both explicitly out of scope (ADR-018).

**Scale/Scope**: Single-attendee generation is a one-off, deliberate staff action (no scale concern). Bulk generation is bounded by the same large-batch-confirmation threshold email dispatch already uses — no hard ceiling, a confirmation step above the threshold.

## Constitution Check

*GATE: Must pass before Phase 0 research is acted on. Re-checked after Phase 1 design.*

| Gate | Status | Notes |
| :--- | :--- | :--- |
| Security — RBAC | ✅ | `admin`-only, matching every other write — new routes registered in `Utils/Routes.ts`'s `ROUTE_TABLE` with `roles: ['admin']`, enforced by `RouteGuard.ts` unchanged |
| Security — new HubSpot write capability | ⏳ | **This is the first EMS write that creates a brand-new HubSpot CRM record**, not an association-label flip or catalog property update — flagged in ADR-018's Consequences as a bigger step than anything shipped so far. Standard security write-gate applies, but treat with the weight the ADR calls for, not as a routine extension |
| Security — provenance check is load-bearing | ⏳ | `LeadAdapter`'s "only update a Lead I can verify I created" check (ADR-018 decision #4) is a correctness-critical safety mechanism, not an edge case — get its test coverage right before anything else in this feature |
| API contract sync | ⏳ | New routes (`POST events/{evId}/attendees/{contactId}/lead`, `POST events/{evId}/attendees/lead-batch`) need `docs/api-contract.md` + `docs/rbac.md` entries — genuinely new routes this time, not an existing-route extension like `013` |
| Tests ship with behaviour | ⏳ | New Jest + Vitest suites required per quickstart.md §A |
| No invented HubSpot property names | ⏳ | `ems_lead_interest_summary`, the Contact↔Lead `associationTypeId`, and `hs_lead_type`/`hs_lead_label` values are all **unconfirmed against this live portal** (`HS-015`/`HS-016`/`HS-017`) — code must read the association type ID and label values from config/Parameters, never hardcode a guess, so this gate cannot fully close until those three HubSpot-side confirmations land |
| Audit on mutations | ⏳ | New `lead.generate` action (metadata: `eventId`, `contactId`, outcome — created/updated/new-due-to-non-EMS-provenance, whether expanded history was used; never the interest-summary text). New `attendee.registration_history.view_all` action for the expanded-history read, reusing ADR-014's precedent |
| Responsive layout | ✅ | New action button follows existing Attendee Detail modal / Attendee list responsive patterns — no new layout primitive |
| Deferred work in TODO.md | ✅ | `FE-LEAD-001`/`002`, `BE-LEAD-001`/`002` already track this; `X-LEAD-002`, `BE-LEAD-003` track what's deliberately out of scope |
| Vertical slice write gate | ⏳ | Schema **not yet verified against live HubSpot** (blocked on `HS-015`/`016`/`017`) — RBAC defined, audit planned, validation + rate limiting planned. This gate cannot fully close until the HubSpot-side confirmations land; code can still be built/tested against a mocked adapter in the meantime |
| Portable backend boundary (ADR-006) | ✅ | `LeadAdapter.ts` lives in `Utils/HubSpot/` (the one directory permitted to import `scripts/api/`, per ADR-005) — matches every existing HubSpot adapter's convention |
| Slice operator security QA | ⏳ | Required — this is the first EMS write creating a new HubSpot CRM record; §C in quickstart.md is mandatory before Live sign-off, with particular attention to the provenance check (never silently modify a non-EMS Lead) |

**Post-design re-check**: No constitution violations identified. The ⏳ gates are almost all delivery-phase actions gated on implementation and the three external HubSpot confirmations (`HS-015`/`016`/`017`) — not open design questions ADR-018 and its gap review left unresolved.

## Project Structure

### Documentation (this feature)

```text
specs/014-lead-generation/
├── plan.md                       # This file
├── research.md                   # Phase 0 — confirms HubSpot Leads API mechanics are sufficient to build against; resolves the large-batch-confirmation naming/reuse question
├── data-model.md                 # Phase 1 — Lead provenance/update model, API route contracts
├── contracts/
│   ├── post-attendee-lead.md            # Phase 1 — single-attendee route contract
│   └── post-attendee-lead-batch.md      # Phase 1 — bulk route contract
├── quickstart.md                 # Phase 1 — validation scenarios + required §C operator security checks
├── checklists/
│   └── requirements.md          # Spec quality (from /speckit-specify)
└── tasks.md                      # Phase 2 — via /speckit-tasks (not this command)
```

### Source Code (touch points)

```text
Backend/scripts/
  Utils/HubSpot/LeadAdapter.ts            # NEW — createOrUpdateLead(contactId, eventId, options): checks for an
                                          #   existing EMS-provenance-marked Lead via a live HubSpot query; creates
                                          #   (POST /crm/v3/objects/leads, hs_lead_name + fixed hs_lead_type/label +
                                          #   Contact association + ems_lead_interest_summary set once) or logs a
                                          #   Note on the existing one; never touches a Lead lacking the marker
  OnPostAttendeeLead.ts                   # NEW — POST events/{evId}/attendees/{contactId}/lead (single)
  OnPostAttendeeLeadBatch.ts               # NEW — POST events/{evId}/attendees/lead-batch (bulk; body:
                                          #   contactIds[], includeFullHistory?, batchConfirmed?)
  Utils/Routes.ts                          # Register both routes, roles: ['admin']
  Utils/Audit.ts                           # New lead.generate action; new attendee.registration_history.view_all
                                          #   action (expanded-history read, reusing ADR-014's audited-read pattern)
  Utils/DispatchValidation.ts              # Generalize the large-batch-confirmation shape (currently
                                          #   send-specific) for reuse by the bulk lead route — see research.md R-002
  Utils/Platform/types.ts                  # EmsConfig: HUBSPOT_LEAD_ASSOCIATION_TYPE_ID, HUBSPOT_LEAD_TYPE_VALUE,
                                          #   HUBSPOT_LEAD_LABEL_VALUE — read from Parameters, never hardcoded
                                          #   (blocked on HS-016/017 for real values; code ships reading config either way)

Backend/node/tests/
  LeadAdapter.test.ts                      # NEW — create path; update-via-Note path; provenance check's two
                                          #   branches (marked Lead → update, unmarked Lead → leave alone + create
                                          #   new); fixed classification value applied regardless of interest content
  OnPostAttendeeLead.test.ts               # NEW — RBAC, audit, no-recorded-interest still creates a Lead
  OnPostAttendeeLeadBatch.test.ts          # NEW — RBAC, audit, large-batch confirmation gate, per-attendee
                                          #   no-skip, mixed batch (some new/some update/some non-EMS-Lead cases)

Frontend/src/
  services/dataService.ts                 # New generateAttendeeLead(eventId, contactId, options) and
                                          #   generateAttendeeLeadsBatch(eventId, contactIds, options) methods
  components/AttendeeDetailModal.tsx       # EXTENDED — new "Generate Lead" action (admin-only, already the
                                          #   modal's gate), success/failure toast, expanded-history checkbox
  Attendee list component (existing multi-select surface)  # EXTENDED — new bulk "Generate Leads" action,
                                          #   large-batch confirmation dialog (reusing the email-dispatch pattern's
                                          #   UI shape, not its literal component if that's dispatch-specific)

Frontend/src/**/*.test.tsx
  AttendeeDetailModal.test.tsx (existing)  # EXTENDED — Generate Lead action, toast on success/failure
  Attendee list bulk-action test (new)     # Large-batch confirmation dialog, per-row outcome summary

Frontend/
  docs/api-contract.md                     # New routes documented (method, path, request/response, RBAC, errors)
  docs/rbac.md                              # New routes added to the admin-only matrix
```

**Structure decision**: Two genuinely new Backend routes and one new adapter — unlike `013`, this feature can't ride entirely on existing endpoints, since creating a new kind of HubSpot record needs its own write surface. Frontend adds one action to an existing modal and one bulk action to an existing list surface — no new view, no new top-level route.

## Delivery Phases

### Phase 0 — Confirm HubSpot Leads mechanics are sufficient (research, resolved below — see research.md)

ADR-018 already researched the live HubSpot Leads API (endpoint, required fields, association shape, scopes) before designing — Phase 0 confirms nothing further is needed technically, and resolves one implementation-level question ADR-018 didn't: how to generalize the existing large-batch-confirmation mechanism (built for email sends) for reuse here without renaming/breaking its existing callers.

### Phase A — Lead adapter (`BE-LEAD-001`)

1. `LeadAdapter.ts` — existing-lead lookup (live query, provenance check), create path, update-via-Note path, fixed classification.

### Phase B — Single-attendee route + UI (`FE-LEAD-001`)

1. `OnPostAttendeeLead.ts` + `Utils/Routes.ts` entry + audit actions.
2. `dataService.ts` method + `AttendeeDetailModal.tsx` action + toast.
3. `docs/api-contract.md` / `docs/rbac.md` entries.

### Phase C — Bulk route + UI (`FE-LEAD-002`/`BE-LEAD-002`)

1. Generalize `Utils/DispatchValidation.ts`'s large-batch-confirmation shape (research.md R-002).
2. `OnPostAttendeeLeadBatch.ts` + `Utils/Routes.ts` entry.
3. `dataService.ts` method + Attendee list bulk action + confirmation dialog.

### Phase D — Tests + quickstart sign-off

1. Backend + Frontend tests per quickstart.md §A.
2. Manual sign-off §B + §C (operator security comfort checks — first EMS write creating a new HubSpot CRM record; provenance-check verification is the centerpiece).

## Complexity Tracking

> No constitution violations requiring justification — the two new routes and one new adapter are the minimum surface needed to create a genuinely new kind of HubSpot record; ADR-018 already reasoned through and rejected the alternatives that would have added more (a cached existing-lead store, Company association, temperature differentiation).

| Risk | Mitigation |
| :--- | :--- |
| Building/testing against a HubSpot API this app has never called before, with scopes not yet granted | Build and unit-test `LeadAdapter.ts` against a mocked `HubSpotApiClient` (existing test convention for every other adapter) — not blocked on `HS-015` for code correctness, only for a real end-to-end smoke test. |
| The provenance check (never touch a non-EMS Lead) is the single most important correctness property in this feature | Dedicated test coverage for both branches (marked vs. unmarked) before any other `LeadAdapter` behavior is considered done — called out explicitly in this plan's Constitution Check, not left to incidental coverage. |
| Hardcoding a guessed `associationTypeId`/`hs_lead_type`/`hs_lead_label` value before `HS-016`/`017` confirm the real ones | Read all three from config/Parameters from day one (`Utils/Platform/types.ts`), never inline — a wrong guess becomes a config change, not a code change. |

## Phase 2

Run **`/speckit-tasks`** to generate `tasks.md` from this plan + spec.
