# Contract: `GET events/{evId}/attendees/{contactId}`

Draft contract — to be copied into [`Frontend/docs/api-contract.md`](../../../docs/api-contract.md) (Slice 1 section) and [`Frontend/docs/rbac.md`](../../../docs/rbac.md) verbatim once `BE-ATTENDEE-DETAIL-001` is implemented, per the repo's API-contract-sync rule. Not authoritative until that happens — this file is the Phase 1 design output only.

**Auth**: `Authorization: Bearer <session>`, **`admin`** role (same gate as `GET events/{evId}/attendees`).

**Audit**: **Yes** — `attendee.detail.view` (BE-SEC-009). Metadata: `eventId`, `contactId`, `answerCount` only — never email, name, or registration-answer text.

## Request

No body. Path params: `evId` (Event id), `contactId` (HubSpot Contact id).

## Response `200`

```json
{
  "contactId": "c-001",
  "firstName": "Amara", "lastName": "Okafor",
  "company": "Northwind", "email": "amara.okafor@northwind.io",
  "accountManager": "sam@adaptavist.com",
  "attendeeType": "customer",
  "checkedIn": true, "checkedInAt": "2026-09-02T08:52:00.000Z",
  "phone": "+1 415 555 0101",
  "jobTitle": "Marketing Director",
  "dietaryRequirement": "Gluten-free",
  "registrationSource": null,
  "journey": [
    { "type": "registered", "timestamp": null, "label": "Registered", "source": "this_event" },
    { "type": "dispatch_sent", "timestamp": "2026-08-15T09:00:00.000Z", "label": "Confirmation email sent", "source": "this_event" },
    { "type": "dispatch_opened", "timestamp": "2026-08-16T14:03:00.000Z", "label": "Confirmation email opened", "source": "this_event" },
    { "type": "dispatch_sent", "timestamp": "2026-09-01T09:00:00.000Z", "label": "Reminder email sent", "source": "this_event" },
    { "type": "dispatch_opened", "timestamp": null, "label": "Reminder email opened", "source": "this_event" },
    { "type": "checked_in", "timestamp": "2026-09-02T08:52:00.000Z", "label": "Checked in at the venue", "source": "this_event" }
  ]
}
```

`phone`/`jobTitle`/`dietaryRequirement`/`registrationSource` are `null` (or key omitted) until their respective TODO items (`HS-010`, `BE-ATTENDEE-DETAIL-002`) close — Frontend omits the field in that case rather than showing a placeholder (spec.md Edge Cases). `journey[].timestamp` is `null` for `registered` until `BE-ATTENDEE-DETAIL-002` lands, and for `dispatch_opened` until `BE-ATTENDEE-DETAIL-003` lands — Frontend renders "Not yet"/no-date copy for `null`, never a fabricated date.

## Errors

| HTTP | `code` | When |
| :---: | :--- | :--- |
| 401 | `missing_session` / `invalid_session` / `session_expired` | Standard session errors. |
| 403 | `forbidden` | Non-admin role. |
| 404 | `contact_not_registered` | No `registered`/`checked-in` association for this Contact↔Event pair — same code the existing check-in route already uses for this situation. |
| 404 | `event_not_found` | Unknown `evId`. |
| 429 | `rate_limited` | Per-actor, same bucket family as `GET events/{evId}/attendees` (`attendees-list`) — reuse rather than invent a new bucket. |

## Notes for `/speckit-tasks`

- Reuses the existing per-registration Record Storage cache (`checkedInAt`, per [ADR-011](../../../docs/decisions/011-attendee-index-freshness.md)) for the `checked_in` journey step — no new store needed for that one step.
- `phone`/`jobTitle` read straight through from HubSpot Contact properties once allowlisted — no new store.
- `dietaryRequirement` requires the new HubSpot property (`HS-010`) to exist before this field can return real data; until then, always `null`.
- `registered`/`dispatch_opened` timestamps require `BE-ATTENDEE-DETAIL-002`/`003` respectively — until then, always `null`, and this route must not fabricate a value.
