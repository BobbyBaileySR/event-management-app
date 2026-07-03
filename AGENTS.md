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
| [docs/api-contract.md](docs/api-contract.md) | API shapes consumed by `dataService.ts` |
| [docs/hubspot-schema.md](docs/hubspot-schema.md) | Field names — never invent properties |
| [docs/rbac.md](docs/rbac.md) | UI gating for write actions |
| [docs/setup.md](docs/setup.md) | Local dev, OAuth origins |

Backend work: use [../Backend/AGENTS.md](../Backend/AGENTS.md) instead.

**Team overrides:** If [AGENTS_ANNEX.md](AGENTS_ANNEX.md) exists, its instructions supersede conflicting guidance here.

**Cursor rules:** `.cursor/rules/*.mdc` — always-on and file-scoped AI guardrails.

**Changelog:** Update [CHANGELOG.md](CHANGELOG.md) for every meaningful frontend change (same session).

---

## Agent skills

### Issue tracker

GitHub Issues on `BobbyBaileySR/event-management-app`; backend tasks filed here or parked in `../Backend/TODO.md`. External PRs are **not** a triage surface. See `docs/agents/issue-tracker.md`.

### Triage labels

Five canonical labels (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`) — defaults, no overrides. See `docs/agents/triage-labels.md`.

### Domain docs

Multi-context — `CONTEXT-MAP.md` at repo root points to Frontend and Backend glossaries; ADRs in `docs/decisions/`. See `docs/agents/domain.md`.

---

## Product principles

1. **Event is the primary object** — users navigate into an event, then use sub-modules.
2. **Email is a sub-feature** — lives under `/events/{id}/email`, not a standalone product.
3. **Read-first** — UI displays HubSpot data; write actions only when backend phase allows (see [docs/decisions/001-read-first-hubspot.md](docs/decisions/001-read-first-hubspot.md)).
4. **$0 hosting** — GitHub Pages default; Cloudflare Access deferred to Phase 6 (see [docs/decisions/002-zero-budget-hosting.md](docs/decisions/002-zero-budget-hosting.md)).
5. **Security** — no bypass login; session via Google → `/auth/exchange`; no HubSpot tokens in frontend.
6. **Responsive UI** — every view and component must work on **mobile, tablet, and desktop** (see `.cursor/rules/frontend-responsive.mdc`).

---

## Directory structure

```
Frontend/
├── index.html              # Vite entry (GIS script)
├── vite.config.ts          # Dev proxy + build-only CSP
├── src/
│   ├── main.tsx            # Bootstrap
│   ├── App.tsx             # Auth gate, layout, hash routes
│   ├── config.ts           # GOOGLE_CLIENT_ID, API_BASE_URL, mock flags
│   ├── router/             # Route helpers + useActiveRoute()
│   ├── state/              # Session context (appState.tsx)
│   ├── services/           # authService.ts, dataService.ts
│   ├── api/                # client.ts (Bearer + X-EMS-Route)
│   ├── data/               # mockData.ts
│   ├── hooks/              # useDataService()
│   ├── components/         # Sidebar, Toast, ConfirmModal, shared UI
│   └── views/              # One React component per screen
├── css/                    # tokens.css + global styles
└── docs/
```

### Adding a new view

1. Create `src/views/{Name}View.tsx` exporting a React component.
2. Register in `src/views/ViewRouter.tsx`.
3. Update [docs/ui-routes.md](docs/ui-routes.md).
4. Add service methods in `dataService.ts` matching [docs/api-contract.md](docs/api-contract.md).
5. Add Vitest specs (render + XSS guard) in the same change.

---

## Routing

- **Hash routes** via `react-router` in [src/App.tsx](src/App.tsx): `#/events`, `#/events/:eventId`, `#/events/:eventId/:module`
- Logical route names via [src/router/navigation.ts](src/router/navigation.ts) (`useActiveRoute()`, `eventPath()`)
- Event-scoped modules require `eventId`; show `EmptyState` if missing

---

## Configuration

[src/config.ts](src/config.ts):

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
- Session token in **memory** via `src/state/appState.tsx` — avoid `localStorage` for tokens.
- Google Sign-In: programmatic `renderButton` in `authService.ts` (useEffect mount).
- Production CSP injected at build time in `vite.config.ts` — keep tight; never widen `script-src`/`connect-src`. Chart.js is npm-bundled (no CDN).
- Never log or display HubSpot credentials.

### XSS — treat as session compromise

Because the session token lives in memory, an XSS can steal it.

- Render **all** dynamic data via JSX `{value}` — never `dangerouslySetInnerHTML`, `innerHTML`, or `document.write`.
- Never interpolate untrusted values into HTML strings or into `href`/`src`/`on*`/`style` attributes.

---

## API integration pattern

All HubSpot data flows through ScriptRunner — never call HubSpot from frontend.

```typescript
// src/services/dataService.ts pattern — use useDataService() in components
import { CONFIG } from '../config';
import { apiRequest } from '../api/client';

export async function fetchEvents(options: DataServiceOptions = {}) {
  if (CONFIG.USE_MOCK_API) {
    return { events: MOCK_EVENTS };
  }
  return apiRequest('/events', {}, requestOptions(options.token));
}
```

When adding endpoints, update **both** `dataService.ts` and [docs/api-contract.md](docs/api-contract.md).

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
npm test          # Vitest unit + render tests
npm run dev       # Vite dev server on http://localhost:8765
npm run build     # Production bundle → dist/
```

---

## AI agent checklist (frontend PR)

- [ ] Event-centric UX — email nested under event context
- [ ] [docs/ui-routes.md](docs/ui-routes.md) updated if routes changed
- [ ] Brand tokens used — no ad-hoc hex colors
- [ ] Responsive layout — usable on mobile, tablet, and desktop (not desktop-only)
- [ ] No secrets in code
- [ ] No auth bypass
- [ ] No XSS — dynamic data via JSX `{value}`, never `dangerouslySetInnerHTML`; CSP not widened
- [ ] `dataService.ts` updated for new API consumption
- [ ] Vitest specs ship with new views/services (render + XSS guard)
- [ ] Changelog updated in [CHANGELOG.md](CHANGELOG.md)

---

## Changelog

| Date | Change |
| :--- | :--- |
| 2026-07-03 | Configured Matt Pocock engineering skills — `docs/agents/` (issue tracker, triage labels, domain docs), `CONTEXT-MAP.md`, and `## Agent skills` section in AGENTS.md. |
| 2026-07-03 | Added `.cursor/rules/frontend-responsive.mdc` — mobile/tablet/desktop required for all UI work; AGENTS product principle + checklist updated. |
| 2026-07-02 | Added `.cursor/rules/ems-testing-discipline.mdc` and a checklist item: new views/services ship with tests once a runner exists; deferrals parked in `TODO.md` Testing section (`FE-TEST-*`). |
| 2026-07-02 | Added internal security briefings (`docs/security-briefing-stakeholders.md`, `docs/security-briefing-technical.md`) for stakeholder and technical audiences; gitignored. |
