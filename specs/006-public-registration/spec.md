# Feature Specification: Public Registration (Slice 3)

> **Design-only / re-plan before building.** Spec still describes a Registration panel on **Event Settings** (`SettingsView`) and Program-first catalog pickers — those surfaces were retired in the event-first redesign. Re-home the panel onto Programs & Events / Event Details (or another current surface) before implementation. Plan and tasks are already marked do-not-execute.

**Feature Branch**: `006-public-registration`

**Created**: 2026-07-07

**Status**: Not started — all 39 tasks in `tasks.md` remain unchecked; no `RegistrationPanel.tsx` and no `SettingsView.tsx` in `Frontend/src`. Some catalog fields (`publishState`, `walkInFormUrl`, `registrationFormUrl`, `registrationSlug`) shipped via other work, but the Registration panel UI, Settings hub, and HubSpot-editor deep link described here are unbuilt. *(Verified 2026-07-17.)*

**Input**: User description: "Slice 3 — public registration: staff link EMS to HubSpot-hosted landing pages via a Registration panel on Event Settings; Program default URL with optional Event override; EMS registration publish state (draft/published); copy link and Open in HubSpot admin editor; catalog modals stay in sync; distinct from walk-in form URL; admin-only." *(Settings hub retired — re-plan UI home.)*

**Depends on**: [001-catalog-admin](../_shipped/001-catalog-admin/spec.md), [002-catalog-metadata-modal](../_shipped/002-catalog-metadata-modal/spec.md), and [003-check-in](../003-check-in/spec.md) — catalog + check-in foundations remain; navigation is now event-first (WorkingEventPicker / Programs & Events), not Settings + catalog pickers.

**Product context**: [CONTEXT.md](../../CONTEXT.md) (Slice 3, Public registration page URL, Registration publish state, Registration panel, Walk-in form URL)

**Out of slice**: EMS page builder, HubSpot Breeze integration inside EMS, registration wave / second-touch form UX, HubSpot publish-state API sync, white-glove Program flags, non-admin access.

---

## Clarifications

### Session 2026-07-07 (grilling)

- Q: Where should the public registration page URL live? → A: **Program default** with optional **Event override** when a part needs its own landing page.
- Q: What is the minimum Slice 3 deliverable in staff EMS? → A: **Registration panel** on Event Settings — resolved URL, publish state, copy link, Open in HubSpot — no page builder.
- Q: How do public registration URL and walk-in form URL relate? → A: **Different URLs** — public landing page vs staff-only HubSpot embed on Check-in.
- Q: How do multiple Program form IDs map to public URLs? → A: **One public URL per Program** — extra form IDs are alternate/legacy forms, not separate public pages.
- Q: Should EMS show draft vs published state? → A: **EMS-owned** — staff set registration publish state manually; not inferred from HubSpot.
- Q: When an Event has an override URL, does it inherit Program publish state? → A: **Independent** — Event override has its own publish state.
- Q: Can admins edit URL and publish state on the Registration panel? → A: **Yes — inline on the panel**; catalog Program/Event modals stay in sync.
- Q: What should Open in HubSpot do? → A: **HubSpot admin page editor** — derived from the public URL where HubSpot allows (no separate admin URL field in Slice 3).
- Q: Who can access Registration panel features? → A: **`admin` role only** — non-admins do not see the panel or registration controls (same gate as Attendees, Check-in, and Email).

### Session 2026-07-07 (clarify)

- Q: Which HTTPS hosts should EMS accept for public registration page URLs? → A: **HubSpot subdomains + custom domains** — allow `*.hubspot.com`, `*.hs-sites.com`, and any valid HTTPS host (custom domains trusted because staff paste the URL after publishing in HubSpot); reject non-HTTPS and malformed URLs.
- Q: Can an admin disable registration link sharing for one Event without an Event override URL? → A: **No** — Events without override inherit Program URL **and** Program publish state; per-Event disable requires an Event override URL (may remain draft).
- Q: What should non-admin staff see on Event Settings? → A: **Settings remains accessible** — non-admins see Settings but the **Registration panel is hidden**; other Settings content is unchanged.
- Q: When HubSpot admin editor URL cannot be derived from the public URL, what should Open in HubSpot do? → A: **Generic HubSpot fallback link** — open HubSpot Marketing → Landing pages (portal list) with a brief inline note that the exact editor deep link was unavailable.
- Q: When an admin saves a registration URL for the first time, what should the default registration publish state be? → A: **Draft** — copy link disabled until admin explicitly sets published.

---

### User Story 1 — View resolved registration link for an Event (Priority: P1) 🎯 MVP

An **admin** selects a **Program** and **Event**, opens **Settings**, and sees the **Registration panel** with the **resolved registration URL** (Event override if set, otherwise Program default), the **registration publish state** for that resolved scope, and actions to **copy the public link** (when published) and **Open in HubSpot**. The panel makes clear whether registration is driven by the Program URL or an Event-specific override. Staff understand this is the **Contact-facing landing page**, not the walk-in embed used on Check-in.

**Why this priority**: Day-to-day staff need one place to find and share the correct public signup link without hunting in HubSpot or catalog admin.

**Independent Test**: Admin sets Program URL + published state → opens Settings for an Event without override → panel shows Program URL and Program publish state → copy link works → Open in HubSpot opens admin editor (or documented fallback).

**Acceptance Scenarios**:

1. **Given** an admin with Program + Event selected, **When** they open Settings, **Then** the Registration panel is visible with resolved URL, publish state, and source indicator (Program default vs Event override).
2. **Given** a **published** resolved URL, **When** the admin uses **Copy registration link**, **Then** the public Contact-facing URL is copied and a success confirmation is shown.
3. **Given** a **draft** resolved URL, **When** the admin views the panel, **Then** copy link is disabled or clearly blocked with guidance that registration is not yet published in EMS.
4. **Given** an Event with no override and a Program URL set, **When** the admin views the panel, **Then** the Program URL and Program publish state apply.
5. **Given** a non-admin user, **When** they open Settings, **Then** they do **not** see the Registration panel; other Settings content remains available.

---

### User Story 2 — Configure Program registration URL and publish state (Priority: P1)

An **admin** sets or updates the **public registration page URL** and **registration publish state** for a **Program** — either in the **Program catalog modal** or **inline on the Registration panel** when viewing any Event under that Program without an override. Changes in one place are reflected in the other. The URL must be a valid HTTPS HubSpot landing-page URL. Staff use **draft** while the page is being prepared and **published** when they are ready to share the link.

**Why this priority**: Program-level URL is the default for most Events; without configure + sync, the panel has nothing useful to show.

**Independent Test**: Admin creates Program with URL in catalog modal (draft) → opens Settings for child Event → panel shows same URL/state → edits to published on panel → catalog admin shows published → copy link enabled.

**Acceptance Scenarios**:

1. **Given** the Program catalog modal, **When** an admin enters a valid HubSpot landing-page URL and saves (first time), **Then** registration publish state defaults to **draft**, the Program saves, and the Registration panel reflects draft until explicitly published.
2. **Given** the Registration panel for an Event without override, **When** the admin edits URL or publish state inline, **Then** the Program catalog record updates and persists the same values.
3. **Given** an invalid URL (non-HTTPS, malformed, or disallowed scheme), **When** the admin saves, **Then** validation fails with a clear field error and no partial save.
4. **Given** a URL cleared (removed), **When** the admin saves, **Then** the Registration panel shows an empty state with guidance to add a Program URL (or Event override).
5. **Given** multiple `hubspotFormIds` on the Program, **When** the admin configures one public URL, **Then** the system does not require or offer additional public URLs per extra form ID.

---

### User Story 3 — Event override URL with independent publish state (Priority: P2)

When one **Event** under a Program needs its own landing page, an **admin** sets an **Event override registration URL** and its own **registration publish state** — in the **Event catalog modal** or **inline on the Registration panel** for that Event. The override is independent of the Program URL and Program publish state. Other Events under the same Program continue to use the Program default.

**Why this priority**: Override is needed for multi-part Programs (e.g. VIP-only page) but is secondary to the Program default path.

**Independent Test**: Program URL published → VIP Event gets override URL (draft) → VIP panel shows override + draft → copy blocked for VIP → Meeting Room Event still shows Program URL + published → publish VIP → VIP copy works.

**Acceptance Scenarios**:

1. **Given** an Event catalog modal or Registration panel, **When** the admin sets an Event override URL, **Then** that Event’s resolved URL uses the override; sibling Events without overrides still use the Program URL.
2. **Given** an Event with an override URL, **When** the admin sets publish state to draft while Program is published, **Then** only that Event’s resolved scope is draft — Program and other Events are unaffected.
3. **Given** an Event override URL cleared, **When** the admin saves, **Then** the Event falls back to Program URL and Program publish state for resolution.
4. **Given** inline edit on the panel, **When** the admin changes Event override fields, **Then** the Event catalog modal shows the same values on next open.

---

### User Story 4 — Open HubSpot to edit the landing page (Priority: P2)

An **admin** uses **Open in HubSpot** from the Registration panel to jump to the **HubSpot admin page editor** for the resolved landing page. This supports staff who pasted the public URL into EMS and now need to edit content in HubSpot. If a reliable editor deep link cannot be derived from the public URL, the system falls back to a documented staff workflow without blocking other panel features.

**Why this priority**: Reduces context-switching friction; depends on a configured URL existing (US1/US2).

**Independent Test**: Admin with published resolved URL → Open in HubSpot → lands in HubSpot admin context for that page (or sees documented fallback message/link).

**Acceptance Scenarios**:

1. **Given** a resolved registration URL, **When** the admin chooses **Open in HubSpot**, **Then** a new browser tab opens to the HubSpot **admin editor** for that page (derived from the public URL where supported).
2. **Given** derivation is not possible for a valid stored URL, **When** the admin chooses **Open in HubSpot**, **Then** a new tab opens to the **HubSpot Marketing → Landing pages** portal list and a brief inline note explains the exact editor deep link was unavailable.
3. **Given** no resolved URL configured, **When** the admin views the panel, **Then** Open in HubSpot is disabled or hidden.

---

### Edge Cases

- **Catalog context missing** → Settings shows guidance to select Program + Event first (same pattern as other event modules).
- **Per-Event disable without override URL** → not supported; Events without override always inherit Program URL and Program publish state. To block copy for one Event, set an **Event override URL** and keep it **draft** (or clear override to fall back to Program).
- **Program URL unset, no Event override** → Registration panel empty state; copy and Open in HubSpot disabled.
- **Event catalog `status` (active/draft/cancelled)** → does **not** drive registration publish state; EMS registration publish state is separate.
- **White glove Program** → EMS does **not** block URL configuration; staff voluntarily skip mass outreach per team practice.
- **Walk-in form URL** → unchanged on Event; Registration panel does not conflate or replace `walkInFormUrl`.
- **Invalid registration URL** → non-HTTPS, malformed, or wrong scheme rejected at save; HubSpot subdomains (`*.hubspot.com`, `*.hs-sites.com`) and **custom domains** (any valid HTTPS host staff paste after HubSpot publish) are accepted.
- **Archived Program or Event** → Registration panel follows catalog visibility rules (hidden from navigation); stored URLs retained for audit.
- **First URL save** → registration publish state defaults to **draft**; copy link remains disabled until admin explicitly sets **published**.
- **Open in HubSpot derivation fails** → open **HubSpot Marketing → Landing pages** portal list in a new tab; show brief inline note that exact editor deep link was unavailable (button remains enabled when resolved URL exists).
- **Mock vs live** → mock layer supports full Registration panel UX until live catalog fields are enabled.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST expose a **Registration panel** on Event **Settings** for the selected **Program + Event**, showing **resolved registration URL**, **registration publish state**, **source** (Program default vs Event override), **Copy registration link**, and **Open in HubSpot**. Module is **`admin` role only**.
- **FR-002**: **Resolved registration URL** MUST use Event override URL when set; otherwise Program default URL. Events **without** override MUST inherit Program URL **and** Program publish state — no per-Event disable without an override URL.
- **FR-003**: **Registration publish state** MUST be **EMS-owned** (`draft` | `published`), set by staff — not inferred from HubSpot. Program has publish state; only an **Event with an override URL** has **independent** publish state. **Default on first URL save:** `draft` (copy disabled until explicitly published).
- **FR-004**: **Copy registration link** MUST copy the **public Contact-facing URL** only when the resolved publish state is **published**; MUST be blocked or clearly disabled when **draft** or URL unset.
- **FR-005**: System MUST store **one public registration page URL per Program** (plus optional **Event override**). Multiple Program **form IDs** MUST NOT require multiple public URLs in EMS.
- **FR-006**: Admins MUST be able to edit Program URL and Program publish state in the **Program catalog modal** and **inline on the Registration panel** (for Events without override); both surfaces MUST stay in sync.
- **FR-007**: Admins MUST be able to edit Event override URL and Event publish state in the **Event catalog modal** and **inline on the Registration panel**; both surfaces MUST stay in sync.
- **FR-008**: Public registration page URLs MUST be valid **HTTPS** URLs. Accepted hosts: HubSpot subdomains (`*.hubspot.com`, `*.hs-sites.com`) and **custom domains** (any valid HTTPS host — trusted because staff paste the URL after publishing in HubSpot). Non-HTTPS, malformed, or non-URL values MUST be rejected on save with clear field errors. (Distinct from walk-in form URL allowlist — see 003-check-in.)
- **FR-009**: **Open in HubSpot** MUST open the HubSpot **admin page editor** derived from the public URL where HubSpot allows. If derivation fails, MUST open the **HubSpot Marketing → Landing pages** portal list in a new tab and show a brief inline note that the exact editor deep link was unavailable — not a broken link or disabled button (when resolved URL exists).
- **FR-010**: System MUST NOT build, host, or generate public registration pages in EMS — page creation remains in HubSpot (manual or Breeze in HubSpot admin).
- **FR-011**: Registration panel MUST clearly distinguish **public registration page URL** from **walk-in form URL** (Check-in); MUST NOT modify walk-in behaviour.
- **FR-012**: Catalog mutations for registration URL and publish state MUST be **audited** (actor, action, resource, outcome).
- **FR-013**: Non-admin roles MUST NOT see the **Registration panel** or registration edit/copy/Open actions; the **Settings** module itself remains accessible and other Settings content is unchanged.

### Non-Functional / Security

- **NFR-001**: No HubSpot credentials or private keys in the staff browser; catalog writes execute only through authenticated staff session and server-side integration.
- **NFR-002**: Registration panel MUST NOT be available to non-admin roles in Slice 3 (communications/viewer/operator deferred).
- **NFR-003**: Dynamic text (URLs, labels, state) MUST render as plain text — no unsafe HTML injection; external links use validated URLs only.
- **NFR-004**: Registration panel MUST work on mobile, tablet, and desktop layouts (responsive requirement per project constitution).

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An admin can find and **copy the published registration link** for an Event in **under 1 minute** without opening HubSpot or catalog admin (from Settings Registration panel).
- **SC-002**: An admin can set a Program registration URL and publish state in the catalog modal and see the same values on the Registration panel **without a second save** (sync verified).
- **SC-003**: An admin with an Event override can publish that Event’s link **independently** of the Program publish state (verified in override QA scenario).
- **SC-004**: An admin can open HubSpot to edit the landing page from the Registration panel in **one click** when a resolved URL exists (or receive clear fallback guidance if derivation fails).
- **SC-005**: Non-admin staff **never** see the Registration panel on Settings (verified in role-based QA); other Settings content remains accessible.
- **SC-006**: Staff can identify whether the displayed link is **Program default or Event override** without opening catalog admin (source indicator on panel).

---

## Assumptions

- **Slice 1** catalog navigation, Program `hubspotFormIds`, Event `walkInFormUrl`, and admin RBAC are shipped and stable. **Correction (2026-07-17):** the "Settings hub module" this assumption originally also claimed as shipped **does not exist** in `Frontend/src` — there is no `SettingsView.tsx` or equivalent today. Foundational work for this slice must build (or confirm a home for) that Settings surface before `RegistrationPanel.tsx` has anywhere to live.
- **HubSpot landing pages** are created and published in HubSpot admin (or Breeze) before or after EMS linking — EMS links to URLs staff provide. Custom domains on HubSpot landing pages are accepted when staff paste the published HTTPS URL.
- **HubSpot admin editor URL** can often be derived from the public landing-page URL; if not, implementation documents a fallback in research/plan (no separate admin URL field in Slice 3).
- **Registration publish state** is operational intent in EMS (share link or not) — not a live mirror of HubSpot’s internal publish APIs. **Default on first URL save:** `draft`.
- **Communications**, **operator**, and **viewer** roles do not grant Registration access in Slice 3 — **admin only** until a future RBAC slice.
- **White glove Programs** rely on staff discipline, not EMS enforcement.
- **Registration wave** / second-touch form UX remains deferred (CONTEXT.md).

---

## Out of Scope

- EMS **page builder**, in-app landing-page design, or **Breeze** integration inside EMS.
- **HubSpot publish-state API sync** or automatic draft/published detection from HubSpot.
- **Multiple public URLs per Program form ID** — one Program URL (+ optional Event overrides) only.
- **Registration wave** / conditional form pages / second-touch signup flows.
- **Public-facing EMS-hosted** signup pages.
- Changes to **walk-in** Check-in iframe behaviour (`walkInFormUrl`).
- **`communications` role** (or other non-admin roles) for Registration — deferred; admin-only for Slice 3.
- **White glove** Program flag or EMS blocking of URL configuration.
- **Email dispatch** integration (Slice 2) — staff copy link manually into emails for now.
