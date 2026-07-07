# Feature Specification: Email Dispatch (Slice 2)

**Feature Branch**: `005-email-dispatch`

**Created**: 2026-07-07

**Status**: Tasks generated (ready for implement)

**Input**: User description: "Slice 2 — staff email dispatch for a Program + Event: send HubSpot marketing templates immediately or on a schedule; audience from registered attendees (EMS filters/selection) or HubSpot CRM segments; dispatch log with per-contact sent records; admin-only."

**Depends on**: [001-catalog-admin](../001-catalog-admin/spec.md), [002-catalog-metadata-modal](../002-catalog-metadata-modal/spec.md), and [003-check-in](../003-check-in/spec.md) — Program + Event catalog context, registered **Attendee list**, admin RBAC, and Slice 1 navigation patterns remain in force.

**Product context**: [CONTEXT.md](../../CONTEXT.md) (Slice 2, Email dispatch, Dispatch audience, Scheduled dispatch, Dispatch log, HubSpot contact segment, HubSpot marketing email template)

**Out of slice**: Public registration pages and HubSpot landing-page creation — **Slice 3** (see CONTEXT.md).

---

## Clarifications

### Session 2026-07-07

- Q: When staff combine attendee filters/search with manual multi-select, how is the send list determined? → A: **Fixed selection** — filters and search only narrow the picker table; manually selected Contacts remain in the send list when filters change or clear.
- Q: After **Send now**, must the admin wait on screen until every recipient is handed off? → A: **Accepted immediately** — success when the dispatch is queued/accepted; HubSpot handoff runs in the background; dispatch log updates as **sent** records are written.
- Q: How should staff navigate Compose, Scheduled, and Dispatch log within Email? → A: **Tabs on Email page** — Compose, Scheduled, and Dispatch log as tabs (or equivalent segmented nav) within one Email view for the selected Program + Event.
- Q: Should dispatch actions be rate-limited per admin per hour? → A: **Yes — per-admin hourly cap** on dispatch actions (send now + new schedules), with clear error when exceeded; **show the current limit in the UI** (e.g. on Compose tab) so staff know the boundary before attempting a send.
- Q: How should staff open the Email module? → A: **Catalog pickers + dedicated Email route** — same navigation model as Attendees/Check-in (e.g. `#/events/email`); legacy `#/events/{id}/email` retired for Slice 2; empty state when Program + Event not selected.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Send an email now to registered attendees (Priority: P1) 🎯 MVP

An **admin** selects a **Program** and **Event**, opens the **Email** module, and sends a **HubSpot marketing email template** immediately to a **dispatch audience** drawn from **Registered attendees** for that Event. They enter a **dispatch name** (free text), choose a template **by name**, define the audience using first-class EMS controls (all registered, checked-in / not checked-in, search, or manual multi-select on the attendee list). **Manual multi-select uses fixed selection:** filters and search narrow the picker only; selected Contacts stay selected if filters change. Staff review the recipient count and press **Send now**. The system **accepts the dispatch immediately** (queued for processing — staff are not blocked while HubSpot handoff runs) and records it in the **Dispatch log**, updating per-Contact **sent** outcomes as processing completes.

**Why this priority**: Immediate sends are the core operational need (reminders, last-minute updates) and prove the HubSpot template + audience pipeline before scheduling and logging depth.

**Independent Test**: Admin with catalog context → Email module → pick template by name → enter dispatch name → select “all registered” → confirm if over threshold → success message → dispatch appears in log with recipient count and sent records for attendees.

**Acceptance Scenarios**:

1. **Given** an admin with Program + Event selected via catalog pickers, **When** they open Email from the sidebar, **Then** they land on the catalog-scoped Email module and can choose a HubSpot marketing template **by display name** (not raw HubSpot id).
2. **Given** the compose send flow, **When** the admin enters a dispatch name and selects registered-attendee audience (e.g. all registered, or checked-in only, or manual multi-select), **Then** the UI shows an accurate recipient count before send.
3. **Given** a valid send with at least one recipient, **When** the admin confirms **Send now**, **Then** the dispatch is **accepted immediately** (queued for processing), the admin sees a non-blocking success message, and the **Dispatch log** shows the dispatch with **sent** records appearing as background processing completes.
4. **Given** zero recipients for the chosen audience, **When** the admin attempts send, **Then** send is blocked with a clear message.
5. **Given** a recipient count at or above the configured large-send threshold, **When** the admin attempts send, **Then** they must confirm before the dispatch proceeds.
6. **Given** a non-admin user, **When** they attempt the Email module, **Then** they are redirected away and do not see recipient PII or send controls.

---

### User Story 2 — Schedule an email for later (Priority: P1)

An **admin** schedules an **Email dispatch** for a future date and time using **15-minute intervals** (`:00`, `:15`, `:30`, `:45`), choosing a **timezone** for that schedule (e.g. Europe/London). Multiple scheduled dispatches may exist per Event. While a schedule is **pending** (not yet processing), the admin can **fully edit** (template, audience, dispatch name, time, timezone) or **cancel** it. When a schedule enters the **processing** window, **edit and cancel are blocked**. The UI **warns** when a pending schedule is approaching processing that editing and cancelling will soon be locked.

**Why this priority**: Pre-event comms (invitations, reminders) depend on reliable scheduling; 15-minute granularity matches operational constraints.

**Independent Test**: Admin schedules dispatch for next valid 15-minute slot in chosen timezone → appears in scheduled list → edit audience → cancel another pending schedule → approaching-send warning visible within one interval → once processing starts, edit/cancel disabled → after run, entry moves to Dispatch log.

**Acceptance Scenarios**:

1. **Given** compose send with **Schedule for later**, **When** the admin picks date, time (15-minute grid only), and timezone, **Then** the scheduled instant is shown in the chosen timezone and stored unambiguously.
2. **Given** multiple pending schedules for one Event, **When** the admin opens the **Scheduled** tab, **Then** all pending schedules are visible with template name, dispatch name, audience summary, scheduled time (with timezone), and status.
3. **Given** a pending schedule not yet processing, **When** the admin edits any field or cancels, **Then** the change succeeds and the list updates.
4. **Given** a schedule that has **started processing**, **When** the admin attempts edit or cancel, **Then** the action is blocked with a clear message.
5. **Given** a pending schedule within **one 15-minute processing window** of its send time, **When** the admin views it, **Then** a visible warning states that editing and cancelling will be locked once processing starts.
6. **Given** a scheduled dispatch completes, **When** the admin opens Dispatch log, **Then** the dispatch appears as immutable history with the same metadata as an immediate send.

---

### User Story 3 — Send to a HubSpot CRM contact segment (Priority: P2)

When the audience must go **beyond Registered attendees** for the Event, an **admin** chooses **HubSpot contact segment** as the audience type and selects a segment **by name** from **CRM → Segments** (Active or Static). The system uses the segment’s HubSpot id for the send but does not show raw ids in routine UI. Staff understand the segment may include Contacts who are **not** registered attendees for that Event.

**Why this priority**: Wider outreach is needed occasionally but is secondary to Event-scoped attendee sends; segment picker depends on the core send pipeline (US1).

**Independent Test**: Admin switches audience type to HubSpot segment → picker lists segment names → select Active segment → recipient count from HubSpot membership → send or schedule → log records segment name in audience summary.

**Acceptance Scenarios**:

1. **Given** the compose send flow, **When** the admin chooses **HubSpot contact segment** audience, **Then** they see segment **names** (Active and Static) and not raw HubSpot ids.
2. **Given** a selected segment, **When** the admin previews recipient count, **Then** membership reflects HubSpot evaluation at preview/send time.
3. **Given** a segment-based dispatch, **When** it completes, **Then** the Dispatch log audience summary identifies the segment by **name** and notes that recipients may extend beyond registered attendees.
4. **Given** registered-attendee audience options, **When** the admin has not switched to segment mode, **Then** EMS filters and manual selection remain available without requiring a HubSpot segment.

---

### User Story 4 — Review dispatch history and filter attendees (Priority: P2)

An **admin** opens **Dispatch log** for the selected Program + Event to see all **Email dispatches** (immediate and completed scheduled): dispatch name, system id, template name, actor, time, audience summary, and status. They can open a dispatch to see **per-Contact sent** records. From the **Attendee list**, they filter Contacts by whether they **received** or **did not receive** a chosen past dispatch — supporting follow-up targeting (e.g. reminder only to those who missed the invitation).

**Why this priority**: Accountability and follow-up segmentation were explicit stakeholder requirements; depends on sends existing (US1/US2).

**Independent Test**: After two dispatches → log lists both → drill into first → see per-Contact sent rows → Attendees filter “did not receive [dispatch name]” → list excludes recipients of that dispatch.

**Acceptance Scenarios**:

1. **Given** completed dispatches for an Event, **When** the admin opens the **Dispatch log** tab, **Then** entries are ordered with newest first and include dispatch name, template, actor, time, audience summary, and recipient count.
2. **Given** a dispatch in the log, **When** the admin views detail, **Then** they see per-Contact records with outcome **sent** (successfully handed off for that Contact).
3. **Given** the Attendee list for the same Event, **When** the admin filters by **received dispatch [name]** or **did not receive dispatch [name]**, **Then** the list shows only matching Registered attendees.
4. **Given** a segment-based dispatch that included non-attendees, **When** viewing Attendee list filters, **Then** filter applies only to Registered attendees on the list (non-attendees appear only in dispatch detail, not on the attendee roster filter).

---

### Edge Cases

- **Catalog context missing** → Email module shows guidance to select Program + Event first (same pattern as Attendees / Check-in); sidebar Email link may be visible but module does not load send data until context is set.
- **HubSpot template or segment removed/renamed after dispatch created** → Dispatch log retains **names recorded at send time**; pending schedules show current picker names with stale-id error on send if HubSpot object missing.
- **White glove Program** → EMS does **not** block sends; staff voluntarily skip bulk outreach per team practice (CONTEXT.md).
- **Duplicate rapid send clicks** → second action must not double-send the same dispatch request (idempotent behaviour from user perspective).
- **Send now processing** → dispatch accepted immediately; admin is not blocked on screen; log and **sent** records update as background processing completes.
- **Scheduled time in the past** → rejected with clear validation before save.
- **HubSpot handoff failure for a Contact** → that Contact does not receive a **sent** record; dispatch summary reflects partial completion where applicable.
- **Rate limit reached** → dispatch action blocked with clear message; Compose tab already shows configured hourly limit.
- **Segment membership changes between schedule create and run** → recipients resolved at **processing time**, not frozen at schedule creation (Active segments); staff informed in UI copy for segment schedules.
- **Manual multi-select + filters** → **fixed selection**: filters/search narrow the picker table only; manually selected Contacts remain in the send list when filters change or clear; recipient count reflects explicit selections (or filter-based “all matching” when no manual picks).
- **Hostile strings** in dispatch names, template names, segment names → displayed as plain text only.
- **Mock vs live** → mock layer supports full Email UX flows for local dev until live HubSpot send is enabled.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST expose an **Email** module at a **catalog-scoped route** (same navigation model as Attendees and Check-in — e.g. `#/events/email` with Program + Event from catalog pickers). Legacy `#/events/{id}/email` MUST NOT be used for Slice 2. Module is **admin only**. It MUST provide **three tabs**: **Compose**, **Scheduled**, and **Dispatch log**. If Program or Event is not selected, show catalog-context guidance (empty state).
- **FR-002**: System MUST list **HubSpot marketing email templates** for staff selection **by display name**; HubSpot template ids MUST be retained for send operations but not shown in routine UI.
- **FR-003**: Every **Email dispatch** MUST require a **staff-entered dispatch name** (no format rules) and MUST assign a **system-generated dispatch id** for search, log correlation, and attendee filtering.
- **FR-004**: For **Registered attendee** audiences, system MUST support: all registered for the Event; filter by checked-in / not checked-in; search on the attendee list; **manual multi-select** of attendees — without requiring a HubSpot segment. Manual selections MUST use **fixed selection** (filters/search narrow the picker only; selected Contacts persist when filters change or clear).
- **FR-005**: For audiences **wider than Registered attendees** for the Event, system MUST allow **HubSpot CRM contact segments** only (Active and Static); staff select **by segment name**; HubSpot segment ids retained for send, not shown in routine UI.
- **FR-006**: System MUST support **Send now** and **Schedule for later** for the same compose flow (template, dispatch name, audience). **Send now** MUST **accept the dispatch immediately** (queue for processing) without blocking the admin until every recipient is handed off; dispatch log and **sent** records update as processing completes.
- **FR-007**: Scheduled dispatches MUST use **15-minute time slots** only; staff MUST choose a **timezone** per schedule; multiple pending schedules per Event MUST be supported.
- **FR-008**: Pending scheduled dispatches MUST be **fully editable and cancellable** until **processing starts**; once processing starts, edit and cancel MUST be blocked.
- **FR-009**: UI MUST show a **warning** when a pending schedule is within **one 15-minute processing window** of its send time, stating that edit/cancel will be locked once processing starts.
- **FR-010**: System MUST enforce a **large-send confirmation** step when recipient count meets or exceeds the configured threshold (default expectation: 50 recipients — see Assumptions).
- **FR-010a**: System MUST enforce a **per-admin hourly cap** on dispatch actions (send now + creating new schedules). When exceeded, the action MUST fail with a clear message. The **Compose** tab MUST **display the configured limit** (and, where practical, remaining allowance) so staff see the boundary before sending.
- **FR-011**: System MUST maintain a **Dispatch log** per Event: dispatch name, id, template name, actor, time, audience summary, status, recipient count.
- **FR-012**: Dispatch log detail MUST record per-Contact outcome **sent** when that Contact was successfully handed off for the dispatch; bounce/delivery/open/click detail is out of scope.
- **FR-013**: **Attendee list** MUST support filter by **received** or **did not receive** a selected past dispatch (Registered attendees only).
- **FR-014**: System MUST NOT provide template authoring or editing in EMS — templates are HubSpot-only.
- **FR-015**: All dispatch and schedule mutations MUST be **audited** (actor, action, resource, outcome, recipient count in metadata).

### Non-Functional / Security

- **NFR-001**: No HubSpot credentials or private keys in the staff browser; sends execute only through authenticated staff session and server-side integration.
- **NFR-002**: Email module MUST NOT be available to non-admin roles in Slice 2 (communications role deferred).
- **NFR-003**: Dynamic text (dispatch names, template names, segment names, Contact fields) MUST render as plain text — no unsafe HTML injection.
- **NFR-004**: Email module MUST work on mobile, tablet, and desktop layouts (responsive requirement per project constitution).
- **NFR-005**: Dispatch rate-limit configuration MUST be visible to admins on the Email **Compose** tab without exposing internal system keys or credentials.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An admin can complete an immediate send to a filtered registered-attendee audience (template chosen, name entered, send confirmed) in **under 5 minutes** on first use after training.
- **SC-002**: An admin can schedule a dispatch at a chosen local date/time with explicit timezone and see it in the scheduled list **without using HubSpot marketing UI** for that action.
- **SC-003**: After dispatches run, an admin can answer “who was sent [dispatch name]?” from Dispatch log detail **within 3 clicks** from the Email module.
- **SC-004**: An admin can filter the Attendee list to “did not receive [dispatch name]” and use the result to target a follow-up send **within 3 clicks** from Attendees.
- **SC-005**: Non-admin staff **never** access Email compose, scheduled list, or dispatch log (verified in role-based QA).
- **SC-006**: Pending schedules show the approaching-processing **warning** at least one 15-minute window before lock (verified in scheduled-dispatch QA scenario).

---

## Assumptions

- **Slice 1** catalog navigation, registered **Attendee list**, and admin RBAC are shipped and stable.
- **HubSpot marketing email templates** and **CRM → Segments** (Active and Static) are available in the Adaptavist portal (verified 2026-07-07).
- **Large-send confirmation threshold** follows existing product default (~50 recipients) unless stakeholders change it before implementation.
- **Per-admin dispatch rate limit** follows existing product default (~10 dispatch actions per hour) unless changed before implementation; limit is **shown on the Email Compose tab**.
- **Processing lock warning** appears when the scheduled send is within **one 15-minute interval** of processing start (same granularity as the schedule grid).
- **Communications** role does not grant Email access in Slice 2 — **admin only** until a future RBAC slice.
- **White glove Programs** rely on staff discipline, not EMS enforcement.
- **Public registration** (Slice 3) is explicitly excluded from this specification.

---

## Out of Scope

- EMS **template builder** or in-app template editing.
- **Public registration** landing pages, HubSpot Breeze page generation, or EMS-hosted signup pages (**Slice 3**).
- Email **opens, clicks, bounces**, and delivery analytics (future Analytics slice or HubSpot reporting).
- **QR generation** embedded in pre-event emails.
- **`communications` role** for Email (deferred; admin-only for Slice 2).
- **HubSpot workflows** as a substitute for EMS scheduling UI.
- Free-text HubSpot list ids or ad-hoc Contact queries outside **CRM segments**.
- Legacy **`#/events/{id}/email`** route and flat mock event id for Email — replaced by catalog-scoped Email route (Session 2026-07-07).
