# Check-in API Contract (003)

**Status**: Provisional — merge into `Frontend/docs/api-contract.md` when editing that file locally.

**RBAC**: All routes **`admin`** only (see `Frontend/docs/rbac.md`).

**Base path**: `/api/ems` (same origin; `X-EMS-Route` header in production)

---

## GET `programs/{programId}/events/{eventId}/attendees`

Registered attendees for an Event under a Program.

### Query parameters

| Param | Type | Description |
| :--- | :--- | :--- |
| `q` | string | Optional substring filter (name or company, case-insensitive) |
| `checkedIn` | `true` \| `false` | Optional filter by checked-in state |
| `page` | number | Optional page (default 1) |
| `pageSize` | number | Optional page size (default 50) |

### Response `200`

```json
{
  "attendees": [
    {
      "contactId": "string",
      "firstName": "string",
      "lastName": "string",
      "email": "string",
      "company": "string",
      "accountManager": "string",
      "attendeeType": "customer | partner",
      "checkedIn": true,
      "checkedInAt": null
    }
  ],
  "page": 1,
  "pageSize": 50,
  "total": 2
}
```

### Errors

| Code | HTTP | When |
| :--- | ---: | :--- |
| `unauthorized` | 401 | Missing/invalid session |
| `forbidden` | 403 | Non-admin role |
| `program_not_found` | 404 | Unknown programId |
| `event_not_found` | 404 | Unknown eventId |

---

## POST `programs/{programId}/events/{eventId}/checkin/scan`

Validate QR JWT and return contact summary for staff review.

### Request body

```json
{
  "jwt": "eyJ..."
}
```

### Response `200`

```json
{
  "programId": "prog-atlassian-2026",
  "eventId": "ev-mr-2026",
  "contact": {
    "contactId": "string",
    "firstName": "string",
    "lastName": "string",
    "email": "string",
    "company": "string",
    "accountManager": "string",
    "attendeeType": "customer | partner",
    "checkedIn": false
  }
}
```

### Errors

| Code | HTTP | When |
| :--- | ---: | :--- |
| `invalid_checkin_token` | 422 | Malformed JWT |
| `invalid_checkin_claims` | 422 | Missing contactId / bad claims |
| `checkin_event_mismatch` | 422 | JWT Event id ≠ open Event |
| `contact_not_found` | 404 | Contact not in registrant set |
| `checkin_jwt_not_configured` | 503 | Public key / issuer not set in Parameters |
| `forbidden` | 403 | Non-admin |

---

## POST `programs/{programId}/events/{eventId}/checkin`

Confirm check-in for a contact (after QR scan or name search selection).

### Request body

```json
{
  "contactId": "string"
}
```

### Response `200`

```json
{
  "contactId": "string",
  "checkedIn": true,
  "alreadyCheckedIn": false,
  "attendeeType": "customer | partner"
}
```

When attendance property already `Yes`: `alreadyCheckedIn: true`, no HubSpot write.

### Errors

| Code | HTTP | When |
| :--- | ---: | :--- |
| `contact_not_found` | 404 | Not a registrant for this Event |
| `forbidden` | 403 | Non-admin |

---

## Walk-in (US3) — no EMS route

Walk-in is **not** an EMS API endpoint. Staff use **Walk-in mode** on the Check-in page, which embeds the Event's HubSpot form via `walkInFormUrl` (see [catalog-event-walkin.md](./catalog-event-walkin.md)).

HubSpot form configuration handles Contact create/update, Parts Attended, attendance, and form submission. EMS does not expose `POST …/walkin` (FR-015).

---

## ScriptRunner Parameters

| Parameter | Purpose |
| :--- | :--- |
| `CHECKIN_JWT_PUBLIC_KEY` | PEM public key for RS256 QR JWT verify |
| `CHECKIN_JWT_ISSUER` | Expected `iss` claim |

---

## HubSpot write (check-in confirm)

Updates Contact property named in catalog Event **`attendanceProperty`** to schema **`Yes`** value (see `docs/hubspot-schema.md`). Idempotent if already `Yes`.
