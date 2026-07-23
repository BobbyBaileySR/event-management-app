# Quickstart: Email Dispatch (Slice 2)

Manual and automated validation for **005-email-dispatch** — compose send (US1), schedule (US2), HubSpot segments (US3), dispatch log + attendee filter (US4).

**Related**: [spec.md](./spec.md) · [plan.md](./plan.md) · [contracts/email-api.md](./contracts/email-api.md) · [data-model.md](./data-model.md)

Builds on [003 quickstart](../003-check-in/quickstart.md) (catalog context, attendees, admin RBAC).

---

## Sign-off overview

| Area | Gate | Notes |
| :--- | :---: | :--- |
| **Automated tests** | Required | §A — before release candidate |
| **US1 Send now** | Required | §B1 — live UAT |
| **US2 Schedule** | Required | §B2 — includes lock warning + edit/cancel |
| **US3 Segment send** | Required | §B3 — live HubSpot only |
| **US4 Log + attendee filter** | Required | §B4 |
| **RBAC** | Required | §B5 — non-admin denied |
| **HubSpot spike** | Required before live | [research.md](./research.md) R-003 |

---

## Prerequisites

1. **001–003** catalog + attendees deployed on UAT.
2. **005 Backend** SFTP-deployed: email routes, `QueueProcessor`, Record Storage dispatch store, HubSpot adapters.
3. Frontend `API_BASE_URL` points to the intended UAT ScriptRunner environment. EMS has no mock-data mode.
4. **Admin** account in `USER_ROLE_MAP`; non-admin for RBAC checks.
5. Catalog: Program + Event with known registrants.
6. HubSpot: marketing templates + CRM segments visible in portal (verified 2026-07-07).
7. Parameters: `DISPATCH_RATE_LIMIT_PER_HOUR`, `DISPATCH_CONFIRM_THRESHOLD` / frontend `EMAIL_SEND_CONFIRM_THRESHOLD`.

---

## A. Automated tests

### A1. Backend

```bash
cd Backend
npm test -- --testPathPattern="EmailDispatch|DispatchQueue"
npm run lint:fix
```

| Suite | Covers |
| :--- | :--- |
| `EmailDispatchRoutes.test.ts` | 401/403; preview; create idempotency; rate limit 429; PATCH/DELETE lock 409 |
| `DispatchQueue.test.ts` | pending→processing→completed; partial sent rows |
| `RouteGuard.test.ts` | New routes admin-only |

### A2. Frontend

```bash
cd Frontend
npm test -- Email Dispatch dataService Attendees
npm run lint
```

| Area | Covers |
| :--- | :--- |
| `EmailDispatchView` | Unified dispatch list, compose modal, limits display, large-send confirm |
| `dataService` | Event-scoped email paths |
| `AttendeesView` | `dispatchFilter` query |
| XSS guards | Hostile dispatch names render as text |

---

## B. Manual QA (UAT)

### B0. Entry & context

1. Sign in as **admin**.
2. Select a working Event through Programs & Events or the Sidebar picker.
3. Open **Email** from the Sidebar → URL **`#/events/{eventId}/email`**.
4. **Pass**: unified campaign/dispatch list with summary stats and **+ New campaign**.
5. With no working Event, the event-scoped Email link is disabled and the legacy `#/events/email` redirects to `#/events`.

### B1. US1 — Send now (registered audience)

1. Select **+ New campaign**; the modal shows hourly limit and large-send threshold guidance.
2. Enter campaign/dispatch name **"QA immediate send"**.
3. Select template by **name**.
4. Audience: **All registered** → preview count > 0.
5. **Send campaign now** → non-blocking success; modal closes and the list refreshes.
6. Dispatch appears in the unified list; open detail → **sent** rows populate (may take up to one queue tick).
7. Repeat with **checked-in only** and **manual multi-select** (select 2 people, change filter — selections persist).

**Large send**: If count ≥ threshold, confirm modal appears before accept.

### B2. US2 — Schedule

1. **+ New campaign** → **Schedule campaign** → pick date/time on **:00/:15/:30/:45** grid + timezone **Europe/London**.
2. Save → unified list shows the job as **Scheduled** / pending.
3. Edit template or audience → saves.
4. When within 15 minutes of send → **lockWarning** visible.
5. After cron claims job → edit/cancel **blocked** with clear message.
6. After completion → the unified list shows its completed outcome rather than pending.

**Negative**: Past time → validation error. Off-grid minute (e.g. :07) → rejected.

### B3. US3 — HubSpot segment

1. Audience type → **HubSpot segment** → picker shows **names** (not numeric ids).
2. Preview count > 0 for known segment.
3. Send now or schedule → log audience summary includes segment **name**.

*(Requires live HubSpot segment data.)*

### B4. US4 — Log + attendee filter

1. After two dispatches, unified dispatch list is newest-first.
2. Detail shows per-Contact **sent** only.
3. **Attendees** → filter **Did not receive** dispatch A → list excludes A recipients.
4. Filter **Received** dispatch A → only recipients on attendee roster.

### B5. RBAC

1. Sign in as non-admin (or viewer).
2. Attempt `#/events/{eventId}/email` → redirected; no PII.

### B6. Rate limit

1. Note the hourly limit in the **New campaign** modal.
2. Create dispatches until cap → next create returns **rate limited** message.

---

## C. Operator security comfort checks

### C0. Goal

Prove that Event email data and dispatch writes stay behind the admin/session boundary, use ScriptRunner rather than browser-held HubSpot credentials, produce non-PII audit metadata, and render remote text safely.

### C1. Prerequisites

| Item | Required value |
| :--- | :--- |
| Environment | UAT URL and matching ScriptRunner/HubSpot Staging environment |
| Accounts | One mapped `admin`; one mapped `viewer` in a separate browser/profile |
| Event | Dedicated test Event with at least one registered test Contact |
| Backend | Current email handlers + `QueueProcessor` deployed; scheduled trigger enabled |
| Send gate | Keep `EMAIL_SEND_ENABLED=false` except during the explicitly approved live-send step |
| Frontend | Requests confirmed against the intended ScriptRunner listener; no mock-data mode exists |

### C2. Deploy, authentication, and data boundary

| Step | Action | Expected result | Failure signal — stop |
| :---: | :--- | :--- | :--- |
| C2.1 | Open UAT, sign in as admin, select the test Event, then open `#/events/{eventId}/email`. | Unified dispatch list loads. Network requests go to ScriptRunner with `?route=events/{eventId}/email/...`. | Blank/error build, wrong environment, or direct browser request to `api.hubapi.com`. |
| C2.2 | Sign out and reopen the same deep link. | Login/redirect; no template, segment, dispatch, or recipient data. | Any email/recipient data visible without a session. |
| C2.3 | Inspect Local/Session Storage for HubSpot tokens or API keys. | No HubSpot credential is stored; EMS session remains memory-only. | HubSpot private token/key in browser storage or source. |

### C3. RBAC

| Step | Action | Expected result | Failure signal — stop |
| :---: | :--- | :--- | :--- |
| C3.1 | Admin opens Email and **+ New campaign**. | Templates/segments/limits load and preview is available. | Mapped admin receives 403. |
| C3.2 | Viewer attempts `#/events/{eventId}/email`. | Redirect/deny; no template names, dispatches, or recipient PII. | Viewer reaches the module or can call an email route successfully. |

### C4. Write safety and audit

| Step | Action | Expected result | Failure signal — stop |
| :---: | :--- | :--- | :--- |
| C4.1 | Preview a registered audience without sending. | Recipient count appears; no dispatch/audit write is created. | Preview sends email or creates a dispatch. |
| C4.2 | Create one approved UAT dispatch (small controlled audience). | Success toast/list refresh; audit shows `email.dispatch.create`. | Send occurs without admin session, or no audit row is produced. |
| C4.3 | Schedule, edit, then cancel a pending UAT dispatch. | Audit rows show `email.dispatch.create`, `email.dispatch.update`, and `email.dispatch.cancel`; processing jobs cannot be edited/cancelled. | Missing audit, or a processing job can be changed. |
| C4.4 | Inspect audit metadata for those rows. | IDs, template/audience labels, and counts only; no recipient email/full name. | Recipient email/name appears in metadata. |
| C4.5 | Use an audience at/above the configured confirmation threshold. | Confirmation is required before acceptance. | Large dispatch accepted without confirmation. |

### C5. Safe display

| Step | Action | Expected result | Failure signal — stop |
| :---: | :--- | :--- | :--- |
| C5.1 | Confirm CI includes hostile dispatch/template/segment strings; optionally use a UAT label such as `Test <b>XSS</b>`. | Text displays literally; no markup/script executes. | Formatting/script execution or broken DOM from remote text. |

### C6. Operator security sign-off

| Step | Check | Pass ☐ | Fail ☐ | Notes |
| :--- | :--- | :---: | :---: | :--- |
| C2 | Deploy/auth/data boundary | | | |
| C3 | Admin allowed + viewer denied | | | |
| C4 | Write gates + audit/no PII | | | |
| C5 | Safe display | | | |

**Operator:** _______________ **Date:** _______________ **Environment:** ☐ UAT ☐ Live

---

## D. Live cutover checklist

- [ ] HubSpot spike R-003 documented in Backend CHANGELOG
- [ ] `docs/api-contract.md` merged from [contracts/email-api.md](./contracts/email-api.md)
- [ ] `docs/rbac.md` updated — email routes **admin** only
- [ ] `QueueProcessor` scheduled trigger enabled on UAT — **concretely:** one Scheduled Trigger, script `QueueProcessor`, default export, no payload, every 15 minutes. See `Backend/README.md`'s "Scheduled Trigger" section (previously undocumented — added 2026-07-16). Same trigger also runs 008-qr-ticket-emails' ticket-purge sweep once that slice is deployed; no second trigger needed. Confirm it actually fires: schedule a dispatch a few minutes out and see it land in the Dispatch log without manual intervention.
- [ ] §B1–B6 pass on UAT through the live ScriptRunner data path
- [x] **T002.4 — real send verified live, before `EMAIL_SEND_ENABLED` is set `true` anywhere real.** **2026-07-21: confirmed.** A real single-recipient "Send now" succeeded end-to-end (request shape accepted, QR ticket delivered and scannable) after fixing two unrelated bugs surfaced along the way — a synchronous template-lookup timeout (408) and a wrong assumed `type`/`subcategory` eligibility pair; see `Backend/CHANGELOG.md` 2026-07-21 and `Frontend/specs/008-qr-ticket-emails/research.md` R-002. Not yet exercised: a multi-recipient send or the full §B1–B6 script below.
- [ ] **Large-send timeout chaining exercised at least once.** `DispatchQueue.ts`/`QueueProcessor.ts` now stop cleanly and self-re-trigger via `triggerScript` if a dispatch's send loop would run past ScriptRunner Connect's 15-minute execution ceiling (`DISPATCH_TIME_BUDGET_MS`), rather than being hard-killed mid-send. Not exercised by §B1–B6 (small test audiences) — worth a deliberate large/confirmed send (near or above `DISPATCH_CONFIRM_THRESHOLD`) at least once before relying on this for a real large audience, to confirm the job reaches `completed` rather than stalling `processing`.
