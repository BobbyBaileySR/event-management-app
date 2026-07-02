# Frontend Development Guide (AI Agents & Developers)

> **Adaptavist EMS** — Event Management System UI over HubSpot.

This guide supplements [project-blueprint.md](project-blueprint.md). Read the blueprint first for vision, security, and phases.

---

## Required reading before coding

| Document | When |
| :--- | :--- |
| [project-blueprint.md](project-blueprint.md) | Always — Sections 2 (product model), 3 (security), 9 (frontend map) |
| [TODO.md](TODO.md) | Park skipped/deferred work; check before proposing optional hardening again |
| [docs/product-flows.md](docs/product-flows.md) | User intent — what the events team needs (stakeholder-facing) |
| [docs/ui-routes.md](docs/ui-routes.md) | Routing, views, mock vs live |
| [docs/api-contract.md](docs/api-contract.md) | API shapes consumed by `dataService.js` |
| [docs/hubspot-schema.md](docs/hubspot-schema.md) | Field names — never invent properties |
| [docs/rbac.md](docs/rbac.md) | UI gating for write actions |
| [docs/setup.md](docs/setup.md) | Local dev, OAuth origins |

Backend work: use [../Backend/AGENTS.md](../Backend/AGENTS.md) instead.

**Team overrides:** If [AGENTS_ANNEX.md](AGENTS_ANNEX.md) exists, its instructions supersede conflicting guidance here.

**Cursor rules:** `.cursor/rules/*.mdc` — always-on and file-scoped AI guardrails.

**Changelog:** Update [CHANGELOG.md](CHANGELOG.md) for every meaningful frontend change (same session).

---

## Product principles

1. **Event is the primary object** — users navigate into an event, then use sub-modules.
2. **Email is a sub-feature** — lives under `/events/{id}/email`, not a standalone product.
3. **Read-first** — UI displays HubSpot data; write actions only when backend phase allows (see [docs/decisions/001-read-first-hubspot.md](docs/decisions/001-read-first-hubspot.md)).
4. **$0 hosting** — GitHub Pages default; Cloudflare Access deferred to Phase 6 (see [docs/decisions/002-zero-budget-hosting.md](docs/decisions/002-zero-budget-hosting.md)).
4. **Security** — no bypass login; session via Google → `/auth/exchange`; no HubSpot tokens in frontend.

---

## Directory structure

```
Frontend/
├── index.html              # Shell: CSS, GIS script, module entry
├── css/
│   ├── tokens.css          # Brand variables — source of truth for colors
│   ├── base.css
│   ├── layout.css
│   └── components.css
├── js/
│   ├── app.js              # Bootstrap, auth gating, route → view mounting
│   ├── config.js           # GOOGLE_CLIENT_ID, API_BASE_URL, USE_MOCK_API
│   ├── router.js           # Hash routing
│   ├── api/client.js       # fetch + Bearer token
│   ├── state/appState.js   # Session, selectedEventId
│   ├── data/mockData.js    # PoC mock — replace with live API per phase
│   ├── services/
│   │   ├── authService.js
│   │   └── dataService.js  # Mock/live switch
│   ├── views/              # One file per major screen
│   ├── components/         # sidebar, toast, modal
│   └── utils/dom.js
└── docs/                   # Shared project documentation
```

### Adding a new view

1. Create `js/views/{name}View.js` exporting `mount(container, options)` and `unmount()`.
2. Register in `js/app.js` switch / router.
3. Update [docs/ui-routes.md](docs/ui-routes.md).
4. Add service methods in `dataService.js` matching [docs/api-contract.md](docs/api-contract.md).

---

## Routing

- **Current:** `#/{route}/{eventId?}` via [js/router.js](js/router.js)
- **Target EMS routes:** see [docs/ui-routes.md](docs/ui-routes.md)
- Use `navigate(routeName, eventId)` — sets `selectedEventId` in app state
- Event-scoped modules require `eventId`; show empty state if missing

---

## Configuration

[js/config.js](js/config.js):

| Key | Notes |
| :--- | :--- |
| `GOOGLE_CLIENT_ID` | Public OAuth client ID |
| `API_BASE_URL` | Full ScriptRunner listener URL (flat path); logical routes via `X-EMS-Route` header |
| `APP_NAME` | Primary product label (login, browser title prefix) |
| `APP_SHORT_NAME` | Sidebar header label |
| `USE_MOCK_AUTH` | `true` until Phase 0 auth deployed; set `false` for live `auth/exchange` |
| `USE_MOCK_API` | `true` until backend read APIs exist (can stay true after auth is live) |
| `ALLOWED_EMAIL_DOMAIN` | `adaptavist.com` |
| `EMAIL_SEND_CONFIRM_THRESHOLD` | Large send confirmation |

Do not commit secrets. Client ID is public by OAuth design.

---

## Branding

Use CSS variables from [css/tokens.css](css/tokens.css):

| Token | HEX |
| :--- | :--- |
| `--color-orange` | `#FF6633` |
| `--color-denim` | `#0B0573` |
| `--color-black` | `#000A27` |
| `--color-link` | `#170AF0` |
| `--color-ice` | `#ECF1FF` |

Product name: **Adaptavist EMS**. Sidebar may show "Event Console".

---

## Security rules

- **No bypass login** in production builds.
- Session token in **memory** via `appState.js` — avoid `localStorage` for tokens.
- Google Sign-In: programmatic `renderButton` in `authService.js` (dynamic mount).
- CSP in [index.html](index.html) — keep tight; never widen to `*` or broad `https:` in `script-src`/`connect-src`. Pin CDN scripts with SRI or self-host.
- Never log or display HubSpot credentials.

### XSS — treat as session compromise

Because the session token lives in memory, an XSS can steal it. This becomes the top risk in Phase 1+ when HubSpot data is rendered.

- Render **all** dynamic data (HubSpot fields, user input, API responses, URL/hash values) via `textContent` or `el({ text })` — never `innerHTML` / `insertAdjacentHTML` / `document.write`.
- `dom.js` `htmlToElement()` accepts **trusted static markup only** — never remote or user-derived strings.
- Never interpolate untrusted values into HTML strings or into `href`/`src`/`on*`/`style` attributes; use `setAttribute` / `el()`.

---

## API integration pattern

All HubSpot data flows through ScriptRunner — never call HubSpot from frontend.

```javascript
// js/services/dataService.js pattern
import { CONFIG } from '../config.js';
import { apiRequest } from '../api/client.js';

export async function fetchEvents() {
  if (CONFIG.USE_MOCK_API) {
    return { events: MOCK_EVENTS };
  }
  return apiRequest('/events');
}
```

When adding endpoints, update **both** `dataService.js` and [docs/api-contract.md](docs/api-contract.md).

---

## Mock vs live development

| Phase | `USE_MOCK_AUTH` | `USE_MOCK_API` | Auth |
| :--- | :--- | :--- | :--- |
| PoC / UI shell | `true` | `true` | Google sign-in + mock session exchange |
| Phase 0 connected | `false` | `true` | Google → `/auth/exchange` → Bearer session |
| Backend read APIs | `false` | `false` | Live session + live data |

Mock auth validates `@adaptavist.com` client-side only — **not production security**. Server auth required before production.

---

## Deployment

- **Deploy:** Git push → GitHub Pages (primary; Cloudflare Pages optional)
- **Do not** SFTP-deploy Frontend
- Register every deployment origin in Google OAuth console — see [docs/setup.md](docs/setup.md)
- **Cloudflare Access** (Phase 6): edge auth before HTML is served — free Zero Trust tier OK for small team; **not** a substitute for ScriptRunner session auth. Until enabled, the UI may be publicly loadable; API/data require Bearer session — see blueprint Section 4 and [docs/decisions/002-zero-budget-hosting.md](docs/decisions/002-zero-budget-hosting.md)

---

## Testing locally

```bash
cd Frontend
python3 -m http.server 8765
# Open http://localhost:8765 (HTTP not HTTPS)
```

---

## AI agent checklist (frontend PR)

- [ ] Event-centric UX — email nested under event context
- [ ] [docs/ui-routes.md](docs/ui-routes.md) updated if routes changed
- [ ] Brand tokens used — no ad-hoc hex colors
- [ ] No secrets in code
- [ ] No auth bypass
- [ ] No XSS — dynamic/remote data rendered via `textContent` / `el({ text })`, never `innerHTML`; CSP not widened
- [ ] `dataService.js` updated for new API consumption
- [ ] Tests ship with new views/services once a runner exists (unit + XSS render); deferrals parked in [TODO.md](TODO.md) under Testing — see `.cursor/rules/ems-testing-discipline.mdc`
- [ ] Changelog updated in [CHANGELOG.md](CHANGELOG.md)

---

## Changelog

| Date | Change |
| :--- | :--- |
| 2026-07-02 | Added `.cursor/rules/ems-testing-discipline.mdc` and a checklist item: new views/services ship with tests once a runner exists; deferrals parked in `TODO.md` Testing section (`FE-TEST-*`). |
| 2026-07-02 | Added internal security briefings (`docs/security-briefing-stakeholders.md`, `docs/security-briefing-technical.md`) for stakeholder and technical audiences; gitignored. |
