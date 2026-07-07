# Frontend Changelog

All notable changes to the Adaptavist EMS frontend (UI, static assets, frontend docs, and Cursor rules in this folder).

Format: entries grouped by date (newest first). One bullet per logical change.

---

## 2026-07-07

### Slice 1.5 Tier A — step A6: PR security review (Bugbot fallback)

- **`.github/pull_request_template.md`**: EMS security checklist on every PR.
- **`docs/security-review-process.md`**: author/reviewer workflow — local checks, **`/review-security`**, human approval, CI gates. Bugbot not approved on company GitHub.
- **`docs/CONTRIBUTING.md`**: linked security review process from PR checklist.
- **`TODO.md`**: **FE-SEC-002** / step A6 done.

### Slice 1.5 Tier A — admin audit viewer (A8 frontend)

- **`AuditView.tsx`** (`#/audit`): paginated table of recent audit entries via existing `dataService.fetchAuditLog()` → `GET audit/recent`; admin-only redirect and sidebar link.
- **`src/types.ts`**: `AuditLogEntry` / `AuditLogListResult` for Slice 1.5 API shape (distinct from legacy email-dispatch `AuditEntry` used by Analytics mock).
- **`src/utils/auditDisplay.ts`**: metadata formatting with PII key denylist — actor email only in the list.
- **`mockData.ts`**: `MOCK_SLICE_AUDIT_LOG` sample entries for mock mode.
- **`dataService.ts`**: `fetchAuditLog` overloads — global list returns paginated `AuditLogListResult`; event-scoped call unchanged for Analytics mock.
- **`docs/ui-routes.md`**, **`Sidebar.tsx`**, routing — register `#/audit`.
- **Tests:** `AuditView.test.tsx`, `Sidebar.test.tsx` audit link coverage.

### Slice 1.5 Tier A — audit log API contract (A8 backend)

- **`docs/api-contract.md`**: document `GET audit/recent` and `GET events/{id}/audit` — paginated Record Storage audit log, admin-only, known action names.
- **`docs/rbac.md`**: audit routes restricted to **admin** (Slice 1.5).

### Slice 1.5 Tier A — disable production source maps (A7)

- **`vite.config.ts`**: set `build.sourcemap: false` so production GitHub Pages bundles do not ship `.map` files that expose application source (**FE-SLICE15-001**). Dev HMR and Vitest are unchanged — only `vite build` output is affected.

### CI — `listFilters.test.ts` type error

- **`listFilters.test.ts`**: add required `description` field to event fixtures so `tsc --noEmit` passes — `Event` gained `description` during catalog metadata work but this test file was missed by the prior CI fix.

### Optional polish — pre–Slice 1.5 clean slate

- **`src/utils/listFilters.ts`**: moved attendee/event filter and search helpers out of `mockData.ts` (**FE-TECH-002**).
- **`src/api/client.ts` / `authService.ts`**: removed dead `USE_MOCK_API` short-circuit and `skipMock` flag — `dataService.withMockFallback` owns mock routing (**FE-TECH-004**).
- **`src/hooks/useModalFocusTrap.ts`**: Tab cycle, Escape dismiss, and return-focus on catalog Program/Event modals (**FE-TECH-006**).
- **`TODO.md`**: archived **FE-TECH-002/004/006**; test count **160** (28 files).

### Slice 1 housekeeping — pre–Slice 1.5 clean slate

- **`TODO.md`**: Slice 1 close-out table (two external blockers only); archived **FE-SLICE1-002/003/004/007**, **FE-PROD-001**, **FE-CAP-IMPL**; reorganized Product section; test count **153** (27 files).
- **`specs/003-check-in/tasks.md`**: close-out status — T072 B5c + 004 live QA remain; T060/B4b marked done.
- **`specs/004-capacity-management/tasks.md`**: T001–T042 marked complete; status section for blocked T043–T044.
- **`specs/004-capacity-management/quickstart.md`**: Manual QA log table added.
- **`CONTEXT.md`**: last-updated note.

### Toast — larger on desktop

- **`Toast.module.css`**: double desktop toast dimensions (min-width, max-width, padding, font size) from 901px up; mobile and tablet unchanged.

### Catalog — walk-in form URL not shown after save

- **`normalizeApi.ts`**: include `walkInFormUrl` when normalizing catalog Event nodes from `GET /catalog` — the field was saved on the backend but stripped on reload, so the Event modal appeared blank on reopen and Check-in **Walk-in** mode showed “No walk-in form URL configured” despite a valid catalog value.
- **`mockData.ts`**: persist `walkInFormUrl` on mock create/update for parity with live catalog.

### Check-in QR — desktop scanner viewport clipping

- **`CheckInQrPanel`**: size the scan region from the reader container (ResizeObserver + viewfinder-aware `qrbox` function) instead of `window.innerWidth`, so the shaded scan box fits inside the camera feed on desktop two-column layout.
- **`CheckInQrPanel.module.css`**: keep the reader square with `aspect-ratio: 1` only — removed `max-height` / viewport `min-height` rules that squashed the feed on wide columns; video uses `object-fit: cover` within the square frame.

### Check-in QR — long JWT payload documentation

- **`docs/hubspot-schema.md`**: § QR payload size — RS256 JWT ~550–800+ chars; generation must encode full token; ~400-char web QR cap causes `invalid_checkin_signature` on scan.
- **`specs/003-check-in/quickstart.md`**: B4b test QR generation (`qrcode` / `qrencode`); troubleshooting rows for truncated QR and malformed JWT paste.
- **`CONTEXT.md`**: QR capacity note for future email/ticket generation.
- **`TODO.md`**: **FE-QR-GEN-001** (pairs **BE-QR-GEN-001**) — planned work before shipping registrant QR minting.

### 004-capacity-management — Check-in live attendance indicator

- **`CapacityBar`**: extended with optional live variant, 75%/90% tier styling, and paired ±1 controls; Event Hub registered fill unchanged.
- **`CapacityBar` (live)**: desk-focused layout — large on-site count, prominent percentage, thicker bar, tier badge, and touch-sized ±1 controls with Left/Correction hints.
- **`CheckInView`**: loads capacity snapshot on mount and after confirm check-in; indicator above Check-in/Walk-in mode switch; count-only hint when Event capacity unset (FR-006); surfaces capacity API errors with Retry instead of hiding the section silently.
- **`CheckInView.module.css`**: desk toolbar groups capacity card + full-width mode switch; responsive spacing and walk-in iframe heights for tablet/phone; divider and larger separated Check-in/Walk-in controls below capacity adjustments.
- **`catalogContext` / `CatalogPickers`**: `CatalogSelection.capacity` from selected Event.
- **`dataService`**: `fetchCapacityStatus`, `adjustCapacity` with mock parity in `mockData.ts`.
- **`utils/capacityTier.ts`**: tier and percentage helpers.
- **Docs**: capacity routes in `docs/api-contract.md` and `docs/rbac.md`.
- **Tests**: `capacityTier`, `CapacityBar`, `CheckInView` capacity integration, `dataService` mock adjust, `normalizeCapacityStatusResponse`.
- **CI**: fixed TypeScript errors in test harnesses after `CatalogSelection.capacity` — Vitest passes without typecheck; `npm run build` (`tsc --noEmit`) was failing in GitHub Actions.

### US3 walk-in — CSP + contract sync (Phase D)

- **`vite.config.ts`**: production CSP `frame-src` extended with `https://*.hubspot.com`, `https://*.hsforms.com`, `https://share.hsforms.com` for Walk-in iframe embed (NFR-004).
- **`docs/api-contract.md`**: merged Event `walkInFormUrl` from `specs/003-check-in/contracts/catalog-event-walkin.md`; removed provisional `POST …/walkin` — US3 walk-in is HubSpot iframe only.

### US3 walk-in — Check-in mode switch (Phase C)

- **`catalogContext.tsx`** + **`CatalogPickers.tsx`**: `walkInFormUrl` carried in catalog selection from the selected Event.
- **`CheckInView.tsx`**: **Check-in | Walk-in** segmented control; walk-in shows staff hint + HubSpot iframe (or empty/invalid states); QR and search unmounted in walk-in mode; mode resets on Program/Event change.
- **`CheckInView.test.tsx`**: Vitest for mode toggle, iframe src, empty state, invalid URL guard, QR unmount, and catalog reset.

### US3 walk-in — Event catalog field (Phase B)

- **`CatalogEventModal.tsx`**: optional **Walk-in form URL (HubSpot)** field with client-side allowlist validation (`isAllowedHubSpotFormUrl`); included on create/patch and clear-on-save via PATCH `null`.
- **`CatalogEventModal.test.tsx`**: Vitest coverage for valid URL save, optional empty field, HTTPS/host validation errors, and edit clear.

## 2026-07-06

### Attendees pagination loading feedback

- **`AttendeesView`**: table overlay spinner + dimmed rows, pagination **Loading page…** label, and disabled Prev/Next while a page fetch is in flight — fixes missing feedback when changing pages on multi-page lists.

### Slice 1 polish

- **`Sidebar.test.tsx`**: admin + catalog gating for Attendees / Check-in slice links; navigation to `sliceModulePath`.
- **`src/test/setup.ts`**: `html5-qrcode` mock uses prototype class so `CheckInQrPanel` spies work in full suite.

### Slice 1 — Attendees & Check-in (003)

- **`AttendeesView.tsx`**: catalog-scoped registered list (`#/events/attendees`); columns, debounced search, checked-in filter, server-side pagination, admin redirect, `LoadingState` skeleton/spinner.
- **`CheckInView.tsx`**: name search (≥2 chars, server `q`), summary + idempotent confirm, debounced non-blocking refresh (`#/events/check-in`).
- **`CheckInQrPanel.tsx`**: self-hosted `html5-qrcode` scanner; mock simulate path; StrictMode lifecycle cleanup.
- **`dataService.ts`**, **`normalizeApi.ts`**, **`types.ts`**, **`mockData.ts`**: `fetchSliceAttendees`, `checkInScan`, `confirmCheckIn` + normalizers.
- **`navigation.ts`**: `sliceModulePath()` for catalog-scoped slice routes.
- **Tests**: AttendeesView (incl. non-admin redirect, pagination, XSS); CheckInView + CheckInQrPanel; `normalizeSliceAttendeesResponse`; dataService slice paths.

### Slice 1 QA — live QR deferred

- **`specs/003-check-in/quickstart.md`**: §8 sign-off no longer requires live QR; new **§10** end-of-Slice 1 checklist for camera + Event JWT validation. Manual QA log updated (§3–§4, §8–§9 pass; §10 pending).
- **`TODO.md`**: **FE-SLICE1-007** for end-of-Slice 1 QR QA. **`tasks.md`**: T060 added; T055–T057 marked done.

### AI token optimization

- **Slimmed [AGENTS.md](AGENTS.md)** to index + essentials (~80 lines); detail moved to `docs/setup.md` pointer and `.cursor/rules/`.
- **Shared EMS rules** consolidated to repo root [`.cursor/rules/`](../.cursor/rules/) — removed duplicate Frontend copies; process rules (changelog, testing, TODO, API contract, code quality) now glob-scoped.
- **Trimmed `frontend-ems-core.mdc`** reading list; security rule links to root process rules.
- **Archived** one-time `setup-matt-pocock-skills` to `.cursor/skills/_archive/`.
- Updated spec/constitution links to root rule paths.

### Architecture

- **[docs/decisions/006-portable-backend-boundary.md](docs/decisions/006-portable-backend-boundary.md)**: Platform adapter boundary for ScriptRunner → future Lambda migration; cross-links Backend `Utils/Platform/`.

## 2026-07-04

### UAT / Live environments and multi-machine setup

- **`VITE_EMS_ENV`** build injection (`uat` \| `live`) in [`src/config.ts`](src/config.ts); local dev defaults to UAT via [`.env.development`](.env.development).
- **`PocBanner`**: orange UAT banner when `EMS_ENV === 'uat'`; Vitest coverage in `PocBanner.test.tsx`.
- **CI:** [`ci.yml`](.github/workflows/ci.yml) sets `VITE_EMS_ENV=live` for Live Pages; new [`deploy-uat.yml`](.github/workflows/deploy-uat.yml) deploys `uat` branch to `event-management-app-uat`.
- **Docs:** [`docs/environments.md`](docs/environments.md), [`docs/multi-machine.md`](docs/multi-machine.md); OAuth and config tables updated in [`docs/setup.md`](docs/setup.md).
- **Backend:** [`../Backend/.vscode/sftp.json.example`](../Backend/.vscode/sftp.json.example) and UAT/Live section in [`../Backend/README.md`](../Backend/README.md).

### Catalog metadata & modal forms (002-catalog-metadata-modal)

- **Bug fix — mobile Program dropdown mispositioned:** `CatalogEventModal`'s native `<select>` for Program rendered its options popup detached (top-left of viewport) on mobile, because the modal sits inside nested scroll/overflow containers (`AppLayout` `.content`/`.main`) that break native `<select>` popup positioning on mobile browsers — the same issue already fixed for `CatalogPickers`. Replaced with an in-place custom dropdown (button + `role="listbox"`), matching the `CatalogPickerSelect` pattern; added regression tests (`CatalogEventModal.test.tsx`) asserting no native `<select>` is rendered and the menu opens in place.
- **`CatalogProgramModal.tsx`**, **`CatalogEventModal.tsx`**: create + edit modals replace inline catalog admin forms; active tab only for Create/Edit; archived tab read-only metadata.
- **`CatalogAdminView.tsx`**, **`utils/catalogMetadata.ts`**: metadata summary as `label: value` lines; clear-on-save via PATCH `null`.
- **`types.ts`**, **`normalizeApi.ts`**, **`mockData.ts`**, **`dataService.ts`**: optional metadata passthrough on catalog API/mock layer.
- **Tests**: modal render/XSS/a11y/responsive smoke; admin edit/clear/archived gating; normalizer legacy + metadata cases.
- **Docs**: `docs/api-contract.md`, `docs/ui-routes.md` — 002 catalog metadata contract and modal UX.

### Catalog admin — custom picker menus (responsive)

- Replaced native `<select>` in `CatalogPickers` with `CatalogPickerSelect` — menus render in-place below the trigger (fixes detached popup on mobile / DevTools emulation).

### Catalog admin — responsive picker dock

- **`AppLayout`**: catalog pickers sit outside the main scroll region so native `<select>` menus anchor correctly on mobile/tablet.
- **`CatalogPickers.module.css`**: full-width 44px touch targets; 16px font on narrow viewports (iOS zoom guard).

### Catalog admin — Phase 7 bug fixes (001-catalog-admin)

- **`api/client.ts`**: `X-EMS-Route` is path-only; query string forwarded on listener URL — fixes Archived tab `No handler for catalog?includearchived=true` on live API.
- **`Catalog.ts` / `mockData.ts` / `CatalogAdminView.tsx`**: archived admin view lists archived Events only; active Programs appear as section labels without Program archive controls.
- **`CatalogPickers.tsx` / `catalogContext.tsx`**: “Select Program” / “Select Event” placeholders; pickers refetch and clear stale selection after admin catalog mutations via `bumpCatalog()`.
- **Tests**: `client.test.ts`, extended picker/admin/catalog tests.

## 2026-07-03

### Slice 1 — Catalog admin (001-catalog-admin)

- **Catalog navigation**: `CatalogPickers` in `AppLayout` — all roles select active Program + Event; context in `catalogContext.tsx`.
- **Catalog admin UI**: `#/catalog` → `CatalogAdminView` (admin-only) — create/edit Programs and Events, active + archived tabs.
- **`dataService.ts`**: `fetchCatalog`, `createProgram`, `updateProgram`, `createEvent`, `updateEvent` with mock/live switch; `normalizeCatalogResponse` in `normalizeApi.ts`.
- **`mockData.ts`**: mutable mock catalog store for PoC.
- **Tests**: `CatalogPickers.test.tsx`, `CatalogAdminView.test.tsx`, catalog normalizer tests.
- **`docs/rbac.md`**, **`docs/api-contract.md`**: `GET catalog` all roles; `includeArchived` admin-only.

### Catalog simplified to two levels (Program → Event)

- Removed the **iteration** layer from the EMS catalog. Each calendar run (e.g. "Atlassian Event 2025", "Atlassian Event 2026") is now its **own Program**; hierarchy is **Program → Event** only.
- HubSpot registration **form ID** now lives on the **Program** (was iteration); **Parts Attended** option stays on the **Event**.
- Updated `CONTEXT.md`, `docs/decisions/003-phase1-attendees-checkin.md`, `docs/api-contract.md` (routes now `programs/{programId}/events/{evId}/…`), `docs/rbac.md`, `docs/product-flows.md`, `docs/hubspot-schema.md`, `project-blueprint.md`, `TODO.md`, and `MY-WORKFLOW.md`.

### Foundation gates — steps 4, 8, 10

- **`vite.config.ts`**: narrowed production CSP `img-src` from bare `https:` to `'self' data:` plus Google OAuth image hosts (`*.googleusercontent.com`, `*.gstatic.com`, `accounts.google.com`). Comment notes HubSpot CDN hosts to add when Slice 1 renders real assets (**Foundation step 4**, `FE-SEC-004`).
- **`.cursor/rules/ems-api-contract-discipline.mdc`**: always-on rule — any new/changed route must update `docs/api-contract.md`, `docs/rbac.md`, `RouteGuard`, and `dataService.ts` in the same change (**Foundation step 8**). Updated `frontend-ems-core.mdc`, `frontend-security.mdc`.
- **`docs/testing-validation.md`**: test validation playbook signed off 2026-07-03 — Tier 1 negative spot-checks, Backend + Frontend CI red/green proof (**Foundation step 10**, `FE-TEST-006`).

### Delivery model — vertical slices (ADR-004)

- Added **`docs/decisions/004-vertical-slice-delivery.md`**: EMS ships one complete, production-ready feature at a time; **security-governed write gate** (schema verified + RBAC + audit + validation/rate-limit + handler order) replaces "read-only until Phase 5". Supersedes sequencing in **ADR-001** (marked superseded; risk gate retained).
- **ADR-003** reframed as **Slice 1** (catalog + attendees + check-in) with a **blocking security acceptance checklist** (write gate, alg-pinned JWT verify + Event-id match, defence-in-depth admin session, idempotency, least-privilege scopes, PII/CSP/QR-lib discipline, audit).
- **`project-blueprint.md`** §1/§2.3/§7/§8/§10/§12 reframed from Phase 0–6 to **Foundation + Slices**; Slice 1 routes and scripts added; legacy flat `events/*` marked later slice.
- **`docs/rbac.md`** + **`docs/api-contract.md`**: added Slice 1 catalog + attendee + check-in routes (`admin`, provisional); Phase column → Foundation/Slice; legacy routes relabelled later.
- **`TODO.md`**: "Phase 1 Process" → **Foundation gates (before Slice 1)**; added `FE-SLICE1-001..004` build items.
- **`docs/product-flows.md`** (stakeholder): leads with the first feature (catalog + attendees + on-the-day check-in) and Program → run → event navigation.

### Engineering skills — Matt Pocock setup

- Added **`docs/agents/`** configuration for engineering skills: GitHub issue tracker (no external-PR triage), default triage labels, and multi-context domain doc rules.
- Added **`CONTEXT-MAP.md`** — Frontend + Backend contexts with relationship notes.
- Updated **`AGENTS.md`** with `## Agent skills` section pointing at the config files.

### AI / contributor guidance — responsive UI

- Added **`.cursor/rules/frontend-responsive.mdc`**: new views and UI changes must support mobile, tablet, and desktop (mobile-first CSS, `900px` shell breakpoint, touch targets, table/chart patterns).
- Updated **`AGENTS.md`** product principles and agent checklist; cross-linked from **`frontend-patterns.mdc`**.

### Backend deploy — Phase 0 scripts live (Phase 1 Process step 6)

- Backend **BE-DEPLOY-001** complete: latest ScriptRunner `scripts/` uploaded via SFTP; auth exchange + logout verified against local Vite proxy.

### Process — TODO audit (pre–Phase 1 checklist)

- Reconciled **TODO.md** with repo state: marked Phase 1 Process steps **1, 5, 9** done; moved completed items to **Done (archive)**.
- **X-001** set to **in progress** (git + ESLint XSS + test CI done; Bugbot remains). **FE-OPS-001/002** marked **blocked**.

### Security — dependency audit CI (Phase 1 Process step 3)

- Added **`npm audit --audit-level=high`** to `.github/workflows/ci.yml` after `npm ci`.

### Architecture — React migration R4 (cleanup, branch `react-migration`)

- **Deleted legacy vanilla app:** `js/` tree, `dev-server.mjs`, `index.vanilla.html`.
- **ESLint** retargeted to `src/` with **`dangerouslySetInnerHTML` ban** (closes **FE-SEC-007** for React). Removed `dev:legacy` npm script.
- **CI** runs `npm test` (37 specs) in addition to lint + build.
- Updated **AGENTS.md**, **README.md**, **docs/setup.md**, **docs/ui-routes.md**, **docs/CONTRIBUTING.md**, **frontend-patterns.mdc**, **frontend-security.mdc**, **react-migration-plan.md**, **TODO.md**.

### Architecture — React migration R3e + R3f (Settings + Email, branch `react-migration`)

- Ported **`SettingsView`** — read-only event details, registration/access panel, danger zone (PoC placeholders).
- Ported **`EmailView`** — audience overview, compose send (template/segment/timing), scheduled sends table, mock dispatch with large-send **`ConfirmModal`**.
- Added **`ConfirmProvider`** / **`useConfirm()`** in `src/components/ConfirmModal.tsx`; wired into `App.tsx`.
- Wired both into **`ViewRouter`**. Added **5 Vitest specs** (render + XSS guards). **37 tests** passing; production bundle ~449 KB.

### Architecture — React migration R3d (Agenda + Check-in, branch `react-migration`)

- Ported **`AgendaView`** — session schedule table, Export PDF placeholder (disabled when empty), HubSpot sync hint.
- Ported **`CheckInView`** — registered-only search list (max 8 rows), per-row Check in toast (PoC), QR scan placeholder panel.
- Wired both into **`ViewRouter`** (`agenda`, `check-in` routes). Added **4 Vitest specs** (render + XSS guards). `npm test` green (32 tests).

### Architecture — React migration R3c (Analytics + Chart.js npm, branch `react-migration`)

- Ported **`AnalyticsView`** — registration summary stats, campaign metrics list, recent sends audit feed, empty states.
- Added **`ConversionChart`** (`chart.js` + `react-chartjs-2`) — doughnut funnel chart using brand CSS tokens; **self-hosted in the Vite bundle** (no CDN). Closes **FE-SEC-005** for the React app.
- Wired into **`ViewRouter`** for the `analytics` route. Added **2 Vitest specs** (render + XSS guard). `npm test` green (28 tests). Production bundle ~433 KB (Chart.js included).

### Architecture — React migration R3b (Attendees, branch `react-migration`)

- Ported **`AttendeesView`** — segment filters (All/Registered/Checked In/Cancelled), search, selectable rows, detail panel, Export CSV toast, Send email / Update status actions (PoC placeholders).
- Wired into **`ViewRouter`** for the `attendees` route.
- Added **3 Vitest specs** including XSS render guard and row-selection detail panel test. `npm test` green (26 tests).

### Architecture — React migration R3a (Events + Event Hub, branch `react-migration`)

- Ported **`EventsView`** and **`EventHubView`** — portfolio table (filters, search, stats) and event hub (capacity bar, module cards, activity feed) wired to `useDataService()`.
- Added shared view shell components: **`TopBar`**, **`StatusBadge`**, **`EmptyState`**, **`CapacityBar`**; **`format.ts`** (`statusBadgeClass`, `formatDateTime`).
- **`ViewRouter`** dispatches by logical route — ported views replace `RoutePlaceholder`; unported modules still show the placeholder.
- Imported global **`layout.css`** + **`components.css`** for PoC view styling; **`AppLayout`** loads event name for the sidebar.
- **R3 split into R3a–R3f** in [docs/react-migration-plan.md](docs/react-migration-plan.md) (each ~R2 intensity). Added **6 Vitest specs** (EventsView, EventHubView XSS guards, format utils). `npm test` green.

### Architecture — React migration R2 (data layer, branch `react-migration`)

- Ported **`dataService.ts`**, **`normalizeApi.ts`**, and **`mockData.ts`** to TypeScript under `src/` — same mock/live switch as the vanilla app; session token passed explicitly via `DataServiceOptions` / `createDataService()`.
- Added **`useDataService()`** hook (`src/hooks/useDataService.ts`) — binds `useSession()` token to all fetch methods for R3 views.
- Extended **`types.ts`** with domain types (Event, Attendee, analytics, email payloads, etc.).
- Added **12 Vitest specs** — `normalizeApi.test.ts` (API → UI mapping) and `dataService.test.ts` (mock path + live path with token). `npm test` green (17 tests total).

### Architecture — React migration R1 (shell + routing + auth, branch `react-migration`)

- Ported the **app shell** to React: `AppLayout` (banner + sidebar + routed main), `Sidebar`, `PocBanner`, `Toast` (context/hook) — each with a CSS Module using brand tokens.
- **Hash routing** via `react-router` with `:eventId`/`:module` params; `eventId` now derives from the URL, removing the old `setSelectedEventId` double-render workaround. Added `router/navigation.ts` helpers.
- **Session context** (`state/appState.tsx`) replaces `appState.js` — session in memory, `useSession()` hook.
- **Auth brought forward from R2** (a login gate needs it): ported `authService.ts` (Google Identity Services button + `/auth/exchange` live/mock) and `api/client.ts` (token passed explicitly, no global state). Added GIS script + minimal GIS typings; `LoginView` mounts the button.
- **Testing set up** (`FE-TEST-001` done): Vitest + React Testing Library + jsdom via `vite.config.ts` `test` block; first specs `navigation.test.ts` and `RoutePlaceholder.test.tsx` (includes an XSS render guard). `npm test` green (5 tests).
- Views remain `RoutePlaceholder` stand-ins until R3. Build, tests, lint, and dev server all verified.

### Architecture — React migration R0 (scaffold, branch `react-migration`)

- Scaffolded **Vite 8 + React 19 + TypeScript** with `react-router` hash routing; placeholder route renders and the production build passes (`npm run build` = `tsc --noEmit && vite build`).
- **CSS Modules** adopted (`PlaceholderView.module.css`) using brand tokens from `css/tokens.css`.
- **Build-only CSP:** strict Content-Security-Policy injected into `index.html` at build time via a Vite plugin (dev server stays HMR-friendly; production bundle keeps `script-src 'self'`). Dropped `cdn.jsdelivr.net` (Chart.js will be self-hosted when Analytics is ported).
- Preserved the vanilla app as `index.vanilla.html` for reference during porting; `dist/` gitignored.
- `vite.config.ts` `/api/ems` dev proxy mirrors `dev-server.mjs` (reads `dev-server.config.js` when present).
- **CI rewritten** (`.github/workflows/ci.yml`): Node 22, `npm run lint` + `npm run build` on every push/PR; deploys `dist/` to GitHub Pages via Actions on `main`. Requires repo Pages source = GitHub Actions (one-time manual setting).

## 2026-07-02

### Architecture — React migration (planning only)

- Removed the "no React/Vue" line from `.cursor/rules/frontend-patterns.mdc` (was included by mistake).
- Added [docs/react-migration-plan.md](docs/react-migration-plan.md) — decision + phased plan to adopt **React + TypeScript + Vite** (build step, CSP notes, phased R0–R4, docs/rules to update). No code migrated yet.
- Added `TODO.md` **Architecture** section (`FE-ARCH-001`–`005`); noted this reshapes `FE-SEC-005/007`, `FE-TEST-001` (→ Vitest + RTL), and `FE-TECH-001/005`. Cross-folder `X-006` added in `../Backend/TODO.md` (CI build step; Backend runtime unaffected).

### Testing — discipline + parked setup

- Added **Testing** section to `TODO.md` (`FE-TEST-001` runner setup, `FE-TEST-002` pure-logic unit tests, `FE-TEST-003` XSS render tests, `FE-TEST-004` test CI, `FE-TEST-005` per-view standing requirement) and Phase 1 Process **step 9** (automated test CI).
- Added cross-cutting `X-004` (Playwright E2E) and `X-005` (standing test discipline).
- Added `.cursor/rules/ems-testing-discipline.mdc` and an `AGENTS.md` checklist item: new views/services ship with tests once a runner exists; deferrals parked in `TODO.md`.
- Added [docs/testing-validation.md](docs/testing-validation.md) — how to validate tests (Tier 1 negative spot-checks, CI proof, deploy smoke) without infinite meta-testing; **`FE-TEST-006`** + Phase 1 Process **step 10**.

## 2026-07-02

### TODO — Phase 1 Process + remaining cleanup parked

- Added **Phase 1 Process** pre-flight checklist (8 gates before HubSpot read APIs).
- Parked optional polish: `FE-TECH-001`–`005`, `FE-PROD-003` (UI role gating), `FE-SEC-007` (ESLint innerHTML ban).
- Added `X-003` contract sync discipline; moved `FE-SEC-004` to Pre–Phase 1 (Phase 1 Process step 4).

### Small quick wins (with caveats)

- **`APP_NAME` / `APP_SHORT_NAME` wired:** Login card and `document.title` use `APP_NAME`; sidebar header uses `APP_SHORT_NAME`. Added `js/utils/branding.js`.
- **Chart.js brand colors:** Analytics funnel reads `--color-cobalt`, `--color-orange`, `--color-black` from CSS tokens via `getBrandColor()`.
- **Removed unused `escapeHtml`** from `dom.js` (`htmlToElement` kept for documented trusted-static use).
- **CSP / ScriptRunner host:** Documented `connect-src` pinning and proxy vs direct-listener setup in `docs/setup.md`.

### Nice-to-have quick wins

- **withMockFallback:** Removed unreachable `ApiError` status-0 catch (mock path never calls `apiRequest` when `USE_MOCK_API` is true).
- **config.example.js:** Clarified `CONFIG_EXAMPLE` vs `CONFIG`; added `APP_SHORT_NAME` to the example.
- **Docs:** Mermaid route diagram includes Check-in, Agenda, Settings; product flows “Recent sends” wording aligned with Analytics UI.

### Navigation & contract polish

- **F3 — Double render fix:** `setSelectedEventId` no longer notifies app subscribers; hashchange is the single view-update driver.
- **F4 — Single nav source:** `js/config/eventModules.js` feeds sidebar and Event Hub module cards.
- **F6 — api-contract:** Documented activity, agenda, campaign metrics, scheduled emails, and audit routes; `fetchTemplates(eventId)` now uses `/events/{id}/email/templates`.

### Before Phase 1 — API alignment & live-data prep

- **Email naming (F1):** Renamed `previewDispatch` → `previewEmail`, `dispatchEmail` → `sendEmail`; live paths now use `/events/{id}/email/preview` and `/events/{id}/email/dispatch`. Config key `DISPATCH_CONFIRM_THRESHOLD` → `EMAIL_SEND_CONFIRM_THRESHOLD`. CSS `.dispatch-panel` → `.email-panel`.
- **API normalizer (F5):** Added `js/utils/normalizeApi.js` — maps contract shapes (`startDate`, `firstName`/`lastName`, `checked_in`) to UI shapes used by views. Applied in `dataService.js` on live API responses.
- **api-contract.md:** Phase 0 auth error codes, opaque session token wording, logout errors, 429 on exchange.

### Phase 0 cleanup (quick wins)

- Aligned PoC messaging: login notice now says **sample data** (matches app banner) when `USE_MOCK_API` is true.
- Updated `docs/ui-routes.md`, `docs/rbac.md`, and `TODO.md` — removed stale “empty mock data” wording; rbac role inheritance now references live `expandRole` / `roleCanAccessRoute` in backend.

### Fully populated EMS PoC

- Restored rich **sample mock data**: 6 events (active, draft, completed, cancelled), attendees with email/ticket/source, templates, campaign metrics, scheduled sends, agenda sessions, activity feed, audit log.
- **New module shells:** Check-in (`checkInView.js`), Agenda (`agendaView.js`), Settings (`settingsView.js`).
- Enhanced All Events (portfolio stats, status filters, search), Event Hub (capacity bar, activity, 6 modules, quick actions), Attendees (search, detail panel, export), Email (scheduled sends table, preview), Analytics (live mock metrics + event-scoped audit).
- Extended router, sidebar, and `dataService.js` for new routes and mock endpoints.

### Security briefings (internal, gitignored)

- Added `docs/security-briefing-stakeholders.md` — non-technical FAQ for managers/events team pushback on public URLs and PII.
- Added `docs/security-briefing-technical.md` — architecture, threat model, Phase 0 controls, production checklist for security reviewers.
- Explicit `.gitignore` entries for both briefing files (entire `docs/` folder was already excluded from GitHub Pages publish).

### Project tracking

- Added `TODO.md` — parked/deferred optional work (git/CI security scanning, CSP follow-ups, hosting); seeded from Phase 0 security assessment.
- Added `.cursor/rules/ems-todo-discipline.mdc` — agents must park skipped/deferred items in `TODO.md`.
- Updated `frontend-ems-core.mdc`, `ems-ask-before-acting.mdc`, and `AGENTS.md` to reference `TODO.md`.

### EMS PoC refactor (event-centric shell)

- Replaced email-blast PoC with **Event Management System** navigation: All Events → Event Hub → Attendees / Email / Analytics.
- Hash routes now use `#/events/{id}` and `#/events/{id}/{module}` (removed legacy `#/dispatch/{id}`).
- Added `eventHubView.js`, `attendeesView.js`, and `emailView.js`; removed `dispatchView.js`.
- Mock data cleared to **empty arrays** — views show purposeful empty states until HubSpot read APIs connect (Phase 2+).
- Updated branding from "Event Command Center" to "Adaptavist EMS" / "Event Management System".
- Event-scoped sidebar with module nav; global "All Events" always visible.

### Security hardening

- Tightened CSP `connect-src` from broad `https:` to `self` + required Google/ScriptRunner hosts (narrows XSS exfiltration).
- Added Subresource Integrity (SRI `sha384`) hash to the pinned `chart.js` CDN script (supply-chain protection).
- Documented XSS-prevention rules (render dynamic data via `textContent` / `el({ text })`, never `innerHTML`) across `frontend-security.mdc`, `frontend-patterns.mdc`, `AGENTS.md`, `docs/CONTRIBUTING.md`, blueprint §3.6, and a `dom.js` `htmlToElement()` warning — session token is in memory, so XSS = session compromise.

### Local dev proxy (Phase 0 auth)

- Added `dev-server.mjs` + `dev-server.config.example.js` — serves UI and proxies `/api/ems` → ScriptRunner (avoids OPTIONS/CORS).
- `API_BASE_URL` is now `/api/ems` (same origin); ScriptRunner URL lives in gitignored `dev-server.config.js`.
- `npm run dev` replaces `python3 -m http.server` when testing live auth.

### Phase 0 — Authentication (frontend)

- Fixed logout remounting login twice (duplicate `bootstrap()` + duplicate GIS `initialize()`); Google button 403 warnings after sign-out.
- Single-flight GIS `initialize()` at app startup; disabled FedCM for local dev; login mount guard prevents duplicate button renders on refresh.
- Login shell and Google button render once per page load; logout only toggles visibility (fixes gsi/button 403 after sign-out).
- Reverted OAuth redirect/PKCE experiment — GIS popup button is sufficient for Phase 0; optional gsi/button 403 in Network tab is harmless noise.
- `authService.js` calls `auth/exchange` and `auth/logout` with `skipMock` when `USE_MOCK_AUTH` is false.
- `api/client.js` posts to full `API_BASE_URL` with `X-EMS-Route` header (ScriptRunner flat listener paths).

### Documentation (hosting and budget)

- **`project-blueprint.md` §4:** $0 default (GitHub Pages), Phase 0 session auth mandatory, Cloudflare Access deferred to Phase 6.
- **`docs/setup.md`:** Cloudflare Access timing; Phase 0 auth checklist.
- **`docs/decisions/002-zero-budget-hosting.md`:** ADR for GitHub Pages primary, Phase 6 edge auth.
- **`README.md` / `AGENTS.md`:** Public UI vs protected API until Cloudflare Access.

### Repository
- `.gitignore` now excludes `docs/`, `project-blueprint.md`, and `node_modules/` so internal specs and deps are not published via GitHub Pages.

### Tooling

- Added ESLint (flat config, `eslint.config.js`) with browser/ES-module globals and `Chart`/`google` CDN globals; scripts `lint` and `lint:fix`.
- Added GitHub Actions workflow `.github/workflows/ci.yml` to run lint on push/PR.
- Baseline lint: 0 errors, 3 warnings (unused `ApiError` import and two unused `root` vars) — non-blocking.

### Cursor rules

- Migrated from `Frontend/.cursorrules` to `.cursor/rules/*.mdc` (scoped, always-on vs file-specific rules).
- Added rules: clarify before acting when requests are unclear; modular/readable code priority; changelog discipline.

### Documentation

- Added `docs/product-flows.md` — non-technical user journeys for events team stakeholder.
- Added `docs/CONTRIBUTING.md` — roles, PR checklist, AI guardrails.
- Rewrote `project-blueprint.md` — EMS vision, event-centric model, read-first HubSpot phases, documentation index.
- Added `AGENTS.md` — frontend development guide for AI and developers.
- Added supporting docs: `hubspot-schema.md`, `api-contract.md`, `rbac.md`, `ui-routes.md`, `setup.md`, `decisions/001-read-first-hubspot.md`.

### Application (PoC shell)

- Replaced monolithic `index.html` with modular ES module structure (`js/views/`, `js/services/`, `css/`).
- Implemented Google Sign-In via programmatic `renderButton` (dynamic login mount).
- Hash routing for events, dispatch, and analytics views with mock data layer.
- Brand tokens in `css/tokens.css` aligned to Adaptavist palette.

### Fixes

- Fixed `js/router.js` import path for `appState.js` (404 on `/state/appState.js`).

---

## How to add entries

When making changes, add bullets under today's date. If the date section exists, append to it; otherwise create a new `## YYYY-MM-DD` section at the top (below this instructions block).
