# Quickstart & Validation: Redesign Initiative (Slice 007)

**Plan**: [plan.md](./plan.md) · **Spec**: [spec.md](./spec.md) · **Date**: 2026-07-13

Validation guide for the redesign. **Phase A is deliverable now**; **Phase B is gated on `X-REDESIGN-001`** — its checks are marked and filled when the gates pass. Prove the feature works via §A automated, §B manual, and §C operator security.

---

## A. Automated tests (CI — run before sign-off)

**Frontend (Vitest)** — `npm test` in `Frontend/`:

| Area | What it proves |
| :--- | :--- |
| Semantic tokens / theme render | Each of Aurora / Celebration / Dark Aurora renders a sample view with correct `data-theme`; no component reads a hardcoded hex |
| Theme switcher gating | Celebration option shown only for allowlisted email; hidden otherwise |
| Theme persistence mapping | `dataService.get/setThemePreference` map to `user/prefs` routes; stored `celebration` for non-allowlisted user resolves to Aurora |
| Field pickers a11y | Calendar/time/select popovers: keyboard open/close/select, `role`/`aria-*`, focus return (completion gate) |
| XSS guards | Hostile strings in any new surface render as text, not markup |
| *(Phase B, when unblocked)* event-first + registration | Standalone Event flows; check-in/undo/remove mapping; blocked-while-checked-in |

**Backend (Jest)** — `npm test` in `Backend/`:

| Area | What it proves |
| :--- | :--- |
| `user/prefs` routes | 401 unauth; 400 invalid enum; 405 wrong method; 429 rate limit; **Celebration re-validated server-side** (non-allowlisted → 403 on PUT, Aurora on GET) |
| *(Phase B, when unblocked)* `CustomObjectAdapter` + check-in routes | 401/403/404/405/409/429; audited writes; no register-attendee write path |

Run `npm run lint` (both repos) and `npm audit --audit-level=high` before deploy.

### Baseline (T003, pre-implementation, 2026-07-13)

| Repo | `npm test` | `npm run lint` |
| :--- | :--- | :--- |
| Frontend | 34 test files, 215 tests passed | 0 errors, 4 pre-existing warnings (`mockData.ts` unused args) |
| Backend | 21 test suites, 236 tests passed | 0 errors, 3 pre-existing warnings (`apiRegistry.ts`, `Slice1Routes.test.ts` unused args) |

### After Phase 1 (Setup) + Phase 2 (Foundational) — T001–T011, 2026-07-13

| Check | Result |
| :--- | :--- |
| Frontend `npm test` | 38 test files, 225 tests passed (+4 files / +10 tests: `SelectPicker`, `CalendarPicker`, `TimePicker`, `AppLayout` role-gate) |
| Frontend `npm run lint` | 0 errors, same 4 pre-existing warnings |
| Frontend `tsc --noEmit` | clean |
| Frontend `npm audit --audit-level=high` | 0 vulnerabilities (incl. new `@fontsource-variable/manrope`, `@fontsource/material-symbols-outlined`) |
| Frontend `vite build` | succeeds; self-hosted fonts bundle into `dist/assets/*.woff2` (verified, then `dist/` removed — not committed) |
| Backend | unchanged (no Backend work in Foundational; Foundational touches Frontend only) |

---

## B. Manual functional smoke (UAT)

> **Data for visual QA:** redesigned views are visually QA'd against **live HubSpot data** (`USE_MOCK_API: false`), not mock data — this resolves the spec edge case on mock-vs-live QA. Mock mode may still be used for local dev, but sign-off screenshots/checks use live data.

### Phase A

1. Sign in; open the theme switcher — confirm **Aurora** and **Dark Aurora** always present.
2. Switch to **Dark Aurora** — UI recolours instantly (no flash of unstyled/native controls); check a data-heavy view (Attendees) for contrast + readable icons.
3. Sign in on a **second device/profile** — Dark Aurora is applied automatically (cross-device).
4. As an **allowlisted** email, confirm **Celebration** appears and applies; as a **non-allowlisted** email, confirm Celebration is absent and any stored value falls back to Aurora.
5. Open a create/edit modal — confirm the **custom calendar/time/select** pickers work by mouse **and** keyboard, at 375 / 768 / 1024 px.
6. Confirm **no external font/icon requests** in DevTools → Network (fonts served from same origin).

### Click-count parity (T063, SC-003, 2026-07-13)

Code-level walkthrough of each flow's discrete user actions (click/tap; typing not counted), comparing the pre-redesign implementation against the redesigned UI (US1 restyle + T032 picker swap). Traced from `CheckInView.tsx`, `EmailDispatchView.tsx`, `CatalogEventModal.tsx` — not a live-browser click recording (no test Google account available in this environment to sign in and drive the authenticated shell), but an accurate trace of the actual interaction sequence each implementation requires. **Live-browser confirmation is still owed as a manual UAT step** (§B checklist item, in addition to this trace) before Phase A sign-off.

| Flow | Steps (before → after) | Result |
| :--- | :--- | :--- |
| **Check-in** (search → confirm) | Click result row (1) → click "Confirm check-in" (1) = **2** clicks, both before and after — this flow has no date/time/select field, so US1's restyle didn't touch its interaction sequence at all | Same |
| **Send email — now** | Template picker (2: open + choose) → audience radio (1) → "Send now" (1) = **4** clicks, unchanged (Template already used `CatalogPickerSelect` before and after) | Same |
| **Send email — schedule** | Schedule radio (1) → Date (2: open + pick day) → Hour picker (2: open + choose) → Minute (1, already a radio grid) → Timezone picker (2: open + choose) → "Schedule" (1) = **9** clicks. Before: native `<input type="date">` (~2 clicks: open + pick day in the browser's own calendar) in place of the new `CalendarPicker` (2 clicks: open + pick day) — same count | Same |
| **Catalog CRUD — create Event** | Program picker (2: open + choose) → Date (2: open + pick day) → Save (1) = **5** clicks for the picker/submit fields (plus typing for text fields, unchanged). Before: Program was a bespoke in-place dropdown (2 clicks: open + choose — same pattern `SelectPicker` now provides) and Date was a native input (~2 clicks) — same count | Same |

**Conclusion**: no flow gained clicks; the picker swap (T032) preserves a 1-click-to-open, 1-click-to-choose interaction shape for both the old bespoke/native controls and the new shared pickers.

### Phase 6 — Rollout & compatibility confirmation (US3, T038–T039, 2026-07-13)

**T038 — Foundation-first, not big-bang.** Phase A shipped in exactly this order, each step independently mergeable and already covered by the Phase 1–5 checkpoints above:

1. **Setup + Foundational** (T001–T011): token layer, self-hosted fonts, shared pickers, role-aware shell — pure infrastructure; nothing visually changes yet because no component reads the new tokens yet.
2. **US4 theme persistence** (T012–T022): switcher + backend pref route — additive; the new theme options don't do anything visually until Phase 4 restyles the CSS that consumes them.
3. **US1 per-view restyle** (T025–T033), in this order: shared chrome (T025) → Overview/Events (T026) → Attendees (T027) → Check-in (T028) → Email/Campaign (T029) → Catalog admin + modals (T030) → Audit (T031). Each view's restyle is a pure CSS-module + component-internal change — no route, RBAC, or IA change — so any one view could have shipped alone without waiting on the others. The order above was chosen by scope/complexity, not by a cross-view dependency.
4. **US2 a11y/dependency/XSS proof** (T034–T037): verification only, no functional change.
5. **This confirmation** (T038–T039).

No step required an IA (information-architecture) rebuild — the sidebar/nav structure, hash routes, and module list are unchanged from before the redesign (see T039 below). Phase A is a skin over the existing shell, not a new shell.

**T039 — In-flight slice compatibility.**

| Check | Result |
| :--- | :--- |
| Hash routes (`src/App.tsx`) | Unchanged — same 9 routes, same `HashRouter` + `ViewRouter` dispatch; file untouched by the redesign's diff |
| Module/RBAC config (`config/eventModules.ts`, `config/shellAccess.ts`) | Unchanged module list and `minRoles`; `shellAccess.ts` only gained the admin-only shell gate as part of Foundational T011 (Phase A itself), not a later regression |
| Slice 004 (capacity) | `CapacityBar` restyled onto semantic tokens (T025) but `utils/capacityTier.ts` (capacity-tier logic) untouched; `CheckInView.test.tsx` (incl. capacity assertions) passes unchanged |
| Slice 005 (email dispatch) | `EmailDispatchView` restyled (T029) + native date input swapped for `CalendarPicker` (T032); dispatch/schedule logic and `dataService` calls untouched; `EmailDispatchView.test.tsx` passes unchanged |
| Slice 006 (public registration) | Only spec artifacts exist (`specs/006-public-registration/`) — no view built yet in this checkout, so there is nothing for the redesign to conflict with |
| Full regression | 39 files / 258 Vitest tests passing, clean `tsc --noEmit` / `eslint` / `vite build` — no slice needed a functional test rewrite, only the T023 `data-theme` assertions and the T032 picker-swap accessible-name updates already logged above |

**Conclusion**: Phase A shipped foundation-first with zero IA rework and zero forced pause on Slices 004/005/006 — satisfying US3's acceptance criteria. Phase A is independently shippable now; Phase B can be scheduled separately whenever `X-REDESIGN-001` clears.

### Phase B *(fill and run when `X-REDESIGN-001` clears)*

1. Land on **Events overview** (not a Program drill-down); open a **standalone Event** (no Program) and confirm Attendees/Check-in/Capacity/Campaign work.
2. Filter Events by a **Program**; confirm it groups, and is not required to reach an Event.
3. Check in a registered attendee → status flips to checked-in, audit row appears; **undo** reverts; **remove** blocked while checked-in.
4. Confirm there is **no** "register attendee" control in EMS; walk-in UI communicates **roster propagation lag**.

---

## C. Operator security comfort checks

**Audience:** Product owner / operator who does **not** read source code.
**Purpose:** Prove the slice is safe to run against real HubSpot data **before** Live sign-off.

> **When to run:** After §A passes in CI and before Live sign-off. **Phase A** is validated now; **Phase B** subsections (C7.2+) are filled and run when `X-REDESIGN-001` clears.
> **Rule:** If any **Failure signal** occurs, **stop**, note the step ID, and do not deploy until fixed and re-run.

### C0. What you are proving (read once)

| Property | Plain English |
| :--- | :--- |
| **No HubSpot secrets in the browser** | Only your Google login + EMS session; no API keys/fonts from third parties in the page |
| **Staff only** | Non-`@adaptavist.com` account cannot get a session |
| **Role boundaries** | The redesigned shell is admin-only for now; non-admins cannot reach admin surfaces |
| **Preferences are safe** | Theme is a cosmetic, non-PII preference; **Celebration cannot be unlocked by tampering with a stored value** |
| **Writes are intentional** *(Phase B)* | Check-in / undo / remove only happen for valid, authorised, audited requests |
| **Traceability** *(Phase B)* | Check-in actions leave an Audit row without leaking attendee email/name |
| **Safe display** | Names/companies from HubSpot show as plain text, not executable HTML |

### C1. Before you start

| # | Item | Your value | How to confirm |
| :---: | :--- | :--- | :--- |
| 1 | **Environment** | ☐ UAT ☐ Live | Write the full URL you will use. |
| 2 | **Admin test account** | `@adaptavist.com`: `__________` | Listed as `admin` in Parameter **`USER_ROLE_MAP`**. |
| 3 | **Non-admin test account** | `@adaptavist.com`: `__________` | Listed as `viewer`/`operator`. Use a separate browser/profile. |
| 4 | **Allowlisted Celebration email** | `__________` | One of the entries in the **list-type** Parameter **`CELEBRATION_THEME_EMAIL`** (any email in the list gets access — pick any one). |
| 5 | **Non-allowlisted email** | `__________` | Any staff email that is **not** in the `CELEBRATION_THEME_EMAIL` list. |
| 6 | **Frontend config** | `USE_MOCK_API: false` | Live/UAT QA must hit real ScriptRunner. |
| 7 | **Backend deployed** | ☐ Yes | Phase A adds routes — confirm latest `Backend/scripts/` uploaded via SFTP after merge. Handlers: `OnGetUserPrefs.ts`, `OnPutUserPrefs.ts` *(Phase B adds check-in/undo/remove handlers)*. |

**Browser setup:** one normal window (admin) + one incognito/profile (non-admin). Keep a notes doc for failing step IDs.

### C2. Deploy and config sanity (release gate)

| Step | Action | Expected result | Failure signal — stop |
| :---: | :--- | :--- | :--- |
| C2.1 | Open the EMS URL. | App shell/login loads; no blank screen. | 404, wrong site, or CORS errors in console. |
| C2.2 | DevTools → **Network**; sign in as admin; load any data screen and switch theme. | Data + theme-pref requests go to **ScriptRunner** (`X-EMS-Route: user/prefs…`), **not** `api.hubapi.com`. Fonts/icons load from **same origin**. | Any direct request to HubSpot, or fonts/icons from `fonts.googleapis.com` / a CDN. |
| C2.3 | DevTools → **Application** → Local/Session Storage; search `hubspot`, `token`, `api_key`. | No HubSpot private tokens. Theme id may be cached; that is OK. | HubSpot API key / private app token in storage. |
| C2.4 | View production build source; search `.map`. | No `.js.map` in `assets/`. | Public source maps — report. |

### C3. Authentication boundary

| Step | Action | Expected result | Failure signal — stop |
| :---: | :--- | :--- | :--- |
| C3.1 | Sign out. Open a deep link (e.g. `#/overview` or `#/events/attendees`). | Redirect to login / empty state; **no** PII. | Data visible without login. |
| C3.2 | Sign in with **admin** Google account. | Lands in app; TopBar shows signed-in. | Error loop or access denied for a mapped admin. |
| C3.3 | Sign out via app control. | Back to login; protected screens no longer load. | Still able to load protected screens after logout. |
| C3.4 | (If available) sign in with a **non-Adaptavist** Google account. | Access denied / no session. | Non-staff account gets a working session. |

### C4. Role boundaries — RBAC

#### C4a. Admin — allowed

| Step | Action | Expected result | Failure signal |
| :---: | :--- | :--- | :--- |
| C4a.1 | Sign in as admin; open the redesigned shell. | Full nav incl. admin surfaces (Overview, Audit). | Admin blocked from admin surfaces. |
| C4a.2 | Change theme (Aurora → Dark Aurora). | Applies + persists (reload keeps it). | 403/500 on `user/prefs/theme`. |

#### C4b. Non-admin — denied

| Step | Action | Expected result | Failure signal |
| :---: | :--- | :--- | :--- |
| C4b.1 | Sign in as **non-admin** (separate profile). | Admin-only surfaces are hidden/redirected (shell is admin-only for now). | Non-admin sees admin surfaces (Audit, catalog write). |
| C4b.2 | Non-admin changes **their own** theme. | Allowed (self-scoped, non-PII). | Theme change errors for a valid signed-in user. |

### C5. Preference safety — Celebration gating (slice-specific, Phase A)

| Step | Action | Expected result | Failure signal — stop |
| :---: | :--- | :--- | :--- |
| C5.1 | Sign in as the **allowlisted** email (C1.4). Open theme switcher. | **Celebration** is offered and applies. | Celebration missing for an allowlisted user. |
| C5.2 | Sign in as a **non-allowlisted** email (C1.5). | **Celebration is not offered.** | Celebration selectable for a non-allowlisted user. |
| C5.3 | As the allowlisted user, select Celebration; then have engineering (or DevTools) confirm the stored pref = `celebration`. Now sign in as the **non-allowlisted** user. | App loads **Aurora**, not Celebration (server re-validates, does not trust stored value). | App renders Celebration for the non-allowlisted user. |
| C5.4 | With DevTools, attempt `PUT user/prefs/theme {"theme":"celebration"}` as the non-allowlisted user. | **403 `celebration_not_allowed`**; theme stays Aurora. | 200 + Celebration applied. |

### C6. PII display safety

| Step | Action | Expected result | Failure signal |
| :---: | :--- | :--- | :--- |
| C6.1 | Automated (engineering): tests render hostile strings (`<script>`, `<img onerror=…>`) in name/company. | CI green — assert text content, not HTML nodes. | Failing XSS tests — do not sign off. |
| C6.2 | Manual: view a row with `<`/`>` in a name/company (or a UAT contact named `Test <b>XSS</b>`). | Angle brackets show literally; no bold, no alert. | Script runs / bold text / broken layout. |

### C7. Slice-specific security checks

#### C7.1 Theme preference endpoint (Phase A)

| Step | Action | Expected result | Failure signal |
| :---: | :--- | :--- | :--- |
| C7.1.1 | DevTools: `PUT user/prefs/theme {"theme":"pink"}` (invalid). | **400 `validation_error`**; nothing stored. | Invalid value accepted. |
| C7.1.2 | Save the theme repeatedly to exceed the limit (`USER_PREFS_RATE_LIMIT_PER_HOUR`, default 60/user/hour). | Eventually **429 `rate_limited`**; recovers within the hour window. | No throttling. |
| C7.1.3 | Ask engineering to read one prefs record. | Contains theme id + user key only — **no** email/name/PII. | PII stored in prefs. |

#### C7.2 Registration / check-in writes (Phase B — ⛔ fill when `X-REDESIGN-001` clears)

| Step | Action | Expected result | Failure signal |
| :---: | :--- | :--- | :--- |
| C7.2.1 | Admin: check in a contact **not registered** for the Event. | Error (`404 association_not_found`); **no** check-in. | Unregistered contact marked attended. |
| C7.2.2 | Admin: check in a **registered** contact. | Success; audit row `checkin.confirm` (or equivalent); metadata has **no** email/name. | Success without audit row, or PII in audit metadata. |
| C7.2.3 | Admin: attempt **remove** on a checked-in attendee. | **409 `attendee_checked_in`** (must undo first). | Checked-in attendee removed. |
| C7.2.4 | Confirm there is **no** EMS "register attendee" write in the UI or API. | None exists — registration is workflow-side. | EMS exposes a register-attendee write. |

### C8. Automated test comfort

| # | Question | Answer |
| :---: | :--- | :--- |
| C8.1 | Green CI (lint, test, build, npm audit) on the slice PR(s)? | ☐ Yes — link: `__________` |
| C8.2 | `/review-security` run and summarised on the PR? | ☐ Yes — note: `__________` |
| C8.3 | Test count stable or increased? | ☐ Yes |

### C9. When something fails

1. **Stop** Live deploy. 2. Record **step ID**, account, screenshot. 3. File an issue / message engineering. 4. After fix, re-run only failed sections plus C2.

**Escalate / defer Live** if: non-admin reaches admin surfaces, unauthenticated access to data, HubSpot token or third-party font/icon in browser, **Celebration unlocked by a non-allowlisted user**, or (Phase B) unregistered check-in writes / audit rows containing email/name.

### C10. Operator security sign-off

| Step ID | Check | Pass ☐ | Fail ☐ | Notes |
| :--- | :--- | :---: | :---: | :--- |
| C2 | Deploy and config sanity | | | Incl. same-origin fonts/icons |
| C3 | Authentication boundary | | | |
| C4a | Admin allowed | | | |
| C4b | Non-admin denied | | | |
| C5 | Celebration gating (no tamper unlock) | | | Phase A key security property |
| C6 | PII display safety | | | |
| C7.1 | Theme preference endpoint | | | Phase A |
| C7.2 | Registration/check-in writes | | | **Phase B — N/A until `X-REDESIGN-001`** |
| C8 | CI + security review confirmed | | | |

**Operator name:** ____________ **Date:** ____________ **Environment:** ☐ UAT ☐ Live

**Slice / tier:** `Slice 007 — Redesign (Phase A)` **Version / PR:** `__________`
