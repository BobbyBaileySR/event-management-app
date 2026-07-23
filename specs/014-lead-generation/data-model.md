# Data Model: HubSpot Lead Generation

## Lead (HubSpot object, not EMS storage)

EMS creates/updates this object in HubSpot directly — there is no EMS-side copy or cache of a Lead's state.

| Field | Set when | Notes |
| :--- | :--- | :--- |
| `hs_lead_name` | Creation only | Contact's display name at creation time. |
| `hs_lead_type` / `hs_lead_label` | Creation only | Fixed values from config (`HUBSPOT_LEAD_TYPE_VALUE`/`HUBSPOT_LEAD_LABEL_VALUE`) — identical for every EMS-generated Lead, no signal-strength differentiation (ADR-018 decision #8). |
| `ems_lead_interest_summary` | Creation only, **never modified after** | The first event's interest content (or an explicitly-written empty string if none). Doubles as the **EMS-provenance marker** — its mere presence (any value, including empty) on a Lead means EMS created it. |
| Contact association | Creation only | `associationCategory: HUBSPOT_DEFINED`, `associationTypeId` from config (`HUBSPOT_LEAD_ASSOCIATION_TYPE_ID`). |
| HubSpot Note (engagement) | Every generation, including the first | Contains that event's interest content + timestamp. This — not the property — is where ongoing history lives. |

## Existing-lead lookup (live, not cached)

`LeadAdapter.createOrUpdateLead(contactId, eventId, options)`:

1. Query HubSpot for the Contact's associated Lead(s).
2. If none exist → **create** (Lead fields above, plus the first Note).
3. If one exists **and** it has `ems_lead_interest_summary` set (any value) → **update**: log a new Note; do not touch any Lead field.
4. If one exists **but does not** have `ems_lead_interest_summary` set at all → **treat as not EMS's** — leave it completely untouched, and **create a new, separate Lead** instead (same as step 2).

No compare-and-swap concern here (unlike `013`'s Record Storage work) — this is a live read-then-write against HubSpot's own API for a single, deliberate, staff-initiated action; concurrent double-clicks are a UI-level concern (disable the button while in flight), not a data-race concern this adapter needs to solve.

## API routes

### `POST events/{evId}/attendees/{contactId}/lead` (single — see `contracts/post-attendee-lead.md`)

| Field | Direction | Notes |
| :--- | :--- | :--- |
| `includeFullHistory` | Request (optional, default `false`) | When `true`, the interest content sourced is the Contact's full cross-event `RegistrationAnswerHistoryStore` history, not just this event's — and this itself triggers an `attendee.registration_history.view_all` audited read (ADR-014 precedent), separate from the `lead.generate` write audit. |
| `outcome` | Response | `created` \| `updated` \| `created_separate` (the provenance-mismatch case, data-model step 4) |
| `leadId` | Response | The HubSpot Lead's id, for a "view in HubSpot" link — not persisted anywhere in EMS. |

### `POST events/{evId}/attendees/lead-batch` (bulk — see `contracts/post-attendee-lead-batch.md`)

| Field | Direction | Notes |
| :--- | :--- | :--- |
| `contactIds` | Request | The attendee list's current selection — no server-side "select all" concept (research.md R-003). |
| `includeFullHistory` | Request (optional, default `false`) | Applies uniformly to the whole batch. |
| `batchConfirmed` | Request (optional) | Required (`true`) once `contactIds.length` meets the configured threshold, or the request is rejected — mirrors `assertLargeSendConfirmed` (research.md R-002), a new threshold constant, not `DISPATCH_CONFIRM_THRESHOLD` reused. |
| `results` | Response | One entry per `contactId`: `{ contactId, outcome: 'created' \| 'updated' \| 'created_separate' \| 'failed', leadId? }` — no attendee is silently skipped or omitted, including those with no recorded interest (spec FR-002/FR-006). |
