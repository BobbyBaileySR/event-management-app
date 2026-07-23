# Implementation Plan: Attendee Index Performance Fix — True Paging, Freshness, Reconciliation

**Branch**: `011-attendee-index-perf` | **Date**: 2026-07-17 | **Spec**: [spec.md](./spec.md)

**Input**: `/speckit-plan` — attendee index performance fix, architecture pre-settled in [ADR-011](../../docs/decisions/011-attendee-index-freshness.md) (three-legged freshness strategy) and [ADR-012](../../docs/decisions/012-attendee-index-write-conflict-resolution.md) (field-scoped writes + observed-timestamp guard) via a `grill-with-docs` session (2026-07-17), alongside the related [ADR-013](../../docs/decisions/013-audit-index-scope.md) audit-index work already shipped (`009-audit-log-ux`).

## Summary

`GET events/{eventId}/attendees` (`OnGetAttendees.ts` → `HubSpotCustomObjectAdapter.listRegisteredAttendees`) fetches every Contact associated with an Event via an unbounded HubSpot pagination loop, then does one sequential Record Storage read per checked-in attendee, before any list/search/pagination happens — the confirmed cause of 18-21s loads against ScriptRunner Connect's 25s timeout. This feature replaces that with a **materialized Attendee index** in Record Storage (one manifest record per Event listing its registered `contactId`s, plus one detail record per `{eventId, contactId}` — mirroring 009's hour-bucket pattern, keyed by Event instead of time) that `GET attendees` reads from instead of hitting HubSpot live per request.

Because a stale read cache would be actively harmful for a check-in app (stale "not registered"/"not checked-in" state is worse than a slow-but-correct load), the index is kept fresh by **three required legs**, not an optional subset (ADR-011): (1) write-through from EMS's own check-in/undo/remove handlers, (2) a new HubSpot-Workflow-triggered webhook landing on a new Async HTTP Event Listener (no session — shared-secret + IP-allowlist auth, rate-limited, audited), and (3) a scheduled reconciliation sweep piggybacking on `QueueProcessor.ts`'s existing 15-minute cron. Writes across all three sources are field-scoped with an observed-timestamp guard (ADR-012) so a stale write can never clobber a fresher one.

**Build order**: research the storage/read-path mechanics (Phase 0, resolved below) → index store + read rewire (`OnGetAttendees.ts`/`listRegisteredAttendees`/`listRegisteredAttendeesWithDispatchFilter`) → write-through in the three existing mutation handlers → new webhook listener + its auth/rate-limit/audit plumbing → reconciliation sweep folded into `QueueProcessor.ts` + archive-purge extension → contract/docs sync → tests → quickstart sign-off (including the mandatory operator security §C, since this introduces the codebase's first non-session-authenticated inbound endpoint).

**Implementation status (2026-07-17)**: all four code legs are implemented and tested. Live enablement is still blocked on the out-of-band HubSpot Workflow webhook action (`HS-012` / `X-ATTENDEE-IDX-003-HS`), both ScriptRunner webhook Parameters (`BE-ATTENDEE-IDX-OPS-001`), dedicated webhook security review, and operator sign-off.

## Technical Context

**Language/Version**: TypeScript — ScriptRunner Connect ECMAScript 2020 + Node 20 (Jest); no Frontend changes (response shape of `GET attendees` is unchanged — this is a pure Backend performance/freshness fix).

**Primary Dependencies**: New `Utils/Platform/AttendeeIndexStore.ts` (composes `Utils/Platform/KeyValueStore.ts` per ADR-006 — does not import `@sr-connect/record-storage` directly); `Utils/HubSpot/HubSpotCustomObjectAdapter.ts` (`listRegisteredAttendees` rewritten to read the index); `Utils/DispatchAudience.ts` (`listRegisteredAttendeesWithDispatchFilter` reads the index instead of paging live HubSpot); `OnCheckInScan.ts`/`OnUndoCheckIn.ts`/`OnRemoveAttendee.ts` (write-through added alongside their existing HubSpot writes); new `OnAttendeeRegistrationWebhook.ts` (new standalone Async HTTP Event Listener — not routed through `OnHttpRouter`); `Utils/RateLimit.ts` (reused, new bucket); `QueueProcessor.ts` + new `Utils/AttendeeIndexReconciliation.ts` (reconciliation sweep, same shape as `Utils/EventTicketPurge.ts`); `RegistrationCacheStore.ts`'s `deleteAllForEvent` call site (extended to also purge the new index). No new third-party packages.

**Storage**: Record Storage — new `ems-attidx-manifest-{eventId}` (contactId list) and `ems-attidx-{eventId}--{contactId}` (per-attendee roster + checked-in fields, each independently timestamped) keys, TTL derived the same way `Utils/EventTicketPurge.ts` already derives "is this Event over" (`event.end ?? event.start` + its existing grace-period buffer) — see research.md R-006.

**Testing**: Backend Jest — new `AttendeeIndexStore.test.ts` (manifest add/remove, field-scoped write + observed-timestamp guard, TTL derivation); extended `CustomObjectAdapter.test.ts` (`listRegisteredAttendees` reads the index, not live HubSpot); extended `DispatchAudience.test.ts`/`DispatchFoundation.test.ts` (dispatch-filtered listing reads the index); extended `CheckInJwt.test.ts`/check-in route tests + new `RemoveAttendee`-adjacent coverage (write-through fires on confirm/undo/remove); new `OnAttendeeRegistrationWebhook.test.ts` (auth accept/reject, rate limit, audit, index update); extended `EventTicketPurge.test.ts`-adjacent coverage or a new `AttendeeIndexReconciliation.test.ts` (drift correction, orphan removal, time-budget resume); extended `Slice1Routes.test.ts`/`EventFirstRoutes.test.ts` (existing `GET attendees` request/response shape, RBAC, and error codes unchanged).

**Target Platform**: ScriptRunner Connect (Backend) — unchanged. No Frontend deploy needed for this feature (response shape unchanged).

**Constraints**: Read path never falls back to a full-keyspace `getAllKeys` scan (same discipline as 009) — bounded by one Event's roster size via the manifest, never total workspace data (research.md R-001/R-002). All three freshness legs ship together, not phased (ADR-011 — ruled out a cheaper two-legged version). Field-scoped writes + observed-timestamp guard only (ADR-012) — no redesign of the conflict-resolution mechanism. RBAC on `GET attendees` unchanged (`admin`-only, `Utils/Routes.ts` line 92-96, confirmed unchanged by this feature). The new webhook listener is the first inbound endpoint in this codebase authenticated by something other than session/RBAC — requires its own dedicated security-review pass before shipping (ADR-011), separate from and in addition to the broader `X-SLICE15-002` vendor pentest.

**Scale/Scope**: Attendee rosters are per-Event and bounded by real registration volume (hundreds to low thousands per Event at this app's scale, not unbounded like the audit log's 90-day history) — the index bounds per-request cost to "this Event's roster," independent of how many other Events or how much total registration history exists workspace-wide.

## Constitution Check

*GATE: Must pass before Phase 0 research is acted on. Re-checked after Phase 1 design.*

| Gate | Status | Notes |
| :--- | :--- | :--- |
| Security — RBAC unchanged on `GET attendees` | ✅ | Stays `admin`-only (`Utils/Routes.ts:92-96`) — no `rbac.md` change for this route |
| Security — new webhook endpoint auth | ⏳ | **First non-session-authenticated inbound endpoint in this codebase** — shared secret + IP allowlist (research.md R-007), rate-limited, audited. Requires a dedicated security-review pass before shipping (ADR-011) — not skippable, tracked as its own gate below |
| Security — XSS / CSP | ✅ | No new rendering surface — `GET attendees` response shape and Frontend display path are unchanged by this feature |
| API contract sync | ⏳ | `GET attendees` request/response shape is byte-for-byte unchanged (no `api-contract.md` delta needed for it); the new webhook endpoint is an internal HubSpot→Backend integration point, not a Frontend-consumed API — documented in a contract note for completeness, not added to `api-contract.md`'s Frontend-facing routes |
| Tests ship with behaviour | ⏳ | New/extended Jest suites required per quickstart.md §A |
| No invented HubSpot property names | ✅ | Index reuses `AttendeeSummary`'s existing fields (`CustomObjectAdapter.ts:14-23`) — no new HubSpot property read/written |
| Audit on mutations | ⏳ | Write-through piggybacks on existing audited handlers (no new audit surface there); the new webhook gets its own new audited action (`attendee.registration.webhook`-style) — first read/write path in this codebase authenticated by something other than session |
| Responsive layout | N/A | No Frontend change |
| Deferred work in TODO.md | ✅ | `BE-ATTENDEE-IDX-001..004` already track this; scope confirmed via ADR-011/012 |
| Vertical slice write gate | ✅ | Write-through/webhook/sweep all write only to the new Record Storage index (not HubSpot) — HubSpot writes are the existing, already-write-gated check-in/undo/remove calls, unchanged by this feature |
| Portable backend boundary (ADR-006) | ✅ | New `AttendeeIndexStore.ts` lives in `Utils/Platform/`, composes `KeyValueStore.ts` (not a direct `@sr-connect/record-storage` import) — matches `RegistrationCacheStore.ts`/`CheckedInCounterStore.ts`'s existing convention |
| Slice operator security QA | ⏳ | Required — this slice reads/derives attendee PII into a new cache and introduces a new non-session-authenticated endpoint; §C in quickstart.md is mandatory before Live sign-off, not skippable |

**Post-design re-check**: No constitution violations identified. The four ⏳ gates are delivery-phase actions (security review for the new endpoint, tests, contract note, operator QA) gated on implementation, not open design questions — ADR-011/012 already closed the architecturally significant ones.

## Project Structure

### Documentation (this feature)

```text
specs/011-attendee-index-perf/
├── plan.md                       # This file
├── research.md                   # Phase 0 — storage/read-path mechanics, TTL fallback, webhook listener precedent
├── data-model.md                 # Phase 1 — Attendee index entry shape, manifest shape, field ownership
├── contracts/
│   └── attendee-webhook-contract.md   # Phase 1 — new webhook endpoint's request/response/error shape
├── quickstart.md                 # Phase 1 — validation scenarios + required §C operator security checks
├── checklists/
│   └── requirements.md          # Spec quality (from /speckit-specify)
└── tasks.md                      # Phase 2 — via /speckit-tasks (not this command)
```

### Source Code (touch points)

```text
Backend/scripts/
  Utils/Platform/AttendeeIndexStore.ts   # NEW — manifest (ems-attidx-manifest-{eventId}) + per-attendee
                                          #   detail records (ems-attidx-{eventId}--{contactId}); field-scoped
                                          #   read-modify-write with observed-timestamp guard (ADR-012);
                                          #   composes KeyValueStore.ts, not @sr-connect/record-storage directly
  Utils/HubSpot/HubSpotCustomObjectAdapter.ts   # listRegisteredAttendees: read/search/paginate via the new
                                          #   index instead of live HubSpot association fetch + N+1 cache reads;
                                          #   confirmCheckIn/undoCheckIn/removeAttendee: add index write-through
  Utils/DispatchAudience.ts              # listRegisteredAttendeesWithDispatchFilter: read via the index
  OnCheckInScan.ts, OnUndoCheckIn.ts,
  OnRemoveAttendee.ts                     # No handler-shape change — write-through happens inside the
                                          #   adapter methods above, which these already call
  OnAttendeeRegistrationWebhook.ts        # NEW — standalone Async HTTP Event Listener (not on OnHttpRouter);
                                          #   shared-secret + IP-allowlist auth, rate-limited, audited;
                                          #   applies a new-registration write-through to the index
  Utils/AttendeeIndexReconciliation.ts    # NEW — per-Event drift correction + orphan removal, same
                                          #   time-budgeted shape as Utils/EventTicketPurge.ts
  QueueProcessor.ts                       # Add the reconciliation sweep as a new time-budgeted step,
                                          #   same self-rechaining triggerScript pattern already in use
  Utils/Platform/RegistrationCacheStore.ts # deleteAllForEvent: also purge the new index's per-event keys
  Utils/Platform/Config.ts, types.ts      # EmsConfig: add ATTENDEE_WEBHOOK_SHARED_SECRET,
                                          #   ATTENDEE_WEBHOOK_ALLOWED_IPS: string[]
  Utils/RateLimit.ts                      # Reused as-is — new 'attendee-webhook' bucket, no mechanism change
  Utils/Audit.ts                          # New audited action for the webhook (e.g. attendee.registration.webhook)

Backend/node/tests/
  AttendeeIndexStore.test.ts              # NEW — manifest add/remove, field-scoped write + observed-timestamp
                                          #   guard, TTL derivation (event.end ?? event.start + grace period)
  CustomObjectAdapter.test.ts              # Extended — listRegisteredAttendees reads the index; write-through
                                          #   fires on confirmCheckIn/undoCheckIn/removeAttendee
  DispatchAudience.test.ts / DispatchFoundation.test.ts   # Extended — dispatch-filtered listing reads the index
  OnAttendeeRegistrationWebhook.test.ts    # NEW — shared-secret + IP-allowlist accept/reject, rate limit,
                                          #   audit entry, index updated on a valid notification
  AttendeeIndexReconciliation.test.ts      # NEW — corrects drifted entries, removes orphaned entries,
                                          #   resumes across a deadlineMs-truncated run
  Slice1Routes.test.ts / EventFirstRoutes.test.ts   # Extended — GET attendees request/response shape,
                                          #   RBAC, and error codes byte-for-byte unchanged

Frontend/
  docs/api-contract.md                    # Contract note only — GET attendees shape unchanged; new webhook
                                          #   is a HubSpot→Backend integration point, not documented as a
                                          #   Frontend-consumed route
```

**Structure decision**: One genuinely new Backend entry point (`OnAttendeeRegistrationWebhook.ts`, a new Async HTTP Event Listener) and one new Platform store; every other touch point extends an existing file. No Frontend changes — `GET attendees`'s request/response contract is unchanged, so no `dataService.ts`/view work is needed. This is a Backend-only performance and reliability upgrade to an existing admin-only surface, not new Frontend architecture.

## Delivery Phases

### Phase 0 — Storage & read-path mechanics (research, resolved below — see research.md)

Record Storage has no server-side prefix filter or query-by-index primitive (same limitation 009 already worked around) — resolved: a per-Event manifest record (contactId list) plus per-attendee detail records, mirroring 009's hour-bucket pattern keyed by Event instead of time. TTL fallback for an Event with no `end` date reuses `Utils/EventTicketPurge.ts`'s existing `event.end ?? event.start` + grace-period convention rather than inventing a new one. No existing Async HTTP Listener precedent in this repo — `QueueProcessor.ts`'s standalone-entry-point shape is the closest analog for the new webhook listener's structure.

### Phase A — Index store + read rewire (BE-ATTENDEE-IDX-001)

1. `AttendeeIndexStore.ts` — manifest CRUD (add/remove contactId), per-attendee field-scoped read-modify-write with observed-timestamp guard, TTL derivation.
2. `HubSpotCustomObjectAdapter.ts` — rewrite `listRegisteredAttendees` to read/search/paginate via the index.
3. `DispatchAudience.ts` — rewrite `listRegisteredAttendeesWithDispatchFilter` to read via the index instead of paging live HubSpot pages.

### Phase B — Write-through (BE-ATTENDEE-IDX-002)

1. `HubSpotCustomObjectAdapter.ts`'s `confirmCheckIn`/`undoCheckIn`/`removeAttendee` — add index write-through alongside their existing HubSpot + `RegistrationCacheStore` writes. No handler-shape (`OnCheckInScan.ts`/`OnUndoCheckIn.ts`/`OnRemoveAttendee.ts`) change needed — they already call these adapter methods.

### Phase C — Webhook listener (BE-ATTENDEE-IDX-003)

1. `Config.ts`/`types.ts` — add `ATTENDEE_WEBHOOK_SHARED_SECRET`/`ATTENDEE_WEBHOOK_ALLOWED_IPS` Parameters.
2. `OnAttendeeRegistrationWebhook.ts` — new standalone Async HTTP Event Listener: shared-secret + IP-allowlist auth (reject before any index write), rate limit via `Utils/RateLimit.ts`, audit entry, then a registration write-through to the index.
3. **Security review** for this specific endpoint before it can go live (ADR-011) — separate task, not folded into the general `/review-security` pass.

### Phase D — Reconciliation sweep (BE-ATTENDEE-IDX-004)

1. `Utils/AttendeeIndexReconciliation.ts` — per-Event drift correction + orphan removal, same time-budgeted shape as `Utils/EventTicketPurge.ts`.
2. `QueueProcessor.ts` — add the sweep as a new time-budgeted step in the existing 15-minute self-rechaining run.
3. `RegistrationCacheStore.ts`'s `deleteAllForEvent` — extend to also purge the new index's per-event keys on archive.

### Phase E — Tests + quickstart sign-off

1. Backend tests per quickstart.md §A.
2. Manual sign-off §B (all four legs) + §C (operator security comfort checks, including the new endpoint's dedicated checks).

## Complexity Tracking

> No constitution violations requiring justification — the added complexity (four coordinated legs, a new non-session-authenticated endpoint) is exactly what ADR-011/012 already reasoned through and accepted as necessary; not re-litigated here.

| Risk | Mitigation |
| :--- | :--- |
| Record Storage has no compare-and-swap on an existing key — two writers touching the same attendee entry at the exact same instant can still race at the physical layer | Accepted, documented risk (research.md R-003), same category as 009's AuditStore R-001: the observed-timestamp guard prevents order-based staleness (the actual failure mode ADR-012 targets), not true-simultaneous-write collision. Per-attendee write granularity keeps the window narrow. |
| A per-Event manifest record's size under a very large roster is unverified against an undocumented platform limit | Accepted (research.md R-001) — manifest holds only lightweight contactId strings, not full records; revisit only if a real Event's roster proves this material, no evidence it will at this app's scale. |
| The webhook leg is blocked on HubSpot Workflow-edit coordination (adding the webhook step) | Not an engineering blocker — build and test against a simulated webhook payload first (research.md R-007), same pattern as `010-attendee-detail-modal`'s HubSpot-access-blocked routes. Coordination tracked separately, not gating code review. |
| New non-session-authenticated inbound endpoint is a first for this codebase | Requires its own dedicated security-review pass before Live (ADR-011, Constitution Check) — not bundled into or skipped in favor of the broader `X-SLICE15-002` vendor pentest. |

## Phase 2

Run **`/speckit-tasks`** to generate `tasks.md` from this plan + spec.
