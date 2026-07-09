# Email Dispatch API Contract (005)

**Status**: Provisional — merge into `Frontend/docs/api-contract.md` and `Frontend/docs/rbac.md` when implementing.

**RBAC**: All routes **`admin`** only (Slice 2 defers `communications` role).

**Base path**: `/api/ems` (same origin; `X-EMS-Route` header in production)

**Prefix**: `programs/{programId}/events/{eventId}/email/…`

**Depends on**: [003 check-in-api.md](../../003-check-in/contracts/check-in-api.md) — session auth, Program/Event validation.

---

## GET `programs/{programId}/events/{eventId}/email/limits`

Compose tab rate-limit display (FR-010a, NFR-005).

### Response `200`

```json
{
  "dispatchLimitPerHour": 10,
  "dispatchUsedThisHour": 2,
  "largeSendThreshold": 50
}
```

---

## GET `programs/{programId}/events/{eventId}/email/templates`

HubSpot marketing email templates (FR-002).

### Response `200`

```json
{
  "templates": [
    {
      "id": "123456789",
      "name": "48-hour reminder",
      "description": "Marketing Hub"
    }
  ]
}
```

---

## GET `programs/{programId}/events/{eventId}/email/segments`

HubSpot CRM segments for wider audience (FR-005). Active + Static only.

### Response `200`

```json
{
  "segments": [
    { "id": "987", "name": "VIP prospects", "kind": "active" },
    { "id": "654", "name": "Static invite list", "kind": "static" }
  ]
}
```

---

## POST `programs/{programId}/events/{eventId}/email/preview`

Recipient count dry-run (no send, no rate-limit consume).

### Request body

```json
{
  "templateId": "123456789",
  "audience": {
    "type": "registered_checked_in"
  }
}
```

**Audience `type` values**: `registered_all` | `registered_checked_in` | `registered_not_checked_in` | `registered_manual` | `hubspot_segment`

**`registered_manual`**:

```json
{
  "audience": {
    "type": "registered_manual",
    "contactIds": ["c-001", "c-002"]
  }
}
```

**`hubspot_segment`**:

```json
{
  "audience": {
    "type": "hubspot_segment",
    "segmentId": "987"
  }
}
```

### Response `200`

```json
{
  "recipientCount": 42
}
```

### Errors

| Code | HTTP | When |
| :--- | ---: | :--- |
| `validation_error` | 400 | Invalid audience, empty manual list, unknown segment |
| `template_not_found` | 404 | HubSpot template id invalid |

---

## POST `programs/{programId}/events/{eventId}/email/dispatches`

Create **send now** or **scheduled** dispatch (FR-006). Accepts immediately; processing async (research R-005).

### Request body

```json
{
  "dispatchName": "Meeting Room reminder",
  "templateId": "123456789",
  "audience": { "type": "registered_all" },
  "scheduledAtUtc": null,
  "timezone": null,
  "idempotencyKey": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Scheduled example**:

```json
{
  "dispatchName": "VIP invite wave 1",
  "templateId": "123456789",
  "audience": { "type": "hubspot_segment", "segmentId": "987" },
  "scheduledAtUtc": "2026-10-14T08:00:00.000Z",
  "timezone": "Europe/London",
  "idempotencyKey": "660e8400-e29b-41d4-a716-446655440001"
}
```

| Field | Rules |
| :--- | :--- |
| `dispatchName` | Required non-empty string |
| `scheduledAtUtc` | `null` = send now; else future instant on 15-min grid |
| `timezone` | Required when scheduled; IANA string |
| `idempotencyKey` | Required UUID; duplicate within TTL returns same job |
| `largeSendConfirmed` | Required `true` when `recipientCountPlanned >= largeSendThreshold` (FR-010) |

### Response `200`

```json
{
  "dispatchId": "dsp-abc123",
  "status": "processing",
  "recipientCountPlanned": 42,
  "scheduledAtUtc": null,
  "timezone": null
}
```

Scheduled pending response uses `"status": "pending"`.

### Errors

| Code | HTTP | When |
| :--- | ---: | :--- |
| `rate_limited` | 429 | Hourly dispatch cap exceeded |
| `validation_error` | 400 | Past schedule, off 15-min grid, zero recipients |
| `large_send_confirmation_required` | 400 | Audience at/above threshold without `largeSendConfirmed: true` |
| `idempotency_in_progress` | 409 | Idempotency key reserved but job not yet persisted |
| `forbidden` | 403 | Non-admin |

**Job fields (server):** `largeSendConfirmed: true` persisted on create/patch when operator confirms, with `largeSendConfirmedAtCount` binding confirmation to the preview count. PATCH without re-confirmation clears both fields. Queue re-checks live audience count at processing and fails the job if threshold is met without valid confirmation or live count exceeds the confirmed count.

---

## GET `programs/{programId}/events/{eventId}/email/dispatches`

List dispatches for Event.

### Query

| Param | Values | Default |
| :--- | :--- | :--- |
| `view` | `scheduled` \| `log` | — |
| `page` | number | 1 |
| `pageSize` | number | 50 |

- **`view=scheduled`**: `pending` only (+ `lockWarning` boolean per row)
- **`view=log`**: `completed`, `failed`, and in-flight `processing` (newest first)

### Response `200`

```json
{
  "dispatches": [
    {
      "dispatchId": "dsp-abc123",
      "dispatchName": "Meeting Room reminder",
      "templateName": "48-hour reminder",
      "audienceSummary": "All registered (142)",
      "status": "pending",
      "scheduledAtUtc": "2026-10-14T08:00:00.000Z",
      "timezone": "Europe/London",
      "recipientCountPlanned": 142,
      "recipientCountSent": 0,
      "createdBy": "admin@adaptavist.com",
      "createdAt": "2026-10-01T10:00:00.000Z",
      "lockWarning": true
    }
  ],
  "page": 1,
  "pageSize": 50,
  "total": 1
}
```

---

## GET `programs/{programId}/events/{eventId}/email/dispatches/{dispatchId}`

Dispatch detail + paginated recipients (FR-012).

### Response `200`

```json
{
  "dispatch": {
    "dispatchId": "dsp-abc123",
    "dispatchName": "Meeting Room reminder",
    "templateName": "48-hour reminder",
    "audienceSummary": "Checked in only (12)",
    "status": "completed",
    "scheduledAtUtc": null,
    "timezone": null,
    "recipientCountPlanned": 12,
    "recipientCountSent": 12,
    "createdBy": "admin@adaptavist.com",
    "createdAt": "2026-10-01T10:00:00.000Z",
    "completedAt": "2026-10-01T10:02:00.000Z"
  },
  "recipients": [
    {
      "contactId": "c-001",
      "email": "jane@acme.com",
      "outcome": "sent",
      "sentAt": "2026-10-01T10:01:30.000Z"
    }
  ],
  "page": 1,
  "pageSize": 50,
  "total": 12
}
```

---

## PATCH `programs/{programId}/events/{eventId}/email/dispatches/{dispatchId}`

Full edit of **`pending`** scheduled dispatch (FR-008). Same body shape as POST create (minus `idempotencyKey`); includes optional `largeSendConfirmed` when audience meets threshold.

### Response `200`

Updated dispatch summary (same fields as list item).

### Errors

| Code | HTTP | When |
| :--- | ---: | :--- |
| `dispatch_locked` | 409 | Status is `processing` or terminal |
| `large_send_confirmation_required` | 400 | Audience at/above threshold without `largeSendConfirmed: true` |
| `dispatch_not_found` | 404 | Unknown id |

---

## DELETE `programs/{programId}/events/{eventId}/email/dispatches/{dispatchId}`

Cancel **`pending`** scheduled dispatch → `cancelled`.

### Response `200`

```json
{ "dispatchId": "dsp-abc123", "status": "cancelled" }
```

---

## GET `programs/{programId}/events/{eventId}/attendees` (extension)

Existing route — add query params (FR-013):

| Param | Values |
| :--- | :--- |
| `dispatchId` | Dispatch uuid |
| `dispatchFilter` | `received` \| `not_received` |

Requires both params together. Filters **Registered attendees** only.

---

## Scheduled processor (non-HTTP)

**Script**: `QueueProcessor.ts` — Scheduled Trigger cron `*/15 * * * *`

**Behaviour**:
1. List `pending` jobs where `scheduledAtUtc <= now` (or immediate jobs in `processing` queue).
2. Optimistic lock `pending → processing`.
3. Resolve audience → HubSpot handoff (research R-003).
4. Write `DispatchRecipientRow` per **sent** Contact.
5. Set `completed` or `failed`; audit.

---

## Error codes (additions)

| Code | HTTP | When |
| :--- | ---: | :--- |
| `dispatch_locked` | 409 | Edit/cancel while processing |
| `large_send_confirmation_required` | 400 | Audience at/above threshold without confirmation |
| `idempotency_in_progress` | 409 | Idempotency key reserved without persisted job |
| `template_not_found` | 404 | Stale template id |
| `segment_not_found` | 404 | Stale segment id |
| `hubspot_send_failed` | 502 | Job-level HubSpot error (job may partial complete) |
