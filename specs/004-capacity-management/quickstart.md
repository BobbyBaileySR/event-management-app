# Quickstart: Capacity Management validation (004)

End-to-end checks for **004-capacity-management** (live attendance on Check-in). Builds on [003 quickstart](../003-check-in/quickstart.md).

**Related**: [spec.md](./spec.md) · [plan.md](./plan.md) · [contracts/capacity-api.md](./contracts/capacity-api.md)

---

## Prerequisites

1. **003-check-in** attendees + confirm check-in working on UAT.
2. **004 Backend** handlers SFTP-deployed: `OnGetCapacityStatus`, `OnAdjustCapacity`, `CapacityStore`, router + RouteGuard wiring.
3. Frontend `API_BASE_URL` points to the intended UAT ScriptRunner environment. EMS has no mock-data mode.
4. Admin test account; viewer account for RBAC.
5. Catalog Event with **`capacity`** set (e.g. `100`) — via **Programs & Events** or Event Details **Edit event**.

## 1. Backend unit tests (local)

```bash
cd Backend
npm test -- --testPathPattern="Capacity"
npm run lint:fix
```

**Expected**:

- `CapacityRoutes.test.ts` — 401/403; GET snapshot shape; adjust down/up; floor at live 0; ceiling at checkedIn; persistence across GET calls

---

## 2. Frontend unit tests (local)

```bash
cd Frontend
npm test -- Capacity CheckIn capacityTier dataService
npm run lint
```

**Expected**:

- `capacityTier.test.ts` — tier boundaries at 74/75/89/90/100/101%
- `CapacityBar` — labels, tier class, ±1 disabled states
- `CheckInView` — indicator visible with capacity; updates after adjust/check-in
- `dataService` — capacity request/response mapping and bounds

---

## 3. Capacity indicator (admin, UAT)

1. Sign in as **admin**.
2. Select a working Event with **capacity** configured.
3. Open **Check-in** (`#/events/{eventId}/check-in`).

**Expected**:

- Capacity indicator below TopBar: `live / capacity on site · N%`
- Tier **normal** when live &lt; 75% of capacity
- ±1 controls visible; −1 disabled when live is 0

---

## 4. Manual adjust ±1

1. Note current **live** count on indicator.
2. Tap **−1** (person left).

**Expected**:

- Live decreases by 1; percentage and bar update immediately
- HubSpot checked-in total unchanged (verify via Attendees filter “Checked in” count if live)

3. Tap **+1** (correction).

**Expected**:

- Live returns to prior value
- At live = checked-in, **+1** disabled or returns 422 on force API call

4. Open Check-in in **second browser** (same Event, admin).

**Expected**:

- Same live count after refresh (server-persisted departures)

---

## 5. Check-in updates live count

1. Find registrant **not checked in** (Attendees or Check-in search).
2. Confirm check-in.

**Expected**:

- Live attendance increases by 1 on capacity indicator without full page reload
- Checked-in count in snapshot increases; departure count unchanged

---

## 6. Threshold visuals

Use a dedicated UAT Event or automated tests to reach tier boundaries (capacity 100). Do not manipulate a production Event solely for visual QA.

| Live | Expected tier | Label hint |
| ---: | :--- | :--- |
| 74 | normal | (no warning label) |
| 75 | caution | “Approaching capacity” |
| 90 | critical | “Nearly full” |
| 101 | over | “At or over capacity” |

Verify colour + text distinguish tiers without reading exact fraction (SC-003).

---

## 7. Event without capacity

1. Select Event with **capacity unset** (or zero).

**Expected**:

- No misleading 0% bar (FR-006)
- Count-only display or setup hint to set capacity in Catalog — not full tier bar

---

## 8. RBAC

1. Sign in as **non-admin** → navigate to `#/events/{eventId}/check-in`.

**Expected**:

- Redirect away; no capacity indicator or ±1 controls

---

## 9. Walk-in mode (if 003 US3 shipped)

1. Open the **+ Add walk-in** modal on Check-in.

**Expected**:

- Capacity indicator remains visible on the underlying Check-in page
- Walk-in submit alone does not change live count until attendee refresh

---

## 10. Live smoke (after SFTP)

1. Confirm the frontend is using the intended UAT ScriptRunner listener.
2. Repeat §3–§5 on UAT with a dedicated test Event + registrants.

**Expected**:

- GET/POST capacity routes via ScriptRunner
- Live tracks HubSpot checked-in ± departures

---

## C. Operator security comfort checks

### C0. Goal and prerequisites

Prove the capacity snapshot/adjustment is admin-only, bounded, audited, and routed through ScriptRunner. Use UAT with a mapped admin, mapped viewer in a separate profile, and a dedicated Event with capacity configured.

### C1. Checks

| Step | Action | Expected result | Failure signal — stop |
| :---: | :--- | :--- | :--- |
| C1.1 | Admin opens `#/events/{eventId}/check-in` with DevTools Network open. | Capacity calls go to ScriptRunner (`?route=events/{eventId}/capacity...`), never directly to HubSpot. | Direct browser→HubSpot request or wrong environment. |
| C1.2 | Sign out and reopen the deep link. | Login/redirect; no operational data. | Capacity/roster visible without a session. |
| C1.3 | Viewer opens the same route. | Redirect/deny; no capacity adjustment controls. | Viewer can read the roster/capacity module or adjust it. |
| C1.4 | Admin performs one −1 then +1 correction. | Both stay within floor/ceiling; Audit shows `capacity.adjust` with Event/id/count context only. | Out-of-bounds adjustment, missing audit, or attendee email/name in metadata. |
| C1.5 | Trigger adjustments rapidly above the documented limit. | Clear rate-limit response; controls recover after the window. | Unlimited writes. |

### C2. Operator security sign-off

| Step | Check | Pass ☐ | Fail ☐ | Notes |
| :--- | :--- | :---: | :---: | :--- |
| C1.1–C1.2 | Data/auth boundary | | | |
| C1.3 | Viewer denied | | | |
| C1.4 | Bounds + audit/no PII | | | |
| C1.5 | Rate limiting | | | |

**Operator:** _______________ **Date:** _______________ **Environment:** ☐ UAT ☐ Live

---

## Manual QA log

| Date | Tester | §1–§2 Auto | §3 Indicator | §4 ±1 adjust | §5 Check-in | §6 Tiers | §7 No capacity | §8 RBAC | §9 Walk-in | §10 Live | Notes |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| 2026-07-07 | | ✅ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ blocked | Historical row: T001–T042 ✅; live QA was blocked → **FE-CAP-001** / **X-009** |

**Column guide**

- **§1–§2**: automated — `npm test` (Capacity + CheckIn + capacityTier + dataService).
- **Full sign-off**: §3–§10 on UAT — requires Backend deploy and safe test data (**BE-CAP-001**).

---

## Sign-off

- [ ] SC-001 — indicator visible within 2s on Check-in open
- [ ] SC-002 — update within 1s after check-in or ±1
- [ ] SC-003 — tier visuals identifiable at 75% / 90%
- [ ] SC-006 — ±1 without HubSpot checked-in change
- [ ] SC-007 — shared live count across desks
