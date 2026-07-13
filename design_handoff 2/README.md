# Handoff: Event Management System (EMS) UI Overhaul

## Overview
This package is a UI/UX redesign of an internal event-management tool ("EventOS"). It covers
Overview/dashboard, Programs & Events, Event Details, Registered Attendees, Check-in,
Email campaigns, and Audit Log — replacing the current AI-generated UI (built in Cursor) with a
deliberately designed visual system. Several of these screens already exist in the shipped app;
others (see `DESIGN-CONTEXT.md`) are net-new.

## About the design files
The files in this bundle (`Event Management System.dc.html` and `lib/`) are **design
references built in HTML** — a high-fidelity interactive prototype showing intended look,
layout, states, and behavior. They are **not production code to copy directly**. The task is to
**recreate these designs in the existing application's real stack** (React, whatever data layer
it already uses) using its established patterns, components, and libraries — wiring real data
and persistence in place of the prototype's mock/local-state behavior.

## Fidelity
**High-fidelity.** Final colors, typography, spacing, and interaction states are intentional and
should be recreated pixel-accurately. Exact values are in the Design Tokens section below and in
the theme definitions inside the HTML (`THEMES` object, ~line 1218).

## Screens / Views

### 1. Overview (dashboard)
- **Purpose**: at-a-glance snapshot of activity across all events.
- **Layout**: header (title + subtitle) → 4-stat grid (2 cols mobile/tablet, 4 cols desktop,
  14px gap) → 2-column split below (`2fr 1fr` desktop, stacks to `1fr` on tablet/phone): left
  card is "Upcoming events" list, right column reserved for secondary content.
- **Components**:
  - Stat card: 1px border, 16px radius, panel background, `--card-shadow`, 18px padding. Small
    3px accent-colored square dot at top, value at 24px/800 weight, label 13.5px/600, delta text
    11.5px muted.
  - Upcoming event row: `44px 1fr 120px 96px` grid, 14px gap, 11px vertical padding, border-bottom
    divider. Left: 44×44px date badge (10px radius, `--ice` bg, `--denim` text, day+month
    stacked). Center: name (13.5px/600) + location (11.5px muted), both truncated with ellipsis.
    Right columns hidden on mobile (`data-hide-mobile`).

### 2. Programs & Events
- **Purpose**: browse/manage the Program → Event hierarchy; create/edit/delete both.
- **Layout**: filter pill row (All / Active / Cancelled / Completed) → paginated event list →
  pager footer ("Page X of Y · N events").
- **Modals**: New/Edit Event (520px wide) — fields: Event name (text), Program (select, incl.
  "No program"), Date (custom calendar popover), Start time (custom time popover), Location
  (text), Capacity (number), Status (select: Active/Completed). New/Edit Program (520px) —
  Program name, Description (textarea), Program owner (select), Start date, End date.
- **Delete**: confirm-modal pattern (see Interactions) before removing an event/program.

### 3. Event Details
- **Purpose**: single-event snapshot scoped to the sidebar's "working event."
- **Components**: 4-stat row (Registered, Capacity, Checked in, Filled %) using the same stat
  card as Overview; attendee preview list (first 5 attendees).

### 4. Registered Attendees
- **Purpose**: full roster for the working event.
- **Layout**: stats row (Registered / Checked in / Not checked in) → search + status filter
  (All statuses / Checked in / Registered) → paginated table → pager.
- **Interaction**: remove attendee triggers the same confirm-modal pattern.

### 5. Check-in
- **Purpose**: in-venue check-in, tuned for tablet as the primary device.
- **Layout**: `checkinGridRows` — single column on desktop, `minmax(340px,1fr) auto` on
  tablet/phone (list area flexes, action area pinned below).
- **Components**: manual check-in/out toggle per attendee row; QR scan panel with three camera
  permission states (`prompt` / `allow` / `deny`) driven by `cameraState`; scanning animation
  (`emsScan` keyframe, a beam sweeping top:14px → calc(100% - 16px) over the frame) with a
  transient `scanFeedback` result banner.
- **Confirm modal**: "Confirm check-in" / "Confirm check-out" (420px, no fields) before applying.

### 6. Email
- **Purpose**: compose and send/schedule a campaign to event attendees or a HubSpot list.
- **Layout**: template picker (select) → recipient mode toggle (Event attendees / HubSpot list,
  pill-style 2-option switch) → recipient count display → send mode toggle (Send now / Schedule,
  same pill switch) → conditional schedule date/time pickers when "Schedule" is active.
- **Stats**: Sent / Scheduled / Drafts counts at top.

### 7. Audit Log
- **Purpose**: paginated history of actions.
- **Loading state**: entering this view sets `auditLoading` for a simulated 10s fetch delay
  (mirrors the global app-load simulation — see State Management).
- **Layout**: paginated list, pager footer ("Page X of Y · N entries").

### Shared chrome (all screens)
- **Sidebar (desktop ≥1024px, 236px wide)**: logo mark (32×32px, 8px radius, accent bg, "E"
  glyph) + wordmark → nav groups: Workspace (Overview, Programs & Events), a "Working event"
  picker (searchable dropdown scoping the event-specific nav items), Event-scoped nav
  (Event Details, Attendees, Check-in, Email), Admin nav (Audit Log), then a Theme switcher pinned
  to the bottom (3 swatch buttons, one per theme).
- **Tablet (768–1023px)**: 64px icon rail replaces the sidebar; a hamburger button opens a
  slide-out drawer with the same nav content. All icon buttons ≥44×44px hit target.
- **Phone (<768px)**: top horizontal tab bar (scrollable) replaces the sidebar/rail; theme
  switcher moves into a row directly below the tabs.
- **Header**: title + subtitle (both truncate with ellipsis on overflow), height/padding varies
  by breakpoint (`18px 32px` desktop, `16px 20px` tablet/phone).
- **Loading screen**: shown for the initial ~10s mock data load — spinner (46px, 3px border,
  border-top in accent color, `emsSpin` 0.85s linear infinite rotation) + a rotating "Did you
  know?" tip card, tip changes every 3.2s.
- **Confirm modal** (generic, reused for all destructive actions): message text, Cancel/Confirm
  buttons.
- **Field pickers**: custom calendar popover (day grid, 36px min cells, accent-filled selected
  day, today shown in accent text) and custom time popover — used in place of native
  date/time inputs throughout, for visual consistency across the 3 themes.

## Interactions & Behavior
- **Working event scoping**: selecting an event in the sidebar's "Working event" picker scopes
  Event Details / Attendees / Check-in / Email to that event. Search-filterable dropdown, opens
  on click, closes on selection.
- **Destructive actions** (delete event/program/campaign, remove attendee): always go through a
  confirm modal (message + Cancel/Confirm) — never a direct delete.
- **Theme switching**: 3 themes (Aurora / Celebration / Dark Aurora, see tokens below), switchable
  from the sidebar (desktop), rail (tablet), or a row under the tab bar (phone). Switch is
  instant, no transition/animation.
- **QR check-in simulation**: camera permission state machine (prompt → allow/deny); when
  "allowed," a scanning beam animates continuously; a "scan" produces a transient success/error
  feedback banner that auto-clears (`scanFeedbackTimer`).
- **Loading states**: (1) initial app load — full-screen spinner + rotating tips, ~10s simulated
  fetch of `lib/mock-data.js`; (2) Audit Log — separate ~10s simulated loading state entered each
  time that view is opened.
- **Responsive breakpoints**: recalculated live on window resize (`vw` state updates on
  `resize` listener) — desktop ≥1024px, tablet 768–1023px, phone <768px.
- **Pagination**: consistent pattern across Events, Attendees, Check-in, and Audit Log lists —
  "Page X of Y · N items" label, Prev/Next buttons (44px min-height, disabled/dimmed at bounds).
- **Form fields**: all custom-built (not native inputs) — text, textarea, select (custom popover
  list), date (calendar popover), time (time-list popover), number — for cross-theme visual
  consistency. All interactive targets are ≥44px tall per the tablet-first touch-target rule.

## State Management (from the prototype — for reference, not to be copied literally)
Prototype state of note (real implementation should replace local/session state with real
data + persistence):
- `theme` — active theme id (`aurora` / `celebration` / `darkAurora`).
- `view`, `activeEventId`, `detailEventId` — current screen + working/detail event scoping.
- `data` — loaded from `lib/mock-data.js` after a simulated fetch delay; shape: `events`,
  `attendees`, `auditLog`, `hubspotLists`, `programs`, `statusLabels`, `emailTemplates`.
- `checkinList`, `cameraState`, `scanFeedback` — check-in screen state.
- `modal`, `editingEventId`, `editingCampaignId`, `editingProgramName`, `modalFieldValues` —
  create/edit modal state.
- `confirmModal` — generic confirm-before-destructive-action state.
- `deletedProgramIds`, `deletedEventIds`, `deletedCampaignIds`, `removedAttendeeIds` — prototype's
  session-only "soft delete" lists (nothing is actually removed from the mock dataset).
- `eventFilter`, `eventsPage`, `attendeesStatusFilter`, `attendeesPage`, `auditPage` — filter/
  pagination state per screen.
- `recipientMode`, `sendMode`, `scheduleDate`, `scheduleTime`, `emailTemplateId` — Email screen
  compose state.
- `tabletDrawerOpen`, `workingEventOpen`, `openPopover` — chrome/UI-only toggle state.

See `DESIGN-CONTEXT.md` for what real data model / persistence / integrations should replace this.

## Design Tokens

### Typography
- Font family: **Manrope** (400/500/600/700/800), loaded from Google Fonts.
- Icon font: **Material Symbols Outlined**.
- Scale in use: 10px, 10.5px, 11px, 11.5px, 12px, 12.5px, 13px, 13.5px, 14.5px, 16.5px, 24px.
- Weights in use: 500 (body), 600 (labels/emphasis), 700 (headings/nav), 800 (stat values,
  logo mark).

### Color — 3 themes, switchable at runtime
All colors are CSS custom properties set per-theme on the root (`--page-bg`, `--sidebar-bg`,
`--panel-bg`, `--border`, `--text`, `--muted`, `--accent`, `--accent-soft`, `--denim`,
`--on-denim`, `--ice`, `--gold`, `--cobalt`, `--shadow`, `--card-shadow`, `--input-bg`), plus
status colors (success/info/danger + their soft backgrounds) computed per-theme.

**Aurora** (default — light, airy enterprise SaaS):
page bg `#F5F7FE`, sidebar/panel `#FFFFFF`, border `#E1E7F7`, text `#000A27`, muted `#5A6478`,
accent `#FF6633`, accent-soft `#FFF1EC`, denim `#0B0573`, ice `#ECF1FF`, gold `#FFCB00`,
cobalt `#4775FF`, success `#166534`/`#DCFCE7`, info `#0369A1`/`#E0F2FE`,
danger `#991B1B`/`#FEE2E2`.

**Celebration** (light, bright pink special edition — same structure as Aurora):
page bg `#FEF8FA`, sidebar/panel `#FFFFFF`, border `#F6D6E0`, text `#3D2530`, muted `#93707E`,
accent `#EC6C93`, accent-soft `#FCE4EA`, denim `#D45C82`, ice `#FDF1F5`, cobalt `#F2A0BE`.

**Dark Aurora** (dark — for low-light, in-room event use):
page bg `#0B0E1A`, sidebar/panel `#11162A`, border `rgba(255,255,255,0.08)`, text `#F3F5FF`,
muted `#93A0C4`, accent `#FF6633` (same accent as Aurora), accent-soft `rgba(255,102,51,0.16)`,
denim `#7C9CFF`, ice `rgba(124,156,255,0.14)`, success `#4ADE80`, info `#8AB0FF`,
danger `#FCA5A5`.

### Radius
- Small controls/buttons: 7–9px. Cards: 14–16px. App frame shell: 20px.

### Shadow
- App frame: theme's `--shadow` (large, soft, tinted with the accent/denim color).
- Cards: theme's `--card-shadow` (tighter, e.g. `0 4px 20px -8px rgba(11,5,115,0.10)` in Aurora).

### Spacing
- Card padding: 18–22px. Section gaps: 14–20px. Sidebar item gap: 2px. Nav section dividers:
  1px border + 14–16px margin.

### Breakpoints
- Desktop ≥1024px, Tablet 768–1023px, Phone <768px.

## Assets
- Google Fonts: Manrope, Material Symbols Outlined (loaded via `<link>`, no local files needed).
- No custom icon/image assets — all icons are Material Symbols glyphs; date badges and avatars
  are styled text, not images.
- `lib/mock-data.js` — prototype-only mock dataset (events, attendees, programs, audit log,
  HubSpot lists, email templates). Reference for field shapes; not a real data source.

## Screenshots
See `screenshots/`. Captured at tablet width (icon-rail nav) except `desktop-*.png` (see Screenshots section) — see
the prototype itself, or resize your browser, for the phone tab-bar chrome.

**Base screens, all 3 themes:**
- `aurora-01-overview.png` … `aurora-07-audit-log.png` — every screen, Aurora (default theme).
- `celebration-01-theme-switch.png`, `celebration-02-overview.png`, `celebration-03-checkin.png`.
- `dark-aurora-01-theme-switch.png`, `dark-aurora-02-overview.png`, `dark-aurora-03-checkin.png`.
- `loading-screen.png` — initial app-load spinner + rotating tip card.

**Desktop chrome (≥1024px — all other screenshots are tablet-width, icon-rail nav):**
- `desktop-overview.png` — full 236px sidebar: logo/wordmark, Workspace nav, "Working event"
  picker, Event-scoped nav, Admin nav. Compare to the tablet rail in the other screenshots.
- `desktop-checkin.png` — Check-in at desktop width: attendee list and QR panel sit side-by-side
  (`1fr` + fixed QR column) instead of tablet's stacked `minmax(340px,1fr) auto` layout.
Phone (<768px, top tab bar) has no screenshot in this pass — same nav content as tablet's drawer,
just laid out horizontally; see the .dc.html directly if you need that chrome pixel-referenced.

**Programs & Events modals:**
- `modal-new-event.png` — New event modal, top half (name/program/date/time fields visible).
- `modal-new-event-select-popover.png` / `-date-popover.png` / `-time-popover.png` — the three
  custom field popovers open.
- `modal-new-program.png`, `modal-edit-program.png` — program create/edit.
- `modal-confirm-delete.png` — generic destructive-action confirm modal.

**Attendees:**
- `attendees-list.png` — full roster screen with filters.
- `modal-confirm-remove-attendee.png` — remove-attendee confirm modal.

**Check-in:**
- `checkin-qr-prompt.png`, `checkin-qr-allowed.png` (live scanning beam), `checkin-qr-denied.png`
  — the three camera-permission states.
- `checkin-qr-confirm.png` — post-scan "Confirm check-in" modal with matched attendee.
- `modal-walkin.png` — walk-in registration modal chrome (the embedded HubSpot form itself is an
  `<iframe srcdoc>` and doesn't render in a static capture — see the .dc.html source, ~line 1269,
  for its exact markup/fields).

**Email:**
- `email-list.png` — campaign list + stats.
- `modal-new-campaign.png` — new campaign, Event-attendees recipient mode, Send-now mode.
- `modal-new-campaign-hubspot-list.png` — HubSpot-list recipient mode.
- `modal-new-campaign-schedule.png` — Schedule mode with date/time fields exposed.

**Known capture limits (not design issues):** the New Event / New Program modals are taller than
this tool's capture viewport, so `modal-new-event.png` / `modal-edit-program.png` are cropped
before Location/Capacity/Status/Cancel/Create — those fields are documented above and visible by
opening the .dc.html directly. Treat the .dc.html as the source of truth for exact markup, spacing,
and every state; screenshots are a visual index, not a replacement for it.

## Files
- `Event Management System.dc.html` — the full interactive prototype (all 7 screens + shared
  chrome, all 3 themes, all responsive breakpoints). Open directly in a browser.
- `lib/mock-data.js` — mock dataset the prototype loads at runtime.
- `DESIGN-CONTEXT.md` — screen inventory, domain glossary candidates, and known implementation
  gaps, intended as input to a `/grill-with-docs`-style pre-implementation interview.
