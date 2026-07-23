# Implementation Plan: Registration Form Bridge — Multi-Event Slots + Registration-Answer History

**Branch**: `013-registration-form-bridge` | **Date**: 2026-07-20 | **Spec**: [spec.md](./spec.md)

**Input**: `/speckit-plan` — architecture pre-settled in [ADR-017](../../docs/decisions/017-registration-slots-and-answer-history.md) via a `grill-with-docs` session (2026-07-20) plus a follow-on gap review (7 gaps found and resolved, folded into the ADR and `hubspot-ops-todo.md`).

## Summary

The public registration form needs to register a Contact for several events in one submission and capture each event's follow-up answers (meeting topic, guest names, etc.) durably — never overwritten cycle to cycle, the way the retired Contact-property model behaved. ADR-017 already settled the HubSpot-side mechanism (ten fixed "registration slots," 5 provisioned now) and the storage approach (Record Storage, appended not overwritten). This plan covers the two EMS-side pieces that mechanism depends on: **(1)** a new Record Storage store holding that history, fed by **(2)** an extension to the existing `OnAttendeeRegistrationWebhook` (already shipped for the Attendee index, `011-attendee-index-perf`) so one combined notification per slot carries both roster fields (existing) and the new answer bundle (new) — plus a small addition to the Attendee Detail modal's existing single-event route so staff can see that history.

**Build order**: Phase 0 confirms there's no unresolved technical unknown beyond what ADR-017 already settled → Phase 1 designs the store's key/append shape and the two API surface changes (webhook request body, `GET events/{evId}/attendees/{contactId}` response) → implementation phases (store → webhook extension → Attendee Detail read/render) → tests → quickstart sign-off (including operator security §C, since this is the first EMS surface rendering public-authored free text).

## Technical Context

**Language/Version**: TypeScript — Backend: ScriptRunner Connect ECMAScript 2020 + Node 20 (Jest). Frontend: React + Vitest (unchanged toolchain).

**Primary Dependencies**: New `Backend/scripts/Utils/Platform/RegistrationAnswerHistoryStore.ts` (composes `Utils/Platform/KeyValueStore.ts` per ADR-006 — no direct `@sr-connect/record-storage` import); `OnAttendeeRegistrationWebhook.ts` (extended — already exists from `011-attendee-index-perf`, not new); `OnGetAttendeeDetail.ts` / `Utils/Types.ts`'s `AttendeeDetailResponse` (extended with a new field); Frontend `dataService.ts`/`normalizeApi.ts` (map the new field) and a new `RegistrationHistoryPanel` component inside the existing Attendee Detail modal (`010-attendee-detail-modal`). No new third-party packages either side.

**Storage**: Record Storage — one new key per `{eventId, contactId}` pair (`ems-regform-answers-{eventId}--{contactId}`, mirroring `AttendeeIndexStore`'s existing `ems-attidx-{eventId}--{contactId}` naming convention), holding a JSON array appended to, never overwritten. See data-model.md.

**Testing**: Backend Jest — new `RegistrationAnswerHistoryStore.test.ts` (append semantics, read-verify-retry guard); extended `OnAttendeeRegistrationWebhook.test.ts` (optional `answers` field accepted and stored, audit metadata extended, absent-field case unaffected); extended `OnGetAttendeeDetail`-adjacent test (new response field, RBAC/rate-limit unchanged). Frontend Vitest — new `RegistrationHistoryPanel.test.tsx` (renders history, empty state, **hostile-string XSS guard as a hard requirement** per FR-007), extended Attendee Detail modal test (panel mounts, dataService mapping test for the new field).

**Target Platform**: ScriptRunner Connect (Backend) + static React SPA (Frontend) — both unchanged platforms, no new infrastructure.

**Constraints**: No new externally-reachable endpoint — this extends the existing `OnAttendeeRegistrationWebhook` listener (already the first non-session-authenticated endpoint in this codebase, from `011`; that security posture is inherited unchanged, not re-opened). `GET events/{evId}/attendees/{contactId}`'s RBAC (`admin`-only) and rate-limit bucket (`attendees-list`) are unchanged — only the response body grows one field. Record Storage has no compare-and-swap (`Backend/AGENTS.md` § Record Storage) — the append path uses a bounded read-verify-retry wrapper (ADR-017 decision #3), not a redesign of that limitation. No reconciliation sweep, no automated recovery tool, no self-service withdrawal, no general storage viewer — all explicitly out of scope per ADR-017 and the gap review.

**Scale/Scope**: Per-event, per-contact history is bounded by realistic resubmission counts (a handful per person per event, not unbounded) — no pagination needed for a single read. Ten slots is the hard ceiling on concurrently-offered events; 5 provisioned at launch (ADR-017 rollout note).

## Constitution Check

*GATE: Must pass before Phase 0 research is acted on. Re-checked after Phase 1 design.*

| Gate | Status | Notes |
| :--- | :--- | :--- |
| Security — RBAC unchanged on `GET events/{evId}/attendees/{contactId}` | ✅ | Stays `admin`-only, same rate-limit bucket (`attendees-list`) — no `rbac.md` matrix change, only a response-body addition |
| Security — webhook endpoint auth | ✅ | Reuses `OnAttendeeRegistrationWebhook`'s existing shared-secret + IP-allowlist auth unchanged (`011`) — this feature does not add a new endpoint or touch that auth boundary |
| Security — XSS / CSP | ⏳ | **New rendering surface** — the Registration history panel is the first EMS UI showing text authored directly by an anonymous public form submitter (spec FR-007). JSX-`{text}`-only rendering + a hostile-string Vitest guard are hard requirements, not optional polish — tracked as its own gate below, not folded into general XSS discipline |
| API contract sync | ⏳ | `docs/api-contract.md`'s `GET events/{evId}/attendees/{contactId}` section gains the new field; `011-attendee-index-perf/contracts/attendee-webhook-contract.md` gains the payload extension — both updated in the same change per Phase 1 |
| Tests ship with behaviour | ⏳ | New/extended Jest + Vitest suites required per quickstart.md §A |
| No invented HubSpot property names | ✅ | This feature reads a HubSpot-Workflow-supplied JSON body field (`answers`) and never writes to or reads a new HubSpot Contact/Event property from EMS code — the property-name allowlisting concern belongs to the HubSpot-side slot/script build (`HS-001`/`013`), not this plan |
| Audit on mutations | ✅ | Extends the existing `attendee.registration.webhook` audit entry with `answersCaptured`/`answerCount` metadata (gap-review decision) — no new audit action type, no answer text in metadata |
| Responsive layout | ✅ | New panel follows the existing Attendee Detail modal's responsive pattern (`010`) — no new layout primitive |
| Deferred work in TODO.md | ✅ | `FE-REGFORM-001`, `BE-REGFORM-001`/`002` already track this; `X-REGFORM-002`/`003`, `BE-REGFORM-003`/`004` track what's deliberately out of scope |
| Vertical slice write gate | ✅ | The only write this feature adds is Record Storage (never HubSpot) — schema verified (no new HubSpot property), RBAC unchanged, audit extended, existing rate limit reused |
| Portable backend boundary (ADR-006) | ✅ | `RegistrationAnswerHistoryStore.ts` lives in `Utils/Platform/`, composes `KeyValueStore.ts` — matches `AttendeeIndexStore.ts`'s existing convention |
| Slice operator security QA | ⏳ | Required — this is the first surface rendering public-authored free text; §C in quickstart.md is mandatory before Live sign-off |

**Post-design re-check**: No constitution violations identified. The three ⏳ gates (XSS guard, contract sync, tests, operator QA) are delivery-phase actions gated on implementation, not open design questions — ADR-017 and the gap review already closed the architecturally significant ones.

## Project Structure

### Documentation (this feature)

```text
specs/013-registration-form-bridge/
├── plan.md                       # This file
├── research.md                   # Phase 0 — confirms no unresolved unknown beyond ADR-017; resolves retention/archive-purge (not addressed in the ADR)
├── data-model.md                 # Phase 1 — Registration answer history entry shape, key, API surface deltas
├── contracts/
│   ├── attendee-webhook-payload-delta.md   # Phase 1 — the `answers` field added to the existing 011 webhook contract
│   └── get-attendee-detail-delta.md        # Phase 1 — the `registrationAnswerHistory` field added to the existing 010 route
├── quickstart.md                 # Phase 1 — validation scenarios + required §C operator security checks
├── checklists/
│   └── requirements.md          # Spec quality (from /speckit-specify)
└── tasks.md                      # Phase 2 — via /speckit-tasks (not this command)
```

### Source Code (touch points)

```text
Backend/scripts/
  Utils/Platform/RegistrationAnswerHistoryStore.ts   # NEW — ems-regform-answers-{eventId}--{contactId} key;
                                          #   appendEntry() with bounded read-verify-retry (no CAS available);
                                          #   composes KeyValueStore.ts, not @sr-connect/record-storage directly
  OnAttendeeRegistrationWebhook.ts        # EXTENDED (already exists from 011) — accepts optional `answers`
                                          #   body field; when present, appends to the new store and adds
                                          #   answersCaptured/answerCount to the existing audit call
  OnGetAttendeeDetail.ts                  # EXTENDED — act() reads RegistrationAnswerHistoryStore and adds
                                          #   registrationAnswerHistory to the response; no RBAC/rate-limit change
  Utils/Types.ts                          # AttendeeDetailResponse: add registrationAnswerHistory field;
                                          #   new RegistrationAnswerHistoryEntry type

Backend/node/tests/
  RegistrationAnswerHistoryStore.test.ts  # NEW — append semantics, read-verify-retry guard behavior
  OnAttendeeRegistrationWebhook.test.ts   # EXTENDED — answers field stored when present, ignored when absent,
                                          #   audit metadata extended, existing roster write-through unaffected
  AttendeeDetail (existing test file)     # EXTENDED — new response field present/absent cases, RBAC/rate-limit
                                          #   unchanged

Frontend/src/
  services/dataService.ts / normalizeApi.ts   # Map the new registrationAnswerHistory field (no new method —
                                          #   rides the existing fetchAttendeeDetail-style call)
  components/.../RegistrationHistoryPanel.tsx # NEW — renders history inside the existing Attendee Detail modal;
                                          #   JSX-{text}-only rendering (FR-007), empty state, length-cap display
  components/.../AttendeeDetailModal.tsx (existing)  # EXTENDED — mounts the new panel

Frontend/src/**/*.test.tsx
  RegistrationHistoryPanel.test.tsx       # NEW — renders history + empty state; hostile-string (`<script>`,
                                          #   `<img onerror=…>`) guard, matching this repo's standing XSS-test
                                          #   pattern (e.g. C6.1 in the operator security template)
  AttendeeDetailModal.test.tsx (existing) # EXTENDED — panel mounts when history present

Frontend/
  docs/api-contract.md                    # GET events/{evId}/attendees/{contactId} section gains the new
                                          #   field
  specs/011-attendee-index-perf/contracts/attendee-webhook-contract.md   # Gains the `answers` body-field
                                          #   documentation (edited in place — single source of truth for
                                          #   that endpoint's contract, not forked)
```

**Structure decision**: No new endpoint, no new route, no new RBAC row. Every Backend touch point extends a file that already exists from `011-attendee-index-perf` or `010-attendee-detail-modal`; the only genuinely new Backend file is the Platform store. Frontend gets one new small component (the panel) mounted into the existing modal — no new view, no new top-level route.

## Delivery Phases

### Phase 0 — Confirm no unresolved unknown (research, resolved below — see research.md)

ADR-017 and its gap review already settled the architecture. The one open question research.md resolves: **retention** — does this history get purged on Event archive (like the check-in operational cache) or retained indefinitely (like a durable record)? Not addressed in ADR-017; resolved in research.md with a documented default, flagged for the user to confirm or override.

### Phase A — Registration answer history store (`BE-REGFORM-001`)

1. `RegistrationAnswerHistoryStore.ts` — `appendEntry(eventId, contactId, entry)` with bounded read-verify-retry; `getHistory(eventId, contactId)`.

### Phase B — Webhook extension (`BE-REGFORM-002`)

1. `OnAttendeeRegistrationWebhook.ts` — accept optional `answers` body field; append to the store when present; extend the existing audit call with `answersCaptured`/`answerCount` (never the answer text).
2. Update `011-attendee-index-perf/contracts/attendee-webhook-contract.md` with the new field.

### Phase C — Attendee Detail surface (`FE-REGFORM-001`)

1. `OnGetAttendeeDetail.ts` / `Utils/Types.ts` — add `registrationAnswerHistory` to the response.
2. `docs/api-contract.md` — document the new field.
3. Frontend: `dataService.ts`/`normalizeApi.ts` mapping + new `RegistrationHistoryPanel.tsx` mounted in the existing modal — JSX-`{text}`-only rendering, empty state, display length-cap (spec FR-007, gap-review decision).

### Phase D — Tests + quickstart sign-off

1. Backend + Frontend tests per quickstart.md §A, including the hostile-string XSS guard as a hard pass/fail gate, not optional coverage.
2. Manual sign-off §B + §C (operator security comfort checks — first public-authored-text rendering surface).

## Complexity Tracking

> No constitution violations requiring justification — this plan deliberately avoids adding complexity (no new endpoint, no new RBAC row, no reconciliation sweep, no general storage viewer) beyond what ADR-017 already reasoned through as necessary.

| Risk | Mitigation |
| :--- | :--- |
| Record Storage has no compare-and-swap — two near-simultaneous appends to the same `{eventId, contactId}` key can still race at the physical layer | Accepted, documented risk (same category as `011`'s equivalent) — the read-verify-retry wrapper shrinks the window without eliminating it; genuinely simultaneous submissions from the same person for the same event are a low-probability event given human-paced form submission (ADR-017 decision #3). |
| Public free-text rendering is a new class of input for this codebase | Treated as a hard requirement (FR-007), not a soft guideline — a dedicated hostile-string Vitest test is required to ship, not optional, and is called out by name in this plan's Constitution Check rather than left to inherit silently from the general XSS rule. |
| Retention/archive-purge behavior wasn't decided in ADR-017 | Resolved in research.md with a documented default and explicitly flagged to the user for confirmation before implementation proceeds — see Phase 0. |

## Phase 2

Run **`/speckit-tasks`** to generate `tasks.md` from this plan + spec.
