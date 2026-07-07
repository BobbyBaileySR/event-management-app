# Frontend TODO — Adaptavist EMS

Parked work, optional hardening, and deferred decisions for the static EMS UI.

**Not a defect list.** Items here were skipped, scheduled for a later phase, or blocked on external setup.

**AI agents:** When the user skips or defers work, add an entry here (see `../.cursor/rules/ems-todo-discipline.mdc`).

> **Last updated:** 2026-07-07 (PM — Slice 1.5 Tier A complete; Tier B next)

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
| FE-OPS-002 | **Production API proxy** (Cloudflare Worker or equivalent) | blocked | Production | Backend | Blocked — no Cloudflare access yet; ScriptRunner OPTIONS/CORS unresolved for direct browser calls. Local dev uses Vite proxy + `dev-server.config.js`. |
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

_All optional polish items below are done — see **Done (archive)**._

| ID | Item | Status | Phase | Also affects | Notes |
| :--- | :--- | :---: | :--- | :--- | :--- |
| FE-TECH-005 | **Audit display: surface previous/new values when backend adds them** | planned | Slice 1.5 | Backend | **→ FE-SLICE15-002** (viewer) + **BE-SLICE15-005** (field-level PATCH audit). Surface `metadata.previous` / `metadata.next` in audit viewer when present. |

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

---

## Done (archive)

| ID | Item | Completed | Notes |
| :--- | :--- | :--- | :--- |
| BE-DEPLOY-001 | Backend SFTP deploy (Phase 0 auth scripts) | 2026-07-03 | Backend-led; see Backend `TODO.md`. Phase 1 Process **step 6**. |
| FE-SEC-001 | Confirm Frontend git repo + initial commit | 2026-07-03 | Frontend on GitHub; Backend git + CI per BE-SEC-001. Phase 1 Process **step 1**. |
| FE-SEC-003 | Dependency audit in CI | 2026-07-03 | `npm audit --audit-level=high` in CI; Frontend 0 vulns. Backend `js-yaml` override bumped to 4.2.0. Phase 1 Process **step 3**. |
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
