# Data Model: Catalog Admin

**Feature**: 001-catalog-admin  
**Storage**: ScriptRunner Record Storage (workspace scope)  
**HubSpot**: No catalog entities in HubSpot for this feature — metadata only

---

## Overview

Two-level hierarchy: **Program → Event**. No iteration layer.

```text
Program (1) ──< Event (N)
```

---

## Program

| Field | Type | Required | Notes |
| :--- | :--- | :---: | :--- |
| `id` | string (UUID v4) | ✓ | Server-generated on create |
| `name` | string | ✓ | Display name; **unique** (case-insensitive, trimmed) across all Programs |
| `hubspotFormId` | string | ✓ | HubSpot registration form id for this Program |
| `archived` | boolean | ✓ | Default `false` |
| `createdAt` | string (ISO 8601) | ✓ | Set on create |
| `updatedAt` | string (ISO 8601) | ✓ | Set on every update |

**Validation**:
- `name`: non-empty after trim, max 200 chars (reasonable UI limit)
- `hubspotFormId`: non-empty after trim, max 64 chars (opaque id string)

**State transitions**:
- `active → archived`: admin PATCH `{ archived: true }` — **cascades** to all non-archived Events under Program
- `archived → active`: admin PATCH `{ archived: false }` — **restores** Events where `archivedViaProgramId === this.id`

---

## Event

| Field | Type | Required | Notes |
| :--- | :--- | :---: | :--- |
| `id` | string (UUID v4) | ✓ | Server-generated on create |
| `programId` | string (UUID v4) | ✓ | Parent Program; immutable after create |
| `name` | string | ✓ | Display name |
| `partsAttendedOption` | string | ✓ | HubSpot Parts Attended option **value** for this Event |
| `archived` | boolean | ✓ | Default `false` |
| `archivedViaProgramId` | string \| null | ✓ | Set to `programId` when archived by Program cascade; `null` when archived individually or active |
| `createdAt` | string (ISO 8601) | ✓ | Set on create |
| `updatedAt` | string (ISO 8601) | ✓ | Set on every update |

**Validation**:
- `name`: non-empty after trim, max 200 chars; **unique among active Events under the same Program** (recommended — avoids picker ambiguity; not globally unique across Programs)
- `partsAttendedOption`: non-empty after trim, max 200 chars
- `programId`: must reference an existing Program

**State transitions**:
- `active → archived` (individual): admin PATCH `{ archived: true }` on Event; `archivedViaProgramId = null`
- `active → archived` (cascade): when parent Program archived; `archivedViaProgramId = programId`
- `archived → active` (individual): admin PATCH `{ archived: false }` only if parent Program is **not** archived and `archivedViaProgramId` is null
- `archived → active` (via Program unarchive): when parent Program unarchived and `archivedViaProgramId === programId`

---

## Index record

**Key**: `catalog/index`

```json
{
  "programIds": ["uuid-1", "uuid-2"]
}
```

Maintained on Program create (append) — order preserved for stable navigation. Archived Programs remain in index (filtered at read time).

---

## Record Storage keys

| Key pattern | Entity |
| :--- | :--- |
| `catalog/index` | Index |
| `catalog/program/{id}` | Program |
| `catalog/event/{id}` | Event |

Events are linked to Programs by `programId`; GET catalog loads index → programs → events filtered by `programId`.

---

## API projection (GET catalog)

**Active tree** (default):

```json
{
  "programs": [
    {
      "id": "…",
      "name": "Atlassian Event 2026",
      "hubspotFormId": "form-guid",
      "archived": false,
      "events": [
        {
          "id": "…",
          "name": "Meeting Room",
          "partsAttendedOption": "Meeting Room",
          "archived": false
        }
      ]
    }
  ]
}
```

**With `includeArchived=true`** (admin): same shape; includes archived Programs and Events. Frontend archived admin view uses this; navigation pickers do not.

---

## Invariants

1. No hard delete — records persist with `archived: true`.
2. Program `name` unique across entire catalog (active + archived).
3. Archiving Program archives all its Events and sets `archivedViaProgramId`.
4. Unarchiving Program restores only Events archived via that cascade.
5. Cannot unarchive Event individually while parent Program is archived.
6. Catalog mutations require **admin** role; active catalog read requires **authenticated session** (any role).

---

## Audit metadata (mutations)

| Action | resourceType | resourceId | metadata (examples) |
| :--- | :--- | :--- | :--- |
| `catalog.program.create` | `catalog_program` | `{id}` | `name` |
| `catalog.program.update` | `catalog_program` | `{id}` | `archived`, field names changed |
| `catalog.event.create` | `catalog_event` | `{id}` | `programId`, `name` |
| `catalog.event.update` | `catalog_event` | `{id}` | `archived`, `programId` |

No full HubSpot payloads or contact PII in audit rows.
