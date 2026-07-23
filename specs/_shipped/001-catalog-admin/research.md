# Research: Catalog Admin (001-catalog-admin)

**Date**: 2026-07-03  
**Feature**: [spec.md](./spec.md)

## 1. Catalog persistence (Record Storage)

**Decision**: Store Programs and Events in ScriptRunner **Record Storage** at **workspace** scope under a `catalog/` key prefix. No HubSpot reads or writes for catalog CRUD.

**Rationale**: ADR-003 Plan C and [CONTEXT.md](../../CONTEXT.md) define the EMS catalog as staff-facing metadata until HubSpot custom objects exist. Catalog admin is not blocked on HubSpot property verification — only attendee/check-in writes are.

**Alternatives considered**:
- **Single JSON blob** (`catalog/tree`) — rejected: harder to audit per-entity changes and increases overwrite conflicts.
- **HubSpot custom objects** — deferred (Out of Scope); would require verified schema and broader scopes.

---

## 2. Entity key layout

**Decision**:

| Key | Value |
| :--- | :--- |
| `catalog/index` | `{ programIds: string[] }` — ordered list for stable GET tree |
| `catalog/program/{id}` | Program record (see [data-model.md](./data-model.md)) |
| `catalog/event/{id}` | Event record with `programId` |

Program and Event ids are **UUID v4** from `Backend/scripts/Utils/Ids.ts` (`generateUuid()`).

**Rationale**: Matches existing EMS patterns (sessions/audit in Record Storage), supports per-entity audit and PATCH without loading the full tree.

**Alternatives considered**:
- **ULID** — not in verified third-party list for this workspace; UUID already used in Foundation.

---

## 3. Archive cascade and unarchive restore

**Decision**: When a Program is archived, set `archived: true` on the Program and on **every active Event** under it. Set `archivedViaProgramId: programId` on Events archived by cascade (null when archived individually). Unarchiving a Program sets `archived: false` on the Program and on all Events where `archivedViaProgramId === programId`, then clears that field. Individual Event unarchive clears `archived` only when `archivedViaProgramId` is null (parent Program still active).

**Rationale**: Implements spec clarifications (cascade archive + restore on Program unarchive) without deleting data.

**Alternatives considered**:
- **Implicit cascade at read time** — rejected: Events would appear active while parent Program archived.
- **Block Program archive until Events archived** — rejected by user in `/speckit-clarify`.

---

## 4. Program name uniqueness

**Decision**: Enforce **case-insensitive trimmed** uniqueness on Program `name` across **all** Programs (active and archived) at save time. Return `409` / `duplicate_name` on conflict.

**Rationale**: Spec clarification Q3. Small catalog size makes scan-on-write acceptable.

**Alternatives considered**:
- **Warn-only** — rejected by user.
- **Unique among active only** — rejected; archived names still reserved.

---

## 5. RBAC: read vs mutate (contract alignment)

**Decision**: Align implementation with **spec** (post-clarify), updating provisional docs in the same change:

| Route | Method | Roles |
| :--- | :---: | :--- |
| `catalog` | GET (active tree) | **All authenticated** (`viewer`, `operator`, `communications`, `admin`) |
| `catalog?includeArchived=true` | GET | **admin** only |
| `catalog/program` | POST | **admin** only |
| `catalog/program/{id}` | PATCH | **admin** only |
| `catalog/event` | POST | **admin** only |
| `catalog/event/{id}` | PATCH | **admin** only |

**Rationale**: Spec FR-009 requires non-admins to use the same navigation pickers (read active catalog). Provisional [rbac.md](../../docs/rbac.md) row `catalog GET → admin only` predates clarify Q5 and must be updated.

**Alternatives considered**:
- **Keep admin-only GET** — rejected; contradicts accepted spec.

---

## 6. Archived catalog visibility (API)

**Decision**: Default `GET catalog` returns **active only** (no archived Programs/Events). Admin archived admin view uses `GET catalog?includeArchived=true` (admin RBAC). No “show archived” toggle on navigation pickers (frontend uses default GET only).

**Rationale**: Spec clarification Q4. Query param already sketched in [api-contract.md](../../docs/api-contract.md); restrict `includeArchived` to admin.

---

## 7. Backend handler structure

**Decision**: Add focused handlers under `Backend/scripts/`:

- `OnGetCatalog.ts` — GET tree assembly
- `OnPostCatalogProgram.ts` / `OnPatchCatalogProgram.ts`
- `OnPostCatalogEvent.ts` / `OnPatchCatalogEvent.ts`
- `Utils/Catalog.ts` — load/save, validation, cascade archive/unarchive, name uniqueness

Register routes in `OnHttpRouter.ts`; rules in `RouteGuard.ts`. Handler order: **session → RBAC → validate → rate limit → act → audit** (mutations).

**Rationale**: Matches [backend-code-quality](../../.cursor/rules/) one-route-per-file pattern and existing `OnAuthExchange` flow.

---

## 8. Audit for catalog mutations

**Decision**: Audit all catalog **POST/PATCH** with actions `catalog.program.create`, `catalog.program.update`, `catalog.event.create`, `catalog.event.update`; `resourceType` `catalog_program` / `catalog_event`; metadata includes `programId`, `archived` transitions, no full PII.

**Rationale**: Spec FR-006–008 + blueprint audit requirements for mutations. GET catalog is not audited.

---

## 9. Frontend catalog context and routing

**Decision**:

1. **Global catalog context** in React state (extend `appState` or dedicated `catalogContext`) holding `programId` + `evId` (catalog Event id, distinct from legacy mock `eventId` until routes migrate).
2. **Program/Event pickers** in `AppLayout` or `Sidebar` — all roles; load via `fetchCatalog()` (active only).
3. **Catalog admin UI** — new view(s) under Settings or top-level `#/catalog` (admin-only UI gate + backend 403). Includes active list, create/edit forms, and **archived** tab calling `fetchCatalog({ includeArchived: true })`.
4. **Hash routes** evolve toward `#/programs/:programId/events/:evId/...` for Slice 1 modules; initial catalog feature may introduce pickers + admin screens before full route migration (document in tasks).

**Rationale**: Spec P1 navigation + P2 admin; existing `#/events/:eventId` is legacy PoC — catalog ids become source of truth for Slice 1.

**Alternatives considered**:
- **Settings-only pickers** — rejected; all roles need pickers outside admin screens.

---

## 10. Testing strategy

**Decision**:

| Layer | Tool | Focus |
| :--- | :--- | :--- |
| Backend | Jest (`node/tests/`) | Catalog utils, each route (200/401/403/404/409/422), cascade archive/unarchive, name uniqueness, RBAC split on GET |
| Frontend | Vitest | `normalizeCatalog` mapping, picker + admin view render, XSS on dynamic names, role-gated admin actions hidden for viewer |

**Rationale**: [ems-testing-discipline](../../../.cursor/rules/ems-testing-discipline.mdc) — behaviour ships with tests; mock API switch in `dataService.ts` until backend deployed.

---

## 11. Rate limiting

**Decision**: Apply existing `enforceRateLimit` to catalog **mutations** (e.g. bucket `catalog-mutate` per session email). GET catalog uses default read path (no extra limit beyond platform).

**Rationale**: Consistent with auth exchange pattern; catalog writes are low volume but admin-only mutations should not bypass rate limit infrastructure.

---

## Resolved NEEDS CLARIFICATION

All technical unknowns from planning are resolved above. No blocking NEEDS CLARIFICATION items remain for `/speckit-tasks`.
