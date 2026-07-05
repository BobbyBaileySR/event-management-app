# Quickstart: Catalog Metadata & Modal Forms validation

End-to-end checks for **002-catalog-metadata-modal** after implementation. Builds on [001 quickstart](../001-catalog-admin/quickstart.md) — Foundation auth and catalog handlers from 001 must be deployed first.

**Related**: [spec.md](./spec.md) · [data-model.md](./data-model.md) · [contracts/catalog-api.md](./contracts/catalog-api.md) · [plan.md](./plan.md)

---

## Prerequisites

1. **001-catalog-admin** complete and deployed (Backend SFTP, Frontend Git).
2. Frontend `config.ts`: `USE_MOCK_API: false` for live API checks (or `true` for mock-only smoke).
3. Admin + viewer test accounts in `USER_ROLE_MAP`.
4. At least one **legacy** catalog record (created before 002) without metadata fields — or create one using 001-only fields before deploying 002.

---

## 1. Backend unit tests (local)

```bash
cd Backend
npm test -- --testPathPattern=Catalog
npm run lint:fix
```

**Expected**: All existing 001 catalog tests still pass **plus** new cases for:

- POST/PATCH with metadata round-trip
- PATCH with `null` clears optional field
- Legacy record load without metadata keys
- Invalid `startDate` / `date` → `422`
- GET tree returns metadata on nodes when set

---

## 2. Frontend unit tests (local)

```bash
cd Frontend
npm test -- Catalog
npm run lint
```

**Expected**: Tests green for:

- `CatalogProgramModal` / `CatalogEventModal` create + edit + cancel
- Archived tab: no Edit/Create buttons; metadata visible read-only
- XSS: hostile `description` / `owner` rendered as text
- `normalizeApi` passes optional metadata
- `CatalogPickers` still show **name only** (no metadata regression)
- Modal a11y: `role="dialog"`, `aria-modal="true"`
- Responsive modal smoke at 375px viewport (no `document.body` horizontal overflow)

---

## 3. Program create via modal (admin, active tab)

1. Sign in as **admin**.
2. Open `#/catalog` — **Active** tab.
3. Click **Create Program** (or equivalent) — **Program modal** opens (not inline form).
4. Enter required: name + HubSpot form ID.
5. Enter optional: description, start/end dates, location, timezone.
6. Save.

**Expected**:

- Modal closes; Program appears in tree with metadata summary visible.
- No inline create fields remain on page.
- Navigation pickers show Program **by name only**.

---

## 4. Event create via modal (admin, active tab)

1. On Active tab, open **Create Event**.
2. Confirm **Program dropdown** is inside the modal.
3. Select Program; fill name + Parts Attended option + optional metadata (owner, date, capacity, etc.).
4. Save.

**Expected**: Event nested under chosen Program; metadata visible in admin tree; pickers unchanged.

---

## 5. Edit active Program / Event

1. On Active tab, click **Edit** on an active Program.
2. Change description and location; save.

**Expected**: Tree updates in same session.

3. Edit an Event — change capacity and date; save.

**Expected**: Updated values in tree.

---

## 6. Clear-on-save (edit)

1. Edit a Program or Event that has saved optional metadata.
2. Clear one optional field (e.g. capacity or description) — leave blank.
3. Save.

**Expected**: That field **disappears** from admin tree summary (unset, not previous value).

---

## 7. Legacy backward compatibility

1. Load a pre-002 Program/Event (metadata keys absent).
2. Confirm pickers and admin tree work; metadata area empty.
3. Edit → add metadata → save.

**Expected**: Record still valid; new fields appear without migration. SC-004 is **qualitative** acceptance (fixture + spot-check), not an automated “100%” count.

---

## 8. Archived tab behaviour

1. Archive an Event or Program (001 flow).
2. Switch to **Archived** tab.

**Expected**:

- Metadata visible read-only on entries.
- **No** Create or Edit actions.
- Unarchive still works; after unarchive on Active tab, Edit available again.

---

## 9. Viewer / non-admin

1. Sign in as **viewer**.
2. Confirm catalog admin route blocked or read-only (same as 001).
3. Confirm Program/Event pickers work; no modal access.

**Expected**: SC-005 — no regression from 001.

---

## 10. Capacity without validation

1. Edit Event; set capacity to `-1` or `12.5`; save.

**Expected**: Value stored and displayed (no client/server rejection this release).

---

## 11. Responsive modal smoke (**release gate**)

1. DevTools → ~375px width (record viewport in QA log).
2. Open Program create modal; complete save.
3. Repeat with Event create modal.

**Expected**: SC-006 — modal usable on mobile.

**Fail if**: horizontal scrollbar on `document.body`, or modal content clipped/off-screen at 375px width. Must pass before deploy (tasks T035).

---

## 12. Regression — 001 archive & pickers

Re-run 001 quickstart **§5–§6** (archive Event, cascade Program) and confirm pickers exclude archived entries.

**Expected**: 001 behaviour unchanged; metadata does not appear in picker labels.

---

## Manual QA log

| § | Scenario | Result | Notes |
| :---: | :--- | :---: | :--- |
| 1 | Backend unit tests | Pass | 27/27 Catalog tests green (2026-07-04) |
| 2 | Frontend unit tests | Pass | 74/74 Vitest suite green; 25 Catalog-related (2026-07-04) |
| 3 | Program modal create | Pass | Manual QA (2026-07-04) |
| 4 | Event modal create | Pass | Mobile Program dropdown fix verified; manual QA (2026-07-04) |
| 5 | Edit active entries | Pass | Manual QA (2026-07-04) |
| 6 | Clear-on-save | Pass | Manual QA (2026-07-04) |
| 7 | Legacy compat | Pass | Backend legacy fixture + frontend normalizer/admin edit tests |
| 8 | Archived tab read-only | Pass | `CatalogAdminView.test.tsx` — no Create/Edit on archived tab |
| 9 | Viewer regression | Pass | `CatalogAdminView.test.tsx` — non-admin Navigate |
| 10 | Capacity no validation | Pass | Backend accepts `-1` and `12.5` in legacy PATCH test |
| 11 | Responsive modal | Pass | 375px + mobile Program dropdown; manual QA (2026-07-04) |
| 12 | 001 archive regression | Pass | Manual QA — archive/pickers unchanged (2026-07-04) |

---

## Deploy checklist

| Repo | Action |
| :--- | :--- |
| Backend | `npm test && npm run lint:fix` → SFTP `scripts/` |
| Frontend | `npm test && npm run lint` → Git push |
| Docs | Merge contract delta into `docs/api-contract.md` (same change) |
