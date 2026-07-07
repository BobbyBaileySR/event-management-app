# Capacity API Contract (004)

**Status**: Provisional — merge into `Frontend/docs/api-contract.md` when implementing.

**RBAC**: All routes **`admin`** only (see `Frontend/docs/rbac.md`).

**Base path**: `/api/ems` (same origin; `X-EMS-Route` header in production)

**Depends on**: [003 check-in-api.md](../../003-check-in/contracts/check-in-api.md) — same Program + Event path prefix and session auth.

---

## GET `programs/{programId}/events/{eventId}/capacity`

Live attendance snapshot for Check-in capacity indicator.

### Response `200`

```json
{
  "programId": "prog-atlassian-2026",
  "eventId": "ev-mr-2026",
  "capacity": 100,
  "checkedInCount": 42,
  "departureCount": 3,
  "liveAttendance": 39
}
```

| Field | Type | Notes |
| :--- | :--- | :--- |
| `capacity` | number \| null | From catalog Event; `null` when unset |
| `checkedInCount` | number | Total registrants marked checked-in (HubSpot) |
| `departureCount` | number | Server-persisted anonymous departures (≥ 0) |
| `liveAttendance` | number | `max(0, checkedInCount - departureCount)` |

### Errors

| Code | HTTP | When |
| :--- | ---: | :--- |
| `missing_session` | 401 | Missing/invalid session |
| `forbidden` | 403 | Non-admin role |
| `program_not_found` | 404 | Unknown programId |
| `event_not_found` | 404 | Unknown eventId or Event not under Program |

---

## POST `programs/{programId}/events/{eventId}/capacity/adjust`

Record anonymous departure (−1 live) or correction (+1 live). **No HubSpot write.**

### Request body

```json
{
  "direction": "down"
}
```

| Field | Type | Values |
| :--- | :--- | :--- |
| `direction` | string | `down` — person left (−1 live); `up` — correction (+1 live) |

### Response `200`

Same shape as GET capacity (updated snapshot).

### Errors

| Code | HTTP | When |
| :--- | ---: | :--- |
| `missing_session` | 401 | Missing/invalid session |
| `forbidden` | 403 | Non-admin role |
| `program_not_found` | 404 | Unknown programId |
| `event_not_found` | 404 | Unknown eventId |
| `validation_error` | 422 | Missing/invalid `direction` |
| `capacity_at_floor` | 422 | `direction: down` but `liveAttendance` already 0 |
| `capacity_at_ceiling` | 422 | `direction: up` but `liveAttendance` already equals `checkedInCount` |

### Audit

Successful adjust writes audit action `capacity.adjust` with `programId`, `direction`, and departure count before/after (no PII).

---

## Frontend consumption

| Method | `dataService` (provisional) |
| :--- | :--- |
| GET | `fetchCapacityStatus(programId, eventId)` |
| POST | `adjustCapacity(programId, eventId, direction)` |

Mock layer (`USE_MOCK_API: true`): same routes via `mockData` in-memory departure map.

---

## RouteGuard entries (backend)

Add to `ROUTE_ACCESS_RULES`:

```text
GET  programs/{programId}/events/{eventId}/capacity        admin
POST programs/{programId}/events/{eventId}/capacity/adjust   admin
```

Pattern (regex): `^programs\/[^/]+\/events\/[^/]+\/capacity(?:\/adjust)?$`
