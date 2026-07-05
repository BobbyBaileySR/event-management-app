# Feature Specification: Attendees & Check-in (Slice 1)

**Feature Branch**: `003-check-in`

**Created**: 2026-07-05

**Status**: In progress

**Input**: User description: "Slice 1 attendee list and check-in — registered attendees for a Program + Event; staff check-in via QR scan, name search, and (later) walk-in; admin-only; first HubSpot write path."

**Depends on**: [001-catalog-admin](../001-catalog-admin/spec.md) and [002-catalog-metadata-modal](../002-catalog-metadata-modal/spec.md) — catalog pickers, Program/Event context, RBAC, and Event `attendanceProperty` / Program `hubspotFormIds` remain in force.

**Product context**: [CONTEXT.md](../../CONTEXT.md) · [ADR-003](../../docs/decisions/003-phase1-attendees-checkin.md)

---

## Clarifications

### Session 2026-07-05

- Q: Should search refetch the whole page or keep check-in layout mounted? → A: **Keep layout mounted** — debounce search (~300ms); full-page loader only on initial load or Program/Event change.
- Q: Does mock API need to honour search query params? → A: **Yes** — `getMockSliceAttendees` must filter by `q` and `checkedIn` so local dev matches live API behaviour.
- Q: Is walk-in in Slice 1 MVP? → A: **Defer until after SFTP** — name search + QR + confirm ship first; walk-in is US3 (separate phase).

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — View registered attendees (Priority: P1)

An **admin** selects a **Program** and **Event** from catalog pickers and opens the **Attendees** module. They see a sortable list of registered contacts for that Event: name, company, email, account manager, attendee type (customer/partner), and checked-in status. They can filter by checked-in state and search by name or company.

**Why this priority**: Staff need a roster before on-the-day check-in; same data source as name-search check-in.

**Independent Test**: Admin with catalog context → Attendees table loads → search and checked-in filter reduce rows → non-admin cannot access module.

**Acceptance Scenarios**:

1. **Given** an admin with Program + Event selected, **When** they open Attendees, **Then** the registered list loads for that Event only.
2. **Given** the attendee list, **When** the admin searches by substring (name or company), **Then** only matching rows appear after a brief debounce.
3. **Given** the attendee list, **When** the admin filters by checked-in / not checked-in, **Then** only matching rows appear.
4. **Given** a non-admin user, **When** they attempt Attendees, **Then** they are redirected away and do not see attendee PII.
5. **Given** no Program or Event selected, **When** an admin opens Attendees, **Then** they see guidance to select catalog context first.

---

### User Story 2 — Check in via QR or name search (Priority: P1) 🎯 MVP

An **admin** at the arrival desk opens **Check-in** for the selected Program + Event. They can:

1. **Search by name or company** in the registered list, select a row, review a fixed summary (name, company, email, account manager, track, checked-in state), and press **Confirm check-in**.
2. **Scan a QR code** (JWT) with the in-app camera; EMS validates the token server-side, shows the same summary, and staff confirm check-in.

Check-in writes the Event's **`attendanceProperty`** on the HubSpot Contact to `Yes`. Duplicate check-in is **idempotent** — show "already checked in"; do not write HubSpot again.

**Why this priority**: Core on-the-day workflow; replaces the legacy separate QR check-in app for scan + confirm.

**Independent Test**: Admin selects attendee by search → confirm → toast + row shows checked in; scan valid JWT for same Event → summary → confirm; scan JWT for wrong Event → error; repeat confirm → idempotent message.

**Acceptance Scenarios**:

1. **Given** check-in with catalog context, **When** staff search and select an attendee, **Then** the summary card shows fixed fields and **Confirm check-in** is available.
2. **Given** a registrant not yet checked in, **When** staff confirm check-in, **Then** HubSpot attendance property is set to `Yes` and UI reflects checked-in state.
3. **Given** a registrant already checked in, **When** staff confirm again, **Then** UI shows an idempotent "already checked in" message without a duplicate write.
4. **Given** a valid QR JWT for the open Event, **When** staff scan, **Then** the contact summary appears for staff review before confirm.
5. **Given** a QR JWT whose Event id does not match the open Event, **When** staff scan, **Then** check-in is rejected with a clear error.
6. **Given** check-in layout is visible, **When** staff type in the search field, **Then** the page layout (including QR scanner) stays mounted; only the table refreshes.
7. **Given** a non-admin user, **When** they attempt Check-in, **Then** they are redirected away.

---

### User Story 3 — Walk-in registration and check-in (Priority: P2)

An **admin** cannot find a person in the registered list. They open a **walk-in form** whose fields mirror the Program's public HubSpot registration form. On submit, EMS creates or updates the Contact (match by **email**), sets Parts Attended + attendance, records a form submission, and marks checked in — in one staff-mediated action.

**Why this priority**: Required for on-site edge cases; depends on HubSpot write scopes and form field mapping.

**Independent Test**: Walk-in with new email → Contact created + checked in; walk-in with existing email → Contact updated + checked in.

**Acceptance Scenarios**:

1. **Given** no search match, **When** staff complete the walk-in form with valid required fields, **Then** the person is checked in and appears in the attendee list on refresh.
2. **Given** an email matching an existing Contact, **When** staff submit walk-in, **Then** that Contact is updated (not duplicated).

*(Deferred post-SFTP — see [tasks.md](./tasks.md) Phase 6.)*

---

### Edge Cases

- Catalog context missing → empty state with link to select Program/Event.
- Camera unavailable (dev laptop, permission denied) → QR panel empty; name search still works.
- React StrictMode / scanner lifecycle → no duplicate cameras or uncaught stop errors.
- Mock mode → search and checked-in filters behave like live API query params.
- JWT verify misconfiguration (`CHECKIN_JWT_PUBLIC_KEY` unset) → `503` on scan route, not silent pass.
- Hostile attendee strings → rendered as text (XSS guard).

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST expose GET `programs/{programId}/events/{eventId}/attendees` with optional `q`, `checkedIn`, `page`, `pageSize` — **admin only**.
- **FR-002**: System MUST expose POST `.../checkin/scan` (JWT body) returning contact summary — **admin only**; JWT MUST be verified server-side (alg-pinned, expiry, issuer, Event-id match).
- **FR-003**: System MUST expose POST `.../checkin` (contactId) performing idempotent attendance write — **admin only**.
- **FR-004**: Attendee list columns MUST be fixed: name, company, email, account manager, attendee type, checked-in status.
- **FR-005**: Check-in summary MUST show: name, company, email, account manager, track, checked-in state (aligned with QR scan response).
- **FR-006**: Frontend MUST require catalog `programId` + `evId` before Attendees or Check-in modules render data.
- **FR-007**: Sidebar MUST show Attendees and Check-in links only for **admin** when Program + Event are selected.
- **FR-008**: Search MUST debounce; MUST NOT unmount the check-in layout on each keystroke.
- **FR-009**: Mock layer MUST honour attendee query filters (`q`, `checkedIn`).
- **FR-010**: Walk-in (US3) MUST NOT block release of US1 + US2.

### Non-Functional / Security

- **NFR-001**: No JWT private key or HubSpot tokens in frontend.
- **NFR-002**: Check-in and attendee mutations MUST be audited (actor, resource, outcome).
- **NFR-003**: QR library MUST be npm dependency (`html5-qrcode`), not CDN script tag.

---

## Success Criteria

- **SC-001**: Admin can load attendees for a selected Event and filter/search without leaving the page.
- **SC-002**: Admin can check in a registrant by name search and by QR scan (mock or live) with idempotent repeat behaviour.
- **SC-003**: Non-admin never sees attendee PII or check-in modules.
- **SC-004**: Backend route tests cover auth failures and primary error paths; happy-path scan/confirm covered before live cutover.
- **SC-005**: Manual QA in [quickstart.md](./quickstart.md) passes on UAT with mock API; live smoke passes after SFTP + `USE_MOCK_API: false`.

---

## Out of Scope

- QR **generation** for pre-event emails (HubSpot workflow — future).
- Walk-in (US3) in first check-in release tranche (tracked separately).
- Legacy `#/events/:eventId` mock routes — catalog context is source of truth.
- Public registration website changes.
