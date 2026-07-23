# Contract: `POST events/{evId}/attendees/{contactId}/lead`

**Status**: Provisional — new route, not yet built. Blocked on `HS-015`/`HS-016`/`HS-017` for a real end-to-end test against live HubSpot; the route/adapter itself can be built and unit-tested against a mocked `HubSpotApiClient` without them.

**RBAC**: `admin` only, same gate as the rest of the Attendee Detail modal.

---

## Request

`POST events/{evId}/attendees/{contactId}/lead`

```json
{ "includeFullHistory": false }
```

`includeFullHistory` is optional, defaults to `false`.

## Response `200`

```json
{ "outcome": "created", "leadId": "12345" }
```

| `outcome` | Meaning |
| :--- | :--- |
| `created` | No existing Lead found for this Contact — a new one was created. |
| `updated` | An existing EMS-provenance-marked Lead was found — a Note was logged on it; no Lead fields changed. |
| `created_separate` | An existing Lead was found but was **not** EMS-provenance-marked — it was left untouched, and a new, separate Lead was created instead (data-model.md step 4). |

## Errors

- `403 forbidden` — non-admin.
- `404 contact_not_registered` — no `registered`/`checked-in` association for this Contact↔Event pair (same eligibility check as the existing Attendee Detail route).
- `404 event_not_found`.
- `429 rate_limited`.
- `502` (or equivalent) if the live HubSpot Leads API call itself fails — surfaced as a plain-language error, not a raw HubSpot error code, per this app's standing copy convention.

## Audit

- `lead.generate` — metadata: `eventId`, `contactId`, `outcome`, `includeFullHistory` (boolean). Never the interest-summary text or other attendee PII.
- If `includeFullHistory: true` was used: also `attendee.registration_history.view_all` — same metadata shape as the equivalent existing action for the Attendee communications view (ADR-014).
