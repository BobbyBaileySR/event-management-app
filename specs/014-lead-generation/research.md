# Research: HubSpot Lead Generation

## R-001: Is the HubSpot Leads API mechanics research from ADR-018 sufficient to build against?

**Decision**: Yes — no further technical research needed before Phase 1 design.

**Rationale**: ADR-018 already researched HubSpot's own developer documentation for the Leads API before designing: `POST /crm/v3/objects/leads`, required `hs_lead_name`, optional `hs_lead_type`/`hs_lead_label`, a required Contact association (`associationCategory: HUBSPOT_DEFINED` + numeric `associationTypeId`), custom-property support identical to other CRM objects, and the two OAuth scopes needed (`crm.objects.leads.read`/`write`). The follow-on gap review further settled the update mechanic (HubSpot Notes, not property concatenation) and the provenance-check requirement. Nothing about *how to call the API* remains open — only *which specific values* (`associationTypeId`, `hs_lead_type`/`hs_lead_label`) apply on this live portal, which are HubSpot-admin confirmations (`HS-016`/`HS-017`), not engineering research.

**Alternatives considered**: N/A — this phase is a confirmation pass.

## R-002: How should the existing large-batch-confirmation mechanism be reused for bulk Lead generation?

**Decision**: Reuse `Utils/DispatchValidation.ts`'s `assertLargeSendConfirmed(count, threshold, confirmed)` directly — its signature is already generic (a count, a threshold, a confirmed flag), not intrinsically email-specific despite living in a dispatch-named file and using `largeSendConfirmed`/`large_send_confirmation_required` naming. Call it from `OnPostAttendeeLeadBatch.ts` with the batch's attendee count and a **new**, separately-configurable threshold (do not assume the same numeric threshold as email dispatch's `DISPATCH_CONFIRM_THRESHOLD` fits Lead generation's risk profile) and a request-body field named for this context (e.g. `batchConfirmed`, not `largeSendConfirmed`, to avoid implying a "send" in this feature's request shape).

**Rationale**: The function's actual logic has no email-specific behavior — it's a threshold comparison and a typed error. Reusing it directly (rather than copy-pasting an equivalent) avoids duplicating a security-relevant gate. Using this feature's own request-field name and threshold constant avoids conflating two different large-batch risk profiles (send volume vs. CRM record creation volume) under one shared config value, which could make future threshold tuning for one feature accidentally affect the other.

**Alternatives considered**: Copy the function's logic into a new Lead-generation-specific helper — rejected as needless duplication of a security-relevant check for no real behavioral difference. Sharing the exact same `DISPATCH_CONFIRM_THRESHOLD` constant — rejected, since there's no reason a sensible email-send threshold and a sensible Lead-generation threshold must be numerically identical.

## R-003: Where does the "generate for everyone who attended" case actually happen in the UI?

**Decision**: No separate mechanism — it's the existing Attendee list's own multi-select (per ADR-018 decision #2), simply with every row selected. `OnPostAttendeeLeadBatch.ts` takes a plain `contactIds` array; it has no concept of "select all" as a distinct server-side mode.

**Rationale**: Already settled in ADR-018; restated here only to confirm it doesn't reopen the plan's API design — the batch route's contract needs no special "whole event" parameter, just the list the Frontend's existing selection state already produces.
