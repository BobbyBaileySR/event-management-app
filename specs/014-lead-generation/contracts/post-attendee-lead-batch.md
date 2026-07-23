# Contract: `POST events/{evId}/attendees/lead-batch`

**Status**: Provisional — new route, not yet built. Same HubSpot-confirmation blockers as the single-attendee route (`contracts/post-attendee-lead.md`).

**RBAC**: `admin` only.

---

## Request

`POST events/{evId}/attendees/lead-batch`

```json
{ "contactIds": ["c-001", "c-002", "c-003"], "includeFullHistory": false, "batchConfirmed": false }
```

`contactIds` — the Attendee list's current selection (no server-side "select all" concept — research.md R-003). `includeFullHistory` applies uniformly to the whole batch. `batchConfirmed` is required (`true`) once `contactIds.length` meets the configured threshold (a new constant, separate from email dispatch's `DISPATCH_CONFIRM_THRESHOLD` — research.md R-002); otherwise the request is rejected before any HubSpot call is made.

## Response `200`

```json
{
  "results": [
    { "contactId": "c-001", "outcome": "created", "leadId": "12345" },
    { "contactId": "c-002", "outcome": "updated", "leadId": "12346" },
    { "contactId": "c-003", "outcome": "created_separate", "leadId": "12347" }
  ]
}
```

Every `contactId` in the request gets exactly one result entry — none are silently skipped, including attendees with no recorded registration answer (spec FR-002/FR-006). `outcome` values match the single-attendee contract, plus `failed` if that specific attendee's HubSpot call errored (the rest of the batch still completes — one failure does not abort the whole request).

## Errors

- `400 batch_confirmation_required` — `contactIds.length` at/above the threshold and `batchConfirmed` was not `true`. Mirrors `large_send_confirmation_required`'s shape (`Utils/DispatchValidation.ts`).
- `403 forbidden` — non-admin.
- `404 event_not_found`.
- `429 rate_limited`.
- Any `contactId` not currently registered/checked-in for `evId` is reported as `failed` in that entry's result, not a whole-request error.

## Audit

One `lead.generate` entry per attendee in the batch (same metadata shape as the single-attendee contract) — not one aggregate entry for the whole batch, so each attendee's outcome remains individually traceable. Same rule for `attendee.registration_history.view_all` when `includeFullHistory: true`.
