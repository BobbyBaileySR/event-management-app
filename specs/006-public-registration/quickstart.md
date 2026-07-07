# Quickstart: Public Registration (Slice 3)

Manual and automated validation for **006-public-registration** — view/copy link (US1), Program configure (US2), Event override (US3), Open in HubSpot (US4).

**Related**: [spec.md](./spec.md) · [plan.md](./plan.md) · [contracts/catalog-registration.md](./contracts/catalog-registration.md) · [data-model.md](./data-model.md)

Builds on [003 quickstart](../003-check-in/quickstart.md) (catalog context, admin RBAC).

---

## Sign-off overview

| Area | Gate | Notes |
| :--- | :---: | :--- |
| **Automated tests** | Required | §A — before release candidate |
| **US1 View + copy** | Required | §B1 |
| **US2 Program configure** | Required | §B2 — modal + panel sync |
| **US3 Event override** | Required | §B3 — independent publish state |
| **US4 Open in HubSpot** | Required | §B4 — editor or fallback |
| **RBAC** | Required | §B5 — panel hidden non-admin |
| **Walk-in unchanged** | Required | §B6 — 003 regression |

---

## Prerequisites

1. **001–003** catalog + check-in deployed (or mock catalog with registration fields).
2. **006 Backend** SFTP-deployed: catalog validation for registration fields.
3. Frontend: mock or live catalog PATCH for registration fields.
4. **Admin** account for panel tests; **viewer/operator** for RBAC.
5. Sample URLs for QA:
   - HubSpot subdomain: `https://12345678.hs-sites.com/sample-page`
   - Custom domain: `https://events.example.com/register` (HTTPS)
   - Invalid: `http://insecure.example.com` (reject)
6. Optional: real HubSpot landing page URL for Open in HubSpot derivation check.

---

## A. Automated tests

### A1. Backend

```bash
cd Backend
npm test -- --testPathPattern="CatalogRoutes"
npm run lint:fix
```

| Suite | Covers |
| :--- | :--- |
| `CatalogRoutes.test.ts` | POST/PATCH program+event registration URL valid/invalid; publish state enum; default draft on first URL; clear override |

### A2. Frontend

```bash
cd Frontend
npm test -- RegistrationPanel hubspotRegistrationPageUrl resolveRegistration CatalogProgram CatalogEvent Settings
npm run lint
```

| Area | Covers |
| :--- | :--- |
| `hubspotRegistrationPageUrl.test.ts` | HTTPS, hubspot/hs-sites/custom domain, reject http |
| `resolveRegistration.test.ts` | Program default, Event override, copyEnabled |
| `hubspotPageEditorUrl.test.ts` | Known pattern → editor; unknown → null |
| `RegistrationPanel.test.tsx` | draft blocks copy; published enables copy; source badge; admin save |
| `SettingsView.test.tsx` | non-admin omits panel |
| XSS | Hostile URL text renders escaped |

---

## B. Manual QA (UAT)

### B0. Entry & context

1. Sign in as **admin**.
2. Select **Program + Event** in catalog pickers.
3. Open **Settings** from event hub.
4. **Pass**: Registration panel visible (admin).
5. Clear catalog selection → **Pass**: guidance empty state (consistent with other modules).

### B1. US1 — View resolved link + copy

1. In catalog admin, set Program `registrationPageUrl` + publish **published**.
2. Open Settings for Event **without** override.
3. **Pass**: Panel shows Program URL, source **Program default**, state **published**.
4. Click **Copy registration link** → paste in notepad → matches public URL; toast confirms.
5. Set Program state to **draft** → **Pass**: copy disabled/blocked with guidance.

### B2. US2 — Program configure + sync

1. Program modal: add URL (first time) → save.
2. **Pass**: State defaults **draft**; panel shows draft; copy disabled.
3. Panel: set **published** → save.
4. Open Program modal → **Pass**: same URL + published (sync).
5. Panel: invalid `http://bad` → **Pass**: validation error, no save.

### B3. US3 — Event override

1. Program URL **published**.
2. VIP Event: set override URL + **draft** in Event modal.
3. VIP Settings panel → **Pass**: override URL, source **Event override**, copy blocked.
4. Meeting Room Event (no override) → **Pass**: still Program URL + published + copy works.
5. Clear VIP override → **Pass**: falls back to Program URL + state.

### B4. US4 — Open in HubSpot

1. Resolved URL set → click **Open in HubSpot**.
2. **Pass**: New tab opens — editor deep link **or** HubSpot Marketing → Landing pages fallback.
3. If fallback used → **Pass**: inline note visible on panel.
4. No URL configured → **Pass**: button disabled/hidden.

### B5. RBAC

1. Sign in as **non-admin** (viewer or operator).
2. Open Settings with catalog context.
3. **Pass**: Registration panel **not** rendered; other Settings content still visible.

### B6. Walk-in regression (003)

1. Event has `walkInFormUrl` set.
2. Registration panel → **Pass**: does not show walk-in URL as public registration URL.
3. Check-in Walk-in mode → **Pass**: iframe still loads `walkInFormUrl` (unchanged).

---

## C. Responsive smoke

1. Resize to ~375px width on Settings + Registration panel.
2. **Pass**: URL field and buttons usable; no horizontal page overflow.

---

## D. Release checklist

- [ ] `docs/api-contract.md` merged with [catalog-registration.md](./contracts/catalog-registration.md)
- [ ] `CHANGELOG.md` entries (Frontend + Backend)
- [ ] Mock catalog includes sample registration fields for local dev
