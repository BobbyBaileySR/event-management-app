# Bug report: Catalog Admin (001-catalog-admin)

**Reported**: 2026-07-03  
**Status**: **Fixed** (2026-07-04) — Phase 7 complete; manual quickstart **T054 pass (2026-07-04)**  
**Reporter testing**: Admin manual pass via `quickstart.md` (2026-07-03). **§1–§3 and §7 passed**; bugs below block §5 follow-through and §6/§8; **§4, §9, §10 not run**.

---

## Quickstart coverage at report time

| Section | Topic | Status |
| :--- | :--- | :--- |
| §1 | Backend unit tests | **Pass** |
| §2 | Frontend unit tests | **Pass** |
| §3 | Empty catalog / create | **Pass** |
| §4 | Viewer read-only pickers | **Not tested** |
| §5 | Archive Event | **Partial** — archive works; pickers + archived tab broken (BUG-1–3) |
| §6 | Cascade archive Program | **Not tested** — blocked by BUG-2 (Archived tab) |
| §7 | Duplicate Program name | **Pass** |
| §8 | includeArchived RBAC gate | **Not tested** — admin path blocked by BUG-2; viewer 403 unchecked |
| §9 | Audit spot-check | **Not tested** |
| §10 | Responsive smoke | **Not tested** |

Full log: [quickstart.md § Manual QA log](./quickstart.md#manual-qa-log-2026-07-03)

---

## BUG-1 — Pickers keep archived Event selected (no blank placeholder)

**Symptom**  
After archiving an Event (e.g. Meeting Room) that was selected in the **Program / Event** pickers on the main layout (visible on All Events and other pages), the dropdown still reflects the archived selection. Expected: reset to blank **“Select Program”** / **“Select Event”** (or equivalent empty option).

**Severity**: Medium — breaks SC-003 UX; staff may think archived Event is still active context.

**Root cause (code review)**

1. **`CatalogPickers` loads catalog once on mount** (`useEffect` deps: `[data, setSelection]`). Archiving in `#/catalog` does **not** refetch or clear picker state.
2. **No empty `<option>`** for Program/Event — first item is always auto-selected (`programs[0]`, `events[0]`).
3. **Stale selection fallback**: if `evId` is missing from the active tree, code falls back to `selectedProgram.events[0]` instead of clearing selection.
4. **Context summary** (`Working context: …`) can remain showing old names until reload.

**Affected files**

- `Frontend/src/components/CatalogPickers.tsx`
- `Frontend/src/state/catalogContext.tsx` (optional: invalidation / refresh signal)
- `Frontend/src/views/CatalogAdminView.tsx` (should notify pickers after archive/unarchive)

**Planned fix**

1. Add disabled placeholder options: **“Select Program”**, **“Select Event”** (`value=""`).
2. After `fetchCatalog()` (active only), if current `programId` / `evId` **not in tree**, call `setSelection` with all nulls (do **not** auto-pick first Event).
3. After admin archive/unarchive in `CatalogAdminView`, trigger catalog refresh for pickers (e.g. shared `catalogRevision` counter in context, or `window` event, or refetch on `visibilitychange` / route focus — prefer explicit bump from admin save handlers).
4. **Tests**: `CatalogPickers.test.tsx` — archive removes option; selection clears to placeholder; no stale summary text.

**Spec alignment**: FR-010, SC-003, User Story 1 scenario 3, quickstart §5 step 2.

---

## BUG-2 — Archived tab error: `No handler for catalog?includearchived=true`

**Symptom**  
On **Catalog admin → Archived** tab, error shown: **`No handler for catalog?includearchived=true`**.

**Severity**: High — archived admin view unusable on **live API**; blocks quickstart §5 step 3, §6, §8.

**Root cause (code review)**

`dataService.fetchCatalog({ includeArchived: true })` calls:

```typescript
apiRequest('/catalog?includeArchived=true', ...)
```

`api/client.ts` sets:

```typescript
headers.set('X-EMS-Route', path.replace(/^\/+/, ''));
```

So **`X-EMS-Route` becomes `catalog?includearchived=true`** (entire string; backend also lowercases routes).  
`OnHttpRouter` registers handler key **`catalog`** only → **404** `"No handler for catalog?includearchived=true"`.

Backend **`OnGetCatalog`** correctly reads `event.queryStringParams.includeArchived` — but only when the logical route is **`catalog`** and query params are on the HTTP event.

**Note**: With **`USE_MOCK_API: true`**, mock path bypasses `apiRequest` — this bug appears only when **`USE_MOCK_API: false`** (live ScriptRunner). Reporter likely testing against deployed or local live backend.

**Affected files**

- `Frontend/src/api/client.ts` — split path vs query for `X-EMS-Route` and listener URL
- `Frontend/src/services/dataService.ts` — may simplify to `'/catalog'` + query option
- `Backend/node/tests/CatalogRoutes.test.ts` — add regression with query param on HTTP event (not in route header)

**Planned fix**

1. **`apiRequest`**: parse `path` into pathname + searchParams; set **`X-EMS-Route`** to pathname only (`catalog`); append query string to **`fetch(API_BASE_URL + '?' + …)`** if ScriptRunner listener forwards query to `queryStringParams` (verify against contract / existing auth patterns).
2. If flat listener does **not** forward URL query, alternative: custom header (e.g. `X-EMS-Query`) — **only if** query on URL fails in manual test; prefer URL query first per api-contract.
3. **Tests**: frontend unit test that `apiRequest('/catalog?includeArchived=true')` sets header `catalog` not `catalog?…`; backend route test with `queryStringParams: { includeArchived: 'true' }`.

**Spec alignment**: FR-012, contracts/catalog-api.md, quickstart §8.

---

## BUG-3 — Archived tab lists Program when only an Event was archived

**Symptom**  
Archive **Meeting Room** Event only. **Archived** tab shows the **Program** (e.g. Atlassian Event 2026) as an archived entry, with Program-level archive affordance, even though the Program is still active.

**Severity**: Medium — misleading admin UX; confuses archive state vs cascade (quickstart §6).

**Root cause (code review)**

**Backend `filterTree(..., includeArchived: true)`**:

- Includes **all** events under a program (`visibleEvents = events`, not archived-only).
- Includes **active** programs (`program.archived` gate only applies when `includeArchived` is false).
- Returns `archived: false` on the program node while still listing it in the archived admin response.

**Mock `getMockCatalog(true)`** mirrors the same: active programs with **all** events, not archived-only subset.

**UI `CatalogAdminView`**: renders every program in the response with **Archive Program** / tree layout — no distinction between “archived program” vs “program that merely has archived events”.

**Expected behavior (from spec + reporter)**

Archived admin view should list **only archived entities**:

| Case | Archived tab should show |
| :--- | :--- |
| Event archived only | **Event only** (Program name as parent label/context, Program **not** marked archived) |
| Program archived (cascade) | Program **and** cascade-archived Events |

**Affected files**

- `Backend/scripts/Utils/Catalog.ts` — `filterTree` / new `buildArchivedAdminTree()` for `includeArchived=true`
- `Frontend/src/data/mockData.ts` — `getMockCatalog(true)` same semantics
- `Frontend/src/views/CatalogAdminView.tsx` — layout: event-only rows vs archived program block; hide Program archive when `!program.archived`
- `specs/_shipped/001-catalog-admin/contracts/catalog-api.md` — clarify `includeArchived` response shape (optional doc tweak)

**Planned fix**

1. When `includeArchived=true`, return programs **only if** `program.archived || any event.archived`.
2. Under each program, **`events` array = archived events only** (not active siblings).
3. Admin UI: if program not archived, show program name as **section label** only; archived events as list items; **Unarchive Event** only. If program archived, show program row + cascade events + **Unarchive Program**.
4. **Tests**: backend `buildCatalogTree(true)` — single event archived → program not `archived: true`, one event in tree; cascade case → program + all cascade events.

**Spec alignment**: FR-012, User Story 3 scenario 1, quickstart §5 step 3.

---

## Fix order (recommended)

```text
BUG-2 first  → unblocks Archived tab + §8 + §6 testing
BUG-3 next   → correct archived list semantics
BUG-1 last   → picker refresh + placeholders (can ship with BUG-3 in one FE pass)
```

Then **re-run quickstart** §4 → §6 → §8 → §9 → §10.

---

## Out of scope for this bug batch

- Legacy **All Events** (`#/events`) mock event list — separate from catalog pickers; not reported broken.
- Viewer testing — planned after fixes (§4).
- Audit / responsive — §9–§10 after functional fixes.

---

## Implementation entry point

Planned tasks appended to **`tasks.md`** → **Phase 7: Bug fixes**. Implemented **2026-07-04** (T044–T053, T055). Manual re-validation: **T054**.
