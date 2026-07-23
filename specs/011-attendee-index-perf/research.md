# Research: Attendee Index Performance Fix

**Feature**: 011-attendee-index-perf
**Date**: 2026-07-17
**Prerequisites**: [ADR-011](../../docs/decisions/011-attendee-index-freshness.md), [ADR-012](../../docs/decisions/012-attendee-index-write-conflict-resolution.md), [spec.md](./spec.md)

## R-001: How to store a per-Event attendee roster without reintroducing a full-keyspace scan

**The question**: `RegistrationCacheStore.ts` already keys one record per `{eventId, contactId}` (`ems-checkin-cache-{eventId}--{contactId}`, `RegistrationCacheStore.ts:23,27-29`), but listing *all* of an Event's records today means `deleteAllForEvent` calling `KeyValueStore.listKeys(prefix)`, which — like `AuditStore.listAuditEntries()` before 009 — pages through **every key in the entire workspace scope** via `getAllKeys`/`lastEvaluatedKey` and filters client-side (`KeyValueStore.ts:90-107`). That's the same anti-pattern the audit-index fix (009) just removed; reusing it here for `GET attendees` would reintroduce exactly the problem this feature exists to fix.

**Decision**: Same shape as 009's bucketed index, keyed by **Event instead of hour**: a single manifest record per Event (`ems-attidx-manifest-{eventId}`) holding a JSON array of that Event's registered `contactId`s, alongside the existing per-contact-per-event detail records (reusing the `RegistrationCacheStore`-style key convention, extended with the new roster/display fields — see data-model.md). Reads become: (1) one `getValue` for the manifest → contactId list, (2) batch `getValue` for just those contacts' index entries, (3) search/sort/filter/paginate against that in-memory set — bounded by **this Event's roster size**, never the workspace keyspace or every Event's data.

**Rationale**:
- Matches this codebase's own established pattern (AuditStore's hour-buckets) for the same underlying problem: a lightweight pointer manifest plus direct-keyed detail records, avoiding `getAllKeys` entirely.
- `deleteAllForEvent`'s existing prefix-scan approach for `RegistrationCacheStore` already carries this same latent cost today — out of scope to fix here, but the new attendee-index manifest must not repeat it going forward.

**Accepted risk (size)**: Backend/AGENTS.md's Record Storage section and the `@sr-connect/record-storage` package documentation state no explicit maximum value size (confirmed by inspection — no size ceiling is documented anywhere in this repo or its dependency). A manifest holding only `contactId` strings (short HubSpot object IDs, not full attendee records) for even a few thousand attendees is on the order of tens of KB — comfortably small by any typical platform-storage-item convention — but this is an **unverified assumption**, not a documented guarantee. Flagged as a revisit item if a single Event's roster ever grows large enough to make this a real concern (no evidence it will at this app's current scale).

## R-002: Read path — list, search, and paginate

**Decision**: Unlike 009's bucket-walk (which can stop early once a page is filled, because entries are read newest-first and search wasn't part of that fix), the attendee list supports free-text search across the whole roster (name/company/email), so a page can't be served without knowing which of the *full* roster's entries match. The read path is: load the Event's manifest → batch-read all of that Event's index entries → apply search/filter/sort in memory → slice for the requested page. This is bounded by "this Event's attendee count," not total workspace/HubSpot data, which is the actual fix — it mirrors what `HubSpotCustomObjectAdapter.listRegisteredAttendees` already does *logically* today (fetch-then-filter-then-paginate), just against fast local reads instead of a live unbounded HubSpot association fetch plus N+1 per-checked-in-attendee Record Storage reads (`HubSpotCustomObjectAdapter.ts:105-121,159-166`).

**Alternatives considered**: A bucket-walk-style "stop once a page is full" read (like 009) was rejected — it only works when the sort order the caller wants (time) matches the order the index is naturally organized in, and search would still require scanning the full roster to find matches regardless of where they land in that order.

## R-003: Field-scoped writes + observed-timestamp guard (ADR-012) — applied, not redesigned

**Decision**: Each attendee index entry is a single JSON record per `{eventId, contactId}` with two independently-timestamped field groups, exactly matching ADR-012's "field-scoped writes, not whole-row overwrites":
- **Checked-in-state fields** (`checkedIn`, `checkedInAt`) + `checkedInObservedAt` — owned by write-through (check-in confirm/undo).
- **Roster/display fields** (`name`, `company`, `email`, `accountManager`, `attendeeType`) + `rosterObservedAt` — owned by the registration webhook and the reconciliation sweep.

A write is a read-modify-write: read the current stored entry, and for each field group being written, apply the incoming fields only if the incoming group's `observedAt` is `>=` the currently stored value for that group (or the group has never been stored) — never a blind whole-record overwrite. This directly implements ADR-012 without reopening it.

**Accepted risk (unchanged from AuditStore R-001's precedent)**: `@sr-connect/record-storage`/`KeyValueStore` has no compare-and-swap/conditional-update-on-an-existing-value primitive (confirmed in 009's research and reconfirmed here — `KeyValueStore.ts`'s only conditional write is `trySet`'s insert-only `denyUpdateOverwrite`). Two writers touching the exact same entry at the exact same instant can still race at the physical read-modify-write level (whichever `setValue` lands last wins for that specific request). The observed-timestamp guard specifically prevents *order-based* staleness (an old fact arriving late and clobbering a newer one) — the actual failure mode ADR-012 was written to prevent — but does not fully eliminate true-simultaneous-write collision. Per-attendee (not per-Event-wide) write granularity keeps that collision window narrow and low-probability, consistent with how AuditStore's per-hour-bucket granularity was justified.

## R-004: Removal semantics

**Decision**: `OnRemoveAttendee`'s write-through deletes the attendee's index entry outright (and removes its `contactId` from the Event's manifest) rather than marking a "removed" field — matching what actually happens in HubSpot (`removeAttendee` calls `port.deleteAssociation`, per `HubSpotCustomObjectAdapter.ts:329-348`). If the reconciliation sweep's HubSpot read for that Event races a removal that hasn't fully propagated yet, it could theoretically re-observe the (now-stale) association and re-add the entry; this is the same class of low-probability, narrow-window accepted risk as R-003, not a new category of problem.

## R-005: Reconciliation sweep — reuse `QueueProcessor.ts`'s existing shape

**Decision**: No new Scheduled Trigger. Add a new step to `QueueProcessor.ts`'s existing 15-minute self-rechaining run (`QueueProcessor.ts:57-84`), following the same shape `purgeFinishedEventTickets` already uses (`Utils/EventTicketPurge.ts`): iterate `catalogAdapter.listEvents()` (non-archived only), do per-Event reconciliation work, bail via the same `deadlineMs` time-budget check, and rely on `triggerScript('QueueProcessor', {})` (`QueueProcessor.ts:82`, `@sr-connect/trigger`) to resume on the next invocation if the deadline is hit mid-sweep — no separate "resume cursor" needed, matching `EventTicketPurge.ts`'s own documented rationale ("safely re-runnable... a cheap no-op/resume").

## R-006: Attendee index TTL for an Event with no `end` date

**Decision**: Reuse the exact fallback already established by `Utils/EventTicketPurge.ts` for the identical problem ("when is this Event over, given `end` is optional") — `event.end ?? event.start`, plus a grace-period buffer (that file's `EVENT_FINISHED_GRACE_PERIOD_MS = 24h`). The attendee index's TTL is derived the same way, for consistency with an already-shipped, already-reasoned-through convention in this codebase, rather than inventing a second fallback scheme. `CatalogEventRecord.end` is confirmed optional, `start` is confirmed required (`CatalogAdapter.ts:19-37`).

## R-007: Webhook listener — new standalone Async HTTP entry point, not a route on `OnHttpRouter`

**Investigation**: No existing script in this repo demonstrates an Async HTTP Event Listener (confirmed by repo-wide search) — every existing route goes through the single Sync `OnHttpRouter.ts` (25s timeout, always returns a response). ADR-011 explicitly calls for a **new, separate** Async listener (fire-and-forget, no response) since HubSpot Workflow webhook actions don't wait for/use a response body the way EMS's own session-bearing frontend does. `QueueProcessor.ts` is the closest existing precedent for a standalone (non-`OnHttpRouter`) script entry point — its `export default async function(event: QueueProcessorEvent, context: Context<EV>): Promise<void>` (`QueueProcessor.ts:57`) shows the shape of a script with its own custom event-payload type and no `HttpEventResponse` return, which the new webhook listener's entry function will follow (with an HTTP-triggered event payload instead of a Scheduled Trigger one).

**Decision**: New standalone script (e.g. `OnAttendeeRegistrationWebhook.ts`) as its own ScriptRunner Connect **Async HTTP Event Listener**, registered independently of `OnHttpRouter`/`RouteGuard` (which are session/RBAC-shaped and don't fit an externally-triggered, no-session webhook). Auth: a shared secret (new `ATTENDEE_WEBHOOK_SHARED_SECRET` string Parameter, compared in constant time) plus a source-IP allowlist (new `ATTENDEE_WEBHOOK_ALLOWED_IPS: string[]` Parameter) — both parameter shapes already proven elsewhere in `EmsConfig` (`ALLOWED_ORIGINS: string[]`, `CELEBRATION_THEME_EMAIL?: string[]` for the list shape; plain strings like `GOOGLE_OAUTH_CLIENT_ID` for the secret shape). `EmsRequest.sourceIp` is already available for the IP check (confirmed, `types.ts:58`, already used server-side).

**Rate limiting**: Reuse `Utils/RateLimit.ts`'s `enforceRateLimit(bucket, identifier, ...)` keyed by `req.sourceIp` — this exact no-session/IP-keyed pattern is already established at `OnAuthExchange.ts:20` (`enforceRateLimit('auth-exchange', req.sourceIp || 'unknown')`), the closest existing precedent for "rate-limit an unauthenticated-by-session caller." A new bucket name (e.g. `attendee-webhook`) is all that's needed — no new mechanism.

**Audit**: `action` is a plain string with no central enum/type to extend (confirmed — `Types.ts:30,43`; only `docs/api-contract.md`'s "Known actions" prose list needs updating, per existing convention). New action, e.g. `attendee.registration.webhook`.

**Security note carried into the plan's Constitution Check**: this is the first inbound endpoint in the codebase authenticated by something other than session/RBAC — ADR-011 already flags it as needing a dedicated security-review pass before shipping, distinct from and in addition to the broader `X-SLICE15-002` vendor pentest.

## R-008: `RateLimitStore.ts` imports `RecordStorage` directly (pre-existing, not introduced here)

**Note**: `RateLimitStore.ts` imports `@sr-connect/record-storage` directly rather than composing `KeyValueStore`, which is an existing exception to the "single importer" rule (`Backend/CLAUDE.md`) predating this feature. Not this feature's concern to fix — noted here only so the new Attendee index store isn't built by copying that exception; it will compose `KeyValueStore` per ADR-006, matching `RegistrationCacheStore`/`CheckedInCounterStore`'s own convention.
