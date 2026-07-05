# Quickstart: Attendees & Check-in validation (003)

End-to-end checks for **003-check-in** (Slice 1 attendee list + check-in). Builds on [001 quickstart](../001-catalog-admin/quickstart.md) and [002 quickstart](../002-catalog-metadata-modal/quickstart.md).

**Related**: [spec.md](./spec.md) · [tasks.md](./tasks.md) · [contracts/check-in-api.md](./contracts/check-in-api.md)

---

## Prerequisites

1. **001 + 002** catalog on `uat` (or local dev with mocks).
2. Frontend `config.ts`: **`USE_MOCK_API: true`** for pre-SFTP UI QA; **`false`** only after Backend slice handlers are SFTP-deployed.
3. Admin test account in `USER_ROLE_MAP`; viewer/staff account for RBAC checks.
4. Catalog selection: at least one Program + Event with mock seed `ev-mr-2026` (or live registrants after SFTP).

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

**Expected**: AttendeesView, CheckInView (search debounce, confirm, QR mock, XSS, admin gate), CheckInQrPanel (StrictMode, disabled), dataService mock fetch/filter/scan/confirm.

---

## 3. Attendees list (admin, mock)

1. Sign in as **admin**.
2. Select **Program** + **Event** in catalog pickers.
3. Sidebar → **Attendees** (`#/events/attendees`).

**Expected**:

- Table: name, company, email, account manager, track, checked-in.
- Search "Jane" → only Jane Doe after brief pause; page stays mounted.
- Filter **Not checked in** → unchecked rows only.

4. Sign in as **viewer/staff** → Attendees link hidden or route redirects to `#/events`.

---

## 4. Check-in by name search (admin, mock)

1. Admin + catalog context → **Check-in** (`#/events/check-in`).
2. Search "Pat" → select **Pat Lee** → summary shows email, company, account manager.
3. **Confirm check-in** → toast "already checked in" (seed data) or success for unchecked contact.

**Expected**:

- Typing in search does **not** flash full-page "Loading check-in…".
- QR panel stays visible while searching.
- Repeat confirm → idempotent toast.

---

## 5. Check-in by QR scan (admin, mock)

1. On Check-in page, click **Simulate QR scan** (mock) or scan a test JWT (live).

**Expected**:

- Summary card populates from scan response.
- Confirm check-in works as §4.

**Camera / dev laptop**: QR video may be empty if no camera — name search still works; no React error boundary on load.

---

## 6. Catalog context gating

1. Clear Program or Event picker → open Attendees or Check-in directly via hash URL.

**Expected**: Empty state — "Select a Program and Event using the catalog pickers…"

---

## 7. XSS smoke (automated + spot check)

Hostile strings in attendee name/company render as **text**, not HTML (covered by Vitest; spot-check in browser if adding seed data).

---

## 8. Live API smoke (after SFTP — release gate)

1. SFTP deploy `Backend/scripts/` including `OnGetAttendees.ts`, `OnCheckInScan.ts`, `OnCheckIn.ts`, adapters, router.
2. Set ScriptRunner Parameters: `CHECKIN_JWT_PUBLIC_KEY`, `CHECKIN_JWT_ISSUER`.
3. Frontend UAT: `USE_MOCK_API: false` (local or UAT build).
4. Repeat §3–§5 against real HubSpot registrants for a test Event.

**Expected**: Attendee list matches HubSpot; confirm writes attendance property; idempotent repeat; scan rejects wrong Event JWT.

---

## Manual QA log

| Date | Tester | §3 Attendees | §4 Name check-in | §5 QR | §8 Live | Notes |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| | | | | | | |

---

## Troubleshooting

| Symptom | Likely cause |
| :--- | :--- |
| Full page reload on every search keystroke | Old build — need debounced search + non-blocking refresh |
| Two QR camera feeds | Scanner not stopped on unmount — see `CheckInQrPanel` cleanup |
| Search returns full list | Mock not filtering — `getMockSliceAttendees` must receive `q` |
| `503` on scan (live) | JWT public key not in ScriptRunner Parameters |
| Attendees 404 (live) | Slice handlers not SFTP-deployed yet |
