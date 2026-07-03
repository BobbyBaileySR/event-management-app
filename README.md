# Adaptavist EMS — Frontend

Staff-only **Event Management System** UI for the Adaptavist events team.

This is the React + Vite frontend. It provides an easier interface for day-to-day event operations while **HubSpot remains the system of record**. The browser never talks to HubSpot directly — all data flows through a secured backend (ScriptRunner Connect), which is the only component that holds credentials.

> Internal tool. Access is restricted to Adaptavist staff (`@adaptavist.com`) via Google Sign-In.

---

## Tech

- **React 19 + TypeScript + Vite** — production build → `dist/`
- Google Identity Services for sign-in
- Chart.js self-hosted via npm (bundled, no CDN)
- Deployed via Git to GitHub Pages (GitHub Actions builds `dist/`)

---

## Run locally

```bash
cd Frontend
npm install
npm run dev
# open http://localhost:8765
```

### Live Phase 0 auth (ScriptRunner proxy)

ScriptRunner cannot handle browser `OPTIONS` preflight. Vite proxies `/api/ems` to your listener when configured:

1. Copy `dev-server.config.example.js` → `dev-server.config.js`
2. Set `srcListenerUrl` to your ScriptRunner listener URL
3. In `src/config.ts`: `USE_MOCK_AUTH: false` (and `USE_MOCK_API` as needed)
4. Run `npm run dev`

Sign-in requires Google OAuth client ID and `http://localhost:8765` as an authorised JavaScript origin.

### Mock-only UI

Set `USE_MOCK_AUTH: true` and `USE_MOCK_API: true` in `src/config.ts`.

---

## Structure

```
Frontend/
├── index.html          Vite entry (GIS script)
├── vite.config.ts      Dev proxy + build-only CSP
├── src/
│   ├── main.tsx        Bootstrap
│   ├── App.tsx         Auth gate + hash routes
│   ├── config.ts       Public config (client ID, API base, mock flags)
│   ├── services/       Auth + data access
│   ├── views/          One component per screen
│   └── components/     Sidebar, toast, modal, shared UI
├── css/                Brand tokens + global styles
└── AGENTS.md           Developer / AI contributor guide
```

---

## Scripts

| Command | Purpose |
| :--- | :--- |
| `npm run dev` | Vite dev server (HMR) on port 8765 |
| `npm run build` | Typecheck + production bundle → `dist/` |
| `npm test` | Vitest unit + render tests |
| `npm run lint` | ESLint on `src/` |

---

## Security notes

- **No secrets in this repo.** The Google client ID is public by OAuth design; no HubSpot tokens, signing secrets, or private keys belong here.
- The frontend performs **no direct HubSpot calls** — the backend enforces authentication, authorisation, and auditing.
- Until **Cloudflare Access** is enabled (Phase 6), this static site may be **publicly loadable** on GitHub Pages. HubSpot data still requires a valid **ScriptRunner session**.
- Do not add bypass/mock login paths to production builds.

---

## Contributor docs

See [`AGENTS.md`](AGENTS.md) and `.cursor/rules/` for AI/dev guardrails. Shared specs live in `docs/` (when present in your workspace clone).

---

## Deployment

- Frontend: Git push to `main` → GitHub Actions builds and deploys `dist/` to Pages
- Backend: separate ScriptRunner Connect workspace (deployed via SFTP, not this repo)
- Register every hosting origin in the Google OAuth console
