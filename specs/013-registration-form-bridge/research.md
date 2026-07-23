# Research: Registration Form Bridge

Almost every architectural question this feature would normally raise was already resolved in [ADR-017](../../docs/decisions/017-registration-slots-and-answer-history.md) and its 2026-07-20 gap review — this file exists to confirm that, and to resolve the one thing neither addressed.

## R-001: Is there any unresolved technical unknown beyond ADR-017?

**Decision**: No. Storage medium (Record Storage), key shape (per `{eventId, contactId}`), append-not-overwrite semantics, the retry-with-verification guard, the combined single-webhook-call design, the no-reconciliation-sweep call, and the manual-only recovery path are all settled decisions, not open questions. This research phase is a confirmation pass, not a discovery pass.

**Rationale**: ADR-017 was itself produced by a `grill-with-docs` session followed by a dedicated 7-item gap review before this plan was requested — the design was deliberately stress-tested before implementation planning began.

**Alternatives considered**: N/A — nothing to research further.

## R-002: Retention — does registration-answer history get purged on Event archive?

**Decision**: **Retain indefinitely** — do not add this store to `RegistrationCacheStore.ts`'s existing `deleteAllForEvent` archive-purge call (the one that already purges the check-in JWT/scan-method operational cache).

**Rationale**: The check-in cache purged on archive is pure operational ticket data with no value once an Event is over. Registration-answer history is the opposite — its entire purpose, per the feature's own motivation, is to be a durable record of what someone said across event cycles, including for Events long since archived. Purging it on archive would silently defeat the feature. HubSpot itself retains Contact/form-submission history indefinitely as a matter of course, which this mirrors rather than contradicts.

**Alternatives considered**:
- **Purge on archive, matching the check-in cache** — rejected: would delete the exact data this feature exists to preserve, the moment an Event ends.
- **A long-but-bounded TTL** (e.g. the Audit log's 90-day retention, `AUDIT_RETENTION_DAYS`) — rejected for now: the Audit log's TTL is a deliberate, separate policy choice for a different data class (security/compliance evidence with a defined retention window), not a precedent that automatically applies here. No retention-policy requirement has been raised for registration answers specifically.

**Flag for the user**: this is a genuine retention/PII-policy call, not a purely technical one — confirm indefinite retention is actually intended before implementation, since it means this data (including any free text a member of the public wrote) persists with no automatic expiry.

## R-003: Where does the new response field fit in the existing Attendee Detail contract?

**Decision**: Add `registrationAnswerHistory` to the existing `GET events/{evId}/attendees/{contactId}` response (`OnGetAttendeeDetail.ts` / `AttendeeDetailResponse` in `Utils/Types.ts`) — not a new route.

**Rationale**: That route is already scoped to exactly this data's natural key (one Event, one Contact) and is already an unaudited, `admin`-only, rate-limited-via-`attendees-list` read (per its existing doc comment) — the same posture this new field needs. Adding a field is a smaller, more consistent change than a parallel route with its own RBAC/rate-limit entry to keep in sync.

**Alternatives considered**: A dedicated `GET events/{eventId}/attendees/{contactId}/registration-history` route — rejected as unnecessary duplication of an RBAC/rate-limit surface that already exists at the right scope.
