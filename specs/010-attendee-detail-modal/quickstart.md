# Quickstart: Attendee Detail Modal (Attendee Journey)

Manual and automated validation for **010-attendee-detail-modal** — read-only attendee detail view (US1) and the "Show all communications" expansion (US2).

**Related**: [spec.md](./spec.md) · [plan.md](./plan.md) · [research.md](./research.md) · [data-model.md](./data-model.md) · [contracts/get-attendee-detail.md](./contracts/get-attendee-detail.md) · [contracts/get-attendee-communications.md](./contracts/get-attendee-communications.md) · [ADR-014](../../docs/decisions/014-attendee-communications-hubspot-engagement-pull.md)

Builds on the existing **Attendee list** (`GET events/{evId}/attendees`, admin-only) this modal is opened from — see [Frontend/src/views/AttendeesView.tsx](../../src/views/AttendeesView.tsx).

---

## Sign-off overview

| Area | Gate | Notes |
| :--- | :---: | :--- |
| **Automated tests** | Required | §A — before release candidate |
| **US1 Basic Information + event-only journey** | Required | §B1 |
| **US2 "Show all communications" expansion** | Required | §B2 — needs a test Contact with real cross-Event/external HubSpot history |
| **Operator security comfort checks** | Required before Live | §C |
| **HubSpot scope confirmation** | Required before build of the real adapter | `HS-011` — see [research.md](./research.md) R-001 |

---

## Prerequisites

1. Backend: `OnGetAttendeeDetail.ts` and `OnGetAttendeeCommunications.ts` deployed via SFTP, registered in `Utils/Routes.ts`, RBAC rule in `Utils/RouteGuard.ts`, new audit action wired in `Utils/Audit.ts`.
2. `HS-011` (HubSpot scope for Contact engagement/timeline reads) confirmed and granted — otherwise `GET attendees/{contactId}/communications` cannot return real non-Event data (§B2 will only show the degrade path).
3. `HS-010` (dietary requirement property) — optional for sign-off; if not yet created, that one field simply stays blank in §B1, which is expected and not a failure.
4. **Admin** test account in `USER_ROLE_MAP`; **viewer** (or any non-admin) test account for RBAC checks.
5. Catalog: a test Program + Event with at least one Registered attendee who also has a real HubSpot marketing-email history predating and postdating this Event (for a meaningful §B2 test) — ideally including at least one dispatch sent for a *different* Event.
6. `Frontend` build with the new `AttendeeDetailModal` component wired into `AttendeesView.tsx`'s row click.

---

## A. Automated tests

### A1. Backend

```bash
cd Backend
npm test -- --testPathPattern="AttendeeDetail|AttendeeCommunications|RouteGuard|Audit"
npm run lint:fix
```

| Suite | Covers |
| :--- | :--- |
| `OnGetAttendeeDetail.test.ts` (new) | 200 shape matches [contracts/get-attendee-detail.md](contracts/get-attendee-detail.md); `404 contact_not_registered` for a Contact with no association to `evId`; pending fields (`dietaryRequirement`, `registrationSource`, `registered`/`dispatch_opened` timestamps) are `null`, never fabricated |
| `OnGetAttendeeCommunications.test.ts` (new) | 200 shape matches [contracts/get-attendee-communications.md](contracts/get-attendee-communications.md); dedup logic (research.md R-002) doesn't double-count an EMS-sent dispatch that also appears in the HubSpot pull; `cutoffTimestamp` correctly excludes anything older; `422 validation_error` when `eventId` query param is missing; `502 hubspot_engagement_unavailable` degrade path returns `this_event`-only timeline with `degraded: true` rather than failing the request |
| `RouteGuard.test.ts` (extended) | Both new routes are `admin`-only; non-admin gets `403 forbidden` |
| `Audit.test.ts` (extended) | `attendee.communications.view_all` row written on successful communications fetch, with `eventId`/`contactId` metadata only — **no** attendee email or name |

### A2. Frontend

```bash
cd Frontend
npm test -- AttendeeDetailModal AttendeesView dataService
npm run lint
```

| Area | Covers |
| :--- | :--- |
| `AttendeeDetailModal.test.tsx` (new) | Renders Basic Information + event-only journey by default; toggle expands/collapses and flips its own label; loading state shows during the communications fetch; on fetch failure, event-only timeline stays visible with a retry, modal does not blank; empty non-Event result is a silent no-op (spec.md US2 Acceptance Scenario 4); **XSS guard**: hostile strings (`<script>`, `<img onerror=…>`) in company/job title/dietary requirement/other-Event name render as literal text, never executed markup (`FE-ATTENDEE-DETAIL-002`); HubSpot contact ID never rendered anywhere in the DOM |
| `AttendeesView.test.tsx` (extended) | Row click (outside the action-button cell) opens the modal; clicking the Remove/Undo button does not also open it |
| `dataService.test.ts` (extended) | `fetchAttendeeDetail`/`fetchAttendeeCommunications` map both new response shapes correctly through `normalizeApi.ts` |

---

## B. Manual QA (UAT)

### B1. Basic Information + event-only journey (US1)

1. Sign in as **admin**, open the test Program + Event's Registered Attendees screen.
2. Click a registered attendee's row (not the action-button cell) → modal opens.
3. Confirm Basic Information shows email/company/attendee type/checked-in status; phone/job title show if `HS-010` populated data exists, otherwise are simply absent (not blank placeholders).
4. Confirm the Attendee Journey timeline shows only this Event's steps, in chronological order, with "Not yet"-style copy (not a fabricated date) for any step whose timestamp is `null`.
5. Confirm no HubSpot contact ID is visible anywhere in the modal.
6. Confirm no edit/delete control exists anywhere in the modal.
7. Click **Close** → modal closes, focus returns to the triggering row (per `useModalFocusTrap` convention).

### B2. "Show all communications" expansion (US2)

1. With the modal open from B1, click **"Show all communications"**.
2. Confirm the control's own label flips to **"Show event lifecycle only"**.
3. Confirm a loading indicator shows briefly, then the timeline expands with additional items.
4. Confirm every non-Event item carries a tag — the specific other Event's name when it's a known EMS dispatch, or a generic label when it's an external HubSpot send.
5. Confirm nothing older than this attendee's earliest event-related communication appears, and there is no pagination control.
6. Click the toggle again → confirm it collapses back to the B1 view and the label flips back.
7. Open **`#/audit`** (admin) and confirm a fresh `attendee.communications.view_all` row appears with `eventId`/`contactId` metadata only — no attendee email or name.

---

## C. Operator security comfort checks

> **When to run:** After §A automated tests pass in CI and before marking this slice signed off on Live (or UAT, if that is your release gate).
> **Time:** Allow 45–60 minutes for a first run; 15–20 minutes for re-runs after small fixes.
> **Rule:** If any **Failure signal** below occurs, **stop**, note the step number, and do not deploy to Live until engineering fixes and you re-run the failed checks.

### C0. What you are proving (read once)

| Property | Plain English |
| :--- | :--- |
| **No HubSpot secrets in the browser** | Only your Google login + EMS session; no API keys in the page |
| **Staff only** | Wrong or non-staff Google account cannot get a session |
| **Role boundaries** | Non-admin roles cannot open this modal or its underlying routes |
| **Traceability** | Opening "Show all communications" leaves a row in **Audit** without leaking email/name into that row |
| **Safe display** | Names, companies, job titles, and dietary requirements from HubSpot show as plain text, never executable HTML |
| **Bounded exposure** | "Show all communications" never reveals communications from before this attendee's relationship with the current Event began |

### C1. Before you start

| # | Item | Your value | How to confirm |
| :---: | :--- | :--- | :--- |
| 1 | **Environment** | ☐ UAT ☐ Live | Full URL you will use. |
| 2 | **Admin test account** | `@adaptavist.com` email | Listed as `admin` in `USER_ROLE_MAP`. |
| 3 | **Viewer test account** | `@adaptavist.com` email | Listed as `viewer` in `USER_ROLE_MAP`. Separate browser/profile. |
| 4 | **Frontend data path** | ☐ UAT ScriptRunner confirmed | EMS has no mock-data mode; confirm requests reach the intended environment. |
| 5 | **Backend deployed** | ☐ Yes | Confirm `OnGetAttendeeDetail.ts`, `OnGetAttendeeCommunications.ts` uploaded via SFTP after the merge you're testing. |
| 6 | **Test Program + Event** | Program/Event name | Pick a non-production Event with ≥1 registered attendee who has other-Event/external HubSpot email history. |
| 7 | **HS-011 scope status** | ☐ Granted ☐ Not yet | If not yet granted, §C7.2 will only exercise the degrade path (`502 hubspot_engagement_unavailable`) — expected, not a failure. |

### C2. Deploy and config sanity

| Step | Action | Expected result | Failure signal — stop |
| :---: | :--- | :--- | :--- |
| C2.1 | Open the EMS URL. Sign in as admin, open the test Event's Attendees screen. | Loads normally. | 404, blank screen, console CORS errors. |
| C2.2 | DevTools → Network. Open the Attendee Detail modal, then click "Show all communications". | Both requests go to **ScriptRunner**, never directly to `api.hubapi.com`. | Any browser request straight to HubSpot. |
| C2.3 | DevTools → Application → Storage. Search `hubspot`, `token`, `api_key`. | No HubSpot token in storage; session token in memory only. | HubSpot API key/token in browser storage. |

### C3. Authentication boundary

| Step | Action | Expected result | Failure signal — stop |
| :---: | :--- | :--- | :--- |
| C3.1 | Sign out. Attempt to reach the Attendees screen directly via URL. | Redirect to login; no attendee PII visible. | Attendee data visible without login. |
| C3.2 | Sign in as admin. Open the modal. | Modal opens normally. | Access denied for a mapped admin. |

### C4. Role boundaries — RBAC

#### C4a. Admin — allowed

| Step | Action | Expected result | Failure signal |
| :---: | :--- | :--- | :--- |
| C4a.1 | Sign in as admin. Open the Attendee Detail modal for a registered attendee. | Modal opens with data, no 403. | "Forbidden" or blank error. |
| C4a.2 | Click "Show all communications". | Expansion loads (or shows the degrade state if `HS-011` isn't granted yet), no 403. | 403 while signed in as admin. |

#### C4b. Viewer — denied

| Step | Action | Expected result | Failure signal |
| :---: | :--- | :--- | :--- |
| C4b.1 | Sign in as viewer. Attempt to reach the Attendees screen. | Same denial as today's existing Attendee list gate (viewer already can't reach this screen) — modal is therefore unreachable too. | Viewer can open the Attendee Detail modal or see any attendee PII. |

### C5. Audit trail

| Step | Action | Expected result | Failure signal |
| :---: | :--- | :--- | :--- |
| C5.1 | Sign in as admin. Open `#/audit`. | Loads normally. | 403 or error for admin. |
| C5.2 | In another tab, open an Attendee Detail modal and click "Show all communications". | Completes in UI (or shows degrade state). | Action fails silently. |
| C5.3 | Refresh `#/audit`. Find the newest `attendee.communications.view_all` row. | Row shows your email, timestamp, `eventId`, `contactId`. | No row appears. |
| C5.4 | Inspect that row's metadata. | Contains only `eventId`/`contactId` — **no** attendee email, name, or phone. | Attendee email/name/phone present in metadata. |
| C5.5 | Open the modal again but do **not** click "Show all communications" — just view Basic Information + the default journey. | **No** new audit row is written for this view alone (matches every other unaudited Slice 1 GET). | An audit row appears for the default view too (over-auditing, not per design). |

### C6. PII display safety

| Step | Action | Expected result | Failure signal |
| :---: | :--- | :--- | :--- |
| C6.1 | Automated (engineering runs pre-merge): hostile strings (`<script>`, `<img onerror=…>`) in company/job title/dietary requirement/other-Event name. | CI green — asserts text content, not HTML nodes. | CI failing — do not sign off. |
| C6.2 | Manual spot-check: ask engineering for a UAT test Contact with a field like `Test <b>XSS</b>` in company or job title. | Angle brackets show literally; no bold formatting, no alert popup. | Script alert, bold text, or broken layout. |

### C7. Slice-specific security checks

#### C7.1 HubSpot contact ID never exposed

| Step | Action | Expected result | Failure signal |
| :---: | :--- | :--- | :--- |
| C7.1.1 | Open the modal for any attendee. View page source / inspect DOM for the visible modal content. | No raw HubSpot contact ID (e.g. a numeric HubSpot record id) is present anywhere in the rendered modal. | Contact ID visible in Basic Information or anywhere else in the modal. |

#### C7.2 Cross-Event / external communications bounded correctly

| Step | Action | Expected result | Failure signal |
| :---: | :--- | :--- | :--- |
| C7.2.1 | Expand "Show all communications" for an attendee known to have HubSpot email history **older** than their relationship with the current Event. | That older history does **not** appear in the expanded timeline. | Communications from before the attendee's earliest event-related activity appear. |
| C7.2.2 | Expand for an attendee known to have received a dispatch for a **different, specific** Event. | That item is tagged with the other Event's actual name. | Item missing, or tagged only generically when a specific Event name was knowable. |
| C7.2.3 | Expand for an attendee with a HubSpot marketing send EMS never sent. | Item appears tagged generically (e.g. "OTHER DISPATCH"), not mislabeled as a specific Event. | Item missing entirely, or falsely attributed to a specific EMS Event. |

#### C7.3 Rate limiting on the communications route

| Step | Action | Expected result | Failure signal |
| :---: | :--- | :--- | :--- |
| C7.3.1 | Toggle "Show all communications" open/closed rapidly, well beyond the configured per-actor limit (ask engineering for the exact number — see [contracts/get-attendee-communications.md](contracts/get-attendee-communications.md)). | Eventually `429`/rate-limit message; recovers after waiting. | Unlimited requests, no throttling. |

### C8. Automated test comfort

| # | Question | Answer for this slice |
| :---: | :--- | :--- |
| C8.1 | Did the PR(s) for this feature have green CI (lint, test, build)? | ☐ Yes — link: `<!-- FILL: PR URL -->` |
| C8.2 | Was `/security-review` run and summarised on the PR? | ☐ Yes — note: `<!-- FILL -->` |
| C8.3 | Test count stable or increased? | ☐ Yes |

### C9. When something fails

1. **Stop** Live deploy.
2. Record: step ID, account used, Program/Event, screenshot if helpful.
3. File an issue or message engineering with that ID.
4. After fix: re-run only failed sections plus C2.

**Escalate to InfoSec / defer Live** if: viewer can reach this modal, HubSpot contact ID is exposed, cross-Event PII appears outside the stated bounds, or audit rows contain email/name.

### C10. Operator security sign-off

| Step ID | Check | Pass ☐ | Fail ☐ | Notes |
| :--- | :--- | :---: | :---: | :--- |
| C2 | Deploy and config sanity | | | |
| C3 | Authentication boundary | | | |
| C4a | Admin allowed paths | | | |
| C4b | Viewer denied paths | | | |
| C5 | Audit trail | | | |
| C6 | PII display safety | | | |
| C7.1 | HubSpot contact ID never exposed | | | |
| C7.2 | Cross-Event/external comms bounded correctly | | | |
| C7.3 | Rate limiting | | | |
| C8 | CI + security review confirmed | | | |

**Operator name:** _______________ **Date:** _______________ **Environment:** ☐ UAT ☐ Live

**Slice / tier:** `010-attendee-detail-modal` **Version / PR:** `<!-- FILL -->`
