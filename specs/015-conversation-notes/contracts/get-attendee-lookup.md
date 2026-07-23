# Contract: Attendee lookup by QR (read-only)

**Status**: Provisional — new route, not yet built.

**RBAC**: `admin` only.

---

## Request

`POST events/{evId}/attendees/lookup`

```json
{ "jwt": "eyJ..." }
```

Same JWT shape Check-in's scanner already produces — reuses `CheckInQrPanel.tsx` unmodified on the Frontend.

## Response `200`

```json
{ "contact": { "contactId": "c-001", "firstName": "...", "...": "..." }, "eventId": "evt-1" }
```

Same `contact` summary shape `checkInScan` already returns (`CustomObjectAdapter.getContactSummary`).

## Errors

Same error shapes as `checkInScan` for JWT verification failures (`checkin_not_configured`, event-mismatch, expired/invalid signature) and `404 contact_not_found` — reusing `verifyCheckInJwt` directly means the same error taxonomy applies.

## Audit

**None** — treated the same as the existing unaudited `GET events/{evId}/attendees/{contactId}` read (research.md R-002). Does **not** write a `checkin.scan` entry — this is the whole point of not reusing `OnCheckInScan.ts`'s handler.

## Explicitly not part of this contract

This route **never** calls into `OnCheckIn.ts`'s check-in-write logic. A dedicated test must assert this (plan.md Complexity Tracking) — not left to inspection alone.
