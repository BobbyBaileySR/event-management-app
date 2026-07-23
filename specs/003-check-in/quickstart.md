# Quickstart: Attendees & Check-in (003)

Manual and automated validation for **Slice 1** — attendee list (US1), check-in by name search + QR (US2), and walk-in iframe (US3).

**Related**: [spec.md](./spec.md) · [tasks.md](./tasks.md) · [contracts/check-in-api.md](./contracts/check-in-api.md)

Builds on [001 quickstart](../_shipped/001-catalog-admin/quickstart.md) and [002 quickstart](../_shipped/002-catalog-metadata-modal/quickstart.md).

---

## Sign-off overview

| Area | Gate | Notes |
| :--- | :---: | :--- |
| **Automated tests** | Required | §A — run before every release candidate |
| **US1 Attendees** | Required | §B2 — live UAT through ScriptRunner |
| **US2 Name check-in** | Required | §B3 — live UAT; primary check-in write path |
| **US2 Live QR scan** | Required for Slice 1 close | §B4 — camera + Event JWT on UAT/Live device ([T060](./tasks.md)) |
| **US3 Walk-in** | Required for US3 close | §B5 — HubSpot form + Attendees verification |
| **UI / UX regression** | Required | §B6 — with live UAT sign-off |

**Performance (accepted for Slice 1)**: first attendee load / search may take several seconds on live HubSpot — wait for spinners to clear; slowness alone is not a release blocker (see **BE-SLICE1-006** / **FE-SLICE1-005**).

---

## Prerequisites

1. **001 + 002** catalog deployed on `uat` (live `GET catalog` via ScriptRunner).
2. **003 Backend** handlers SFTP-deployed: `OnGetAttendees`, `OnCheckInScan`, `OnCheckIn`, HubSpot adapters, `OnHttpRouter` route wiring.
3. Frontend `API_BASE_URL` points to the intended UAT ScriptRunner listener (directly or through the local Vite proxy). EMS has no mock-data mode.
4. **Admin** test account in `USER_ROLE_MAP`; **viewer/staff** account for RBAC checks.
5. Working Event: a **live** Event (Program optional) with known HubSpot registrants — select via **WorkingEventPicker** or **Programs & Events**.
6. ScriptRunner Parameters (live QR): `CHECKIN_JWT_PUBLIC_KEY`, `CHECKIN_JWT_ISSUER`.

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
| CheckInView | Name search, confirm, idempotent repeat, Start scanner / + Add walk-in modals |
| CheckInQrPanel | Scanner lifecycle, camera errors, cleanup |
| dataService | Slice attendee/check-in API paths |
| LoadingState | Spinner + skeleton (not text-only) |
| Responsive smoke | ~375px overflow (Attendees + Check-in) |
| XSS guards | Hostile strings render as text |

Check-in tests must finish in **< 10 s** (stable `useDataService` mock).

---

## B. Manual QA checklist

Use **UAT** through the live ScriptRunner data path. Mark each item pass/fail in the **Manual QA log** at the bottom.

### B0. Environment smoke (release gate)

- [ ] Backend SFTP deploy includes `OnGetAttendees.ts`, `OnCheckInScan.ts`, `OnCheckIn.ts`, `Utils/HubSpot/HubSpotApiClient.ts` (Managed Fetch — not raw `fetch`), adapters, router.
- [ ] ScriptRunner Parameters set: `CHECKIN_JWT_PUBLIC_KEY`, `CHECKIN_JWT_ISSUER`.
- [ ] Frontend UAT build points `API_BASE_URL` at the intended listener/proxy.
- [ ] No `No handler for events/.../attendees` or `URL must start with http://` HubSpot errors on attendee load.

---

### B1. Shared — catalog context & RBAC

**API context**: all slice routes use the URL `eventId`. Program membership is optional and resolved server-side.

| # | Steps | Expected |
| :---: | :--- | :--- |
| 1 | Sign in as **admin** with no working Event. | Event-scoped Sidebar links remain visible but disabled until an Event is selected. |
| 2 | Use **Programs & Events** or the Sidebar working-event picker to open an Event. | Event Details opens; **Registered Attendees** and **Check-in** navigate under `#/events/{eventId}/…`. |
| 3 | Sign in as **viewer/staff**. | Current all-admin shell redirects/denies access. No attendee PII visible. |
| 4 | Open the working-event picker while catalog loads. | Loading feedback appears; Event results come from live `GET catalog`. |

---

### B2. US1 — Attendees list

**Route**: `#/events/{eventId}/attendees`
**API**: logical `GET events/{eventId}/attendees`

| # | Steps | Expected |
| :---: | :--- | :--- |
| 1 | Admin + working Event → open **Registered Attendees**. | Spinner + **table skeleton** on first load (not plain text only). TopBar stays visible. |
| 2 | Wait for load to complete. | Table columns: name, company, email, account manager, track, checked-in. TopBar meta shows total + range (e.g. `N registered · showing 1–50 · HubSpot live`). |
| 3 | Desktop layout. | Table fills available vertical space; scrolls inside card when many rows. |
| 4 | If **N > 50**: click **Next** / **Previous**. | Range updates; table shows **Updating…** overlay; pagination reads **Loading page…** while fetching. |
| 5 | Search a **known live registrant** (partial name or company). | Results after ~300 ms debounce; page stays mounted with inline **Updating…** spinner (no full-page reload). |
| 6 | Filter **Not checked in**. | Only unchecked rows shown. |
| 7 | Filter **Checked in** (if any). | Only checked-in rows shown. |

### B3. US2 — Check-in by name search

**Route**: `#/events/{eventId}/check-in`
**API**: same attendees route, no `q` for the full roster or `q` when searching, `page=1`, `pageSize=200`

| # | Steps | Expected |
| :---: | :--- | :--- |
| 1 | Admin + working Event → open **Check-in**. | Full roster loads on open (no search required) — avatar, name, company, orange **Check in** button per unchecked row; green **In · HH:MM** indicator per checked-in row. **Start scanner** and **+ Add walk-in** actions are visible. |
| 2 | Search matching a **live registrant** → select row. | List narrows to matches. Summary card shows email, company, account manager, track, checked-in state. Inline **Loading attendees…** spinner while fetching (no full-page reload). |
| 3 | Click **Confirm check-in** on unchecked registrant. | Success toast; HubSpot attendance updated; UI reflects checked-in. |
| 4 | **Confirm check-in** again on same registrant. | Idempotent *"already checked in"* toast; no duplicate HubSpot write. |
| 5 | If > 200 matches exist. | Hint: *"Showing 200 of N matches — type more to narrow results."* |
| 6 | DevTools ~375 px width. | QR block above search; table columns collapse; no horizontal page scroll; controls tappable. |
| 7 | DevTools ~768 px width. | Check-in layout usable; no page-level horizontal scroll. |

### B4. US2 — Check-in by QR scan

**API**: `POST .../checkin/scan` (JWT body) → ScriptRunner verify + HubSpot contact read

#### B4a. Live camera scan — Slice 1 close-out

Run on **UAT/Live URL** with a device that has a working camera (phone/tablet preferred — not localhost-only).

**Prerequisites**: B0 Parameters set; at least one **valid Event JWT** QR for the selected Event.

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

#### B4b — generating a test QR

Use a ticket generated by the shipped QR-ticket email flow where possible. For isolated check-in QA, engineering may still sign a test JWT and encode the **full** token string in a QR.

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

Registrant-email QR generation shipped 2026-07-16 and follows these capacity rules; see `specs/008-qr-ticket-emails/` and `docs/hubspot-schema.md` § QR payload size.

**Tracked as**: [T060](./tasks.md) · **FE-SLICE1-007** / **BE-SLICE1-007**

---

### B5. US3 — Walk-in via HubSpot iframe

**Scope**: Check-in **Walk-in** mode + Event `walkInFormUrl` in catalog. **No EMS walk-in POST** — HubSpot form owns writes.

**Prerequisites**: B2 + B3 working; HubSpot walk-in form/workflow configured to create or update the Contact↔Event `registered` association; valid HubSpot form embed or share URL (HTTPS, allowlisted host).

#### B5a. Catalog — `walkInFormUrl`

| # | Steps | Expected |
| :---: | :--- | :--- |
| 1 | Admin → **Programs & Events** → open the target Event → **Edit event**. | **Walk-in form URL (HubSpot)** field visible. |
| 2 | Set valid share/embed URL (e.g. `https://share.hsforms.com/...`) → Save. | Event saved; `GET catalog` returns `walkInFormUrl` on Event node. |
| 3 | Enter invalid URL (non-HTTPS or non-HubSpot host) → Save. | Field error on save; backend `422`/`400` if bypassed. |
| 4 | Clear field (PATCH `null`). | URL removed from catalog. |

#### B5b. Check-in — Walk-in mode

| # | Steps | Expected |
| :---: | :--- | :--- |
| 1 | Admin + working Event (with `walkInFormUrl`) → **Check-in**. | **+ Add walk-in** action is visible. |
| 2 | Select **+ Add walk-in**. | Walk-in modal opens; HubSpot form loads in the modal iframe. |
| 3 | Close the modal. | Check-in roster remains mounted and focus returns to the trigger. |
| 4 | Select another working Event. | The next walk-in modal uses that Event's URL. |
| 5 | Event with **no** `walkInFormUrl` → **+ Add walk-in**. | Helpful setup guidance; no broken iframe. |
| 6 | Legacy invalid URL in catalog. | Validation error shown — iframe `src` is not set. |

#### B5c. Form submit + Attendees verification

| # | Steps | Expected |
| :---: | :--- | :--- |
| 1 | Walk-in mode → complete HubSpot form in iframe (test contact). | HubSpot thank-you / confirmation inside iframe. |
| 2 | Open **Registered Attendees** → refresh. | New email → new registrant in list. Existing email → contact updated, not duplicated; attendee remains registered until staff explicitly check them in. |

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

### B7. Security smoke (functional — brief)

| # | Check | Expected |
| :---: | :--- | :--- |
| 1 | Hostile strings in attendee name/company (Vitest + optional browser spot-check). | Rendered as **text**, not HTML (XSS guard). |
| 2 | Non-admin access attempts (B1). | No attendee PII exposed. |

**Operator sign-off:** Slice 1 predates the standard §C doc. For **security comfort** before Live, use **[slice-1.5-tier-a/signoff-checklist.md](../slice-1.5-tier-a/signoff-checklist.md)** (Tier A manual smoke) plus B1/B7 above. **New slices** must add full **§C** from [docs/slice-operator-security-qa-template.md](../../docs/slice-operator-security-qa-template.md).

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
| Check-in loads slowly on open (live) | **2026-07-16**: search-first gate removed to match design — full roster now loads on open. Root cause (full HubSpot join per request, `BE-SLICE1-006`/`FE-SLICE1-005`) is still unresolved; this is an accepted risk until that lands. |
| Slow attendee load (live) | Expected Slice 1 — full HubSpot join per request; not a release blocker |
| `URL must start with http://` (live) | `HubSpotApiClient` not using ScriptRunner Managed Fetch — redeploy `HubSpotApiClient.ts` |
| `503` on scan (live) | JWT public key not in ScriptRunner Parameters |
| `invalid_checkin_signature` on scan but same JWT works in console/API | QR **truncated** (~400 char cap in generator) — regenerate with `qrcode` / `qrencode`; compare `jwt.length` in Network vs ScriptRunner log |
| `500` / `Unexpected token` parsing JWT header | Malformed token in request (extra leading char e.g. `PeyJ`, wrong paste, or truncated segment) |
| Attendees 404 (live) | Slice handlers not SFTP-deployed yet |
| Walk-in iframe blank (UAT) | CSP `frame-src` missing HubSpot origins — rebuild + redeploy Frontend |
| Walk-in iframe blank (dev) | Dev server has no production CSP — check URL allowlist and HubSpot form URL |
| HubSpot form submits but no Attendee row | HubSpot workflow not creating/updating the Contact↔Event `registered` association — fix in HubSpot, not EMS |
