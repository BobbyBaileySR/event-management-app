# Phase 0 Research: Attendee Detail Modal (Attendee Journey)

No `[NEEDS CLARIFICATION]` markers were left in `plan.md`'s Technical Context — the `/grill-with-docs` session before this plan already resolved every product/UX/architecture decision (see [ADR-014](../../docs/decisions/014-attendee-communications-hubspot-engagement-pull.md) and `CONTEXT.md` § **Attendee journey** / **Attendee communications view**). This file documents the remaining *implementation-level* research needed before Phase 1 design, plus a short record of the decisions ADR-014 already made (for traceability from this plan without re-reading the ADR).

## R-001: Exact HubSpot API/scope for Contact engagement/timeline reads

**Decision**: Not yet resolved — tracked as [`HS-011`](../../docs/hubspot-ops-todo.md) in `hubspot-ops-todo.md`. Must be confirmed with a HubSpot admin before `Backend/scripts/Utils/HubSpot/` gets its new adapter method.

**Rationale**: ADR-014 confirmed the portal is on Enterprise tier, which clears the tier gate that blocks template-content reads (`HS-009`). But "Enterprise tier" only means the *feature* is available on this portal — it doesn't identify the specific API/scope. Engagement/timeline history for a Contact is a materially different HubSpot surface (likely the CRM Engagements API or the Contact Timeline API) from the Marketing Email content API `HS-009` is blocked on — conflating the two would risk requesting/documenting the wrong scope.

**Alternatives considered**: Assume it's the same `content` scope as `HS-009` and proceed. Rejected — `HS-011` explicitly warns against this assumption; confirming with a HubSpot admin is cheap and avoids building against the wrong endpoint.

## R-002: Dedup strategy between EMS's own dispatch log and HubSpot's engagement history

**Decision**: Best-effort match by `(recipient email or contactId) + timestamp proximity + template/subject name` — not an exact id-based join, since EMS dispatch records don't capture a HubSpot-side message/engagement id today.

**Rationale**: Decided in ADR-014. EMS's own dispatch send is *also* a HubSpot send under the hood (via Marketing Single-Send v4), so the same email will appear in both EMS's dispatch-recipient record and HubSpot's engagement history for that Contact. Without a shared id, timestamp+template matching is the cheapest way to avoid showing the same email twice.

**Alternatives considered**: Start capturing a HubSpot message/engagement id on every dispatch send now, enabling exact correlation. Rejected for this feature's v1 — it's real Backend work on the *send* path (`Backend/scripts/` dispatch handlers), out of scope for a read-only detail modal; noted in ADR-014's Consequences as a future improvement, not blocking this plan.

## R-003: Audit metadata shape for `attendee.communications.view_all`

**Decision**: Follow the existing audit metadata convention exactly — `eventId`, `contactId` (per `checkin.scan`'s existing precedent of logging `contactId`), and `adapterVersion` where relevant. **No attendee email or name in the audit row**, matching every other Slice 1/1.5 audited action (`attendees.list`, `checkin.scan`, etc. — see `api-contract.md`'s audit sections).

**Rationale**: This is the one new *pattern* this feature introduces (first audited GET), but the metadata shape itself should not deviate from the established "no PII in audit rows" rule just because the underlying read is richer.

**Alternatives considered**: Log the count/kind of non-Event items surfaced (e.g. `otherEventCount`, `externalCount`) for investigative value. Not rejected — left as an option for `/speckit-tasks` to size, since it adds real audit value without PII exposure; not a blocking research question.

## R-004: Where the "earliest event-related timestamp" cap is computed

**Decision**: Computed server-side, in the same handler that serves `GET attendees/{contactId}/communications` — derived from the attendee's own event-journey data (the earliest of: registration timestamp once available, or today, the earliest dispatch-sent timestamp for the current Event) before the HubSpot engagement-history call is even made, so the cap can be passed as a filter into that call rather than fetched-then-discarded client-side.

**Rationale**: Keeps the "unbounded external history" risk (ADR-014's core concern) contained entirely inside the Backend — the Frontend never receives, and therefore never has to filter out, communications older than the cutoff.

**Alternatives considered**: Fetch the full HubSpot history and filter client-side. Rejected — pulls unnecessary data across the wire and duplicates filtering logic in two places.

## Summary

All four items above are either already decided (R-002, R-003 follow existing conventions; R-004 is a straightforward server-side design choice) or explicitly tracked as pending ops work outside this plan's control (R-001, `HS-011`). None block writing `data-model.md` or `contracts/` — the two new routes' request/response shapes are fully specifiable regardless of R-001's outcome (the adapter method's *internal* HubSpot call detail is an implementation detail behind the route contract, not part of it).
