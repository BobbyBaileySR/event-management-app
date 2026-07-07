# Slice 1.5 Tier A — sign-off checklist

Audit-defensible hardening after Slice 1 Live. Closes the security-review gaps for a **trusted internal admin team** — not SOC2/ISO (Tier B / vendor engagement).

Related: [../../TODO.md](../../TODO.md) · [../../../Backend/TODO.md](../../../Backend/TODO.md) · [../../docs/security-review-process.md](../../docs/security-review-process.md) · [../../docs/environments.md](../../docs/environments.md)

**Sign-off date:** 2026-07-07  
**Scope:** Steps A1–A9 complete. Tier B (B1–B9) remains planned.

---

## Tier A gate summary

| Step | Gate | Status | Evidence |
| :---: | :--- | :---: | :--- |
| A1 | Registrant eligibility on check-in confirm | ✅ | `RegistrantEligibility.ts`; `confirmCheckIn` rejects unregistered contacts; `Slice1Routes.test.ts` |
| A2 | PII read audit (`GET attendees`; scan summary) | ✅ | `writeReadAudit` on attendees list; metadata without email/name |
| A3 | Program ↔ event validation on slice routes | ✅ | `resolveCatalogEvent` on attendees, check-in, scan, capacity |
| A4 | Rate limit `GET attendees` | ✅ | `enforceRateLimit('attendees-list', …)` in `OnGetAttendees` |
| A5 | Field-level catalog PATCH audit (before/after) | ✅ | `buildProgramPatchAuditMetadata` / `buildEventPatchAuditMetadata` |
| A6 | CI security review on PRs | ✅ | PR templates; manual `/review-security`; branch protection; [security-review-process.md](../../docs/security-review-process.md) (Bugbot not approved — documented fallback) |
| A7 | Disable production source maps | ✅ | `vite.config.ts` — `build.sourcemap: false`; dev/test unchanged |
| A8 | Audit API + minimal viewer | ✅ | Backend `OnGetAuditRecent.ts`; Frontend `#/audit` (`AuditView`); admin-only RBAC |
| A9 | Tier A sign-off checklist | ✅ | This document |

---

## Deploy evidence

| Layer | UAT | Live |
| :--- | :---: | :---: |
| **Backend** (ScriptRunner SFTP) | Same scripts | Slice 1.5 handlers uploaded incl. `OnGetAuditRecent.ts`, eligibility, audit writes |
| **Frontend** (GitHub Pages) | PR #6 → `uat` | PR #7 `uat` → `main` (A7 + A8 on Live) |
| **Backend git** | — | PR #3 (A1–A6), PR #4 (A8) merged to `main` |
| **Frontend git** | PR #6 | PR #5 (A6), PR #7 (uat → main) |

---

## Automated test evidence

| Repo | Command | Result (2026-07-07) |
| :--- | :--- | :--- |
| Backend | `npm test` + `tsc --noEmit` | 162 tests, 15 suites — CI green on merge |
| Frontend | `npm test` + `npm run build` | 166 tests, 29 files — CI green on merge |

---

## Security review (A6)

Branch `slice-1.5-a1-a5-backend` reviewed with **`/review-security`** before merge:

> **Security review (A6):** No medium+ issues. Changes tighten audit RBAC (admin-only), add registrant eligibility on check-in confirm, program↔event validation on slice routes, attendees rate limiting, and PII-safe read audit metadata. RBAC enforced in router before handlers.

---

## Manual smoke (optional re-verify)

Run as **admin** against Live or UAT with `USE_MOCK_API: false` and real session:

| # | Check | Pass |
| :---: | :--- | :---: |
| 1 | Sign in with Google → session established | ☐ |
| 2 | Check-in confirm rejects contact not registered for Event (404 / no HubSpot write) | ☐ |
| 3 | `GET attendees` succeeds; audit row `attendees.list` appears (no PII in metadata) | ☐ |
| 4 | Rapid attendee list refresh hits rate limit (429) after threshold | ☐ |
| 5 | Catalog PATCH writes audit with `metadata.previous` / `metadata.next` | ☐ |
| 6 | **`#/audit`** loads paginated log for admin | ☐ |
| 7 | Viewer role cannot open **`#/audit`** (redirect / 403 from API) | ☐ |
| 8 | Production build has no `.map` files in `dist/assets/` | ☐ |

Ops fallback: `DumpAuditEntries.ts` in ScriptRunner for raw audit keys.

---

## Known exclusions (not Tier A)

| Item | Status | Notes |
| :--- | :--- | :--- |
| Walk-in form B5c (Slice 1) | Blocked | HubSpot team — **X-008** |
| Capacity live QA (004) | Blocked | HubSpot UAT access — **X-009** |
| Cursor Bugbot on GitHub | Not approved | A6 manual process in place |
| Tier B (retention, export, operator role, Cloudflare Access, pen test) | Planned | See TODO Tier B |

---

## Approvals

| Role | Name | Date | Signature |
| :--- | :--- | :--- | :--- |
| Engineering | | 2026-07-07 | |
| Product / Events | | | |
| InfoSec (optional) | | | |

---

## Changelog

| Date | Change |
| :--- | :--- |
| 2026-07-07 | Initial Tier A sign-off — A1–A9 complete; UAT merged to Live (Frontend PR #7) |
