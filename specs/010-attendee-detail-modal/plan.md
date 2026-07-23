# Implementation Plan: Attendee Detail Modal (Attendee Journey)

**Branch**: `010-attendee-detail-modal` | **Date**: 2026-07-17 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/010-attendee-detail-modal/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Add a read-only "Attendee Detail" modal, opened by clicking a row on the Registered Attendees screen. Default view shows Basic Information plus an Attendee Journey timeline scoped to the currently open Event; a "Show all communications" toggle expands it to include the attendee's communications from other Events and from HubSpot's full marketing-email engagement history, tagging anything not part of the current Event. Design and all edge cases were fully settled in a `/grill-with-docs` session before this plan — see [ADR-014](../../docs/decisions/014-attendee-communications-hubspot-engagement-pull.md) and `CONTEXT.md` § **Attendee journey** / **Attendee communications view**. This plan adds two new Backend routes and one new Frontend modal component against the existing Slice 1/2 architecture; no new technology choices.

## Technical Context

**Language/Version**: TypeScript (Frontend: TS 6 / React 19; Backend: TypeScript on ScriptRunner Connect's runtime)

**Primary Dependencies**: Frontend — React 19, `react-router-dom` 7 (hash routing), Vite 8. Backend — ScriptRunner Connect Managed APIs (HubSpot Contacts/CRM, Record Storage), the existing `Utils/HubSpot/` adapter layer ([ADR-005](../../docs/decisions/005-hubspot-adapter-layer.md)).

**Storage**: HubSpot (system of record — Contact properties, Contact engagement/timeline history) for read; Record Storage (session, dispatch/campaign records, audit log, per-registration cache) for EMS-owned state. No new storage technology.

**Testing**: Vitest (Frontend — component render tests, XSS-guard tests per `Frontend/CLAUDE.md`); Jest (Backend — handler unit tests + RBAC/audit coverage per `Backend/AGENTS_TESTING.md`).

**Target Platform**: Browser (staff EMS web UI, responsive mobile/tablet/desktop per `Frontend/CLAUDE.md`); Backend runs on ScriptRunner Connect (AWS-hosted).

**Project Type**: Web application — two-repo structure (`Frontend/`, `Backend/`) already established in this codebase; this feature adds to both, no new repo/project.

**Performance Goals**: Modal's default view (Basic Information + this-Event journey) follows the existing Doherty-threshold pattern — `LoadingState` shown immediately, perceived feedback target <400ms, matching every other async view in this app. "Show all communications" is an explicitly slower, on-demand secondary fetch (real HubSpot engagement-history round trip) — no hard latency target, but it must never block or delay the base modal's render.

**Constraints**: `admin`-only (reuses the existing Attendee list RBAC gate, no new role). No HubSpot secrets ever reach the browser (Backend-only HubSpot calls, per `Frontend/CLAUDE.md` security rules). All dynamic text (name, company, job title, dietary requirement, other-Event/dispatch names) renders via JSX only — no `dangerouslySetInnerHTML` (per FR-010 / existing XSS rule). The cross-Event/cross-context communications read is the first EMS surface exposing PII beyond the currently-open Event/Program, so it must be an **audited** read (unlike every other Slice 1/2 GET) — see [ADR-014](../../docs/decisions/014-attendee-communications-hubspot-engagement-pull.md).

**Scale/Scope**: One new Frontend modal component (plus its test file), two new Backend routes/handlers, one new HubSpot adapter method, one new audit action type. Single-Contact request scope — not a bulk/list operation. No new HubSpot custom objects or associations.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The constitution (`.specify/memory/constitution.md`) is an index pointing to the repo's real rule sources. Checked against each:

| Gate (source) | Status | Note |
| :--- | :---: | :--- |
| Frontend security — no secrets in browser, no auth bypass, XSS/CSP (`frontend-security.mdc`) | **PASS** | Read-only view over the existing Bearer-session auth; no new secrets; all dynamic text via JSX (FR-010); no CSP changes needed. |
| API-contract + RBAC sync on route changes (`ems-api-contract-discipline.mdc`) | **PASS (deferred to implementation)** | No route exists yet — `api-contract.md`/`rbac.md`/`RouteGuard.ts` updates are required *in the same change* as the Backend handlers land (tracked as `BE-ATTENDEE-DETAIL-001`), not before. |
| Testing discipline — new view/dataService method ships with tests, XSS guard (`ems-testing-discipline.mdc`) | **PASS (tracked)** | `FE-ATTENDEE-DETAIL-002` explicitly calls out hostile-string render tests for the new free-text fields. |
| TODO discipline — deferred work parked, not dropped (`ems-todo-discipline.mdc`) | **PASS** | Both real backend data gaps (no registration timestamp/source, no email-open tracking) already parked as `BE-ATTENDEE-DETAIL-002`/`003` in `Frontend/TODO.md`. |
| Backend security-governed write gate (`backend-security.mdc`) | **N/A** | Feature is entirely read-only (two new `GET` routes) — the write gate doesn't apply. The audit requirement on the communications route is the equivalent safeguard for its larger PII surface. |
| Backend handler order: session → RBAC → validate → rate limit → act → (audit) | **PASS (design decided)** | `GET events/{evId}/attendees/{contactId}` follows the existing unaudited-read pattern (like `GET events/{evId}/attendees`); `GET attendees/{contactId}/communications` adds an audit step, per [ADR-014](../../docs/decisions/014-attendee-communications-hubspot-engagement-pull.md). |
| UI stack / responsive / a11y rules (`frontend-patterns.mdc`, `frontend-responsive.mdc`) | **PASS** | Reuses existing modal conventions (`useModalFocusTrap`, `role="dialog"`, CSS modules + `tokens.css`) — no new UI library. |

No violations. **Complexity Tracking is not needed for this feature.**

## Project Structure

### Documentation (this feature)

```text
specs/010-attendee-detail-modal/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
├── assets/              # Reference screenshots (pending — see assets/README.md)
├── checklists/
│   └── requirements.md  # /speckit-specify output
└── tasks.md             # Phase 2 output (/speckit-tasks command — NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
# Option 2: Web application (frontend + backend, both already exist in this repo)

Backend/
├── scripts/
│   ├── OnGetAttendeeDetail.ts           # NEW — GET events/{evId}/attendees/{contactId}
│   ├── OnGetAttendeeCommunications.ts   # NEW — GET attendees/{contactId}/communications (audited)
│   └── Utils/
│       ├── Routes.ts                    # MODIFY — register the 2 new routes
│       ├── RouteGuard.ts                # MODIFY — admin-only RBAC rule for both
│       ├── Audit.ts                     # MODIFY — new `attendee.communications.view_all` action
│       └── HubSpot/
│           └── (adapter method)         # NEW — per-Contact engagement/timeline read (ADR-005 seam)
└── node/tests/
    ├── OnGetAttendeeDetail.test.ts       # NEW
    └── OnGetAttendeeCommunications.test.ts  # NEW — RBAC + audit coverage

Frontend/
├── src/
│   ├── components/
│   │   ├── AttendeeDetailModal.tsx          # NEW — modal component (Basic Info + journey + toggle)
│   │   ├── AttendeeDetailModal.module.css   # NEW
│   │   └── AttendeeDetailModal.test.tsx     # NEW — incl. XSS-guard tests (FE-ATTENDEE-DETAIL-002)
│   ├── views/
│   │   └── AttendeesView.tsx                # MODIFY — row click opens modal, excluding action-button cell
│   ├── services/
│   │   └── dataService.ts                   # MODIFY — fetchAttendeeDetail, fetchAttendeeCommunications
│   ├── utils/
│   │   └── normalizeApi.ts                  # MODIFY — normalize the 2 new response shapes
│   └── types/ (or wherever attendee types live)
│       └── (attendee detail / communication types)  # NEW/MODIFY
└── docs/
    ├── api-contract.md   # MODIFY — document the 2 new routes (same change as Backend handlers)
    └── rbac.md           # MODIFY — admin-only row for both new routes
```

**Structure Decision**: Reuses the existing two-repo Web application layout (`Backend/`, `Frontend/`) — no new project, package, or directory root. Backend follows the established `On*.ts` handler-per-route convention with shared logic in `Utils/`; Frontend follows the established modal-component convention (`ConfirmModal.tsx`, `CatalogEventModal.tsx`) plus the existing `dataService`/`normalizeApi` seam for all API access.

## Complexity Tracking

*Not applicable — no Constitution Check violations to justify.*
