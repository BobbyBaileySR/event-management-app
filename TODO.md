# Frontend TODO — Adaptavist EMS

Parked work, optional hardening, and deferred decisions for the static EMS UI.

**Not a defect list.** Items here were skipped, scheduled for a later phase, or blocked on external setup.

**AI agents:** When the user skips or defers work, add an entry here (see `../.cursor/rules/ems-todo-discipline.mdc`).

> **Last updated:** 2026-07-15 (undo check-in UI; label IDs `291`/`293`; Google OAuth origins done; chart.js + Celebration Params earlier today)

---

## Remaining roadmap — after the redesign week

Forward-looking summary (added 2026-07-12). **Next week's planned work (2026-07 W3):**

1. **Redesign Phase A** — semantic token layer + 3 themes (incl. Dark Aurora) + switcher, self-hosted Manrope + Material Symbols, shared a11y field pickers, theme persistence (`FE-REDESIGN-003/005/006/007`; backend `BE-REDESIGN-003`). ✅ **Fully done 2026-07-13** (Setup/Foundational/US4/US1 — T001–T033, T063; Phase 5 US2 a11y/dependency/XSS proof — T034–T037; Phase 6 US3 rollout + in-flight slice compatibility — T038–T039). **Phase A complete.** Only Phase B (event-first/registration, gated on `X-REDESIGN-001`) remains.
2. **HubSpot UAT** — ✅ **All `X-REDESIGN-001` feasibility gates cleared 2026-07-14** (admin access granted; objects `2-65757052`/`2-65757130`, all properties, all 4 association type IDs `286`–`289`, 2 labels `290`/`292`, scopes, and the workflow-association test all confirmed directly — see [docs/hubspot-schema.md](docs/hubspot-schema.md)). **Remaining before Phase B build starts:** confirm label-ID directionality (see `X-REDESIGN-004`), set the ScriptRunner Connect UAT **Parameters**, and run the `CustomObjectAdapter` design-it-twice session (`X-REDESIGN-002`, not HubSpot-side).
3. **Redesign Phase B** — event-first IA/routing, standalone Events, registration-as-association, live capacity ±1, Campaign modal + copy fixes (`FE-REDESIGN-001/002/004`; `X-REDESIGN-003/005/006`). **Programs & Events IA (FE-REDESIGN-022 / T075–T082) done 2026-07-14.**
4. **Full E2E testing** of **Slice 004** (capacity — `X-009` / `FE-CAP-001`) and **Slice 005** (email dispatch) once the redesign lands. Also verifies the **walk-in path** (`X-008`), since feasibility gate #2 confirms workflow-written registrations.
5. **Production API proxy** — hope ScriptRunner Connect fixes its **OPTIONS preflight bug** next week; **if not, stand up the Cloudflare proxy before end of week** (`FE-OPS-002` / `FE-INFRA-001`).

**Roadmap remaining after that week:**

| Item | Ref | Notes |
| :--- | :--- | :--- |
| **Slice 007** — audit log operator UX | `X-SLICE007-001`, `FE-SLICE007-001/002` | Backend audit index → true paging, readable Resource column, server-side filters + Apply. ~1–1.5 wks. |
| **Slice 1.5 Tier B** — enterprise ops | B1–B9 (`FE-SLICE15-003/004`, `FE-OPS-004`) | Audit export, operator role UI gating, Cloudflare **Access**, retention/session hardening (backend), monitoring, pen test, runbooks. |
| **QR generation** | `FE-QR-GEN-001` (pairs `BE-QR-GEN-001`) | Pre-event ticket emails w/ full ~550–800+ char JWT. Slice 2+. |
| **Later product APIs** | `BE-PROD-002`, `BE-PROD-001` | Event read APIs + analytics — backend-led, surfaced later in UI. |
| **Optional / parked polish** | `FE-TECH-007`, `FE-REDESIGN-008` | Data-seam reshape (31 endpoints → feature adapters), campaign drafts. |
| **Standing disciplines** | `X-003`, `X-005`, `FE-TEST-005` | api-contract/RBAC sync + per-view/service tests — ongoing, never "done". |

---

## Slice 1 — close-out (blocked on external)

Code and automated tests are **complete**. Only these gates remain before full Slice 1 sign-off:

| ID | Item | Blocked on | Pairs |
| :--- | :--- | :--- | :--- |
| **X-008** / **FE-SLICE1-009** / **BE-SLICE1-008** | Walk-in form **B5c** — Attendees row + checked-in after HubSpot submit | Events/HubSpot team (form workflow config) | `003` quickstart **B5c** |
| **X-009** / **FE-CAP-001** / **BE-CAP-001** | Capacity manual QA + SFTP deploy + live smoke | HubSpot UAT access (**FE-INFRA-003** / **BE-INFRA-003**) | `004` quickstart **T043–T044** |

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
| FE-SLICE15-004 | **UI role gating for `check-in operator`** | planned | 1.5B | Backend | Hide catalog admin + Settings; show Attendees + Check-in when Program + Event selected. Pairs **BE-SLICE15-009**. |

---

## Foundation gates — before Slice 1

Complete these **before** the first slice ships live data/writes (`USE_MOCK_API: false`). These are the one-time security + tooling gates that precede all slices (was "Phase 1 Process").

Cross-folder checklist — mirror in [../Backend/TODO.md](../Backend/TODO.md).

| Step | Gate | TODO IDs | Owner | Status |
| :---: | :--- | :--- | :---: | :---: |
| 1 | **Version control** — confirm Frontend repo + Backend git | X-001, FE-SEC-001, BE-SEC-001 | Both | ✅ |
| 2 | **CI security review** — Bugbot / security-review on PRs or pre-merge | FE-SEC-002, BE-SEC-002 | Both | ✅ |
| 3 | **CI dependency audit** | FE-SEC-003, BE-SEC-003 | Both | ✅ |
| 4 | **CSP `img-src`** — narrow from `https:` before real HubSpot/asset URLs render | FE-SEC-004 | Frontend | ✅ |
| 5 | **ESLint XSS gate** — ban `dangerouslySetInnerHTML` in `src/` | FE-SEC-007 | Frontend | ✅ |
| 6 | **Backend SFTP deploy** — Phase 0 auth scripts live on ScriptRunner | BE-DEPLOY-001 | Backend | ✅ |
| 7 | **Live auth E2E** — `USE_MOCK_AUTH: false`, `USE_MOCK_API: true`; sign-in + session | BE-OPS-003 | Both | ✅ |
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
| FE-OPS-002 | **Production API proxy** (Cloudflare Worker or equivalent) | planned | Production | Backend | **Scheduled for next week (2026-07 W3).** Root cause is ScriptRunner Connect's **OPTIONS preflight bug** on direct browser calls. Plan: hope SRC ships a fix next week; **if not, stand up the Cloudflare proxy before end of week**. Needed before staff use **deployed** URLs; local dev still uses Vite proxy + `dev-server.config.js`. Pairs **FE-INFRA-001**. |
| FE-OPS-003 | **`gsi/button` 403 on first load** (Google Sign-In button iframe) | parked | Optional | — | Harmless noise when origin is registered; sign-in still works. Revisit only if UX impact. |
| FE-OPS-004 | **Cloudflare Access** — edge auth before HTML is served | planned | Slice 1.5B | Backend | **Slice 1.5 Tier B step B4** (was Phase 6). Complements Bearer session; does not replace ScriptRunner auth. ADR: [docs/decisions/002-zero-budget-hosting.md](docs/decisions/002-zero-budget-hosting.md). |

---

## Infrastructure (UAT / Live)

| ID | Item | Status | Phase | Also affects | Notes |
| :--- | :--- | :---: | :--- | :--- | :--- |
| FE-INFRA-001 | **Deployed UAT/Live API proxy** — Cloudflare Pages Function or Worker for `/api/ems` | parked | Before staff use deployed URLs for HubSpot | Backend | Plain github.io cannot proxy API. Local dev + Vite proxy is sufficient for staging HubSpot work until this ships. Store `UAT_SRC_LISTENER_URL` / `LIVE_SRC_LISTENER_URL` as GitHub Actions secrets when implementing. |
| FE-INFRA-002 | **UAT GitHub repo one-time setup** — `event-management-app-uat`, Pages from `gh-pages`, `UAT_PAGES_DEPLOY_TOKEN` secret | planned | UAT | — | CI workflow [`.github/workflows/deploy-uat.yml`](.github/workflows/deploy-uat.yml) is ready; create repo + secret + push `uat` branch. See [docs/environments.md](docs/environments.md). |
| FE-INFRA-003 | **ScriptRunner UAT environment** — Staging HubSpot connector, UAT listener, Parameters | planned | UAT | Backend | Web UI in ScriptRunner Connect. Same scripts via SFTP; different Parameters per environment. See [../Backend/README.md](../Backend/README.md). |

---

## Code quality & polish (optional — no blueprint phase)

| ID | Item | Status | Phase | Also affects | Notes |
| :--- | :--- | :---: | :--- | :--- | :--- |
| FE-TECH-005 | **Audit display: surface previous/new values when backend adds them** | planned | Slice 1.5 | Backend | **→ FE-SLICE15-002** (viewer) + **BE-SLICE15-005** (field-level PATCH audit). Surface `metadata.previous` / `metadata.next` in audit viewer when present. |
| FE-TECH-007 | **Reshape the data seam: 31 endpoints → feature adapters** | planned | Optional | — | Architecture review 2026-07-11 (report item #4 — the only one of six deferred). `src/services/dataService.ts` (~921 ln, ~31 fns) mirrors the backend 1:1; `createDataService` re-binds all 31 to the token (~62 ln); `src/data/mockData.ts` (~1,323 ln) is coupled per-operation via `withMockFallback`; some legacy duplicate/unused methods remain. Plan (incremental, tests green): (1) delete caller-less legacy methods; (2) group ops into feature ports (Catalog/Attendee/CheckIn/Email); (3) pick real-vs-mock + bind token **once** at the seam (driven by `src/config.ts`), not per-operation. Keep every method mapped to `docs/api-contract.md`. |
| FE-TECH-008 | **`improve-codebase-architecture` grilling loop no longer captures domain model inline** | parked | Optional | — | 2026-07-12: swapped the locally-authored `grilling` skill for the [upstream original](https://github.com/mattpocock/skills/tree/main/skills/productivity/grilling), which is a pure interview and does **not** weave in `domain-modeling` (ADR/glossary capture) or the `codebase-design` vocabulary. `grill-with-docs` is unaffected (it separately says "using the `/domain-modeling` skill"), but `improve-codebase-architecture` step 3 leaned on grilling to keep the domain model current inline. Decide whether to (a) add an explicit `/domain-modeling` step to `improve-codebase-architecture`, or (b) accept the gap. No code impact; skills invoke `/grilling` by name so nothing is broken. |

---

## Testing

Standing requirement: new views/services ship with tests (`FE-TEST-005`). **28 test files / 160 tests** run in CI today.

| ID | Item | Status | Phase | Also affects | Notes |
| :--- | :--- | :---: | :--- | :--- | :--- |
| FE-TEST-005 | **Per-view / per-service tests as new UI + data are added** | planned | Phase 1+ | Backend | **Standing requirement.** Park here only if explicitly deferred. |

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
| FE-SLICE1-005 | **Attendee list performance review** (post–HubSpot schema meeting) | parked | 1+ | Backend | Pairs **BE-SLICE1-006**. Accepted for Slice 1 QA; defer until custom-objects meeting ([ADR-005](docs/decisions/005-hubspot-adapter-layer.md)). |
| FE-SLICE1-008 | **Multi-day Event capacity reset policy** | parked | 1+ | Backend | Deferred per [004 research R-008](../specs/004-capacity-management/research.md). Manual adjust + fresh Event selection for now. |
| FE-QR-GEN-001 | **QR generation — long JWT payload** (pre-event email / ticket dispatch) | planned | 2+ | Backend | Do not ship QR minting until generation encodes full ~550–800+ char JWT. Pairs **BE-QR-GEN-001**. |
| FE-PROD-003 | **UI role gating** (general / `check-in operator`) | planned | 1.5B | Backend | Slice 1 **admin** gating shipped (Attendees, Check-in, Catalog). Extend for **FE-SLICE15-004** / operator role. |

---

## Slice 004 — capacity management (`004-capacity-management`)

| ID | Item | Status | Slice | Also affects | Notes |
| :--- | :--- | :---: | :--- | :--- | :--- |
| FE-CAP-001 | **Manual QA sign-off** — `specs/004-capacity-management/quickstart.md` **§3–§10** | blocked | 004 | Backend | Implementation + automated tests ✅ (**T001–T042**). **Full QA deferred** until HubSpot UAT. Mock §3–§6 optional interim. Pairs **BE-CAP-001** / **X-009**. |

---

## Slice 007 — audit log operator UX (`007-audit-log-ux`)

Follow-on to **Slice 1.5 Tier A step A8** (`#/audit` viewer). UI pagination exists today, but the backend loads and sorts **all** audit entries on every request — slow as the log grows. Parked for roadmap; spec to be written when prioritised (~1–1.5 weeks engineering).

| Step | Gate | TODO IDs | Owner | Status |
| :---: | :--- | :--- | :---: | :---: |
| 1 | **True server-side paging** (audit index at write time; fetch only current page) | BE-SLICE007-001 | Backend | ⬜ |
| 2 | **Readable Resource column** (type labels; optional catalog name enrichment) | FE-SLICE007-001, BE-SLICE007-002 | Both | ⬜ |
| 3 | **Server-side filters + Apply button** (action, actor, resource type/ID; non-reactive) | FE-SLICE007-001, BE-SLICE007-001 | Both | ⬜ |
| 4 | **Fix event analytics audit strip** — honour paginated `GET events/{id}/audit` response | FE-SLICE007-002 | Frontend | ⬜ |

| ID | Item | Status | Slice | Also affects | Notes |
| :--- | :--- | :---: | :--- | :--- | :--- |
| FE-SLICE007-001 | **Audit log filter bar + Apply/Clear** — action, actor, resource type/ID; reset to page 1 on apply; extend `fetchAuditLog` query params | planned | 007 | Backend | Pairs **BE-SLICE007-001**. Action dropdown from known audit actions (static list). No reactive search. |
| FE-SLICE007-002 | **Audit Resource column readability** — human labels (`Event`, `Program`, etc.); show ID as secondary; use `resourceLabel` from API when present; fix `AnalyticsView` paginated audit (`isAuditLogListResult` branch) | planned | 007 | Backend | Display layer in `auditDisplay.ts` + `AuditView`. Pairs **BE-SLICE007-002** (optional catalog name lookup on current page). **Partially addressed 2026-07-14**: `AuditView` restyled as a feed with plain-language action phrases (`describeAuditAction`/`categorizeAuditAction`) and an actor avatar, as part of a Phase A QA pass — action-name readability is done; the Resource-ID→human-label part (needs `resourceLabel` from the API) is still open. |

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
| X-008 | **Walk-in HubSpot form verification** (`003` quickstart **B5c**) | blocked | 1 | HubSpot admin | **2026-07-07 QA:** EMS Walk-in iframe ✅ on UAT; submit → Attendees/check-in **unverified** — blocked on events/HubSpot team confirming form workflow (Parts Attended, attendance, Program form submission). Not an EMS code task unless iframe/Attendees refresh bug found after HubSpot config confirmed. Pairs **FE-SLICE1-009** / **BE-SLICE1-008**. |
| X-009 | **004 Capacity Management QA** (full quickstart sign-off) | blocked | 004 | Both | **2026-07-07:** Blocked on **HubSpot UAT access** — defer live capacity QA (`USE_MOCK_API: false`, §4 live, §5, §10) so live HubSpot data is not impacted. Pairs **FE-CAP-001** / **BE-CAP-001**. Mock §3–§6 may run offline in parallel if useful. |
| X-SLICE007-001 | **Slice 007 — audit log performance & operator UX** | planned | 007 | Backend | Follow-on to 1.5 A8. True paging (audit index), readable Resource column, server-side filters (Apply button). Spec `007-audit-log-ux` when scheduled. ~1–1.5 weeks. Pairs **BE-SLICE007-001**, **FE-SLICE007-001**, **FE-SLICE007-002**. |
| X-010 | **Event Program reassignment** — `CatalogEventModal`'s Program field stays read-only in edit mode | parked | Redesign B | Backend | 2026-07-14 design review asked to make Program editable in Edit Event. Kept read-only: `docs/api-contract.md` explicitly states "Cannot change `programId` via PATCH", and the mock data layer stores each event inside its owning program's own array (no cross-program move op). Needs a real backend capability (PATCH support or a dedicated move endpoint) + mock data rework before the Frontend UI can safely go live — the `create`-mode `SelectPicker` already exists as the template to reuse (`CatalogEventModal.tsx`). |

---

## Redesign initiative — UI redesign + custom objects (grilling 2026-07-12)

Outcome of the `grill-with-docs` session(s) on the redesign (design package: `Frontend/design_handoff 2/`; earlier `Frontend/ClaudeDesignHandoff` superseded). **Data model** decisions: [ADR-007](docs/decisions/007-hubspot-custom-objects-registration.md) (HubSpot custom objects + registration-as-association + per-registration Record Storage) and [ADR-008](docs/decisions/008-standalone-events-event-first-nav.md) (standalone Events + event-first navigation); target vocabulary in [CONTEXT.md](CONTEXT.md) § *Redesign transition — target model*. **UI platform** decisions (theming, typography, icons, field pickers, phasing): [ADR-009](docs/decisions/009-redesign-ui-platform-theming-typography.md) (2026-07-12 re-run against `design_handoff 2`). Mirror in [../Backend/TODO.md](../Backend/TODO.md).

**Delivery is phased ([ADR-009](docs/decisions/009-redesign-ui-platform-theming-typography.md) §10):**

- **Phase A (unblocked now):** the visual foundation — semantic token layer + 3 themes (incl. Dark Aurora), self-hosted Manrope + Material Symbols, shared a11y field pickers, theme switcher + backend preference. No custom-object dependency.
- **Phase B (blocked on X-REDESIGN-001 feasibility slots):** event-first IA/routing, standalone Events, registration-as-association, live capacity/occupancy ±1, Campaign modal. **Nothing in Phase B ships until the feasibility gates pass.**

| ID | Item | Status | Slice | Also affects | Notes |
| :--- | :--- | :---: | :--- | :--- | :--- |
| X-REDESIGN-001 | **Feasibility gates** — (1) **2 custom-object slots** ✅ (Program `2-65757052`, Event `2-65757130`); (2) **workflows can set Contact↔Event association** ✅ **confirmed 2026-07-14** via a manual test workflow — only supports "matching property values", not a direct record-picker, which shapes the registration mechanism (see `research.md` R-008); (3) **≤10 association labels** ✅ (Program→Event/Event→Program = `286`/`287`; Event↔Contact = `288`/`289` confirmed many-to-many, 2 labels `registered`/`checked-in` = `290`/`292` — attendee type stays on Parts-Attended flags); (4) standard security write-gate | **all 4 gates cleared 2026-07-14** | Redesign | Backend | IDs → ScriptRunner Parameters (R-012, `X-REDESIGN-007`). Next: `X-REDESIGN-002` design-it-twice, not HubSpot-side. |
| X-REDESIGN-002 | **`CustomObjectAdapter` design-it-twice** — the storage model is settled (labels + Record Storage) and now the **adapter interface shape** is too. Ran `codebase-design` design-it-twice (4 parallel designs) before implementation | **decided 2026-07-14** | Redesign | Backend | ADR-005 seam's 2nd implementation. Interface + rationale in research.md R-006 (DECIDED). Catalog CRUD confirmed as a separate sibling `CatalogAdapter`, not folded in — unanimous across all 4 designs. Next: actual implementation. Pairs **BE-REDESIGN-001**. |
| X-REDESIGN-003 | **Event-first routing / api-contract** — Slice routes are `programs/{programId}/events/{eventId}/…`; event-first needs **event-scoped routes** or optional `programId`. Breaking contract change — update `api-contract.md` + `rbac.md` + `RouteGuard` together | **Frontend cutover done 2026-07-14** — dual-read retirement still parked (`X-REDESIGN-005`) | Redesign | Backend, Frontend | Design-it-twice done (T041). Backend dual-read `events/{eventId}/…` live. **Frontend dataService + views cutover done 2026-07-14:** Attendees/Check-in/Email use URL `eventId` + `events/{id}/…` APIs; CatalogPickers dock removed. Remaining: retire legacy `programs/{programId}/…` dual-read after CatalogAdapter lookup swap (`X-REDESIGN-005`). **Also affects Backend:** confirm standalone-Event Plan-C / Record Storage keying when `programId` is null on capacity/email paths (Frontend mocks use `'_standalone'` sentinel only). |
| X-REDESIGN-005 | **Migration / backfill + dual-read retirement (T057)** — map existing Contact-property attendance + Parts-Attended → objects/associations; EMS catalog IDs stay stable (map to HubSpot IDs inside adapter). **Do not retire** `programs/{programId}/…` dual-read until `resolveCatalogEvent*` → CatalogAdapter (**Frontend event-scoped cutover done 2026-07-14**) | parked | Redesign | Backend | **Parked 2026-07-14 (T057):** dual-read retirement now gated primarily on CatalogAdapter lookup swap. Frontend Slice 1/2 cutover done. **2026-07-14 (T069):** HubSpot UAT Program/Event objects empty — no catalog-object backfill for UAT. Contact attendance → association migration for live portals may still be needed later. |
| X-REDESIGN-006 | **`/speckit-specify` the redesign** — turn ADR-007/008 + design handoff into a formal spec (or per-surface specs) before build | done | Redesign | Both | Spec + plan + tasks in `Frontend/specs/007-redesign-initiative/`. |
| X-REDESIGN-007 | **ScriptRunner Connect Parameters for HubSpot IDs** — set `HUBSPOT_OBJECT_TYPE_PROGRAM`/`_EVENT`, `HUBSPOT_ASSOC_PROGRAM_TO_EVENT`/`_EVENT_TO_PROGRAM`/`_EVENT_TO_CONTACT`/`_CONTACT_TO_EVENT`, `HUBSPOT_ASSOC_LABEL_REGISTERED`/`_CHECKED_IN` per env; adapter reads at runtime (no hardcoded IDs) | **done 2026-07-14 (UAT)** | Redesign | Backend | All 7 Parameters set in ScriptRunner Connect UAT (the originally-planned single `HUBSPOT_ASSOC_CONTACT_EVENT` placeholder was deleted — superseded by 4 directional association parameters once each direction turned out to have its own type ID) and workspace synced locally (`ev_params.ts` confirmed updating). See [docs/hubspot-schema.md](docs/hubspot-schema.md); research R-012; tasks.md T065. **Remaining, not blocking**: add the matching stable constants to `Backend/scripts/Utils/HubSpotSchema.ts` — that's part of the `CustomObjectAdapter` implementation itself, not a separate pre-req. Prod values still TBD (UAT only so far). |
| X-REDESIGN-009 | **Registration form → match-key mechanism (not yet designed)** — the registration workflow (`X-REDESIGN-001` gate #2) only creates the Contact↔Event association via matching `ems_registration_match_key` (Contact) to `registration_slug` (Event Items); nothing yet writes the target Event's slug into that Contact property at form-submission time (effectively a hidden/pre-filled field per Event's registration page). Also: who populates `registration_slug` on new Event Items — manual today, should be auto-generated (slugified event name, uniqueness-checked) by EMS's **Programs & Events** create/edit write path (**FE-REDESIGN-022** shipped 2026-07-14 — wire slug generation into that modal save path when designing this) | planned | Redesign | Backend | Added 2026-07-14 alongside the confirmed registration mechanism — see `hubspot-schema.md` § *Registration match-key mechanism* and `research.md` R-008. Not a build blocker for `X-REDESIGN-002`'s adapter design, but needed before registration actually works end-to-end. |
| FE-REDESIGN-001 | **New/redesigned surfaces (Phase B)** — event-first Overview/Events, standalone-Event flows, Check-in Live Capacity ±1, Campaign modal (compose/edit/delete) + campaign-detail per-Contact outcome, remove-attendee + undo-check-in affordances, real-fetch skeletons + "Did you know?" only on slow loads | planned | Redesign B | Backend | Per grilling decisions + `design_handoff 2`. **Programs & Events IA** shipped as **FE-REDESIGN-022**. **Remove + undo UI shipped 2026-07-15.** Still open: campaign-detail per-Contact outcome, real-fetch skeletons / "Did you know?" on slow loads. |
| FE-REDESIGN-008 | **Campaign drafts** — persisted draft-campaign state (save half-composed, resume, edit, delete) | parked | Redesign | Backend | [ADR-009](docs/decisions/009-redesign-ui-platform-theming-typography.md) §9. Deferred from redesign; prototype's Drafts stat omitted/zeroed for now. **2026-07-15:** the compose-modal redesign (FE-REDESIGN-024) intentionally omits the design's **"Save as draft"** footer button for the same reason — no draft-save endpoint exists (`createEmailDispatch`/`update`/`cancel` only). Add the button when this ships. Revisit if the events team wants it. |
| FE-REDESIGN-010 | **Two contrast shortfalls left as design review items (T034 a11y audit)**: (1) `--accent` as small foreground text (`.btn-outline` hover/active label, `.calendarDay[aria-selected]`) reads 2.9:1 vs `--panel` in all 3 themes — below 4.5:1 AA; traces to the brand-mandated primary hex (`css/tokens.css` — non-negotiable per Frontend `CLAUDE.md`), always paired with a border/fill, not standalone body text. (2) `--border` vs `--panel` reads 1.24–1.34:1 (Aurora/Celebration) — well under 3:1 non-text minimum; value is unchanged from `design_handoff 2/` (the approved visual source), is the only boundary indicator on form-field/picker triggers | parked | Redesign | — | `docs/ui-a11y-audit.md` §"Known/accepted limitations". Not silently changed — (1) is a fixed brand hex, (2) traces to the design source, not app code. Revisit with design if a token adjustment is ever approved. |
| FE-REDESIGN-024 | **Compose-modal "From"/sender identity** — the `design_handoff 2/` compose modal shows a Summary row **"From: events@company.com"**, but no sender/from-address exists in the current data model, `fetchEmailLimits` payload, or any API. **2026-07-15:** the redesigned compose modal (below) omits the From row rather than invent a value. Add it once the backend exposes the send identity (likely from the marketing template / a per-event sender Parameter); surface it in the Summary card + optionally the send confirm. | parked | Redesign | Backend | Pairs the Summary-card work. Do not hardcode a placeholder sender in a staff-facing send tool. Also tracks: the informational **"N / 10 dispatches this hour · Large-send confirm at 50+"** line was removed from the modal to match the design (the limit is still enforced via the large-send confirm dialog) — restore in some form if operators miss the remaining-quota readout. |
| FE-REDESIGN-025 | **HubSpot list picker option text: `Name · N contacts`** — design shows contact count beside each list; `HubSpotSegmentOption` is only `{ id, name, kind }` today. **2026-07-15:** UI pass kept `Name (Active/Static)` and put the resolved count in the `.selectionInfo` box only. | parked | Redesign | Backend | Needs a list-size field from HubSpot segments adapter + contract/`dataService` mapping before the option label can match design. |
| FE-REDESIGN-026 | **Compose schedule timezone from Event Item** — design hides the Timezone control; operator asked to use the event timezone under the hood. Confirmed Event Items properties have **no `timezone` field** (`hubspot-schema.md`). **2026-07-15:** picker removed; schedule still submitted with `resolveDefaultTimezone()` / the existing dispatch timezone on edit. | parked | Redesign | Backend | Revisit when Event Items gain a timezone property (or another event-scoped source is agreed); then seed `scheduleTimezone` from catalog/event detail instead of the browser default. |
| FE-REDESIGN-018 | **Live-capacity "reset manual adjustments" action** — `design_handoff 2/`'s Live capacity widget shows a "reset" link next to "Includes manual adjustment of N" that zeroes out accumulated ±1 corrections in one action. Not implemented as part of `FE-REDESIGN-017` (which only added the display text, wired to the existing `departureCount` read) | planned | Redesign | Backend | Needs a new write action (reset departure count), which means a new/extended backend route + RBAC + audit consideration — out of scope for a pure-Frontend CSS/layout pass. `CapacityBar.tsx` already accepts `manualAdjustmentCount` for display; a `onResetAdjustments` callback would slot in next to the existing `onAdjust`. |
| FE-REDESIGN-019 | **Attendees "Attendee type" filter (All types/Customer/Partner) is client-side only** — narrows the currently-loaded page in the browser; it is not a query param on `fetchSliceAttendees` (unlike the existing server-side "Status" checked-in filter and Email dispatch filter) | parked | Redesign | Backend | Added 2026-07-14 as part of a Phase A QA pass matching `design_attendee_screen.png`'s facets. Kept client-side to avoid an API-contract change for a visual-parity fix. Trade-off: the "N registered" total/pagination is unaffected by this filter (still reflects the server-side Status/dispatch filters only), so on a filtered page a user could see fewer rows than the header total implies. Revisit as a real server-side filter if this becomes a frequent operator complaint. |
| FE-REDESIGN-020 | **`OverviewView`'s "Emails scheduled this week" (and capacity fan-out) is an N+1 client-side fan-out** — one `fetchScheduledEmails` / `fetchEventCapacityStatus` call per active event (no portfolio-wide aggregate endpoint) | parked | Redesign B | Backend | Added 2026-07-14 (T046); updated T071 — registered-this-week no longer fans out (hard 0; no registration timestamp on capacity/catalog). Capacity fan-out for attendee counts is intentional (FE-REDESIGN-021 decision). Revisit with a dedicated backend aggregate if live event counts grow. |
| X-REDESIGN-010 | **Standalone Event storage-key risk** — Backend capacity/email/attendee stores may still nest under `programId` (null/empty for standalone Events). Frontend now always calls event-scoped routes; verify Backend keys by `eventId` alone (or a stable sentinel) so standalone Events do not collide or 404 | parked | Redesign | Backend | Parked 2026-07-14 with CatalogPickers cutover (Frontend-only change). Mocks pass `'_standalone'` into legacy program+event mock helpers. Pair with dual-read retirement (`X-REDESIGN-005`). |

---

## Done (archive)

| ID | Item | Completed | Notes |
| :--- | :--- | :--- | :--- |
| FE-REDESIGN-023 | **Remove unused `chart.js` / `react-chartjs-2`** | 2026-07-15 | Uninstalled; Chart.js / `ConversionChart` docs + rules cleaned up. |
| X-REDESIGN-008 | **`CELEBRATION_THEME_EMAIL` allowlist → List Parameter** | 2026-07-15 | Code already supported `string[]`; Connect Parameter type set to List in env (user confirmed). |
| X-REDESIGN-010 | **Celebration toast Parameters** (`CELEBRATION_TOAST_EMAIL` + `CELEBRATION_TOAST_MESSAGE`) | 2026-07-15 | Created in ScriptRunner Connect (user confirmed). Note: a different open item also used id `X-REDESIGN-010` for standalone Event storage-key risk — that parked row remains under Redesign. |
| FE-OPS-001 | **Register Google OAuth origins** | 2026-07-15 | User confirmed origins registered (localhost + github.io). |
| X-REDESIGN-004 | **HubSpot schema + label directionality** | 2026-07-15 | Confirmed directional labels: Event→Contact `290`/`292`, Contact→Event `291`/`293`. Adapter reads both; writes Event→Contact. **Ops:** create Connect Parameters `HUBSPOT_ASSOC_LABEL_CONTACT_REGISTERED=291` + `HUBSPOT_ASSOC_LABEL_CONTACT_CHECKED_IN=293` before deploying the Backend change. |
| FE-REDESIGN-001-UNDO | **Undo check-in UI** (`dataService.undoCheckIn` + Attendees/Check-in affordances) | 2026-07-15 | Completes T056 undo half; remove was already shipped. |
| FE-REDESIGN-022 | **Programs & Events IA** — replace All Events + Catalog admin with handoff **Programs & Events** on `#/events`; retire `#/catalog`; remove Analytics/Agenda/Settings; program-card filter + chip; HubSpot modals reused; Event Details Edit/archive in modal (not Settings) | 2026-07-14 | T075–T082. EventsView rebuilt; CatalogAdminView redirect stub; Sidebar **Programs & Events**; Event archive on `CatalogEventModal`; Vitest + `ui-routes.md` + CHANGELOG. |
| FE-REDESIGN-002 | **Copy fixes from grilling (FR-019)** — drop "auto-checks in"; QR summary labeled set; walk-in roster-lag; "HubSpot list"→"segment" | 2026-07-14 | T056 FR-019 copy: Confirm modal labeled Name/Company/Email/Account manager/Attendee type/Current status; walk-in lag + registers-only copy; Email already "HubSpot segment". Undo/remove still under FE-REDESIGN-001. |
| FE-REDESIGN-021 | **T071 portfolio rewire** — Overview / Events / EventHub / WorkingEventPicker onto `fetchCatalog` + capacity fan-out; Type & Registration closes removed | 2026-07-14 | `PortfolioEvent` mapper; T073 status derivation; hubspotId = event id (T069). Retired unused `fetchEvents` / legacy `fetchAttendees` / `fetchActivity`. Legacy Settings/Analytics/Agenda fetches retired later in T080. |
| T046 | Frontend event-first shell — `#/overview` dashboard, `EventHubView` restyled as Event Details, Sidebar working-event picker, standalone-event (`programId`/`programName`) support in `Event`/`dataService.ts` | 2026-07-14 | New `OverviewView.tsx` (4 stat tiles, upcoming events, recent activity feed), `EventHubView.tsx` module-card grid replaced with header/stats/attendee-preview/capacity/details cards, new `WorkingEventPicker.tsx` in Sidebar. See CHANGELOG.md same date for full detail; `FE-REDESIGN-020` parked for the stat-fan-out cost trade-off. |
| FE-REDESIGN-015 | Sidebar "Audit log" moved into its own group above the Theme section, matching `design_handoff 2/`'s `navAdmin` placement | 2026-07-14 | Done as part of T046's Sidebar rewrite (new `.adminSection` with `margin-top: auto`, pushed to the bottom of `<nav>`) — as planned, not fixed in isolation. |
| FE-REDESIGN-013 | `ThemeSwitcher` reworked to match `design_handoff 2/` pixel-accurately | 2026-07-13 | Was bordered pill buttons with no color indicator; now borderless full-width rows with a per-theme colored dot swatch + soft-tint-on-select, matching the prototype's `themeSidebarOptions` style block. Added fixed `--theme-swatch-{aurora,celebration,dark-aurora}` reference tokens to `tokens.css` (mirroring each theme's `--accent`) since the switcher must show all 3 themes' dot colors regardless of which theme is currently active. `ThemeSwitcher.test.tsx` unchanged (role/name/aria-pressed assertions only, no internal class-name coupling). |
| FE-REDESIGN-017 | `CapacityBar` "live" layout reworked to match `design_handoff 2/` | 2026-07-13 | Adjust (±1) buttons now sit beside the count (not below the bar); added an "Includes manual adjustment of N" note wired to `capacityStatus.departureCount`; added a "N spots remaining" line to the non-live variant. **Did not** add the design's "reset" link — that needs a new reset-adjustments write action (Backend route + audit consideration), out of scope for this pure-Frontend-layout pass; flag if wanted later. Kept the tier-severity label (an intentional pre-existing enhancement beyond the prototype). `CapacityBar.test.tsx` + `CheckInView.test.tsx` updated for the "Live capacity" label wording (was "Room capacity") and new assertions. |
| FE-REDESIGN-016 | `CheckInView` reworked to match `design_handoff 2/`'s interaction model | 2026-07-13 | Replaced the always-inline QR panel + check-in/walk-in mode-toggle radiogroup with "Start scanner"/"+ Add walk-in" buttons opening dedicated modals, plus a new "Confirm check-in" modal (shown on search-row click or successful QR scan) with name/email/company/account manager/attendee type/current status — kept **account manager** in the summary (already-decided `FE-REDESIGN-002` fixed field set) even though the specific mockup shown didn't include it. **Deliberately did not copy** the prototype's "Auto-checks in on scan" copy — that phrasing was already flagged for removal in `FE-REDESIGN-002` (grilling decision); our flow correctly requires a manual confirm step regardless of scan vs. search. `CheckInView.test.tsx` fully rewritten for the modal-based flow (24 tests, was 21). |
| FE-REDESIGN-014 | `EmailDispatchView` reworked to match `design_handoff 2/`'s information architecture | 2026-07-13 | Replaced the Compose/Scheduled/Log tab layout with a single unified "Email schedule" list (scheduled + sent dispatches merged client-side, tagged by source for per-row actions — Edit/Cancel for scheduled, click-to-expand detail for sent) + Sent/Scheduled/Drafts stat tiles (Drafts pinned to 0 per the already-parked `FE-REDESIGN-008` decision) + a "+ New campaign" button opening the existing compose form in a modal. Small `useEmailDispatchWorkflow.ts` hook change: the scheduled/log fetch effect is now unconditional (was gated on the now-removed `activeTab`), and `handleSendNow`/`handleScheduleForLater` now return a success boolean so the view knows when to close the compose modal (hook's own test suite unaffected, 11/11 still passing). `EmailDispatchView.test.tsx` fully rewritten (18 tests, was 15). |
| BE-DEPLOY-001 | Backend SFTP deploy (Phase 0 auth scripts) | 2026-07-03 | Backend-led; see Backend `TODO.md`. Phase 1 Process **step 6**. |
| FE-SEC-001 | Confirm Frontend git repo + initial commit | 2026-07-03 | Frontend on GitHub; Backend git + CI per BE-SEC-001. Phase 1 Process **step 1**. |
| FE-SEC-003 | Dependency audit in CI | 2026-07-03 | `npm audit --audit-level=high` in CI; Frontend 0 vulns. Backend `js-yaml` override bumped to 4.2.0. Phase 1 Process **step 3**. |
| FE-REDESIGN-004 | RBAC posture for redesign — admin-only shell, role-aware by design | 2026-07-13 | `T011`: `config/shellAccess.ts` gates `AppLayout`; `EventModule.minRoles` (data-driven) in `config/eventModules.ts`; non-admin sees a restricted-access screen, not the shell. |
| FE-REDESIGN-006 | Self-hosted fonts + icons (Phase A) | 2026-07-13 | `T006`–`T008`: `@fontsource-variable/manrope` (variable, 200–800) + `@fontsource/material-symbols-outlined` (static, weight-400-only — ~318KB vs. ~1.4MB variable, since the prototype only ever uses `wght 400`); `font-src 'self'` in `vite.config.ts`. Not a hand-picked per-glyph subset (ships the full Outlined icon set at one weight) — user-approved tradeoff of the npm-package sourcing option over manual glyph subsetting. |
| FE-REDESIGN-003 | Theme persistence (Phase A) — cross-device via backend, Celebration re-validated server-side | 2026-07-13 | Frontend: `T012`/`T013`/`T015`–`T017`/`T021`/`T022` (`useTheme.ts`, `ThemeSwitcher.tsx`, `dataService` mapping + mock parity, docs synced). Backend (**BE-REDESIGN-003**, `T014`/`T018`–`T020`, done from a Backend-rooted session): `UserPrefsStore.ts` + `UserPrefs.ts`, `OnGetUserPrefs.ts`/`OnPutUserPrefs.ts`, wired in `Routes.ts`. Scope expansion: session foundation had no Google subject ID — extended `Auth.ts`/`createSession`/`SessionRecord`/`OnAuthExchange.ts` to carry it. See Backend `CHANGELOG.md`/`TODO.md`. SFTP deploy + live Parameter setup (`CELEBRATION_THEME_EMAIL`, `USER_PREFS_RATE_LIMIT_PER_HOUR`) still pending before this is live in UAT/Live. |
| FE-REDESIGN-005 | Semantic token layer + 3 themes (Phase A) | 2026-07-13 | `T004`/`T005` (token layer + hex migration) + `T015`–`T017` (per-theme remap + switcher) + Phase 4 `T025`–`T031` (every view + shared component migrated onto semantic tokens — `css/base.css`, `css/components.css`, `Toast`/`LoadingState`/`EmptyState`/`ViewErrorState`/`CapacityBar`/`CatalogPickers`, all 7 views). Added `--warning`/`--warning-bg` roles beyond the original 8 to cover the Email lock-warning banner (was `FE-REDESIGN-009`). |
| FE-REDESIGN-007 | Custom shared field pickers (Phase A) | 2026-07-13 | `T010` (`SelectPicker`/`CalendarPicker`/`TimePicker` built) + Phase 4 `T032` (wired into `CatalogEventModal`, `CatalogProgramModal`, `EmailDispatchView`, replacing native date inputs and `CatalogEventModal`'s bespoke duplicate Program dropdown). Fixed a hardcoded-color SVG chevron icon (replaced with a Material Symbols glyph) and added `stopPropagation()` on picker Escape handlers so closing a popover inside a modal doesn't also close the modal. Dedicated a11y completion-gate suite is still Phase 5 (US2, T035). |
| FE-REDESIGN-009 | Two remaining hardcoded-hex spots (T005 hex-audit) | 2026-07-13 | Resolved in Phase 4 `T029`/`T030`: (1) text-on-accent white confirmed fine as-is (no theme varies accent's contrast need); (2) added `--warning`/`--warning-bg` semantic tokens (`tokens.css` + all 3 theme files) for the Email lock-warning banner instead of literal hex. |
| FE-REDESIGN-011 | Phase 5 (US2) — WCAG 2.2 contrast/focus audit + dependency + XSS proof (`T034`–`T037`) | 2026-07-13 | Audit found + fixed 5 real gaps across the 3 themes (Celebration's global focus-ring token + `--muted` text color, Dark Aurora's picker-trigger focus ring, skip-link outline on Celebration's denim, pickers' `.optionActive` roving-focus indicator — see `docs/ui-a11y-audit.md`); 2 monitor-only items parked as `FE-REDESIGN-010`. Picker completion-gate tests (18/18), dependency guard (`src/test/redesignDependencyGuard.test.ts`, 4/4), and the one missing view XSS guard (`CatalogAdminView.test.tsx`) added. 39 files / 258 tests passing, clean `tsc`/`eslint`. |
| FE-REDESIGN-012 | Phase 6 (US3) — rollout + in-flight slice compatibility confirmation (`T038`–`T039`) | 2026-07-13 | Documented the foundation-first rollout order in `quickstart.md` §B (no IA rebuild at any step); confirmed `App.tsx` routes, `eventModules.ts`/`shellAccess.ts` RBAC config, Slice 004 capacity logic, and Slice 005 dispatch logic all untouched by the redesign diff; Slice 006 has no view built yet. **Phase A (US1/US2/US3/US4) is now fully complete** — only Phase B remains, gated on `X-REDESIGN-001`. |
| FE-SEC-005 | Self-host `chart.js` | 2026-07-03 | `chart.js` + `react-chartjs-2` npm deps; bundled via Vite (R3c). Legacy CDN removed (R4). |
| FE-SEC-007 | ESLint ban `dangerouslySetInnerHTML` | 2026-07-03 | `eslint.config.js` (R4). Phase 1 Process **step 5**. |
| FE-SEC-004 | Tighten CSP `img-src` | 2026-07-03 | `vite.config.ts` — Google hosts only. Foundation **step 4**. |
| BE-OPS-003 | Live auth E2E sign-off | 2026-07-03 | User confirmed. Foundation **step 7**. |
| FE-TEST-006 | Test validation playbook | 2026-07-03 | Tier 1 spot-checks + Backend/Frontend CI red/green proof. Foundation **step 10**. |
| FE-ARCH-001 | R0 — Scaffold Vite + React + TS | 2026-07-03 | Build → `dist/`; CI; Pages via GitHub Actions. |
| FE-ARCH-002 | R1 — Shell + routing + auth | 2026-07-03 | `App.tsx`, hash routes, session context, GIS login. |
| FE-ARCH-003 | R2 — Data layer | 2026-07-03 | `dataService.ts`, `normalizeApi.ts`, `useDataService()`, unit tests. |
| FE-ARCH-004 | R3 — Port all views (R3a–R3f) | 2026-07-03 | Events through Email; 37 Vitest specs. |
| FE-ARCH-005 | R4 — Cleanup | 2026-07-03 | Deleted `js/`, `dev-server.mjs`; ESLint on `src/`; docs/rules updated. Merged to `main`. |
| FE-DEPLOY-002 | Deploy catalog metadata modals (`002-catalog-metadata-modal`) — Git push Frontend + SFTP Backend catalog PATCH handlers | 2026-07-05 | User sign-off. Next Slice 1 gate: **HubSpot schema verification** → `docs/hubspot-schema.md`. |
| FE-SLICE1-001 | Catalog navigation + admin UI (`CatalogPickers`, `#/catalog`, live API) | 2026-07-04 | Spec `001-catalog-admin`; quickstart T054 pass. |
| FE-SLICE1-002 | Attendee list view (`AttendeesView`, `#/events/attendees`) | 2026-07-06 | Spec `003-check-in` US1; XSS render tests; live on UAT. |
| FE-SLICE1-003 | Check-in module (QR, name search, walk-in iframe) | 2026-07-07 | Spec `003-check-in` US2+US3; live QR **B4b** pass 2026-07-07. |
| FE-SLICE1-004 | UI role gating for `admin` (Attendees, Check-in, Catalog) | 2026-07-06 | Sidebar + view redirects; backend still enforces. |
| FE-SLICE1-007 | Live QR scanner QA (`quickstart` **B4b**) | 2026-07-07 | Pairs **BE-SLICE1-007**. |
| FE-PROD-001 | Connect live HubSpot data for Slice 1 routes | 2026-07-07 | Catalog, attendees, check-in live on UAT. Capacity handlers coded; SFTP deploy blocked (**BE-CAP-001**). |
| FE-CAP-IMPL | 004 capacity UI + dataService (indicator, tiers, ±1) | 2026-07-07 | Spec `004-capacity-management` T001–T042; 153 Frontend tests. Live QA blocked (**FE-CAP-001**). |
| FE-TECH-002 | Move list filter helpers to `src/utils/listFilters.ts` | 2026-07-07 | `filterAttendees`, `searchEvents`, etc. out of `mockData.ts`. |
| FE-TECH-004 | Remove dead mock short-circuit in `api/client.ts` | 2026-07-07 | `dataService.withMockFallback` owns mock routing; `skipMock` removed from auth calls. |
| FE-TECH-006 | Catalog modal focus trap | 2026-07-07 | `useModalFocusTrap` on Program/Event modals — Tab cycle, Esc dismiss, return focus. |
| FE-SLICE15-001 | Disable production source maps | 2026-07-07 | `vite.config.ts` — `build.sourcemap: false`; dev HMR and Vitest unchanged. Slice 1.5 Tier A step A7. |
| FE-SLICE15-002 | Audit viewer UI (`#/audit`) | 2026-07-07 | `AuditView` + sidebar link; `GET audit/recent` via `fetchAuditLog`; admin-only; no PII beyond actor email. Pairs **BE-SLICE15-006**. Slice 1.5 Tier A step A8. |
| X-SLICE15-001 | Tier A sign-off checklist | 2026-07-07 | [specs/slice-1.5-tier-a/signoff-checklist.md](specs/slice-1.5-tier-a/signoff-checklist.md) — A1–A9 complete; UAT → Live PR #7. |
| FE-TEST-001 | Vitest + React Testing Library + jsdom | 2026-07-03 | `vite.config.ts` test block + `src/test/setup.ts`. |
| FE-TEST-002 | Unit tests for pure logic | 2026-07-03 | `normalizeApi`, `dataService`, `navigation`, `format`. Optional follow-up: `appState`, `eventModules`. |
| FE-TEST-003 | XSS render tests | 2026-07-03 | All 8 module views + `RoutePlaceholder`. Optional follow-up: `LoginView`. |
| FE-TEST-004 | Frontend test CI | 2026-07-03 | `npm test` in `.github/workflows/ci.yml`. Phase 1 Process **step 9**. |
| FE-TECH-001 | Extract event-scoped view loader | 2026-07-03 | Obsoleted by React `useEffect` + `EmptyState`/`TopBar` (R3). |
| FE-TECH-003 | Remove unused module `root` vars | 2026-07-03 | Vanilla views deleted in R4. |
| FE-TECH-005 | `htmlToElement` unused | 2026-07-03 | Vanilla `dom.js` deleted in R4. |
| FE-PROD-002 | Demo/sample events in mock data | 2026-07-02 | 6 events, attendees, agenda, metrics, activity. |
| X-006 | Frontend React + Vite build in CI/deploy | 2026-07-03 | Lint + test + build on PR/push; Pages deploy on `main`. Backend runtime unaffected. |
| — | Phase 0 live auth wiring | 2026-07-02 | GIS → `/auth/exchange` → Bearer session |
| — | CSP `connect-src` tightened (vanilla era) | 2026-07-02 | Production CSP now in `vite.config.ts` |
| — | XSS prevention documented | 2026-07-02 | Rules, AGENTS, blueprint; ESLint enforcement added 2026-07-03 (FE-SEC-007) |
| — | EMS PoC shell (vanilla) | 2026-07-02 | Superseded by React migration (FE-ARCH-001–005) |
| — | Phase 0 cleanup + pre–Phase 1 hardening | 2026-07-02 | See CHANGELOG |
