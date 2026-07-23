# Phase 1 Data Model: Attendee Detail Modal (Attendee Journey)

Entities extracted from [spec.md](spec.md) § Key Entities. Field names below are the wire-level shape the two new routes ([contracts/](contracts/)) will return — Frontend-facing, not raw HubSpot property names (those stay in `hubspot-schema.md`).

## AttendeeDetail

Returned by `GET events/{evId}/attendees/{contactId}`. Extends today's `AttendeeSummary` ([hubspot-schema.md](../../docs/hubspot-schema.md) DTO mapping) with the new Basic Information fields and the event-scoped journey.

| Field | Type | Availability | Notes |
| :--- | :--- | :---: | :--- |
| `contactId` | string | today | Existing field, unchanged. |
| `firstName` / `lastName` | string | today | Existing fields, unchanged. |
| `email` | string | today | Existing field, unchanged. |
| `company` | string | today | Existing field, unchanged. |
| `accountManager` | string | today | Existing field, unchanged. |
| `attendeeType` | `'customer' \| 'partner'` | today | Existing field, unchanged. |
| `checkedIn` | boolean | today | Existing field, unchanged. |
| `checkedInAt` | string (ISO) \| null | today | Existing field, unchanged. |
| `phone` | string \| null | **pending** (`HS-010` verification) | Standard HubSpot Contact property, not yet allowlisted — omit key or `null` until confirmed populated. |
| `jobTitle` | string \| null | **pending** (`HS-010` verification) | Same as `phone`. |
| `dietaryRequirement` | string \| null | **pending** (`HS-010` — net-new HubSpot property) | Does not exist in HubSpot today; field is defined here so the Frontend contract is stable once the property lands. |
| `registrationSource` | `'form' \| 'walk-in'` \| null | **pending** (`BE-ATTENDEE-DETAIL-002`) | No persisted signal distinguishes these today — `null` until the Backend gap closes. |
| `journey` | `AttendeeJourneyStep[]` | partial (see below) | This-Event-only steps, ordered chronologically. |

**Validation rules**: `contactId` required and must resolve to a Contact with a `registered` or `checked-in` association/state for `evId` (`404 contact_not_registered` otherwise, matching the existing check-in route's error convention). All string fields are free text from HubSpot — Frontend MUST render via JSX only (FR-010).

## AttendeeJourneyStep

One entry in `AttendeeDetail.journey` or `AttendeeCommunicationsResponse.timeline`.

| Field | Type | Notes |
| :--- | :--- | :--- |
| `type` | `'registered' \| 'dispatch_sent' \| 'dispatch_opened' \| 'checked_in'` | Fixed enum — no free-text step types. |
| `timestamp` | string (ISO) \| null | `null` only for `dispatch_opened` when open-tracking data doesn't exist yet (`BE-ATTENDEE-DETAIL-003`) — Frontend renders "Not yet" per the reference design, not a blank. |
| `label` | string | Display label, e.g. "Confirmation email sent" — Backend-composed from dispatch name, not a raw template id. |
| `source` | `'this_event'` (journey only) | Always `this_event` in `AttendeeDetail.journey`; absent/replaced by `eventTag` in the expanded communications timeline (see below). |

## CommunicationItem

One entry in `AttendeeCommunicationsResponse.timeline` **only** for items not part of the currently-open Event (the "Show all communications" expansion). Extends `AttendeeJourneyStep`'s shape with a tag.

| Field | Type | Notes |
| :--- | :--- | :--- |
| *(all `AttendeeJourneyStep` fields)* | — | Same shape, `source` always non-`this_event`. |
| `tag` | `{ kind: 'other_event'; eventName: string } \| { kind: 'external' }` | `other_event` when the item matches one of EMS's own dispatches for a different Event (name resolved server-side); `external` (rendered as a generic "OTHER DISPATCH" label) when it's a HubSpot send EMS never touched — per [ADR-014](../../docs/decisions/014-attendee-communications-hubspot-engagement-pull.md) and [research.md](research.md) R-002. |

## AttendeeCommunicationsResponse

Returned by `GET attendees/{contactId}/communications`.

| Field | Type | Notes |
| :--- | :--- | :--- |
| `contactId` | string | Echo of the request. |
| `timeline` | `(AttendeeJourneyStep \| CommunicationItem)[]` | This Event's own journey steps **plus** every `CommunicationItem` at/after the attendee's earliest event-related timestamp (research.md R-004), single chronologically-ordered array — no pagination. |
| `cutoffTimestamp` | string (ISO) | The earliest event-related timestamp used to bound the query — surfaced for debugging/QA, not required by the UI. |

**Validation rules**: Same `contactId`-must-resolve rule as `AttendeeDetail`. This route is **audited** (`attendee.communications.view_all`, per research.md R-003) — every other rule (RBAC, error shape) matches the rest of Slice 1/2.

## Relationships

- `AttendeeDetail` 1—1 a registered Contact↔Event pair (existing `Attendee list` entity, unchanged).
- `AttendeeDetail.journey` 1—many `AttendeeJourneyStep` (this Event only).
- `AttendeeCommunicationsResponse.timeline` 1—many mixed `AttendeeJourneyStep` (this Event) and `CommunicationItem` (everything else) — the union is what lets the Frontend render one merged list without knowing which rows came from which Backend source.

## State transitions

None — every entity here is a read-only projection. No entity in this feature has a lifecycle of its own; `checked_in`/`registered` state transitions already exist and are owned by the Attendee list / Check-in features (unchanged by this work).
