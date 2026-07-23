# Implementation Plan: QR Ticket Emails

**Branch**: `008-qr-ticket-emails` | **Date**: 2026-07-16 | **Spec**: [spec.md](./spec.md)

**Input**: `/speckit-plan` — QR ticket emails, architecture pre-settled in [ADR-010](../../docs/decisions/010-qr-ticket-email-single-send.md) via a `grill-with-docs` session + live HubSpot UAT spike (2026-07-16).

## Summary

Extend **Slice 2 Email dispatch** (`005-email-dispatch`) so that sending or scheduling a dispatch with a **QR-tagged** HubSpot template automatically becomes a **ticket dispatch**: EMS detects the template's QR placeholder, mints a per-recipient check-in ticket lazily (reusing `Utils/CheckInJwt.ts`'s claim shape, riding the existing `DispatchQueue`/`QueueProcessor` per-recipient loop), injects a unique QR image per recipient via HubSpot's Marketing Single-Send v4 API, and leaves the Dispatch log showing whether a given send generated tickets. No new route, no new view, no new operator-facing toggle — this is additive behavior inside dispatch, not a parallel feature.

**Build order**: remaining implementation-level spike (research.md R-003 — R-001/R-002 resolved 2026-07-16) → ticket mint utility + `RegistrationCacheStore` extension → Files adapter → `SingleSendAdapter` extension (shared with `BE-EMAIL-SEND-001`) → QR-detection helper + `EmailDispatchJob.ticketsEnabled` → `DispatchQueue` wiring → contract merge → Dispatch log indicator (Frontend) → tests → quickstart sign-off.

**Blocked on**: `BE-EMAIL-SEND-001` (wiring `HubSpotSingleSendAdapter` for real, currently a throwing stub) — this feature extends the same adapter and cannot go live without it being real.

## Technical Context

**Language/Version**: TypeScript — ScriptRunner Connect ECMAScript 2020 + Node 20 (Jest); React 19 + Vite (Frontend, minimal touch)

**Primary Dependencies**: `Utils/CheckInJwt.ts` (claim shape/verify — reused, not duplicated), `Utils/Platform/RegistrationCacheStore.ts` (extended), `Utils/DispatchQueue.ts` + `QueueProcessor.ts` (existing per-recipient loop — extended, not replaced), `Utils/HubSpot/SingleSendAdapter.ts` (extended), `Utils/HubSpot/EmailTemplatesAdapter.ts` (new sibling for content-fetch/detection), a new HubSpot Files adapter, a QR image encoder — **NEEDS CLARIFICATION** on exact library (research.md R-001, not resolvable without a build-time spike inside the real ScriptRunner Connect sandbox).

**Storage**: Record Storage — extends existing `RegistrationCacheRecord` (`Utils/Platform/RegistrationCacheStore.ts`) with `checkInTicket` + `checkInTicketImageFileId`; extends existing `EmailDispatchJob` (`Utils/DispatchStore.ts`) with `ticketsEnabled`. No new store.

**Testing**: Backend Jest — new `CheckInTicket.test.ts`, extended `RegistrationCacheStore.test.ts` / `DispatchQueue.test.ts` / `EmailDispatchRoutes.test.ts`; Frontend Vitest — extended `EmailDispatchView`/Dispatch-log tests for the `ticketsEnabled` indicator.

**Target Platform**: ScriptRunner Connect (Backend) + GitHub Pages (Frontend, UAT/Live) — same as 005.

**Constraints**: No signing key or minting logic in the browser (`NFR-001`); no durable Contact-record PII write beyond what 005 already writes (`NFR-003`); admin-only, audited, rate-limited — identical gate to 005, no new/weaker gate (`FR-012`); QR encoder and any image-processing step must run inside the portable-boundary rule (`ADR-006`) — Web-standard APIs only, no Node `fs`/`process`/native bindings.

**Scale/Scope**: Same audience scale as 005 (hundreds of recipients per Event, per `ADR-007`'s stated target) — ticket minting adds one Record Storage read + conditional write per recipient inside a loop that already does per-recipient HTTP calls, not a new scale concern.

## Constitution Check

*GATE: Must pass before Phase 0 research is acted on. Re-checked after Phase 1 design.*

| Gate | Status | Notes |
| :--- | :--- | :--- |
| Security — no secrets in frontend | ✅ | Ticket signing key stays server-side (new `CHECKIN_JWT_PRIVATE_KEY` Parameter, never sent to Frontend) |
| Security — XSS / CSP | ✅ | New Dispatch-log field is a boolean rendered as plain state, not HTML |
| Security — RBAC admin on slice surfaces | ✅ | No new route; inherits 005's `admin`-only gate unchanged |
| API contract + RBAC sync | ⏳ | Merge [contracts/qr-ticket-dispatch-delta.md](./contracts/qr-ticket-dispatch-delta.md) → `docs/api-contract.md` (no `rbac.md` change needed — no new route) |
| Tests ship with behaviour | ⏳ | New/extended Jest + Vitest suites required per [quickstart.md](./quickstart.md) §A |
| No invented HubSpot property names | ✅ | Uses existing `hubspot-schema.md` QR JWT claim names; the new personalization-token property name must be added to `hubspot-schema.md` when implemented |
| Audit on mutations | ✅ | New `checkin.ticket.mint` action (first mint only — FR-002); reused tickets produce no extra audit row |
| Responsive layout | ✅ | Only new UI is a boolean indicator inside the existing Dispatch-log table — no new layout surface |
| Deferred work in TODO.md | ✅ | Governance (`HS-003`), dedicated subscription type, and "send on registration" (`FE-QR-GEN-002`/`BE-QR-GEN-002`) already parked |
| Vertical slice write gate | ⏳ | New write (`checkInTicket` mint, HubSpot Files upload) needs schema verified (Parameter added), RBAC unchanged, audit in place, handler order preserved — same gate 005 already passed, extended to the new write |
| Portable backend boundary (ADR-006) | ✅ | `qrcode-generator` verified zero Node built-ins (research.md R-001); `FilesAdapter.ts` lives in `Utils/HubSpot/`, which is allowed to import `scripts/api/` per ADR-005 — no boundary conflict |

**Post-design re-check**: No constitution violations identified. Two gates (`API contract sync`, `write gate`) remain ⏳ only because they're delivery-phase actions (Phase B/implementation), not open design questions.

## Project Structure

### Documentation (this feature)

```text
specs/008-qr-ticket-emails/
├── plan.md                              # This file
├── research.md                          # Phase 0 — QR encoder, subcategory mechanism, Files API, adapter shape
├── data-model.md                        # Phase 1 — EmailDispatchJob + RegistrationCacheRecord extensions
├── contracts/
│   └── qr-ticket-dispatch-delta.md      # Phase 1 — response-field delta on existing dispatch routes
├── quickstart.md                        # Phase 1 — validation scenarios + required §C operator security checks
├── checklists/
│   └── requirements.md                  # Spec quality (from /speckit-specify)
└── tasks.md                             # Phase 2 — via /speckit-tasks (not this command)
```

### Source Code (touch points)

```text
Backend/scripts/
  Utils/CheckInJwt.ts                     # Existing — verify only, untouched
  Utils/CheckInTicket.ts                  # NEW — sign/mint a check-in ticket (mirrors verify's crypto, opposite direction)
  Utils/Platform/RegistrationCacheStore.ts  # Extend RegistrationCacheRecord: checkInTicket, checkInTicketImageFileId; extend deleteAllForEvent to also delete the HubSpot Files upload per row
  Utils/Platform/Config.ts                # Read new CHECKIN_JWT_PRIVATE_KEY Parameter (mint-side key, separate from existing CHECKIN_JWT_PUBLIC_KEY)
  Utils/Platform/types.ts                 # Add CHECKIN_JWT_PRIVATE_KEY? to EmsConfig
  Utils/HubSpot/FilesAdapter.ts           # NEW — upload/delete QR image (research.md R-003)
  Utils/HubSpot/EmailTemplatesAdapter.ts  # Extend — fetch single template content for detection (FR-001) + read-only eligibility validation (research.md R-002 — no write; the HubSpot Team sets eligibility via the editor's creation-time type/category choice)
  Utils/HubSpot/SingleSendAdapter.ts      # Extend SingleSendParams with optional contactProperties (research.md R-004) — shared surface with BE-EMAIL-SEND-001
  Utils/DispatchStore.ts                  # Extend EmailDispatchJob with ticketsEnabled
  Utils/DispatchQueue.ts                  # processDispatchJob: when job.ticketsEnabled, mint-if-missing + upload-if-missing + pass contactProperties per recipient before calling singleSendAdapter.sendToContact
  OnPostEmailDispatch.ts                  # Detect ticketsEnabled at create time (template-content fetch), stamp on the job, audit checkin.ticket.mint on first mint (moved into DispatchQueue's mint helper, audited from there)
  OnGetEmailDispatches.ts                 # Surface ticketsEnabled on list/detail responses
  OnPatchEmailDispatch.ts                 # Re-detect ticketsEnabled if templateId changes on a pending job

Backend/node/tests/
  CheckInTicket.test.ts                   # NEW
  RegistrationCacheStore.test.ts          # Extended
  DispatchQueue.test.ts                   # Extended
  EmailDispatchRoutes.test.ts             # Extended

Frontend/src/
  views/EmailDispatchView.tsx             # Dispatch-log row: ticketsEnabled indicator (plain text/state)
  types.ts                                # Add ticketsEnabled to dispatch DTOs
  utils/normalizeApi.ts                   # Map ticketsEnabled through
  services/dataService.ts                 # No new methods — existing dispatch methods carry the new field
```

**Structure decision**: No new Backend route, no new Frontend view or route — every touch point is an extension of an existing 005 file, plus two genuinely new small modules (`CheckInTicket.ts`, `FilesAdapter.ts`) that don't fit any existing file's single concern.

## Delivery Phases

### Phase 0 — Implementation spikes (blocking build)

1. ✅ **Done 2026-07-16.** Prove a QR encoder runs correctly and encodes a ~550–800+ char JWT reliably — `qrcode-generator` added to `Backend/package.json`, verified locally (research.md R-001). Live ScriptRunner sandbox smoke-test still recommended during T009, low risk.
2. ✅ **Done 2026-07-16 (corrected).** Confirmed the HubSpot email editor's creation flow includes a type/category choice that sets single-send eligibility — no API call needed, no engineering hand-off (research.md R-002).
3. ✅ **Done 2026-07-16.** Confirmed the private app's scopes cover HubSpot Files upload + delete — live round trip (upload `201`, delete `204`). Corrected the request shape along the way: `folderPath` is a separate top-level multipart field, not nested inside `options` (research.md R-003).
4. ✅ **Done.** All four research items resolved — Phase 0 complete, nothing blocks Phase 2.

### Phase A — Backend ticket mechanics

1. `Utils/CheckInTicket.ts` — mint function using the existing claim shape (`Utils/CheckInJwt.ts`'s constants), RS256 sign via Web Crypto, new `CHECKIN_JWT_PRIVATE_KEY` Parameter.
2. `RegistrationCacheStore.ts` — add `checkInTicket`/`checkInTicketImageFileId` fields; extend `deleteAllForEvent` to delete the associated HubSpot Files upload per row before removing the Record Storage entry.
3. `Utils/HubSpot/FilesAdapter.ts` — upload (returns `{fileId, url}`) and delete.
4. `Utils/HubSpot/SingleSendAdapter.ts` — add optional `contactProperties` to `SingleSendParams`; wire into the real `HubSpotSingleSendAdapter` implementation alongside `BE-EMAIL-SEND-001`'s work (coordinate — same file, same PR or a tightly sequenced pair).
5. Mint-if-missing helper (new, small — likely lives alongside `CheckInTicket.ts` or as a `DispatchQueue.ts`-local function): look up cache row → reuse or mint+upload → return the image URL.

### Phase B — Detection + dispatch wiring

1. `EmailTemplatesAdapter.ts` — add a content-fetch method (`GET /marketing/v3/emails/{emailId}`), a `hasQrPlaceholder(content)` check against the fixed personalization-token string, and a **read-only** `isSingleSendEligible(templateId)` validation (research.md R-002 — the HubSpot Team sets eligibility via the editor's creation-time type/category choice; EMS only verifies it, never writes it).
2. `OnPostEmailDispatch.ts` — call detection once at create time, stamp `ticketsEnabled` on the new `EmailDispatchJob`. If `ticketsEnabled` is true but `isSingleSendEligible` is false, fail the create with a clear error rather than accepting a dispatch that would fail at send time.
3. `OnPatchEmailDispatch.ts` — re-run detection + eligibility check if `templateId` changes on a pending job.
4. `DispatchQueue.processDispatchJob` — when `job.ticketsEnabled`, per recipient: mint-if-missing → build `contactProperties` → pass through to `singleSendAdapter.sendToContact`. Audit `checkin.ticket.mint` only on an actual mint (not on reuse).
5. `OnGetEmailDispatches.ts` — surface `ticketsEnabled` on list/detail.

### Phase C — Contract + docs

1. Merge [contracts/qr-ticket-dispatch-delta.md](./contracts/qr-ticket-dispatch-delta.md) into `Frontend/docs/api-contract.md`.
2. Add the new personalization-token property name to `Frontend/docs/hubspot-schema.md` once decided (no invented names — this is the one new HubSpot-facing name this feature introduces).
3. Document the new `CHECKIN_JWT_PRIVATE_KEY` Parameter in `Backend/README.md`.

### Phase D — Frontend indicator

1. `types.ts` + `normalizeApi.ts` — carry `ticketsEnabled` through.
2. `EmailDispatchView.tsx` — Dispatch-log row indicator (plain text/state, e.g. a small "Tickets" badge), matching existing badge patterns rather than inventing new styling.

### Phase E — Tests + quickstart sign-off

1. Backend + Frontend tests per [quickstart.md](./quickstart.md) §A.
2. Manual sign-off §B (US1/US2/US3) + §C (operator security comfort checks) on UAT.

## Complexity Tracking

> No constitution violations requiring justification — this is an additive extension of an already-shipped slice, not new architecture.

| Risk | Mitigation |
| :--- | :--- |
| QR encoder may not run in ScriptRunner's sandbox | Phase 0 spike before any other Backend work starts (research.md R-001) |
| ~~`subcategory` PATCH mechanism unconfirmed~~ | ✅ Resolved — no PATCH needed; the editor's creation-time type/category choice covers it (research.md R-002) |
| Shared file with `BE-EMAIL-SEND-001` (`SingleSendAdapter.ts`) | Coordinate sequencing explicitly — this feature cannot go live before that stub is wired for real |
| ~~HubSpot Files scope may not be granted yet~~ | ✅ Resolved — confirmed live 2026-07-16, scope present, upload/delete both pass |
| Template edited to remove the placeholder mid-flight (spec Edge Cases) | `ticketsEnabled` is stamped once at create time, not re-checked at processing — accepted, documented behavior, not a bug |

## Phase 2

Run **`/speckit-tasks`** to generate `tasks.md` from this plan + spec.
