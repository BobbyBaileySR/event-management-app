# Feature Specification: Catalog Admin

**Feature Branch**: `001-catalog-admin`

**Created**: 2026-07-03

**Status**: Draft

**Input**: User description: "catalog admin (Program → Event, archive not delete, admin only)"

## Clarifications

### Session 2026-07-03

- Q: Should admins be able to unarchive (restore) a Program or Event? → A: **Yes** — unarchive supported; admin can restore archived Programs and Events to active navigation.
- Q: When an admin archives a Program, what happens to its Events? → A: **Auto-archive all Events** under that Program (cascade). Unarchiving the Program restores Events that were archived with it.
- Q: Should Program display names be unique across the catalog? → A: **Required unique** — save blocked if another Program (active or archived) already has that name.
- Q: Where can admins see and select archived Programs and Events? → A: **Archived view only** — default navigation pickers show active items only; archived items appear only in a dedicated archived catalog admin view (no picker toggle).
- Q: For non-admin roles, how should Program + Event navigation work? → A: **Same read-only pickers** — non-admins select active Program + Event from the same navigation as admins, but cannot open catalog admin (create/edit/archive/unarchive).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Navigate the event catalog (Priority: P1)

An events team member opens EMS and chooses which **Program** and **Event** they are working on before using attendee or check-in features. The catalog shows only active (non-archived) Programs and Events in navigation pickers. Each Program represents one run of an event effort (for example, "Atlassian Event 2025" and "Atlassian Event 2026" are separate Programs, not nested runs). **All authenticated roles** use the same read-only Program/Event pickers; catalog administration (create, edit, archive, unarchive) is **admin-only**.

**Why this priority**: Attendee list, check-in, and all Slice 1 work is scoped to a Program + Event pair. Without reliable navigation, nothing else in Slice 1 can be used correctly.

**Independent Test**: Can be fully tested by signing in as any role, selecting a Program and Event from the catalog pickers, and confirming the chosen context is visible throughout the session until changed. Admin-only catalog screens remain inaccessible to non-admin roles.

**Acceptance Scenarios**:

1. **Given** at least one active Program with at least one active Event, **When** any authenticated user opens EMS, **Then** they can see and select a Program and then an Event under it from the navigation pickers.
2. **Given** multiple Programs exist, **When** a user selects "Atlassian Event 2026", **Then** only Events belonging to that Program are offered for selection.
3. **Given** a Program or Event has been archived, **When** any user uses normal navigation pickers, **Then** that entry does not appear (archived items are visible only in the dedicated archived catalog admin view, not via a picker toggle).
4. **Given** a user without the admin role, **When** they sign in, **Then** they can use Program/Event navigation pickers but cannot open catalog administration screens or perform create, edit, archive, or unarchive actions.

---

### User Story 2 - Create and maintain Programs and Events (Priority: P2)

An events team **admin** uses a catalog administration area (Settings or equivalent) to create and update Programs and Events without developer help. For each **Program** they set a display name and the **HubSpot registration form** identifier for that Program. For each **Event** under a Program they set a display name and the **Parts Attended** option value that maps to HubSpot registration data for that sub-event.

**Why this priority**: The events team must self-service catalog changes as forms and sub-events evolve each year. This is the core "catalog admin" deliverable.

**Independent Test**: Can be fully tested by an admin creating a new Program with form reference, adding two Events with distinct Parts Attended mappings, saving, signing out and back in, and confirming the structure appears in navigation.

**Acceptance Scenarios**:

1. **Given** an admin on the catalog admin screen, **When** they create a Program with name and registration form reference, **Then** the Program appears in navigation after save.
2. **Given** an active Program, **When** an admin adds an Event with name and Parts Attended option value, **Then** the Event appears under that Program in navigation.
3. **Given** an existing Program or Event, **When** an admin edits its display name or mapping fields, **Then** navigation and admin lists reflect the update without duplicate records.
4. **Given** an admin attempts to save a Program or Event with required fields missing, **When** they submit, **Then** they see a clear validation message and no partial record is created.
5. **Given** a non-admin user, **When** they attempt to access catalog create/edit actions, **Then** those actions are unavailable and any direct attempt is denied.

---

### User Story 3 - Archive Programs and Events (Priority: P3)

An events team **admin** retires a past Program or Event by **archiving** it so it no longer appears in day-to-day navigation but remains available for historical reference. Archiving is **not deletion** — past attendee and check-in context must not be lost.

**Why this priority**: Events run annually; staff must hide old Programs without destroying audit history or breaking references to past activity.

**Independent Test**: Can be fully tested by archiving an Event, confirming it disappears from default navigation, then viewing archived items and confirming the record still exists with its original mappings.

**Acceptance Scenarios**:

1. **Given** an active Event under a Program, **When** an admin archives the Event, **Then** it no longer appears in default navigation but can be found when viewing archived catalog entries.
2. **Given** an active Program with Events, **When** an admin archives the Program, **Then** the Program and **all** its Events are archived together and hidden from default navigation.
3. **Given** an archived Program that was archived with its Events (cascade), **When** an admin unarchives the Program, **Then** Events that were archived with that Program are restored to active navigation together with the Program.
4. **Given** an archived Program or Event, **When** an admin views archived catalog entries, **Then** they can see name and mapping metadata and may **unarchive** to return the entry to active navigation (unarchiving a cascaded Program restores its Events as in scenario 3).
5. **Given** any archive action, **When** it completes, **Then** there is no permanent delete control exposed to the admin for catalog entries.

---

### Edge Cases

- What happens when the catalog is empty? Admin sees guidance to create the first Program before attendee or check-in modules can be used.
- What happens when a Program has no Events yet? Admin can save the Program but navigation to attendee/check-in for that Program prompts creation of at least one Event first.
- What happens when two Programs share the same display name? **Save is blocked** — Program names MUST be unique across the catalog (including archived Programs); admin sees a clear validation message.
- What happens when Parts Attended option labels repeat across Programs (e.g. "Meeting Room" in 2025 and 2026)? Registration scope is always interpreted together with the **Program** and its **form submission** — catalog admin must store mappings per Program + Event, not globally by label alone.
- What happens when an admin archives an Event that staff were mid-session on? Active session should fall back to catalog selection without data loss; archived target cannot be selected for new operations.
- What happens when form ID or Parts Attended value is wrong? Admin can edit and save corrections; incorrect mappings affect downstream attendee logic (out of scope for this feature but edits must be allowed).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST represent the catalog as **two levels only**: **Program → Event**. There is no intermediate "iteration" or "run" level.
- **FR-002**: System MUST allow **admin** users to create, read, and update Programs and Events.
- **FR-003**: System MUST store, on each **Program**, a reference to the **HubSpot registration form** used to determine registered attendees for that Program.
- **FR-004**: System MUST store, on each **Event**, a **Parts Attended option value** mapping used with HubSpot contact data for that sub-event under the Program.
- **FR-005**: System MUST support **multiple Programs** (for example, separate Programs per calendar year or per distinct event effort).
- **FR-006**: System MUST allow **admin** users to **archive** Programs and Events; archived entries MUST be hidden from default navigation. Archiving a **Program** MUST **cascade** — all active Events under that Program are archived together.
- **FR-007**: System MUST NOT offer **hard delete** of catalog entries to admin users.
- **FR-008**: System MUST retain archived catalog records for historical and audit context.
- **FR-009**: System MUST restrict catalog create, update, archive, and unarchive actions to users with the **admin** role; other roles MUST NOT perform these actions but MUST be able to **read** active Programs and Events via the same navigation pickers.
- **FR-010**: System MUST require users to select an active **Program** and **Event** before accessing Slice 1 modules that depend on catalog context (attendee list, check-in — consumed by later features).
- **FR-011**: System MUST validate required fields before saving a Program or Event and show understandable error messages when validation fails. **Program display names MUST be unique** across all Programs (active and archived); duplicate names MUST be rejected on create and update.
- **FR-012**: System MUST provide a **dedicated archived catalog admin view** where admins can browse archived Programs and Events separately from the active catalog. Normal navigation pickers MUST NOT include archived entries and MUST NOT offer a “show archived” toggle.
- **FR-013**: System MUST allow **admin** users to **unarchive** previously archived Programs and Events, returning them to active navigation. Unarchiving a Program that was archived with cascade MUST restore Events that were archived with that Program.

### Key Entities

- **Program**: A top-level catalog entry for one event effort (e.g. "Atlassian Event 2026"). Attributes: display name (**unique** across catalog), HubSpot registration form reference, archived flag.
- **Event**: A sub-part under a Program (e.g. "Meeting Room", "VIP Event"). Attributes: display name, parent Program, Parts Attended option value, archived flag.
- **Catalog archive state**: A soft-disabled flag on Program or Event; archived items are excluded from default navigation but retained in the catalog store. Program archive **cascades** to all Events under that Program; Program unarchive **restores** Events archived with that cascade.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An admin can create a new Program with at least one Event and reach a selectable Program + Event context in under **5 minutes** without developer assistance.
- **SC-002**: **100%** of catalog create, update, and archive actions attempted by non-admin users are denied.
- **SC-003**: After archiving, **0%** of archived Programs or Events appear in default navigation pickers for new work sessions.
- **SC-004**: **100%** of archived catalog entries remain retrievable in an archived view (no data loss versus pre-archive state).
- **SC-005**: Events team confirms that catalog structure matches how they organise work (**Program per year/effort → Events as sub-parts**) in a single review session without requesting a third hierarchy level.
- **SC-006**: An admin can **unarchive** a previously archived Program or Event and see it return to default navigation pickers within **one** admin action (no developer assistance).

## Assumptions

- **Admin-only maintenance** is confirmed per Slice 1 RBAC ([ADR-003](../../docs/decisions/003-phase1-attendees-checkin.md)); viewers and other roles use the same read-only Program/Event navigation pickers but do not edit the catalog.
- **Archive-only removal** is confirmed; **unarchive is in scope** — admins can restore archived Programs and Events to active navigation (clarified 2026-07-03).
- **HubSpot form ID** is entered by admin as catalog metadata; verifying the ID against live HubSpot is a manual or later validation step, not part of this feature's MVP.
- **Parts Attended option values** are entered as catalog metadata aligned with HubSpot multi-select options; live HubSpot property discovery continues in parallel ([hubspot-schema.md](../../docs/hubspot-schema.md)).
- This feature delivers **catalog structure and admin UI** only; attendee list and check-in are separate Spec Kit features that consume the catalog.
- Multiple Programs may share one HubSpot Parts Attended property at the contact level; disambiguation is by Program form + Event option, not by a third catalog tier.

## Out of Scope

- Attendee list, check-in, walk-in, or QR flows (Slice 1 follow-on specs).
- Public registration webpages or HubSpot form design.
- Hard delete or bulk import of catalog data.
- Automatic sync of catalog data to or from HubSpot custom objects (future migration path only).
