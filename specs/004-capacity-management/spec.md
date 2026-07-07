# Feature Specification: Capacity Management (Slice 1)

**Feature Branch**: `004-capacity-management`

**Created**: 2026-07-07

**Status**: Tasks generated (ready for implement)

**Input**: User description: "Slice 1 capacity monitoring on Check-in — compare checked-in attendees against Event capacity (catalog field); visual indicators at 75% and 90%; extends staff EMS; admin-only."

**Depends on**: [003-check-in](../003-check-in/spec.md) — Program + Event catalog context, admin RBAC, attendee/check-in data for the selected Event, and Event `capacity` metadata from the catalog modal.

**Product context**: [CONTEXT.md](../../CONTEXT.md) · [003-check-in](../003-check-in/spec.md)

---

## Clarifications

### Session 2026-07-07

- Q: How should staff handle anonymous departures (people leave without identifying themselves)? → A: **Manual live-attendance decrement** — staff can decrease the displayed on-site count on Check-in when people leave; departures are not attributed to individuals and do not require knowing who left. HubSpot checked-in records remain unchanged (check-in still only increases via confirm flow).
- Q: Where are departure adjustments persisted? → A: **Server-persisted per Event** — manual departure adjustments are stored on the backend for the selected Program + Event; all admins on Check-in for that Event see the same live attendance.
- Q: How should staff correct a mistaken departure tap? → A: **Paired +1 / −1 controls** — staff can manually adjust live attendance up or down by one via paired controls on the capacity indicator; neither direction identifies individuals or writes HubSpot.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Monitor live attendance against capacity on the desk (Priority: P1) 🎯 MVP

An **admin** opens **Check-in** for a selected Program + Event that has **capacity** configured in the catalog. They see a persistent **capacity indicator** showing **live attendance** compared to the Event capacity (e.g. “42 / 100 on site · 42%”). **Live attendance** reflects confirmed check-ins minus any **manual attendance adjustments** staff have recorded. The indicator updates when staff confirm a check-in, use the manual ±1 controls, or when underlying attendee data refreshes.

**Why this priority**: On-the-day staff need at-a-glance room fill before queues build; capacity is already captured on the Event form — this slice surfaces live occupancy where check-in happens.

**Independent Test**: Admin selects Event with capacity 100 → opens Check-in → indicator shows live attendance and percentage → confirm one check-in → live count increments → tap −1 once → live count decrements → tap +1 once → live count restores → HubSpot checked-in count unchanged throughout → non-admin never sees the indicator.

**Acceptance Scenarios**:

1. **Given** an admin with Program + Event selected and the Event has a positive **capacity** value, **When** they open Check-in, **Then** a capacity indicator shows **live attendance**, **capacity**, and **percentage full** for that Event only.
2. **Given** the capacity indicator is visible, **When** staff successfully confirm a check-in, **Then** live attendance and percentage update without a full page reload.
3. **Given** the capacity indicator is visible, **When** staff refresh attendee data (e.g. after returning from Walk-in mode or re-opening Check-in), **Then** the indicator reflects the latest checked-in count from the server combined with any persisted manual adjustments.
4. **Given** a non-admin user, **When** they attempt Check-in, **Then** they are redirected away and do not see capacity or attendee PII.
5. **Given** no Program or Event selected, **When** an admin opens Check-in, **Then** they see existing catalog-context guidance and no capacity indicator.

---

### User Story 2 — Threshold visual warnings at 75% and 90% (Priority: P1)

When **live attendance** reaches **75%** or **90%** of Event capacity, the capacity indicator changes appearance so staff can spot approaching limits at a glance — without reading exact numbers first.

**Why this priority**: Threshold warnings are the core differentiator from a plain count; 75% and 90% are the agreed operational alert points.

**Independent Test**: Mock or seed Event with capacity 100 → set live attendance to 74 → normal appearance → at 75 → caution appearance → at 90 → critical appearance → at 100+ → at/over capacity appearance.

**Acceptance Scenarios**:

1. **Given** live attendance is **below 75%** of capacity, **When** the indicator renders, **Then** it uses the **normal** (default) visual tier.
2. **Given** live attendance is **≥ 75% and < 90%** of capacity, **When** the indicator renders, **Then** it uses a **caution** visual tier (distinct colour and/or label such as “Approaching capacity”).
3. **Given** live attendance is **≥ 90% and ≤ 100%** of capacity, **When** the indicator renders, **Then** it uses a **critical** visual tier (stronger emphasis than caution, e.g. “Nearly full”).
4. **Given** live attendance **exceeds 100%** of capacity, **When** the indicator renders, **Then** it shows **at or over capacity** state (count may exceed capacity; percentage capped or labelled as over capacity) without hiding the overage.
5. **Given** occupancy crosses a threshold (e.g. 74 → 75 on site), **When** the next check-in is confirmed or a manual adjustment is made, **Then** the visual tier updates immediately to match the new percentage.

---

### User Story 3 — Manually adjust live attendance (Priority: P1)

An **admin** at the check-in desk uses **paired +1 / −1 controls** on the capacity indicator to keep live attendance aligned with reality when people leave or when a correction is needed. **−1** records an anonymous departure (someone left without identifying themselves). **+1** reverses a departure or corrects an mistaken −1 tap. Neither control asks who was involved, changes HubSpot checked-in status, or substitutes for **Confirm check-in**.

**Why this priority**: Without exit tracking, live occupancy would only ever increase; manual ±1 adjustment is the operational workaround for anonymous departures and desk corrections.

**Independent Test**: Live attendance at 50 → staff tap −1 → shows 49 → tap +1 → shows 50 → percentage and visual tier update each time → HubSpot checked-in count unchanged → −1 at live 0 disabled → +1 at live = checked-in disabled.

**Acceptance Scenarios**:

1. **Given** the capacity indicator is visible and live attendance &gt; 0, **When** staff use the **−1** control once, **Then** live attendance decreases by 1 and the indicator refreshes immediately.
2. **Given** the capacity indicator is visible and live attendance &lt; checked-in count, **When** staff use the **+1** control once, **Then** live attendance increases by 1 and the indicator refreshes immediately.
3. **Given** staff use either manual control, **When** the action completes, **Then** no HubSpot attendance property is written and no named attendee is modified.
4. **Given** live attendance is **0**, **When** staff attempt **−1**, **Then** the control is disabled or rejected with clear feedback (live attendance cannot go negative).
5. **Given** live attendance **equals checked-in count**, **When** staff attempt **+1**, **Then** the control is disabled or rejected with clear feedback (manual +1 cannot exceed HubSpot checked-in total).
6. **Given** staff adjust live attendance on one device, **When** another admin opens Check-in for the same Program + Event, **Then** the capacity indicator shows the same live attendance (server-persisted adjustment total).
7. **Given** staff confirm a new check-in, **When** the action succeeds, **Then** live attendance increases by 1 via the normal check-in path (in addition to any prior manual adjustments).

---

### Edge Cases

- Event **capacity unset or zero** → do not show percentage thresholds; show live attendance only with guidance to set capacity in catalog (prefer count + setup hint over a misleading 0% bar).
- **Catalog context change** (different Program/Event) → indicator resets to the newly selected Event’s capacity, checked-in count, and manual adjustments for that Event.
- **Mock vs live API** → live attendance uses the same checked-in source as the Check-in attendee list plus manual adjustments (mock honours both per plan).
- **Walk-in mode** (003 US3) → capacity indicator and ±1 controls remain visible above the mode switch; walk-in HubSpot submits do not auto-update live count until attendee data is refreshed (consistent with existing walk-in hint).
- **Concurrent desks** → manual adjustments are server-persisted per Event; all desks share one live attendance count (brief staleness until next fetch or action is acceptable for Slice 1).
- **Fractional capacity** (catalog allows decimals) → percentage calculated from numeric capacity; display rounds sensibly for staff (whole numbers for count; percentage to nearest whole percent unless otherwise specified in plan).
- **Manual adjustments exceed checked-in count** → live attendance floors at 0 on display; if checked-in count drops on refresh below net departures recorded, live attendance floors at 0 until staff use +1 or new check-ins restore alignment.
- **Accidental −1 tap** → staff use **+1** to correct; both directions are server-persisted and auditable.
- **+1 misuse as check-in shortcut** → +1 only adjusts live display; it does not check anyone in HubSpot — staff must still use Confirm check-in for arrivals.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Check-in page MUST display a **capacity indicator** when Program + Event are selected, user is **admin**, and the Event has a **positive finite capacity** from catalog metadata.
- **FR-002**: The indicator MUST show **live attendance**, **capacity**, and **percentage full** where live attendance = checked-in count minus net manual departure adjustments (floored at 0). Checked-in count follows 003-check-in attendee semantics (HubSpot-backed).
- **FR-003**: The indicator MUST update after a successful **Confirm check-in** without requiring navigation away from Check-in.
- **FR-004**: The indicator MUST use **three visual tiers** based on percentage full: **normal** (&lt; 75%), **caution** (≥ 75% and &lt; 90%), **critical** (≥ 90%). Each tier MUST be distinguishable by colour and/or concise label text.
- **FR-005**: When live attendance **exceeds capacity**, the indicator MUST remain visible, show the actual live count, and use an **at/over capacity** presentation (may cap bar fill at 100% while showing count &gt; capacity in text).
- **FR-006**: When Event **capacity is unset, null, zero, or non-finite**, the Check-in page MUST NOT show misleading percentage or threshold styling; MAY show live attendance alone with catalog setup guidance.
- **FR-007**: Capacity indicator MUST NOT block or prevent check-in actions at any occupancy level in Slice 1 (monitoring and manual adjustment only).
- **FR-008**: Non-admin users MUST NOT see the capacity indicator or manual adjustment controls (same RBAC gate as Check-in module).
- **FR-009**: Event **capacity** value MUST be read from the **selected Event catalog record** (`capacity` field); staff edit venue capacity via existing Event catalog modal — distinct from live attendance adjustment.
- **FR-010**: Check-in page MUST expose **paired +1 / −1 controls** (admin only) to adjust live attendance by one per tap without identifying individuals.
- **FR-011**: Manual +1 / −1 MUST NOT write HubSpot attendance properties or change any named attendee’s checked-in status.
- **FR-012**: Live attendance MUST NOT go below **0**; **−1** MUST be disabled or reject when live attendance is already 0.
- **FR-013**: Live attendance MUST NOT exceed **checked-in count**; **+1** MUST be disabled or reject when live attendance already equals checked-in count.
- **FR-014**: Net manual departure adjustments MUST be **server-persisted** per **Program + Event**; all admin sessions for that Event MUST read the same cumulative adjustment when computing live attendance.
- **FR-015**: Each +1 or −1 action MUST update the persisted adjustment total via an admin-only backend action (not browser-local state alone).

### Non-Functional / UX

- **NFR-001**: Threshold colours MUST meet contrast expectations for staff use in bright venue lighting (plan phase picks tokens; must not rely on colour alone — pair with label text at caution and critical tiers).
- **NFR-002**: Indicator MUST not leak attendee PII — aggregate counts only; manual controls record count delta and direction only, not identity.
- **NFR-003**: Layout MUST remain usable on tablet and mobile breakpoints per frontend responsive rules (indicator and ±1 controls do not push QR scanner or confirm card off-screen).
- **NFR-004**: Manual +1 / −1 actions MUST be auditable (actor, Event, direction, delta, outcome) — same discipline as check-in mutations; no PII in audit payload.

### Key Entities

- **Event capacity**: Optional numeric metadata on an Event catalog record; configured by admin in the Event form; venue upper bound for occupancy monitoring. **Not** modified by live attendance controls.
- **Checked-in count**: Count of attendees for the selected Event whose checked-in status is true (HubSpot-backed; 003-check-in semantics). Increases via confirm check-in only in Slice 1.
- **Manual attendance adjustment**: Server-persisted net departure count for a Program + Event (each −1 increments it; each +1 decrements it). Reduces live attendance relative to checked-in count without HubSpot writes.
- **Live attendance**: checked-in count minus net manual departure adjustments, floored at 0 and capped at checked-in count; numerator for capacity percentage and threshold tiers.
- **Occupancy percentage**: live attendance divided by Event capacity, used to select normal / caution / critical / over-capacity visual tier.

---

## Success Criteria *(mandatory)*

- **SC-001**: Admin on Check-in can state current live attendance vs capacity within 2 seconds of opening the page (indicator visible without extra clicks).
- **SC-002**: After confirming a check-in or using +1 / −1, the displayed live attendance updates on the same screen in under 1 second under normal network conditions.
- **SC-003**: Staff can correctly identify caution (≥ 75%) and critical (≥ 90%) states in manual QA without reading the exact fraction first (visual tier + label).
- **SC-004**: Non-admin users never see capacity or check-in modules (unchanged from 003-check-in SC-003).
- **SC-005**: Events without capacity configured do not show a false “0% full” bar; staff receive clear guidance or count-only display.
- **SC-006**: Staff can record an anonymous departure (−1) and correct it (+1) without HubSpot checked-in totals changing.
- **SC-007**: Two admins on Check-in for the same Event see the same live attendance after either uses +1 or −1 (within normal refresh latency).

---

## Assumptions

- **Live attendance** (not raw checked-in count alone) is the correct numerator for on-the-day capacity vs venue limit; checked-in is the HubSpot-backed ceiling; manual adjustments are an EMS-side offset.
- Thresholds **75%** and **90%** are fixed for Slice 1 (not configurable per Event).
- Slice 1 does **not** hard-stop check-in when at capacity — monitoring and manual adjustment only.
- Manual adjustments are **anonymous** — no checkout flow, no attendee selection, no HubSpot write on +1 or −1.
- **+1** is a display correction only — not a substitute for Confirm check-in.
- Walk-in attendees increase checked-in count (and thus live attendance) only after HubSpot registration rules satisfy and staff refresh attendee data (consistent with 003 US3).
- Manual adjustments persist for the Event until offset by +1 actions or new check-ins (reset policy for multi-day Events deferred to plan).

---

## Out of Scope

- **Blocking or gating check-in** when at or over capacity (future policy slice).
- **Attendees module** or **Event Hub** capacity widgets — Check-in page only for Slice 1.
- **Registered vs capacity** monitoring (legacy Event Hub shows registration fill; this slice is live attendance vs capacity).
- **Identified checkout** — selecting who left, QR exit scan, or unchecking HubSpot attendance on departure.
- **Using +1 as check-in** — arrivals MUST still go through Confirm check-in (or walk-in HubSpot flow); +1 only adjusts live display.
- **Configurable thresholds** per Event or Program (75% / 90% are fixed).
- **Push notifications, email alerts, or sound** when thresholds are crossed.
- **Editing Event capacity** from Check-in — venue capacity remains in catalog Event modal only.
- **Public-facing registration** capacity limits on HubSpot forms.
