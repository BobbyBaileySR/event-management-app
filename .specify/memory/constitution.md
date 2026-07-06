<!--
Sync Impact Report
- Version change: 1.0.0 → 1.1.0
- Updated: Shared rules moved to repo root `.cursor/rules/`; Backend daily guide is AGENTS_EMS.md
- Follow-up: none
-->

# Adaptavist EMS — Constitution Index

This file is an **index only**. It does **not** define new principles. For any feature spec, plan, or implementation, **read and follow the linked sources** — they override this file if anything conflicts.

> **Top constraint:** Enterprise-grade security takes precedence over convenience. If a feature cannot be secured, it is deferred or redesigned. ([project-blueprint.md](../../project-blueprint.md) §3)

---

## Primary authority (read first)

| Source | Scope |
| :--- | :--- |
| [AGENTS.md](../../AGENTS.md) | Frontend index, product principles, doc map |
| [project-blueprint.md](../../project-blueprint.md) §3 | Security architecture — threat model, auth flow, RBAC, PII, audit, CSP/XSS |
| [project-blueprint.md](../../project-blueprint.md) §12 | Delivery model — Foundation + vertical slices ([ADR-004](../../docs/decisions/004-vertical-slice-delivery.md)) |

Backend daily guide: [../Backend/AGENTS_EMS.md](../../../Backend/AGENTS_EMS.md). Full ScriptRunner platform reference (on demand): [../Backend/AGENTS.md](../../../Backend/AGENTS.md). Team overrides: `AGENTS_ANNEX.md` in each repo if present.

---

## Shared rules — repo root `.cursor/rules/`

| Rule file | Focus |
| :--- | :--- |
| [ems-ask-before-acting.mdc](../../../.cursor/rules/ems-ask-before-acting.mdc) | Clarify ambiguous requests before coding (always on) |
| [ems-todo-discipline.mdc](../../../.cursor/rules/ems-todo-discipline.mdc) | Park skipped/deferred work in `TODO.md` |
| [ems-changelog.mdc](../../../.cursor/rules/ems-changelog.mdc) | Update `CHANGELOG.md` for meaningful changes |
| [ems-testing-discipline.mdc](../../../.cursor/rules/ems-testing-discipline.mdc) | Tests ship with behaviour changes |
| [ems-api-contract-discipline.mdc](../../../.cursor/rules/ems-api-contract-discipline.mdc) | Contract + RBAC sync on API changes |
| [ems-code-quality.mdc](../../../.cursor/rules/ems-code-quality.mdc) | Readability-first structure |

---

## Frontend — `Frontend/.cursor/rules/`

| Rule file | Focus |
| :--- | :--- |
| [frontend-security.mdc](../../.cursor/rules/frontend-security.mdc) | **Non-negotiable** — no secrets in browser, no auth bypass, XSS/CSP |
| [frontend-responsive.mdc](../../.cursor/rules/frontend-responsive.mdc) | Mobile, tablet, desktop required |
| [frontend-ems-core.mdc](../../.cursor/rules/frontend-ems-core.mdc) | Product model, read-before-coding index |
| [frontend-patterns.mdc](../../.cursor/rules/frontend-patterns.mdc) | React/TypeScript patterns |

---

## Backend — ScriptRunner work

| Source | Scope |
| :--- | :--- |
| [backend-security.mdc](../../../Backend/.cursor/rules/backend-security.mdc) | **Non-negotiable** — edit boundaries, handler order, write gate |
| [ems-portable-backend.mdc](../../../Backend/.cursor/rules/ems-portable-backend.mdc) | Platform adapter boundary (ADR-006) |
| [../Backend/AGENTS_EMS.md](../../../Backend/AGENTS_EMS.md) | Daily backend guide, testing pointer |

Dual-repo features: update [docs/api-contract.md](../../docs/api-contract.md) and [docs/rbac.md](../../docs/rbac.md) in the **same change** as new routes.

---

## Spec Kit workflow compliance

For `/speckit-specify` through `/speckit-implement`:

1. **Constitution** = this index → follow linked sources above.
2. **Domain language** = [CONTEXT.md](../../CONTEXT.md) and ADRs in [docs/decisions/](../../docs/decisions/) — do not invent HubSpot property names.
3. **Deferred work** = [TODO.md](../../TODO.md) (Frontend) and [../Backend/TODO.md](../../../Backend/TODO.md) — do not drop silently.
4. **Deploy** = Frontend via Git; Backend via SFTP (`scripts/` only unless user requests platform config).

Run `npm test` and `npm run lint` in both repos before finishing implementation tasks.

---

## Governance

- **Amendments:** Change the authoritative source files (AGENTS, rules, blueprint, ADRs) — then update this index only if links or scope change. Do not add standalone principles here.
- **Spec Kit features:** One feature folder under `specs/` at a time; programme-level roadmap stays in blueprint + `TODO.md`.
- **Compliance:** Plans must pass a Constitution Check against the linked sources, not against invented rules in this file.

**Version**: 1.1.0 | **Ratified**: 2026-07-03 | **Last Amended**: 2026-07-06
