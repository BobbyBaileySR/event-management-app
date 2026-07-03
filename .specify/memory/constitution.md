<!--
Sync Impact Report
- Version change: template placeholders → 1.0.0
- Principles: replaced generic Spec Kit placeholders with EMS governance index (no new rules invented)
- Added: Authority map, Frontend rules index, Backend boundary, Spec workflow pointers
- Removed: Generic principle placeholders
- Templates: plan/spec/tasks templates unchanged (Constitution Check reads this index at plan time)
- Follow-up: none
-->

# Adaptavist EMS — Constitution Index

This file is an **index only**. It does **not** define new principles. For any feature spec, plan, or implementation, **read and follow the linked sources** — they override this file if anything conflicts.

> **Top constraint:** Enterprise-grade security takes precedence over convenience. If a feature cannot be secured, it is deferred or redesigned. ([project-blueprint.md](../../project-blueprint.md) §3)

---

## Primary authority (read first)

| Source | Scope |
| :--- | :--- |
| [AGENTS.md](../../AGENTS.md) | Frontend conventions, routing, config, security checklist, agent workflow |
| [project-blueprint.md](../../project-blueprint.md) §3 | Security architecture — threat model, auth flow, RBAC, PII, audit, CSP/XSS |
| [project-blueprint.md](../../project-blueprint.md) §12 | Delivery model — Foundation + vertical slices ([ADR-004](../../docs/decisions/004-vertical-slice-delivery.md)) |

Backend platform reference (when touching ScriptRunner): [../Backend/AGENTS.md](../../../Backend/AGENTS.md). Team overrides: `AGENTS_ANNEX.md` in each repo if present.

---

## Frontend — `.cursor/rules/` (always-on guardrails)

All rules under [.cursor/rules/](../../.cursor/rules/) apply to Frontend work. **Do not duplicate** their text here.

| Rule file | Focus |
| :--- | :--- |
| [frontend-security.mdc](../../.cursor/rules/frontend-security.mdc) | **Non-negotiable** — no secrets in browser, no auth bypass, XSS/CSP, HubSpot via ScriptRunner only, brand tokens |
| [ems-testing-discipline.mdc](../../.cursor/rules/ems-testing-discipline.mdc) | Tests ship with behaviour changes; deferrals parked in `TODO.md` |
| [frontend-responsive.mdc](../../.cursor/rules/frontend-responsive.mdc) | Mobile, tablet, desktop required for all UI |
| [frontend-ems-core.mdc](../../.cursor/rules/frontend-ems-core.mdc) | Read-before-coding doc list, event-centric product model |
| [frontend-patterns.mdc](../../.cursor/rules/frontend-patterns.mdc) | React/TypeScript patterns |
| [ems-ask-before-acting.mdc](../../.cursor/rules/ems-ask-before-acting.mdc) | Clarify ambiguous requests before coding |
| [ems-todo-discipline.mdc](../../.cursor/rules/ems-todo-discipline.mdc) | Park skipped/deferred work in `TODO.md` |
| [ems-changelog.mdc](../../.cursor/rules/ems-changelog.mdc) | Update `CHANGELOG.md` for meaningful changes |
| [ems-code-quality.mdc](../../.cursor/rules/ems-code-quality.mdc) | Readability-first structure |

---

## Backend — ScriptRunner work

When a feature adds or changes Backend scripts or tests:

| Source | Scope |
| :--- | :--- |
| [backend-security.mdc](../../../Backend/.cursor/rules/backend-security.mdc) | **Non-negotiable** — edit only `scripts/` and `node/`; handler order; security-governed write gate per slice; JWT/check-in rules; no HubSpot tokens in frontend |
| [../Backend/AGENTS.md](../../../Backend/AGENTS.md) | ScriptRunner platform, Managed API first, testing in `node/tests/` |

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

**Version**: 1.0.0 | **Ratified**: 2026-07-03 | **Last Amended**: 2026-07-03
