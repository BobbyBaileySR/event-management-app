# Audit Log Operator UX — API Contract Delta (009)

**Status**: Provisional — merge into `Frontend/docs/api-contract.md` when implementing.

**RBAC**: No change — both routes remain **`admin`**-only, exactly as documented today.

This feature adds **no new routes**. It adds four optional query parameters and one optional response field to the two existing audit routes. Every other existing field/behavior is unchanged.

---

## `GET audit/recent` — query + response delta

**Query** (existing `page?`/`pageSize?` unchanged; new params marked):
- `page?` (default `1`) — existing
- `pageSize?` (default `50`, max `200`) — existing
- `action?` — **New.** Exact match against an audit entry's `action`.
- `actor?` — **New.** Exact match against an audit entry's `actor` (staff email).
- `resourceType?` — **New.** Exact match against `resourceType`.
- `resourceId?` — **New.** Exact match against `resourceId`.

All four new filters are optional and combine with **AND** semantics when more than one is supplied. Omitting all four behaves exactly as today (unfiltered, paginated).

**Response `200`** (new field marked):
```json
{
  "entries": [
    {
      "id": "req-abc",
      "timestamp": "2026-07-07T12:00:00.000Z",
      "action": "checkin.confirm",
      "actor": "admin@adaptavist.com",
      "eventId": "ev-mr",
      "resourceType": "catalog_event",
      "resourceId": "ev-mr",
      "resourceLabel": "Meeting Room — Kickoff",
      "outcome": "success",
      "metadata": { "programId": "prog-2026", "alreadyCheckedIn": false }
    }
  ],
  "page": 1,
  "pageSize": 50,
  "total": 1
}
```

| Field | Rules |
| :--- | :--- |
| `resourceLabel` | **New, optional.** Present with a resolved name when `resourceType` is `catalog_program` or `catalog_event` and the resource still exists. `null` when that resourceType's resource no longer exists (deleted). **Absent** (field omitted) for other resource types (e.g. `session`) — unchanged display for those. Resolved only for entries on the returned page, never the full log. |

**Errors:** `401 missing_session`, `403 forbidden` — unchanged. No new error codes; an unrecognized filter value (e.g. an `action` string matching no known action) is not an error — it simply matches zero entries, returning an empty `entries` array with `total: 0`.

---

## `GET events/{id}/audit` — same delta

Identical query-param and response-field delta as `GET audit/recent` above, scoped to `resourceType: catalog_event` + matching `resourceId`, exactly as today. Both routes are served by the same handler (`OnGetAuditRecent.ts`) — the delta applies identically.

---

## No change

- `POST`/`PATCH`/`GET` routes on catalog, attendees, check-in, capacity, dispatch — unchanged. This feature touches only how the audit log is **read**, not what any other route writes to it.
- `docs/rbac.md` — no row changes; both routes remain admin-only, no new route added.
