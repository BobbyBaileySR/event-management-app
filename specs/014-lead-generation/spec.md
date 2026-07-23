# Feature Specification: HubSpot Lead Generation from Event Attendees

**Feature Branch**: `014-lead-generation`

**Created**: 2026-07-21

**Status**: Draft — design settled via `grill-with-docs` (2026-07-21) plus a follow-on 5-item gap review, not yet built.

**Input**: User description: "Give EMS the ability to generate leads. Leads should be created from people attending the event, and since the information on what they were interested in now lives primarily in EMS, staff need to be able to generate leads in HubSpot carrying that information with them."

> Grounded in [ADR-018](../../docs/decisions/018-hubspot-lead-generation.md) — see that ADR for the full rationale, researched HubSpot mechanics, and rejected alternatives. This spec restates its settled decisions as testable requirements; it does not re-derive them. Depends on [013-registration-form-bridge](../013-registration-form-bridge/spec.md)'s registration-answer history as its data source.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Generate a Lead for one attendee, with real context (Priority: P1) 🎯 Foundation

An events team member looking at an attendee who seems worth a sales follow-up clicks a "Generate Lead" action. This creates a Lead in the sales system carrying what that attendee actually said they were interested in — not just a record that they attended something.

**Why this priority**: This is the entire point of the feature — the whole reason to build it is so sales has real context, not a content-free flag.

**Independent Test**: Can be fully tested by generating a Lead for a single attendee who has a recorded interest (e.g. a private-meeting topic) and confirming the Lead exists in the sales system with that content attached.

**Acceptance Scenarios**:

1. **Given** an attendee has a recorded interest for the current event, **When** staff generate a Lead for them, **Then** a Lead is created carrying that interest as context.
2. **Given** an attendee has **no** recorded interest for the current event, **When** staff generate a Lead for them, **Then** a Lead is still created (attendance alone is a valid reason), with no interest context attached rather than the action being blocked.

---

### User Story 2 - Generating again never creates a duplicate (Priority: P1)

If staff generate a Lead for someone who already has one from this feature (e.g. from an earlier event), the existing Lead is updated with the new context instead of a second Lead being created. If that person has a Lead that wasn't created by this feature, it's left alone entirely, and a new, separate Lead is created instead.

**Why this priority**: Without this, using the feature across multiple events for the same person creates CRM clutter, and worse, could silently corrupt a salesperson's own unrelated work — a data-integrity requirement, not a nice-to-have.

**Independent Test**: Can be fully tested by generating a Lead for the same attendee twice (for two different events) and confirming only one Lead exists afterward, updated to reflect both events' activity — then separately, generating for an attendee who already has a Lead created outside this feature, and confirming that Lead is untouched while a new one appears.

**Acceptance Scenarios**:

1. **Given** an attendee already has a Lead this feature created, **When** staff generate a Lead for them again, **Then** the existing Lead is updated to reflect the new activity — no second Lead appears.
2. **Given** an attendee has a Lead that was **not** created by this feature, **When** staff generate a Lead for them, **Then** that existing Lead is left completely unchanged, and a new, separate Lead is created instead.
3. **Given** an attendee's Lead has been updated more than once, **When** staff or a salesperson look at the Lead's activity history, **Then** every past update is still visible, in order — none are silently lost or replaced.

---

### User Story 3 - Generate Leads for many attendees at once (Priority: P2)

Staff select several attendees from the attendee list — or select everyone who attended — and generate Leads for all of them in one action, each carrying their own individual context, without needing to repeat the single-attendee action one person at a time.

**Why this priority**: Valuable at scale (e.g. "everyone who came to this event"), but the single-attendee flow (User Story 1) already delivers the feature's core value on its own — bulk is a scale enhancement, not the foundation.

**Independent Test**: Can be fully tested by selecting a group of attendees (including at least one with no recorded interest and at least one who already has a Lead from this feature) and confirming every selected attendee ends up with a correct, individually-contextualized Lead after one bulk action.

**Acceptance Scenarios**:

1. **Given** staff select several attendees, **When** they generate Leads in bulk, **Then** every selected attendee gets a Lead (new or updated per User Story 2's rules) — none are silently skipped.
2. **Given** staff select an unusually large number of attendees at once, **When** they attempt to generate Leads in bulk, **Then** they see a clear warning about the size of the action before it proceeds, matching how this system already warns before other large-scale actions.
3. **Given** a bulk batch includes an attendee with no recorded interest, **When** the batch completes, **Then** that attendee still receives a Lead (per User Story 1, scenario 2) rather than being excluded from the batch.

---

### User Story 4 - Optionally bring in everything an attendee has ever expressed interest in (Priority: P3)

When generating a Lead, staff can choose to include not just this event's context, but everything that attendee has expressed interest in across every event they've ever attended — for cases where the fuller picture matters more than what just happened at this one event.

**Why this priority**: A genuine enhancement, but the default (this event only) already delivers the core value; pulling in someone's entire history is an occasional, deliberate choice, not the common case.

**Independent Test**: Can be fully tested by generating a Lead with the "include everything" option enabled for an attendee with recorded interests across multiple events, and confirming the Lead's context reflects more than just the current event.

**Acceptance Scenarios**:

1. **Given** an attendee has recorded interests across multiple events, **When** staff generate a Lead with the expanded option enabled, **Then** the Lead's context reflects that broader history, not just the current event.
2. **Given** staff use the expanded option, **When** that broader information is retrieved, **Then** the system records that a broader-than-usual look at this person's information happened — the same kind of record it already keeps whenever someone's information is viewed beyond its normal, narrow scope.

---

### Edge Cases

- What happens when an attendee has no recorded interest at all (single or bulk)? Covered above — still gets a Lead, just without interest context (User Story 1, scenario 2 / User Story 3, scenario 3).
- What happens when the same attendee is generated for twice, for two different events? Covered above — one Lead, updated, full history preserved (User Story 2).
- What happens when an attendee already has a Lead unrelated to this feature? Covered above — left untouched, a new one created instead (User Story 2, scenario 2).
- What happens if staff trigger bulk generation for an unusually large group? Covered above — a size warning, matching existing large-action patterns (User Story 3, scenario 2).
- What happens to older context on a Lead that's been updated several times — does newer information ever silently replace it? No — every update is preserved and remains visible; nothing is ever silently overwritten (User Story 2, scenario 3).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST let staff generate a Lead for a single attendee, carrying that attendee's recorded interest (if any) for the current event as context on the Lead.
- **FR-002**: System MUST still generate a Lead for an attendee with no recorded interest — the interest context is enrichment, not a precondition for generating a Lead.
- **FR-003**: Before generating a Lead for an attendee, System MUST check whether that attendee already has a Lead that this system previously created, and if so, update that same Lead rather than creating a second one.
- **FR-004**: If an attendee already has a Lead that this system did **not** create, System MUST leave that Lead completely unmodified and create a new, separate Lead instead — this system MUST NOT modify a Lead it cannot verify it created.
- **FR-005**: Every update to a Lead this system manages MUST be preserved and remain visible afterward — a later update MUST NOT silently replace or hide an earlier one.
- **FR-006**: System MUST let staff generate Leads for a group of selected attendees in one action, applying FR-001 through FR-005 individually to each attendee in the group.
- **FR-007**: System MUST warn staff with the size of the action before proceeding when a bulk generation request is unusually large, consistent with how this system already handles other large-scale actions.
- **FR-008**: System MUST default a generated Lead's interest context to the current event only, and MUST offer staff an explicit option to include the attendee's interests across every event instead.
- **FR-009**: When staff use the expanded (all-events) option, System MUST record that this broader information was accessed, consistent with how this system already records access to a person's information beyond its normal, narrowly-scoped view.
- **FR-010**: System MUST NOT let anyone outside the existing staff-admin access level generate Leads — no new, broader access is introduced by this feature.
- **FR-011**: System MUST record who generated or updated a Lead and when, without including the interest content itself or other personal details in that record.
- **FR-012**: System MUST NOT change which system is the authoritative source of an attendee's recorded interests — this feature reads that information and carries it elsewhere; it does not become a new place where that information is created or edited.

### Key Entities

- **Lead**: A sales-system record representing a person worth follow-up, created or updated from an attendee. Carries an interest-context summary set once at first creation (never changed by later updates) plus a growing, ordered history of updates recorded alongside it. This system tracks whether it created a given Lead, and never modifies one it can't confirm it created.
- **Lead generation action**: The staff-triggered action (single or bulk) that creates or updates a Lead from one or more attendees, applying the same rules regardless of how many attendees are involved at once.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A salesperson looking at a Lead generated by this feature can see what that person expressed interest in, without needing to ask the events team or look anywhere else.
- **SC-002**: Generating a Lead for the same attendee multiple times, across multiple events, never results in more than one Lead for that attendee from this feature — 100% single-Lead consistency.
- **SC-003**: No update to a Lead this feature manages is ever lost — every past update remains visible after any number of subsequent updates.
- **SC-004**: Staff can generate Leads for an entire event's worth of attendees in one action, rather than one at a time.
- **SC-005**: A Lead that existed before this feature touched anything is never altered by this feature — verified in 100% of cases where such a Lead exists for an attendee being processed.

## Assumptions

- This spec is grounded entirely in the already-settled design in [ADR-018](../../docs/decisions/018-hubspot-lead-generation.md) and its 2026-07-21 gap review — decisions made there (native HubSpot Leads confirmed enabled; a fixed lead temperature/type with no signal-strength differentiation; live existing-lead detection rather than a cached reference, for now; no Company association in V1; `admin`-only access, flagged as a watch item rather than closed) are treated as settled inputs here, not re-derived.
- "This system previously created" (FR-003/FR-004) is determined by a marker this system itself writes onto every Lead it creates — not by any assumption about Lead ownership HubSpot itself tracks.
- The "growing, ordered history of updates" (Key Entities) is implemented as native activity-log entries on the Lead, not as part of the interest-context summary field itself, so that field can stay fixed at its original value (per ADR-018) without losing the ability to show later activity.
- The broader-access recording requirement (FR-009) reuses this system's existing mechanism for auditing access to a person's information beyond its normal scope ([ADR-014](../../docs/decisions/014-attendee-communications-hubspot-engagement-pull.md)) rather than inventing a new one.
- Coordination work needed on the sales-system side (granting this system the access it needs to create/read Leads, confirming which classification values to use) is tracked separately as operational/coordination work ([hubspot-ops-todo.md](../../docs/hubspot-ops-todo.md) `HS-015`/`HS-016`/`HS-017`) and is out of scope for this spec's functional requirements, which cover only this system's own behavior once that access exists.
- Explicitly out of scope for this spec (per ADR-018, deliberately deferred, not overlooked): attaching a company/organization record to a generated Lead, and a faster (cached) way of checking for an existing Lead in bulk generation — both may be added later if they prove necessary.
