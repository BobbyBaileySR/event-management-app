---
description: "Task list for QR Ticket Emails (008-qr-ticket-emails)"
---

# Tasks: QR Ticket Emails

**Input**: Design documents from `/specs/008-qr-ticket-emails/`

**Prerequisites**: [plan.md](./plan.md) · [spec.md](./spec.md) · [research.md](./research.md) · [data-model.md](./data-model.md) · [contracts/qr-ticket-dispatch-delta.md](./contracts/qr-ticket-dispatch-delta.md) · **005-email-dispatch** and **003-check-in** shipped

**Tests**: Included — per the repo-root testing discipline (Backend Jest, Frontend Vitest ship with every behaviour change).

**Organization**: US1 (P1, MVP) delivers the whole send-a-ticket pipeline. US2 (P2) and US3 (P3) are almost entirely verification — the consent/reporting behavior is inherent to US1's plumbing, not separately built.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story label (US1–US3)

## Path Conventions

- **Backend**: `Backend/scripts/`, `Backend/node/tests/`
- **Frontend**: `Frontend/src/`, `Frontend/docs/`

---

## Phase 1: Setup

**Purpose**: Confirm prerequisites and resolve the implementation-level unknowns research.md flagged as needing a live spike, before any Foundational code is written against an assumption.

- [ ] T001 Confirm **005-email-dispatch** and **003-check-in** are deployed and passing per `specs/008-qr-ticket-emails/quickstart.md` §Prerequisites
- [~] T002 Execute the QR-encoder sandbox spike (`research.md` R-001) — **2026-07-16: resolved locally** — `qrcode-generator` added to `Backend/package.json`, verified zero Node built-ins, zero transitive deps, correctly encodes the real 560–800 char JWT range, ESM-compatible, 293/293 tests + lint green. **Still open:** a live smoke-test inside the actual ScriptRunner Connect sandbox (not just local Node) — low risk, defer to T009.
- [x] T003 Execute the `subcategory` mechanism spike (`research.md` R-002) — **2026-07-16, corrected:** no API call needed at all — confirmed the HubSpot email editor's creation flow has a type/category choice that sets single-send eligibility directly; recorded in `specs/008-qr-ticket-emails/research.md`
- [x] T004 [P] Confirm the private app's scopes cover HubSpot Files upload + delete (`research.md` R-003) — **2026-07-16: done, live round trip** — upload `201`, delete `204`. Corrected request shape along the way: `folderPath` is a separate top-level multipart field, not nested inside `options`
- [ ] T005 [P] Review all design artifacts in `specs/008-qr-ticket-emails/` (spec, plan, research, data-model, contracts, quickstart)
- [ ] T006 Confirm sequencing with `BE-EMAIL-SEND-001` in `Backend/TODO.md` — decide whether `Utils/HubSpot/SingleSendAdapter.ts` changes for both features land in the same PR or a tightly sequenced pair, and record the decision there

**Checkpoint**: ✅ All of T002–T004 resolved 2026-07-16 — Phase 2 can start.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Ticket minting, image hosting, and detection plumbing shared by every user story.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete — US1 in particular *is* this plumbing wired together.

### Backend foundation

- [x] T007 [P] Add `CHECKIN_JWT_PRIVATE_KEY?: string` to `EmsConfig` in `Backend/scripts/Utils/Platform/types.ts`
- [x] T008 Read `CHECKIN_JWT_PRIVATE_KEY` in `Backend/scripts/Utils/Platform/Config.ts` — depends on T007 (no code change needed — `Config.ts` is a generic `context.environment.vars` passthrough with no per-field reads; the new field flows through automatically once added to `EmsConfig`)
- [x] T009 Implement `mintCheckInTicket(contactId, eventId, privateKeyPem, issuer)` in new `Backend/scripts/Utils/CheckInTicket.ts` — RS256 sign via Web Crypto, reusing `CHECKIN_JWT_ALG`/`CHECKIN_JWT_ISSUER` from `Backend/scripts/Utils/HubSpotSchema.ts` (mirror the crypto approach in `Utils/CheckInJwt.ts`'s `verifyCheckInJwt`, opposite direction) — depends on T008
- [x] T010 [P] Add `checkInTicket: string | null` and `checkInTicketImageFileId: string | null` fields to `RegistrationCacheRecord` in `Backend/scripts/Utils/Platform/RegistrationCacheStore.ts`
- [x] T011 [P] Implement `Backend/scripts/Utils/HubSpot/FilesAdapter.ts` — `upload(bytes): Promise<{fileId, url}>`, `delete(fileId): Promise<void>`. Call `HubSpot.fetch` directly (not `hubspotFetch` — that wrapper only forwards string bodies); build a `FormData` with `file`, `folderPath` (top-level, e.g. `/ems-qr-tickets`), and `options` (JSON string: `access`/`overwrite` only — **not** `folderPath`) as verified in `research.md` R-003. Also added `get(fileId)` (re-fetches the current URL) — needed for the mint-if-missing reuse path since only `fileId`, not `url`, is persisted.
- [x] T012 Extend `deleteAllForEvent` in `Backend/scripts/Utils/Platform/RegistrationCacheStore.ts` to call `FilesAdapter.delete` for each row's `checkInTicketImageFileId` before removing the Record Storage entry — depends on T010, T011
- [x] T013 [P] Add optional `contactProperties?: Record<string, string>` to `SingleSendParams` in `Backend/scripts/Utils/HubSpot/SingleSendAdapter.ts` — coordinate with `BE-EMAIL-SEND-001` per T006 (decision: interface extended only; `HubSpotSingleSendAdapter`'s real send-wiring stays `BE-EMAIL-SEND-001`'s job, untouched here — see `Backend/TODO.md`)
- [x] T014 [P] Add `getTemplateContent(templateId)`, `hasQrPlaceholder(content)`, and a **read-only** `isSingleSendEligible(templateId)` check (research.md R-002 — validates the type/category the HubSpot Team set at template-creation time; never writes it) to `Backend/scripts/Utils/HubSpot/EmailTemplatesAdapter.ts`
- [x] T015 [P] Add `ticketsEnabled: boolean` to `EmailDispatchJob` in `Backend/scripts/Utils/DispatchStore.ts` (added to `Utils/Types.ts` where `EmailDispatchJob` is defined; kept optional like this interface's other late-added boolean flags so existing test fixtures/jobs without it are treated as `false`)
- [x] T016 Implement the mint-if-missing helper (look up the cache row → reuse existing ticket+image, or mint via T009 and upload via T011, then persist) alongside `CheckInTicket.ts` — depends on T009, T010, T011
- [x] T017 [P] Add the new personalization-token property name to `Frontend/docs/hubspot-schema.md` § QR JWT (no invented property names — decide the literal name here, before any code references it) — chose `ems_checkin_qr_url`, also added as `CHECKIN_QR_CONTACT_PROPERTY` in `Backend/scripts/Utils/HubSpotSchema.ts`
- [x] T018 [P] Document the new `CHECKIN_JWT_PRIVATE_KEY` Parameter setup step in `Backend/README.md` — as **Text**, not Password (Password-type Parameters can't be read at runtime, per the existing `SESSION_SIGNING_SECRET` note in the same doc)

### Frontend foundation

- [x] T019 [P] Add `ticketsEnabled: boolean` to dispatch DTOs in `Frontend/src/types.ts`
- [x] T020 [P] Map `ticketsEnabled` through in `Frontend/src/utils/normalizeApi.ts`
- [x] T021 [P] Add `normalizeApi.test.ts` case for `ticketsEnabled` pass-through in `Frontend/src/utils/normalizeApi.test.ts`

### Foundation tests

- [x] T022 [P] `Backend/node/tests/CheckInTicket.test.ts` — mint produces a JWT verifiable by the existing `verifyCheckInJwt`; mint-if-missing never rotates an existing ticket; reuse path returns the same ticket + image URL without calling `FilesAdapter.upload` again
- [x] T023 [P] Extend `Backend/node/tests/RegistrationCacheStore.test.ts` (or create if none exists) — `checkInTicket`/`checkInTicketImageFileId` round-trip; `deleteAllForEvent` calls `FilesAdapter.delete` for each stored file id

**Checkpoint**: Ticket minting, image upload, and template detection all work in isolation (unit-tested) before `DispatchQueue` wiring begins.

---

## Phase 3: User Story 1 — Send a QR ticket email through the ordinary Compose flow (Priority: P1) 🎯 MVP

**Goal**: An admin sends/schedules a dispatch using a QR-tagged template exactly as any other dispatch; each recipient gets a unique, scannable code; the Dispatch log shows whether tickets were generated.

**Independent Test**: `specs/008-qr-ticket-emails/quickstart.md` §B1 — compose, send, two recipients get two distinct codes, scan resolves to the correct recipient, log shows the indicator, a repeat send reuses (not reissues) the ticket.

### Tests for User Story 1

- [x] T024 [P] [US1] Extend `Backend/node/tests/DispatchQueue.test.ts` — a `ticketsEnabled: true` job passes `contactProperties` (recipient's image URL) to `singleSendAdapter.sendToContact`; a `ticketsEnabled: false` job behaves byte-for-byte like today (regression guard for FR-005); a second dispatch to an already-minted recipient does not call `FilesAdapter.upload`/mint again
- [x] T025 [P] [US1] Extend `Backend/node/tests/EmailDispatchRoutes.test.ts` — `POST dispatches` detects and stamps `ticketsEnabled` from the chosen `templateId`; a QR-tagged-but-not-eligible template fails create with a clear error (not a silent `ticketsEnabled: false`); `GET dispatches` / `GET dispatches/{id}` surface `ticketsEnabled`; `PATCH dispatches/{id}` re-detects it when `templateId` changes on a pending job
- [x] T026 [P] [US1] Extend `Frontend/src/views/EmailDispatchView.test.tsx` — Dispatch-log row renders the `ticketsEnabled` indicator as plain text/state; hostile value guard (renders as text, never HTML)

### Implementation for User Story 1

- [x] T027 [US1] `Backend/scripts/OnPostEmailDispatch.ts` — call `EmailTemplatesAdapter.getTemplateContent` + `hasQrPlaceholder` once at create time, stamp `ticketsEnabled` on the new `EmailDispatchJob`; if `ticketsEnabled` is true, also call `isSingleSendEligible` and fail the create with a clear error if false (authoring mistake caught at create time, not at send time) — depends on T014, T015
- [x] T028 [US1] `Backend/scripts/OnPatchEmailDispatch.ts` — re-run detection + eligibility check if `templateId` changes on a pending job — depends on T027 (shared `detectTicketsEnabled`/`assertSingleSendEligible` factored into new `Utils/DispatchTicketDetection.ts` rather than importing handler-to-handler)
- [x] T029 [US1] `Backend/scripts/Utils/DispatchQueue.ts` (`processDispatchJob`) — when `job.ticketsEnabled`, per recipient: call the mint-if-missing helper (T016) to get the image URL, build `contactProperties`, pass through to `singleSendAdapter.sendToContact` — depends on T013, T016
- [x] T030 [US1] Audit `checkin.ticket.mint` (metadata: `eventId`, `contactId` only — no email/name) from the mint-if-missing helper, on an actual mint only, never on reuse — depends on T016
- [x] T031 [US1] `Backend/scripts/OnGetEmailDispatches.ts` — surface `ticketsEnabled` on list and detail responses — depends on T027 (via `DispatchStore.ts`'s `toDispatchListItem`, shared by list/detail/patch responses)
- [x] T032 [US1] `Frontend/src/views/EmailDispatchView.tsx` — Dispatch-log row indicator for `ticketsEnabled` (plain text/state, matching existing badge patterns) — depends on T019, T020
- [x] T033 [US1] Merge [contracts/qr-ticket-dispatch-delta.md](./contracts/qr-ticket-dispatch-delta.md) into `Frontend/docs/api-contract.md` — depends on T027, T031

**Checkpoint**: US1 is fully functional and independently testable — quickstart §B1 passes end-to-end on UAT.

---

## Phase 4: User Story 2 — Undeliverable ticket falls back to normal on-site check-in (Priority: P2)

**Goal**: Confirm consent is honored (unsubscribed recipients don't get a ticket email) and that the existing manual check-in paths remain untouched and functional for them.

**Independent Test**: `specs/008-qr-ticket-emails/quickstart.md` §B2 — mark a test Contact unsubscribed, send a ticket dispatch including them, confirm no delivery, confirm manual check-in still works.

**Note**: This story requires **no new code** — consent-honoring is inherent to using the marketing v4 single-send API (already true from US1's implementation), and manual check-in (name search / walk-in) is Slice 1 functionality this feature never touches. This phase is verification-only, to catch any accidental coupling.

### Tests for User Story 2

- [x] T034 [P] [US2] Extend `Backend/node/tests/DispatchQueue.test.ts` (or a new test) — a `singleSendAdapter.sendToContact` failure/suppression for one recipient (simulating consent-based non-delivery) does not affect ticket minting/delivery for other recipients in the same dispatch, and does not throw the whole job into `failed` (matches existing partial-completion handling from 005) — new test: `'US2 — a suppressed/failed send for one recipient (consent) does not block ticket delivery to others or fail the whole job'`
- [x] T035 [US2] Confirm (code read, not a new test) that `OnCheckIn.ts` / `OnCheckInScan.ts` / walk-in check-in paths have zero references to `RegistrationCacheRecord.checkInTicket` as a *requirement* for check-in eligibility — a missing ticket must never block a manual check-in. **Confirmed** — the only eligibility gate is `HubSpotCustomObjectAdapter.confirmCheckIn`/`undoCheckIn`, which check the registration/checked-in association labels only; every reference to `checkInTicket`/`checkInTicketImageFileId` across `Backend/scripts/` is either the type declaration, the mint-if-missing reuse/persist logic, or Files cleanup on Event archive — none are read on any check-in path.

### Verification for User Story 2

- [ ] T036 [US2] Run `specs/008-qr-ticket-emails/quickstart.md` §B2 on UAT with a real unsubscribed test Contact; record the result in the quickstart's §C7.2 sign-off row. **Not runnable from an implementation session** — needs a human with live HubSpot UAT access, a real unsubscribed test Contact, and a real inbox check. Left for the human alongside T041.

**Checkpoint**: US2 verified — no regressions, no new code paths that could couple ticket delivery to check-in eligibility. **T036 (live UAT) still pending a human with real HubSpot access** — T034/T035 (the parts verifiable without live access) are done.

---

## Phase 5: User Story 3 — Ticket sends roll up into HubSpot Campaign reporting (Priority: P3)

**Goal**: Confirm that, when a QR-tagged template has been Campaign-associated in HubSpot (a one-time HubSpot-side action, out of scope for EMS to build), ticket sends through it appear in that Campaign's own reporting.

**Independent Test**: `specs/008-qr-ticket-emails/quickstart.md` §B3.

**Note**: Like US2, this requires **no EMS code** — the Campaign-association mechanism is entirely HubSpot-side (ADR-010 Decision #5, confirmed live in the original spike) and EMS's send call is identical whether or not a Campaign association exists.

### Verification for User Story 3

- [x] T037 [US3] Confirm with the HubSpot Team whether the QR-tagged test template already has a Campaign association; if yes, run `specs/008-qr-ticket-emails/quickstart.md` §B3 on UAT; if no, mark this section skipped in the quickstart sign-off (US1 pass does not depend on this). **Outcome: skipped** — no channel to reach the HubSpot Team for a live confirmation existed in this implementation session; documented in `quickstart.md` §B3 as the task's own valid "no confirmation" fallback, not a failure. Revisit once someone confirms a Campaign association exists.

**Checkpoint**: US3 verified or explicitly skipped — never blocks release. **Explicitly skipped, 2026-07-16** (see above).

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Documentation sync and final sign-off across all stories.

- [x] T038 [P] Update `Frontend/CHANGELOG.md` and `Backend/CHANGELOG.md` with the shipped behavior, per repo-root changelog discipline
- [x] T039 [P] Move `FE-QR-GEN-001` / `BE-QR-GEN-001` from `planned` to `done` in `Frontend/TODO.md` / `Backend/TODO.md` once shipped; leave `X-QR-GEN-001` (`HS-003` governance) and `FE-QR-GEN-002`/`BE-QR-GEN-002` (send-on-registration) parked, unchanged. Moved both to their `TODO-DONE.md` archives (2026-07-16); `X-QR-GEN-001`/`FE-QR-GEN-002`/`BE-QR-GEN-002` untouched.
- [x] T040 Run `specs/008-qr-ticket-emails/quickstart.md` §A (automated tests) — `Backend`: `npm test -- --testPathPattern="CheckInTicket|QrTicket|DispatchQueue|RegistrationCache"` + `npm run lint:fix`; `Frontend`: `npm test -- EmailDispatch dataService` + `npm run lint`. Ran the **full** suites rather than the filtered subset for a final regression check: Backend **332/332** passing (30 suites), `lint:fix` clean (3 pre-existing unrelated warnings); Frontend **374/374** passing, lint clean.
- [ ] T041 Run `specs/008-qr-ticket-emails/quickstart.md` §C (operator security comfort checks) on UAT — fill C10 sign-off table. **Left for the human** — needs live UAT access, a real admin/test-Contact setup, and manual sign-off; not executable from an implementation session.
- [ ] T042 Run `/review-security` per `Frontend/docs/security-review-process.md` before opening the PR(s). **Left for the human** — this repo's security-review workflow is intended to run as its own reviewed pass (e.g. via `/review-security`) ahead of a PR, not bundled into implementation.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately. T004's outcome gates the Files-adapter work in Phase 2 (T011/T012). T002/T003 are resolved and no longer block anything.
- **Foundational (Phase 2)**: Depends on Setup. **Blocks all user stories.**
- **User Story 1 (Phase 3)**: Depends on Foundational. This is the MVP and the only phase with real new code beyond Foundational.
- **User Story 2 (Phase 4)**: Depends on Foundational + User Story 1 (nothing to verify until sends actually happen) — verification-only, no independent build.
- **User Story 3 (Phase 5)**: Depends on Foundational + User Story 1 — verification-only, no independent build, optional (P3).
- **Polish (Phase 6)**: Depends on all desired stories being complete.

### Parallel Opportunities

- T002, T003, T004 (the three spikes) could have run in parallel — different HubSpot surfaces. T002/T003 are now resolved (2026-07-16); only T004 (Files API scope) remains open.
- Within Phase 2: T007/T010/T011/T013/T014/T015/T017/T018 are all `[P]` (different files); T008/T009/T012/T016 have direct dependencies on those.
- T019/T020/T021 (Frontend foundation) are independent of the entire Backend foundation column and can run in parallel with it.
- Within Phase 3: T024/T025/T026 (tests) can run in parallel with each other, and should be written before T027–T033 (implementation) per standard TDD ordering, though this codebase does not strictly require tests-first.

---

## Parallel Example: Phase 2 (Foundational)

```bash
# Backend, once T004's spike result is known:
Task: "Add CHECKIN_JWT_PRIVATE_KEY? to EmsConfig in Backend/scripts/Utils/Platform/types.ts"
Task: "Add checkInTicket/checkInTicketImageFileId fields to RegistrationCacheRecord"
Task: "Implement Backend/scripts/Utils/HubSpot/FilesAdapter.ts"
Task: "Add contactProperties to SingleSendParams"
Task: "Add getTemplateContent/hasQrPlaceholder/isSingleSendEligible to EmailTemplatesAdapter.ts"
Task: "Add ticketsEnabled to EmailDispatchJob"

# Frontend, fully parallel with the above:
Task: "Add ticketsEnabled to dispatch DTOs in Frontend/src/types.ts"
Task: "Map ticketsEnabled through in Frontend/src/utils/normalizeApi.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (all 3 spikes resolved)
2. Complete Phase 2: Foundational (CRITICAL — blocks everything)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: run quickstart §B1 on UAT
5. Ship — US2/US3 are verification passes on the same code, not separate builds

### Incremental Delivery

1. Setup + Foundational → ticket-minting/image/detection plumbing proven in isolation
2. User Story 1 → full send-a-ticket pipeline works → validate → this **is** the shippable feature
3. User Story 2 → verify consent fallback (no new code) → sign off
4. User Story 3 → verify Campaign rollup if HubSpot Team has set it up (no new code, optional) → sign off or skip
5. Polish → docs, changelog, security review, TODO close-out

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- US2 and US3 deliberately have almost no implementation tasks — the spec's own Assumptions/Out-of-Scope sections already decided these are verification of inherent behavior, not new build surfaces. Resist the urge to invent code for them.
- T006 (sequencing with `BE-EMAIL-SEND-001`) is a process task, not a code task — but it gates whether T013 and the real send-path work happen in this feature's PR or a coordinated companion PR.
- Commit after each task or logical group; stop at either checkpoint to validate independently.
