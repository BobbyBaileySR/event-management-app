# Contributing Guide

Workflow and ownership for the Adaptavist EMS project (developer + stakeholder + AI-assisted development).

Related: [project-blueprint.md](../project-blueprint.md) · [setup.md](setup.md) · [product-flows.md](product-flows.md)

---

## Repository layout

| Area | Path | Deploy |
| :--- | :--- | :--- |
| EMS frontend | `Frontend/` | Git → GitHub Pages / Cloudflare Pages |
| ScriptRunner backend | `Backend/scripts/` | SFTP → ScriptRunner Connect |
| Shared docs | `Frontend/docs/` | Git |

**Do not** run git workflows for `Backend/` deployment. **Do not** SFTP-sync `Frontend/`.

---

## Roles

| Role | Who | Responsibilities | Docs |
| :--- | :--- | :--- | :--- |
| **Developer** | Technical partner | Code, architecture, HubSpot/ScriptRunner setup | Blueprint, AGENTS.md, api-contract |
| **Stakeholder** | Events team (non-technical) | Review flows, prioritise features, UAT feedback | [product-flows.md](product-flows.md) |
| **Shared review** | Both | Confirm EMS matches real workflows before write-back phases | product-flows + blueprint Section 10 |

The stakeholder does **not** commit code or edit technical docs. They review [product-flows.md](product-flows.md) and submit feedback via the template at the bottom of that file. The developer translates feedback into blueprint, API, and UI changes.

---

## Ownership (default split)

| Owner | Responsibilities | Docs to maintain |
| :--- | :--- | :--- |
| **Frontend developer** | `Frontend/src/`, `Frontend/css/`, routing, UI modules | `Frontend/AGENTS.md`, `docs/ui-routes.md`, `docs/product-flows.md` *(with stakeholder input)* |
| **Backend developer** | `Backend/scripts/`, HubSpot integration, auth | `docs/api-contract.md`, `Backend/AGENTS.md` |
| **Shared** | HubSpot schema, RBAC, blueprint | `docs/hubspot-schema.md`, `docs/rbac.md`, `project-blueprint.md` |

Both reviewers should approve changes to security, RBAC, and schema docs.

---

## AI development guardrails

Cursor reads project rules from `.cursor/rules/*.mdc` in each workspace root:

- **Frontend:** `.cursor/rules/` — core EMS rules always apply; `frontend-patterns.mdc` applies when editing `src/`, `css/`, or `index.html`
- **Backend:** `.cursor/rules/` — core EMS rules always apply; `backend-scriptrunner.mdc` applies when editing `scripts/` or `node/`

These complement `AGENTS.md` files and must not contradict [project-blueprint.md](../project-blueprint.md) Section 3 (security).

## Changelogs

Record meaningful changes in:

- [Frontend/CHANGELOG.md](../CHANGELOG.md)
- [Backend/CHANGELOG.md](../../Backend/CHANGELOG.md)

Add an entry in the same session as the change (see `ems-changelog.mdc` rules).

---

## Branch naming

```
feature/ems-event-hub
feature/ems-attendees-search
fix/auth-session-expiry
docs/hubspot-schema-update
```

---

## Pull request checklist

**Security review (Slice 1.5 A6):** Before opening a PR, run **`/review-security`** in Cursor and complete the checklist in [.github/pull_request_template.md](../.github/pull_request_template.md). Full process: [security-review-process.md](security-review-process.md) *(manual fallback when Cursor Bugbot is not enabled on GitHub)*.

- [ ] Scope matches a roadmap phase in [project-blueprint.md](../project-blueprint.md)
- [ ] Security: session required on new endpoints; RBAC documented in [rbac.md](rbac.md)
- [ ] XSS: dynamic data via JSX `{value}`, never `dangerouslySetInnerHTML`; CSP not widened
- [ ] Backend: `npm run lint` passes in `Backend/`
- [ ] API changes: [api-contract.md](api-contract.md) updated
- [ ] HubSpot field changes: [hubspot-schema.md](hubspot-schema.md) updated
- [ ] UI route/view changes: [ui-routes.md](ui-routes.md) updated
- [ ] User-facing flow changes: [product-flows.md](product-flows.md) updated or stakeholder review requested
- [ ] No secrets, SFTP keys, or OAuth client secrets committed *(client ID in config is public by design)*
- [ ] Changelog updated: [Frontend/CHANGELOG.md](../CHANGELOG.md) or [Backend/CHANGELOG.md](../../Backend/CHANGELOG.md) as appropriate

---

## AI agent usage

Before assigning work to an AI agent, point it to:

| Task type | Required reading |
| :--- | :--- |
| Backend script | `Backend/AGENTS.md`, `Backend/.cursor/rules/`, `api-contract.md`, `hubspot-schema.md` |
| Frontend UI | `Frontend/AGENTS.md`, `Frontend/.cursor/rules/`, `ui-routes.md`, `product-flows.md`, blueprint Sections 2 and 9 |
| Security change | Blueprint Section 3, `rbac.md` |

Agents must not invent HubSpot property names — use `hubspot-schema.md` or mark TODO.

---

## Commit messages

Use clear, imperative summaries:

```
Add GET /events/{id}/attendees with pagination
Document registration status enum in hubspot-schema
Update product-flows for attendee search journey
```

---

## Changelog

| Date | Change |
| :--- | :--- |
| 2026-07-07 | Linked [security-review-process.md](security-review-process.md) for Slice 1.5 A6 (manual PR review fallback) |
| 2026-07-02 | Migrated to `.cursor/rules/*.mdc`; added CHANGELOG.md; stakeholder role |
