# Feature Specification: Catalog Metadata & Modal Forms

**Feature Branch**: `002-catalog-metadata-modal`

**Created**: 2026-07-04

**Status**: Clarified

**Input**: User description: "Extend catalog admin with Program and Event metadata fields; replace inline create forms with separate modals for create and edit; admin-only; backward compatible with existing catalog records; pickers and archive behaviour unchanged from 001-catalog-admin."

**Depends on**: [001-catalog-admin](../001-catalog-admin/spec.md) — archive lifecycle, navigation pickers, RBAC, and core catalog fields (Program name + HubSpot form ID; Event name + Parts Attended option) remain in force.

---

## Clarifications

### Session 2026-07-04

- Q: What precision do Program start/end date and Event date fields use? → A: **Date-only** — calendar date without time-of-day (e.g. `2026-09-15`).
- Q: Can admins edit archived Programs or Events via modal? → A: **Edit active only** — archived catalog tab is view metadata + unarchive only; no edit modal on archived entries.
- Q: When an admin clears a previously saved optional metadata field and saves, what happens? → A: **Clear on save** — empty optional field removes/unsets the stored value.
- Q: What validation applies to Event capacity on save? → A: **No numeric validation** — accept and store whatever the admin enters (decimals, negative, zero allowed this release).
- Q: How does admin select parent Program when creating an Event via modal? → A: **Dropdown in modal** — Event create modal includes Program selector (same behaviour as current inline form).

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create a Program with full metadata (Priority: P1)

An **admin** opens catalog administration and creates a new Program using a **dedicated Program modal** (not inline fields on the page). The modal captures the existing required Program identity fields from catalog admin (name, HubSpot registration form ID) plus optional metadata: description, start date, end date, location, and timezone. On save, the Program appears in the active catalog tree with its metadata available for review in the admin view.

**Why this priority**: Programs anchor the event hierarchy; staff need richer context (dates, location, timezone) before Slice 1 attendee work, and the modal pattern establishes the new admin UX.

**Independent Test**: Admin opens Program create modal, fills name + form ID + at least one metadata field, saves, and sees the new Program in the active catalog list with metadata displayed. Non-admin cannot open the modal.

**Acceptance Scenarios**:

1. **Given** an admin on the active catalog admin view, **When** they choose to create a Program, **Then** a Program-specific modal opens with fields for name, HubSpot form ID, description, start date, end date, location, and timezone.
2. **Given** the Program modal is open, **When** the admin saves with a valid name and HubSpot form ID, **Then** the Program is created and the modal closes; the catalog tree refreshes to include the new Program.
3. **Given** the Program modal is open, **When** the admin cancels or dismisses without saving, **Then** no Program is created and previously entered values are discarded.
4. **Given** a non-admin user, **When** they use EMS, **Then** they cannot access Program create modal or catalog admin mutation actions.

---

### User Story 2 - Create an Event with full metadata (Priority: P1)

An **admin** creates an Event under a selected Program using a **dedicated Event modal** (separate from the Program modal). The modal includes a **Program selector** (dropdown, same as the current inline create flow) plus existing required Event fields (name, Parts Attended option) and optional metadata: owner, description, date, location, and capacity. On save, the Event appears under the chosen Program in the active catalog tree.

**Why this priority**: Events are the operational unit for check-in and attendees; metadata supports on-site planning without changing navigation picker behaviour.

**Independent Test**: Admin opens Event create modal for an active Program, saves an Event with name, Parts Attended option, and optional metadata, and sees it under that Program in the catalog tree.

**Acceptance Scenarios**:

1. **Given** an admin on the active catalog admin view with at least one active Program, **When** they choose to create an Event, **Then** an Event-specific modal opens with a **Program dropdown**, plus fields for name, Parts Attended option, owner, description, date, location, and capacity.
2. **Given** the Event modal is open, **When** the admin saves with a valid name and Parts Attended option, **Then** the Event is created under the chosen Program and the modal closes.
3. **Given** the Event modal is open, **When** the admin cancels, **Then** no Event is created.

---

### User Story 3 - Edit Program and Event metadata (Priority: P2)

An **admin** updates an existing **active** Program or Event—including metadata fields—using the **same modal pattern** as create, pre-filled with current values. Saving updates the catalog record; cancelling leaves data unchanged. **Edit is not available on the archived catalog tab** (view + unarchive only, per 001-catalog-admin).

**Why this priority**: Metadata must be maintainable after initial create; edit completes the modal-based admin experience.

**Independent Test**: Admin opens edit for an existing Program or Event, changes description and location, saves, and sees updated values in the catalog admin tree.

**Acceptance Scenarios**:

1. **Given** an active Program in the **active** catalog admin tab, **When** an admin chooses edit, **Then** the Program modal opens pre-filled with current name, form ID, and all metadata fields.
2. **Given** an active Event in the **active** catalog admin tab, **When** an admin chooses edit, **Then** the Event modal opens pre-filled with current name, Parts Attended option, and all metadata fields.
3. **Given** an admin saves edits, **When** the save succeeds, **Then** the catalog tree reflects the new values without affecting archive state unless archive actions from 001-catalog-admin are explicitly used.
4. **Given** an archived Program or Event on the **archived** catalog tab, **When** an admin views the entry, **Then** metadata is visible read-only and **no edit action** is offered (unarchive remains available per 001-catalog-admin).
5. **Given** a Program or Event with saved optional metadata, **When** an admin clears one or more optional fields in the edit modal and saves, **Then** those fields are **removed/unset** and no longer appear in the catalog admin summary.

---

### User Story 4 - Existing catalog records remain usable (Priority: P2)

Catalog Programs and Events created **before** this feature continue to work in navigation pickers and catalog admin. Missing metadata fields behave as empty/unset; admins may add metadata later via edit modals.

**Why this priority**: Production catalog data already exists; the enhancement must not require a manual migration step for staff.

**Independent Test**: Open EMS with pre-existing catalog entries that have only name/form ID/Parts Attended option; confirm pickers and admin tree work; open edit modal and confirm empty metadata fields; save optional metadata without breaking the record.

**Acceptance Scenarios**:

1. **Given** a Program or Event stored without metadata fields, **When** any user loads navigation pickers, **Then** behaviour matches 001-catalog-admin (active entries visible by name; no metadata required in pickers).
2. **Given** a legacy catalog record, **When** an admin opens edit modal, **Then** metadata fields appear empty and can be saved incrementally.

---

### Edge Cases

- Admin saves Program or Event with **only** required fields from 001-catalog-admin and **all new metadata fields left blank** — save succeeds; no metadata keys stored (or equivalent unset state).
- Admin **clears** a previously saved optional metadata field in edit modal and saves — value is **removed/unset** (same as never entered).
- Admin enters **capacity** — any numeric value the admin enters is **accepted and stored** with no min, max, or integer enforcement this release; future validation may restrict without changing the field.
- **Timezone** and **location** are free-text; no timezone picker or geocoding in this feature.
- **Program start date** after **end date** — allowed in this release (no cross-field validation yet).
- Modal usage on **mobile, tablet, and desktop** — modals must remain usable without horizontal page scroll (responsive admin).
- **Archived** Programs and Events on the **archived catalog tab** — metadata displayed read-only; **no create or edit modals**; unarchive and cascade rules unchanged from 001-catalog-admin. Create and edit modals apply only on the **active** catalog tab.
- Dynamic text in metadata fields (description, names, locations) — displayed as plain text in admin UI (no HTML rendering).

---

## Requirements *(mandatory)*

### Functional Requirements

**Scope & storage**

- **FR-001**: System MUST extend EMS **Program** and **Event** catalog records with additional **EMS catalog metadata** fields listed below. These fields are stored in the **EMS catalog persistence layer** (Record Storage today) until HubSpot Program/Event custom objects exist; **HubSpot object mapping is out of scope** for this feature.
- **FR-002**: System MUST remain **backward compatible**: catalog records created before this feature MUST load and operate without migration; absent metadata MUST be treated as unset/empty.
- **FR-003**: **Navigation pickers** and **archive behaviour** (including cascade, archived admin view, unarchive) MUST remain unchanged from [001-catalog-admin](../001-catalog-admin/spec.md). Metadata MUST NOT appear in navigation pickers unless explicitly added in a future feature.

**Program fields** (in addition to existing name + HubSpot form ID)

- **FR-004**: Program MUST support optional **description** (multi-line text).
- **FR-005**: Program MUST support optional **start date** (calendar date only — no time-of-day).
- **FR-006**: Program MUST support optional **end date** (calendar date only — no time-of-day).
- **FR-007**: Program MUST support optional **location** (single-line text).
- **FR-008**: Program MUST support optional **timezone** (single-line text; staff-entered label, e.g. `Europe/London` or `GMT`).

**Event fields** (in addition to existing name + Parts Attended option)

- **FR-009**: Event MUST support optional **owner** (single-line text).
- **FR-010**: Event MUST support optional **description** (multi-line text).
- **FR-011**: Event MUST support optional **date** (calendar date only — no time-of-day).
- **FR-012**: Event MUST support optional **location** (single-line text).
- **FR-013**: Event MUST support optional **capacity** (number; no min, max, or integer validation this release).

**Admin UI — modals**

- **FR-014**: Catalog admin MUST replace **inline create forms** with **modal dialogs** for create and edit.
- **FR-015**: System MUST provide **separate modals** for Program operations and Event operations (not one combined form).
- **FR-016**: Program create and Program edit MUST use the **same Program modal** pattern (create opens empty; edit opens pre-filled).
- **FR-017**: Event create and Event edit MUST use the **same Event modal** pattern (create opens with **Program dropdown** for parent selection, matching current inline create behaviour; edit opens pre-filled with parent Program fixed/read-only).
- **FR-018**: Modals MUST support **cancel/dismiss** without persisting changes.
- **FR-019**: After successful create or edit on the **active** catalog tab, catalog admin view MUST refresh so new metadata is visible in the **catalog tree** (admin view only).
- **FR-024**: **Create and edit modals** MUST be available only on the **active** catalog admin tab. The **archived** tab MUST show metadata read-only and MUST NOT offer create or edit actions (unarchive per 001-catalog-admin remains).

**Validation & permissions**

- **FR-020**: **Admin-only** — only users with the admin role MAY create or edit catalog records via modals; non-admins retain read-only pickers per 001-catalog-admin.
- **FR-021**: **Existing required fields** from 001-catalog-admin (Program name, HubSpot form ID, Event name, Parts Attended option, unique Program name rule) MUST remain enforced.
- **FR-022**: **New metadata fields** MUST have **no additional validation rules** in this release beyond field type (text, date, number); the design MUST allow **adding validation later** without changing the field set or modal structure.
- **FR-025**: On **edit** save, an **empty optional metadata field** MUST **clear/unset** any previously stored value for that field (clear-on-save semantics).

**Display**

- **FR-023**: Catalog admin active and archived tree views MUST display saved metadata fields in a readable summary for each Program and Event — each **non-empty** field as a plain-text **label: value** line (or equivalent definition list); omit unset fields entirely.

### Key Entities

- **Program (extended)**: Event effort root — existing identity + form ID + archive fields from 001-catalog-admin; adds description, start date, end date, location, timezone as optional EMS metadata.
- **Event (extended)**: Session under a Program — existing Parts Attended option + archive fields from 001-catalog-admin; adds owner, description, date, location, capacity as optional EMS metadata.
- **EMS catalog metadata**: Staff-facing descriptive and scheduling fields owned by EMS until HubSpot custom objects replace Record Storage as system of record; not registration/check-in signals (those remain Contact + form + Parts Attended per product model).

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An admin can create a Program with all eight Program fields (two required + six optional metadata) through the Program modal in one session without using legacy inline forms.
- **SC-002**: An admin can create an Event with all seven Event fields (two required + five optional metadata) through the Event modal in one session.
- **SC-003**: An admin can edit metadata on an existing **active** Program or Event (active catalog tab) and see updated values in catalog admin within the same session after save.
- **SC-004**: 100% of catalog records created before this feature continue to appear in navigation pickers and catalog admin without staff-run migration steps.
- **SC-005**: Non-admin users retain the same Program/Event picker experience as 001-catalog-admin (no modal access, no regression in archive filtering).
- **SC-006**: On a phone-width viewport (~375px), an admin can complete Program or Event create via modal without horizontal scrolling of the page.

---

## Assumptions

- **001-catalog-admin** is deployed and accepted; this feature extends it rather than replacing archive or picker logic.
- Metadata is **admin-facing** for planning and context; attendee list and check-in slices may consume these fields later but are **not in scope** here.
- **Date fields** (Program start/end, Event date) store **calendar dates only** — no time-of-day component (clarified 2026-07-04).
- **Capacity** is an optional numeric hint with **no validation** this release (decimals, zero, and negative values allowed if entered; clarified 2026-07-04).
- **Timezone** is opaque text for staff display and future mapping—not validated against IANA timezone database in this release.
- **Owner** on Event is a free-text label (person or team name), not a HubSpot owner ID field in this release.
- **HubSpot custom objects** for Program/Event will eventually supersede Record Storage; field names in this spec are **EMS catalog names** intended for future mapping documentation, not live HubSpot property API names.
- Inline create forms on `#/catalog` are **removed** when modals ship; no dual UX path.
- **Edit scope** — create and edit modals on **active catalog tab only**; archived tab is read-only metadata plus unarchive (clarified 2026-07-04).
- **Optional metadata clearing** — saving an edit with blank optional metadata fields unsets those values (clear-on-save; clarified 2026-07-04).
- **Event create parent Program** — selected via dropdown inside the Event create modal (clarified 2026-07-04).
- Catalog mutation **audit** continues per 001-catalog-admin; richer before/after audit is tracked separately (BE-TECH-003).

---

## Out of Scope

- HubSpot Program/Event custom objects, sync, or migration from Record Storage
- Showing metadata in navigation pickers or event hub modules
- Validation rules beyond 001-catalog-admin required fields (except basic field types)
- Public registration pages, email, check-in, or attendee list consumption of metadata
- Timezone picker widgets, maps, or address validation for location fields
- Editing archived Programs or Events via modal (unarchive first, then edit on active tab)
- Deleting Programs or Events (archive-only model unchanged)
