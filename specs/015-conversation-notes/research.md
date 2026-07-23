# Research: Live Event Conversation Notes

## R-001: Does reusing JWT verification for the QR lookup need a refactor first?

**Decision**: No — `Utils/CheckInJwt.ts`'s `verifyCheckInJwt` is already a standalone function, and `OnCheckInScan.ts` itself already separates concerns cleanly: it verifies the JWT, resolves the contact via `CustomObjectAdapter.getContactSummary`, writes its own `checkin.scan` audit entry, and returns the contact — it does **not** itself write a check-in (that's a separate, later confirm step in `OnCheckIn.ts`, triggered by staff action in the existing Check-in UI). This is simpler than ADR-019 anticipated ("extract the JWT-validation-and-lookup logic into a shared piece") — there's nothing to extract; the new handler (`OnGetAttendeeLookup.ts`) just calls the same two already-reusable pieces (`verifyCheckInJwt`, `getContactSummary`) directly, and simply omits the `checkin.scan` audit call `OnCheckInScan.ts` makes.

**Rationale**: Confirmed by reading `OnCheckInScan.ts` directly rather than assuming from its name.

**Alternatives considered**: Refactoring `OnCheckInScan.ts` to delegate to a shared helper both handlers call — unnecessary, since both already call the same two already-exported functions; adding a shared helper would be a pure renaming exercise with no behavior change, not worth the diff.

## R-002: Does the new lookup handler need its own audit action?

**Decision**: No new audit action for the lookup itself — treat it the same as the existing (unaudited) `GET events/{evId}/attendees/{contactId}` read, since a QR lookup here is functionally equivalent to that same "look up one attendee's basic info" read, just triggered by a scan instead of a click. The *notes* fetch that typically follows is where ADR-019 decision #6's new audited action belongs, not the lookup step itself.

**Rationale**: Keeps the number of new audit action types minimal — only where the ADR actually calls for one (the notes read, given note content's higher sensitivity), not on every new route by default.

**Alternatives considered**: A dedicated `attendee.lookup.qr` audited action — rejected as unnecessary duplication of the existing unaudited attendee-detail read's posture.

## R-003: Does the checked-in-only list need a new route?

**Decision**: No — `GET events/{evId}/attendees` already supports a `checkedIn` boolean query parameter (`OnGetAttendees.ts:32`, `parseBooleanQuery(req.query.checkedIn)`). `ConversationsView.tsx` calls the existing attendees fetch with `checkedIn: true`; no new Backend route for the list itself.

**Rationale**: Confirmed by reading the existing handler directly. This further shrinks this feature's new Backend surface — only the lookup and notes routes are genuinely new, not a fourth "list" route.

**Alternatives considered**: A new, dedicated "checked-in roster" route — rejected as unnecessary duplication of an already-parameterized existing one.
