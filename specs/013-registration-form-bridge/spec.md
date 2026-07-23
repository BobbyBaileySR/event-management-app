# Feature Specification: Registration Form Bridge — Multi-Event Slots + Registration-Answer History

**Feature Branch**: `013-registration-form-bridge`

**Created**: 2026-07-20

**Status**: Draft — design settled via `grill-with-docs` (2026-07-20), not yet built.

**Input**: User description: "Registration form bridge — multi-event registration slots + registration-answer history. Full design already settled via grill-with-docs (2026-07-20) and recorded in Frontend/docs/decisions/017-registration-slots-and-answer-history.md — use that ADR as the primary source of truth... ten fixed HubSpot registration 'slots'... a new Backend Record Storage store holding per-contact-per-event registration-answer history... an extension to the existing OnAttendeeRegistrationWebhook contract... a new 'Registration history' panel in the Attendee Detail modal... Explicitly out of scope: a general-purpose Record Storage viewer, self-service withdrawal via resubmission, an automated webhook-failure-recovery tool, and a reconciliation sweep for this store."

> Grounded in [ADR-017](../../docs/decisions/017-registration-slots-and-answer-history.md) — see that ADR for the full rationale and rejected alternatives. This spec restates its settled decisions as testable requirements; it does not re-derive them.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Register for several events in one submission (Priority: P1) 🎯 Foundation

A prospective attendee fills out the public registration form once and selects several events they're interested in; every selected event registers them, from that single submission — no separate form pass per event.

**Why this priority**: This is the root capability everything else depends on — the multi-page, multi-select pain point that motivated this feature in the first place.

**Independent Test**: Can be fully tested by submitting the form with more than one event selected and confirming the person appears as a registered attendee for every event they selected — using the existing attendee list, no other story needs to be built first.

**Acceptance Scenarios**:

1. **Given** the form offers several events for selection, **When** a person selects more than one and submits, **Then** they become a registered attendee for every event they selected, from that one submission.
2. **Given** a person selects only one event, **When** they submit, **Then** they are registered for that event only.

---

### User Story 2 - Follow-up answers are captured and never overwritten (Priority: P1)

When a person selects an event that has a follow-up question (e.g. what they'd like to discuss in a private meeting), their answer is captured and preserved — even if they later resubmit the form with a different answer for the same event.

**Why this priority**: This is the core data-preservation goal motivating the whole feature — today this data is wiped and reused every event cycle, making it impossible to know what someone said last time.

**Independent Test**: Can be fully tested by submitting an answer to a follow-up question for an event, then submitting again with a different answer for the same event, and confirming both answers remain available afterward — not just the latest one.

**Acceptance Scenarios**:

1. **Given** an event has a follow-up question, **When** a person answers it and submits, **Then** that answer is stored against that person and that event.
2. **Given** a person previously answered a follow-up question for an event, **When** they resubmit the form with a different answer for the same event, **Then** both the original and the new answer remain available — the new submission does not erase the old one.

---

### User Story 3 - Staff can see everything an attendee has said (Priority: P2)

An events team member looking at a specific attendee's detail for a specific event can see every answer that attendee has ever given to that event's follow-up questions, across every submission or amendment, with when each was submitted.

**Why this priority**: The history captured in User Story 2 only has value if staff can actually see it — without a view, the preserved data is inert.

**Independent Test**: Can be fully tested by seeding registration-answer history for an attendee and event, then opening that attendee's detail view and confirming every recorded answer appears with its submission time, without needing to inspect any underlying data store directly.

**Acceptance Scenarios**:

1. **Given** an attendee has submitted one or more sets of answers for an event, **When** staff view that attendee's detail for that event, **Then** they see every recorded answer along with when it was submitted.
2. **Given** an attendee has no recorded answers for an event, **When** staff view that attendee's detail, **Then** the view clearly indicates there is nothing on file, rather than appearing broken or ambiguously blank.

---

### User Story 4 - The form can grow without breaking existing registrations (Priority: P3)

As new events are added to the registration form over time, staff can offer several events concurrently without needing an ever-growing, unbounded amount of per-event configuration, and reassigning a concurrent "slot" from a finished event to a new one doesn't disturb the finished event's own recorded history.

**Why this priority**: Lower priority than the stories above since it's about sustaining the feature over time rather than something an end-user directly experiences at submission — but still an explicit design goal (bounded growth, non-disruptive evolution), not an afterthought.

**Independent Test**: Can be tested by confirming the system supports the documented number of concurrently offered events without requiring new per-event infrastructure categories, and by confirming that reassigning a slot from an ended event to a new one leaves the ended event's own history unchanged and correctly attributed.

**Acceptance Scenarios**:

1. **Given** the form is currently offering its supported number of concurrent events, **When** staff want to add one more concurrently offered event, **Then** the constraint is a known, plan-around-able limit — not a silent data-corruption risk.
2. **Given** a concurrent-event slot is reassigned from an ended event to a new one, **When** people submit answers under the new assignment, **Then** the ended event's previously recorded history remains intact and correctly attributed to it, not the new event.

---

### Edge Cases

- What happens when someone resubmits the form and doesn't reselect an event they'd previously registered for? They remain registered for that event — the form provides no way to self-withdraw; removing a registration stays a staff-only action outside this feature.
- What happens if the notification carrying a submission's answers fails to reach the system? The underlying answer is not permanently lost — it still exists in the registration form platform's own submission record — but it will not automatically appear in staff's history view; recovering it there is a manual step, not automatic.
- What happens when two submissions for the same person and the same event arrive at nearly the same instant? Neither is silently dropped — at most, a narrow, low-probability timing window exists where write ordering isn't formally guaranteed, but data loss is not acceptable.
- What happens to an answer submitted through a question that allows selecting more than one option (e.g. a checkbox-style question), rather than free text? The multiple selected values are preserved and distinguishable from a single free-text answer, not flattened into an ambiguous string.
- What happens when the text someone submits contains something that looks like code or markup? It is shown to staff as plain text, exactly as submitted — never interpreted or rendered as active content.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow a person to register for more than one event in a single form submission.
- **FR-002**: System MUST support at least 5 events being concurrently offered for selection at once, with a documented ceiling of 10 — not one-configuration-per-event-ever-created.
- **FR-003**: System MUST capture and permanently retain every answer a person gives to an event's follow-up question(s), including across repeated submissions for the same event, without ever discarding an earlier answer to record a later one.
- **FR-004**: System MUST record, for every retained answer, which event and which person it belongs to and when it was submitted.
- **FR-005**: System MUST let staff view every retained answer (with its submission time) for a specific attendee and a specific event through the existing staff-facing attendee tools — without inspecting underlying storage directly.
- **FR-006**: System MUST support follow-up questions whose answer is either free text or a selection of one or more predefined options, and MUST preserve which kind of answer was given.
- **FR-007**: System MUST display every retained answer to staff exactly as submitted, as plain text/data — never interpreted as active markup or code. This applies with no exceptions, since these answers are the first data in this system authored directly by an anonymous member of the public.
- **FR-008**: System MUST NOT treat a resubmission that omits a previously-selected event as a request to withdraw that person's existing registration for that event — registration removal remains a staff-only action outside this feature.
- **FR-009**: If a submission's notification to the system fails to be delivered, System MUST NOT cause the underlying answer to be permanently unrecoverable — it must remain retrievable from the registration form platform's own submission record, even though it will not automatically appear in the staff-facing history view without manual retrieval.
- **FR-010**: System MUST NOT silently lose one of two submissions for the same person and the same event occurring at nearly the same time — a narrow, low-probability ordering ambiguity is acceptable; data loss is not.
- **FR-011**: System MUST NOT change who is authorized to view attendee/registration data — existing access rules apply unchanged to the new history view.
- **FR-012**: System MUST NOT change which platform is the authoritative source of who is registered for what — this feature adds captured supplementary answers and a way to view them, not a new registration authority.

### Key Entities

- **Registration slot**: One of a bounded, reusable set of concurrent-event assignments on the registration form, letting several events be offered for selection at once without one-configuration-per-event-ever infrastructure. Reassignable between events over time; reassignment does not alter a previously-assigned event's own recorded history.
- **Registration answer**: A single response to one event's follow-up question, tied to one person and one event, stamped with when it was submitted.
- **Registration answer history**: The complete, ordered set of every registration answer ever submitted for one person and one event — never pruned or overwritten by a later submission.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A person interested in multiple events can register for all of them without submitting the form more than once.
- **SC-002**: 100% of previously submitted follow-up answers remain visible to staff after any number of later resubmissions for the same event — none are ever lost to a later submission.
- **SC-003**: Staff can find out what a specific attendee said about a specific event, across every time they submitted, without leaving the attendee-lookup tool they already use day to day.
- **SC-004**: The registration form can offer at least 5 events concurrently (growing to 10) without new, event-specific configuration being built for each one beyond assigning it to an available slot.
- **SC-005**: Reassigning which event a slot represents does not alter or misattribute any previously recorded answer history belonging to the event that slot was previously assigned to.

## Assumptions

- This spec is grounded entirely in the already-settled design in [ADR-017](../../docs/decisions/017-registration-slots-and-answer-history.md) — decisions made there (10-slot ceiling with 5 provisioned initially, one combined notification per slot rather than two, no automatic reconciliation sweep for this history, manual-only recovery from a failed notification, full-form resubmission as the only amendment path, no self-service withdrawal, a general storage-browsing tool being explicitly out of scope) are treated as settled inputs here, not re-derived.
- "Concurrently offered events" (FR-002/SC-004) means events open for registration on the live form at the same time — not the total number of events ever created across all time.
- The staff-facing history view (FR-005) is added to the existing attendee-detail tool staff already use for a specific event and attendee, not a new standalone screen.
- Free-text answers may be arbitrarily authored by any anonymous member of the public; FR-007's plain-text-only display requirement exists specifically because of this and is a hard requirement, not a nice-to-have.
- The registration-form platform itself (not this system) remains the durable fallback source for a submission's raw answer if a delivery notification ever fails (FR-009) — this feature does not duplicate that platform's own submission storage, and does not build an automated tool to pull from it.
- Coordination work on the registration-form-authoring side (assigning slots to events, building the notification pathway, any form-side logic needed to package multi-question answers) is tracked separately as operational/coordination work with the team that owns the form ([hubspot-ops-todo.md](../../docs/hubspot-ops-todo.md) `HS-001`/`HS-013`/`HS-014`) and is out of scope for this spec's functional requirements, which cover only this system's behavior once a submission's data reaches it.
- Explicitly out of scope for this spec (per ADR-017, deliberately deferred, not overlooked): a general-purpose tool for browsing all stored data for troubleshooting, self-service withdrawal from a previously-selected event, and an automated tool to recover a lost submission notification.
