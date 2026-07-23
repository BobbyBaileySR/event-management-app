# Feature Specification: QR Ticket Emails

**Feature Branch**: `008-qr-ticket-emails`

**Created**: 2026-07-16

**Status**: Implemented — shipped 2026-07-16 (`FE-QR-GEN-001`/`BE-QR-GEN-001`, both moved to `TODO-DONE.md`); [ADR-010](../../docs/decisions/010-qr-ticket-email-single-send.md) Accepted, live UAT spike confirmed send/image-inject/Campaign-association. Code-complete pending `tasks.md` T036 (live UAT send test), T041 (operator quickstart §C sign-off), and T042 (`/review-security`) — all QA/governance gates, not missing implementation. *(Verified 2026-07-17.)*

**Input**: User description: "QR ticket emails — pre-event Campaign emails containing a per-recipient check-in QR code, sent via HubSpot from EMS."

**Depends on**: [005-email-dispatch](../005-email-dispatch/spec.md) — Compose/Scheduled/Dispatch log UX, admin RBAC, rate limiting, and the per-recipient send queue (`QueueProcessor`/`DispatchQueue`) this feature reuses rather than replaces. [003-check-in](../003-check-in/spec.md) — the existing QR scan/check-in path a delivered ticket is checked in through.

**Architecture reference**: [ADR-010](../../docs/decisions/010-qr-ticket-email-single-send.md) — settled via a `grill-with-docs` session and a live HubSpot UAT spike (2026-07-16). This spec encodes that decision as testable requirements; it does not re-derive it. Full narrative/history: [docs/design-notes/qr-ticket-email-campaigns.md](../../docs/design-notes/qr-ticket-email-campaigns.md).

**Product context**: [CONTEXT.md](../../CONTEXT.md) § QR check-in app (separate from staff EMS)

**Out of slice**: Governance (naming conventions / ownership boundary between Event outreach and general marketing — tracked as `HS-003`, a HubSpot Team conversation); a dedicated "Event Communications" HubSpot subscription type; automatic follow-up sends for attendees who register after a ticket dispatch has gone out (parked as `FE-QR-GEN-002`/`BE-QR-GEN-002`); any change to Slice 2's dispatch mechanics for templates that are not QR-tagged.

---

## Clarifications

### Session 2026-07-16 (`grill-with-docs` + live HubSpot UAT spike)

- Q: What subscription type should ticket emails use? → A: **Existing HubSpot subscription types** — no new "Event Communications" type for this slice (parked for later); an unsubscribed-but-registered attendee falls back to manual check-in.
- Q: How does EMS know a template needs a ticket? → A: **Detect the QR placeholder in the template body** — no operator-facing toggle, so staff can't forget to flip it.
- Q: Where should the transient QR image be hosted? → A: **HubSpot Files**, purged when the Event is archived.
- Q: What happens to attendees who register after a ticket dispatch has already gone out? → A: **Accepted gap for this slice** — no automatic follow-up; parked as a possible future "send on registration" trigger.
- Q: When does a ticket become invalid? → A: **After the Event has passed**; purged on Event archive.
- Q: When should the ticket be minted? → A: **Lazily, at send time**, riding the existing per-recipient dispatch queue — no registration webhook or catch-up job.
- Q: Does HubSpot support sending a Marketing Email to a list/segment via API? → A: **No** — confirmed via docs research; only a per-recipient Single-Send is API-triggerable.
- Q: Can a per-recipient image be injected into a marketing template without writing to the Contact record? → A: **Yes** — confirmed live via UAT spike.
- Q: Does the target email need extra one-time configuration beyond marking it "Automated"? → A: **Yes** — a further send-type setting is required and can only be set through HubSpot's API, not the drag-and-drop editor UI (found live during the spike; see ADR-010 for the exact mechanics).
- Q: Can ticket sends roll up into HubSpot Marketing Campaign reporting? → A: **Yes** — confirmed live via UAT spike.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Send a QR ticket email through the ordinary Compose flow (Priority: P1) 🎯 MVP

An **admin** sends or schedules an **Email dispatch** exactly as they do today (Slice 2 Compose flow) to **Registered attendees** for an Event, choosing a **HubSpot marketing template** that happens to contain the check-in QR placeholder. Without any extra step or setting, each recipient's copy of the email carries a **unique, scannable check-in code** tied to their own registration for that Event. On the day, staff scan that code through the existing **check-in scan path** (Slice 1) and it resolves to that recipient — not anyone else's identity. Templates that do **not** contain the placeholder continue to dispatch exactly as Slice 2 already does, with no behavior change.

**Why this priority**: This is the entire value proposition — tickets appear automatically inside the send flow staff already know, with zero new training or operator burden.

**Independent Test**: Admin composes/sends a dispatch using a QR-tagged template to two Registered attendees → each receives a distinct scannable code in their inbox → scanning attendee A's code at Check-in confirms attendee A (never attendee B) → the dispatch appears in the existing Dispatch log like any other send.

**Acceptance Scenarios**:

1. **Given** a HubSpot template containing the QR placeholder, **When** an admin sends or schedules a dispatch to Registered attendees using that template, **Then** each recipient's copy contains a unique, scannable check-in code for their own registration for that Event.
2. **Given** a template **without** the QR placeholder, **When** an admin sends a dispatch using it, **Then** the dispatch behaves exactly as Slice 2 does today — no ticket minting, no change in behavior.
3. **Given** a recipient with no ticket yet issued for that Event, **When** their dispatch is processed, **Then** EMS mints their ticket at that moment, with no separate operator action.
4. **Given** a recipient whose ticket was already minted and sent for that Event, **When** a later dispatch's audience includes them again (same template), **Then** their existing code is reused, not reissued — a ticket already delivered (or screenshotted) keeps working.
5. **Given** a delivered ticket, **When** staff scan it through the existing Check-in scan path, **Then** it resolves to that recipient's own Contact summary for that Event, and check-in succeeds (or reports "already checked in" on a duplicate scan).

---

### User Story 2 — Undeliverable ticket falls back to normal on-site check-in (Priority: P2)

Because ticket emails go out through HubSpot's standard marketing-consent path, a **Registered attendee** who has previously unsubscribed from HubSpot marketing communications does **not** receive the ticket email. On the day, staff can still check that person in via the existing **name search** or **walk-in** check-in paths (Slice 1) — a missing code never blocks entry.

**Why this priority**: A known, deliberately accepted trade-off (see ADR-010 Decision #8) — confirming the fallback still works end-to-end matters for confidence, but it's secondary to the primary send/scan flow (US1).

**Independent Test**: Mark a test Contact as unsubscribed from HubSpot marketing → send a QR ticket dispatch that includes them in the audience → confirm HubSpot does not deliver the ticket email to them → confirm staff can still find and check that Contact in via name-search check-in on the day.

**Acceptance Scenarios**:

1. **Given** a Registered attendee unsubscribed from HubSpot marketing communications, **When** a QR ticket dispatch is sent to an audience including them, **Then** they do not receive the ticket email.
2. **Given** that same attendee arrives on-site without a code, **When** staff use name search or walk-in check-in, **Then** they can still be checked in normally.

---

### User Story 3 — Ticket sends roll up into HubSpot Campaign reporting (Priority: P3)

When a QR-tagged template has already been associated to a HubSpot **Marketing Campaign** (a one-time HubSpot-side setup, outside EMS), tickets sent through that template automatically appear in that Campaign's own HubSpot analytics — so marketing/ops stakeholders can see ticket-email performance without a separate EMS reporting surface.

**Why this priority**: Reporting visibility for the wider marketing team; not required for a ticket itself to function, so lowest priority.

**Independent Test**: With a template already Campaign-associated in HubSpot, send a ticket dispatch → open that Campaign's analytics in HubSpot → confirm the send appears there.

**Acceptance Scenarios**:

1. **Given** a QR ticket template already associated with a HubSpot Marketing Campaign, **When** EMS sends a dispatch using it, **Then** that send's activity is visible in the Campaign's own HubSpot analytics.
2. **Given** a QR ticket template with **no** Campaign association, **When** EMS sends a dispatch using it, **Then** the send still succeeds and delivers tickets normally — Campaign association is optional, never required for delivery.

---

### Edge Cases

- **Late registrant after a ticket dispatch has already gone out** — no automatic follow-up ticket in this slice (accepted gap); any follow-up is a separate, manually-initiated dispatch by staff.
- **Recipient appears in a later dispatch's audience for the same Event** — their existing ticket is reused, never reissued; a previously delivered/screenshotted code keeps working.
- **Event archived** — tickets are purged; a code from a passed/archived Event is treated as dead. On-site check-in doesn't normally occur after archive, so this is a data-hygiene concern, not a live-entry one.
- **Template edited in HubSpot to remove or rename the QR placeholder mid-flight** — subsequent dispatches using it silently stop producing tickets and behave as an ordinary Slice 2 send (no error). The Dispatch log's ticket indicator (FR-006) is what lets staff notice this after the fact.
- **Duplicate/concurrent dispatch attempts before a ticket mint completes** — minting is idempotent ("mint if missing"); the same dedupe guarantees Slice 2 dispatch actions already have apply.
- **Non-admin roles** — Email/dispatch remains admin-only exactly as in Slice 2 (`NFR-002` there); this feature does not loosen that gate.
- **Hostile/malformed values reaching any operator-facing ticket-status display** (e.g. the Dispatch log's ticket indicator) — rendered as plain text/state only, never unsafe HTML, consistent with existing Slice 2 XSS guarantees.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: When an admin sends or schedules an Email dispatch (Slice 2 Compose flow) using a HubSpot marketing template, system MUST detect whether that template contains the check-in QR placeholder, without requiring an operator-set flag.
- **FR-002**: For each recipient of a dispatch using a QR-tagged template, system MUST ensure a check-in ticket exists for that recipient + Event pairing before sending, minting one only if it does not already exist. An existing ticket MUST NOT be reissued or rotated by a later dispatch.
- **FR-003**: System MUST deliver each ticket as a distinct, scannable QR image unique to that recipient, embedded in their copy of the email, **without** writing the ticket or its image URL as a durable property on the recipient's HubSpot Contact record.
- **FR-004**: A delivered ticket MUST be scannable and checked in through the existing check-in scan path (Slice 1), resolving to that specific recipient's Contact summary for that specific Event.
- **FR-005**: Dispatches using templates **without** the QR placeholder MUST behave identically to standard Slice 2 dispatch — no ticket minting, no behavior change.
- **FR-006**: The Dispatch log (Slice 2) MUST indicate, for each past dispatch, whether it generated tickets, so staff can distinguish ticket sends from ordinary sends after the fact.
- **FR-007**: System MUST respect each recipient's HubSpot marketing communication consent for ticket sends — a recipient who has unsubscribed from marketing communications MUST NOT receive the ticket email through this flow.
- **FR-008**: A recipient who does not receive their ticket email (e.g. due to consent) MUST remain checkable via the existing manual check-in paths (name search, walk-in) — an undelivered ticket MUST NOT block on-site entry.
- **FR-009**: System MUST NOT provide, in this slice, an automatic follow-up ticket send for attendees who register after a ticket dispatch has already gone out for that Event — any follow-up is a manual, staff-initiated dispatch.
- **FR-010**: A recipient's ticket MUST become permanently invalid once the Event has passed, and MUST be purged from storage when the Event is archived (aligned with existing check-in data purge behavior).
- **FR-011**: System MUST ensure the underlying HubSpot email eligibility for per-recipient sending (the template's send-type configuration) is satisfied as part of delivering a ticket dispatch — this is a one-time-per-template outcome, not a per-send staff action.
- **FR-012**: All ticket-dispatch behavior (ticket mint, send) MUST be covered by the same audit, rate-limit, and RBAC guarantees Slice 2 dispatches already have (admin-only, audited, rate-limited) — no separate or weaker gate for ticket sends.

### Non-Functional / Security

- **NFR-001**: No ticket-signing key or ticket-minting logic MUST ever run in the staff browser — minting stays entirely server-side, mirroring the existing check-in JWT guarantee.
- **NFR-002**: Any operator-facing ticket-status indicator (e.g. the Dispatch log's ticket flag) MUST render as plain text/state, never unsafe HTML.
- **NFR-003**: Ticket delivery MUST NOT introduce a new durable HubSpot write of PII beyond what Slice 2 dispatch already writes — no new permanent per-recipient properties on the Contact record.

### Key Entities

- **Check-in ticket**: a per-recipient, per-Event credential proving a specific Contact's registration for a specific Event; minted once, reused across sends, invalid once the Event has passed.
- **QR-tagged template**: a HubSpot marketing email template containing the check-in QR placeholder, detected automatically rather than operator-flagged.
- **Ticket dispatch**: an ordinary Slice 2 Email dispatch whose selected template happens to be QR-tagged, causing per-recipient ticket delivery as a side effect of the normal send/schedule flow — not a separate dispatch type from the staff's perspective.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An admin can send a dispatch containing working, per-recipient check-in tickets using the **exact same** Compose flow as any other dispatch — no additional steps, screens, or training beyond Slice 2 itself.
- **SC-002**: 100% of delivered ticket emails in QA testing contain a code that resolves, on scan, to the correct individual recipient for the correct Event — never another recipient's identity.
- **SC-003**: A recipient who didn't receive a ticket (e.g. unsubscribed) can still be checked in on-site in the same time as any ordinary walk-in — no special-cased delay.
- **SC-004**: Staff can determine, from the Dispatch log alone, whether a given past dispatch generated tickets, without inspecting the HubSpot template itself.

---

## Assumptions

- [ADR-010](../../docs/decisions/010-qr-ticket-email-single-send.md)'s architecture (event+contact JWT identity, lazy mint at send, HubSpot Marketing Single-Send v4, per-recipient inline image injection, optional Campaign association) is settled and not reopened by this spec.
- **Slice 2** (Email dispatch, `005-email-dispatch`) is shipped; its Compose/Scheduled/Dispatch-log UX, RBAC, and rate-limit are already in force. This feature extends dispatch behavior — it does not rebuild it.
- The **HubSpot Team** is responsible for authoring the QR-tagged template itself (adding the placeholder and any one-time HubSpot-side send-type configuration) — EMS detects and uses it, it does not author it.
- Governance (naming conventions, ownership boundary between Event outreach and general marketing) is intentionally out of scope for this spec — tracked separately (`HS-003`).
- A dedicated "Event Communications" HubSpot subscription type is not part of this slice — tickets ship under existing subscription types, accepting the consent-driven delivery gap described in User Story 2.
- An automatic "send on registration" follow-up for late registrants is out of scope for this slice — tracked as a future, separately parked capability (`FE-QR-GEN-002`/`BE-QR-GEN-002`).
- Surfacing whether a past dispatch generated tickets (FR-006) is a reasonable default consistent with this codebase's existing audit-everything posture — not treated as an open question.

---

## Out of Scope

- A dedicated HubSpot subscription type for ticket/event communications (parked, future).
- Automatic follow-up ticket sends for late registrants / a "send on registration" trigger (parked as `FE-QR-GEN-002`/`BE-QR-GEN-002`).
- The governance/naming/ownership conversation with the HubSpot Team (tracked as `HS-003`, separate from this build).
- Any new EMS-side template authoring or editing tool — templates remain HubSpot-only, consistent with Slice 2's existing exclusion.
- Creating the actual HubSpot Campaign association for a given template (a one-time HubSpot-side action) — EMS relies on it existing if present, but does not create it.
- Any change to Slice 2's core dispatch/audience/scheduling mechanics for templates that are not QR-tagged.
