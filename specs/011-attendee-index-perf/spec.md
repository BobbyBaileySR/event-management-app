# Feature Specification: Attendee Index Performance Fix — True Paging, Freshness, Reconciliation

**Feature Branch**: `011-attendee-index-perf`

**Created**: 2026-07-17

**Status**: Implemented and tested in code (2026-07-17; `BE-ATTENDEE-IDX-001..004`, 420 Backend tests green). Live enablement remains blocked on the HubSpot Workflow webhook action (`HS-012` / `X-ATTENDEE-IDX-003-HS`), ScriptRunner webhook Parameters (`BE-ATTENDEE-IDX-OPS-001`), dedicated webhook security review (T037), and operator sign-off (T036).

**Input**: User description: "Attendee index performance fix for `GET attendees` — root cause is an unbounded HubSpot association-pagination fetch plus a sequential per-checked-in-attendee Record Storage read, pushing requests to 18-21s against ScriptRunner Connect's 25s hard timeout. Fix is a materialized Attendee index kept fresh by three required legs (write-through, HubSpot-Workflow webhook, scheduled reconciliation sweep) per ADR-011, with field-scoped conflict-safe writes per ADR-012. Covers all four legs (index+read rewire, write-through, webhook listener, reconciliation sweep) as in-scope — not a partial slice."

## User Scenarios & Testing *(mandatory)*

> **Note on story structure**: Unlike a typical phased slice, [ADR-011](../../docs/decisions/011-attendee-index-freshness.md) explicitly rejected a cheaper two-legged version of this fix — all four stories below are required before this feature is considered complete and safe to rely on for its actual purpose (a check-in app's roster must not have a blind spot for last-minute registrants). The priorities below reflect **build order** (matching `Backend/TODO.md`'s existing step numbering, `BE-ATTENDEE-IDX-001..004`), not an "optional if skipped" ranking — each story is still independently testable in isolation, which is why they're written as separate stories.

### User Story 1 - Attendee list loads without a long wait (Priority: P1) 🎯 Foundation

Staff open the attendee list for an Event (any size roster) and the list appears promptly, without the delay that today risks the request timing out entirely.

**Why this priority**: This is the root problem motivating the whole feature, and every other story in this spec depends on the underlying index existing. Today's live HubSpot fetch already produces 18-21s loads, close to the platform's hard request timeout.

**Independent Test**: Can be fully tested by opening the attendee list for an Event with a large registered roster and confirming the list (including search and paging to later pages) returns promptly, without needing the freshness legs (Stories 2-4) to be built yet — a manually seeded index is sufficient to prove this story alone.

**Acceptance Scenarios**:

1. **Given** an Event has a large number of registered attendees, **When** staff open that Event's attendee list, **Then** the list's first page loads without the delay present today, regardless of roster size.
2. **Given** staff are viewing a page of the attendee list, **When** they search or page to another set of results, **Then** only the relevant slice of data is retrieved — the system does not re-fetch the entire roster from HubSpot to produce it.

---

### User Story 2 - Attendee list reflects in-app actions immediately (Priority: P1)

When staff check in an attendee, undo a check-in, or remove an attendee through the app, the attendee list reflects that change right away — without needing a page reload that re-fetches from HubSpot, and without the change appearing to silently revert later.

**Why this priority**: An attendee list that's fast but shows stale or reverting state after the very actions staff just took would be worse than the current slow-but-accurate behavior. This is required alongside Story 1, not an optional follow-on.

**Independent Test**: Can be fully tested by performing a check-in, an undo, and a removal against a seeded attendee list and confirming each action's effect is visible in the list immediately after, without waiting for any scheduled process.

**Acceptance Scenarios**:

1. **Given** an attendee is checked in through the app, **When** the attendee list is viewed immediately after, **Then** that attendee shows as checked in.
2. **Given** a check-in is undone through the app, **When** the attendee list is viewed immediately after, **Then** that attendee shows as not checked in.
3. **Given** an attendee is removed through the app, **When** the attendee list is viewed immediately after, **Then** that attendee no longer appears.
4. **Given** an in-app action and a near-simultaneous reconciliation pass both touch the same attendee, **When** both have completed, **Then** the in-app action's result is not overwritten by a reconciliation pass based on older information.

---

### User Story 3 - New registrations appear without a blind spot (Priority: P1)

A person self-registers for an Event through the registration form (outside the app's own actions), and shows up in staff's attendee list promptly — not only after the next scheduled refresh.

**Why this priority**: [ADR-011](../../docs/decisions/011-attendee-index-freshness.md) explicitly treats this as mandatory, not optional: walk-in and last-minute registrants are the group most likely to register right before showing up, and a multi-minute blind spot for exactly this group would undermine the attendee list's core job of answering "is this person on the roster right now."

**Independent Test**: Can be fully tested by completing a self-service registration and confirming the new registrant appears in the attendee list promptly, without waiting for the next scheduled reconciliation run.

**Acceptance Scenarios**:

1. **Given** a person completes self-service registration for an Event, **When** staff view that Event's attendee list shortly afterward, **Then** the new registrant appears without staff needing to wait for a scheduled refresh.
2. **Given** a registration notification cannot be verified as genuinely originating from the expected source, **When** it is received, **Then** the system does not apply it to the attendee list.

---

### User Story 4 - Attendee list self-corrects from missed updates (Priority: P1)

If a registration notification is ever missed, delayed, or a registration/check-in change happens outside the app entirely (e.g., a direct edit in HubSpot), the attendee list eventually corrects itself without requiring anyone to notice and manually intervene.

**Why this priority**: This is the safety net that makes the other freshness mechanisms trustworthy over time — without it, any missed notification or out-of-band edit would leave the attendee list permanently wrong until someone happened to investigate. [ADR-011](../../docs/decisions/011-attendee-index-freshness.md) treats this as one of the three required freshness legs, not an optional enhancement.

**Independent Test**: Can be fully tested by artificially introducing a drifted or orphaned attendee-list entry (e.g., one referencing a contact no longer associated with the Event) and confirming it is corrected or removed after the next reconciliation run, without manual action.

**Acceptance Scenarios**:

1. **Given** an attendee list entry has drifted from what HubSpot actually shows for that Event, **When** the next reconciliation run completes, **Then** the entry is corrected to match HubSpot.
2. **Given** an attendee list entry references a contact no longer associated with the Event, **When** the next reconciliation run completes, **Then** that entry is removed.
3. **Given** a reconciliation run cannot finish processing every active Event within its allotted time, **When** it stops, **Then** it resumes the remaining work on its next scheduled run rather than losing track of what still needs checking.

---

### Edge Cases

- What happens when an in-app action (Story 2) and a reconciliation pass (Story 4) touch the very same attendee's checked-in state around the same moment? The action based on more recent information wins — an older result can never overwrite a newer one just by finishing later (see Story 2, scenario 4).
- What happens when a registration notification (Story 3) fails its authenticity check? It is rejected and not applied — never silently trusted (see Story 3, scenario 2).
- What happens if the mechanism delivering registration notifications is ever unavailable or misconfigured for a period? Affected registrations are still picked up by the next reconciliation run (Story 4) — staff experience a delay for that window, not a permanently missing attendee.
- What happens to attendee list data for an Event once that Event is archived? It is removed as part of the same cleanup that already happens for other Event-scoped cached data today, rather than being retained indefinitely.
- What happens when an Event has no defined end date? The attendee list data for that Event still expires on a reasonable fallback schedule rather than being retained forever with no end date to key off of.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST maintain a materialized attendee list dataset per Event (roster/display fields plus checked-in state) that staff-facing list, search, and pagination requests are served from, instead of a live fetch against the external registration system on every request.
- **FR-002**: System MUST serve every attendee list request (initial load, search, and any page beyond the first) from this materialized dataset, regardless of Event roster size — no request may fall back to fetching the entire roster from the external system first.
- **FR-003**: System MUST update the materialized dataset synchronously, as part of the same action, whenever staff check in an attendee, undo a check-in, or remove an attendee through the app.
- **FR-004**: System MUST receive and apply new-registration notifications from the external registration system (via its existing self-service registration flow) so a newly registered attendee appears in the materialized dataset without waiting for the next scheduled reconciliation.
- **FR-005**: The channel that delivers new-registration notifications MUST verify that each notification genuinely originates from the expected source before applying it — since this is an externally reachable entry point with no staff session attached to it.
- **FR-006**: System MUST limit how frequently registration notifications can be processed from a given source, and MUST record an auditable record of each processed notification, consistent with this system's existing practice of auditing mutations.
- **FR-007**: System MUST run a periodic reconciliation process that compares the materialized dataset against the external registration system's actual state for active Events, correcting entries that drifted from missed or delayed updates and removing entries for attendees no longer associated with the Event.
- **FR-008**: When more than one update source (an in-app action, a registration notification, or the reconciliation process) affects the same attendee's entry around the same time, an update MUST NOT be allowed to overwrite information that is more recent than what that update itself reflects.
- **FR-009**: System MUST remove an Event's materialized attendee-list data when that Event is archived, consistent with how other Event-scoped cached data is already cleaned up on archive.
- **FR-010**: System MUST expire an Event's materialized attendee-list data on a bounded schedule tied to the Event's active period, including a reasonable fallback for an Event that has no defined end date, rather than retaining it indefinitely.
- **FR-011**: System MUST NOT change who is authorized to view the attendee list — existing access rules apply unchanged.
- **FR-012**: System MUST NOT change which system is the authoritative source of registration and attendance data — the materialized dataset is a derived, rebuildable convenience copy, never the record of truth.
- **FR-013**: If the reconciliation process or registration-notification processing cannot finish its work within its allotted processing time, System MUST resume the remaining work on its next scheduled run rather than failing silently or leaving it indefinitely incomplete.

### Key Entities

- **Attendee list entry**: A per-Event, per-attendee record holding the roster/display fields and checked-in state that the attendee list is read from, plus enough bookkeeping to know how recently each of those facts was last confirmed (used to resolve conflicting updates). A derived, rebuildable copy — never the system of record for registration or attendance.
- **Registration notification**: An inbound signal indicating a new registration occurred for an Event, used to update the corresponding attendee list entry promptly instead of waiting for the next reconciliation pass.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Staff can open an Event's attendee list and see the first page of results in under 3 seconds, regardless of how large that Event's registered roster is (down from the 18-21 seconds reported today).
- **SC-002**: Searching or paging to a later set of attendee-list results does not take meaningfully longer than loading the first page, regardless of total roster size.
- **SC-003**: An attendee checked in, un-checked-in, or removed through the app is reflected in the attendee list the next time it's viewed, with no perceptible delay and no reload required.
- **SC-004**: A newly self-registered attendee is visible in the attendee list within a short window of registering (well under the previous scheduled-refresh interval), not only after the next scheduled reconciliation.
- **SC-005**: If a new-registration notification is ever missed or delayed, the affected attendee still appears in the list without any manual intervention, within one reconciliation cycle.
- **SC-006**: Attendee list data for an Event is no longer present a reasonable, bounded time after that Event is archived or its active period ends — it does not accumulate indefinitely.

## Assumptions

- All four stories/legs in this spec ship together as one feature, per [ADR-011](../../docs/decisions/011-attendee-index-freshness.md)'s explicit rejection of a partial (two-legged) version — this is not phased like `009-audit-log-ux` was; priorities reflect build order, not independent-shippability.
- Conflict resolution across the three update sources (in-app write-through, registration-notification webhook, reconciliation sweep) follows [ADR-012](../../docs/decisions/012-attendee-index-write-conflict-resolution.md) exactly (field-scoped writes plus an observed-timestamp guard) — this spec does not re-derive or reconsider that mechanism.
- SC-001's "under 3 seconds" and SC-004's "well under the previous scheduled-refresh interval" targets are informed defaults (comfortably clear of the platform's hard request timeout, and consistent with how `009-audit-log-ux`'s equivalent SC-001 was framed), not numbers supplied directly — flagged for revisit if a firmer SLA is required.
- The reconciliation process's run interval is the existing 15-minute scheduled cadence already used elsewhere in this system for a similarly shaped sweep — not a new cadence introduced for this feature.
- The fallback expiry window used when an Event has no defined end date is an implementation-level detail to be resolved during planning, not a product-scope decision — any reasonable bounded default satisfies FR-010/SC-006 as written here.
- Role-based access to the attendee list is unchanged by this feature — this spec affects how the data is retrieved and kept fresh, not who can view it.
- The external registration system (HubSpot) remains the system of record throughout — this feature adds a derived read cache and freshness mechanisms, not a new place where registration or attendance is authoritatively decided.
- Export or download of attendee-list data is unaffected by and out of scope for this feature.
