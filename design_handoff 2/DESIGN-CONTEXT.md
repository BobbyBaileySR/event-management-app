# Event Management System — Design Context for Grilling

Drop this file into your repo (e.g. `docs/design/EMS-CONTEXT.md`) and run `/grill-with-docs`
against it to resolve open questions before implementation. This is not a finished CONTEXT.md —
it's raw input the grilling session should sharpen into your project's real glossary/ADRs.

## Source
High-fidelity HTML/React prototype (`Event Management System.dc.html`), built in a design tool,
not connected to real data or APIs. Some screens already exist in the shipped app (built via
Cursor); this prototype is a visual/UX overhaul of those plus net-new screens.

## Screen inventory
- **Overview** — dashboard: stat cards (events this month, total registered, registered this
  week, emails scheduled this week), upcoming events list.
- **Programs & Events** — list of events, filterable by status (All / Active / Cancelled /
  Completed), paginated. New/Edit Event modal (name, program, date, time, location, capacity,
  status). Programs are a grouping entity above events (name, description, owner, start/end date).
- **Event Details** — single event: stats (registered, capacity, checked-in, filled %), attendee
  preview.
- **Registered Attendees** — full attendee list for the working event, filter by status (All /
  Checked in / Registered), stats row, remove attendee.
- **Check-in** — manual toggle check-in/check-out per attendee + simulated QR scan flow; tuned
  for tablet as the primary in-venue device.
- **Email** — compose/send campaigns to either event attendees or a HubSpot list; send now or
  schedule; stats (sent/scheduled/drafts).
- **Audit Log** — paginated log of actions taken in the system.
- **Walk-in registration** — embedded HubSpot-style form (currently a static mock).

## Domain nouns in play (candidates for a glossary — confirm/refine during grilling)
- **Program** vs **Event** — a Program groups multiple Events; confirm cardinality (can an event
  belong to >1 program? can a program have 0 events?).
- **Working event** — the event currently "in focus" in the sidebar picker, scoping
  Event Details / Attendees / Check-in / Email views. Confirm: is this per-user session state,
  or a URL-addressable concept?
- **Attendee** vs **HubSpot list member** — are all attendees sourced from HubSpot, or can some
  be added manually (walk-ins) without a HubSpot record?
- **Checked-in** — binary state today (registered vs checked-in). Confirm whether check-out is a
  real requirement or a demo-only toggle.

## Known gaps — the prototype does NOT model these (confirm real behavior during grilling)
- Create/Edit/Delete for Events, Programs, Campaigns — prototype only mutates local session
  state; nothing persists. Need: real data model, validation rules, who can edit/delete.
- HubSpot sync — UI implies attendee/list data comes from HubSpot. Sync cadence, auth method,
  conflict handling (local edits vs synced updates) are undefined.
- QR check-in — prototype simulates permission states and a random "successful scan"; real
  camera + QR decode integration is unbuilt. Confirm target library/approach.
- Walk-in registration form — currently a static mock; confirm whether it should write directly
  to HubSpot, to internal DB, or both.
- Email send/schedule — no email actually sends. Confirm ESP/provider, template source of truth,
  and scheduling infrastructure.
- Audit log — confirm what actions must be captured, retention, and whether it's append-only.

## Responsive contract (already decided — treat as settled, not a grilling target)
- Desktop ≥1024px: full sidebar nav.
- Tablet 768–1023px: icon rail + slide-out drawer. Primary device for in-venue check-in; all
  touch targets ≥44px.
- Phone <768px: top tab bar + stacked cards.

## Suggested grilling focus
Prioritize: (1) Program/Event/Attendee data model and cardinality, (2) HubSpot sync contract,
(3) what "real" persistence looks like for create/edit/delete across Events/Programs/Campaigns,
(4) QR/camera integration approach, (5) audit log requirements. Responsive breakpoints and
visual system are already locked from the design — don't re-litigate those.
