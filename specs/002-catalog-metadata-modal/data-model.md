# Data Model: Catalog Metadata & Modal Forms

**Feature**: 002-catalog-metadata-modal  
**Storage**: ScriptRunner Record Storage (workspace scope) — **unchanged key layout from 001**  
**HubSpot**: No mapping in this feature — EMS catalog metadata only

**Extends**: [001-catalog-admin data-model](../001-catalog-admin/data-model.md)

---

## Overview

Same two-level hierarchy **Program → Event**. This slice adds **optional EMS metadata** fields on both entities. Archive lifecycle, index record, and cascade rules are unchanged from 001.

---

## Program (extended)

| Field | Type | Required | Notes |
| :--- | :--- | :---: | :--- |
| `id` | string (UUID v4) | ✓ | Unchanged from 001 |
| `name` | string | ✓ | Unchanged — unique case-insensitive |
| `hubspotFormId` | string | ✓ | Unchanged |
| `archived` | boolean | ✓ | Unchanged |
| `eventIds` | string[] | ✓ | Unchanged (internal) |
| `createdAt` | string (ISO 8601 datetime) | ✓ | Unchanged |
| `updatedAt` | string (ISO 8601 datetime) | ✓ | Unchanged |
| `description` | string | | Multi-line; max 4000 chars after trim |
| `startDate` | string | | Calendar date `YYYY-MM-DD` only |
| `endDate` | string | | Calendar date `YYYY-MM-DD` only |
| `location` | string | | Single-line; max 500 chars after trim |
| `timezone` | string | | Single-line opaque label; max 500 chars after trim |

**Validation (001 + type safety only)**:
- Required fields: same as 001 (`name`, `hubspotFormId`).
- Optional metadata: no business rules (date order, timezone format). Invalid date string format → `422`. Empty optional on PATCH → remove key.

**State transitions**: Unchanged from 001.

---

## Event (extended)

| Field | Type | Required | Notes |
| :--- | :--- | :---: | :--- |
| `id` | string (UUID v4) | ✓ | Unchanged |
| `programId` | string (UUID v4) | ✓ | Immutable after create |
| `name` | string | ✓ | Unchanged |
| `partsAttendedOption` | string | ✓ | Unchanged |
| `archived` | boolean | ✓ | Unchanged |
| `archivedViaProgramId` | string \| null | ✓ | Unchanged |
| `createdAt` | string (ISO 8601 datetime) | ✓ | Unchanged |
| `updatedAt` | string (ISO 8601 datetime) | ✓ | Unchanged |
| `owner` | string | | Single-line; max 500 chars after trim |
| `description` | string | | Multi-line; max 4000 chars after trim |
| `date` | string | | Calendar date `YYYY-MM-DD` only |
| `location` | string | | Single-line; max 500 chars after trim |
| `capacity` | number | | Any finite JSON number; no range enforcement |

**Validation**: Same pattern as Program — 001 required fields + type/format checks only.

**State transitions**: Unchanged from 001.

---

## API tree projection (GET catalog)

`CatalogProgramTreeNode` and `CatalogEventTreeNode` include metadata fields **when present** on the stored record:

```json
{
  "programs": [
    {
      "id": "uuid",
      "name": "Atlassian Event 2026",
      "hubspotFormId": "form-guid",
      "archived": false,
      "description": "Annual flagship",
      "startDate": "2026-09-01",
      "endDate": "2026-09-05",
      "location": "London",
      "timezone": "Europe/London",
      "events": [
        {
          "id": "uuid",
          "name": "Keynote",
          "partsAttendedOption": "Keynote",
          "archived": false,
          "owner": "Events Team",
          "date": "2026-09-02",
          "capacity": 500
        }
      ]
    }
  ]
}
```

Omitted keys are not returned (or may be omitted in JSON). Clients treat missing as unset.

**Picker contract**: Frontend navigation pickers MUST continue to display **name only** — extra fields are for catalog admin display.

---

## Record Storage keys

Unchanged from 001 implementation:

| Key | Value |
| :--- | :--- |
| `catalog-index` | `{ programIds: string[] }` |
| `catalog-program-{id}` | Extended Program record |
| `catalog-event-{id}` | Extended Event record |

Legacy records without metadata keys require no migration.

---

## PATCH merge rules (metadata)

1. Key **absent** in PATCH body → keep existing stored value.
2. Key present with **`null`** → remove property from stored record (clear-on-save).
3. Key present with **string/number** → normalize (trim text; validate date format / finite number) and store.
4. Key present with **empty string** after trim on optional metadata → treat as **`null`** (clear on edit; omit on create).

---

## Future HubSpot mapping (out of scope)

| EMS field | Intended use (future) |
| :--- | :--- |
| Program `description`, dates, `location`, `timezone` | Custom Program object properties when verified |
| Event `owner`, `description`, `date`, `location`, `capacity` | Custom Event object properties when verified |

Stable EMS names above are the mapping source of truth — not implemented in this slice.
