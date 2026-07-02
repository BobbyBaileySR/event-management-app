# Adaptavist EMS — Frontend

Staff-only **Event Management System** UI for the Adaptavist events team.

This is the static web frontend. It provides an easier interface for day-to-day event operations while **HubSpot remains the system of record**. The browser never talks to HubSpot directly — all data flows through a secured backend (ScriptRunner Connect), which is the only component that holds credentials.

> Internal tool. Access is restricted to Adaptavist staff (`@adaptavist.com`) via Google Sign-In.

---

## Tech

- Static HTML / CSS / vanilla JS (ES modules) — no build step
- Google Identity Services for sign-in
- Deployed via Git to GitHub Pages (or Cloudflare Pages)

---

## Run locally

### Mock auth / UI only (no ScriptRunner)

```bash
cd Frontend
python3 -m http.server 8765
# open http://localhost:8765
```

Set `USE_MOCK_AUTH: true` in `js/config.js`.

### Live Phase 0 auth (recommended)

ScriptRunner cannot handle browser `OPTIONS` preflight. Use the included dev proxy so the browser calls `/api/ems` on the same origin.

1. Copy `dev-server.config.example.js` → `dev-server.config.js`
2. Set `srcListenerUrl` to your ScriptRunner listener URL (from ScriptRunner web UI)
3. In `js/config.js`: `API_BASE_URL: '/api/ems'`, `USE_MOCK_AUTH: false`
4. Run:

```bash
cd Frontend
npm run dev
# open http://localhost:8765
```

Sign-in requires Google OAuth client ID and `http://localhost:8765` as an authorised JavaScript origin.
Template: `js/config.example.js`. Local listener config: `dev-server.config.example.js` (gitignored copy).

---

## Structure

```
Frontend/
├── index.html          App shell (CSP, Google script, module entry)
├── css/                Brand tokens + styles
├── js/
│   ├── app.js          Bootstrap, auth gating, routing
│   ├── config.js       Public config (client ID, API base, mock flag)
│   ├── router.js       Hash routing
│   ├── api/            HTTP client (Bearer session)
│   ├── services/       Auth + data access
│   ├── state/          In-memory app state
│   ├── views/          One file per screen
│   └── components/      Sidebar, toast, modal
└── AGENTS.md           Developer / AI contributor guide
```

---

## Security notes

- **No secrets in this repo.** The Google client ID is public by OAuth design; no
  HubSpot tokens, signing secrets, or private keys belong here.
- The frontend performs **no direct HubSpot calls** — the backend enforces
  authentication, authorisation, and auditing.
- Until **Cloudflare Access** is enabled (Phase 6), this static site may be
  **publicly loadable** on GitHub Pages. HubSpot data still requires a valid
  **ScriptRunner session** — loading the UI is not the same as API access.
- Do not add bypass/mock login paths to production builds.

---

## Contributor docs (kept outside this repo)

Detailed planning and specifications — the project blueprint and the `docs/`
folder (architecture, API contract, HubSpot schema, RBAC, setup) — are
**intentionally excluded from version control** and are not published with the
site. They are maintained locally in the workspace. Keep a private backup of
those files; a fresh clone of this repo will not contain them.

AI/dev contributors: start with [`AGENTS.md`](AGENTS.md) and the Cursor rules in
`.cursor/rules/`.

---

## Deployment

- Frontend: Git push → GitHub Pages / Cloudflare Pages
- Backend: separate ScriptRunner Connect workspace (deployed via SFTP, not this repo)
- Register every hosting origin in the Google OAuth console
