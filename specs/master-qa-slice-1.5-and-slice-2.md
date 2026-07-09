# Master QA — Slice 1.5 Tier A + Slice 2 (Email dispatch)

**Purpose:** One operator/engineering runbook for everything still outstanding: **Slice 1.5 Tier A manual sign-off**, **Slice 2 automated + manual QA**, and **T002 HubSpot spike** (gate for live email cutover).

**Audience:** Product owner / operator (click-through) and engineering (automated tests, T002, deploy).

**Related:**

- [slice-1.5-tier-a/signoff-checklist.md](./slice-1.5-tier-a/signoff-checklist.md)
- [005-email-dispatch/quickstart.md](./005-email-dispatch/quickstart.md)
- [005-email-dispatch/research.md](./005-email-dispatch/research.md) §R-003
- [docs/slice-operator-security-qa-template.md](../docs/slice-operator-security-qa-template.md)
- [docs/environments.md](../docs/environments.md)

**Last updated:** 2026-07-09

---

## 1. What is still open?

| Workstream | Code status | QA status | Blocked by T002? |
| :--- | :--- | :--- | :---: |
| **Slice 1.5 Tier A** (A1–A9) | ✅ Shipped | ☐ Manual operator checks (signoff table empty) | **No** |
| **Slice 2 Foundation + US1–US4** | ✅ Implemented (your branch) | ☐ Not signed off | **Partially** (see §3) |
| **T002 HubSpot spike** | ☐ Not done | ☐ Required before **live** email cutover | N/A |

You can run **most QA now**. T002 only blocks **real HubSpot email sends** and the final **live Slice 2 sign-off**.

---

## 2. Prerequisites (fill in before any session)

Complete this table once; reuse for both slices.

| # | Item | Your value | Why it matters |
| :---: | :--- | :--- | :--- |
| 1 | **Environment** | ☐ UAT ☐ Live ☐ Local dev | UAT = HubSpot Staging + UAT Pages or local proxy. Prefer **UAT** for all first-time QA. |
| 2 | **Frontend URL** | | UAT Pages: `https://bobbybaileysr.github.io/event-management-app-uat/` · Live: `https://bobbybaileysr.github.io/event-management-app/` · Local: `http://localhost:8765` |
| 3 | **Admin account** | `@adaptavist.com`: __________ | Must be `admin` in ScriptRunner **`USER_ROLE_MAP`**. |
| 4 | **Viewer account** | `@adaptavist.com`: __________ | Must be `viewer` (or `staff`). Use **incognito or second browser profile**. |
| 5 | **`USE_MOCK_API`** | ☐ `true` ☐ `false` | **`false`** = real ScriptRunner + HubSpot (required for 1.5 sign-off and live Slice 2). **`true`** = mock data only (Slice 2 UI/logic without HubSpot send). |
| 6 | **`USE_MOCK_AUTH`** | ☐ `true` ☐ `false` | Use **`false`** for operator QA (real Google sign-in). |
| 7 | **Backend SFTP** | ☐ UAT env ☐ Live env | Upload latest `Backend/scripts/` **after** the merge/commit you are testing. Slice 2 needs email handlers + `QueueProcessor.ts`. |
| 8 | **QueueProcessor cron** | ☐ Enabled on UAT | ScriptRunner web UI → Scheduled Trigger → `QueueProcessor` → cron `*/15 * * * *`. Required for **live** scheduled sends and send-now background handoff. |
| 9 | **Test Program** | id/name: __________ | Non-production catalog entry on UAT. |
| 10 | **Test Event** | id/name: __________ | Must belong to test Program; has **registered** attendees in HubSpot. |
| 11 | **Registered contact** | name: __________ | For check-in and email audience tests. |
| 12 | **Unregistered contact** | name/id: __________ | HubSpot contact **not** registered for test Event — required for Slice 1.5 C7.1.1. |
| 13 | **HubSpot Staging** | ☐ Templates visible ☐ Segments visible | Marketing → Email templates; CRM → Segments (Active/Static). Needed for T002 and live Slice 2. |
| 14 | **Disposable test inbox** | email: __________ | For T002 and live send-now — use an address you control; real marketing email will be sent. |

**Browser setup:** Normal window = admin. Incognito / second profile = viewer. Never mix sessions.

**Local dev for live API (no UAT Pages proxy):**

1. Copy `Frontend/dev-server.config.example.js` → `dev-server.config.js`
2. Set `srcListenerUrl` to **UAT** ScriptRunner listener URL
3. `src/config.ts`: `USE_MOCK_AUTH: false`, `USE_MOCK_API: false`, `API_BASE_URL: '/api/ems'`
4. `npm run dev` → `http://localhost:8765`

---

## 3. T002 — HubSpot spike (reminder)

### What it is

**T002** is a **manual proof-of-concept** on **HubSpot Staging** (not application code). Task definition:

> Execute HubSpot API spike (template list, segment list, single test send) and document outcome in `specs/005-email-dispatch/research.md` §R-003 + `Backend/CHANGELOG.md`

### What you prove (four steps)

| Step | Action | Pass criteria |
| :---: | :--- | :--- |
| T002.1 | Confirm private app **scopes** | Marketing email read, list/segment read, and **send** permission on Staging connector |
| T002.2 | **List templates** | API returns at least one `{ id, name }` matching what you see in HubSpot UI |
| T002.3 | **List segments** | API returns Active/Static segments by `{ id, name }` |
| T002.4 | **One test send** | One marketing template → one disposable test Contact; HubSpot accepts request; email arrives or shows as sent/queued in HubSpot |

Document which send path worked ([research.md](./005-email-dispatch/research.md) R-003):

- **Preferred:** bulk send to list/segment ID, **or**
- **Fallback:** resolve segment members + **Single-Send per Contact** (what `QueueProcessor` likely uses)

If T002 fails → park in `Backend/TODO.md` as `BE-EMAIL-SPIKE-001`; do **not** sign off live Slice 2 email.

### Why it blocks live cutover

Slice 2 **accepts** dispatches immediately but **sends in the background** via HubSpot. If the Staging account cannot list templates, list segments, or hand off a send, the dispatch log will stay empty or jobs will fail — you would only discover that after building the full UI.

T002 is the cheap check: **“Can our HubSpot portal do what Slice 2 assumes?”**

It does **not** block:

- Slice 1.5 QA (check-in, attendees, audit — different HubSpot APIs)
- Slice 2 **mock** QA (`USE_MOCK_API: true`)
- Slice 2 **automated tests** (Jest/Vitest use mocks)
- Slice 2 **read-only** live checks (template/segment **lists**, preview **count**, limits) — *if* read scopes already work; still document T002 before calling live send “proven”

It **does** block:

- **`USE_MOCK_API: false`** send-now with real HubSpot handoff
- **Live** scheduled dispatch processing (real emails)
- **US3** segment send against real HubSpot membership
- **Final Slice 2 sign-off** and **Live deploy** for email

---

## 4. QA phase map — what to run when

### Phase A — Anytime (no T002, no UAT deploy)

| ID | Activity | Who | Config |
| :---: | :--- | :--- | :--- |
| A1 | Backend automated tests | Engineering | Local |
| A2 | Frontend automated tests | Engineering | Local |
| A3 | CI green on Slice 2 PR(s) | Engineering | GitHub |
| A4 | `/review-security` on PR branch | Engineering | Cursor |

See **§5** for commands and expected outcomes.

### Phase B — Before T002 (HubSpot data for 1.5; mock Slice 2)

| ID | Activity | Who | Config |
| :---: | :--- | :--- | :--- |
| B1 | **Slice 1.5 full manual QA** | Operator | `USE_MOCK_API: false` + UAT (local proxy or UAT Pages*) |
| B2 | **Slice 2 mock functional QA** | Operator / engineering | `USE_MOCK_API: true` (local) |
| B3 | Slice 2 RBAC smoke | Operator | `USE_MOCK_API: true` or `false` |

\*GitHub Pages UAT has **no API proxy** — for `USE_MOCK_API: false` on a static URL you need **local dev proxy** (see prerequisites) unless `FE-INFRA-001` proxy exists.

### Phase C — T002 (human gate)

| ID | Activity | Who | Where |
| :---: | :--- | :--- | :--- |
| C0 | **Run T002 spike** | You / HubSpot admin | HubSpot Staging + ScriptRunner UAT connector |

See **§3** and **§6**.

### Phase D — After T002 (live Slice 2 cutover)

| ID | Activity | Who | Config |
| :---: | :--- | :--- | :--- |
| D1 | SFTP Slice 2 backend to **UAT** ScriptRunner env | Engineering | — |
| D2 | Enable **QueueProcessor** scheduled trigger on UAT | Engineering | ScriptRunner UI |
| D3 | Merge/deploy Frontend to **`uat`** branch | Engineering | GitHub |
| D4 | **Slice 2 live manual QA** §B1–B6 | Operator | `USE_MOCK_API: false` |
| D5 | **Slice 2 operator security §C** | Operator | `USE_MOCK_API: false` |
| D6 | Re-smoke **Slice 1.5** critical checks (15 min) | Operator | Same UAT build |
| D7 | Sign-off tables + Live promotion | Operator / engineering | `uat` → `main` when ready |

See **§7–§9**.

### Suggested single-day order (combined session)

```
Morning:  Phase A (automated) + Phase B1 (Slice 1.5 on UAT)
          Phase B2 (Slice 2 mock) in parallel if two people
Afternoon: Phase C (T002 spike)
           Phase D1–D4 (deploy + live Slice 2)
Evening:  Phase D5–D6 (security + 1.5 re-smoke) → sign-off
```

---

## 5. Automated tests (Phase A)

Run from your machine on the Slice 2 branch **before** operator QA.

### A1. Backend

**Command:**

```bash
cd Backend
npm test
npm run lint:fix
npx tsc --noEmit -p tsconfig.json
```

**What you need:** Node dependencies installed (`npm install`). No ScriptRunner or HubSpot connection — tests use mocks.

**Expected outcome:**

| Check | Pass |
| :--- | :--- |
| All tests green | Includes `EmailDispatchRoutes.test.ts`, `DispatchQueue.test.ts`, `Slice1Routes.test.ts`, etc. |
| Lint | No errors (or only allowed suppressions) |
| TypeScript | Exit code 0 |

**Slice 2–specific suites (spot-check):**

| Suite | What it proves |
| :--- | :--- |
| `EmailDispatchRoutes.test.ts` | 401/403 without session; preview/create; idempotency; rate limit 429; PATCH/DELETE lock 409 |
| `DispatchQueue.test.ts` | Job pending → processing → completed; recipient **sent** rows written |
| `RouteGuard.test.ts` | `programs/…/email/*` routes are **admin-only** |

**Failure signal:** Any red test — fix before manual QA; do not sign off.

### A2. Frontend

**Command:**

```bash
cd Frontend
npm test
npm run lint
npm run build
```

**What you need:** Node dependencies. No live API.

**Expected outcome:**

| Check | Pass |
| :--- | :--- |
| Vitest | Green — includes `EmailDispatchView.test.tsx`, `dataService.test.ts`, `AttendeesView` dispatch filter tests |
| Lint | No errors |
| Build | `dist/` produced; **no** `.map` files in `dist/assets/` (Slice 1.5 A7) |

**Failure signal:** Build fails (TypeScript) or XSS/RBAC tests fail — fix before operator QA.

### A3–A4. CI and security review (operator comfort)

| # | Question | Pass ☐ |
| :---: | :--- | :---: |
| A3.1 | Backend PR CI green (lint, tsc, test, audit)? | |
| A3.2 | Frontend PR CI green (lint, test, build, audit)? | |
| A4.1 | `/review-security` run on Backend branch — no medium+ unfixed? | |
| A4.2 | `/review-security` run on Frontend branch — no medium+ unfixed? | |

---

## 6. T002 execution guide (Phase C)

**Time:** 1–2 hours  
**Where:** HubSpot Staging portal + ScriptRunner **UAT** environment (same connector EMS uses)

### Option A — ScriptRunner test script (recommended)

Ask engineering to run or create a one-off script in the UAT workspace that:

1. Calls `EmailTemplatesAdapter.listTemplates()`
2. Calls `SegmentsAdapter.listSegments()`
3. Calls `SingleSendAdapter.send(templateId, contactId)` for one test contact

Check ScriptRunner **HTTP logs** and **script invocation logs** for success.

### Option B — HubSpot UI + API tool

Use Postman or HubSpot API docs with the **Staging private app token** (never put token in Frontend).

### Record results

Update [research.md](./005-email-dispatch/research.md) §R-003 with:

- Date tested
- Chosen send path (bulk vs single-send)
- Sample template id/name used
- Sample segment id/name used
- Test contact id
- Pass / fail

Add one bullet to `Backend/CHANGELOG.md`.

| T002 result | Next step |
| :--- | :--- |
| **Pass** | Proceed to **Phase D** (live Slice 2 QA) |
| **Fail** | Park `BE-EMAIL-SPIKE-001` in `Backend/TODO.md`; Slice 2 stays mock-only until HubSpot admin resolves scopes/tier |

---

## 7. Slice 1.5 Tier A — manual operator QA (Phase B1)

**Requires:** `USE_MOCK_API: false`, real UAT ScriptRunner, HubSpot Staging data.  
**Does not require:** T002.

**Run as:** Admin for most steps; **viewer** in separate profile for C4b.2.

### Deploy sanity

| Step | What to do | Expected result | Fail — stop |
| :---: | :--- | :--- | :--- |
| 1.5-C2.1 | Open EMS URL (prerequisites §2). | Login or app shell loads. | Blank page, wrong site, CORS errors. |
| 1.5-C2.2 | DevTools → Network. Sign in as admin. Open Attendees. | Requests go to **ScriptRunner** (`/api/ems` or listener URL), **not** `api.hubapi.com`. | Browser calls HubSpot directly. |
| 1.5-C2.4 | (Engineering) After `npm run build`, check `dist/assets/` for `.map` files. | **No** `.map` files published. | Public source maps. |

### Authentication

| Step | What to do | Expected result | Fail — stop |
| :---: | :--- | :--- | :--- |
| 1.5-C3.2 | Sign in with **admin** Google (`@adaptavist.com`). | Session established; app usable. | Cannot sign in; non-staff gets session. |

### Check-in eligibility (A1)

| Step | What to do | Expected result | Fail — stop |
| :---: | :--- | :--- | :--- |
| 1.5-C7.1.1 | Select test Program + Event. Open **Check-in**. Attempt to confirm check-in for contact **not registered** for that Event (prerequisites §2 #12). | Clear **error**; contact is **not** marked checked-in; no HubSpot write. | Unregistered contact checked in. |

**What you need:** One HubSpot contact associated with the Program but **not** registered for the specific Event (engineering can identify one).

### Attendees read audit (A2)

| Step | What to do | Expected result | Fail — stop |
| :---: | :--- | :--- | :--- |
| 1.5-C5.3a | Admin → **Attendees** → load list for test Event. | List loads. | Error or empty when data should exist. |
| 1.5-C5.3b | Open **`#/audit`** → refresh. | New row with action **`attendees.list`**. | No row after list load. |
| 1.5-C5.4 | Inspect that row’s metadata (expand if UI allows). | Counts/IDs only — **no** attendee email or full name. | PII in metadata. |

### Attendees rate limit (A4)

| Step | What to do | Expected result | Fail — stop |
| :---: | :--- | :--- | :--- |
| 1.5-C7.2.1 | On Attendees, refresh or re-select Event **rapidly ~12+ times within 60 seconds** (same admin session). | Eventually **429** or “rate limit” / “too many requests” message; app recovers after ~1 minute. | Unlimited refreshes with no throttling. |

**Note:** Backend default is **10 requests per 60 seconds** per admin email for bucket `attendees-list`.

### Catalog PATCH audit (A5)

| Step | What to do | Expected result | Fail — stop |
| :---: | :--- | :--- | :--- |
| 1.5-C5.3c | **Catalog** → edit one field on test Program or Event → Save. | Save succeeds. | Save fails for admin. |
| 1.5-C5.3d | Refresh **`#/audit`**. | Row for catalog patch with **`metadata.previous`** and **`metadata.next`** (field-level before/after). | PATCH with no audit or missing before/after. |

### Audit viewer RBAC (A8)

| Step | What to do | Expected result | Fail — stop |
| :---: | :--- | :--- | :--- |
| 1.5-C4a.3 | Admin → **`#/audit`**. | Paginated audit log loads. | Admin cannot open audit. |
| 1.5-C4b.2 | **Viewer** (incognito) → navigate to **`#/audit`**. | Redirect, forbidden, or empty — **no** audit rows. | Viewer sees audit entries. |

### Slice 1.5 sign-off table

| Step ID | Check | Pass ☐ | Fail ☐ | Notes |
| :--- | :--- | :---: | :---: | :--- |
| 1.5-C3.2 | Admin sign-in | | | |
| 1.5-C7.1.1 | Unregistered check-in rejected | | | |
| 1.5-C5.3a/b | Attendees list → audit row | | | |
| 1.5-C5.4 | No PII in audit metadata | | | |
| 1.5-C7.2.1 | Attendees rate limit 429 | | | |
| 1.5-C5.3c/d | Catalog PATCH audit before/after | | | |
| 1.5-C4a.3 | Admin audit access | | | |
| 1.5-C4b.2 | Viewer denied audit | | | |
| 1.5-C2.4 | No production source maps | | | Engineering confirms |

**Operator:** _______________ **Date:** _______________ **Environment:** ☐ UAT ☐ Live

---

## 8. Slice 2 — mock QA (Phase B2, before T002)

**Requires:** `USE_MOCK_API: true` in `src/config.ts` (or local override).  
**Purpose:** Prove UI, navigation, tabs, filters, schedule grid, and client logic **without** HubSpot.

**Suggested catalog context (mock fixtures):** Program `prog-atlassian-2026`, Event `ev-mr-2026` (see [quickstart.md](./005-email-dispatch/quickstart.md) §C).

| Step | What to do | Expected result |
| :---: | :--- | :--- |
| S2-M1 | Sign in (mock or live auth). Select mock Program + Event. Open **`#/events/email`**. | Three tabs: **Compose**, **Scheduled**, **Dispatch log**. |
| S2-M2 | Clear catalog selection. | Empty state guidance — no send controls with data. |
| S2-M3 | Compose → enter dispatch name → pick template **by name** → audience **All registered** → preview. | Recipient count > 0. |
| S2-M4 | **Send now**. | Non-blocking success toast; not stuck on spinner. |
| S2-M5 | **Dispatch log** tab → open detail. | Dispatch listed; **sent** rows appear (mock updates immediately). |
| S2-M6 | Repeat send with **checked-in only** and **manual multi-select** (select 2 people, change filter). | Manual selections **persist** when filter changes. |
| S2-M7 | **Schedule for later** → date/time on **:00/:15/:30/:45** + timezone. | Appears on **Scheduled** tab as **pending**; edit works. |
| S2-M8 | Off-grid time (e.g. `:07`) or past time. | Validation error; not saved. |
| S2-M9 | Audience → **HubSpot segment** → pick segment **by name**. | Preview count > 0 (mock fixture). |
| S2-M10 | **Attendees** → filter by dispatch **Received** / **Did not receive**. | List matches mock dispatch recipients. |
| S2-M11 | Sign in as **viewer** → open **`#/events/email`**. | Redirect / denied; no email PII. |

**Pass mock QA** before spending time on T002/live — catches most UI regressions cheaply.

---

## 9. Slice 2 — live manual QA (Phase D4, after T002)

**Requires:** T002 pass · `USE_MOCK_API: false` · Backend SFTP to UAT · **QueueProcessor** cron enabled · local dev proxy **or** future API proxy.

### B0. Entry and context

| Step | What to do | Expected result | Fail |
| :---: | :--- | :--- | :--- |
| S2-B0.1 | Admin sign-in. Select **real** test Program + Event (prerequisites §2). | Catalog pickers show UAT data. | Empty catalog or wrong env. |
| S2-B0.2 | Sidebar → **Email**. | URL **`#/events/email`**; three tabs visible. | Legacy `#/events/{id}/email` or missing module. |
| S2-B0.3 | Clear Program or Event selection. | Empty state; no template/send data leaked. | Stale data from previous selection. |

### B1. US1 — Send now (registered audience)

| Step | What to do | Expected result | Fail |
| :---: | :--- | :--- | :--- |
| S2-B1.1 | **Compose** tab. | Hourly limit shown (e.g. `0 / 10 dispatches this hour`); large-send threshold hint visible. | Missing limit display. |
| S2-B1.2 | Dispatch name: `QA immediate send`. Pick **real** HubSpot template by **name**. | Template names from HubSpot (not raw ids). | Empty picker or 403. |
| S2-B1.3 | Audience **All registered** → preview/count. | Count > 0 matches expected registrants. | Zero when registrants exist. |
| S2-B1.4 | **Send now**. | Immediate success message; UI not blocked. | Hangs until send completes. |
| S2-B1.5 | **Dispatch log** → open dispatch detail. | Dispatch listed; **sent** rows appear (may take up to **15 min** if queue only runs on cron; send-now may trigger faster via `triggerScript`). | Stuck pending forever. |
| S2-B1.6 | Check disposable inbox for test contact (if small audience). | Marketing email received or visible in HubSpot send history. | No send in HubSpot after 30+ min. |
| S2-B1.7 | Repeat with **checked-in only** and **manual multi-select**. | Correct subsets; manual picks persist across filter changes. | Wrong recipients. |
| S2-B1.8 | (If count ≥ threshold, default **50**) | Confirm modal before send proceeds. | Large send without confirmation. |

### B2. US2 — Schedule

| Step | What to do | Expected result | Fail |
| :---: | :--- | :--- | :--- |
| S2-B2.1 | Compose → **Schedule for later** → valid future slot (:00/:15/:30/:45) · timezone **Europe/London**. | **Scheduled** tab shows **pending** job. | Not listed. |
| S2-B2.2 | Edit template or audience on pending job. | Saves successfully. | 409 or silent fail. |
| S2-B2.3 | When within **15 minutes** of send time. | **lockWarning** visible on Scheduled tab. | No warning. |
| S2-B2.4 | After job enters **processing** (cron claims it). | Edit/cancel **blocked** with clear message. | Can still edit mid-flight. |
| S2-B2.5 | After completion. | Entry in **Dispatch log**; removed from pending Scheduled list. | Duplicate or lost log entry. |
| S2-B2.6 | Try past time or `:07` minute. | Validation error. | Accepts invalid schedule. |

**What you need:** Schedule at least **20–30 minutes ahead** for lock-warning test, or ask engineering to temporarily set a nearer cron for QA.

### B3. US3 — HubSpot segment

| Step | What to do | Expected result | Fail |
| :---: | :--- | :--- | :--- |
| S2-B3.1 | Audience → **HubSpot segment** → pick segment **by name**. | Names from live HubSpot (Active/Static). | Numeric ids only or empty. |
| S2-B3.2 | Preview count. | Count > 0 for known segment. | Zero for populated segment. |
| S2-B3.3 | Send now or schedule. | Dispatch log audience summary shows segment **name**; sends process after queue run. | Wrong audience or send failure. |

**Requires T002** — this is live HubSpot membership + send.

### B4. US4 — Log + attendee filter

| Step | What to do | Expected result | Fail |
| :---: | :--- | :--- | :--- |
| S2-B4.1 | After **two** dispatches, open **Dispatch log**. | Newest first. | Wrong sort order. |
| S2-B4.2 | Open detail. | Per-contact outcome **`sent`** only (no bounce/delivery in Slice 2). | Missing recipients. |
| S2-B4.3 | **Attendees** → filter **Did not receive** dispatch A. | Excludes contacts who received A. | Wrong list. |
| S2-B4.4 | Filter **Received** dispatch A. | Only registered attendees who received A. | Includes non-recipients. |

### B5. RBAC

| Step | What to do | Expected result | Fail |
| :---: | :--- | :--- | :--- |
| S2-B5.1 | **Viewer** → **`#/events/email`**. | Redirect / forbidden; no template names or recipient PII. | Viewer can compose or see log. |

### B6. Rate limit

| Step | What to do | Expected result | Fail |
| :---: | :--- | :--- | :--- |
| S2-B6.1 | Note hourly limit on Compose (default **10**/hour unless Parameter overridden). | Limit visible before send. | Hidden limit. |
| S2-B6.2 | Create dispatches until cap (send-now or new schedules). | Next create shows **rate limited** / 429 message. | Unlimited creates. |

**Tip:** Use small test audiences to avoid spamming contacts while hitting the hourly cap.

---

## 10. Slice 2 — operator security comfort (Phase D5)

**Requires:** `USE_MOCK_API: false` · after Phase D4 functional pass.

### Shared security (both slices)

| Step | What to do | Expected result | Fail |
| :---: | :--- | :--- | :--- |
| SEC-C2 | Network tab: no browser → HubSpot API calls. | All data via ScriptRunner. | `api.hubapi.com` from browser. |
| SEC-C3 | Logout → deep link to `#/events/email` or `#/events/attendees`. | No PII without session. | Data visible logged out. |
| SEC-C6 | Attendees / dispatch log show names with `<` `>` literally if test contact has them (optional). | Plain text, no script execution. | XSS / formatted HTML from HubSpot fields. |

### Slice 2–specific security

| Step | What to do | Expected result | Fail |
| :---: | :--- | :--- | :--- |
| S2-SEC-1 | Viewer denied **`#/events/email`**. | No compose, log, or template PII. | Viewer access. |
| S2-SEC-2 | Admin: create dispatch → **`#/audit`**. | Row with action **`dispatch.create`**; metadata has dispatch name, template id/name, audience type, counts — **no** recipient emails in metadata. | Missing audit or PII in metadata. |
| S2-SEC-3 | Admin: cancel pending scheduled dispatch. | Audit **`dispatch.cancel`**. | Cancel with no audit. |
| S2-SEC-4 | Admin: edit pending scheduled dispatch. | Audit **`dispatch.update`**. | Update with no audit. |
| S2-SEC-5 | Non-admin API call (engineering optional): POST create dispatch with viewer token. | **403** forbidden. | Viewer can create dispatch. |

### Slice 2 sign-off table

| Step ID | Check | Pass ☐ | Fail ☐ | Notes |
| :--- | :--- | :---: | :---: | :--- |
| S2-B0 | Entry + catalog context | | | |
| S2-B1 | Send now + log | | | Live only |
| S2-B2 | Schedule + lock | | | Live only |
| S2-B3 | Segment send | | | Live only; needs T002 |
| S2-B4 | Log + attendee filter | | | |
| S2-B5 | RBAC viewer denied | | | |
| S2-B6 | Dispatch rate limit | | | |
| S2-SEC | Audit + no PII in metadata | | | |
| A1–A2 | Automated tests green | | | Engineering |
| T002 | HubSpot spike documented | | | §6 |

**Operator:** _______________ **Date:** _______________ **Environment:** ☐ UAT ☐ Live

**PR links:** Backend __________ Frontend __________

---

## 11. Post–Slice 2 deploy — Slice 1.5 re-smoke (Phase D6)

After Slice 2 backend is on UAT, re-run **only** these 1.5 checks (~15 min) to ensure shared routes still work:

| Step | Check | Pass ☐ |
| :---: | :--- | :---: |
| R1 | 1.5-C7.1.1 — unregistered check-in still rejected | |
| R2 | 1.5-C5.3a/b — attendees list still audits | |
| R3 | 1.5-C7.2.1 — attendees rate limit still works | |
| R4 | 1.5-C4b.2 — viewer still denied audit | |

---

## 12. Live cutover checklist (after UAT sign-off)

Only when **both** sign-off tables (§7 + §10) pass on **UAT**:

- [ ] T002 documented in [research.md](./005-email-dispatch/research.md) §R-003 + `Backend/CHANGELOG.md`
- [ ] `docs/api-contract.md` includes Slice 2 email routes (merged from [contracts/email-api.md](./005-email-dispatch/contracts/email-api.md))
- [ ] `docs/rbac.md` — all `programs/…/email/*` routes **admin** only
- [ ] **QueueProcessor** cron enabled on **Live** ScriptRunner environment
- [ ] Backend scripts SFTP to **Live** environment
- [ ] Frontend merge **`uat` → `main`** (Live GitHub Pages)
- [ ] Slice 1.5 + Slice 2 sign-off tables archived with dates
- [ ] Optional: repeat §7 + §10 critical rows on Live with production HubSpot

---

## 13. Known exclusions (do not block this QA)

| Item | Notes |
| :--- | :--- |
| Walk-in form B5c (Slice 1) | HubSpot team — **X-008** |
| Capacity live QA (004) | **X-009** |
| Slice 1.5 Tier B | Planned — not in this document |
| Bounces / opens / clicks analytics | Out of Slice 2 scope |

---

## 14. When something fails

1. **Stop** — do not promote to Live.
2. Record: **step ID** (e.g. `S2-B1.5`, `1.5-C7.1.1`), account, Program/Event, screenshot.
3. File issue or message engineering with step ID.
4. After fix: re-run **failed section** + deploy sanity (§7 C2 / §10 SEC-C2).

**Escalate immediately if:** viewer sees PII, unauthenticated data access, HubSpot token in browser, unregistered check-in succeeds, audit contains email/full name, or live send fires without admin session.

---

## Appendix — quick reference: T002 vs QA

| Activity | Before T002 | After T002 |
| :--- | :---: | :---: |
| Backend/Frontend automated tests | ✅ | ✅ |
| Slice 1.5 manual QA (full) | ✅ | ✅ (re-smoke optional) |
| Slice 2 mock QA (`USE_MOCK_API: true`) | ✅ | ✅ |
| Slice 2 live template/segment **lists** + preview count | ⚠️ Maybe* | ✅ |
| Slice 2 send now / schedule / segment **send** | ❌ | ✅ |
| Slice 2 final sign-off | ❌ | ✅ |
| Live production cutover | ❌ | ✅ |

\*Read APIs may work before formal T002 documentation, but **do not sign off live email** until T002 is recorded as pass.
