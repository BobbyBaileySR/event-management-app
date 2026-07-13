# Frontend TODO — Adaptavist EMS

Parked work, optional hardening, and deferred decisions for the static EMS UI.

**Not a defect list.** Items here were skipped, scheduled for a later phase, or blocked on external setup.

**AI agents:** When the user skips or defers work, add an entry here (see `../.cursor/rules/ems-todo-discipline.mdc`).

> **Last updated:** 2026-07-12 (UI-redesign grilling re-run vs `design_handoff 2` — UI platform theming/typography + Phase A/B split; see [ADR-007](docs/decisions/007-hubspot-custom-objects-registration.md) / [ADR-008](docs/decisions/008-standalone-events-event-first-nav.md) / [ADR-009](docs/decisions/009-redesign-ui-platform-theming-typography.md))

---

## Remaining roadmap — after the redesign week

Forward-looking summary (added 2026-07-12). **Next week's planned work (2026-07 W3):**

1. **Redesign Phase A** — semantic token layer + 3 themes (incl. Dark Aurora) + switcher, self-hosted Manrope + Material Symbols, shared a11y field pickers, theme persistence (`FE-REDESIGN-003/005/006/007`; backend `BE-REDESIGN-003`).
2. **HubSpot UAT** — ✅ **2 custom objects created in UAT 2026-07-13** (Program `2-65757052` "Event Programs"; Event `2-65757130` "Event Items"; Program→Event association `286`). **Remaining:** add attributes + Contact↔Event association/labels (`X-REDESIGN-004`), run the workflow-association test (gate #2), and set the ScriptRunner Connect UAT **Parameters** for the IDs (see [docs/hubspot-schema.md](docs/hubspot-schema.md)).
3. **Redesign Phase B** — event-first IA/routing, standalone Events, registration-as-association, live capacity ±1, Campaign modal + copy fixes (`FE-REDESIGN-001/002/004`; `X-REDESIGN-003/005/006`).
4. **Full E2E testing** of **Slice 004** (capacity — `X-009` / `FE-CAP-001`) and **Slice 005** (email dispatch) once the redesign lands. Also verifies the **walk-in path** (`X-008`), since feasibility gate #2 confirms workflow-written registrations.
5. **Production API proxy** — hope ScriptRunner Connect fixes its **OPTIONS preflight bug** next week; **if not, stand up the Cloudflare proxy before end of week** (`FE-OPS-002` / `FE-INFRA-001`).

**Roadmap remaining after that week:**

| Item | Ref | Notes |
| :--- | :--- | :--- |
| **Slice 007** — audit log operator UX | `X-SLICE007-001`, `FE-SLICE007-001/002` | Backend audit index → true paging, readable Resource column, server-side filters + Apply. ~1–1.5 wks. |
| **Slice 1.5 Tier B** — enterprise ops | B1–B9 (`FE-SLICE15-003/004`, `FE-OPS-004`) | Audit export, operator role UI gating, Cloudflare **Access**, retention/session hardening (backend), monitoring, pen test, runbooks. |
| **QR generation** | `FE-QR-GEN-001` (pairs `BE-QR-GEN-001`) | Pre-event ticket emails w/ full ~550–800+ char JWT. Slice 2+. |
| **Later product APIs** | `BE-PROD-002`, `BE-PROD-001` | Event read APIs + analytics — backend-led, surfaced later in UI. |
| **Optional / parked polish** | `FE-TECH-007`, `FE-REDESIGN-008`, `BE-TECH-005` | Data-seam reshape (31 endpoints → feature adapters), campaign drafts, last backend handler migration. |
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
| FE-OPS-001 | **Register deployment origins** in Google Cloud Console (OAuth authorized JavaScript origins) | planned | Before staff UAT/Live URLs | Backend | Add `https://bobbybaileysr.github.io`, localhost origins. One github.io origin covers both UAT and Live project Pages. Mirror in ScriptRunner `ALLOWED_ORIGINS` per environment. See [docs/environments.md](docs/environments.md). |
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
| FE-SLICE007-002 | **Audit Resource column readability** — human labels (`Event`, `Program`, etc.); show ID as secondary; use `resourceLabel` from API when present; fix `AnalyticsView` paginated audit (`isAuditLogListResult` branch) | planned | 007 | Backend | Display layer in `auditDisplay.ts` + `AuditView`. Pairs **BE-SLICE007-002** (optional catalog name lookup on current page). |

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

---

## Redesign initiative — UI redesign + custom objects (grilling 2026-07-12)

Outcome of the `grill-with-docs` session(s) on the redesign (design package: `Frontend/design_handoff 2/`; earlier `Frontend/ClaudeDesignHandoff` superseded). **Data model** decisions: [ADR-007](docs/decisions/007-hubspot-custom-objects-registration.md) (HubSpot custom objects + registration-as-association + per-registration Record Storage) and [ADR-008](docs/decisions/008-standalone-events-event-first-nav.md) (standalone Events + event-first navigation); target vocabulary in [CONTEXT.md](CONTEXT.md) § *Redesign transition — target model*. **UI platform** decisions (theming, typography, icons, field pickers, phasing): [ADR-009](docs/decisions/009-redesign-ui-platform-theming-typography.md) (2026-07-12 re-run against `design_handoff 2`). Mirror in [../Backend/TODO.md](../Backend/TODO.md).

**Delivery is phased ([ADR-009](docs/decisions/009-redesign-ui-platform-theming-typography.md) §10):**

- **Phase A (unblocked now):** the visual foundation — semantic token layer + 3 themes (incl. Dark Aurora), self-hosted Manrope + Material Symbols, shared a11y field pickers, theme switcher + backend preference. No custom-object dependency.
- **Phase B (blocked on X-REDESIGN-001 feasibility slots):** event-first IA/routing, standalone Events, registration-as-association, live capacity/occupancy ±1, Campaign modal. **Nothing in Phase B ships until the feasibility gates pass.**

| ID | Item | Status | Slice | Also affects | Notes |
| :--- | :--- | :---: | :--- | :--- | :--- |
| X-REDESIGN-001 | **Feasibility gates** — (1) **2 custom-object slots** ✅ created in UAT 2026-07-13 (Program `2-65757052`, Event `2-65757130`); (2) **workflows can set Contact↔Event association** — **assumed, needs a UAT test workflow** (tasks.md T066); (3) **≤10 association labels** ✅ (Program→Event = association `286`; Contact↔Event needs 2 labels `registered`/`checked-in` — attendee type deferred to Parts-Attended flags); (4) standard security write-gate | in progress | Redesign | Backend | Gates #1/#3 met. Remaining: gate #2 test + write-gate. IDs → ScriptRunner Parameters (R-012). |
| X-REDESIGN-002 | **`CustomObjectAdapter` design-it-twice** — the storage model is settled (labels + Record Storage) but the **adapter interface** shape is not. Run `codebase-design` design-it-twice before implementation | planned | Redesign | Backend | ADR-005 seam's 2nd implementation. Pairs **BE-REDESIGN-001**. |
| X-REDESIGN-003 | **Event-first routing / api-contract** — Slice routes are `programs/{programId}/events/{eventId}/…`; event-first needs **event-scoped routes** or optional `programId`. Breaking contract change — update `api-contract.md` + `rbac.md` + `RouteGuard` together | planned | Redesign | Backend | ADR-008 consequence. Design-it-twice first. |
| X-REDESIGN-004 | **`docs/hubspot-schema.md` update + verify** — object types ✅ recorded (UAT IDs + proposed property API names + Program→Event assoc `286`); **remaining:** HubSpot team creates the attributes + Contact↔Event association/labels, then verify **confirmed** property API names + label type IDs against live HubSpot before any write (tasks.md T067/T049) | in progress | Redesign | Backend | Proposed schema handed off in hubspot-schema.md § *Redesign custom objects*. Write-gate prerequisite. |
| X-REDESIGN-005 | **Migration / backfill** — map existing Contact-property attendance + Parts-Attended → objects/associations; EMS catalog IDs stay stable (map to HubSpot IDs inside adapter). Dual-read window TBD | planned | Redesign | Backend | ADR-005 migration triggers. |
| X-REDESIGN-006 | **`/speckit-specify` the redesign** — turn ADR-007/008 + design handoff into a formal spec (or per-surface specs) before build | done | Redesign | Both | Spec + plan + tasks in `Frontend/specs/007-redesign-initiative/`. |
| X-REDESIGN-007 | **ScriptRunner Connect Parameters for HubSpot IDs** — set `HUBSPOT_OBJECT_TYPE_PROGRAM`/`_EVENT`, `HUBSPOT_ASSOC_PROGRAM_TO_EVENT`, `HUBSPOT_ASSOC_CONTACT_EVENT`, `HUBSPOT_ASSOC_LABEL_REGISTERED`/`_CHECKED_IN` per env; adapter reads at runtime (no hardcoded IDs) | planned | Redesign | Backend | UAT values in [docs/hubspot-schema.md](docs/hubspot-schema.md); research R-012; tasks.md T065. |
| FE-REDESIGN-001 | **New/redesigned surfaces (Phase B)** — event-first Overview/Events, standalone-Event flows, Check-in Live Capacity ±1, Campaign modal (compose/edit/delete) + campaign-detail per-Contact outcome, remove-attendee + undo-check-in affordances, real-fetch skeletons + "Did you know?" only on slow loads | planned | Redesign B | Backend | Per grilling decisions + `design_handoff 2`. Break into per-surface tasks after X-REDESIGN-006. Theming/typography split out to **FE-REDESIGN-005/006/007** (Phase A). |
| FE-REDESIGN-002 | **Copy fixes from grilling** — remove "automatically checks in on scan" / "auto-checks in" wording; QR summary fixed set = name, company, email, account manager, attendee type, current status; walk-in UI must set the **roster propagation-lag** expectation (form submit → attendee not instantly on the roster); rename prototype's **"HubSpot list" → "segment"** ([CONTEXT.md](CONTEXT.md) *HubSpot contact segment*) | planned | Redesign | — | Small, do alongside FE-REDESIGN-001 QR/walk-in surfaces. |
| FE-REDESIGN-005 | **Semantic token layer + 3 themes (Phase A)** — two-tier tokens (primitive brand + semantic role layer: surface/panel/border/text/muted/accent/accent-soft/status…); themes remap **only** semantic tokens; components reference semantic tokens via CSS modules (**no inline `var(--x)` per element**). Themes: **Aurora** (default light, replaces today's default), **Celebration** (prototype pink `#EC6C93`, WCAG contrast-checked), **Dark Aurora** (net-new dark). Move any hardcoded hex in components onto semantic tokens so dark renders. Add **user-chosen theme switcher**, Celebration allowlist-gated | planned | Redesign A | — | [ADR-009](docs/decisions/009-redesign-ui-platform-theming-typography.md) §1–§4. Global token refactor; ship with tests. **Token layer, per-theme remap (all 3 themes), and switcher all done** (T004/T005/T015–T017, 2026-07-13). Still pending: migrating each *view's* remaining hardcoded/primitive colour usage onto the semantic layer — that's Phase 4 (US1, T025–T031), not this item. |
| FE-REDESIGN-007 | **Custom shared field pickers (Phase A)** — reusable calendar / time / select popovers matching all 3 themes (extend `CatalogPickerSelect`). **Keyboard nav + ARIA + screen-reader support is a completion gate** | planned | Redesign A | — | [ADR-009](docs/decisions/009-redesign-ui-platform-theming-typography.md) §8; see [docs/ui-a11y-audit.md](docs/ui-a11y-audit.md). **Components built** (T010, 2026-07-13: `SelectPicker`/`CalendarPicker`/`TimePicker`, keyboard+ARIA+focus-return, basic Vitest coverage) — themes now fully filled (FE-REDESIGN-005), so visual theme parity is unblocked; dedicated a11y completion-gate suite is still Phase 5 (US2, T035). |
| FE-REDESIGN-008 | **Campaign drafts** — persisted draft-campaign state (save half-composed, resume, edit, delete) | parked | Redesign | Backend | [ADR-009](docs/decisions/009-redesign-ui-platform-theming-typography.md) §9. Deferred from redesign; prototype's Drafts stat omitted/zeroed for now. Revisit if the events team wants it. |
| FE-REDESIGN-009 | **Two remaining hardcoded-hex spots (T005 hex-audit)** — (1) text-on-accent white (`CatalogAdminView.module.css` `.tabActive`/`.primary`, `color: #fff` on `--color-denim`/`--color-orange` backgrounds) has no semantic "on-accent" role in the current 8-role layer; (2) `EmailDispatchView.module.css` `.lockWarningBanner`/`.lockBadge` amber `#fff4e5`/`#7a4d00` has no "warning" status role (only success/info/danger exist) | parked | Redesign A | — | Left as literal hex during T004/T005 (Foundational) to avoid inventing roles outside R-001's defined set. Revisit in T029 (US1 Email restyle) / T025 (US1 shell restyle) — either add `--on-accent`/`--warning` roles then, or confirm current hex is fine as-is. |

---

## Done (archive)

| ID | Item | Completed | Notes |
| :--- | :--- | :--- | :--- |
| BE-DEPLOY-001 | Backend SFTP deploy (Phase 0 auth scripts) | 2026-07-03 | Backend-led; see Backend `TODO.md`. Phase 1 Process **step 6**. |
| FE-SEC-001 | Confirm Frontend git repo + initial commit | 2026-07-03 | Frontend on GitHub; Backend git + CI per BE-SEC-001. Phase 1 Process **step 1**. |
| FE-SEC-003 | Dependency audit in CI | 2026-07-03 | `npm audit --audit-level=high` in CI; Frontend 0 vulns. Backend `js-yaml` override bumped to 4.2.0. Phase 1 Process **step 3**. |
| FE-REDESIGN-004 | RBAC posture for redesign — admin-only shell, role-aware by design | 2026-07-13 | `T011`: `config/shellAccess.ts` gates `AppLayout`; `EventModule.minRoles` (data-driven) in `config/eventModules.ts`; non-admin sees a restricted-access screen, not the shell. |
| FE-REDESIGN-006 | Self-hosted fonts + icons (Phase A) | 2026-07-13 | `T006`–`T008`: `@fontsource-variable/manrope` (variable, 200–800) + `@fontsource/material-symbols-outlined` (static, weight-400-only — ~318KB vs. ~1.4MB variable, since the prototype only ever uses `wght 400`); `font-src 'self'` in `vite.config.ts`. Not a hand-picked per-glyph subset (ships the full Outlined icon set at one weight) — user-approved tradeoff of the npm-package sourcing option over manual glyph subsetting. |
| FE-REDESIGN-003 | Theme persistence (Phase A) — cross-device via backend, Celebration re-validated server-side | 2026-07-13 | Frontend: `T012`/`T013`/`T015`–`T017`/`T021`/`T022` (`useTheme.ts`, `ThemeSwitcher.tsx`, `dataService` mapping + mock parity, docs synced). Backend (**BE-REDESIGN-003**, `T014`/`T018`–`T020`, done from a Backend-rooted session): `UserPrefsStore.ts` + `UserPrefs.ts`, `OnGetUserPrefs.ts`/`OnPutUserPrefs.ts`, wired in `Routes.ts`. Scope expansion: session foundation had no Google subject ID — extended `Auth.ts`/`createSession`/`SessionRecord`/`OnAuthExchange.ts` to carry it. See Backend `CHANGELOG.md`/`TODO.md`. SFTP deploy + live Parameter setup (`CELEBRATION_THEME_EMAIL`, `USER_PREFS_RATE_LIMIT_PER_HOUR`) still pending before this is live in UAT/Live. |
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
