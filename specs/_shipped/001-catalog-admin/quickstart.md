# Quickstart: Catalog Admin validation

End-to-end checks for **001-catalog-admin** after implementation. Assumes Foundation auth is live (`USE_MOCK_AUTH: false`) and catalog backend deployed via SFTP.

**Related**: [spec.md](./spec.md) · [data-model.md](./data-model.md) · [contracts/catalog-api.md](./contracts/catalog-api.md) · [bugs.md](./bugs.md) · [tasks.md](./tasks.md) (Phase 7)

---

## Manual QA log (2026-07-03)

Admin pass against live API (`USE_MOCK_API: false`). **Phase 6 implementation validated except where noted.**

| § | Scenario | Result | Notes |
| :---: | :--- | :---: | :--- |
| 1 | Backend unit tests | **Pass** | |
| 2 | Frontend unit tests | **Pass** | |
| 3 | Empty catalog / create | **Pass** | Program + Event in pickers same session |
| 4 | Viewer read-only | **Pass** | |
| 5 | Archive Event | **Pass** | After Phase 7 fixes |
| 6 | Cascade archive Program | **Pass** | |
| 7 | Duplicate Program name | **Pass** | |
| 8 | `includeArchived` gate | **Pass** | DevTools fetch (admin 200 / viewer 403) |
| 9 | Audit spot-check | **Pass** | `DumpAuditEntries` script — entries visible in invocation logs |
| 10 | Responsive smoke | **Pass** | Custom picker menus on mobile viewport |

**Bug detail**: [bugs.md](./bugs.md) · **Fix tasks**: [tasks.md](./tasks.md) Phase 7 (T044–T055)

**Feature status:** **001-catalog-admin complete** (2026-07-04). Closeout: commit + push Frontend; SFTP latest `Backend/scripts/` (incl. `DumpAuditEntries.ts`).

---

## When you return — start here

1. **Deploy fixes** — SFTP upload `Backend/scripts/` (especially `Utils/Catalog.ts`); Git push Frontend.
2. **Re-run manual QA** from this file ( **T054** ):
   - **§5 → §6 → §8** first (Archived tab, cascade, RBAC gate)
   - **§4** (viewer — never tested in first pass)
   - **§9 → §10** (audit + responsive)
3. Update the **Manual QA log** table below and mark **T054** in `tasks.md`.

Phase 7 code fixes (BUG-1–3) shipped **2026-07-04** — see `bugs.md` and CHANGELOG.

---

## Prerequisites

1. ScriptRunner Parameters: `USER_ROLE_MAP` includes your `@adaptavist.com` email as **admin** and a second test account as **viewer** (or operator).
2. Frontend `config.ts`: `USE_MOCK_API: false`, `API_BASE_URL` points at deployed listener.
3. Backend catalog handlers uploaded; `npm test && npm run lint:fix` passed locally before SFTP.

---

## 1. Backend unit tests (local)

```bash
cd Backend
npm test -- --testPathPattern=Catalog
npm run lint:fix
```

**Expected**: All catalog route and util tests green — including 401/403/409/422 cases, cascade archive, Program unarchive restore, unique Program name.

---

## 2. Frontend unit tests (local)

```bash
cd Frontend
npm test -- Catalog
npm run lint
```

**Expected**: Catalog normalizer, picker, and admin view tests green; XSS fixtures render as text.

---

## 3. Empty catalog (admin)

1. Sign in as **admin**.
2. Open EMS — navigation pickers show empty state / guidance to create first Program.
3. Open **Catalog admin** (Settings or `#/catalog` per implementation).
4. Create Program: name `QA Program 2026`, form id `test-form-001`.
5. Add Event: name `Meeting Room`, Parts Attended `Meeting Room`.

**Expected**: Program + Event appear in navigation pickers within one session (SC-001).

---

## 4. Non-admin read-only navigation (viewer)

1. Sign out; sign in as **viewer**.
2. Confirm Program/Event pickers show `QA Program 2026` → `Meeting Room`.
3. Confirm catalog admin screens are hidden; direct API `POST catalog/program` returns **403**.

**Expected**: SC-002 for mutations; pickers work for viewer (FR-009).

---

## 5. Archive Event

1. As **admin**, archive Event `Meeting Room` only.
2. Refresh — Event absent from navigation pickers (all roles).
3. Open archived catalog admin view — Event listed with metadata.
4. Unarchive Event.

**Expected**: SC-003, SC-006 — Event returns to pickers after unarchive.

---

## 6. Cascade archive Program

1. Create second Event under same Program.
2. Archive **Program** (not individual Events).
3. Confirm Program and **all** Events hidden from pickers.
4. Archived view shows Program + Events.
5. Unarchive Program.

**Expected**: All cascade-archived Events restored to pickers (User Story 3 scenario 3).

---

## 7. Duplicate Program name

1. Attempt create second Program with same name `QA Program 2026` (different form id).

**Expected**: **409** / validation message; no duplicate record (FR-011).

---

## 8. includeArchived gate

**DevTools recipe** (while signed in on the same origin as the UI, e.g. `http://127.0.0.1:8767`):

1. Open **Network**, pick any successful EMS request, copy the `Authorization: Bearer …` token (or read `session.token` from React DevTools → `SessionProvider` state).
2. In the **Console**:

```javascript
const token = 'PASTE_SESSION_TOKEN';

// Admin — expect 200 + archived tree
fetch('/api/ems?includeArchived=true', {
  headers: { Authorization: `Bearer ${token}`, 'X-EMS-Route': 'catalog' },
}).then((r) => r.json().then((body) => ({ status: r.status, body }))).then(console.log);

// Viewer — expect 403 (sign in as viewer first, paste that token)
```

**Important**: `X-EMS-Route` must be **`catalog` only**. The query string belongs on the URL (`?includeArchived=true`), not in the header.

1. As **viewer**, run the fetch above.

**Expected**: **403 forbidden**.

2. As **admin**, same fetch.

**Expected**: **200** with archived entries in tree.

---

## 9. Audit spot-check

Catalog mutations write to **Record Storage** with keys `ems-audit-{requestId}` (90-day TTL). There is no Record Storage browser in the ScriptRunner UI — use the ops script below.

### Run `DumpAuditEntries` (ScriptRunner UI)

1. SFTP-upload `scripts/DumpAuditEntries.ts` (same deploy as other handlers).
2. In ScriptRunner Connect → **Resource Manager** → **Scripts** → open **`DumpAuditEntries`**.
3. Click **Run** (manual trigger — no event payload needed).
4. Open **Logs** → **Script invocation logs** for that run.
5. Console output lists each `ems-audit-*` key and JSON entry (`action`, `actorEmail`, `resourceId`, `timestamp`, …).

Perform a catalog create/archive/unarchive first if the log says zero entries.

**TTL:** Each `ems-audit-*` key is written with a **90-day** Record Storage TTL (see below). Older entries disappear automatically; `DumpAuditEntries` only shows keys still present.

**Expected**: Mutation actions such as `catalog.program.create` / `catalog.event.update` appear; no GET catalog noise.

**Not wired yet**: `GET audit/recent` in the EMS UI.

---

## 10. Responsive smoke

1. Resize to mobile width (~375px) — pickers and catalog admin forms usable without horizontal scroll.
2. Tablet (~768px) and desktop — same flows.

**Expected**: Meets [frontend-responsive.mdc](../../.cursor/rules/frontend-responsive.mdc).

---

## Rollback

If catalog handlers misbehave in production: revert SFTP upload of new `scripts/` files; frontend can set `USE_MOCK_API: true` temporarily for UI-only demos (not for production check-in).

---

## Known gaps (not catalog bugs)

**All Events → `GET events` 404**  
The **All Events** portfolio page (`#/events`) still calls legacy `GET events`. That handler is **not deployed** yet (Slice 1 catalog only ships `GET catalog`). With `USE_MOCK_API: false` you will see `{"message":"No handler for events","code":"route_not_found"}` — expected until a HubSpot read slice adds the route. Catalog pickers and `#/catalog` admin are unaffected. For PoC demos of All Events, set `USE_MOCK_API: true` or ignore the 404 during catalog QA.
