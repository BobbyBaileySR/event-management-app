# Implementation Plan: Email Dispatch (Slice 2)

> Historical implementation plan. Runtime mock-data, catalog-picker, tabbed-UI, and Program-scoped route details were superseded by the mock-free event-first unified-list design; use the current spec/quickstart and authoritative docs for live behaviour.

**Branch**: `005-email-dispatch` | **Date**: 2026-07-07 | **Spec**: [spec.md](./spec.md)

**Input**: `/speckit-plan Slice 2` — HubSpot template dispatch for Program + Event; send now + schedule; dispatch log; admin-only.

## Summary

Deliver **Slice 2 Email dispatch** under catalog context (`#/events/email`): **Compose | Scheduled | Dispatch log** tabs; audiences from **Registered attendees** (filters + fixed manual selection) or **HubSpot CRM segments**; **async queue** with 15-minute scheduler; **dispatch log** with per-Contact **sent** rows; **attendee list filter** by past dispatch. HubSpot owns templates; EMS owns job state in **Record Storage**.

**Build order**: HubSpot spike → backend store + routes + `QueueProcessor` → contract/RBAC merge → frontend route refactor + `EmailDispatchView` → extend Attendees filter → mock layer → tests → quickstart sign-off.

**Blocked on live send until** HubSpot API spike ([research.md](./research.md) R-003) passes on UAT.

## Technical Context

**Language/Version**: TypeScript — ScriptRunner Connect ECMAScript 2020 + Node 20 (Jest); React 19 + Vite (Frontend)

**Primary Dependencies**: `RegistrationAdapter` (attendee audience resolution); existing catalog/attendees routes; HubSpot Managed API (templates, lists/segments, single-send — spike); Record Storage; `OnHttpRouter` + `RouteGuard`; `enforceRateLimit`

**Storage**: Record Storage — `EmailDispatchJob` + `DispatchRecipientRow` + per-Event indexes (see [data-model.md](./data-model.md))

**Testing**: Backend `EmailDispatchRoutes.test.ts`, `DispatchQueue.test.ts`; Frontend Vitest for Email tabs, limits, attendee dispatch filter, XSS

**Target Platform**: ScriptRunner Connect + GitHub Pages (UAT)

**Constraints**: Admin-only; no template builder; no HubSpot tokens in browser; 15-min schedule grid; idempotent create; rate limit visible on Compose; legacy `#/events/{id}/email` retired

## Constitution Check

*GATE: Must pass before implementation. Re-checked after Phase 1 design.*

| Gate | Status | Notes |
| :--- | :--- | :--- |
| Security — no secrets in frontend | ✅ | HubSpot via ScriptRunner only (NFR-001) |
| Security — XSS / CSP | ✅ | Plain-text render; no new `dangerouslySetInnerHTML` |
| Security — RBAC admin on slice surfaces | ✅ | All new routes `admin` only (override legacy communications rules) |
| API contract + RBAC sync | ⏳ | Merge [contracts/email-api.md](./contracts/email-api.md) → `docs/api-contract.md` + `docs/rbac.md` |
| Tests ship with behaviour | ⏳ | Route + queue + view Vitest required |
| No invented HubSpot property names | ✅ | Templates/segments via HubSpot APIs only |
| Audit on mutations | ✅ | create/update/cancel/complete (FR-015) |
| Responsive layout | ✅ | Tabs + tables per `frontend-responsive.mdc` |
| Deferred work in TODO.md | ⏳ | HubSpot spike failure → park in Backend TODO |
| Vertical slice write gate | ⏳ | Spike + RBAC + audit before live HubSpot send |

**Post-design re-check**: ✅ No constitution violations. Additive slice on 003; replaces legacy mock Email route.

## Project Structure

### Documentation (this feature)

```text
specs/005-email-dispatch/
├── plan.md                      # This file
├── research.md                  # Phase 0 — queue, HubSpot send, navigation
├── data-model.md                # Phase 1 — EmailDispatchJob, audience, recipients
├── contracts/
│   └── email-api.md             # Phase 1 — catalog-scoped email routes
├── quickstart.md                # Phase 1 — validation scenarios
├── checklists/
│   └── requirements.md          # Spec quality (from /speckit-specify)
└── tasks.md                     # Phase 2 — via /speckit-tasks (not this command)
```

### Source Code (touch points)

```text
Backend/scripts/
  Utils/DispatchStore.ts         # Record Storage CRUD + indexes (new)
  Utils/DispatchAudience.ts      # Resolve attendee/segment → contact ids (new)
  Utils/DispatchQueue.ts         # Claim, process, status transitions (new)
  Utils/HubSpot/EmailTemplatesAdapter.ts   (new)
  Utils/HubSpot/SegmentsAdapter.ts         (new)
  Utils/HubSpot/SingleSendAdapter.ts         (new — post-spike)
  OnGetEmailLimits.ts
  OnGetEmailTemplates.ts
  OnGetEmailSegments.ts
  OnPostEmailPreview.ts
  OnPostEmailDispatch.ts         # create send now / schedule
  OnGetEmailDispatches.ts        # scheduled + log views
  OnGetEmailDispatchDetail.ts
  OnPatchEmailDispatch.ts
  OnDeleteEmailDispatch.ts
  QueueProcessor.ts              # Scheduled trigger */15
  OnHttpRouter.ts                # wire routes
  Utils/RouteGuard.ts            # programs/.../email/* admin-only
  OnGetAttendees.ts              # extend dispatchFilter query

Backend/node/tests/
  EmailDispatchRoutes.test.ts
  DispatchQueue.test.ts

Frontend/src/
  router/navigation.ts           # sliceModulePath('email')
  App.tsx                        # /events/email route
  views/EmailDispatchView.tsx    # replaces catalog-mismatched EmailView
  views/EmailDispatchView.module.css
  views/AttendeesView.tsx        # dispatch received/not filter UI
  services/dataService.ts        # catalog-scoped email methods
  types.ts                       # dispatch DTOs
  data/mockData.ts               # mock dispatches + limits
  config.ts                      # thresholds (existing)
  components/Sidebar.tsx         # admin Email link when catalog set
```

**Structure decision**: Single catalog-scoped Email view with tabs — no separate routes per tab (research R-010).

## Delivery Phases

### Phase 0 — HubSpot spike (blocking live)

1. Confirm private app scopes for marketing email read + list membership + single-send.
2. Prove template list + segment list + send to one test Contact on UAT.
3. Document chosen send path in `research.md` (update R-003 status) and Backend CHANGELOG.

### Phase A — Backend core

1. `DispatchStore` + types mirroring [data-model.md](./data-model.md).
2. Read routes: limits, templates, segments.
3. `POST preview` — audience resolver count-only.
4. `POST dispatches` — create with idempotency + hourly rate limit + audit.
5. `GET/PATCH/DELETE dispatches` — scheduled list + lock rules.
6. `QueueProcessor` — claim, send, recipient rows, complete/fail.
7. Extend `GET attendees` with `dispatchId` + `dispatchFilter`.
8. RouteGuard: **`admin` only** for all `programs/.../email/` routes.

### Phase B — Contract + RBAC docs

1. Merge [contracts/email-api.md](./contracts/email-api.md) into `Frontend/docs/api-contract.md` (new Slice 2 section; deprecate flat `events/{id}/email/*`).
2. Update `Frontend/docs/rbac.md` — admin for new routes.
3. Update `Frontend/docs/ui-routes.md` — `#/events/email`, retire legacy email route.

### Phase C — Frontend Email module

1. `sliceModulePath('email')`, App route, sidebar admin gate.
2. `EmailDispatchView` — Compose (limits, template, audience, send/schedule), Scheduled table (edit/cancel/warning), Log table + detail panel.
3. Retire or redirect legacy `#/events/:eventId/email`.
4. `dataService` + mock parity.

### Phase D — Attendees filter (US4)

1. Dispatch filter dropdown on Attendees (received / not received + dispatch picker).
2. Wire query params to extended attendees API.

### Phase E — Tests + quickstart

1. Backend + Frontend tests per [quickstart.md](./quickstart.md) §A.
2. Manual sign-off §B on UAT after spike.

## Complexity Tracking

> No constitution violations requiring justification.

| Risk | Mitigation |
| :--- | :--- |
| HubSpot bulk send API uncertainty | Phase 0 spike; per-contact queue fallback (R-003) |
| ScriptRunner timeout on large sends | Async queue (R-005); never sync-send full audience in HTTP handler |
| Legacy EmailView / flat event routes | Explicit removal in Phase C; Out of Scope in spec |

## Phase 2

Run **`/speckit-tasks`** to generate `tasks.md` from this plan + spec.
