# Implementation Plan: Catalog Metadata & Modal Forms

**Branch**: `002-catalog-metadata-modal` | **Date**: 2026-07-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-catalog-metadata-modal/spec.md`

## Summary

Extend **001-catalog-admin** with optional **EMS catalog metadata** on Programs (description, start/end dates, location, timezone) and Events (owner, description, date, location, capacity) stored in **Record Storage** — no HubSpot mapping. Replace catalog admin **inline create forms** with **Program** and **Event modals** (create + edit on **active tab only**; archived tab read-only + unarchive). Backward compatible with existing records; pickers and archive/cascade unchanged.

## Technical Context

**Language/Version**: TypeScript — ScriptRunner Connect ECMAScript 2020 + Node 20 (Jest); React 19 + Vite (Frontend)

**Primary Dependencies**: `@sr-connect/record-storage`; existing `Utils/Catalog.ts` and catalog handlers from 001; Frontend `ConfirmModal` CSS pattern, `dataService`, Vitest

**Storage**: Record Storage workspace scope — same keys as 001 (`catalog-index`, `catalog-program-{id}`, `catalog-event-{id}`); optional metadata properties on existing records

**Testing**: Backend Jest (`Catalog.test.ts`, `CatalogRoutes.test.ts`); Frontend Vitest (modals, admin view, normalizer, picker regression)

**Target Platform**: ScriptRunner Connect + GitHub Pages

**Project Type**: Dual-repo vertical extension (Backend API body/projection + Frontend admin UX)

**Performance Goals**: Same as 001 — staff-scale catalog; no pagination

**Constraints**: Edit only `Backend/scripts/` + `node/`; no new routes; handler order unchanged; XSS via JSX; responsive modals; deploy Backend SFTP / Frontend Git

**Scale/Scope**: Extend 5 existing handlers/util module; 2 new modal components; refactor `CatalogAdminView`; no RouteGuard changes

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Source | Status |
| :--- | :--- | :--- |
| Security — no secrets in frontend | [frontend-security.mdc](../../.cursor/rules/frontend-security.mdc) | ✅ Pass |
| Security — handler order + RBAC | [backend-security.mdc](../../../Backend/.cursor/rules/backend-security.mdc) | ✅ Pass — same routes, admin-only mutations |
| Security — no HubSpot write | [backend-security.mdc](../../../Backend/.cursor/rules/backend-security.mdc) | ✅ Pass — Record Storage metadata only |
| XSS — metadata via JSX | [frontend-security.mdc](../../.cursor/rules/frontend-security.mdc) | ✅ Pass — Vitest hostile strings on new modals + tree |
| Responsive UI | [frontend-responsive.mdc](../../.cursor/rules/frontend-responsive.mdc) | ✅ Pass — modal layout mobile/tablet/desktop |
| Tests ship with behaviour | [ems-testing-discipline](../../.cursor/rules/ems-testing-discipline.mdc) | ✅ Pass |
| Contract sync | [ems-api-contract-discipline](../../.cursor/rules/ems-api-contract-discipline.mdc) | ✅ Pass — [contracts/catalog-api.md](./contracts/catalog-api.md) |
| Read-first / EMS metadata | [spec.md](./spec.md), [CONTEXT.md](../../CONTEXT.md) | ✅ Pass |
| Deploy paths | [constitution.md](../../.specify/memory/constitution.md) | ✅ Pass |

**Post-design re-check**: No new routes; RBAC matrix unchanged; constitution satisfied.

## Project Structure

### Documentation (this feature)

```text
specs/002-catalog-metadata-modal/
├── plan.md              # This file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1 validation
├── contracts/
│   └── catalog-api.md   # Phase 1 API delta
├── spec.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 — 36 tasks (T001–T036)
```

### Source Code (repository root)

```text
Backend/
├── scripts/
│   └── Utils/
│       ├── Catalog.ts            # metadata merge, clear-on-save, tree projection
│       └── Types.ts              # extended record + body types
└── node/tests/
    └── Catalog.test.ts           # extend metadata + legacy cases

Frontend/
├── src/
│   ├── components/
│   │   ├── CatalogProgramModal.tsx
│   │   └── CatalogEventModal.tsx
│   ├── views/
│   │   └── CatalogAdminView.tsx  # modals; remove inline forms; metadata display
│   ├── services/dataService.ts   # extended body types
│   ├── utils/normalizeApi.ts
│   ├── data/mockData.ts
│   └── types.ts                  # optional metadata on CatalogProgram/Event
└── docs/api-contract.md          # merge contract delta (same change)
```

**Structure Decision**: **Backend-first** — extend `Catalog.ts` and tests so live API accepts metadata before modal UI. Frontend modals consume existing `createProgram` / `updateProgram` / `createEvent` / `updateEvent`. **Do not change** `CatalogPickers.tsx` display logic (name only).

## Complexity Tracking

> No constitution violations requiring justification.

| Violation | Why Needed | Simpler Alternative Rejected Because |
| :--- | :--- | :--- |
| — | — | — |

---

## Phase 0: Research

**Output**: [research.md](./research.md)

Resolved:

- EMS field names and `YYYY-MM-DD` dates
- PATCH `null` clear-on-save semantics
- Capacity: finite number only, no range validation
- GET tree includes metadata; pickers unchanged
- Modal pattern and active/archived tab rules
- No new routes or RBAC rows

All NEEDS CLARIFICATION items resolved (via spec clarify session + research).

---

## Phase 1: Design & Contracts

**Outputs**:

- [data-model.md](./data-model.md)
- [contracts/catalog-api.md](./contracts/catalog-api.md)
- [quickstart.md](./quickstart.md)

### Implementation sequence (from [tasks.md](./tasks.md))

1. **Backend — Types.ts** — extend records, tree nodes, create/patch bodies
2. **Backend — Catalog.ts** — metadata normalize/validate helpers; merge on create/update; `toTreeNode` projection; clear-on-save
3. **Backend — tests** — metadata CRUD, null clear, legacy load, date/capacity type errors, 001 regressions
4. **Docs** — merge [contracts/catalog-api.md](./contracts/catalog-api.md) into `docs/api-contract.md`
5. **Frontend — types.ts + normalizeApi.ts + mockData.ts** — optional metadata passthrough
6. **Frontend — CatalogProgramModal.tsx + CatalogEventModal.tsx** — create/edit modes; Event Program dropdown on create only
7. **Frontend — CatalogAdminView.tsx** — remove inline forms; active-tab Create/Edit; archived read-only; metadata summary in tree
8. **Frontend — Vitest** — modals, clear-on-save, archived gating, XSS, picker regression
9. **Validation** — [quickstart.md](./quickstart.md)

### Agent context

No `.specify` agent-context update script in this repo; domain context in [CONTEXT.md](../../CONTEXT.md) and [spec clarifications](./spec.md#clarifications).

---

## Phase 2: Tasks

**Output**: [tasks.md](./tasks.md) — **36 tasks** (T001–T036). Next: **`/speckit-implement`** or execute tasks manually.

---

## Risks & mitigations

| Risk | Mitigation |
| :--- | :--- |
| PATCH partial update vs clear-on-save confusion | Document `null` contract; tests for omit vs null |
| Legacy records missing keys | Load treats undefined as unset; quickstart §7 |
| Modal accessibility | `role="dialog"`, `aria-modal`, focus trap minimal (match ConfirmModal) |
| Description XSS | JSX text only; Vitest hostile payloads |
| Concurrent admin edits | Last-write-wins (same as 001) |

---

## Success mapping

| Spec criterion | Validation |
| :--- | :--- |
| SC-001 | Quickstart §3 |
| SC-002 | Quickstart §4 |
| SC-003 | Quickstart §5 |
| SC-004 | Quickstart §7 |
| SC-005 | Quickstart §9 |
| SC-006 | Quickstart §11 |
