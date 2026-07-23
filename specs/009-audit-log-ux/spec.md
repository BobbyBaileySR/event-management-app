# Feature Specification: Audit Log Operator UX — True Paging, Filters, Resource Labels

**Feature Branch**: `009-audit-log-ux`

**Created**: 2026-07-17

**Status**: Partially implemented — bucketed true paging and server-side filter UI (Apply/Clear) shipped 2026-07-17. Human-readable `resourceLabel` remains planned as `FE-/BE-SLICE007-002`; operator sign-off remains pending. ([ADR-013](../../docs/decisions/013-audit-index-scope.md))

**Input**: User description: "Audit log operator UX — true paging, server-side filters (action/actor/resourceType/resourceId with an Apply action), and resourceLabel enrichment (readable Program/Event names instead of raw IDs on the current page). Root cause: `GET audit/recent` scans the entire Record Storage keyspace before pagination, causing 18-21s loads. Architectural decision already made (ADR-013): one time-ordered index only, filters are scan-and-discard within it, not per-dimension secondary indexes."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Audit log loads without a long wait (Priority: P1)

An admin opens the audit log (`#/audit`, and the equivalent view scoped to a single Event) to review recent activity, and the page of most-recent entries appears promptly — regardless of how much history has accumulated in the log.

**Why this priority**: This is the root problem motivating the whole feature. Today's full-keyspace scan already produces 18-21s loads, close to the platform's hard request timeout — without this, every other capability in this spec sits on top of a view that may fail to load at all as the log grows.

**Independent Test**: Can be fully tested by opening the audit log against a log containing a large volume of historical entries and confirming the first page of results returns promptly, without needing filters or resource labels to be present.

**Acceptance Scenarios**:

1. **Given** the audit log contains a large number of historical entries, **When** an admin opens the audit log view, **Then** the most recent page of entries loads without the delay present today, regardless of total log size.
2. **Given** an admin is viewing a page of audit entries, **When** they navigate to the next (older) page, **Then** only that page's entries are retrieved — the system does not re-scan the entire historical log to produce the next page.

---

### User Story 2 - Filter the audit log to investigate specific activity (Priority: P2)

An admin narrows the audit log to a specific action, actor, resource type, resource ID, or a combination of these, to answer a specific investigative question (e.g., "what did this staff member do today," or "who checked in this attendee").

**Why this priority**: High investigative value, but only meaningful once the base log (P1) reliably loads — filtering an unusable view provides no benefit.

**Independent Test**: Can be fully tested by applying a filter (or combination of filters) to an audit log containing entries from multiple actors/actions/resources and confirming only matching entries are returned after the admin explicitly applies the filter.

**Acceptance Scenarios**:

1. **Given** the audit log contains entries from multiple actors, **When** the admin selects an actor filter and applies it, **Then** only entries from that actor are shown.
2. **Given** the admin has an active filter applied, **When** they change the filter selection and apply again, **Then** the displayed results update to match the new filter, replacing the previous result set.
3. **Given** a selected filter combination matches no entries, **When** the admin applies it, **Then** the view shows a clear "no matching entries" state, distinct from an error.
4. **Given** the admin is viewing a single Event's audit view, **When** they apply a filter, **Then** filtering behaves the same as on the general audit log, scoped to that Event.

---

### User Story 3 - See readable resource names instead of raw IDs (Priority: P3)

An admin viewing the audit log sees an actual Program or Event name in the "Resource" column for entries that reference one, instead of a raw HubSpot/catalog ID that requires cross-referencing another screen to interpret.

**Why this priority**: Meaningful readability improvement, but the log remains fully usable and investigable via P1/P2 without it — this is polish on top of a working, filterable log.

**Independent Test**: Can be fully tested by viewing an audit entry that references an existing catalog Program or Event and confirming the Resource column shows that resource's name rather than its raw ID.

**Acceptance Scenarios**:

1. **Given** an audit entry on the currently displayed page references a catalog Program or Event that still exists, **When** the page is shown, **Then** the Resource column displays that resource's name.
2. **Given** an audit entry references a catalog resource that has since been deleted or archived, **When** the page is shown, **Then** the Resource column shows a readable fallback label indicating the resource is no longer available — not a raw ID, and not an error.

---

### Edge Cases

- What happens when a selected filter combination matches zero entries? Shown as an explicit empty state, not an error (User Story 2, scenario 3).
- What happens when a page's entries reference a resource that no longer exists in the catalog? Falls back to a readable "unavailable" label rather than a raw ID or a crash (User Story 3, scenario 2).
- What happens when new audit entries are being written while an admin is actively paging through older entries? The page the admin is currently viewing is not retroactively reordered or altered by new writes — new entries appear on a fresh load of the most recent page, not injected into a page already being viewed.
- What happens when an admin applies filters on the per-Event audit view versus the general audit view? Filtering behaves identically in both, scoped to the relevant entries (User Story 2, scenario 4).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST return audit log results (general view and per-Event view) by retrieving only the requested page of entries, not the full historical log, regardless of total log size.
- **FR-002**: System MUST preserve the existing most-recent-first ordering when returning a page of entries.
- **FR-003**: Users MUST be able to filter audit log results by action, actor, resource type, and resource ID, individually or in combination.
- **FR-004**: System MUST apply filters only when the user explicitly triggers an "Apply" action, not automatically as filter selections change.
- **FR-005**: System MUST show a distinct empty-state message when an applied filter combination matches no entries.
- **FR-006**: System MUST display a human-readable name for a Program/Event resource referenced by an audit entry on the currently returned page, when that resource still exists in the catalog.
- **FR-007**: System MUST show a readable fallback label — never a raw ID or an application error — for a resource referenced by an audit entry when that resource no longer exists in the catalog.
- **FR-008**: Resource-label resolution MUST be scoped to entries on the currently returned page only, not the full audit log, so it does not reintroduce an unbounded-cost operation.
- **FR-009**: System MUST continue enforcing existing role-based access control on the audit log and its filters — this feature does not change who may view audit data.
- **FR-010**: System MUST NOT expose personally identifiable information beyond what today's audit log already exposes, as a result of adding filters or resource labels.
- **FR-011**: This feature MUST NOT change the meaning or content of audit entries themselves — only how they are retrieved, paginated, filtered, and displayed.

### Key Entities

- **Audit entry**: An existing record of a mutation or notable read (actor, action, resource type/ID, timestamp, outcome, metadata). Unchanged in shape by this feature.
- **Audit filter**: A user-selected combination of action/actor/resource type/resource ID used to narrow the audit log view, applied explicitly rather than live.
- **Resource label**: A human-readable name resolved for a resource type/ID pair referenced by an audit entry (e.g., a Program or Event's display name), resolved only for entries on the currently displayed page.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Admins can open the audit log and see the most recent page of entries in under 3 seconds, regardless of how many historical entries exist (down from the 18-21 seconds reported today).
- **SC-002**: Admins can narrow the audit log to a specific actor, action, resource type, or resource ID (or a combination) and see only matching entries after applying the filter.
- **SC-003**: Admins can identify which Program or Event an audit entry relates to by reading a name directly in the log, without cross-referencing IDs elsewhere, for any currently-existing catalog resource.
- **SC-004**: Paging to older audit entries does not require re-loading or re-scanning the entire historical log each time.

## Assumptions

- Filters combine with AND semantics (all selected filters must match), and each filter dimension is single-select for this slice — consistent with this app's existing simple filter-panel conventions elsewhere. Multi-select per dimension is a possible future enhancement, not part of this slice.
- Default page size and pagination controls match this app's existing paginated-list conventions (e.g., the attendee list).
- Resource-label resolution is read-time-only against current catalog state for the currently-returned page. It does not retroactively snapshot names at write-time, so a renamed Program/Event's older audit entries show the *current* name, not the name at the time of the original action. Preserving historical accuracy via a write-time label is an already-identified, explicitly separate follow-on (tracked as `BE-SLICE007-002`'s "optional write-time label," Phase 2) and is out of scope here.
- Explicit date-range filtering (beyond the existing most-recent-first pagination) is out of scope for this slice — not part of the four committed filter dimensions.
- Export or download of filtered audit results is out of scope for this slice.
- Role-based access to the audit log itself is unchanged by this feature — this slice affects query efficiency and richness, not who can view audit data.
- The existing 90-day audit retention window is unchanged by this feature.
- Filters apply identically to both the general recent-audit view and the per-Event audit view.
- The under-3-second target (SC-001) is an informed default, not a number given directly — chosen as comfortably clear of the 25-second platform timeout and in line with this app's existing responsiveness expectations elsewhere. Revisit if a stricter or looser SLA is actually required.
