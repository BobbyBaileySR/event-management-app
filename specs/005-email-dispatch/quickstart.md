# Quickstart: Email Dispatch (Slice 2)

Manual and automated validation for **005-email-dispatch** — compose send (US1), schedule (US2), HubSpot segments (US3), dispatch log + attendee filter (US4).

**Related**: [spec.md](./spec.md) · [plan.md](./plan.md) · [contracts/email-api.md](./contracts/email-api.md) · [data-model.md](./data-model.md)

Builds on [003 quickstart](../003-check-in/quickstart.md) (catalog context, attendees, admin RBAC).

---

## Sign-off overview

| Area | Gate | Notes |
| :--- | :---: | :--- |
| **Automated tests** | Required | §A — before release candidate |
| **US1 Send now** | Required | §B1 — mock then live UAT |
| **US2 Schedule** | Required | §B2 — includes lock warning + edit/cancel |
| **US3 Segment send** | Required | §B3 — live HubSpot only |
| **US4 Log + attendee filter** | Required | §B4 |
| **RBAC** | Required | §B5 — non-admin denied |
| **HubSpot spike** | Required before live | [research.md](./research.md) R-003 |

---

## Prerequisites

1. **001–003** catalog + attendees deployed on UAT.
2. **005 Backend** SFTP-deployed: email routes, `QueueProcessor`, Record Storage dispatch store, HubSpot adapters.
3. Frontend: **`USE_MOCK_API: false`** for release QA; mock OK for UI-only iteration.
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
| `EmailDispatchView` | Tabs, compose, limits display, large-send confirm |
| `dataService` | Catalog-scoped email paths |
| `AttendeesView` | `dispatchFilter` query |
| XSS guards | Hostile dispatch names render as text |

---

## B. Manual QA (UAT)

### B0. Entry & context

1. Sign in as **admin**.
2. Select **Program + Event** in catalog pickers.
3. Open **Email** from sidebar → URL **`#/events/email`**.
4. **Pass**: Three tabs — Compose, Scheduled, Dispatch log.
5. Clear catalog selection → **Pass**: empty state guidance (no send data).

### B1. US1 — Send now (registered audience)

1. **Compose** tab shows hourly limit (e.g. `2 / 10 dispatches this hour`) and large-send threshold hint.
2. Enter dispatch name **"QA immediate send"**.
3. Select template by **name**.
4. Audience: **All registered** → preview count > 0.
5. **Send now** → non-blocking success; not stuck on spinner.
6. **Dispatch log** tab → dispatch appears; open detail → **sent** rows populate (may take up to one queue tick on live).
7. Repeat with **checked-in only** and **manual multi-select** (select 2 people, change filter — selections persist).

**Large send**: If count ≥ threshold, confirm modal appears before accept.

### B2. US2 — Schedule

1. Compose → **Schedule for later** → pick date/time on **:00/:15/:30/:45** grid + timezone **Europe/London**.
2. Save → **Scheduled** tab lists job as **pending**.
3. Edit template or audience → saves.
4. When within 15 minutes of send → **lockWarning** visible.
5. After cron claims job → edit/cancel **blocked** with clear message.
6. After completion → entry in **Dispatch log**; removed from Scheduled pending list.

**Negative**: Past time → validation error. Off-grid minute (e.g. :07) → rejected.

### B3. US3 — HubSpot segment

1. Audience type → **HubSpot segment** → picker shows **names** (not numeric ids).
2. Preview count > 0 for known segment.
3. Send now or schedule → log audience summary includes segment **name**.

*(Live HubSpot only — mock uses fixture segments.)*

### B4. US4 — Log + attendee filter

1. After two dispatches, **Dispatch log** newest-first.
2. Detail shows per-Contact **sent** only.
3. **Attendees** → filter **Did not receive** dispatch A → list excludes A recipients.
4. Filter **Received** dispatch A → only recipients on attendee roster.

### B5. RBAC

1. Sign in as non-admin (or viewer).
2. Attempt `#/events/email` → redirected; no PII.

### B6. Rate limit

1. Note limit on Compose tab.
2. Create dispatches until cap → next create returns **rate limited** message.

---

## C. Mock shortcut

`USE_MOCK_API: true` — Program `prog-atlassian-2026`, Event `ev-mr-2026`:

- Templates/segments from fixtures
- Send/schedule updates mock store immediately
- Attendee `dispatchFilter` honoured

Use for UI/demo without HubSpot spike.

---

## D. Live cutover checklist

- [ ] HubSpot spike R-003 documented in Backend CHANGELOG
- [ ] `docs/api-contract.md` merged from [contracts/email-api.md](./contracts/email-api.md)
- [ ] `docs/rbac.md` updated — email routes **admin** only
- [ ] `QueueProcessor` scheduled trigger enabled on UAT
- [ ] §B1–B6 pass on UAT with `USE_MOCK_API: false`
