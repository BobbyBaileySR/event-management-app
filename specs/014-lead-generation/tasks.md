---
description: "Task list for HubSpot Lead Generation from Event Attendees (014-lead-generation)"
---

# Tasks: HubSpot Lead Generation from Event Attendees

**Input**: Design documents from `/specs/014-lead-generation/`

**Prerequisites**: [plan.md](./plan.md) · [spec.md](./spec.md) · [research.md](./research.md) · [data-model.md](./data-model.md) · [contracts/](./contracts/) · `010-attendee-detail-modal` and `013-registration-form-bridge` already shipped

**Tests**: Included — per the repo-root testing discipline (tests ship with every behaviour change on both sides).

**Organization**: Four user stories from spec.md. The core create/update/provenance mechanism (`LeadAdapter`) is genuinely one cohesive piece of logic — it can't be meaningfully split across US1/US2, since the provenance check *is* the create-vs-update decision. It lives in **Foundational**. **US1** exposes it via the single-attendee route/UI; **US2** is proven almost entirely by tests against that same route/adapter (no separate implementation); **US3** adds the bulk route; **US4** adds the optional cross-event-history content source.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story label (US1–US4)

## Path Conventions

- **Backend**: `Backend/scripts/`, `Backend/node/tests/`
- **Frontend**: `Frontend/src/`, `Frontend/docs/`

---

## Phase 1: Setup

**Purpose**: Confirm prerequisites and add the config surface the adapter needs, ahead of any HubSpot-side confirmation landing.

- [X] T001 Confirm `010-attendee-detail-modal` and `013-registration-form-bridge` (`RegistrationAnswerHistoryStore`) are deployed and passing, per `specs/014-lead-generation/quickstart.md` Prerequisites
- [X] T002 [P] Review all design artifacts in `specs/014-lead-generation/` (spec, plan, research, data-model, contracts, quickstart) and [ADR-018](../../docs/decisions/018-hubspot-lead-generation.md)
- [X] T003 [P] Add `HUBSPOT_LEAD_ASSOCIATION_TYPE_ID`, `HUBSPOT_LEAD_TYPE_VALUE`, `HUBSPOT_LEAD_LABEL_VALUE` to `EmsConfig` in `Backend/scripts/Utils/Platform/types.ts`, read via `Config.ts`'s `getConfig` — placeholder/blank values are acceptable in code until `HS-016`/`HS-017` confirm the real ones; the point is that nothing is ever hardcoded inline (plan.md Constraints). Also added `HUBSPOT_LEAD_NOTE_ASSOCIATION_TYPE_ID` (Note↔Lead association — a gap in ADR-018's own feasibility gates, same principle applied) and `LEAD_BATCH_CONFIRM_THRESHOLD` (research.md R-002).

**Checkpoint**: No open decisions remain before Foundational work starts.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: `LeadAdapter`'s create/update/provenance logic — every user story depends on this.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete. This is also the single most safety-critical phase in the feature — get the provenance check right here, not as an afterthought later.

- [X] T004 Implement the existing-Lead lookup (query the Contact's associated Lead(s) via the live HubSpot API) in `Backend/scripts/Utils/HubSpot/LeadAdapter.ts` — follows the existing adapter pattern (`CustomObjectAdapter.ts`); uses `HubSpotAssociationPort`'s generic `listAssociatedObjectIds`/`getObject`/`createObject`/`createAssociation` (the established generic-object seam CustomObjectAdapter/CatalogAdapter already use), not a new package
- [X] T005 Implement the provenance check in the same file — does a found Lead carry the `ems_lead_interest_summary` property (any value, including empty)? — depends on T004
- [X] T006 Implement the Lead creation path — `hs_lead_name`, fixed `hs_lead_type`/`hs_lead_label` from config, Contact association via the configured `associationTypeId`, `ems_lead_interest_summary` set once — depends on T003, T005
- [X] T007 Implement the update-via-Note path — log a HubSpot Note with the event's interest content + timestamp; never modify any Lead property — depends on T005
- [X] T008 Implement `createOrUpdateLead(contactId, eventId, options)` orchestrating T004-T007 per data-model.md's 4-step algorithm (no Lead → create; EMS-marked Lead → update via Note; unmarked Lead → leave alone + create new), sourcing default (this-event-only) interest content from `RegistrationAnswerHistoryStore.getHistory` (`013-registration-form-bridge`) — depends on T006, T007

### Foundation tests

- [X] T009 [P] Create `Backend/node/tests/LeadAdapter.test.ts` — create path (no existing Lead); update-via-Note path (existing EMS-marked Lead, property unchanged, new Note added); provenance-mismatch path (existing Lead without the marker → left completely untouched, a new separate Lead created); fixed `hs_lead_type`/`hs_lead_label`/`associationTypeId` applied from config regardless of interest content — depends on T004-T008. Verified by deliberately reintroducing the provenance bug and confirming the tests catch it (3 failures exactly where expected), then reverting.

**Checkpoint**: The adapter's create/update/provenance behavior is proven in isolation, by tests, before any route exposes it.

---

## Phase 3: User Story 1 — Generate a Lead for one attendee, with real context (Priority: P1) 🎯 Foundation-facing

**Goal**: A new route + UI action lets staff generate a Lead for a single attendee, carrying their registration-answer content (or an empty summary if none) onto it.

**Independent Test**: `specs/014-lead-generation/quickstart.md` §B1 — generate a Lead for an attendee with a recorded answer, confirm the content lands on the Lead.

### Tests for User Story 1

- [X] T010 [P] [US1] Create `Backend/node/tests/OnPostAttendeeLead.test.ts` — RBAC (`admin` only); an attendee with no recorded interest still gets a Lead (empty summary, not an error); `lead.generate` audit entry recorded with no interest text or attendee PII in metadata. Also caught and fixed a real bug while writing this: `AuditStore` keys entries by `requestId` alone, so the `includeFullHistory` read-audit and the `lead.generate` write-audit sharing one requestId silently clobbered each other — fixed by suffixing the read-audit's requestId (`OnPostAttendeeLead.ts`).

### Implementation for User Story 1

- [X] T011 [US1] Create `Backend/scripts/OnPostAttendeeLead.ts` — calls `LeadAdapter.createOrUpdateLead`, returns `{ outcome, leadId }` per `contracts/post-attendee-lead.md` — depends on T008
- [X] T012 [US1] Register `POST events/:eventId/attendees/:contactId/lead` in `Backend/scripts/Utils/Routes.ts`, `roles: ['admin']` — depends on T011
- [X] T013 [US1] Add the `lead.generate` audited action in `Backend/scripts/Utils/Audit.ts`, called from `OnPostAttendeeLead.ts` — depends on T011
- [X] T014 [P] [US1] Add `generateAttendeeLead(eventId, contactId, options)` to `Frontend/src/services/dataService.ts`
- [X] T015 [US1] Add a "Generate Lead" action to `Frontend/src/components/AttendeeDetailModal.tsx` — admin-only (already the modal's gate), success/failure toast — depends on T014
- [X] T016 [P] [US1] Document the new route in `Frontend/docs/api-contract.md` and `Frontend/docs/rbac.md`

**Checkpoint**: US1 fully functional and independently testable — quickstart §B1 passes. This alone delivers the feature's core value.

---

## Phase 4: User Story 2 — Generating again never creates a duplicate (Priority: P1)

**Goal**: Prove the safety properties `LeadAdapter` (Phase 2) already implements — no separate route or UI needed, this story is almost entirely test coverage against US1's route.

**Independent Test**: `specs/014-lead-generation/quickstart.md` §B2 — generate twice for the same attendee across two events (one Lead, two Notes, unchanged property); generate for an attendee with a pre-existing non-EMS Lead (that Lead untouched, a new separate one created).

### Tests for User Story 2

- [X] T017 [P] [US2] Extend `Backend/node/tests/OnPostAttendeeLead.test.ts` (or `LeadAdapter.test.ts` if more natural at that layer) — two generations for the same contact across two different events resolve to one Lead with two Notes and an unchanged `ems_lead_interest_summary`; a generation against a Contact with a pre-existing Lead lacking the EMS marker leaves that Lead byte-for-byte unchanged and produces `outcome: 'created_separate'` with a new Lead. Covered twice: exhaustively at the adapter layer (`LeadAdapter.test.ts`) and end-to-end through the real HTTP route + real (non-stub) `LeadAdapter` in `OnPostAttendeeLead.test.ts`, so a route↔adapter wiring mistake would also be caught.

**Checkpoint**: US1 + US2 both independently verified — the no-duplicate and no-clobber guarantees hold, proven by tests, not just by inspection of Phase 2's code.

---

## Phase 5: User Story 3 — Generate Leads for many attendees at once (Priority: P2)

**Goal**: A bulk route + UI action applies US1/US2's per-attendee behavior to a whole selection in one call, with a size-warning gate above a configured threshold.

**Independent Test**: `specs/014-lead-generation/quickstart.md` §B3 — bulk-generate for a selection including an attendee with no recorded interest, confirm every attendee gets a result.

### Tests for User Story 3

- [X] T018 [P] [US3] Create `Backend/node/tests/OnPostAttendeeLeadBatch.test.ts` — RBAC; `400 batch_confirmation_required` at/above the configured threshold without `batchConfirmed: true`; every `contactId` in the request gets exactly one result entry, none silently skipped; a mixed batch (some new, some updated, some `created_separate`) resolves correctly per-attendee; one attendee's HubSpot call failing reports `outcome: 'failed'` for that entry without aborting the rest of the batch. Also confirmed (and fixed) that the per-attendee audit rows need distinct requestIds too — same class of bug as T010's fix, one level deeper (N attendees in one request, not just 2 audit kinds).

### Implementation for User Story 3

- [X] T019 [US3] Reuse `Utils/DispatchValidation.ts`'s `assertLargeSendConfirmed`-shaped check with a **new**, separately-configurable threshold constant and a `batchConfirmed` request field (not `largeSendConfirmed`) — per research.md R-002, do not share `DISPATCH_CONFIRM_THRESHOLD`. Generalized `assertLargeSendConfirmed` itself with an optional message/code/error-class override (defaults unchanged for existing email-dispatch callers).
- [X] T020 [US3] Create `Backend/scripts/OnPostAttendeeLeadBatch.ts` — validates batch size/confirmation (T019), loops `contactIds` calling `LeadAdapter.createOrUpdateLead` per attendee, collects one result per attendee (never skips, catches per-attendee failures as `outcome: 'failed'` without aborting) — depends on T008, T019
- [X] T021 [US3] Register `POST events/:eventId/attendees/lead-batch` in `Utils/Routes.ts`, `roles: ['admin']` — depends on T020. Noted in a code comment: this literal path shape coincides with `attendees/:contactId` (GET/DELETE) — harmless since real HubSpot contact ids are always numeric, but documented for future maintainers.
- [X] T022 [P] [US3] Add `generateAttendeeLeadsBatch(eventId, contactIds, options)` to `dataService.ts` (added alongside T014 in Phase 3)
- [X] T023 [US3] Add a bulk "Generate Leads" action to the Attendee list's existing multi-select surface — large-batch confirmation dialog (reusing the existing dialog pattern's UI shape), per-row outcome summary — depends on T022. Added checkbox column + select-all + bulk action bar to `AttendeesView.tsx` (no prior multi-select existed); confirmation dialog via `useConfirm()` at `CONFIG.LEAD_BATCH_CONFIRM_THRESHOLD`; outcome summary via toast (counts by outcome + failed contactIds).
- [X] T024 [P] [US3] Document the batch route in `api-contract.md`/`rbac.md` (added alongside T016 in Phase 3)

**Checkpoint**: US1 + US2 + US3 independently functional — quickstart §B3 passes, including the no-skip and large-batch-confirmation guarantees.

---

## Phase 6: User Story 4 — Optionally bring in an attendee's full cross-event history (Priority: P3)

**Goal**: An opt-in flag sources a Lead's content from the attendee's entire registration-answer history, not just the current event — and that broader read is itself audited, per ADR-014's precedent.

**Independent Test**: `specs/014-lead-generation/quickstart.md` §B4 — generate with the expanded option for an attendee with multi-event history, confirm the content reflects more than the current event and a separate audited-read row appears.

### Tests for User Story 4

- [X] T025 [P] [US4] Extend `Backend/node/tests/OnPostAttendeeLead.test.ts`/`LeadAdapter.test.ts` — `includeFullHistory: true` sources content from the Contact's full cross-event history, not just the current event's; a separate `attendee.registration_history.view_all` audit entry is recorded, distinct from `lead.generate`. Built alongside T004-T013/T017-T018 from the start rather than as an afterthought — covered at the adapter level (cross-event content sourcing) and both route levels (single + batch audit entries).

### Implementation for User Story 4

- [X] T026 [US4] Extend `LeadAdapter.createOrUpdateLead` (or its caller) to accept `includeFullHistory` and source content accordingly — depends on T008. Implemented via a live Contact→Event association query (`listAssociatedObjectIds`) + `RegistrationAnswerHistoryStore.getHistory` per discovered event, matching this adapter's existing-lead-lookup's own live-query philosophy.
- [X] T027 [US4] Add the `attendee.registration_history.view_all` audited action in `Utils/Audit.ts`, called when `includeFullHistory` is used — reuses ADR-014's audited-read pattern, not a new mechanism — depends on T026
- [X] T028 [P] [US4] Add the expanded-history checkbox to the Generate Lead UI (single and bulk), passed through to both `dataService` methods — depends on T014, T022

**Checkpoint**: All four user stories independently functional — the full feature is complete.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, sign-off.

- [X] T029 [P] Update `Backend/CHANGELOG.md` and `Frontend/CHANGELOG.md` with the shipped behaviour once Phases 2-6 land
- [X] T030 [P] Move `FE-LEAD-001`/`002`, `BE-LEAD-001`/`002` from `planned` to `done` in `Backend/TODO.md`/`Frontend/TODO.md` — set to `done-pending-QA` (matching this repo's established convention for code-complete-but-not-yet-UAT-signed-off items, e.g. `X-REGFORM-001`), since quickstart.md §C and the `HS-015`/`016`/`017`/`018` HubSpot confirmations are still outstanding
- [X] T031 Run `specs/014-lead-generation/quickstart.md` §A (automated tests) — Backend: full suite 485/485 passing (46 suites) + `npm run lint:fix` clean; Frontend: full suite 533/533 passing (61 files) + `npm run build` (`tsc --noEmit` + `vite build`) clean
- [ ] T032 **Parked — blocked on live HubSpot/UAT.** Run `specs/014-lead-generation/quickstart.md` §C (operator security comfort checks) on UAT once `HS-015`/`016`/`017`/`018` are confirmed — fill the C10 sign-off table, with **particular attention to C7.1** (EMS never modifies a Lead it didn't create) — this is the feature's core safety guarantee, not a routine check. Tracked in `TODO.md`'s `X-LEAD-001` row.
- [ ] T033 **Parked — do when a PR is actually opened.** Request a **specific look at the provenance check and the new HubSpot write path** as part of the general `/review-security` pass before opening the PR(s) — called out by name per this plan's Constitution Check, given this is the first EMS write that creates a brand-new HubSpot CRM record

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup (T003's config surface). **Blocks all four user stories.**
- **User Story 1 (Phase 3)**: Depends on Foundational.
- **User Story 2 (Phase 4)**: Depends on Foundational **and** US1 (Phase 3) — its tests exercise US1's route, since no separate implementation exists for this story.
- **User Story 3 (Phase 5)**: Depends on Foundational only — new, standalone route/files, independent of US1/US2 beyond sharing the same adapter.
- **User Story 4 (Phase 6)**: Depends on Foundational, and touches both US1's and US3's UI (T028) — build last, after both routes exist.
- **Polish (Phase 7)**: Depends on all four user stories being complete.

### Parallel Opportunities

- Within Phase 2: T004 → T005 → T006/T007 (T006 and T007 can proceed in parallel once T005 lands, different concerns within the same file) → T008 depends on both. T009 depends on all of T004-T008.
- **US3 (Phase 5) has no file overlap with US1 (Phase 3)** beyond the shared `LeadAdapter` — two developers could build the single-attendee and bulk routes concurrently once Foundational ships. US2 (Phase 4) is test-only against US1's route, so it's best done by whoever finishes US1, immediately after.
- Within Phase 3: T014 (Frontend `dataService`) is `[P]` relative to T011-T013 (Backend route/audit).
- Within Phase 5: T022 (Frontend `dataService`) is `[P]` relative to T019-T021 (Backend batch route).

---

## Parallel Example: Phases 3 and 5 together (two developers)

```bash
# Developer A — User Story 1 (single-attendee), once Foundational has shipped:
Task: "Create Backend/scripts/OnPostAttendeeLead.ts calling LeadAdapter.createOrUpdateLead"
Task: "Register POST events/:eventId/attendees/:contactId/lead in Utils/Routes.ts"
Task: "Add Generate Lead action to AttendeeDetailModal.tsx"

# Developer B — User Story 3 (bulk), fully parallel with the above:
Task: "Reuse assertLargeSendConfirmed-shaped check with a new threshold for bulk lead generation"
Task: "Create Backend/scripts/OnPostAttendeeLeadBatch.ts"
Task: "Add bulk Generate Leads action + confirmation dialog to the Attendee list"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — the provenance check lives here, get it right before anything else)
3. Complete Phase 3: User Story 1 — validate quickstart §B1
4. **STOP and VALIDATE**: confirm Lead creation carries real content, and that the provenance/update mechanism (Phase 2) behaves correctly even though US2 hasn't added its dedicated tests yet
5. Do not consider this feature safe to ship without US2's tests (Phase 4) actually proving the no-clobber guarantee, even though US1 alone is technically usable.

### Incremental Delivery

1. Setup + Foundational → adapter proven in isolation (T009).
2. User Story 1 → single-attendee flow works end-to-end → validate independently.
3. User Story 2 → the safety guarantees are explicitly proven, not just implied → this is the point the feature is actually safe to trust.
4. User Story 3 → bulk, for scale.
5. User Story 4 → the cross-event-history enhancement, last since it's the lowest priority and touches both prior UIs.
6. Ship Phase 7 (tests, docs, sign-off) once all four are complete — and not before `HS-015`/`016`/`017` land for a real Live deploy, per quickstart.md §C1.3.

### Parallel Team Strategy

With two developers: both complete Setup + Foundational together, then Developer A takes US1 → US2's tests, while Developer B takes US3 in parallel (no file overlap) — US4 last, by whoever finishes first, since it touches both.

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Unlike `013`, **US2 generates zero new implementation tasks** — its entire value is proving, via dedicated tests, that Phase 2's adapter logic actually holds the safety properties it's supposed to. Do not skip Phase 4 thinking "the code's already there" — the code being there is not the same as it being *proven* correct.
- T005's provenance check is the single highest-stakes piece of logic in this entire feature — a bug there means EMS could silently modify a salesperson's own CRM work. Treat its test coverage (T009, T017) as non-negotiable, not routine.
- Commit after each task or logical group; stop at any checkpoint to validate independently — US1/US2/US3/US4 can genuinely ship incrementally, unlike `011`'s all-or-nothing four legs.
