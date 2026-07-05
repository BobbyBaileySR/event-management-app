# Catalog API Contract (002 delta)

**Status**: Authoritative for **002-catalog-metadata-modal**. **Extends** [001 catalog-api](../001-catalog-admin/contracts/catalog-api.md) — merge into [docs/api-contract.md](../../../docs/api-contract.md) in the same implementation change.

**Transport**: Unchanged — Generic Sync HTTP; `X-EMS-Route` + `Authorization: Bearer <session>`.

**RBAC**: Unchanged from 001 — no new routes or role matrix rows.

---

## Summary of changes

| Route | Change |
| :--- | :--- |
| `GET catalog` | Response tree nodes may include optional metadata fields |
| `POST catalog/program` | Body accepts optional metadata fields |
| `PATCH catalog/program/{id}` | Body accepts optional metadata fields + `null` to clear |
| `POST catalog/event` | Body accepts optional metadata fields |
| `PATCH catalog/event/{id}` | Body accepts optional metadata fields + `null` to clear |

---

## `GET catalog`

Response `programs[].*` and nested `events[]` may include optional fields per [data-model.md](../data-model.md). Example Event node with metadata:

```json
{
  "id": "uuid",
  "name": "Keynote",
  "partsAttendedOption": "Keynote",
  "archived": false,
  "owner": "Events Team",
  "description": "Main stage",
  "date": "2026-09-02",
  "location": "Hall A",
  "capacity": 500
}
```

Query `includeArchived` behaviour unchanged from 001.

---

## `POST catalog/program`

**Body** (extended):

```json
{
  "name": "Atlassian Event 2026",
  "hubspotFormId": "hubspot-form-guid",
  "description": "Optional multiline",
  "startDate": "2026-09-01",
  "endDate": "2026-09-05",
  "location": "London",
  "timezone": "Europe/London"
}
```

All metadata keys optional. Blank/omitted keys are not stored.

**Response `201`**: `{ "program": { … } }` — includes stored metadata fields when set. Does not include nested events.

---

## `PATCH catalog/program/{id}`

**Body** (partial — any subset):

```json
{
  "name": "Updated name",
  "hubspotFormId": "new-guid",
  "description": "Updated text",
  "startDate": "2026-10-01",
  "endDate": null,
  "location": "",
  "timezone": null,
  "archived": false
}
```

**Clear-on-save**: `null` (or empty string after trim) on optional metadata keys **removes** that property from storage.

**Response `200`**: `{ "program": { … } }` — metadata fields reflect post-update state.

Archive cascade behaviour unchanged from 001.

---

## `POST catalog/event`

**Body** (extended):

```json
{
  "programId": "program-uuid",
  "name": "Keynote",
  "partsAttendedOption": "Keynote",
  "owner": "Jane Doe",
  "description": "Opening session",
  "date": "2026-09-02",
  "location": "Main hall",
  "capacity": 500
}
```

`programId` required. Metadata optional.

**Response `201`**: `{ "event": { … } }`

---

## `PATCH catalog/event/{id}`

**Body** (partial):

```json
{
  "name": "Keynote (updated)",
  "partsAttendedOption": "Keynote",
  "owner": null,
  "description": "Revised blurb",
  "date": "2026-09-03",
  "location": null,
  "capacity": 750.5,
  "archived": false
}
```

**Constraints unchanged from 001**: cannot change `programId`; unarchive rules unchanged.

**Clear-on-save**: same `null`/empty semantics as Program PATCH.

---

## Validation errors (metadata-specific)

| Condition | HTTP | code |
| :--- | :---: | :--- |
| Invalid date format (not `YYYY-MM-DD`) | 422 | `validation_error` |
| Non-finite `capacity` | 422 | `validation_error` |
| Text field exceeds max length | 422 | `validation_error` |
| 001 rules (name, formId, option, duplicates, archive) | unchanged | unchanged |

No validation on capacity sign, integer-ness, or Program start/end ordering.

---

## Frontend `dataService` (extended bodies)

Existing methods — extend TypeScript body types only:

| Method | Notes |
| :--- | :--- |
| `createProgram(body)` | Optional metadata on body |
| `updateProgram(id, body)` | Partial + `null` clears |
| `createEvent(body)` | Optional metadata on body |
| `updateEvent(id, body)` | Partial + `null` clears |

Update `normalizeCatalogResponse` / `normalizeCatalogProgram` / `normalizeCatalogEvent` to pass through optional metadata fields.

Mock helpers in `mockData.ts` must support same shapes for `USE_MOCK_API: true`.

---

## Error codes

No new error codes beyond 001. Metadata type failures use existing `validation_error`.
