# Catalog API Contract (feature delta)

**Status**: Authoritative for **001-catalog-admin** implementation. Merge into [docs/api-contract.md](../../../docs/api-contract.md) and [docs/rbac.md](../../../docs/rbac.md) in the same change as handlers.

**Transport**: Generic Sync HTTP listener — flat URL path; logical route via `X-EMS-Route` header + `Authorization: Bearer <session>`.

---

## Routes

### `GET catalog`

**Roles**: All authenticated (`viewer`, `operator`, `communications`, `admin`).

**Query**:
| Param | Default | Notes |
| :--- | :--- | :--- |
| `includeArchived` | `false` | When `true`, **admin only** — returns archived Programs/Events |

**Response `200`**: See [data-model.md](../data-model.md) projection.

**Errors**:
| Status | code | When |
| :---: | :--- | :--- |
| 401 | `missing_session` / `invalid_session` / `session_expired` | No/invalid session |
| 403 | `forbidden` | `includeArchived=true` and caller not admin |

---

### `POST catalog/program`

**Roles**: **admin** only.

**Body**:
```json
{
  "name": "Atlassian Event 2026",
  "hubspotFormId": "hubspot-form-guid"
}
```

**Response `201`**:
```json
{
  "program": {
    "id": "uuid",
    "name": "Atlassian Event 2026",
    "hubspotFormId": "hubspot-form-guid",
    "archived": false,
    "createdAt": "2026-07-03T12:00:00.000Z",
    "updatedAt": "2026-07-03T12:00:00.000Z"
  }
}
```

**Errors**: `422 validation_error`, `409 duplicate_name`, `401`, `403`, `429`.

---

### `PATCH catalog/program/{id}`

**Roles**: **admin** only.

**Body** (partial):
```json
{
  "name": "Atlassian Event 2026 (updated)",
  "hubspotFormId": "new-form-guid",
  "archived": true
}
```

**Behaviour**:
- `archived: true` → cascade archive all Events under Program
- `archived: false` → unarchive Program and cascade-restore Events (see data model)

**Response `200`**: `{ "program": { … } }` (nested events **not** required on PATCH response; client may refetch GET catalog)

**Errors**: `404 not_found`, `409 duplicate_name`, `422`, `401`, `403`, `429`.

---

### `POST catalog/event`

**Roles**: **admin** only.

**Body**:
```json
{
  "programId": "program-uuid",
  "name": "Meeting Room",
  "partsAttendedOption": "Meeting Room"
}
```

**Response `201`**: `{ "event": { … } }`

**Errors**: `404` (unknown programId), `422`, `409` (duplicate name under Program), `401`, `403`, `429`.

---

### `PATCH catalog/event/{id}`

**Roles**: **admin** only.

**Body** (partial):
```json
{
  "name": "VIP Event",
  "partsAttendedOption": "VIP Event",
  "archived": false
}
```

**Constraints**:
- Cannot set `archived: false` if parent Program is archived or Event was cascade-archived (must unarchive Program first).
- Cannot change `programId`.

**Response `200`**: `{ "event": { … } }`

---

## RBAC matrix (delta)

| Route | Method | viewer | operator | communications | admin |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `catalog` | GET | Yes | Yes | Yes | Yes |
| `catalog?includeArchived=true` | GET | No | No | No | Yes |
| `catalog/program` | POST | No | No | No | Yes |
| `catalog/program/{id}` | PATCH | No | No | No | Yes |
| `catalog/event` | POST | No | No | No | Yes |
| `catalog/event/{id}` | PATCH | No | No | No | Yes |

---

## RouteGuard patterns (Backend)

Add to `ROUTE_ACCESS_RULES`:

```text
^catalog$                          GET     ALL_ROLES
^catalog/program$                   POST    admin
^catalog/program/[^/]+$            PATCH   admin
^catalog/event$                     POST    admin
^catalog/event/[^/]+$               PATCH   admin
```

`includeArchived` enforcement happens **inside** `OnGetCatalog` after session (admin check when query param true).

---

## Frontend `dataService` methods

| Method | Route | Mock |
| :--- | :--- | :--- |
| `fetchCatalog(options?)` | GET `catalog` | `MOCK_CATALOG` tree |
| `createProgram(body)` | POST `catalog/program` | append to mock |
| `updateProgram(id, body)` | PATCH `catalog/program/{id}` | mock mutate |
| `createEvent(body)` | POST `catalog/event` | mock append |
| `updateEvent(id, body)` | PATCH `catalog/event/{id}` | mock mutate |

Add `normalizeCatalogResponse` in `src/utils/normalizeApi.ts`.

---

## Error codes (catalog-specific)

| code | HTTP | Meaning |
| :--- | :---: | :--- |
| `duplicate_name` | 409 | Program name already exists |
| `duplicate_event_name` | 409 | Event name already exists under Program |
| `program_not_found` | 404 | Unknown programId |
| `event_not_found` | 404 | Unknown event id |
| `program_archived` | 422 | Cannot unarchive Event while Program archived |
| `validation_error` | 422 | Missing/invalid fields |
