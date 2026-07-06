# Frontend Development Guide (AI Agents & Developers)

> **Adaptavist EMS** — Event Management System UI over HubSpot.

This guide supplements [project-blueprint.md](project-blueprint.md). Cursor rules in `.cursor/rules/` (repo root + this folder) enforce guardrails automatically.

Backend work: use [../Backend/AGENTS_EMS.md](../Backend/AGENTS_EMS.md) — not the full ScriptRunner platform doc.

**Team overrides:** [AGENTS_ANNEX.md](AGENTS_ANNEX.md) supersedes conflicting guidance if present.

---

## Product principles

1. **Event is the primary object** — users navigate into an event, then use sub-modules.
2. **Email is a sub-feature** — lives under `/events/{id}/email`, not standalone.
3. **Read-first** — UI displays HubSpot data; writes only when backend allows ([ADR-001](docs/decisions/001-read-first-hubspot.md)).
4. **$0 hosting** — GitHub Pages default ([ADR-002](docs/decisions/002-zero-budget-hosting.md)).
5. **Security** — no bypass login; session via Google → `/auth/exchange`; no HubSpot tokens in frontend. See `.cursor/rules/frontend-security.mdc`.
6. **Responsive UI** — mobile, tablet, desktop required (`.cursor/rules/frontend-responsive.mdc`).

---

## Required docs (read on demand)

| Document | When |
| :--- | :--- |
| [project-blueprint.md](project-blueprint.md) | Vision, security, roadmap |
| [TODO.md](TODO.md) | Parked/deferred work |
| [docs/product-flows.md](docs/product-flows.md) | User intent |
| [docs/ui-routes.md](docs/ui-routes.md) | Routes and views |
| [docs/api-contract.md](docs/api-contract.md) | API shapes for `dataService.ts` |
| [docs/hubspot-schema.md](docs/hubspot-schema.md) | Field names — never invent |
| [docs/rbac.md](docs/rbac.md) | Role-gated UI |
| [docs/setup.md](docs/setup.md) | Local dev, OAuth, config flags, branding tokens |

---

## Key paths

```
Frontend/src/
├── App.tsx, config.ts, main.tsx
├── router/          Route helpers
├── state/           Session (appState.tsx — memory only)
├── services/        authService.ts, dataService.ts
├── api/client.ts    Bearer + X-EMS-Route
├── views/           One component per screen
└── components/      Shared UI
```

**New view:** create `src/views/{Name}View.tsx` → register in `ViewRouter.tsx` → update `docs/ui-routes.md` → extend `dataService.ts` → add Vitest specs.

**Routing:** hash routes in `App.tsx` (`#/events/:eventId/:module`).

---

## Deploy and test

```bash
cd Frontend
npm test          # Vitest
npm run dev       # http://localhost:8765
npm run build     # dist/ → Git push → GitHub Pages
```

Deploy Frontend via **Git only** — not SFTP. Register every deployment origin in Google OAuth console.

---

## Agent skills

Issue tracker, triage labels, domain docs: see `docs/agents/` and [CONTEXT-MAP.md](CONTEXT-MAP.md).

---

## Agent checklist (frontend PR)

- [ ] Event-centric UX; email nested under event
- [ ] Routes/docs/contract updated if APIs or navigation changed
- [ ] Brand tokens from `css/tokens.css`; responsive layout
- [ ] No secrets, auth bypass, or XSS (`{value}` only — never `dangerouslySetInnerHTML`)
- [ ] Vitest specs for new views/services
- [ ] [CHANGELOG.md](CHANGELOG.md) updated
