## Summary

<!-- What changed and why (1–3 sentences) -->

## Security review (A6 — required)

<!-- Paste result of Cursor `/review-security` on this branch, e.g. "No issues" or "Fixed X; see commits" -->

- [ ] I ran **`/review-security`** in Cursor on this branch before opening the PR
- [ ] No HubSpot credentials in frontend; all data via ScriptRunner
- [ ] Dynamic content rendered with JSX `{value}` only — no `dangerouslySetInnerHTML` / `innerHTML`
- [ ] Production CSP not widened in `vite.config.ts`
- [ ] RBAC / route gating updated for new views ([rbac.md](docs/rbac.md), [ui-routes.md](docs/ui-routes.md))
- [ ] [api-contract.md](docs/api-contract.md) updated if API client changed
- [ ] `npm run lint`, `npm test`, and `npm run build` pass locally
- [ ] [CHANGELOG.md](CHANGELOG.md) updated

Full process: [docs/security-review-process.md](docs/security-review-process.md)

## Test plan

<!-- How you verified the change -->
