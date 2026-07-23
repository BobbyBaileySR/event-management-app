# Context Map

Adaptavist EMS spans two contexts: a React frontend (this repo) and a ScriptRunner Connect backend (sibling folder). HubSpot is the system of record; neither context talks to HubSpot from the browser.

## Contexts

- [Frontend](./CONTEXT.md) — Staff-only Event Management UI (Vite/React, hash routes, `dataService`, views)
- [Backend](../Backend/CONTEXT.md) — ScriptRunner Connect HTTP router (auth, RBAC, rate limit, HubSpot integration)

## Relationships

- **Frontend → Backend**: All data and session auth flow through the ScriptRunner Generic HTTP listener (`API_BASE_URL?route=<logical-route>` + Bearer session where required). The backend accepts `X-EMS-Route` only as a legacy fallback. See [docs/api-contract.md](./docs/api-contract.md).
- **Backend → HubSpot**: Backend is the sole HubSpot integration boundary. Frontend never holds HubSpot credentials.
- **Shared product model**: **Event** is the primary object; **Email** is always scoped to one event. See [docs/product-flows.md](./docs/product-flows.md) and [project-blueprint.md](./project-blueprint.md).

## Decisions

System-wide architectural decisions live in [docs/decisions/](./docs/decisions/). Context-specific decisions may be added under `../Backend/docs/decisions/` as the backend glossary grows.
