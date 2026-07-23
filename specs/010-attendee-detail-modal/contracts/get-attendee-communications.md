# Contract: `GET attendees/{contactId}/communications`

Draft contract — to be copied into [`Frontend/docs/api-contract.md`](../../../docs/api-contract.md) and [`Frontend/docs/rbac.md`](../../../docs/rbac.md) verbatim once `BE-ATTENDEE-DETAIL-001` is implemented. Not authoritative until then — Phase 1 design output only.

**Auth**: `Authorization: Bearer <session>`, **`admin`** role.

**Note — not Event-scoped**: unlike every other Slice 1/2 route, this path has no `evId` segment, because it spans every Event this Contact has a relationship with. The currently-open Event is passed as a query param so the Backend knows what to treat as "this Event" for tagging.

**Audit**: **Yes** — `attendee.communications.view_all`, per [ADR-014](../../../docs/decisions/014-attendee-communications-hubspot-engagement-pull.md) and [research.md](../research.md) R-003. Metadata: `eventId` (the Event that was open when this was requested), `contactId`. **No attendee email or name in the audit row**, matching every other audited action in this app.

## Request

Path param: `contactId`. Query param: `eventId` (required — the currently-open Event, used for "part of this event" tagging).

## Response `200`

```json
{
  "contactId": "c-001",
  "cutoffTimestamp": "2026-08-15T09:00:00.000Z",
  "timeline": [
    { "type": "registered", "timestamp": null, "label": "Registered", "source": "this_event" },
    { "type": "dispatch_sent", "timestamp": "2026-08-15T09:00:00.000Z", "label": "Confirmation email sent", "source": "this_event" },
    { "type": "dispatch_opened", "timestamp": "2026-08-16T14:03:00.000Z", "label": "Confirmation email opened", "source": "this_event" },
    { "type": "dispatch_sent", "timestamp": "2026-09-01T09:00:00.000Z", "label": "Reminder email sent", "source": "this_event" },
    { "type": "dispatch_opened", "timestamp": null, "label": "Reminder email opened", "source": "this_event" },
    { "type": "checked_in", "timestamp": "2026-09-02T08:52:00.000Z", "label": "Checked in at the venue", "source": "this_event" },
    {
      "type": "dispatch_sent", "timestamp": "2026-11-02T09:00:00.000Z",
      "label": "Post-Event Thank You — Executive Roundtable sent", "source": "other_event",
      "tag": { "kind": "other_event", "eventName": "Executive Roundtable 2026" }
    },
    {
      "type": "dispatch_sent", "timestamp": "2026-12-10T09:00:00.000Z",
      "label": "Developer Newsletter — Q4 Digest sent", "source": "external",
      "tag": { "kind": "external" }
    }
  ]
}
```

`timeline` is the full merged array — this Event's own journey (identical to `GET events/{evId}/attendees/{contactId}`'s `journey`) plus every `CommunicationItem` at/after `cutoffTimestamp` (research.md R-004). Already sorted chronologically; Frontend does not re-sort or re-filter.

## Errors

| HTTP | `code` | When |
| :---: | :--- | :--- |
| 401 | `missing_session` / `invalid_session` / `session_expired` | Standard session errors. |
| 403 | `forbidden` | Non-admin role. |
| 404 | `contact_not_registered` | Contact has no `registered`/`checked-in` association for the `eventId` query param. |
| 422 | `validation_error` | Missing `eventId` query param. |
| 429 | `rate_limited` | New bucket — this call is heavier (external HubSpot round trip) than list reads; size the limit conservatively (e.g. 20/user/60s) rather than reusing the 120/60s attendee-list bucket. |
| 502 | `hubspot_engagement_unavailable` | The HubSpot engagement/timeline call itself fails — degrade to returning `timeline` with only `this_event` items and a response flag (`degraded: true`) rather than failing the whole request outright, mirroring the existing `ticketsEnabled: false` degrade-don't-fail pattern used elsewhere in this API. |

## Notes for `/speckit-tasks`

- Depends on `HS-011` (scope grant) before the real HubSpot call can be built — the route/handler/RBAC/audit plumbing can be built and tested against a stub adapter first.
- Dedup logic (research.md R-002) lives entirely server-side — the Frontend never sees duplicate entries to de-duplicate itself.
- `cutoffTimestamp` computation (research.md R-004) happens before the HubSpot call, not after — pass it as a filter parameter to the adapter call rather than fetching everything and discarding client-side in the Backend.
- Add a `502 hubspot_engagement_unavailable` degrade path — do not let a HubSpot outage take down the whole modal's expanded view when the base event-only view (a separate, already-successful request) is still valid.
