# Attendee Registration Webhook — Contract (011)

**Status**: **Confirmed working** — the webhook step was added to the HubSpot registration Workflow and verified end-to-end live on UAT 2026-07-21 (a real registration produced a real request; the attendee appeared in EMS's Attendees list without waiting for the reconciliation sweep). Roster-field mechanics below are confirmed against the real payload; `answers`/`slot` (013-registration-form-bridge) remain provisional since the answer-bundling script (`HS-013`) isn't built yet. This is **not** a Frontend-consumed route and is **not** added to `Frontend/docs/api-contract.md`'s Frontend-facing route list — it's an internal HubSpot→Backend integration point, documented here for implementation and security-review purposes.

**RBAC**: N/A — this endpoint has no user session at all. Authenticated instead by shared secret + source-IP allowlist (see below), per [ADR-011](../../../docs/decisions/011-attendee-index-freshness.md).

---

## `POST` — new Async HTTP Event Listener (script: `OnAttendeeRegistrationWebhook`)

A **fire-and-forget** endpoint (Async HTTP Event Listener — no response body is meaningfully consumed by the caller; HubSpot Workflow webhook actions don't wait on or branch on the response the way a synchronous integration would).

### Request

| Field | Source | Notes |
| :--- | :--- | :--- |
| `X-Attendee-Webhook-Secret` | Header | **Confirmed** — sent exactly as named (hyphenated), via the webhook action's "API Key" auth mode (its "signature" auth mode is a different, HubSpot-app-specific mechanism and doesn't apply here). Compared in constant time against the `ATTENDEE_WEBHOOK_SHARED_SECRET` Parameter. Missing/mismatched → reject, no index write, no further processing. |
| Source IP | Transport (`EmsRequest.sourceIp`) | Checked against the `ATTENDEE_WEBHOOK_ALLOWED_IPS` Parameter. **Confirmed HubSpot's webhook egress is a pool, not one static IP** (observed `54.178.62.x` on UAT, varying last octet) — the Parameter now supports CIDR entries (e.g. `54.178.62.0/24`) alongside exact IPs. Not matched → reject, same as a bad secret. |
| `contactId` | Body (HubSpot Workflow custom webhook token — the enrolled Contact's own Record ID) | **Confirmed sent as a raw JSON number, not a quoted string** (e.g. `208033113641`) — the handler explicitly coerces with `String(...)` immediately after parsing; do not assume string typing from the wire body itself. |
| `eventId` | Body (HubSpot Workflow custom webhook token) | **Confirmed sent as a raw JSON number** (e.g. `58317473796`) — same coercion as `contactId`. This must be the target Event Item's HubSpot **Record ID**, not `registration_slug` (the Workflow only has the slug from its match-key trigger) — resolved via a "copy property from associated record" Workflow action that reads the just-associated Event Item's Record ID onto a staging Contact property *before* the webhook action fires, which is then mapped as this token. |
| Roster/display fields (`firstName`, `lastName`, `company`, `email`, `accountManager`, `attendeeType`) | Body (HubSpot Workflow custom webhook tokens) | **Confirmed** — all six present on a real payload (empty string, not absent, for `company`/`accountManager` when unset). Any field not included on a given notification is left to the next reconciliation sweep to fill in, not treated as an error. |
| Registration-observed timestamp | Body, or defaulted to receipt time if HubSpot doesn't provide one | **Not present on the confirmed real payload** — falls back to receipt time as designed, per `rosterObservedAt` (ADR-012, data-model.md). Not currently mapped in the Workflow's webhook action; revisit only if drift between registration time and receipt time ever matters in practice. |
| `answers` (optional) | Body (the submitting slot's `ems_reg_answers_N` field value, passed through as a Workflow custom webhook token) | **Added 2026-07-20, `013-registration-form-bridge` — [ADR-017](../../../docs/decisions/017-registration-slots-and-answer-history.md).** JSON-encoded bundle of the slot's follow-up question(s) and answer(s) at submission time. Absent when the submitting slot had no follow-up questions — existing roster-field processing below is entirely unaffected either way; this is a strictly additive field, not a breaking change to this contract. |
| `slot` (optional) | Body (a literal per-workflow constant — each of the ten slot workflows hardcodes its own slot number as a webhook token value) | **Added 2026-07-20, `013-registration-form-bridge`.** Which registration slot (1-10) fired this notification — carried onto the stored history entry as informational metadata only (never used for lookup, data-model.md). Field name is a best-effort guess like the rest of this body (see `OnAttendeeRegistrationWebhook.ts`'s docstring) — not yet in a finalized Workflow webhook token list. Absent/non-numeric defaults to `0` ("unknown") rather than blocking the answers append. |

### Processing

1. Verify shared secret + source IP. Reject (no index write, no audit entry beyond a rejected-attempt record if this system's rate-limit/audit conventions call for one) if either check fails.
2. Rate-limit by source IP via the existing `Utils/RateLimit.ts` mechanism (new `attendee-webhook` bucket) — same shape as `OnAuthExchange.ts`'s existing IP-keyed, no-session rate limit.
3. Apply a registration write-through to the Attendee index: add `contactId` to the Event's manifest if not already present, write the roster/display fields with the incoming `rosterObservedAt` (field-scoped, guarded — data-model.md's write rule).
3a. **(013)** If `answers` is present and parses as JSON, determine `source` (`registration` if this is the first entry ever recorded for this `{eventId, contactId}` pair, `amendment` otherwise) and append `{ answers, source, observedAt, slot }` to the registration-answer history store for this pair (never overwrite — see `013-registration-form-bridge/data-model.md`; `slot` defaults to `0` when the body omits it). Absent or unparseable `answers` does not affect step 3 above in any way.
4. Record an audit entry (`attendee.registration.webhook` or equivalent — no attendee email/name in the audit metadata, matching this system's existing PII-in-audit-metadata convention). **(013)** When step 3a applied an entry, extend this same audit entry's metadata with `answersCaptured: true` and `answerCount: <number of keys>` — never the answer text itself. No second, separate audit action for this.

### Response

Since this is an Async listener, the response is not meaningfully consumed by HubSpot's Workflow — a minimal acknowledgement is still returned for logging/debugging purposes on this system's side, not as a contract HubSpot depends on.

### Errors (as observed from this system's own logs, not surfaced to any UI)

- Auth failure (bad secret / disallowed source IP): rejected before any index write.
- Rate limited: rejected, same as any other `Utils/RateLimit.ts` consumer.
- Missing `eventId`/`contactId`: rejected — cannot write-through without knowing what to write.

---

## No change

- `GET events/{eventId}/attendees` — request/response shape, RBAC, and error codes are unchanged (data-model.md).
- `Frontend/docs/rbac.md` — no row change; this isn't a session-authenticated route, so it doesn't participate in the RBAC matrix the way `admin`/`viewer` routes do. Documented instead as a security-review item (plan.md Constitution Check) tracked outside `rbac.md`'s scope.
