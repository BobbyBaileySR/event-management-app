# Feature Specification: Attendee Detail Modal (Attendee Journey)

**Feature Branch**: `010-attendee-detail-modal`

**Created**: 2026-07-17

**Status**: In progress — US1 Frontend (Basic Information card + event-only Attendee Journey, `AttendeeDetailModal.tsx`) shipped 2026-07-17 against the Setup-phase Backend stub (`GET events/{evId}/attendees/{contactId}` still returns `501 not_implemented` — `BE-ATTENDEE-DETAIL-001`/T012-T013 not yet implemented). US2 ("Show all communications") not started. Blocked on `HS-010`/`HS-011` HubSpot ops confirmation for real data on some fields — both still `open`. *(Verified 2026-07-17.)*

**Input**: User description: "Read-only Attendee Detail modal opened from the Registered Attendees screen: Basic Information + an Attendee Journey timeline (this Event's lifecycle by default — registered, dispatch sent/opened, checked in), with an optional 'Show all communications' expansion that pulls in the attendee's communications from other Events and other HubSpot marketing sends, tagging anything that isn't part of the current Event. Design fully settled via a `/grill-with-docs` session — see [ADR-014](../../docs/decisions/014-attendee-communications-hubspot-engagement-pull.md) and `CONTEXT.md` § Attendee journey / Attendee communications view."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View an attendee's basic information and event journey (Priority: P1)

Staff working the Registered Attendees screen for an Event click an attendee's row to see who they are and what has happened with them for this Event so far, without leaving the list or risking any accidental edits.

**Why this priority**: This is the entire baseline value of the feature — read-only context restoring "who is this person and where are they in the process" without hunting across HubSpot or other tabs. The modal is fully useful with just this story shipped.

**Independent Test**: Open the modal for any registered attendee; Basic Information fields render correctly (email, company, attendee type, checked-in status today; phone, job title, dietary requirement, registration source once each data source lands); the Attendee Journey timeline shows only this Event's steps.

**Acceptance Scenarios**:

1. **Given** a registered attendee row on the Registered Attendees screen, **When** staff click anywhere on the row except the action-button cell, **Then** the Attendee Detail modal opens showing that attendee's Basic Information and Attendee Journey.
2. **Given** the modal is open, **When** staff look at the Attendee Journey, **Then** only steps related to the currently open Event are shown — nothing from any other Event.
3. **Given** the modal is open, **When** staff look for a way to edit, send, or delete anything, **Then** no such control exists anywhere in the modal.
4. **Given** the modal is open, **When** staff look at Basic Information, **Then** no raw HubSpot contact ID is shown anywhere in the view.
5. **Given** an attendee with no phone, job title, or dietary requirement on file, **When** the modal renders, **Then** those fields are omitted rather than shown with a fabricated placeholder value.

---

### User Story 2 - Expand to see all communications this attendee has received (Priority: P2)

Staff want to check whether an attendee has been over- or under-communicated with, including outside this Event, before deciding whether to send another dispatch.

**Why this priority**: Adds real investigative value beyond the single-Event view, but is additive — the modal from User Story 1 is a complete, shippable experience without it.

**Independent Test**: With the modal open, click "Show all communications"; the timeline expands to include this attendee's communications from other Events and other HubSpot marketing sends, each non-current-Event item visibly tagged; clicking the same control again (now labeled "Show event lifecycle only") collapses back to the User Story 1 view.

**Acceptance Scenarios**:

1. **Given** the modal is open on the default (event-lifecycle-only) view, **When** staff click "Show all communications", **Then** the control's own label changes to "Show event lifecycle only" and additional items appear in the timeline.
2. **Given** the expanded view, **When** an item is not part of the currently open Event, **Then** it carries a tag naming the specific other Event (when it is a known EMS dispatch for a different Event) or a generic tag (when it is a HubSpot send EMS never touched at all).
3. **Given** the expanded view, **When** the fetch for additional communications is in progress, **Then** a loading indicator is shown, and if that fetch subsequently fails, the existing event-only timeline remains visible with a retry option rather than the modal going blank.
4. **Given** the expanded view, **When** there happen to be no communications beyond the current Event, **Then** the toggle still works with no error — it simply doesn't change what's displayed.
5. **Given** the expanded view, **When** items exist that are older than the attendee's earliest event-related communication, **Then** they are excluded entirely — there is no separate pagination control to reach them.

---

### Edge Cases

- What happens when an attendee has no email, phone, job title, or dietary requirement on file? The field is omitted, not shown with a placeholder that looks like a real value.
- How does the view handle a HubSpot field containing hostile or malformed input (e.g. an attempted script tag in a company or job title field)? It must render as inert text, never executed as markup.
- What happens if the "Show all communications" fetch fails outright (not just returns empty)? The existing event-only timeline stays visible with an inline error and a retry control — the modal never goes blank.
- What happens when staff without the required role attempt to reach this modal? Same gate as the rest of the Registered Attendees screen — the modal is not reachable at all in that case.
- What happens when a non-current-Event item cannot be confidently matched to a specific other Event (a HubSpot send EMS never touched)? It is still shown, tagged with a generic label rather than being hidden or mislabeled as belonging to a specific Event.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST let staff open a read-only detail view for any attendee by clicking their row on the Registered Attendees screen (excluding the existing action-button cell).
- **FR-002**: System MUST show Basic Information for the attendee: email, company, attendee type, and checked-in status (available today), plus phone, job title, dietary requirement, and registration source (registered via form vs. walk-in) once each underlying data source is available.
- **FR-003**: System MUST NOT display the attendee's raw HubSpot contact ID anywhere in this view.
- **FR-004**: System MUST NOT expose any control that edits, sends, or deletes attendee data from within this view.
- **FR-005**: System MUST show an Attendee Journey timeline defaulting to steps scoped to the currently open Event only (registered, dispatch sent, dispatch opened, checked in), for any step where real data exists.
- **FR-006**: System MUST provide a single toggle control ("Show all communications" / "Show event lifecycle only") that expands or collapses the timeline to include communications beyond the current Event.
- **FR-007**: When expanded, system MUST visually tag every item that is not part of the currently open Event — naming the specific other Event when the item is a known EMS dispatch for it, or a generic label when it is not.
- **FR-008**: When expanded, system MUST bound the additional communications shown to those at or after the attendee's earliest event-related communication, without a separate pagination control.
- **FR-009**: System MUST show a loading state while the expanded-communications fetch is in progress, and MUST preserve the already-visible event-only timeline if that fetch fails, offering a retry rather than clearing the view.
- **FR-010**: System MUST treat every dynamic field in this view (name, company, job title, dietary requirement, other-Event/dispatch names) as untrusted text, rendered so hostile input cannot execute as markup.
- **FR-011**: System MUST restrict access to this view to the same role(s) already permitted to view the Registered Attendees screen.
- **FR-012**: System MUST record an auditable event when staff expand to "Show all communications" — not required for the default event-only view, consistent with every other read in this app being unaudited.

### Key Entities *(include if feature involves data)*

- **Attendee (Contact)**: The person represented in the modal — identity fields (name, email, company, job title, phone), event-specific state (attendee type, checked-in status), and any dietary/accessibility note on file.
- **Attendee Journey step**: A single timestamped event in an attendee's relationship with the currently open Event (registered, dispatch sent, dispatch opened, checked in).
- **Non-Event communication**: A marketing email/dispatch this attendee received that is not part of the currently open Event's own send history — tagged with either a specific other Event's name or a generic label.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Staff can open the detail view for any attendee and see their event-scoped journey without navigating away from the Registered Attendees screen.
- **SC-002**: 100% of hostile/malformed test strings injected into any displayed free-text field render as visible text, not executed markup, across every automated test run.
- **SC-003**: Staff can distinguish, at a glance and without leaving the modal, which listed communications belong to the current Event and which do not.
- **SC-004**: No unauthorized role can reach this view — attempts are blocked at the same point the Registered Attendees screen itself is already blocked.

## Assumptions

- Phone, job title, dietary requirement, and registration-source data are not required to exist for every attendee at launch — fields simply omit when unavailable rather than blocking the feature.
- "Email opened" tracking and a stored "registered at" timestamp/source do not exist in the system today; the Attendee Journey is built to display them once available, without fabricating placeholder values in the meantime (parked in `Frontend/TODO.md` — `BE-ATTENDEE-DETAIL-002`/`BE-ATTENDEE-DETAIL-003`).
- "Show all communications" is sourced from the attendee's full HubSpot marketing-email engagement history (portal confirmed on Enterprise tier), not solely from EMS's own dispatch records — decided in [ADR-014](../../docs/decisions/014-attendee-communications-hubspot-engagement-pull.md).
- A "Returning attendee" indicator was considered and explicitly dropped from this feature's scope.
- Vocabulary in this feature stays "dispatch" (not "Campaign") to match what is currently shipped elsewhere in the app; "Campaign" is target-model vocabulary that hasn't shipped yet.
- Two reference screenshots (default and expanded states) exist for this feature and are tracked as pending assets — see `assets/README.md` in this feature directory.
