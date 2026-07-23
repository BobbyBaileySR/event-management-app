# Frontend TODO — Adaptavist EMS

Parked work, optional hardening, and deferred decisions for the static EMS UI.

**Not a defect list.** Items here were skipped, scheduled for a later phase, or blocked on external setup.

**HubSpot portal work** (forms, workflows, schema, owners — not EMS code) tracks separately in [docs/hubspot-ops-todo.md](docs/hubspot-ops-todo.md). `X-*` rows below that need HubSpot-side configuration cross-reference an `HS-*` row there.

**AI agents:** When the user skips or defers work, add an entry here (see `../.cursor/rules/ems-todo-discipline.mdc`).

> **Last updated:** 2026-07-22 (HubSpot + EMS travel form hybrid story drafted — `X-TRAVEL-001`, [story/hubspot-plus-ems-travel-form.md](../story/hubspot-plus-ems-travel-form.md); previously same-day `improve-codebase-architecture` review follow-through — candidates 6/7/8 shipped in part or full (`FE-ARCH-009`/`010`, `TODO-DONE.md`); remaining scope for candidates 4, 6, 7, 9 parked (`FE-ARCH-004`/`011`, `FE-TECH-007` updated)); previously 2026-07-21 (live event conversation notes — `015-conversation-notes` Phases 2/4/5/6/7 shipped: `ConversationNotesPanel.tsx` Notes section in the Attendee Detail modal, `dataService.ts` notes CRUD methods — `FE-NOTES-001` → done-pending-QA; US1 was already built in a separate session); previously same-day (live event conversation notes design settled via grill-with-docs — see new section below and [ADR-019](docs/decisions/019-live-event-conversation-notes.md); `X-NOTES-001` cross-cutting row added); previously same-day (HubSpot Lead generation design settled via grill-with-docs — see section below and [ADR-018](docs/decisions/018-hubspot-lead-generation.md); `X-LEAD-001` cross-cutting row added); previously same-week (registration-form bridge design settled via grill-with-docs — see section below and [ADR-017](docs/decisions/017-registration-slots-and-answer-history.md); `X-REGFORM-001` cross-cutting row added); previously same-day (data caching layer, slice `012-data-caching-layer`, shipped pending UAT/operator QA — `FE-PERF-001` → done-pending-QA, `FE-ARCH-006` re-scoped, `FE-PERF-002` still parked); previously 2026-07-19 (design settled via grill-with-docs — ADR-015/016); previously 2026-07-17 (Attendee Detail modal design settled via grill-with-docs — `X-ATTENDEE-DETAIL-001`, ADR-014; QR ticket email design note parked; undo check-in UI; label IDs `291`/`293`; Google OAuth origins; chart.js + Celebration Params)

---

## Remaining roadmap — after the redesign week

Forward-looking summary (added 2026-07-12). **Next week's planned work (2026-07 W3):**

1. **Redesign Phase A** — ✅ fully done 2026-07-13. **Phase B is substantially shipped:** feasibility gates cleared, event-first routing/custom objects/Programs & Events shipped, and legacy Program-scoped routes retired. Remaining Phase B work is tracked in the detailed redesign rows below.
2. **HubSpot UAT** — ✅ **All `X-REDESIGN-001` feasibility gates cleared 2026-07-14** (admin access granted; objects `2-65757052`/`2-65757130`, all properties, all 4 association type IDs `286`–`289`, 2 labels `290`/`292`, scopes, and the workflow-association test all confirmed directly — see [docs/hubspot-schema.md](docs/hubspot-schema.md)). ✅ **Label-ID directionality, UAT Parameters, and the `CustomObjectAdapter` implementation (`X-REDESIGN-002`/`X-REDESIGN-007`) are all done as of 2026-07-16** — only Prod Parameter values remain (ops task before Prod cutover).
3. **Redesign Phase B** — event-first IA/routing, standalone Events, registration-as-association, live capacity ±1, Campaign modal + copy fixes (`FE-REDESIGN-001/002/004`; `X-REDESIGN-003/005/006`). **Programs & Events IA (FE-REDESIGN-022 / T075–T082) done 2026-07-14.**
4. **Full E2E testing** of **Slice 004** (capacity — `X-009` / `FE-CAP-001`) and **Slice 005** (email dispatch) once the redesign lands. Also verifies the **walk-in path** (`X-008`), since feasibility gate #2 confirms workflow-written registrations.
5. **Production API proxy** — ✅ confirmed **not needed** 2026-07-16. The `route` query-parameter transport avoids the custom-header preflight problem and deployed-origin CORS was verified (`FE-OPS-002` / `FE-INFRA-001`).

**Roadmap remaining after that week:**

| Item | Ref | Notes |
| :--- | :--- | :--- |
| **Slice 009** — audit log operator UX | `X-SLICE007-001`, `FE-SLICE007-002` | TODO IDs retain `SLICE007` for continuity. **2026-07-17: true paging + filter bar/Apply/Clear done** (`FE-SLICE007-001` — see `TODO-DONE.md`). Remaining: readable Resource column (`FE-SLICE007-002`). |
| **Slice 1.5 Tier B** — enterprise ops | B1–B9 (`FE-SLICE15-003/004`, `FE-OPS-004`) | Audit export, operator role UI gating, Cloudflare **Access**, retention/session hardening (backend), monitoring, pen test, runbooks. |
| **Later product APIs** | `BE-PROD-002`, `BE-PROD-001` | Event read APIs + analytics — backend-led, surfaced later in UI. |
| **Optional / parked polish** | `FE-TECH-007`, `FE-REDESIGN-008` | Data-seam reshape (31 endpoints → feature adapters), campaign drafts. |
| **Standing disciplines** | `X-003`, `X-005`, `FE-TEST-005` | api-contract/RBAC sync + per-view/service tests — ongoing, never "done". |

---

## Slice 1 — close-out (blocked on external)

Code and automated tests are **complete**. Only these gates remain before full Slice 1 sign-off:

| ID | Item | Blocked on | Pairs |
| :--- | :--- | :--- | :--- |
| **X-008** / **FE-SLICE1-009** / **BE-SLICE1-008** | Walk-in form **B5c** — Attendees row + checked-in after HubSpot submit | Events/HubSpot team (form workflow config) | `003` quickstart **B5c** |
| **X-009** / **FE-CAP-001** / **BE-CAP-001** | Capacity manual QA + SFTP deploy + live smoke | **2026-07-16: infra gate (FE-INFRA-003/BE-INFRA-003) now done** — confirm with user whether this is ready to schedule | `004` quickstart **T043–T044** |

Everything else in Slice 1 is shipped or explicitly parked below. **Slice 1.5 Tier A** is complete (see [specs/slice-1.5-tier-a/signoff-checklist.md](specs/slice-1.5-tier-a/signoff-checklist.md)). **Tier B** is next when prioritised.

## How to use

| Status | Meaning |
| :--- | :--- |
| `parked` | Explicitly skipped for now — may revisit |
| `planned` | Intends to do; not started |
| `blocked` | Waiting on access, decision, or other decision |
| `in progress` | Partially complete — see Notes for remainder |
| `done` | Completed — move to CHANGELOG and **Done (archive)** |

**Also affects:** note `../Backend/` when ScriptRunner or Parameters must change too.

**Delivery model:** [project-blueprint.md](project-blueprint.md) §12 + [ADR-004](docs/decisions/004-vertical-slice-delivery.md) — **vertical slices**, not horizontal phases. **Slice 1** = catalog + attendees + check-in ([ADR-003](docs/decisions/003-phase1-attendees-checkin.md)). **Slice 1.5** = post–Slice 1 Live audit-ready hardening (Tier A + B below). **`TODO.md` is for deferrals, optional polish, and Foundation gates** — not a duplicate of the blueprint.

---

## Slice 1.5 — audit-ready hardening (post–Slice 1 Live)

Security review 2026-07-07: Slice 1 is appropriate for a **trusted internal admin team** Live today. **Slice 1.5** closes gaps toward an **audit-defensible** (Tier A) and **enterprise ops** (Tier B) posture — not SOC2/ISO (that remains a separate compliance program).

Mirror in [../Backend/TODO.md](../Backend/TODO.md).

### Tier A — audit-defensible (~1–2 weeks engineering)

Enough for InfoSec / leadership sign-off with queryable evidence (“who viewed PII, who checked in whom, who changed config”).

| Step | Gate | TODO IDs | Owner | Status |
| :---: | :--- | :--- | :---: | :---: |
| A1 | **Registrant eligibility on check-in confirm** (server-side) | BE-SLICE15-001 | Backend | ✅ |
| A2 | **PII read audit** (`GET attendees`; optional scan summary) | BE-SLICE15-002 | Backend | ✅ |
| A3 | **Program ↔ event validation** on all slice routes | BE-SLICE15-003 | Backend | ✅ |
| A4 | **Rate limit `GET attendees`** | BE-SLICE15-004 | Backend | ✅ |
| A5 | **Field-level catalog PATCH audit** (before/after) | BE-SLICE15-005 | Backend | ✅ |
| A6 | **CI security review on PRs** | FE-SEC-002, BE-SEC-002 | Both | ✅ |
| A7 | **Disable production source maps** | FE-SLICE15-001 | Frontend | ✅ |
| A8 | **Audit API + minimal viewer** | BE-SLICE15-006, FE-SLICE15-002 | Both | ✅ |
| A9 | **Tier A sign-off checklist** (quickstart / ops doc) | X-SLICE15-001 | Both | ✅ |

| ID | Item | Status | Slice | Also affects | Notes |
| :--- | :--- | :---: | :--- | :--- | :--- |

### Tier B — enterprise ops (~4–8 weeks engineering + ops)

Vendor questionnaires, wider staff access, and operational evidence — still not formal SOC2/ISO.

| Step | Gate | TODO IDs | Owner | Status |
| :---: | :--- | :--- | :---: | :---: |
| B1 | **Audit retention + purge** (`AUDIT_RETENTION_DAYS`) | BE-SLICE15-007 | Backend | ⬜ |
| B2 | **Audit export** (CSV/JSON from UI) | FE-SLICE15-003 | Frontend | ⬜ |
| B3 | **Session lifecycle hardening** (revoke-all, optional IP bind) | BE-SLICE15-008 | Both | ⬜ |
| B4 | **Cloudflare Access** (edge auth before HTML) | FE-OPS-004, X-002 | Both | ⬜ |
| B5 | **`check-in operator` role** (least privilege) | BE-SLICE15-009, FE-SLICE15-004 | Both | ⬜ |
| B6 | **Walk-in audit gap** — document HubSpot-only writes | BE-SLICE15-010 | Both | ⬜ |
| B7 | **Security monitoring & alerting** | BE-SLICE15-011 | Both | ⬜ |
| B8 | **External pen test / security review** | X-SLICE15-002 | Both | ⬜ |
| B9 | **Ops runbooks** (access review, incident response, Parameters) | X-SLICE15-003 | Both | ⬜ |

| ID | Item | Status | Slice | Also affects | Notes |
| :--- | :--- | :---: | :--- | :--- | :--- |
| FE-SLICE15-003 | **Audit export** (CSV/JSON download from viewer) | planned | 1.5B | Backend | Tier A: ops use `DumpAuditEntries.ts`. Tier B: self-service export from **FE-SLICE15-002**. |
| FE-SLICE15-004 | **UI role gating for `check-in operator`** | planned | 1.5B | Backend | Hide Programs & Events write controls and Audit; allow Event Details, Registered Attendees, and Check-in for the working Event. Pairs **BE-SLICE15-009**. |

---

## Foundation gates — before Slice 1

Historical one-time security + tooling gates completed before the first slice shipped live data/writes. EMS now has no mock-data mode.

Cross-folder checklist — mirror in [../Backend/TODO.md](../Backend/TODO.md).

| Step | Gate | TODO IDs | Owner | Status |
| :---: | :--- | :--- | :---: | :---: |
| 1 | **Version control** — confirm Frontend repo + Backend git | X-001, FE-SEC-001, BE-SEC-001 | Both | ✅ |
| 2 | **CI security review** — Bugbot / security-review on PRs or pre-merge | FE-SEC-002, BE-SEC-002 | Both | ✅ |
| 3 | **CI dependency audit** | FE-SEC-003, BE-SEC-003 | Both | ✅ |
| 4 | **CSP `img-src`** — narrow from `https:` before real HubSpot/asset URLs render | FE-SEC-004 | Frontend | ✅ |
| 5 | **ESLint XSS gate** — ban `dangerouslySetInnerHTML` in `src/` | FE-SEC-007 | Frontend | ✅ |
| 6 | **Backend SFTP deploy** — Phase 0 auth scripts live on ScriptRunner | BE-DEPLOY-001 | Backend | ✅ |
| 7 | **Live auth E2E** — `USE_MOCK_AUTH: false`; sign-in + session | BE-OPS-003 | Both | ✅ |
| 8 | **Contract sync** — `docs/api-contract.md` + `docs/rbac.md` per new Phase 1 route | X-003 | Both | ✅ |
| 9 | **Automated test CI** — Frontend `npm test` + build; Backend `npm test` + `tsc --noEmit` | FE-TEST-004, BE-TEST-003 | Both | ✅ |
| 10 | **Validate the test suite** — negative spot-checks + CI red/green proof per [docs/testing-validation.md](docs/testing-validation.md) | FE-TEST-006 | Both | ✅ |

---

## Security & enforcement (pre–Phase 1)

| ID | Item | Status | Phase | Also affects | Notes |
| :--- | :--- | :---: | :--- | :--- | :--- |
| FE-SEC-002 | **PR security review process** (manual fallback — Bugbot not approved) | done | Slice 1.5 | Backend | **Foundation step 2** · **Slice 1.5 Tier A step A6.** PR template + [docs/security-review-process.md](docs/security-review-process.md); author runs `/review-security` before PR; human approval + CI on `main`. **FE-SEC-002B** (optional): enable Cursor Bugbot on GitHub if approved later. |
| FE-SEC-006 | **SRI on Google Identity Services script** | parked | N/A | — | **Known trade-off:** GIS loader does not support SRI cleanly; document-only unless Google documents a hash. |

---

## Auth, hosting & local dev

| ID | Item | Status | Phase | Also affects | Notes |
| :--- | :--- | :---: | :--- | :--- | :--- |
| FE-OPS-002 | **Production API proxy** (Cloudflare Worker or equivalent) | **not needed** | Production | Backend | Root cause was ScriptRunner Connect's **OPTIONS preflight bug** on direct browser calls — worked around 2026-07-13 by moving the logical route to a `route` query param (`Router.ts`/`client.ts`), sidestepping the preflight entirely. **2026-07-16: confirmed unnecessary** — live authenticated calls from the deployed Pages origin (`https://bobbybaileysr.github.io`) return correct scoped CORS headers (`BE-CORS-001`), no proxy required. Pairs **FE-INFRA-001**. |
| FE-OPS-003 | **`gsi/button` 403 on first load** (Google Sign-In button iframe) | parked | Optional | — | Harmless noise when origin is registered; sign-in still works. Revisit only if UX impact. |
| FE-OPS-004 | **Cloudflare Access** — edge auth before HTML is served | planned | Slice 1.5B | Backend | **Slice 1.5 Tier B step B4** (was Phase 6). Complements Bearer session; does not replace ScriptRunner auth. ADR: [docs/decisions/002-zero-budget-hosting.md](docs/decisions/002-zero-budget-hosting.md). |

---

## Infrastructure (UAT / Live)

| ID | Item | Status | Phase | Also affects | Notes |
| :--- | :--- | :---: | :--- | :--- | :--- |
| FE-INFRA-001 | **Deployed UAT/Live API proxy** — Cloudflare Pages Function or Worker for `/api/ems` | **not needed** | Before staff use deployed URLs for HubSpot | Backend | Plain github.io cannot proxy API, but turns out it doesn't need to — direct browser calls to ScriptRunner Connect work via the `route` query-param workaround, and **2026-07-16** live CORS verification (`BE-CORS-001`) confirmed the deployed origin gets correctly scoped headers with no proxy in front. |
| FE-INFRA-002 | **UAT GitHub repo one-time setup** — `event-management-app-uat`, Pages from `gh-pages`, `UAT_PAGES_DEPLOY_TOKEN` secret | **done 2026-07-16** | UAT | — | UAT GitHub Pages site confirmed live by user. |
| FE-INFRA-003 | **ScriptRunner UAT environment** — Staging HubSpot connector, UAT listener, Parameters | **done 2026-07-16** | UAT | Backend | UAT ScriptRunner environment confirmed set up by user. **May unblock `X-009`/`FE-CAP-001`/`BE-CAP-001`** — that item's "blocked on HubSpot UAT access" gate named this exact row; confirm with user whether live capacity QA can now be scheduled. |

---

## Code quality & polish (optional — no blueprint phase)

| ID | Item | Status | Phase | Also affects | Notes |
| :--- | :--- | :---: | :--- | :--- | :--- |
| FE-TECH-005 | **Audit display: surface previous/new values when backend adds them** | planned | Slice 1.5 | Backend | **→ FE-SLICE15-002** (viewer) + **BE-SLICE15-005** (field-level PATCH audit). Surface `metadata.previous` / `metadata.next` in audit viewer when present. |
| FE-TECH-007 | **Reshape the data seam: group endpoints → feature adapters** | parked | Optional | — | Architecture review 2026-07-11 (report item #4) / 2026-07-15 (candidate 5). **Largely addressed 2026-07-15:** mock data dropped (`mockData.ts` + `withMockFallback` removed), caller-less legacy methods deleted (candidate 1), and every method now calls `apiRequest` + normalizes directly. **2026-07-22 (this session's candidate 6, "collapse dataService's tripled surface"):** further reduced — a generic `bindOptions` helper replaced 28 of 34 hand-typed `createDataService` factory wrappers, the 2 dead `@deprecated` forwarders were deleted, `updateEmailDispatch`'s fake-list-envelope hack is gone, and the attendees-query type is declared once and re-exported by `queryKeys.ts` instead of a third copy (`FE-ARCH-009`, `TODO-DONE.md`). **Remaining (optional, two alternative framings — pick one before implementing, don't do both):** (a) this row's original "feature ports" grouping (Catalog/Attendee/CheckIn/Email adapters), or (b) the review's "one route→normalizer descriptor table" — collapsing each free function's own route+normalize declaration into a data-driven table, which the free-function layer (now the single canonical declaration per route) would need rewritten along with the 447-line `dataService.test.ts` that exercises them directly with explicit tokens. Low priority either way — the shallow-seam pain the review originally flagged is substantially gone. |
| FE-PERF-001 | **Data caching layer — slice `012-data-caching-layer`** | **done-pending-QA** | 012 | Backend | **2026-07-19: design settled via grill-with-docs** — see [ADR-015](docs/decisions/015-client-data-caching-layer.md) (TanStack Query behind `useDataService`; freshness: catalog 5 min / capacity 30 s / attendees + audit always-refetch; `QueryClient.clear()` on token change; central query-key factory + mutation→invalidation map; **big-bang** migration of all six data views) and [ADR-016](docs/decisions/016-no-prefetch-of-audited-pii.md) (prefetch only non-PII catalog/capacity — never audited `attendees.list`/audit reads; enforced via a `prefetch.ts` module that exposes no PII functions). Seeding brief: [specs/data-loading-and-caching-grilling-brief.md](specs/data-loading-and-caching-grilling-brief.md). **2026-07-20: all implementation/test tasks (T001–T037) shipped** — see [specs/012-data-caching-layer/tasks.md](specs/012-data-caching-layer/tasks.md) for the full task list and [quickstart.md](specs/012-data-caching-layer/quickstart.md) for the sign-off gates. §A (automated suites) green in both repos; §B (manual QA) verified locally as far as a local environment allows — remaining §B items and all of §C (operator security comfort checks) need the UAT deploy (T038–T040). `OverviewView`'s migration onto the bulk `events/capacity-summary` route (T019) supersedes the FE-REDESIGN-021 keep-the-fan-out decision (`Frontend/TODO-DONE.md`) — Overview no longer fans out per-event capacity calls, matching EventsView. Paired **BE-PERF-001** (`events/capacity-summary` bulk route) shipped and contract-synced. **FE-ARCH-006** re-scoped accordingly (see its row). Deferred rider **FE-PERF-002** stays parked. |
| FE-PERF-002 | **Optimistic updates for check-in** (instant row flip + server reconcile) | parked | Optional | Backend | Deferred from the 2026-07-19 data-caching grilling (ADR-015 §Deferred) to keep slice 012's risk bounded. Design notes to carry: rollback UX on server failure (toast + revert), double-tap/race protection on the confirm button, capacity-counter drift between optimistic flip and reconcile, and the perception issue that the UI briefly asserts "checked in" before the audited server event exists (server-side audit still only writes on the real request, so the trail stays truthful either way). Revisit only after 012 ships — post-cache, check-in is one mutation round trip and may already feel fast enough. |
| FE-ARCH-006 | **Shared async-resource + pagination hooks (review candidate 6, remainder)** | parked | Optional | — | 2026-07-15: `useDebouncedValue` shipped and adopted at all 3 search sites. **2026-07-20 re-scope (post slice `012`):** the `loading → error → empty → data` + `reloadKey` retry ladder this row tracked is now **subsumed** — `AttendeesView`, `EventsView`, `EventHubView`, `OverviewView`, and `AuditView` all read via `src/data/hooks` (`useQuery` + `describeQueryStatus`/`RefetchFailureBanner`), so there is no hand-rolled ladder left to extract `useAsyncResource` from. **Remaining scope for this row:** only the page/pageSize/total paginator duplicated across `AttendeesView`/`AuditView`/`EmailDispatchView` detail — a `usePaginatedResource` extraction, unrelated to data fetching/caching. Still design-sensitive enough to run through `/grilling` before implementing. |
| FE-ARCH-007 | **Shared popover-shell hook (review candidate 7, remainder)** | parked | Optional | — | 2026-07-15: `CatalogPickerSelect` collapsed into `SelectPicker` (a11y fix). **Remaining:** `SelectPicker`, `CalendarPicker`, and `WorkingEventPicker` each re-implement the open/outside-click/Escape/focus-return popover shell. Extract a `usePopoverShell` hook they share. Lower ROI — each picker's in-popover interaction (listbox vs calendar grid vs event list) differs, so only the open/dismiss/focus plumbing is common. |
| FE-ARCH-004 | **Check-in workflow module (review candidate 4/7, remainder)** | parked | Optional | — | 2026-07-15: shared attendee-mutation error mapping extracted (`attendeeMutationErrors.ts`), fixing the undo drift between `CheckInView` and `AttendeesView`. **2026-07-22 (candidate 7):** the undo-check-in *orchestration* itself (confirm → call → toast → invalidate) is now also unified — see `FE-ARCH-010` (`TODO-DONE.md`), a new shared `useUndoCheckIn` hook. **Still remaining, explicitly deferred pending `/grilling`:** `CheckInView` still reads its roster into local `useState`/`useEffect` rather than the shared `useAttendees` cache hook `AttendeesView` uses — candidate 7's fuller "one owner for post-mutation refresh" vision wants that migrated too, so the confirm-check-in mutation's `invalidateAfterAttendeeMutation` call actually refreshes a query CheckInView itself is subscribed to (today it only helps `AttendeesView` if the operator later navigates there). This is a live, real-time desk workflow — losing the instant optimistic UI update or getting refresh timing wrong would be a real regression, not just cleanup, hence still gated on a design pass first. Also still open: `CheckInView` (642 ln) holds four independent seams (capacity, server-search, QR scan, walk-in) in one flat scope; extract a `useCheckInWorkflow` hook (mirroring `useEmailDispatchWorkflow`) and split scanner/walk-in/confirm into sibling components instead of the `activeModal` 3-way ternary. |
| FE-ARCH-011 | **Split the `types.ts` god-module (architecture review candidate 9)** | parked | Optional | — | 2026-07-22: not yet attempted. `src/types.ts` (676 lines) mixes ~7 unrelated domains (auth/session, catalog, email dispatch, capacity, lead gen, user prefs, audit) in one file that everything imports (`dataService`, `normalizeApi`, every view, every hook) — its blast radius is the whole app. It also carries confirmed-dead mock-era shapes (`Event`, `Attendee`, `EmailTemplate`, `ScheduledEmail`, `AgendaSession`, `ActivityItem`, `EventsResponse`/`EventResponse`, `EmailPreviewPayload`/`EmailSendPayload` — residue from `USE_MOCK_API`'s 2026-07-15 removal) and field-identical near-dup pairs (`CatalogEvent`/`CatalogEventRecord`, `CatalogProgram`/`CatalogProgramRecord`). **Proposed approach (lowest risk first):** (1) grep-confirm each suspected-dead shape has zero live references, then delete; (2) move each domain's remaining types beside its module (`email/types.ts`, `catalog/types.ts`, `attendees/types.ts`, …), keeping only genuinely shared shapes (session, wire envelope) central. Not started — no code changed, no tests affected. |
| FE-TECH-008 | **`improve-codebase-architecture` grilling loop no longer captures domain model inline** | parked | Optional | — | 2026-07-12: swapped the locally-authored `grilling` skill for the [upstream original](https://github.com/mattpocock/skills/tree/main/skills/productivity/grilling), which is a pure interview and does **not** weave in `domain-modeling` (ADR/glossary capture) or the `codebase-design` vocabulary. `grill-with-docs` is unaffected (it separately says "using the `/domain-modeling` skill"), but `improve-codebase-architecture` step 3 leaned on grilling to keep the domain model current inline. Decide whether to (a) add an explicit `/domain-modeling` step to `improve-codebase-architecture`, or (b) accept the gap. No code impact; skills invoke `/grilling` by name so nothing is broken. |

---

## Testing

Standing requirement: new views/services ship with tests (`FE-TEST-005`). **54 test files / 475 tests** run in CI today (latest recorded full-suite run, 2026-07-19). Coverage (`FE-TEST-007`): **81.15% statements**.

| ID | Item | Status | Phase | Also affects | Notes |
| :--- | :--- | :---: | :--- | :--- | :--- |
| FE-TEST-005 | **Per-view / per-service tests as new UI + data are added** | planned | Phase 1+ | Backend | **Standing requirement.** Park here only if explicitly deferred. **2026-07-19:** closed the 6 remaining untested views/components (`LoginView`, `ViewRouter`, `ConfirmModal`, `EmptyState`, `StatusBadge`, `WorkingEventPicker`) — the auth-testing blocker on `LoginView` resolved via mocking `authService` rather than driving real Google Sign-In (see `FE-TEST-007`). Also closed 2 files the new coverage report flagged at 0%: `services/authService.ts` (the real, unmocked exchange/logout/GIS logic) and `constants/hubspot.ts` (pure helper functions). |
| FE-TEST-007 | **Coverage reporting** — `vite.config.ts` `test.coverage` (v8 provider, html/lcov output) | **done 2026-07-19** | Optional | Backend | Always-on (`enabled: true`) — every `npm test` run now prints a real statement/branch/function/line % (77.46% baseline before this session's new tests, 81.65% after). Unlike Backend (`BE-TEST-007`), Vitest's v8 coverage works cleanly here — no ESM/source-map caveat. No enforced threshold yet — visibility only. **`state/catalogContext.tsx`, flagged at 0% coverage as dead code (nothing in `src/` imported it), deleted 2026-07-19.** Also fixed while verifying: `test.coverage.reporter` in `vite.config.ts` cannot use `as const` on the array (produces a readonly tuple TS won't accept where Vitest expects a mutable array — broke `tsc --noEmit`/`npm run build` silently, since `npm test` alone doesn't full-typecheck test/config files). |
| FE-TEST-008 | **Fixed a real, reproducible flaky test** — `OverviewView.test.tsx`'s mocked `useDataService()` returned a brand-new object literal on every call | **done 2026-07-19** | N/A | — | Root cause: `OverviewView`'s data-loading effect lists `data` (the return of `useDataService()`) in its dependency array; the real hook memoizes that return value (stable reference unless the session token changes), but this file's mock built a fresh object (with fresh inline `vi.fn()`s) on every invocation — every other test file in the repo already used a stable outer-scoped `mockDataService` object. An unstable reference made the effect re-fire on every re-render it caused, occasionally re-fetching and overwriting `stats` with a later (default) mock value after an assertion had already observed the first one. Fixed by hoisting the mock to a stable `mockDataService` object, matching the established pattern. 15/15 full-suite runs clean after the fix (previously ~2 failures per 9 runs, in `OverviewView.test.tsx` itself and — plausibly via shared-worker event-loop contention from the runaway re-fetching — in unrelated files like `AttendeesView.test.tsx` too, which did not reproduce the failure in isolation and has no bug of its own). |

---

## Product & UX (roadmap — see blueprint / ADR-004)

Delivery is by **vertical slice**. Slice 1 = catalog + attendees + check-in ([ADR-003](docs/decisions/003-phase1-attendees-checkin.md)).

### Slice 1 — blocked (see close-out table above)

| ID | Item | Status | Slice | Also affects | Notes |
| :--- | :--- | :---: | :--- | :--- | :--- |
| FE-SLICE1-009 | **Walk-in form end-to-end QA** (`quickstart` **B5c**) | blocked | 1 | HubSpot admin | B5a/b/d ✅ on UAT. **B5c pending** — HubSpot form workflow. Pairs **BE-SLICE1-008** / **X-008**. |

### Slice 1+ — parked or later

| ID | Item | Status | Slice | Also affects | Notes |
| :--- | :--- | :---: | :--- | :--- | :--- |
| FE-SLICE1-005 | **Attendee list performance review** (post–HubSpot schema meeting) | planned | 1+ | Backend | Pairs archived Backend `BE-ATTENDEE-IDX-001..004` / `BE-SLICE1-006`. **2026-07-16:** `CheckInView`'s 2-character search-first gate removed. **2026-07-17:** Backend code complete; Live still blocked on HubSpot Workflow webhook config (`HS-012` / `X-ATTENDEE-IDX-003-HS`), ScriptRunner Parameters (`BE-ATTENDEE-IDX-OPS-001`), webhook security review, and operator sign-off. No Frontend code changes expected (response shape unchanged). |
| FE-SLICE1-008 | **Multi-day Event capacity reset policy** | parked | 1+ | Backend | Deferred per [004 research R-008](specs/004-capacity-management/research.md). Manual adjust + fresh Event selection for now. |
| FE-QR-GEN-002 | **Campaign "send on registration" trigger** (pairs **BE-QR-GEN-002**) | parked | 2+ | Backend | 2026-07-16: user decided the late-registrant gap for QR ticket Campaigns (item 7 in the design note) is an accepted gap for now — no auto catch-up send for people who register after a ticket Campaign has gone out. Parked here as a possible future capability: let staff configure a Campaign to send "on registration" (event-triggered rather than one-off/scheduled) so late registrants are covered automatically. Not scoped/designed — revisit alongside Slice 2 email dispatch if the events team asks for it. See [docs/design-notes/qr-ticket-email-campaigns.md](docs/design-notes/qr-ticket-email-campaigns.md). |
| FE-PROD-003 | **UI role gating** (general / `check-in operator`) | planned | 1.5B | Backend | Slice 1 **admin** gating shipped (Attendees, Check-in, Programs & Events). Extend for **FE-SLICE15-004** / operator role. |

---

## Slice 004 — capacity management (`004-capacity-management`)

| ID | Item | Status | Slice | Also affects | Notes |
| :--- | :--- | :---: | :--- | :--- | :--- |
| FE-CAP-001 | **Manual QA sign-off** — `specs/004-capacity-management/quickstart.md` **§3–§10** | blocked | 004 | Backend | Implementation + automated tests ✅ (**T001–T042**). **Full QA deferred** until live HubSpot UAT data readiness (infra/proxy gates already noted elsewhere). No mock-data interim — frontend has no mock API path. Pairs **BE-CAP-001** / **X-009**. |

---

## Slice 009 — audit log operator UX (`009-audit-log-ux`)

Follow-on to **Slice 1.5 Tier A step A8** (`#/audit` viewer). Spec folder: [`specs/009-audit-log-ux`](specs/009-audit-log-ux/). *(TODO IDs still use `FE-SLICE007-*` / `BE-SLICE007-*` for continuity with earlier tracking — not redesign Slice 007.)*

UI pagination exists today; bucketed paging + filters are shipped. Remaining: optional `resourceLabel` enrichment. Parked for roadmap polish (~1–1.5 weeks engineering when prioritised).

| Step | Gate | TODO IDs | Owner | Status |
| :---: | :--- | :--- | :---: | :---: |
| 1 | **True server-side paging** (audit index at write time; fetch only current page) | BE-SLICE007-001 | Backend | ✅ |
| 2 | **Readable Resource column** (type labels; optional catalog name enrichment) | FE-SLICE007-001, BE-SLICE007-002 | Both | ⬜ |
| 3 | **Server-side filters + Apply button** (action, actor, resource type/ID; non-reactive) | FE-SLICE007-001, BE-SLICE007-001 | Both | ✅ |
| 4 | **Audit Resource column readability** — honour `resourceLabel` when API provides it | FE-SLICE007-002 | Frontend | ⬜ |

| ID | Item | Status | Slice | Also affects | Notes |
| :--- | :--- | :---: | :--- | :--- | :--- |
| FE-SLICE007-002 | **Audit Resource column readability** — human labels (`Event`, `Program`, etc.); show ID as secondary; use `resourceLabel` from API when present | planned | 009 | Backend | Display layer in `auditDisplay.ts` + `AuditView` (`#/audit` only — `AnalyticsView` retired in T080). Pairs **BE-SLICE007-002** (optional catalog name lookup on current page). **Partially addressed 2026-07-14**: `AuditView` restyled as a feed with plain-language action phrases (`describeAuditAction`/`categorizeAuditAction`) and an actor avatar — action-name readability is done; the Resource-ID→human-label part (needs `resourceLabel` from the API) is still open. |

---

## Cross-cutting (primary owner: see other folder)

| ID | Item | Status | Phase | Owner | Notes |
| :--- | :--- | :---: | :--- | :--- | :--- |
| X-001 | **Version control + CI security gates** | done | Pre–Phase 1 | Both | Steps 1–10 complete. Step 2 via manual PR security review (A6). |
| X-002 | **Cloudflare Access** | planned | Slice 1.5B | Both | **Slice 1.5 Tier B step B4.** See FE-OPS-004 / Backend `X-002`. |
| X-SLICE15-002 | **External penetration test or security review** | planned | 1.5B | Both | Vendor engagement; report reusable for InfoSec / vendor questionnaires. Process — not a code task. |
| X-SLICE15-003 | **Ops runbooks** — quarterly access review, incident response, Live Parameters checklist | planned | 1.5B | Both | `USER_ROLE_MAP` review cadence; who to contact on session compromise; UAT vs Live Parameter drift check before each event. |
| X-003 | **`api-contract.md` + `rbac.md` sync discipline** | in progress | Pre–Phase 1 | Both | Always-on AI rule: `../.cursor/rules/ems-api-contract-discipline.mdc`. **Foundation step 8 done** — ongoing per new route. |
| X-004 | **End-to-end journeys (Playwright)** | parked | Phase 6 | Both | Few but real; slow/brittle so keep minimal. |
| X-005 | **Standing test discipline** | planned | Ongoing | Both | Reflected in AGENTS + `.cursor/rules`. |
| X-007 | **UAT / Live environment split** | in progress | UAT | Backend | Frontend: `FE-INFRA-*`, `deploy-uat.yml`, `VITE_EMS_ENV`. Backend: **BE-INFRA-003**, ScriptRunner envs in web UI. [docs/environments.md](docs/environments.md). |
| X-008 | **Walk-in HubSpot form verification** (`003` quickstart **B5c**) | blocked | 1 | HubSpot admin | **2026-07-07 QA:** EMS Walk-in iframe ✅ on UAT; submit → Attendees/check-in **unverified** — blocked on events/HubSpot team confirming form workflow (Parts Attended, attendance, Program form submission). Not an EMS code task unless iframe/Attendees refresh bug found after HubSpot config confirmed. Pairs **FE-SLICE1-009** / **BE-SLICE1-008** / [`HS-002`](docs/hubspot-ops-todo.md). |
| X-009 | **004 Capacity Management QA** (full quickstart sign-off) | blocked | 004 | Both | Originally blocked on HubSpot UAT access; UAT infrastructure was confirmed 2026-07-16, so confirm test-data readiness before scheduling live capacity QA. Pairs **FE-CAP-001** / **BE-CAP-001**. |
| X-SLICE007-001 | **Slice 009 — audit log performance & operator UX** | in progress | 009 | Backend | TODO IDs retain `SLICE007` for continuity. **2026-07-17:** true paging + filters/Apply/Clear shipped (`BE-SLICE007-001`/`FE-SLICE007-001`). Remaining: readable Resource column (`BE-SLICE007-002`/`FE-SLICE007-002`). |
| X-010 | **Event Program reassignment** — `CatalogEventModal`'s Program field stays read-only in edit mode | parked | Redesign B | Backend | 2026-07-14 design review asked to make Program editable in Edit Event. Kept read-only because `docs/api-contract.md` states "Cannot change `programId` via PATCH". Needs a real backend capability (PATCH support or a dedicated move endpoint); the create-mode `SelectPicker` is the UI pattern to reuse. |
| X-QR-GEN-001 | **QR ticket emails — HubSpot Team partnership on governance only** | parked | 2+ | Both | **2026-07-16: live UAT spike passed** — architecture promoted to [ADR-010](docs/decisions/010-qr-ticket-email-single-send.md) (v4 marketing single-send confirmed live, image inject confirmed, Campaign-association reporting confirmed). Remaining scope narrowed to governance only: naming conventions + ownership boundary between Event outreach and general marketing (`HS-003`). Blocks nothing technical anymore — just the HubSpot Team conversation. Pairs **FE-QR-GEN-001** / **BE-QR-GEN-001**. |
| X-ATTENDEE-DETAIL-001 | **Attendee Detail modal — cross-Event communications view** | planned | New | Both | **2026-07-17 grill-with-docs** settled the design — see [ADR-014](docs/decisions/014-attendee-communications-hubspot-engagement-pull.md). **2026-07-17 update: code shipped** — both routes (`GET events/{evId}/attendees/{contactId}`, `GET attendees/{contactId}/communications`), the modal UI (US1 + US2), and the `attendee.communications.view_all` audit action are live (`FE-ATTENDEE-DETAIL-001/002`, `BE-ATTENDEE-DETAIL-001`, all archived). Still `planned` overall pending: HubSpot scope grant `HS-011` (communications route degrades to `502` until granted) and dietary-requirement property `HS-010`, plus two unresolved backend data gaps parked as `BE-ATTENDEE-DETAIL-002`/`003` (no registration timestamp/source, no email-open tracking). |
| X-ATTENDEE-IDX-003-HS | **Add the registration webhook step in HubSpot** | blocked | 1+ | Backend / HubSpot admin | Backend code is complete. Configure the Workflow listener URL, `X-Attendee-Webhook-Secret`, token mapping and both ScriptRunner webhook Parameters before Live. See `HS-012` and Backend `BE-ATTENDEE-IDX-OPS-001`. |
| X-NOTES-001 | **Live event conversation notes** | done-pending-QA | New | Both | **2026-07-21 grill-with-docs** settled the design — see [ADR-019](docs/decisions/019-live-event-conversation-notes.md) and `CONTEXT.md` § **Conversation note**. **2026-07-21: EMS-side code shipped** — `FE-NOTES-001` (this table below) and `BE-NOTES-001`/`002`/`003`/`004` (Backend `TODO.md`) all built + tested per [specs/015-conversation-notes/tasks.md](specs/015-conversation-notes/tasks.md) Phases 2/4/5/6/7 (US2-US5; US1 built separately, same date). Remaining before Live: quickstart.md §C operator security sign-off (UAT) and [`HS-018`](docs/hubspot-ops-todo.md) for the Lead-sync half only. Extends `BE-LEAD-001` (see that row). |
| X-LEAD-001 | **HubSpot Lead generation from event attendees** | done-pending-QA | New | Both | **2026-07-21 grill-with-docs** settled the design — see [ADR-018](docs/decisions/018-hubspot-lead-generation.md), `hubspot-schema.md` § HubSpot Leads, and `CONTEXT.md` § **Lead / Lead generation** / **Lead interest summary**. **2026-07-21: EMS-side code shipped** — `FE-LEAD-001`/`002` (this table below) and `BE-LEAD-001`/`002` (Backend `TODO.md`) all built + tested per [specs/014-lead-generation/tasks.md](specs/014-lead-generation/tasks.md) (all 7 phases, US1-US4). Remaining before Live: quickstart.md §C operator security sign-off (UAT) and the still-open HubSpot ops gates ([`HS-015`](docs/hubspot-ops-todo.md)/[`HS-016`](docs/hubspot-ops-todo.md)/[`HS-017`](docs/hubspot-ops-todo.md)/[`HS-018`](docs/hubspot-ops-todo.md)) — every user story depends entirely on that HubSpot-side work for a real end-to-end test, not on any further EMS code. |
| X-REGFORM-001 | **Registration form bridge — multi-event slots + registration-answer history** | done-pending-QA | New | Both | **2026-07-20 grill-with-docs** settled the design — see [ADR-017](docs/decisions/017-registration-slots-and-answer-history.md), `hubspot-schema.md` § Registration slots, and `CONTEXT.md` § **Registration slot** / **Registration answer / Registration answer history**. **2026-07-21: EMS-side code shipped** — `FE-REGFORM-001` (this table below, archived) and `BE-REGFORM-001`/`002` (Backend `TODO.md`, archived) all built + tested per [specs/013-registration-form-bridge/tasks.md](specs/013-registration-form-bridge/tasks.md) Phases 2/4/5. Retention question from `research.md` R-002 (indefinite, no archive-purge) confirmed by product owner before implementation (tasks.md T003). Remaining before Live: quickstart.md §C operator security sign-off (UAT), and the still-pending HubSpot ops build (`HS-001`/`HS-013`/`HS-014`) — US1/US4 depend entirely on that HubSpot-side work, not on any further EMS code. |
| X-TRAVEL-001 | **HubSpot registration + EMS travel form (hybrid)** | planned | New | Both | **2026-07-22:** product story drafted for Events/Travel walkthrough — [story/hubspot-plus-ems-travel-form.md](../story/hubspot-plus-ems-travel-form.md). Direction: keep HubSpot forms for registration; EMS public travel form for EMS-only fields (flights/hotel/passport); travel team completes bookings in EMS; itinerary via existing HubSpot templates + dispatch. **Not a build yet** — open questions in that doc must be settled before specify/plan. Also affects: Backend. |

---

## HubSpot + EMS travel form (product story 2026-07-22)

Draft hybrid story for Events/Travel review: HubSpot stays the default registration channel; EMS adds an optional public travel form and travel-request workflow. See [story/hubspot-plus-ems-travel-form.md](../story/hubspot-plus-ems-travel-form.md). Cross-cutting: `X-TRAVEL-001`. Mirror in [../Backend/TODO.md](../Backend/TODO.md). No EMS code until open questions are answered and a slice is specified.

---

## Attendee Detail modal (grill-with-docs 2026-07-17)

Outcome of a `/grill-with-docs` session on a new read-only Attendee Detail modal (opened by clicking a row on the Registered Attendees screen). Full design settled — see [ADR-014](docs/decisions/014-attendee-communications-hubspot-engagement-pull.md) and `CONTEXT.md` § **Attendee journey** / **Attendee communications view**. Formal spec: [specs/010-attendee-detail-modal/spec.md](specs/010-attendee-detail-modal/spec.md) (two reference screenshots pending — see that folder's `assets/README.md`). Cross-cutting summary: `X-ATTENDEE-DETAIL-001` (Cross-cutting table above).

`FE-ATTENDEE-DETAIL-001`/`002` shipped 2026-07-17 (US1 + US2, both stories complete) and moved to **[Done (archive)](TODO-DONE.md)**; Backend's `BE-ATTENDEE-DETAIL-001` moved the same date (see [`Backend/TODO-DONE.md`](../Backend/TODO-DONE.md)). Real remaining gaps this feature does **not** fix: `BE-ATTENDEE-DETAIL-002`/`003` (no registration timestamp/source, no email-open tracking — still `parked` in [`Backend/TODO.md`](../Backend/TODO.md)), and HubSpot ops `HS-010`/`HS-011` (still `open` per `docs/hubspot-ops-todo.md`).

---

## Live event conversation notes (grill-with-docs 2026-07-21)

Outcome of a `/grill-with-docs` session giving staff a way to capture live conversation notes with checked-in attendees, surfaced in the Attendee Detail modal, syncing to HubSpot as individual Lead Notes at generation time. Full design in [ADR-019](docs/decisions/019-live-event-conversation-notes.md); glossary in `CONTEXT.md` § **Conversation note**. Cross-cutting summary: `X-NOTES-001` (Cross-cutting table above). Mirror in [../Backend/TODO.md](../Backend/TODO.md). **2026-07-21: EMS-side code shipped** (`specs/015-conversation-notes/tasks.md` Phases 2/4/5/6/7) — remaining before Live is quickstart.md §C operator security sign-off (UAT) and `HS-018` for the Lead-sync half only.

| ID | Item | Status | Slice | Also affects | Notes |
| :--- | :--- | :---: | :--- | :--- | :--- |
| FE-NOTES-001 | **"Conversations" nav item + Attendee Detail "Notes" section** | **done-pending-QA** | New | Backend | ADR-019 decisions #1/#2/#4/#6/#8 (updated 2026-07-21 gap review). **2026-07-21:** US1 half (`ConversationsView.tsx`, checked-in-attendees-only list via existing `fetchEventAttendees`; QR-scan-to-find reusing `CheckInQrPanel.tsx` unmodified, calling the read-only `lookupAttendeeByQr`, not `checkInScan`; the new nav item) shipped in an earlier session. **This session:** the modal's third "Notes" section shipped as `components/ConversationNotesPanel.tsx` — list/add/edit/soft-delete + a "Show notes from all events" toggle (`allEvents`), fed by `BE-NOTES-004`'s dedicated fetch/mutate routes via new `dataService.ts` methods (`fetchAttendeeNotes`/`createAttendeeNote`/`updateAttendeeNote`/`deleteAttendeeNote`). Edit/Delete controls are **not** gated to the note's own `authorEmail` client-side — matches the server's any-admin policy (ADR-019 decision #5), proven end-to-end in `AttendeeDetailModal.test.tsx` with a note authored by a different identity than the one performing the edit/delete. `admin`-only overall. Typed notes only — no transcription UI. |
| X-NOTES-002 | **AI transcription for note capture** | parked | New | Backend | ADR-019 decision #7. Explicitly deferred — consent, third-party audio data-flow, and retention questions need real privacy/legal input before any design, not an engineering default. Revisit with its own dedicated design session. |

---

## Lead generation (grill-with-docs 2026-07-21)

Outcome of a `/grill-with-docs` session on giving staff the ability to generate/update HubSpot Leads from event attendees, carrying the registration-answer content (`013-registration-form-bridge`) onto the Lead as sales context. Full design in [ADR-018](docs/decisions/018-hubspot-lead-generation.md); glossary in `CONTEXT.md` § **Lead / Lead generation** / **Lead interest summary**. Cross-cutting summary: `X-LEAD-001` (Cross-cutting table above). Mirror in [../Backend/TODO.md](../Backend/TODO.md). **2026-07-21: EMS-side code shipped** (`specs/014-lead-generation/tasks.md` all phases) — remaining before Live is quickstart.md §C operator security sign-off (UAT) and the still-open HubSpot ops gates (`HS-015`/`HS-016`/`HS-017`/`HS-018`).

| ID | Item | Status | Slice | Also affects | Notes |
| :--- | :--- | :---: | :--- | :--- | :--- |
| FE-LEAD-001 | **Slice A — single-attendee "Generate Lead" action in the Attendee Detail modal** | **done-pending-QA** | New | Backend | ADR-018 decisions #1/#2/#4. Defaults the Lead interest summary to this Event's registration answer; an option expands to the Contact's full cross-event history (that expanded read is itself audited — 2026-07-21 gap review). `admin`-only (inherits the modal's existing gate). Shipped in `AttendeeDetailModal.tsx` + `dataService.generateAttendeeLead` + 18 Vitest cases in `AttendeeDetailModal.test.tsx`. |
| FE-LEAD-002 | **Slice B — bulk "Generate Leads" from the Attendee list (multi-select)** | **done-pending-QA** | New | Backend | ADR-018 decision #2. Selecting every row covers "generate for everyone who attended" — no separate whole-event mode. Same confirmation flow as Slice A; reuses the existing 50+-recipient confirmation-dialog pattern from email dispatch (own `LEAD_BATCH_CONFIRM_THRESHOLD`, not `EMAIL_SEND_CONFIRM_THRESHOLD`), not a new bulk-size UX. Shipped in `AttendeesView.tsx` (added the list's first multi-select: checkbox column, select-all-visible, bulk action bar) + `dataService.generateAttendeeLeadsBatch` + 27 Vitest cases in `AttendeesView.test.tsx`. |
| X-LEAD-002 | **Company association on generated Leads** | parked | New | Backend | ADR-018 decision #6. HubSpot doesn't require it, and EMS doesn't yet know whether event Contacts have a real Company object linked (vs. just the free-text `company` display field). Revisit if the sales team says they miss it. |

---

## Registration form bridge (grill-with-docs 2026-07-20)

Outcome of a `/grill-with-docs` session on bridging the live multi-page, multi-event HubSpot registration form onto ADR-007's association model with minimal change to how the HubSpot/events team builds forms. Full design in [ADR-017](docs/decisions/017-registration-slots-and-answer-history.md); glossary in `CONTEXT.md` § **Registration slot** / **Registration answer / Registration answer history** (also updated the existing **Registration wave** entry to note what this does/doesn't resolve). Cross-cutting summary: `X-REGFORM-001` (Cross-cutting table above). Mirror in [../Backend/TODO.md](../Backend/TODO.md). **2026-07-21: `FE-REGFORM-001` shipped — see [TODO-DONE.md](TODO-DONE.md).**

| ID | Item | Status | Slice | Also affects | Notes |
| :--- | :--- | :---: | :--- | :--- | :--- |
| X-REGFORM-002 | **General-purpose Record Storage viewer** (à la Audit Log view) | parked | New | Backend | Raised during the storage-medium discussion — today, inspecting Record Storage requires writing a script; no DB-viewer-style tool exists. Deliberately **not** built as part of this feature (`FE-REGFORM-001`'s narrower Attendee Detail panel covers this feature's actual need) — may be worth building later as a standalone ops tool if the need recurs across other stores. |
| X-REGFORM-003 | **Self-service withdrawal via resubmission** — unticking a previously-selected Event on a form resubmission does not remove the existing Contact↔Event association | parked (out of scope) | New | Backend | ADR-017 decision #8. Adding this would give the public form a removal write path, contradicting ADR-007 §4/§6's "association writes stay staff-audited." Withdrawal remains a staff-initiated "remove attendee" action, same as today. Revisit only if the Events team decides this is a real requirement. |

---

## Redesign initiative — UI redesign + custom objects (grilling 2026-07-12)

Outcome of the `grill-with-docs` session(s) on the redesign (design package: `Frontend/design_handoff 2/`; earlier `Frontend/ClaudeDesignHandoff` superseded). **Data model** decisions: [ADR-007](docs/decisions/007-hubspot-custom-objects-registration.md) (HubSpot custom objects + registration-as-association + per-registration Record Storage) and [ADR-008](docs/decisions/008-standalone-events-event-first-nav.md) (standalone Events + event-first navigation); target vocabulary in [CONTEXT.md](CONTEXT.md) § *Redesign transition — target model*. **UI platform** decisions (theming, typography, icons, field pickers, phasing): [ADR-009](docs/decisions/009-redesign-ui-platform-theming-typography.md) (2026-07-12 re-run against `design_handoff 2`). Mirror in [../Backend/TODO.md](../Backend/TODO.md).

**Delivery is phased ([ADR-009](docs/decisions/009-redesign-ui-platform-theming-typography.md) §10):**

- **Phase A:** complete — semantic tokens, themes, typography, field pickers and backend theme preference shipped.
- **Phase B:** feasibility gates cleared 2026-07-14 and the event-first/custom-object foundation has shipped. Remaining work is represented by the active rows below.

| ID | Item | Status | Slice | Also affects | Notes |
| :--- | :--- | :---: | :--- | :--- | :--- |
| X-REDESIGN-001 | **Feasibility gates** — (1) **2 custom-object slots** ✅ (Program `2-65757052`, Event `2-65757130`); (2) **workflows can set Contact↔Event association** ✅ **confirmed 2026-07-14** via a manual test workflow — only supports "matching property values", not a direct record-picker, which shapes the registration mechanism (see `research.md` R-008); (3) **≤10 association labels** ✅ (Program→Event/Event→Program = `286`/`287`; Event↔Contact = `288`/`289` confirmed many-to-many, 2 labels `registered`/`checked-in` = `290`/`292` — attendee type stays on Parts-Attended flags); (4) standard security write-gate | **all 4 gates cleared 2026-07-14** | Redesign | Backend | IDs → ScriptRunner Parameters (R-012, `X-REDESIGN-007`). Next: `X-REDESIGN-002` design-it-twice, not HubSpot-side. |
| X-REDESIGN-002 | **`CustomObjectAdapter` design-it-twice + implementation** — the storage model is settled (labels + Record Storage) and the adapter interface shape too. Ran `codebase-design` design-it-twice (4 parallel designs) before implementation | **done 2026-07-16** | Redesign | Backend | ADR-005 seam's 2nd implementation. Interface + rationale in research.md R-006 (DECIDED). Catalog CRUD confirmed as a separate sibling `CatalogAdapter`, not folded in — unanimous across all 4 designs. **2026-07-16: confirmed `HubSpotCustomObjectAdapter` fully implements the interface, wired via `createCustomObjectAdapter()`, used by all attendee/check-in/capacity/email handlers, covered by `CustomObjectAdapter.test.ts` + `FetchHubSpotAssociationPort.test.ts` (273/273 tests green).** Pairs **BE-REDESIGN-001**. |
| X-REDESIGN-003 | **Event-first routing / api-contract** — Slice routes are `events/{eventId}/…`; Program membership resolved via association, never a route param | **done 2026-07-16** | Redesign | Backend, Frontend | Design-it-twice done (T041). **Frontend cutover done 2026-07-14:** Attendees/Check-in/Email use URL `eventId` + `events/{id}/…` APIs; CatalogPickers dock removed. **2026-07-16: legacy `programs/{programId}/events/{eventId}/…` dual-read routes retired** — deleted from `Routes.ts`, `api-contract.md` + `rbac.md` updated, tests (`Slice1Routes`, `CapacityRoutes`, `EmailDispatchRoutes`, `EventFirstRoutes`, `Routes`) rewritten to event-scoped paths; 277/277 Backend tests green. Standalone-Event storage-key normalization landed alongside as `X-REDESIGN-010`. |
| X-REDESIGN-005 | **Migration / backfill (T057)** — map existing Contact-property attendance + Parts-Attended → objects/associations; EMS catalog IDs stay stable (map to HubSpot IDs inside adapter) | parked (backfill only — **dual-read retirement done 2026-07-16**, see `X-REDESIGN-003`) | Redesign | Backend | **2026-07-14 (T069):** HubSpot UAT Program/Event objects empty — no catalog-object backfill for UAT. Contact attendance → association migration for live portals may still be needed later. Pairs [`HS-007`](docs/hubspot-ops-todo.md). |
| X-REDESIGN-006 | **`/speckit-specify` the redesign** — turn ADR-007/008 + design handoff into a formal spec (or per-surface specs) before build | done | Redesign | Both | Spec + plan + tasks in `Frontend/specs/007-redesign-initiative/`. |
| X-REDESIGN-007 | **ScriptRunner Connect Parameters for HubSpot IDs** — set `HUBSPOT_OBJECT_TYPE_PROGRAM`/`_EVENT`, `HUBSPOT_ASSOC_PROGRAM_TO_EVENT`/`_EVENT_TO_PROGRAM`/`_EVENT_TO_CONTACT`/`_CONTACT_TO_EVENT`, `HUBSPOT_ASSOC_LABEL_REGISTERED`/`_CHECKED_IN` per env; adapter reads at runtime (no hardcoded IDs) | **done 2026-07-14 (UAT)** | Redesign | Backend | All 10 Parameters set in ScriptRunner Connect UAT and workspace synced locally (`ev_params.ts` confirmed updating). See [docs/hubspot-schema.md](docs/hubspot-schema.md); research R-012; tasks.md T065. **2026-07-16: confirmed the stable constants (`HubSpotObjectIds`, `resolveHubSpotObjectIds`, `associationLabelTypeId`, `associationTypeIdsIncludeLabel`) are already in `Backend/scripts/Utils/HubSpotSchema.ts`, covered by `HubSpotSchema.test.ts`.** **Still open (ops, not code): Prod Parameter values** — UAT only so far; set before Prod cutover. Pairs [`HS-008`](docs/hubspot-ops-todo.md). |
| X-REDESIGN-009 | **Registration form → match-key mechanism (not yet designed)** — the registration workflow (`X-REDESIGN-001` gate #2) only creates the Contact↔Event association via matching `ems_registration_match_key` (Contact) to `registration_slug` (Event Items); nothing yet writes the target Event's slug into that Contact property at form-submission time (effectively a hidden/pre-filled field per Event's registration page). Also: who populates `registration_slug` on new Event Items — manual today, should be auto-generated (slugified event name, uniqueness-checked) by EMS's **Programs & Events** create/edit write path (**FE-REDESIGN-022** shipped 2026-07-14 — wire slug generation into that modal save path when designing this) | planned | Redesign | Backend | Added 2026-07-14 alongside the confirmed registration mechanism — see `hubspot-schema.md` § *Registration match-key mechanism* and `research.md` R-008. Not a build blocker for `X-REDESIGN-002`'s adapter design, but needed before registration actually works end-to-end. **2026-07-16: `registration_slug` auto-generation is done** (`HubSpotCatalogAdapter.createEvent`, shipped with `BE-REDESIGN-001`) — the remaining gap is entirely HubSpot-side (form field + workflow), tracked as [`HS-001`](docs/hubspot-ops-todo.md). |
| FE-REDESIGN-001 | **New/redesigned surfaces (Phase B)** — event-first Overview/Events, standalone-Event flows, Check-in Live Capacity ±1, Campaign modal (compose/edit/delete) + campaign-detail per-Contact outcome, remove-attendee + undo-check-in affordances, real-fetch skeletons + "Did you know?" only on slow loads | planned | Redesign B | Backend | Per grilling decisions + `design_handoff 2`. **Programs & Events IA** shipped as **FE-REDESIGN-022**. **Remove + undo UI shipped 2026-07-15.** Still open: campaign-detail per-Contact outcome, real-fetch skeletons / "Did you know?" on slow loads. |
| FE-REDESIGN-008 | **Campaign drafts** — persisted draft-campaign state (save half-composed, resume, edit, delete) | parked | Redesign | Backend | [ADR-009](docs/decisions/009-redesign-ui-platform-theming-typography.md) §9. Deferred from redesign; prototype's Drafts stat omitted/zeroed for now. **2026-07-15:** the compose-modal redesign (FE-REDESIGN-024) intentionally omits the design's **"Save as draft"** footer button for the same reason — no draft-save endpoint exists (`createEmailDispatch`/`update`/`cancel` only). Add the button when this ships. Revisit if the events team wants it. |
| FE-REDESIGN-010 | **Two contrast shortfalls left as design review items (T034 a11y audit)**: (1) `--accent` as small foreground text (`.btn-outline` hover/active label, `.calendarDay[aria-selected]`) reads 2.9:1 vs `--panel` in all 3 themes — below 4.5:1 AA; traces to the brand-mandated primary hex (`css/tokens.css` — non-negotiable per Frontend `CLAUDE.md`), always paired with a border/fill, not standalone body text. (2) `--border` vs `--panel` reads 1.24–1.34:1 (Aurora/Celebration) — well under 3:1 non-text minimum; value is unchanged from `design_handoff 2/` (the approved visual source), is the only boundary indicator on form-field/picker triggers | parked | Redesign | — | `docs/ui-a11y-audit.md` §"Known/accepted limitations". Not silently changed — (1) is a fixed brand hex, (2) traces to the design source, not app code. Revisit with design if a token adjustment is ever approved. |
| FE-REDESIGN-024 | **Compose-modal "From"/sender identity** — the `design_handoff 2/` compose modal shows a Summary row **"From: events@company.com"**, but no sender/from-address exists in the current data model, `fetchEmailLimits` payload, or any API. **2026-07-15:** the redesigned compose modal (below) omits the From row rather than invent a value. Add it once the backend exposes the send identity (likely from the marketing template / a per-event sender Parameter); surface it in the Summary card + optionally the send confirm. | parked | Redesign | Backend | Pairs the Summary-card work. Do not hardcode a placeholder sender in a staff-facing send tool. Also tracks: the informational **"N / 10 dispatches this hour · Large-send confirm at 50+"** line was removed from the modal to match the design (the limit is still enforced via the large-send confirm dialog) — restore in some form if operators miss the remaining-quota readout. |
| FE-REDESIGN-025 | **HubSpot list picker option text: `Name · N contacts`** — design shows contact count beside each list; `HubSpotSegmentOption` is only `{ id, name, kind }` today. **2026-07-15:** UI pass kept `Name (Active/Static)` and put the resolved count in the `.selectionInfo` box only. | parked | Redesign | Backend | Needs a list-size field from HubSpot segments adapter + contract/`dataService` mapping before the option label can match design. |
| FE-REDESIGN-026 | **Compose schedule timezone from Event Item** — design hides the Timezone control; operator asked to use the event timezone under the hood. Confirmed Event Items properties have **no `timezone` field** (`hubspot-schema.md`). **2026-07-15:** picker removed; schedule still submitted with `resolveDefaultTimezone()` / the existing dispatch timezone on edit. | parked | Redesign | Backend | Revisit when Event Items gain a timezone property (or another event-scoped source is agreed); then seed `scheduleTimezone` from catalog/event detail instead of the browser default. Pairs [`HS-004`](docs/hubspot-ops-todo.md). |
| FE-REDESIGN-018 | **Live-capacity "reset manual adjustments" action** — `design_handoff 2/`'s Live capacity widget shows a "reset" link next to "Includes manual adjustment of N" that zeroes out accumulated ±1 corrections in one action. Not implemented as part of `FE-REDESIGN-017` (which only added the display text, wired to the existing `departureCount` read) | planned | Redesign | Backend | Needs a new write action (reset departure count), which means a new/extended backend route + RBAC + audit consideration — out of scope for a pure-Frontend CSS/layout pass. `CapacityBar.tsx` already accepts `manualAdjustmentCount` for display; a `onResetAdjustments` callback would slot in next to the existing `onAdjust`. |
| FE-REDESIGN-019 | **Attendees "Attendee type" filter (All types/Customer/Partner) is client-side only** — narrows the currently-loaded page in the browser; it is not a query param on `fetchSliceAttendees` (unlike the existing server-side "Status" checked-in filter and Email dispatch filter) | parked | Redesign | Backend | Added 2026-07-14 as part of a Phase A QA pass matching `design_attendee_screen.png`'s facets. Kept client-side to avoid an API-contract change for a visual-parity fix. Trade-off: the "N registered" total/pagination is unaffected by this filter (still reflects the server-side Status/dispatch filters only), so on a filtered page a user could see fewer rows than the header total implies. Revisit as a real server-side filter if this becomes a frequent operator complaint. |
| FE-REDESIGN-020 | **`OverviewView`'s "Emails scheduled this week" was an N+1 client-side fan-out** — one `fetchEmailDispatches({ view: 'scheduled' })` call per active event | **done 2026-07-16** | Redesign B | Backend | Added 2026-07-14 (T046); updated T071 — registered-this-week no longer fans out (hard 0; no registration timestamp on capacity/catalog). **2026-07-16: replaced with a single aggregate call** — new admin-only `GET events/scheduled-email-summary` route sums scheduled-within-7-days dispatches across active events server-side; `OverviewView.loadStats` now makes one `fetchScheduledEmailSummary()` call instead of one per event. Capacity fan-out for attendee counts stays as-is — that part is intentional (`FE-REDESIGN-021` decision), scoped out of this change per user direction. |
| X-REDESIGN-011 | **Program owner field — backend wiring** — the Programs & Events create/edit modal (`CatalogProgramModal.tsx`) now shows a **Program owner** dropdown to match `design_handoff 2`, but it is **disabled / UI-only**. `hubspot_owner_id` ("Program Owner", type `owner`) is a confirmed Program property (`docs/hubspot-schema.md`), but there is no owners-list API, no owner picker data source, and `owner` is not in `CreateCatalogProgramBody`/`PatchCatalogProgramBody` or `api-contract.md`. To enable: (1) Backend owners-list route + `RouteGuard` + RBAC; (2) `owner` on Program create/patch contract (matches how Event already carries `owner`); (3) Frontend `dataService` fetch + populate/enable the `SelectPicker`; (4) tests. | parked | Redesign | Backend | Added 2026-07-16 with the Program modal visual refresh. Pairs a new **BE-REDESIGN-011** / [`HS-005`](docs/hubspot-ops-todo.md). Owner values are HubSpot owner IDs — needs the owners lookup, not free text. |
| X-REDESIGN-010 | **Standalone Event storage-key risk** — Backend capacity/email stores nest under `programId` (null for standalone Events) | **done 2026-07-16** | Redesign | Backend | Read the actual key-builders: `RegistrationCacheStore`/`CheckedInCounterStore` key by `eventId` alone (no risk). `CapacityStore`/`DispatchStore`'s event-index keyed by `programId--eventId`; `null` was template-coercing to the literal string `"null"` — harmless for collisions (`eventId` alone is already globally unique) but a real drift risk if an Event's Program association ever changes later. Fixed: both now normalize `programId` to a `'_standalone'` sentinel via `normalizeProgramId()`. Covered by `node/tests/StandaloneEventStorageKeys.test.ts` + a new `EventFirstRoutes.test.ts` integration case. |
| FE-REDESIGN-027 | **Phone tab-bar chrome (<768px) has no pixel reference** — `MobileTabBar` (added with the 2026-07-23 3-tier shell rebuild) follows `design_handoff 2/README.md`'s textual spec (scrollable tab row, working-event row, theme row below tabs) rather than a screenshot — the design handoff's own README says the phone tier wasn't captured in that screenshot pass. | parked | Redesign | — | Revisit with design if the phone layout (row order, spacing) needs to match a real mock once one exists. Functionally verified (scrolls, no horizontal page overflow, 44px targets, working-event picker reachable) in a live browser at 390px. |
| FE-TECH-009 | **Dead legacy CSS in `css/layout.css`** — `#app-layout`/`.nav-items`/`.sidebar` (bare, non-module) selectors under its `@media (max-width: 900px)` block target pre-React vanilla-JS-era markup; zero references anywhere in `src/` or `index.html` today. Still imported (`src/main.tsx`), so it's dead-but-loaded, not executing against any real element. | parked | Optional | — | Found incidentally while placing the new 3-tier shell breakpoints (2026-07-23) — out of scope for that change. Safe to delete once confirmed dead via a full-repo grep; low priority (harmless bytes, no behavior risk). |

---

## Done (archive)

Completed items older than the current working set live in **[TODO-DONE.md](TODO-DONE.md)** (moved 2026-07-15).

When you complete an item, add a row there (or under a new dated archive file) and remove it from the active tables above.
