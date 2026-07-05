# Research: Catalog Metadata & Modal Forms (002-catalog-metadata-modal)

**Date**: 2026-07-04  
**Feature**: [spec.md](./spec.md) · **Depends on**: [001-catalog-admin](../001-catalog-admin/research.md)

## 1. Metadata persistence (backward compatible extension)

**Decision**: Add optional metadata properties to existing `CatalogProgramRecord` and `CatalogEventRecord` objects in Record Storage (same keys as 001: `catalog-program-{id}`, `catalog-event-{id}`, index unchanged). Legacy records without these keys load unchanged; GET tree treats missing keys as unset.

**Rationale**: Spec FR-002 requires no migration. Optional JSON properties match EMS-until-HubSpot metadata model.

**Alternatives considered**:
- **Separate metadata sidecar keys** — rejected: complicates cascade/archive and PATCH merge.
- **HubSpot custom objects** — out of scope.

---

## 2. EMS field names and API shape

**Decision**: camelCase JSON on wire and in storage:

| Entity | New fields |
| :--- | :--- |
| Program | `description`, `startDate`, `endDate`, `location`, `timezone` |
| Event | `owner`, `description`, `date`, `location`, `capacity` |

**Rationale**: Matches existing 001 fields (`hubspotFormId`, `partsAttendedOption`) and Frontend `types.ts` conventions. Document as EMS catalog names for future HubSpot mapping — not live HubSpot API property names.

**Alternatives considered**:
- **snake_case** — rejected; breaks existing catalog contract style.

---

## 3. Date-only format

**Decision**: Store and transport calendar dates as **`YYYY-MM-DD`** strings (ISO 8601 date-only). UI uses `<input type="date">`. No time or timezone offset on date fields.

**Rationale**: Clarification session 2026-07-04 (Q1). Aligns with HTML date input and future HubSpot date property mapping.

**Alternatives considered**:
- **Full ISO datetime** — rejected by clarify.
- **Locale-dependent display strings in storage** — rejected; storage stays canonical `YYYY-MM-DD`.

---

## 4. Clear-on-save (PATCH semantics)

**Decision**:

| Operation | Empty optional metadata in modal | Stored result |
| :--- | :--- | :--- |
| **POST create** | Blank field | Property **omitted** from new record |
| **PATCH edit** | Blank field | Property **removed** from record (`null` in request body → delete key on save) |

Unmentioned keys on PATCH leave existing values unchanged (standard partial update).

**Rationale**: Clarification Q3 (FR-025). Explicit `null` on PATCH avoids ambiguity vs omit.

**Alternatives considered**:
- **Ignore empty on PATCH** — rejected; contradicts clear-on-save.
- **Per-field Clear button** — rejected by clarify.

---

## 5. Capacity and metadata “validation”

**Decision**:

- **Capacity**: Accept any **finite JSON number** on create/edit (decimals, zero, negative allowed). Reject non-numbers (`NaN`, strings) with `422 validation_error` only.
- **Text metadata**: Trim whitespace; empty-after-trim on create → omit; on edit → clear. Apply **generous max lengths** for storage safety (not business rules): description `4000`, other text fields `500`.
- **Dates**: If present, must match `YYYY-MM-DD` regex; invalid format → `422`.

**Rationale**: Spec FR-022 (no business validation on metadata) vs need to reject malformed types. Max lengths mirror ScriptRunner text limits without enforcing capacity ranges or date ordering.

**Alternatives considered**:
- **Integer-only capacity** — rejected by clarify Q4.
- **No max lengths** — rejected; unbounded multiline risk in Record Storage.

---

## 6. GET catalog tree projection

**Decision**: Extend `CatalogProgramTreeNode` and `CatalogEventTreeNode` in API responses to include **optional metadata fields** when set. Navigation pickers continue to render **name only** (Frontend component ignores extra fields).

**Rationale**: FR-023 admin tree display; FR-003 picker behaviour unchanged.

**Alternatives considered**:
- **Separate GET detail route** — rejected; unnecessary for staff-scale catalog.

---

## 7. Modal UX pattern

**Decision**:

- Replace inline create forms in `CatalogAdminView` with **`CatalogProgramModal`** and **`CatalogEventModal`** (separate components).
- Reuse existing global modal CSS (`modal-overlay`, `modal` from `ConfirmModal` pattern) — **form modals**, not `ConfirmProvider`.
- **Active tab only**: Create + Edit buttons; **Archived tab**: metadata read-only summary, unarchive only (no edit/create).
- **Event create**: Program `<select>` inside modal (clarify Q5). **Event edit**: parent Program shown read-only (not in PATCH body).

**Rationale**: Spec FR-014–FR-024 and clarify session. Minimal new styling; responsive stacked fields on narrow viewports.

**Alternatives considered**:
- **Single combined modal** — rejected (FR-015).
- **Per-Program “Add Event” without dropdown** — rejected by clarify Q5.

---

## 8. RBAC and routes

**Decision**: **No new routes**. Extend request/response bodies on existing `POST/PATCH catalog/program` and `POST/PATCH catalog/event`. RouteGuard unchanged from 001.

**Rationale**: Same admin-only mutation surface; reduces contract drift.

---

## 9. Audit

**Decision**: Continue existing audit actions (`catalog.program.create`, `catalog.program.update`, etc.) without before/after field diffs (BE-TECH-003 parked).

**Rationale**: 001 behaviour; metadata changes still logged as mutations.

---

## 10. Testing strategy

**Decision**:

| Layer | Focus |
| :--- | :--- |
| Backend Jest | Metadata round-trip create/PATCH, clear-on-save `null`, legacy record load, date format reject, GET tree includes metadata, 001 regression (cascade, uniqueness) |
| Frontend Vitest | Modal open/save/cancel, edit pre-fill, archived tab no edit button, XSS on description/owner, normalizer optional fields, picker still name-only |

**Rationale**: [ems-testing-discipline](../../.cursor/rules/ems-testing-discipline.mdc) — behaviour + XSS on new UI.

---

## 11. Documentation merge

**Decision**: Merge [contracts/catalog-api.md](./contracts/catalog-api.md) delta into `docs/api-contract.md` and `docs/rbac.md` in the **same implementation change** (no rbac matrix change expected).

**Rationale**: [ems-api-contract-discipline](../../.cursor/rules/ems-api-contract-discipline.mdc).
