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

## Operator security comfort checks (manual smoke)

**Format:** Pre-dates the standard §C template. Equivalent checks are listed below; **future slices** must use the full **[slice-operator-security-qa-template.md](../../docs/slice-operator-security-qa-template.md)** in `quickstart.md` §C (see `.cursor/rules/ems-slice-operator-security-qa.mdc`).

**Run as:** **admin** on UAT or Live through the intended ScriptRunner environment · separate browser/profile for viewer checks · test working Event selected. EMS has no mock-data mode.

| Step ID | Check | Pass ☐ | Failure — stop Live deploy |
| :---: | :--- | :---: | :--- |
| C3.2 | Sign in with Google (`@adaptavist.com` admin) → session established | | Cannot sign in or non-staff gets session |
| C7.1.1 | Check-in confirm **rejects** contact **not** registered for Event | | Unregistered contact checked in / HubSpot write |
| C5.3 | Open Attendees → refresh **`#/audit`** → row `attendees.list` for your action | | No audit row after list load |
| C5.4 | Inspect that row’s metadata — **no** attendee email or full name | | PII in audit metadata |
| C7.2.1 | Rapid attendee list refresh → **429** after threshold | | Unlimited list pulls with no limit |
| C5.3 | Catalog PATCH one field → audit row with `metadata.previous` / `metadata.next` | | PATCH with no audit or missing before/after |
| C4a.3 | **`#/audit`** loads paginated log for **admin** | | Admin cannot open audit |
| C4b.2 | **Viewer** cannot open **`#/audit`** (redirect / 403) | | Viewer sees audit rows |
| C2.4 | Production `dist/assets/` has **no** `.map` files (engineering confirms post-build) | | Public source maps |

Ops fallback: `DumpAuditEntries.ts` in ScriptRunner for raw audit keys if UI is unavailable.

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
