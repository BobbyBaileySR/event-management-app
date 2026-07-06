# Quickstart: Attendees & Check-in validation (003)

End-to-end checks for **003-check-in** (Slice 1 attendee list + check-in). Builds on [001 quickstart](../001-catalog-admin/quickstart.md) and [002 quickstart](../002-catalog-metadata-modal/quickstart.md).

**Related**: [spec.md](./spec.md) · [tasks.md](./tasks.md) · [contracts/check-in-api.md](./contracts/check-in-api.md)

---

## Prerequisites

1. **001 + 002** catalog on `uat` (live `GET catalog` via ScriptRunner).
2. **003 Backend** slice handlers SFTP-deployed: `OnGetAttendees`, `OnCheckInScan`, `OnCheckIn`, HubSpot adapters, `OnHttpRouter` route wiring.
3. Frontend `config.ts`: **`USE_MOCK_API: false`** for release QA (ScriptRunner Connect). Use **`true`** only for offline UI iteration without Backend.
4. Admin test account in `USER_ROLE_MAP`; viewer/staff account for RBAC checks.
5. Catalog selection: a **live** Program + Event with known HubSpot registrants (not mock seed names unless `USE_MOCK_API: true`).
6. ScriptRunner Parameters (live QR): `CHECKIN_JWT_PUBLIC_KEY`, `CHECKIN_JWT_ISSUER` — required before §5 live QR.

**Mock-only shortcut**: Program `prog-atlassian-2026` + Event `ev-mr-2026` seed (`Jane Doe`, `Pat Lee`) when `USE_MOCK_API: true`.

---

## 1. Backend unit tests (local)

```bash
cd Backend
npm test -- --testPathPattern="Slice1|CheckInJwt|RegistrationAdapter"
npm run lint:fix
```

**Expected**:

- `Slice1Routes.test.ts` — 401/403 attendees; 422/503 scan; 422 confirm; idempotent confirm
- `CheckInJwt.test.ts` — alg pin, expiry, event mismatch
- `RegistrationAdapter.test.ts` — registrant query logic

**Gap (before live)**: add happy-path scan + first-time confirm tests (see tasks T041–T042).

---

## 2. Frontend unit tests (local)

```bash
cd Frontend
npm test -- Attendees CheckIn CheckInQr dataService
npm run lint
```

**Expected**: AttendeesView (7), CheckInView (9), LoadingState (2), CheckInQrPanel, dataService slice paths. Check-in tests must finish in &lt;10s (stable `useDataService` mock — fixed 2026-07-06).

**Automated coverage from 2026-07-06 window**: pagination, debounced search (layout stays mounted), 375px overflow smoke (Attendees + Check-in), XSS guards.

---

## 3. Attendees list (admin)

**API**: `GET /api/ems/programs/{programId}/events/{eventId}/attendees` → ScriptRunner → HubSpot (when `USE_MOCK_API: false`).

1. Sign in as **admin**.
2. Select **Program** + **Event** in catalog pickers (live catalog entries).
3. Sidebar → **Attendees** (`#/events/attendees`).

**Expected**:

- Initial load shows **spinner + table skeleton** (not plain text only); TopBar stays visible.
- Table fills available vertical space; scrolls inside the card when many rows.
- Columns: name, company, email, account manager, track, checked-in.
- TopBar meta shows total + range (e.g. `N registered · showing 1–50 · HubSpot live`).
- If **N &gt; 50**: **Previous** / **Next** pagination works; range updates; table shows **Updating…** overlay and pagination reads **Loading page…** while the next page loads.
- Search a **known live registrant** (partial name/company) → results after ~300ms pause; page stays mounted with inline **Updating…** spinner (no full-page reload).
- Filter **Not checked in** → unchecked rows only.
- **Performance (accepted for Slice 1)**: first load / search may take several seconds on live HubSpot — wait for spinner to clear; do not fail QA for slowness alone (see **BE-SLICE1-006** / **FE-SLICE1-005**).

4. Sign in as **viewer/staff** → Attendees link hidden or route redirects to `#/events`.

**Mock variant** (`USE_MOCK_API: true`): search `Jane` → Jane Doe; pagination with total 120 if seed extended.

---

## 4. Check-in by name search (admin)

**API**: same attendees route with `q`, `page=1`, `pageSize=200` (server-side search across registrants).

1. Admin + catalog context → **Check-in** (`#/events/check-in`).
2. Before typing: table shows “Type at least 2 characters…”.
3. Search **≥2 characters** matching a **live registrant** → select row → summary shows email, company, account manager.
4. **Confirm check-in** → success toast; repeat → idempotent “already checked in” toast.

**Expected**:

- Typing does **not** flash full-page loading; inline **Searching…** spinner while fetching.
- QR panel stays visible while searching.
- On mobile/tablet (~375px): QR block above search; table columns collapse; no horizontal page scroll.
- If &gt;200 matches: hint “Showing 200 of N matches — type more to narrow results.”

**Mock variant**: search `Pat` → Pat Lee; **Simulate QR scan** button visible (mock panel only).

---

## 5. Check-in by QR scan (admin)

**API**: `POST .../checkin/scan` with JWT body → ScriptRunner verify + HubSpot contact read.

> **Release gate:** Live QR (camera + real JWT) is **not required** for §8 sign-off. Name search (§4) covers the live check-in write path. Complete live QR in **§10** at end-of-Slice 1 QA (2026-07-06 — all other quickstart checks passed; QR deferred).

### Live (`USE_MOCK_API: false`) — end-of-Slice 1 (§10)

1. Confirm ScriptRunner Parameters set (§8 step 2).
2. On Check-in page, allow camera → scan a **valid Event JWT** QR for the selected Program + Event.
3. Summary card populates → **Confirm check-in** as §4.

**Expected**: Scan rejects wrong-Event JWT; `503` if Parameters missing.

**Why deferred:** Camera access, HTTPS origin, and physical QR codes are hard to validate on a dev laptop alone. Backend scan route + Parameters are deployed; validate end-to-end when a real device and Event JWTs are available.

### Mock (`USE_MOCK_API: true`)

1. Click **Simulate QR scan** → summary populates → confirm as §4.

**Camera / dev laptop**: QR video may be empty if no camera — name search still works; restart Vite dev server after pulling `html5-qrcode` test-alias fix if scanner fails to load in dev.

---

## 6. Catalog context gating

1. Clear Program or Event picker → open Attendees or Check-in directly via hash URL.

**Expected**: Empty state — "Select a Program and Event using the catalog pickers…"

---

## 7. XSS smoke (automated + spot check)

Hostile strings in attendee name/company render as **text**, not HTML (covered by Vitest; spot-check in browser if adding seed data).

---

## 8. Live API smoke (release gate)

**This is the primary sign-off path** when `USE_MOCK_API: false` (current UAT default).

1. Confirm SFTP deploy: `Backend/scripts/` including `OnGetAttendees.ts`, `OnCheckInScan.ts`, `OnCheckIn.ts`, `Utils/HubSpot/HubSpotApiClient.ts` (Managed Fetch — not raw `fetch`), adapters, router.
2. Set ScriptRunner Parameters: `CHECKIN_JWT_PUBLIC_KEY`, `CHECKIN_JWT_ISSUER`.
3. Frontend UAT build: `USE_MOCK_API: false`, `API_BASE_URL: '/api/ems'`.
4. Repeat **§3–§4 (live)** and **§9** against real HubSpot registrants. **§5 live QR** → **§10** (end-of-Slice 1).

**Expected**: Attendee list from HubSpot; name-search confirm writes attendance property; idempotent repeat; no `No handler for programs/.../attendees` or `URL must start with http://` HubSpot errors. Live QR scan (wrong-Event JWT reject, happy path) validated separately in §10.

---

## 9. UI / UX regression (2026-07-06 — release gate with §8)

1. **Loading feedback**: Attendees / Events / Check-in show spinner + skeleton (not text-only) on initial load.
2. **Responsive**: DevTools ~375px and ~768px — Check-in usable (QR first, tappable controls, no page-level horizontal scroll).
3. **Attendees layout**: table uses full card height on desktop.
4. **Catalog pickers**: inline spinner while catalog loads (`Loading catalog…`).

---

## 10. End-of-Slice 1 — Live QR scanner QA

Run **after** §8 sign-off (and ideally on a **phone/tablet** or machine with a working camera on the deployed UAT/Live origin — not localhost-only).

**Prerequisites**: §8 steps 1–2 done (`CHECKIN_JWT_PUBLIC_KEY`, `CHECKIN_JWT_ISSUER`); at least one **valid Event JWT** QR for the selected Program + Event.

1. Admin + catalog context → **Check-in** on UAT/Live URL (`USE_MOCK_API: false`).
2. Allow camera permission → QR panel shows live video feed (not blank).
3. Scan valid Event JWT → summary card populates (name, email, company).
4. **Confirm check-in** → success toast; HubSpot attendance updated.
5. Scan **wrong-Event** JWT → inline error; no summary card.
6. Repeat confirm on same registrant → idempotent “already checked in” toast.
7. Mobile (~375px): QR block above search; scanner usable; no duplicate camera feeds on navigate away/back.

**Sign-off column**: Manual QA log **§10 QR (live)**.

**Parked as**: **FE-SLICE1-007** / **BE-SLICE1-007** in `TODO.md`.

---

## Manual QA log

| Date | Tester | §3 Attendees | §4 Name check-in | §8 Live API | §9 UI/UX | §10 QR (live) | Notes |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| 2026-07-06 | | ✅ | ✅ | ✅ | ✅ | ⬜ deferred | SFTP + Parameters done; all quickstart checks pass except live QR — see §10 |

**Sign-off**: §8 + §9 required for live release (name-search check-in path). **§10 live QR** required before Slice 1 is fully closed (with walk-in when unblocked). §3–§5 mock variants optional if §8 run on UAT with `USE_MOCK_API: false`.

---

## Troubleshooting

| Symptom | Likely cause |
| :--- | :--- |
| Full page reload on every search keystroke | Old build — need debounced search + non-blocking refresh |
| Plain “Loading…” text only | Old build — need `LoadingState` spinner/skeleton |
| Two QR camera feeds | Scanner not stopped on unmount — see `CheckInQrPanel` cleanup |
| QR scanner blank in **dev** only | Restart Vite after `html5-qrcode` test-only alias fix |
| Search returns only first 50 (live) | Old build — Attendees needs pagination; Check-in needs server `q` + `pageSize` 200 |
| Check-in search needs 2+ characters | By design — avoids loading full roster on open |
| Slow attendee load (live) | Expected Slice 1 — full HubSpot join per request; not a release blocker |
| `URL must start with http://` (live) | `HubSpotApiClient` not using ScriptRunner Managed Fetch — redeploy `HubSpotApiClient.ts` |
| Search returns full list | Mock not filtering — `getMockSliceAttendees` must receive `q` |
| `503` on scan (live) | JWT public key not in ScriptRunner Parameters |
| Attendees 404 (live) | Slice handlers not SFTP-deployed yet |
