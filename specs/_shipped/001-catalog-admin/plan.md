# Implementation Plan: Catalog Admin

**Branch**: `001-catalog-admin` | **Date**: 2026-07-03 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/_shipped/001-catalog-admin/spec.md`

## Summary

Deliver **Program → Event** catalog administration for Slice 1: admins create/edit/archive/unarchive Programs (HubSpot form ID) and Events (Parts Attended option) stored in **Record Storage**; all authenticated roles select active Program + Event from shared navigation pickers. Backend handlers and RBAC land first; Frontend pickers + admin UI consume `GET/POST/PATCH catalog/*`. No HubSpot writes — catalog is EMS metadata only.

## Technical Context

**Language/Version**: TypeScript (ScriptRunner Connect ECMAScript 2020 runtime + Node 20 for Jest); React 19 + Vite (Frontend)

**Primary Dependencies**: `@sr-connect/record-storage`, existing EMS Foundation (`Auth`, `RouteGuard`, `Audit`, `RateLimit`); Frontend `react-router`, existing `dataService` / `apiRequest` pattern

**Storage**: ScriptRunner Record Storage — workspace scope, keys `catalog/index`, `catalog/program/{id}`, `catalog/event/{id}`

**Testing**: Backend Jest (`node/tests/`); Frontend Vitest (render + XSS + normalizer)

**Target Platform**: ScriptRunner Connect (production) + GitHub Pages (Frontend)

**Project Type**: Dual-repo web app (Frontend UI + Backend Generic Sync HTTP API)

**Performance Goals**: Catalog GET < 500ms for ≤ 50 Programs × 20 Events (staff-scale); no pagination required in Slice 1

**Constraints**: Edit only `Backend/scripts/` + `node/`; no HubSpot tokens in browser; handler order session → RBAC → validate → rate limit → act → audit; deploy Backend SFTP / Frontend Git

**Scale/Scope**: ~5–20 Programs, ~3–10 Events each; admin-only mutations; 2 new Backend handler groups + 1 util module; Frontend pickers + catalog admin view(s)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Source | Status |
| :--- | :--- | :--- |
| Security — no secrets in frontend | [frontend-security.mdc](../../.cursor/rules/frontend-security.mdc) | ✅ Pass — catalog is metadata only; session Bearer only |
| Security — handler order + RBAC deny default | [backend-security.mdc](../../../Backend/.cursor/rules/backend-security.mdc) | ✅ Pass — RouteGuard rules + mutation audit |
| Security — no HubSpot write until slice gate | [backend-security.mdc](../../../Backend/.cursor/rules/backend-security.mdc) | ✅ Pass — Record Storage only; no HubSpot API |
| XSS — dynamic catalog names via JSX | [frontend-security.mdc](../../.cursor/rules/frontend-security.mdc) | ✅ Pass — Vitest XSS cases required |
| Responsive UI | [frontend-responsive.mdc](../../.cursor/rules/frontend-responsive.mdc) | ✅ Pass — pickers + admin forms mobile/tablet/desktop |
| Tests ship with behaviour | [ems-testing-discipline](../../../.cursor/rules/ems-testing-discipline.mdc) | ✅ Pass — plan includes Jest + Vitest scope |
| Contract + RBAC sync | [ems-api-contract-discipline](../../../.cursor/rules/ems-api-contract-discipline.mdc) | ✅ Pass — [contracts/catalog-api.md](./contracts/catalog-api.md) delta merges into `docs/api-contract.md` + `docs/rbac.md` + `RouteGuard.ts` in same change |
| Domain language — 2-level catalog | [CONTEXT.md](../../CONTEXT.md), [spec clarifications](./spec.md#clarifications) | ✅ Pass |
| Deploy paths | [constitution.md](../../.specify/memory/constitution.md) | ✅ Pass — SFTP scripts / Git frontend |

**Post-design re-check**: RBAC delta (GET catalog all roles) documented in research §5 and contract delta — no constitution violations.

## Project Structure

### Documentation (this feature)

```text
specs/_shipped/001-catalog-admin/
├── plan.md              # This file
├── research.md          # Phase 0 — decisions
├── data-model.md        # Phase 1 — entities + storage
├── quickstart.md        # Phase 1 — validation guide
├── contracts/
│   └── catalog-api.md   # Phase 1 — API/RBAC delta
├── spec.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 — /speckit-tasks (not yet created)
```

### Source Code (repository root)

```text
Backend/
├── scripts/
│   ├── OnHttpRouter.ts           # register catalog routes
│   ├── OnGetCatalog.ts
│   ├── OnPostCatalogProgram.ts
│   ├── OnPatchCatalogProgram.ts
│   ├── OnPostCatalogEvent.ts
│   ├── OnPatchCatalogEvent.ts
│   └── Utils/
│       ├── Catalog.ts            # storage, validation, cascade
│       ├── RouteGuard.ts         # catalog rules
│       └── Audit.ts              # catalog.* audit actions
└── node/tests/
    ├── Catalog.test.ts
    └── CatalogRoutes.test.ts     # or extend Http.test.ts

Frontend/
├── src/
│   ├── services/dataService.ts   # fetchCatalog, create/update *
│   ├── utils/normalizeApi.ts     # normalizeCatalogResponse
│   ├── state/                    # catalog selection context
│   ├── components/
│   │   ├── CatalogPickers.tsx    # Program + Event (all roles)
│   │   └── AppLayout.tsx / Sidebar.tsx  # integrate pickers
│   └── views/
│       ├── CatalogAdminView.tsx  # admin CRUD + archived tab
│       └── CatalogAdminView.test.tsx
└── docs/                         # api-contract.md, rbac.md updates (gitignored locally)
```

**Structure Decision**: Dual-repo vertical slice — **Backend catalog API first** (unblocks live `USE_MOCK_API: false` for catalog only), then Frontend pickers and admin UI. Legacy `#/events/:eventId` mock routes remain until attendee/check-in slice migrates to `programs/{programId}/events/{evId}` paths.

## Complexity Tracking

> No constitution violations requiring justification.

| Violation | Why Needed | Simpler Alternative Rejected Because |
| :--- | :--- | :--- |
| — | — | — |

---

## Phase 0: Research

**Output**: [research.md](./research.md)

Key decisions:
- Record Storage key layout and UUID ids
- Cascade archive / Program unarchive restore via `archivedViaProgramId`
- Program name global uniqueness
- **RBAC split**: GET catalog all roles; `includeArchived` admin-only
- Handler file layout and audit action names

All NEEDS CLARIFICATION items resolved.

---

## Phase 1: Design & Contracts

**Outputs**:
- [data-model.md](./data-model.md)
- [contracts/catalog-api.md](./contracts/catalog-api.md)
- [quickstart.md](./quickstart.md)

### Implementation sequence (for `/speckit-tasks`)

1. **Backend — Utils/Catalog.ts** — CRUD, validation, cascade, name checks
2. **Backend — handlers** — GET/POST/PATCH routes + audit + rate limit on mutations
3. **Backend — RouteGuard + OnHttpRouter** — register routes; tests in `node/tests/`
4. **Docs** — merge contract delta into `docs/api-contract.md`, `docs/rbac.md`
5. **Frontend — dataService + normalizeApi + mock catalog data**
6. **Frontend — CatalogPickers** in layout (all roles)
7. **Frontend — CatalogAdminView** (admin-only) with active + archived sections
8. **Frontend — Vitest** render/XSS/role gating
9. **Validation** — follow [quickstart.md](./quickstart.md)

### Agent context

No `.specify` agent-context update script present in this repo; domain context lives in [CONTEXT.md](../../CONTEXT.md) and spec clarifications (already current).

---

## Phase 2: Tasks (next command)

Run **`/speckit-tasks`** to generate [tasks.md](./tasks.md) with dependency-ordered work items for implement.

---

## Risks & mitigations

| Risk | Mitigation |
| :--- | :--- |
| Provisional rbac said catalog GET admin-only | Update rbac + RouteGuard per research §5 in same PR |
| Legacy frontend routes use mock `eventId` | Introduce catalog context state; full route migration deferred to attendee slice |
| Concurrent admin edits | Last-write-wins acceptable at staff scale; note in tasks if optimistic locking needed later |
| Wrong HubSpot form/option ids | Admin can edit; live verification out of scope (spec assumption) |

---

## Success mapping

| Spec criterion | Validation |
| :--- | :--- |
| SC-001 | Quickstart §3 — create Program + Event < 5 min |
| SC-002 | Quickstart §4 — viewer 403 on mutations |
| SC-003 | Quickstart §5–6 — archived absent from pickers |
| SC-004 | Quickstart §5 — archived view retains metadata |
| SC-006 | Quickstart §5–6 — unarchive restores pickers |
