# QR Ticket Dispatch — API Contract Delta (008)

**Status**: Provisional — merge into `Frontend/docs/api-contract.md` when implementing.

**RBAC**: No change — inherits the existing **`admin`**-only gate on all `events/{eventId}/email/…` routes.

**Depends on**: [005-email-dispatch contracts/email-api.md](../../005-email-dispatch/contracts/email-api.md) (superseded route prefix — current routes are `events/{eventId}/email/…`, not the legacy `programs/{programId}/events/{eventId}/email/…` shown there; see `docs/api-contract.md` for the live shape).

This feature adds **no new routes**. It adds one response field to two existing endpoints so the Dispatch log can show whether a dispatch generated tickets (FR-006). Every other existing field/behavior is unchanged (FR-005).

---

## `POST events/{eventId}/email/dispatches` — response delta

Request body is **unchanged**. `ticketsEnabled` is computed server-side from the chosen `templateId`, never client-supplied.

**Response `200`** (new field marked):
```json
{
  "dispatchId": "dsp-abc123",
  "status": "processing",
  "recipientCountPlanned": 42,
  "scheduledAtUtc": null,
  "timezone": null,
  "ticketsEnabled": true
}
```

| Field | Rules |
| :--- | :--- |
| `ticketsEnabled` | **New.** `true` if the selected template contains the QR placeholder at create time; `false` otherwise. Never supplied in the request — detected, not operator-set (FR-001). |

No new error codes for this endpoint. Detection failure (e.g. HubSpot template-content fetch fails) is treated as `ticketsEnabled: false` — a dispatch never fails to create solely because ticket detection couldn't run; it just doesn't get tickets. (Open question for implementation: whether this silent-degrade should also surface a non-blocking warning toast — not required by the spec, worth a design pass during Phase C.)

---

## `GET events/{eventId}/email/dispatches` and `GET events/{eventId}/email/dispatches/{dispatchId}` — response delta

Both existing list/detail responses gain the same field on each dispatch row:

```json
{
  "dispatchId": "dsp-abc123",
  "dispatchName": "Meeting Room reminder",
  "templateName": "48-hour reminder",
  "audienceSummary": "All registered (142)",
  "status": "completed",
  "ticketsEnabled": true,
  "...": "unchanged fields omitted"
}
```

| Field | Rules |
| :--- | :--- |
| `ticketsEnabled` | **New.** Same value stamped at create time — never re-detected on read, so it stays stable even if the template is edited afterward (see spec Edge Cases). |

---

## No change

- `GET events/{eventId}/email/limits`, `GET events/{eventId}/email/templates`, `GET events/{eventId}/email/segments` — unchanged. Templates continue to be listed by `{id, name}` only (`MarketingTemplateOption`); QR-tag detection happens lazily per-dispatch (see `research.md` R-002), **not** eagerly for every template in the picker list, to avoid an N+1 HubSpot call per template every time Compose loads.
- `PATCH`/`DELETE events/{eventId}/email/dispatches/{dispatchId}` — unchanged; a pending ticket dispatch is editable/cancellable exactly like any other pending dispatch (`ticketsEnabled` is recomputed if the operator changes `templateId` during edit, same detection call as create).
- `GET events/{eventId}/attendees` dispatch-filter query params (`dispatchId`, `dispatchFilter`) — unchanged; filtering by received/not-received a ticket dispatch works identically to a non-ticket one.

---

## Errors

No new error codes. Existing dispatch-create/list/detail error codes (`429 rate_limited`, `400 validation_error`, `403 forbidden`, `503 email_send_disabled`, `404`) are unchanged and apply identically regardless of `ticketsEnabled`.
