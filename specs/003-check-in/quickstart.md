# Quickstart: Attendees & Check-in (003)

Manual and automated validation for **Slice 1** — attendee list (US1), check-in by name search + QR (US2), and walk-in iframe (US3).

**Related**: [spec.md](./spec.md) · [tasks.md](./tasks.md) · [contracts/check-in-api.md](./contracts/check-in-api.md)

Builds on [001 quickstart](../001-catalog-admin/quickstart.md) and [002 quickstart](../002-catalog-metadata-modal/quickstart.md).

---

## Sign-off overview

| Area | Gate | Notes |
| :--- | :---: | :--- |
| **Automated tests** | Required | §A — run before every release candidate |
| **US1 Attendees** | Required | §B3 — live UAT with `USE_MOCK_API: false` |
| **US2 Name check-in** | Required | §B4 — live UAT; primary check-in write path |
| **US2 Live QR scan** | Required for Slice 1 close | §B5 — camera + Event JWT on UAT/Live device ([T060](./tasks.md)); not a blocker for name-search release |
| **US3 Walk-in** | Required for US3 close | §B6 — HubSpot form + Attendees verification |
| **UI / UX regression** | Required | §B7 — with live UAT sign-off |
| **Mock-only runs** | Optional | Skip if §B3–B4 completed on UAT with live API |

**Performance (accepted for Slice 1)**: first attendee load / search may take several seconds on live HubSpot — wait for spinners to clear; slowness alone is not a release blocker (see **BE-SLICE1-006** / **FE-SLICE1-005**).

---

## Prerequisites

1. **001 + 002** catalog deployed on `uat` (live `GET catalog` via ScriptRunner).
2. **003 Backend** handlers SFTP-deployed: `OnGetAttendees`, `OnCheckInScan`, `OnCheckIn`, HubSpot adapters, `OnHttpRouter` route wiring.
3. Frontend `config.ts`: **`USE_MOCK_API: false`** for release QA (ScriptRunner Connect). Use **`true`** only for offline UI work without Backend.
4. **Admin** test account in `USER_ROLE_MAP`; **viewer/staff** account for RBAC checks.
5. Catalog selection: a **live** Program + Event with known HubSpot registrants.
6. ScriptRunner Parameters (live QR): `CHECKIN_JWT_PUBLIC_KEY`, `CHECKIN_JWT_ISSUER`.

**Mock shortcut** (`USE_MOCK_API: true`): Program `prog-atlassian-2026` + Event `ev-mr-2026` — seed contacts `Jane Doe`, `Pat Lee`.

---

## A. Automated tests

Run locally before manual QA or deploy.

### A1. Backend

```bash
cd Backend
npm test -- --testPathPattern="Slice1|CheckInJwt|RegistrationAdapter"
npm run lint:fix
```

| Suite | Covers |
| :--- | :--- |
| `Slice1Routes.test.ts` | 401/403 attendees; 422/503 scan; 422 confirm; idempotent confirm |
| `CheckInJwt.test.ts` | Alg pin, expiry, event mismatch |
| `RegistrationAdapter.test.ts` | Registrant query logic |

**Gap (before live cutover)**: add happy-path scan + first-time confirm tests (tasks T041–T042).

### A2. Frontend

```bash
cd Frontend
npm test -- Attendees CheckIn CheckInQr dataService
npm run lint
```

| Area | Covers |
| :--- | :--- |
| AttendeesView | Pagination, debounced search, filter, layout |
| CheckInView | Name search, confirm, idempotent repeat, mode switch |
| CheckInQrPanel | Scanner lifecycle, mock simulate |
| dataService | Slice attendee/check-in API paths |
| LoadingState | Spinner + skeleton (not text-only) |
| Responsive smoke | ~375px overflow (Attendees + Check-in) |
| XSS guards | Hostile strings render as text |

Check-in tests must finish in **< 10 s** (stable `useDataService` mock).

---

## B. Manual QA checklist

Use **UAT** with `USE_MOCK_API: false` unless a step says otherwise. Mark each item pass/fail in the **Manual QA log** at the bottom.

### B0. Environment smoke (release gate)

- [ ] Backend SFTP deploy includes `OnGetAttendees.ts`, `OnCheckInScan.ts`, `OnCheckIn.ts`, `Utils/HubSpot/HubSpotApiClient.ts` (Managed Fetch — not raw `fetch`), adapters, router.
- [ ] ScriptRunner Parameters set: `CHECKIN_JWT_PUBLIC_KEY`, `CHECKIN_JWT_ISSUER`.
- [ ] Frontend UAT build: `USE_MOCK_API: false`, `API_BASE_URL: '/api/ems'`.
- [ ] No `No handler for programs/.../attendees` or `URL must start with http://` HubSpot errors on attendee load.

---

### B1. Shared — catalog context & RBAC

**API context**: all slice routes require `programId` + `eventId` from catalog pickers.

| # | Steps | Expected |
| :---: | :--- | :--- |
| 1 | Sign in as **admin**. Clear Program or Event picker → navigate directly to `#/events/attendees` or `#/events/check-in`. | Empty state: *"Select a Program and Event using the catalog pickers…"* |
| 2 | Select Program + Event → sidebar shows **Attendees** and **Check-in** links. | Links visible; routes load data for selected Event only. |
| 3 | Sign in as **viewer/staff** with Program + Event selected. | Attendees / Check-in links hidden **or** route redirects to `#/events`. No attendee PII visible. |
| 4 | Catalog pickers loading. | Inline spinner (*"Loading catalog…"*) while catalog fetches. |

---

### B2. US1 — Attendees list

**Route**: `#/events/attendees`  
**API**: `GET /api/ems/programs/{programId}/events/{eventId}/attendees`

| # | Steps | Expected |
| :---: | :--- | :--- |
| 1 | Admin + Program + Event → open **Attendees**. | Spinner + **table skeleton** on first load (not plain text only). TopBar stays visible. |
| 2 | Wait for load to complete. | Table columns: name, company, email, account manager, track, checked-in. TopBar meta shows total + range (e.g. `N registered · showing 1–50 · HubSpot live`). |
| 3 | Desktop layout. | Table fills available vertical space; scrolls inside card when many rows. |
| 4 | If **N > 50**: click **Next** / **Previous**. | Range updates; table shows **Updating…** overlay; pagination reads **Loading page…** while fetching. |
| 5 | Search a **known live registrant** (partial name or company). | Results after ~300 ms debounce; page stays mounted with inline **Updating…** spinner (no full-page reload). |
| 6 | Filter **Not checked in**. | Only unchecked rows shown. |
| 7 | Filter **Checked in** (if any). | Only checked-in rows shown. |

**Mock variant** (`USE_MOCK_API: true`): search `Jane` → Jane Doe; pagination with extended seed (total 120 if configured).

---

### B3. US2 — Check-in by name search

**Route**: `#/events/check-in`  
**API**: same attendees route with `q`, `page=1`, `pageSize=200`

| # | Steps | Expected |
| :---: | :--- | :--- |
| 1 | Admin + Program + Event → open **Check-in**. | Before typing: table shows *"Type at least 2 characters…"*. QR panel visible. |
| 2 | Search **≥ 2 characters** matching a **live registrant** → select row. | Summary card shows email, company, account manager, track, checked-in state. Inline **Searching…** spinner while fetching (no full-page reload). |
| 3 | Click **Confirm check-in** on unchecked registrant. | Success toast; HubSpot attendance updated; UI reflects checked-in. |
| 4 | **Confirm check-in** again on same registrant. | Idempotent *"already checked in"* toast; no duplicate HubSpot write. |
| 5 | If > 200 matches exist. | Hint: *"Showing 200 of N matches — type more to narrow results."* |
| 6 | DevTools ~375 px width. | QR block above search; table columns collapse; no horizontal page scroll; controls tappable. |
| 7 | DevTools ~768 px width. | Check-in layout usable; no page-level horizontal scroll. |

**Mock variant** (`USE_MOCK_API: true`): search `Pat` → Pat Lee; **Simulate QR scan** button visible in QR panel.

---

### B4. US2 — Check-in by QR scan

**API**: `POST .../checkin/scan` (JWT body) → ScriptRunner verify + HubSpot contact read

#### B4a. Mock (`USE_MOCK_API: true`)

| # | Steps | Expected |
| :---: | :--- | :--- |
| 1 | Check-in page → click **Simulate QR scan**. | Summary card populates. |
| 2 | **Confirm check-in** → repeat confirm. | Success toast; then idempotent *"already checked in"* toast. |

#### B4b. Live (`USE_MOCK_API: false`) — Slice 1 close-out

Run on **UAT/Live URL** with a device that has a working camera (phone/tablet preferred — not localhost-only).

**Prerequisites**: B0 Parameters set; at least one **valid Event JWT** QR for the selected Program + Event.

| # | Steps | Expected |
| :---: | :--- | :--- |
| 1 | Allow camera permission. | QR panel shows live video feed (not blank). |
| 2 | Scan **valid Event JWT** for selected Program + Event. | Summary card populates (name, email, company). |
| 3 | **Confirm check-in**. | Success toast; HubSpot attendance updated. |
| 4 | Scan **wrong-Event** JWT. | Inline error; no summary card. Scan route returns rejection (not silent pass). |
| 5 | Repeat confirm on same registrant. | Idempotent *"already checked in"* toast. |
| 6 | Navigate away from Check-in and back (~375 px). | QR block above search; scanner usable; **no duplicate camera feeds**. |
| 7 | Unset `CHECKIN_JWT_PUBLIC_KEY` (staging test only). | Scan returns `503`; not silent pass. |

**Dev laptop note**: QR video may be empty without a camera — name search (B3) still validates the check-in write path. Restart Vite after pulling `html5-qrcode` test-alias fix if scanner fails to load in dev.

#### B4b — generating a test QR (manual JWT)

Slice 1 does not mint QRs in-app. For live B4b QA, sign a JWT (ScriptRunner + `CHECKIN_JWT_PUBLIC_KEY` / private key pair), then encode the **full** token string in a QR.

**Requirements**

- QR payload = **raw JWT only** (starts with `eyJ`; no `Signed JWT token:` prefix, no URL wrapper, no quotes).
- RS256 JWT is typically **~550–800+ characters**. Many web QR generators **silently truncate at ~400 chars** — scan then fails with `invalid_checkin_signature` even when console/API fetch with the full token succeeds.
- After scan, confirm Network `checkin/scan` request body `jwt` length matches ScriptRunner log length (e.g. 558 === 558, not 400).

**Recommended tools** (no character cap):

```bash
pip3 install --user 'qrcode[pil]'
python3 -c "
import qrcode
jwt = '''PASTE_FULL_JWT_HERE'''
print('JWT length:', len(jwt))
qr = qrcode.QRCode(version=None, error_correction=qrcode.constants.ERROR_CORRECT_L, box_size=10, border=4)
qr.add_data(jwt)
qr.make(fit=True)
qr.make_image().save('checkin-qr.png')
print('Saved checkin-qr.png')
"
```

Or: `brew install qrencode` then `qrencode -o ~/Desktop/checkin-qr.png -s 10 'PASTE_FULL_JWT'`.

**Future product work**: registrant-email QR generation must meet the same capacity rules — see **FE-QR-GEN-001** / **BE-QR-GEN-001** and `docs/hubspot-schema.md` § QR payload size.

**Tracked as**: [T060](./tasks.md) · **FE-SLICE1-007** / **BE-SLICE1-007**

---

### B5. US3 — Walk-in via HubSpot iframe

**Scope**: Check-in **Walk-in** mode + Event `walkInFormUrl` in catalog. **No EMS walk-in POST** — HubSpot form owns writes.

**Prerequisites**: B2 + B3 working; HubSpot walk-in form created and configured (Parts Attended, attendance, Program form submission — HubSpot admin responsibility); valid HubSpot form embed or share URL (HTTPS, allowlisted host).

#### B5a. Catalog — `walkInFormUrl`

| # | Steps | Expected |
| :---: | :--- | :--- |
| 1 | Admin → **Settings** (`#/catalog`) → edit target Event. | **Walk-in form URL (HubSpot)** field visible. |
| 2 | Set valid share/embed URL (e.g. `https://share.hsforms.com/...`) → Save. | Event saved; `GET catalog` returns `walkInFormUrl` on Event node. |
| 3 | Enter invalid URL (non-HTTPS or non-HubSpot host) → Save. | Field error on save; backend `422`/`400` if bypassed. |
| 4 | Clear field (PATCH `null`). | URL removed from catalog. |

#### B5b. Check-in — Walk-in mode

| # | Steps | Expected |
| :---: | :--- | :--- |
| 1 | Admin + Program + Event (with `walkInFormUrl`) → **Check-in**. | Mode switch shows **Check-in \| Walk-in**. |
| 2 | Select **Walk-in**. | Staff hint above iframe; HubSpot form loads in iframe; search table and QR scanner **not** visible. |
| 3 | Switch back to **Check-in**. | US2 layout returns; iframe removed from DOM. |
| 4 | Change Program or Event picker. | Mode resets to **Check-in**. |
| 5 | Event with **no** `walkInFormUrl` → Walk-in mode. | Empty state with link to catalog Settings — no broken iframe. |
| 6 | Legacy invalid URL in catalog → Walk-in mode. | Validation error shown — iframe `src` not set. |

#### B5c. Form submit + Attendees verification

| # | Steps | Expected |
| :---: | :--- | :--- |
| 1 | Walk-in mode → complete HubSpot form in iframe (test contact). | HubSpot thank-you / confirmation inside iframe. |
| 2 | Open **Attendees** → refresh. | New email → new registrant in list. Existing email → contact updated, not duplicated; checked-in state per HubSpot form config. |

**Note**: `USE_MOCK_API: true` still loads real HubSpot iframe when URL is set (mock does not block iframe).

#### B5d. CSP (production build)

| # | Steps | Expected |
| :---: | :--- | :--- |
| 1 | `npm run build` → inspect `index.html` CSP `frame-src`. | Includes `https://*.hubspot.com`, `https://*.hsforms.com`, `https://share.hsforms.com`. |
| 2 | Deploy to UAT → Walk-in mode. | Iframe loads (not CSP-blocked). |

---

### B6. Cross-cutting UI / UX

| # | Check | Expected |
| :---: | :--- | :--- |
| 1 | Initial load — Attendees, Events, Check-in. | Spinner + skeleton (not text-only loading). |
| 2 | Check-in search while typing. | Layout (including QR panel) stays mounted; only table refreshes. |
| 3 | Attendees search while typing. | Same non-blocking refresh behaviour. |
| 4 | Responsive ~375 px and ~768 px. | Check-in usable; QR first on narrow viewports; no page-level horizontal scroll. |
| 5 | Attendees desktop layout. | Table uses full card height. |

---

### B7. Security smoke

| # | Check | Expected |
| :---: | :--- | :--- |
| 1 | Hostile strings in attendee name/company (Vitest + optional browser spot-check). | Rendered as **text**, not HTML (XSS guard). |
| 2 | Non-admin access attempts (B1). | No attendee PII exposed. |

---

## Manual QA log

| Date | Tester | B0 Env | B1 Shared | B2 Attendees | B3 Name CI | B4 QR | B5 Walk-in | B6 UI/UX | Notes |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| 2026-07-06 | | ✅ | ✅ | ✅ | ✅ | ⬜ deferred | ⬜ pending | ✅ | SFTP + Parameters done; US3 walk-in QA pending |
| 2026-07-07 | | ✅ | ✅ | ✅ | ✅ | ✅ live | ⬜ partial | ✅ | ✅ | B5: iframe/mode switch ✅; **B5c** Attendees after HubSpot submit blocked on events/HubSpot team → **FE-SLICE1-009** |

**Column guide**

- **B4 QR**: **live** ✅ when B4b complete (2026-07-07).
- **Sign-off for live release (name-search path)**: B0 + B1 + B2 + B3 + B6 + B7.
- **Sign-off for Slice 1 complete**: above + B4b live QR + B5 Walk-in (**B5c** pending HubSpot team → **X-008**).
- **Cross-slice**: 004 capacity live QA blocked → **X-009**.

---

## Troubleshooting

| Symptom | Likely cause |
| :--- | :--- |
| Full page reload on every search keystroke | Old build — need debounced search + non-blocking refresh |
| Plain "Loading…" text only | Old build — need `LoadingState` spinner/skeleton |
| Two QR camera feeds | Scanner not stopped on unmount — see `CheckInQrPanel` cleanup |
| QR scanner blank in **dev** only | Restart Vite after `html5-qrcode` test-only alias fix |
| Search returns only first 50 (live) | Old build — Attendees needs pagination; Check-in needs server `q` + `pageSize` 200 |
| Check-in search needs 2+ characters | By design — avoids loading full roster on open |
| Slow attendee load (live) | Expected Slice 1 — full HubSpot join per request; not a release blocker |
| `URL must start with http://` (live) | `HubSpotApiClient` not using ScriptRunner Managed Fetch — redeploy `HubSpotApiClient.ts` |
| Search returns full list (mock) | Mock not filtering — `getMockSliceAttendees` must receive `q` |
| `503` on scan (live) | JWT public key not in ScriptRunner Parameters |
| `invalid_checkin_signature` on scan but same JWT works in console/API | QR **truncated** (~400 char cap in generator) — regenerate with `qrcode` / `qrencode`; compare `jwt.length` in Network vs ScriptRunner log |
| `500` / `Unexpected token` parsing JWT header | Malformed token in request (extra leading char e.g. `PeyJ`, wrong paste, or truncated segment) |
| Attendees 404 (live) | Slice handlers not SFTP-deployed yet |
| Walk-in iframe blank (UAT) | CSP `frame-src` missing HubSpot origins — rebuild + redeploy Frontend |
| Walk-in iframe blank (dev) | Dev server has no production CSP — check URL allowlist and HubSpot form URL |
| HubSpot form submits but no Attendee row | HubSpot form/workflows not setting Parts Attended + Program form leg — fix in HubSpot, not EMS |
