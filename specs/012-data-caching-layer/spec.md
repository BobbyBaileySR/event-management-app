# Feature Specification: Data Caching Layer

**Feature Branch**: `012-data-caching-layer`

**Created**: 2026-07-19

**Status**: Draft

**Input**: User description: "Slice 012 — data caching layer. Seed from ADR-015 and ADR-016: TanStack Query behind useDataService, per-type freshness model, session-scoped memory-only cache, central query keys + mutation invalidation, non-PII-only prefetch, new events/capacity-summary bulk route, big-bang migration of all six data views."

**Design authority**: [ADR-015](../../docs/decisions/015-client-data-caching-layer.md) (data layer, freshness, invalidation, lifecycle, bulk capacity route, migration strategy) and [ADR-016](../../docs/decisions/016-no-prefetch-of-audited-pii.md) (prefetch security boundary). Where this spec and the ADRs conflict, the ADRs win. Glossary: [CONTEXT.md](../../CONTEXT.md) — **Cache**, **Stale-while-revalidate**, **Prefetch**, **Query key / cache invalidation**.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Returning to a screen feels instant (Priority: P1)

An operator working an event moves between Check-in, Registered Attendees, and Event Details repeatedly. Today every switch shows a loading skeleton while the full backend chain is re-queried. With this slice, returning to a screen they already visited paints immediately with the last-known data, quietly refreshing in the background and updating in place if anything changed.

**Why this priority**: Repeat navigation is the dominant interaction pattern during a live event, and re-fetch-on-every-visit is the single largest source of perceived slowness. This is the core value of the slice.

**Independent Test**: Visit Programs & Events, navigate to an Event, navigate back. The list paints instantly (no full-screen skeleton) and any changed values update in place shortly after.

**Acceptance Scenarios**:

1. **Given** an operator has viewed Programs & Events within the catalog freshness window, **When** they navigate back to it, **Then** the screen renders from held data without a loading skeleton and without a new catalog request.
2. **Given** an operator has viewed a screen and its freshness window has expired, **When** they navigate back, **Then** the previous data paints immediately, a background refresh runs, and the view updates in place when it completes.
3. **Given** a background refresh fails after previous data has painted, **When** the failure occurs, **Then** the previously shown data remains visible with a non-blocking error indication and a retry affordance (the screen does not blank into a full error state).
4. **Given** the operator opens Registered Attendees or the Audit log, **When** the view mounts, **Then** a fresh server read always occurs (these views never serve within-window cached data as current), while the previous snapshot may paint during the refresh.

---

### User Story 2 - Sign-out and re-sign-in leave nothing behind (Priority: P1)

An operator signs out on a shared device, or a different operator signs in after them. No attendee names, emails, or any other event data from the previous session is ever shown to — or recoverable by — the next user.

**Why this priority**: This is the security precondition for holding any data client-side at all. If it fails, the slice is not shippable regardless of speed gains.

**Independent Test**: Sign in as user A, view attendees, sign out, sign in as user B — no view ever paints user A's data, and no application data survives sign-out in browser storage.

**Acceptance Scenarios**:

1. **Given** an operator has viewed PII-bearing screens, **When** they sign out, **Then** all held data is discarded immediately and no application data persists in any browser storage (only in-page memory was ever used).
2. **Given** user A's session ends and user B signs in on the same tab, **When** user B opens any view, **Then** nothing from user A's session paints — every screen loads fresh under B's own permissions.
3. **Given** any session-token change (sign-out, re-sign-in, session swap), **When** it occurs, **Then** the entire cache is cleared as a single rule — there is no per-view opt-out.

---

### User Story 3 - Actions are reflected everywhere at once (Priority: P2)

When an operator checks someone in, adds a walk-in, removes an attendee, edits the catalog, or manages a campaign, every other screen showing related data reflects the change on next visit — no manual refresh, no stale counts.

**Why this priority**: Caching without coordinated invalidation would *worsen* correctness versus today's always-refetch behaviour; this story keeps the cache honest. It depends on Story 1's cache existing.

**Independent Test**: Check an attendee in on the Check-in screen, then open Registered Attendees and Programs & Events — the attendee shows checked-in and the event's checked-in count is updated, without a hard refresh.

**Acceptance Scenarios**:

1. **Given** an operator checks in (or undoes check-in for, or removes) an attendee, **When** they navigate to any screen showing that Event's attendee list or capacity counts, **Then** the change is reflected.
2. **Given** an admin creates, edits, or archives a Program or Event, **When** any catalog-derived screen is next shown, **Then** it reflects the change.
3. **Given** an operator creates, edits, or cancels a campaign, **When** the Event's campaign list or the Overview scheduled-campaign figure is next shown, **Then** it reflects the change.
4. **Given** uncertainty over whether a mutation affects a cached dataset, **When** the invalidation rules are applied, **Then** the system errs toward refreshing more rather than less (a spurious refetch is acceptable; a stale miss is not).

---

### User Story 4 - Programs & Events loads fast the first time (Priority: P2)

The Programs & Events screen — today the slowest, because it makes one capacity request per event on top of the catalog request — loads with a bounded number of requests regardless of how many events exist, and can be warmed before the operator navigates to it.

**Why this priority**: Biggest first-visit win, and the only part of the slice needing a backend change. It is independently valuable even without the cache (fewer round trips), but sequenced after the cache foundation.

**Independent Test**: With N active events, loading Programs & Events issues a fixed number of data requests (catalog + one capacity summary), not 1+N; checked-in counts match the per-event values.

**Acceptance Scenarios**:

1. **Given** a portfolio of N events, **When** Programs & Events loads, **Then** capacity/checked-in figures for all events arrive via a single bulk read rather than N per-event reads, and match what per-event reads would return.
2. **Given** the bulk capacity read fails, **When** the screen renders, **Then** the catalog still displays with capacity figures degraded gracefully (as today's per-event failure fallback does), not a blank error screen.
3. **Given** an operator signs in or lands on the Overview, **When** warming runs, **Then** only catalog and capacity data may be fetched speculatively — and a subsequent visit to Programs & Events paints without a loading skeleton.
4. **Given** the Check-in screen's live occupancy counter, **When** this slice ships, **Then** that counter still reads its own per-event capacity source at its own faster cadence (unchanged behaviour).

---

### User Story 5 - The PII audit trail stays truthful (Priority: P1)

A security reviewer inspecting the audit log can continue to trust that every "operator viewed attendee PII" entry corresponds to a real human opening that screen — the performance layer never generates speculative PII reads.

**Why this priority**: Audit integrity is the non-negotiable constraint on this slice (ADR-016); it gates everything else. Priority shared with Stories 1–2 because a violation is a ship-blocker, not a degradation.

**Independent Test**: Exercise sign-in, Overview, Programs & Events, and warming paths without opening Registered Attendees — then verify no attendee-list read audit entries were written for that operator.

**Acceptance Scenarios**:

1. **Given** any warming/speculative fetching this slice introduces, **When** it runs, **Then** it touches only non-PII, non-read-audited data (catalog and capacity) — never attendee/registration or audit-log reads.
2. **Given** an operator opens Registered Attendees, **When** the view mounts, **Then** exactly the same server read (and thus the same read-audit entry) occurs as today — once per real view, not suppressed by caching and not multiplied by refreshing.
3. **Given** a future developer attempts to warm attendee data, **When** they look for a way to do it, **Then** the warming mechanism structurally offers no such operation (enforced by construction, not by convention).

---

### Edge Cases

- **Session ends mid-refresh**: a background refresh is in flight when the token is cleared — the response must be discarded, not written into the (now-cleared) cache for the next session to see.
- **Auth failure on background refresh**: an expired/revoked session surfacing as 401 during a silent refresh must trigger the existing sign-out flow, not silently show ever-staler data.
- **Rate limiting (429)**: background refreshes and the attendees always-refetch must respect existing rate-limit handling; a 429 on silent refresh keeps the painted snapshot with the non-blocking error affordance.
- **Archived event in held data**: an event archived (by this operator or another admin) while its detail data is held must not resurrect on navigation — catalog invalidation on archive covers the self-inflicted case; the freshness window bounds the cross-operator case.
- **Multiple tabs**: each tab holds its own independent in-memory data; no cross-tab sharing or synchronization is in scope. Cross-tab staleness is bounded by each tab's own freshness windows.
- **Paged/filtered views**: distinct page + filter combinations are distinct cached datasets; changing filters must never show rows from a different filter's result set while revalidating.
- **Concurrent duplicate requests**: two components needing the same dataset simultaneously (e.g. sidebar picker + main view both reading the catalog) result in one request, not two.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST hold fetched EMS data in a per-tab, memory-only store so revisiting a screen can paint without waiting on the network. No application data may be written to any persistent browser storage (localStorage, sessionStorage, IndexedDB, or equivalents).
- **FR-002**: The system MUST apply per-data-type freshness windows exactly as fixed in ADR-015: catalog 5 minutes; capacity/checked-in counts 30 seconds; attendee lists and audit log always-refetch-on-view (freshness zero). Unused data MUST be evicted after its retention bound (30 minutes non-PII, 5 minutes PII-bearing).
- **FR-003**: For data within its freshness window, navigation MUST render from held data without issuing a new request. For expired data, the system MUST render the previous snapshot immediately, refresh in the background, and update in place ("stale-while-revalidate").
- **FR-004**: When a background refresh fails after a snapshot has painted, the system MUST keep the snapshot visible with a non-blocking error indication and retry affordance. First-ever loads (no snapshot) MUST keep today's loading → error → empty → data states.
- **FR-005**: Attendee-list and audit-log views MUST issue a real server read on every view mount, preserving today's one-read-per-view semantics and the server-side PII read-audit behaviour unchanged.
- **FR-006**: Any session-token change (sign-out, sign-in, session swap) MUST clear the entire cache as a single unconditional rule. In-flight responses belonging to the previous token MUST be discarded, never written into the cleared cache.
- **FR-007**: Speculative fetching (warming/prefetch) MUST be possible only for catalog and capacity data. The warming mechanism MUST structurally expose no operation for attendee/registration or audit-log data (ADR-016) — enforced by construction, with the rule and ADR reference documented at the enforcement point.
- **FR-008**: The backend MUST expose a bulk capacity-summary read returning checked-in count and capacity for all active events in one response, authorized identically to the existing per-event capacity read, and documented per the API-contract + RBAC sync discipline (contract doc, RBAC matrix, route table, data service, tests — in the same change).
- **FR-009**: Programs & Events MUST consume the bulk capacity summary (catalog + one summary request) instead of one capacity request per event. The per-event capacity read MUST remain for the Check-in screen's live counter, whose refresh cadence is unchanged.
- **FR-010**: Cached datasets MUST be identified by a centrally defined naming scheme (what data, which Event, which page/filters), and every EMS mutation MUST trigger invalidation of the affected datasets per ADR-015's mutation → invalidation map. Views MUST NOT define dataset identities ad hoc.
- **FR-011**: All six data views (Programs & Events, Overview, Event Hub, Registered Attendees, Check-in, Audit) MUST migrate to the new data layer in this slice — no view retains the hand-rolled fetch-on-mount pattern afterwards.
- **FR-012**: Existing security posture MUST be unchanged: every request (cached-miss, background refresh, warming, bulk summary) remains an authenticated, server-side role-checked call; no CSP change; no new network origins.
- **FR-013**: Concurrent requests for the same dataset MUST be deduplicated into a single network call.
- **FR-014**: Every migrated view and new data-layer behaviour MUST ship with automated tests in the same change (render states, hostile-data-renders-as-text, cache-clear-on-token-change, invalidation after mutations, dedup), plus backend tests for the bulk route (session/RBAC guards and response shape).

### Key Entities

- **Cached dataset**: one fetched result (e.g. "catalog", "attendees for Event X, page 2, filter Y") with its identity, freshness window, retention bound, and last-fetched time. PII-bearing datasets (attendee lists) carry the shorter retention bound.
- **Freshness window**: per-data-type duration during which held data may be served as current without a new request. Zero for attendee lists and audit log.
- **Invalidation rule**: mapping from a mutation (check-in, undo, walk-in, remove, catalog CRUD, campaign change, capacity adjust) to the dataset families that must refresh.
- **Capacity summary**: the new bulk read — per-Event checked-in count and capacity across all active Events, non-PII.
- **Session boundary**: the token-change event that clears all cached datasets unconditionally.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Returning to an already-visited screen within its freshness window renders visible content immediately (no full-screen loading skeleton), measured across all six migrated views.
- **SC-002**: Loading Programs & Events issues a fixed number of data requests (catalog + one capacity summary) regardless of event count — down from 1 + N — with capacity figures identical to per-event reads.
- **SC-003**: After sign-out, zero application data remains in any browser storage, and no subsequent user can be shown the previous session's data — verified as part of operator security QA (§C) before sign-off.
- **SC-004**: The count of attendee-list read-audit entries per operator equals the count of that operator's real attendee-screen views — no speculative entries — verified by exercising all navigation and warming paths without opening the attendee screen.
- **SC-005**: After any tracked mutation, every affected screen reflects the change on its next appearance with no manual refresh, for all mutation types in the invalidation map.
- **SC-006**: All existing view test suites pass after migration, and the full test suites (both repos) pass with the new coverage of FR-014.

## Assumptions

- The design decisions themselves (which library, exact freshness values, invalidation map, big-bang migration) are **settled inputs** from ADR-015/ADR-016 — this spec inherits them and does not reopen them.
- On background-refresh failure with a painted snapshot, keeping the snapshot with a non-blocking error is the correct trade-off (data was recently valid); full error states remain for first-ever loads. Chosen as the default consistent with "stale beats blank, but never silently".
- The bulk capacity summary covers **active (non-archived) Events** — the same population Programs & Events displays; archived events need no counts.
- Multi-tab consistency is out of scope: per-tab memory caches are acceptable because freshness windows bound divergence and the session model is already per-tab.
- The Check-in live counter's existing refresh behaviour is treated as correct and out of scope beyond keeping its per-event read path working.
- Slice QA will include an **operator security comfort checks** section (§C) per the repo's slice-QA template, covering at minimum: cache-clear-on-sign-out, no PII after sign-out, and no speculative PII audit entries.
- Deferred and out of scope (parked, not dropped): optimistic updates (`FE-PERF-002`), persistent/offline cache, realtime push, cross-tab cache sharing, and any transport change between ScriptRunner and HubSpot.
