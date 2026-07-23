# Quickstart: Data Caching Layer (Slice 012)

**Purpose**: Runnable validation that slice 012 works end-to-end — automated suites (§A), functional manual QA per user story (§B), and operator security comfort checks (§C).

**References**: [spec.md](spec.md) · [plan.md](plan.md) · [data-model.md](data-model.md) · [contracts/events-capacity-summary.md](contracts/events-capacity-summary.md) · [ADR-015](../../docs/decisions/015-client-data-caching-layer.md) / [ADR-016](../../docs/decisions/016-no-prefetch-of-audited-pii.md)

## Sign-off overview

| Gate | What | Status |
| :--- | :--- | :---: |
| A | Automated tests green (both repos) | ✅ 2026-07-20 (local) |
| B | Manual QA — user stories 1–5 | 🟡 partial — see §B note below |
| C | Operator security comfort checks | ⬜ |

Do not mark slice QA complete in `tasks.md` until all three pass.

**2026-07-20 status**: §A ran clean in this environment — Frontend `npm test` (60 files / 510 tests) + `npm run build` (`tsc --noEmit` + `vite build`); Backend `npm test` (42 suites / 439 tests) + `npm run lint:fix` (0 errors). §B could not be driven live here: this sandbox has no deployed ScriptRunner listener and no `dev-server.config.js` proxy target (`src/config.ts` — `API_BASE_URL` falls back to `/api/ems`, and the app has no mock-data path), so DevTools Network/Storage observation against a real backend isn't possible outside UAT. Each §B scenario's *underlying behaviour* is instead covered by an automated spec (see the table in §B below) — that is not a substitute for the manual pass, only evidence the mechanism works before UAT time is spent on it. Full §B (and re-running §A on UAT) is T039's remaining scope; §C is unstarted (operator-run, T040).

## Prerequisites

- Frontend: `npm install` (picks up `@tanstack/react-query`), then `npm run dev` against the intended ScriptRunner environment (UAT for QA). There is no mock-data mode; `USE_MOCK_AUTH` may be used for local dev sign-in only, **not** for §C.
- Backend: latest `Backend/scripts/` (including `OnGetCapacitySummary.ts` + updated `Routes.ts`) SFTP-uploaded to the environment under test.
- A test Program with several Events (one standalone Event too), at least one registered contact, and admin + viewer test accounts in `USER_ROLE_MAP` (see §C1 of the template).

## A. Automated tests

### A1. Backend

```bash
cd Backend/node
npm test           # all suites, incl. new CapacitySummary.test.ts (401/403/405, empty portfolio, aggregation, standalone Event, null capacity)
npm run lint:fix   # before SFTP upload
```

### A2. Frontend

```bash
cd Frontend
npm test           # all view suites green post-migration (SC-006) + new data-layer specs:
                   #  - clear-on-token-change (cache empty after token swap)
                   #  - invalidation helpers hit the right key families
                   #  - dedup: two consumers, one request (FR-013)
                   #  - stale-paint-then-update; refetch-failure keeps snapshot + error affordance
                   #  - prefetch module exposes only catalog/capacity functions (ADR-016)
                   #  - capacity-summary mapping test + missing-row fallback
npm run build      # includes tsc; CI parity
```

**Expected**: all green. Any pre-existing view test that fails after migration is a stop signal — the migration was supposed to be render-equivalent.

## B. Manual QA (UAT or Live)

**Local coverage note (2026-07-20)**: no live UAT environment was reachable from this session (see status note above). The table below maps each manual scenario to the automated spec that proves its mechanism locally — run the manual steps themselves on UAT before signing off §B.

| Scenario | Automated spec (local, already green) | What UAT still needs to confirm |
| :--- | :--- | :--- |
| B1 (instant repaint / background refresh / attendees always-fresh) | `src/data/__tests__/queryClient.test.tsx` (dedup), `EventsView.test.tsx` "paints the previous (stale) rows instantly…", `prefetch.test.tsx` (attendees issue a request on every mount) | Real elapsed-time freshness window behaviour and actual DevTools Network timing against a live listener |
| B2 (Programs & Events request shape) | `EventsView.test.tsx` / `OverviewView.test.tsx` "issues exactly one fetchCatalog + one fetchCapacitySummary call…, zero fetchEventCapacityStatus calls" (T034); `CheckInView.test.tsx` "keeps using the per-event capacity route…" | DevTools Network trace against the deployed listener; checked-in counts matching the Check-in screen's own numbers |
| B3 (actions reflected everywhere) | `src/data/__tests__/invalidation.test.tsx` (per-helper key-family targeting + mounted attendees/capacity refetch integration spec) | Real check-in → cross-screen visual confirmation without a hard refresh |
| B4 (background-refresh failure keeps snapshot) | `EventsView.test.tsx` "keeps the last loaded rows + a non-blocking retry banner…" and the new T035 initial-load-failure spec | Actual offline/online toggle via DevTools against a live session |
| B5 (sign-out/sign-in leaves nothing behind, functional half) | `src/data/__tests__/sessionLifecycle.test.tsx` (cache empty after token change; stale in-flight response not written back) | Real sign-out/sign-in round trip (Google OAuth or `USE_MOCK_AUTH`) showing fresh loading states |

### B1. US1 — Returning to a screen feels instant

1. Sign in as admin. Open **Programs & Events**; let it load fully.
2. Open an Event, then navigate back to Programs & Events **within ~5 minutes**.
3. **Expected**: the list paints immediately — no full-screen skeleton, and (DevTools → Network) **no new catalog request** within the freshness window.
4. Wait >5 minutes, navigate back again. **Expected**: instant paint of previous data, a background catalog request fires, any changes appear in place.
5. Open **Registered Attendees**, navigate away and back. **Expected**: previous rows may paint instantly, but a fresh `events/{evId}/attendees` request fires **every** time (staleTime 0).

### B2. US4 — Programs & Events request shape

1. DevTools → Network, filter to the ScriptRunner listener. Hard-reload, sign in, open Programs & Events.
2. **Expected**: exactly one `catalog` request and one `events/capacity-summary` request — **zero** per-event `events/{evId}/capacity` requests from this screen. Checked-in counts match what the Event's Check-in screen shows.
3. Open **Check-in** for an Event. **Expected**: per-event capacity requests still occur here (live counter unchanged).

### B3. US3 — Actions reflected everywhere

1. On **Check-in**, check in a registered attendee.
2. Without a hard refresh, open **Registered Attendees**, then **Programs & Events**.
3. **Expected**: attendee shows checked-in; the Event's checked-in count is updated on both screens.
4. Undo the check-in; verify both screens revert. Edit an Event name in Programs & Events admin; verify the sidebar picker/Overview reflect it next visit.

### B4. US1 — Background-refresh failure keeps the snapshot

1. Load Programs & Events. Using DevTools, go offline (Network → Offline) **after** data has painted; wait past the freshness window; navigate away and back.
2. **Expected**: previous data stays visible with a non-blocking error indication and retry — not a blank error screen. Go back online, retry → data refreshes.

### B5. US2 — Sign-out/sign-in (functional half; security half in §C)

1. Sign out, sign back in as the same admin.
2. **Expected**: first screens load fresh (loading states appear — the cache was cleared); no errors.

## C. Operator security comfort checks

> **When to run:** after §A passes in CI and §B passes manually, before Live sign-off. **Rule:** any **Failure signal** → stop; do not deploy until fixed and re-run.

### C0. What you are proving (read once)

Beyond the standing properties (no HubSpot secrets in the browser; staff only; role boundaries; safe display), this slice adds one new promise: **the speed layer never lies and never leaks** — nothing it remembers survives sign-out, and it never reads attendee PII "on your behalf" when you didn't open that screen.

### C1. Before you start

Complete the environment/accounts table from the [operator security QA template §C1](../../docs/slice-operator-security-qa-template.md) — admin + viewer accounts in `USER_ROLE_MAP`, UAT URL, backend deployed (handlers for this slice: `OnGetCapacitySummary.ts`, updated `Utils/Routes.ts`), test Program/Event with one registered contact.

### C2–C6. Standing checks

Run the template's generic checks C2 (deploy/config sanity), C3 (auth: sign-in/out, unauthenticated API blocked), C4 (RBAC), C5 (audit metadata has no email/name), C6 (PII displays as text). For C6 use a contact whose name contains `<img src=x onerror=alert(1)>` — it must render as literal text on Registered Attendees **including when the row paints from the cache snapshot** (revisit the screen and check both paints).

### C7. Slice-specific security checks

#### C7.1 Sign-out clears everything the cache held

- **Goal**: prove no attendee/event data survives sign-out (SC-003; FR-006).
- **Prerequisites**: admin signed in; you have just viewed Registered Attendees for the test Event.
- **Steps**: (1) With attendees on screen, open DevTools → **Application** → Local Storage / Session Storage / IndexedDB for the app origin — confirm no attendee names/emails or event data anywhere. (2) Sign out. (3) Without closing the tab, sign in as the **viewer** account (different person). (4) Navigate to every screen the viewer can access.
- **Expected result**: step 1 finds no application data in any persistent storage (memory-only cache); steps 3–4 never flash or paint the admin's previously viewed data — every screen loads fresh under the viewer's own permissions.
- **Failure signal — stop**: attendee/event data in any browser storage; or any screen briefly showing the previous user's data after the account switch.
- **Pass**: ☐

#### C7.2 The audit trail contains no speculative PII reads

- **Goal**: prove the performance layer never fires attendee reads the operator didn't cause (SC-004; ADR-016).
- **Prerequisites**: admin account; note the current time.
- **Steps**: (1) Sign in as admin. (2) Visit Overview, Programs & Events, an Event's details, and Check-in — **do not** open Registered Attendees. (3) Wait ~1 minute, then open the **Audit** screen and filter by your actor email since the noted time.
- **Expected result**: no `attendees.list` (PII read) entries for your actor from this session. Then open Registered Attendees once and re-check: exactly one new read entry appears.
- **Failure signal — stop**: any attendee-read audit entry for a screen you did not open, or more entries than real views.
- **Pass**: ☐

#### C7.3 Viewer cannot call the new bulk route

- **Goal**: prove `events/capacity-summary` is admin-only, deny-by-default (contract §RBAC).
- **Prerequisites**: viewer session token (sign in as viewer; the token is in memory — do this via the app, not by extracting the token).
- **Steps**: (1) As **viewer**, open the app and note Programs & Events either isn't offered or its data calls fail per existing RBAC. (2) Engineering-assisted check (or via DevTools console on the viewer session): issue a GET to the listener with `route=events/capacity-summary` using the viewer's session. (3) Repeat with no session (e.g. curl without the Bearer header).
- **Expected result**: viewer request → `403 forbidden`; no-session request → `401`. Admin request (control) → `200` with the events array.
- **Failure signal — stop**: viewer or unauthenticated request returns `200`/data.
- **Pass**: ☐

#### C7.4 Stale data cannot cross a role change

- **Goal**: prove cached admin data never serves a subsequently signed-in lower-privileged user (FR-006 + RBAC).
- **Prerequisites**: admin and viewer accounts; same browser tab.
- **Steps**: (1) As admin, load Programs & Events (catalog + capacity now cached). (2) Sign out; sign in as viewer in the same tab. (3) Immediately visit any catalog-derived screen the viewer can reach.
- **Expected result**: the screen shows a loading state then viewer-permitted data from a fresh request — never an instant paint of the admin session's cached portfolio (which would include capacity figures the viewer's role cannot fetch).
- **Failure signal — stop**: instant paint of data the viewer's own requests could not have fetched.
- **Pass**: ☐

### Operator security sign-off

| Check | Description | Pass |
| :--- | :--- | :---: |
| C2–C6 | Standing template checks (deploy sanity, auth, RBAC, audit metadata, PII-as-text incl. cached paint) | ☐ |
| C7.1 | Sign-out clears all cached data; nothing persists; no cross-user paint | ☐ |
| C7.2 | No speculative `attendees.list` audit entries; one entry per real view | ☐ |
| C7.3 | `events/capacity-summary`: viewer 403, unauthenticated 401, admin 200 | ☐ |
| C7.4 | No stale cross-role data after account switch | ☐ |

**Operator:** ____________  **Date:** ____________  **Environment:** ☐ UAT ☐ Live
