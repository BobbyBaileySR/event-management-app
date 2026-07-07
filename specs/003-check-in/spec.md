# Feature Specification: Attendees & Check-in (Slice 1)

**Feature Branch**: `003-check-in`

**Created**: 2026-07-05

**Status**: Clarified (US3 walk-in — ready for plan)

**Input**: User description: "Slice 1 attendee list and check-in — registered attendees for a Program + Event; staff check-in via QR scan, name search, and (later) walk-in; admin-only; first HubSpot write path."

**Depends on**: [001-catalog-admin](../001-catalog-admin/spec.md) and [002-catalog-metadata-modal](../002-catalog-metadata-modal/spec.md) — catalog pickers, Program/Event context, RBAC, and Event `attendanceProperty` / Program `hubspotFormIds` remain in force.

**Product context**: [CONTEXT.md](../../CONTEXT.md) · [ADR-003](../../docs/decisions/003-phase1-attendees-checkin.md)

---

## Clarifications

### Session 2026-07-05

- Q: Should search refetch the whole page or keep check-in layout mounted? → A: **Keep layout mounted** — debounce search (~300ms); full-page loader only on initial load or Program/Event change.
- Q: Does mock API need to honour search query params? → A: **Yes** — `getMockSliceAttendees` must filter by `q` and `checkedIn` so local dev matches live API behaviour.
- Q: Is walk-in in Slice 1 MVP? → A: **Defer until after SFTP** — name search + QR + confirm ship first; walk-in is US3 (separate phase).

### Session 2026-07-06 (US3 walk-in)

- Q: How should walk-in form fields be rendered? → A: **HubSpot form embedded in an `<iframe>`** — not EMS-native fields; HubSpot owns the form UX and submission.
- Q: Where is the walk-in form URL configured? → A: **Event catalog modal** — each Event record holds the HubSpot form embed/page URL (`walkInFormUrl`); admin sets it when creating or editing an Event.
- Q: How does staff enter walk-in mode on Check-in? → A: **Default view unchanged** (name search + QR + attendee table). A **mode switch** (segmented control: **Check-in | Walk-in**) toggles to walk-in view.
- Q: What does walk-in view show? → A: **Walk-in view only** — hides attendee table and QR scanner; shows the HubSpot form iframe full-width in the check-in card. Switching back restores the default check-in layout.
- Q: After iframe form submit, how is attendance recorded? → A: **HubSpot-only** — HubSpot form configuration / workflows set Parts Attended, attended, and form submission. EMS provides iframe shell only; **no `POST …/walkin` backend route** and no EMS-side attendance write for walk-in.
- Q: What should staff see in Walk-in mode besides the iframe? → A: **Persistent hint above iframe** — static EMS copy instructing staff to verify the person in **Attendees** after HubSpot form submit (manual refresh; no postMessage detection).
- Q: Which URLs should `walkInFormUrl` accept? → A: **HubSpot hosts only** — HTTPS URLs whose host matches allowlist (`*.hubspot.com`, `*.hsforms.com`, `share.hsforms.com`); reject others at Event modal save and at iframe render.
- Q: Should Walk-in behave differently when `USE_MOCK_API: true`? → A: **Same as live** — Walk-in loads `walkInFormUrl` from catalog when set; mock API flag does not affect iframe behaviour (mock applies to EMS attendee/check-in routes only).
- Q: Should backend validate `walkInFormUrl` on catalog write? → A: **Frontend + backend** — Same HubSpot HTTPS host allowlist on Event POST/PATCH; reject invalid URL with `400`.

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

### User Story 3 — Walk-in via HubSpot form embed (Priority: P2)

An **admin** on the **Check-in** page switches from the default **Check-in** mode to **Walk-in** mode. The page hides the attendee search table and QR scanner and shows a **HubSpot registration form** embedded in an **iframe**, loaded from the selected Event's **`walkInFormUrl`** (configured in the Event catalog modal). Staff complete the form in HubSpot's native UI. **HubSpot alone** handles Contact create/update, Parts Attended, attendance, and form submission via form configuration and workflows — EMS does not proxy or duplicate those writes.

**Why this priority**: Required for on-site edge cases; iframe defers field discovery and write logic to HubSpot (see [CONTEXT.md](../../CONTEXT.md) Walk-in).

**Independent Test**: Admin sets `walkInFormUrl` on an Event → opens Check-in → switches to Walk-in → iframe loads HubSpot form → staff submit valid form → HubSpot thank-you appears in iframe → person appears in Attendees after staff refresh (HubSpot registration rules satisfied).

**Acceptance Scenarios**:

1. **Given** an admin with Program + Event selected and a valid `walkInFormUrl`, **When** they switch to Walk-in mode, **Then** the iframe loads that URL, a **persistent hint** appears above the iframe (verify in Attendees after submit), and the search table + QR scanner are not visible.
2. **Given** Walk-in mode, **When** staff switch back to Check-in mode, **Then** the default layout (search + QR + table) returns and the iframe is unmounted (no background HubSpot load).
3. **Given** an Event with no `walkInFormUrl`, **When** staff switch to Walk-in mode, **Then** they see an empty state with guidance to set the URL in catalog Settings (not a broken iframe).
4. **Given** a walk-in form submission in HubSpot (new email), **When** staff refresh Attendees, **Then** the person appears in the registered list for that Event (HubSpot-side registration rules satisfied).
5. **Given** a walk-in form submission (existing email), **When** staff refresh Attendees, **Then** the existing Contact is updated — not duplicated — and reflects checked-in state per HubSpot form configuration.

*(Implementation tranche — see [tasks.md](./tasks.md) Phase 5.)*

---

### Edge Cases

- Catalog context missing → empty state with link to select Program/Event.
- Camera unavailable (dev laptop, permission denied) → QR panel empty; name search still works.
- React StrictMode / scanner lifecycle → no duplicate cameras or uncaught stop errors.
- Mock mode → search and checked-in filters behave like live API query params; Walk-in iframe loads real HubSpot URL from catalog (unaffected by `USE_MOCK_API`).
- JWT verify misconfiguration (`CHECKIN_JWT_PUBLIC_KEY` unset) → `503` on scan route, not silent pass.
- Hostile attendee strings → rendered as text (XSS guard).
- Event missing `walkInFormUrl` → Walk-in mode shows catalog setup guidance; Check-in mode unaffected.
- Invalid or non-HubSpot `walkInFormUrl` → rejected at catalog save; if legacy invalid value exists, Walk-in mode shows validation error (do not load iframe).
- Switching Check-in ↔ Walk-in → QR scanner stopped on leave Walk-in (same lifecycle rules as US2); iframe removed from DOM when not in Walk-in mode.
- CSP `frame-src` must allow HubSpot embed origins (production build) — see NFR-004.

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
- **FR-011**: Event catalog records MUST support optional **`walkInFormUrl`** (HTTPS HubSpot form embed or share URL), editable in the Event modal (create + edit); cleared via PATCH `null` like other optional metadata. URL MUST pass HubSpot host allowlist validation (`*.hubspot.com`, `*.hsforms.com`, `share.hsforms.com`) on **frontend save and backend POST/PATCH**; invalid URLs MUST be rejected with a field error / `400`.
- **FR-012**: Check-in page MUST default to **Check-in mode** (US2 layout). MUST expose a **mode switch** (segmented control: Check-in | Walk-in) visible only when Program + Event are selected and user is **admin**.
- **FR-013**: **Walk-in mode** MUST render a **persistent staff hint** above the iframe (e.g. “After submit, check Attendees to confirm registration”) and the HubSpot form iframe only (no attendee table, no QR scanner). **Check-in mode** MUST NOT render the walk-in iframe or hint.
- **FR-014**: Walk-in iframe MUST use the selected Event's `walkInFormUrl` as `src`. If unset, show empty state — do not load a fallback URL.
- **FR-015**: Walk-in MUST NOT add an EMS backend write route (`POST …/walkin` / `OnWalkIn.ts`). All walk-in HubSpot mutations are owned by the embedded form and HubSpot configuration.
- **FR-016**: Walk-in iframe behaviour MUST NOT depend on `USE_MOCK_API`; when `walkInFormUrl` is set, load the real HubSpot embed in mock and live environments alike.

### Non-Functional / Security

- **NFR-001**: No JWT private key or HubSpot tokens in frontend.
- **NFR-002**: Check-in and attendee mutations MUST be audited (actor, resource, outcome). Walk-in iframe submissions are **not** EMS mutations — no EMS audit entry for HubSpot form submit.
- **NFR-003**: QR library MUST be npm dependency (`html5-qrcode`), not CDN script tag.
- **NFR-004**: Production CSP MUST allow HubSpot form embed in `frame-src` (e.g. `https://*.hubspot.com`, `https://*.hsforms.com`, `https://share.hsforms.com`) without widening `script-src` or `connect-src` beyond existing rules. `walkInFormUrl` allowlist MUST align with CSP `frame-src`.

---

## Success Criteria

- **SC-001**: Admin can load attendees for a selected Event and filter/search without leaving the page.
- **SC-002**: Admin can check in a registrant by name search and by QR scan (mock or live) with idempotent repeat behaviour.
- **SC-003**: Non-admin never sees attendee PII or check-in modules.
- **SC-004**: Backend route tests cover auth failures and primary error paths; happy-path scan/confirm covered before live cutover.
- **SC-005**: Manual QA in [quickstart.md](./quickstart.md) passes on UAT with mock API; live smoke passes after SFTP + `USE_MOCK_API: false`.
- **SC-006**: Admin can switch Check-in ↔ Walk-in on the Check-in page; Walk-in loads the Event's HubSpot form iframe when `walkInFormUrl` is set.
- **SC-007**: Invalid `walkInFormUrl` values are rejected by Event modal and catalog API (backend `400`).

---

## Out of Scope

- QR **generation** for pre-event emails (HubSpot workflow — future).
- EMS-native walk-in form fields (replaced by HubSpot iframe per Session 2026-07-06).
- EMS backend walk-in write route (`OnWalkIn.ts`, `POST …/walkin`) — HubSpot form owns writes (Session 2026-07-06).
- Legacy `#/events/:eventId` mock routes — catalog context is source of truth.
- Public registration website changes (EMS embeds existing HubSpot form URL only).
