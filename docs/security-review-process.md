# Security review process — Slice 1.5 Tier A (A6)

Manual PR security review for Adaptavist EMS when **Cursor Bugbot** is not approved on company GitHub repos.

Related: [CONTRIBUTING.md](CONTRIBUTING.md) · [rbac.md](rbac.md) · [api-contract.md](api-contract.md) · [../Backend/TODO.md](../../Backend/TODO.md) · [../Frontend/TODO.md](../TODO.md)

---

## What this replaces

**Slice 1.5 Tier A step A6** and **Foundation gate step 2** originally targeted automated PR review via [Cursor Bugbot](https://cursor.com/docs/bugbot). If Bugbot is not enabled, this process satisfies the same intent for an **internal admin** tool:

- Every change is reviewed for security before merge
- Dependency vulnerabilities are blocked in CI (already in place)
- There is a written checklist and audit trail on each PR

**Future upgrade:** If Bugbot is approved later, enable it on `event-management-backend` and `event-management-app`, add the `Cursor Bugbot` required check, and note the upgrade in CHANGELOG.

---

## Who does what

| Role | When | Action |
| :--- | :--- | :--- |
| **Author** (developer) | Before opening a PR | Local checks + Cursor security review (below) |
| **Author** | Opening PR | Fill in the PR template security checklist |
| **Reviewer** | Before approving | Confirm checklist, CI green, no unresolved security comments |
| **Merger** | Merge | CI passed + at least one approval (branch protection) |

---

## Author workflow (every PR)

### 1. Run automated checks locally

**Backend** (`Backend/`):

```bash
npm run lint
npm test
```

**Frontend** (`Frontend/`):

```bash
npm run lint
npm test
npm run build
```

CI runs the same gates on GitHub — fix failures locally first.

### 2. Run Cursor security review (before push)

In Cursor, on the branch you are about to PR:

1. Open the chat/agent panel.
2. Run **`/review-security`** on the repo you changed (Backend or Frontend path).
3. Fix any **High** or **Medium** findings, or document why they are accepted in the PR description.
4. Optionally run **`/review-bugbot`** for broader bug review (does not require GitHub Bugbot).

Paste a one-line summary in the PR, e.g. *"Security review: no issues"* or *"Security review: fixed X; Y accepted because …"*.

### 3. Open the PR

- Use the repo's **pull request template** (auto-filled on GitHub).
- Tick every applicable security checkbox.
- Link related TODO IDs (e.g. `BE-SLICE15-006`) if relevant.

### 4. Wait for CI

Both repos run on every PR:

- `npm audit --audit-level=high`
- Lint, typecheck (Backend), tests, build (Frontend)

Do not merge until checks are green.

---

## Reviewer workflow

1. Read the PR description and **Security checklist** section.
2. Confirm the author noted Cursor `/review-security` (or re-run it yourself on the PR branch if the change is high risk).
3. For API or auth changes, spot-check [rbac.md](rbac.md) and [api-contract.md](api-contract.md).
4. Approve only when checklist is complete and CI is green.

---

## EMS security checklist (reference)

Use this when reviewing; the PR template contains a shortened copy.

### Backend (`Backend/scripts/`)

- [ ] Handler order: session → RBAC → validate → rate limit → act → audit (mutations). Exception: `auth/exchange` — rate limit → JWT → act → audit.
- [ ] No HubSpot tokens or secrets in scripts; Parameters only for secrets.
- [ ] No full PII in logs or audit metadata (attendee email/name).
- [ ] RBAC deny-by-default; new routes in `RouteGuard.ts` + [rbac.md](rbac.md).
- [ ] HubSpot writes only where slice gates are met (schema, audit, validation, rate limit).
- [ ] Tests added or updated for security-sensitive paths.

### Frontend (`Frontend/src/`)

- [ ] No HubSpot credentials in frontend; all data via ScriptRunner.
- [ ] Dynamic text via JSX `{value}` only — no `dangerouslySetInnerHTML` / `innerHTML`.
- [ ] Production CSP not widened (`vite.config.ts`).
- [ ] Session token stays in memory only (`appState.tsx`).
- [ ] RBAC reflected in UI for new routes/views.

### Both

- [ ] [api-contract.md](api-contract.md) updated if APIs changed.
- [ ] [hubspot-schema.md](hubspot-schema.md) updated if HubSpot fields changed.
- [ ] [CHANGELOG.md](../CHANGELOG.md) or [Backend/CHANGELOG.md](../../Backend/CHANGELOG.md) updated.
- [ ] No secrets committed.

---

## GitHub setup (one-time, repo admin)

Do this once per repo: `event-management-backend`, `event-management-app`.

1. **Settings → Branches → Add branch protection rule** for `main`:
   - Require a pull request before merging
   - Require approvals: **1**
   - Require status checks to pass (select your CI job name, e.g. `test` / `build`)
2. Confirm **pull request template** exists at `.github/pull_request_template.md` (committed in this slice).
3. Optional: add a **CODEOWNERS** file later if you want automatic reviewer assignment.

---

## Evidence for Tier A sign-off (A9)

Record for InfoSec / leadership:

- [ ] PR template with security checklist live on both repos
- [ ] Branch protection: PR + 1 approval + CI required on `main`
- [ ] This document linked from [CONTRIBUTING.md](CONTRIBUTING.md)
- [ ] Bugbot exception documented (company plan — manual process approved for internal admin scope)
- [ ] CI includes `npm audit --audit-level=high` (Foundation step 3 — already enabled)

---

## Changelog

| Date | Change |
| :--- | :--- |
| 2026-07-07 | A6 fallback: manual PR security review process (Bugbot not approved) |
