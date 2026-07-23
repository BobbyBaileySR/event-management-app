# Quickstart: Audit Log Operator UX

Manual and automated validation for **009-audit-log-ux** — true paging (US1), server-side filters with Apply (US2), resource-label enrichment (US3).

**Related**: [spec.md](./spec.md) · [plan.md](./plan.md) · [research.md](./research.md) · [data-model.md](./data-model.md) · [contracts/audit-log-ux-delta.md](./contracts/audit-log-ux-delta.md) · [ADR-013](../../docs/decisions/013-audit-index-scope.md)

Builds on the audit log's existing baseline — shipped as **Slice 1.5 Tier A step A8** (`OnGetAuditRecent.ts`, `AuditView.tsx`, admin-only RBAC), signed off in [slice-1.5-tier-a/signoff-checklist.md](../slice-1.5-tier-a/signoff-checklist.md). This quickstart does not re-derive that baseline — it covers what's new here.

---

## Sign-off overview

| Area | Gate | Notes |
| :--- | :---: | :--- |
| **Automated tests** | Required | §A — before release candidate |
| **US1 True paging** | Required | §B1 — proves the timeout fix |
| **US2 Filters + Apply** | Required | §B2 |
| **US3 Resource labels** | Required for full Slice 009 sign-off — implementation pending | §B3; tracked by `BE-SLICE007-002` / `FE-SLICE007-002` |
| **Non-catalog resource types unaffected** | Required | §B4 — proves display for `session`/other resourceTypes is unchanged |
| **Operator security comfort checks** | Required before Live | §C |
| **Index mechanics spike** | N/A — resolved by code inspection, not a live spike | [research.md](./research.md) R-001 (no live HubSpot/ScriptRunner sandbox dependency, pure Record Storage API surface) |

---

## Prerequisites

1. Slice 1.5 Tier A audit baseline already shipped and deployed (`OnGetAuditRecent.ts`, `AuditView.tsx`).
2. **009 Backend** SFTP-deployed: extended `AuditStore.ts` (bucketed index), extended `Audit.ts` (filters + resourceLabel), extended `OnGetAuditRecent.ts` (query params).
3. **009 Frontend** deployed: `AuditView.tsx` filter controls + Apply button, `auditDisplay.ts` resourceLabel fallback.
4. **Admin** account in `USER_ROLE_MAP` (inherited from the existing baseline — not re-tested here); a **viewer** account for the one RBAC spot-check in §C.
5. A test workspace with **enough existing audit history** to meaningfully exercise paging — ideally spanning more than one hour-bucket (see research.md R-001) and more than one page at the default page size. If the workspace is too new/quiet to have this naturally, generate activity first (a handful of catalog edits, check-ins, or attendee-list loads) across more than one hour before testing US1.
6. At least one audit entry referencing a catalog Program or Event that **still exists** (for US3's resolved-label case) and, ideally, one referencing a Program/Event that has since been **deleted** (for US3's fallback case) — if none exists naturally, create a disposable test Event, perform an auditable action against it (e.g. a catalog PATCH), then hard-delete it in HubSpot before testing the fallback.

---

## A. Automated tests

### A1. Backend

```bash
cd Backend
npm test -- --testPathPattern="AuditStore|Audit|OnGetAuditRecent"
npm run lint:fix
```

| Suite | Covers |
| :--- | :--- |
| `AuditStore.test.ts` (extended) | Bucketed index write on `writeAudit`; index read walks buckets backward and stops once a page is filled; index entries share the parent entry's TTL; same-bucket concurrent-write behavior documented as an accepted risk (research.md R-001), not asserted as impossible |
| `Audit.test.ts` (extended) | `listAuditLog` filters (`action`/`actor`/`resourceType`/`resourceId`) individually and combined, including a zero-match case; `resourceLabel` resolved for `catalog_program`/`catalog_event` entries on the returned page only, `null` fallback for a deleted resource, field absent for other resource types (e.g. `session`) |
| `OnGetAuditRecent.test.ts` (extended) | New query params parsed and passed through correctly on both the general and per-event routes; 401/403 unchanged; malformed/unknown filter values behave as a zero-match result, not an error |

### A2. Frontend

```bash
cd Frontend
npm test -- AuditView auditDisplay dataService
npm run lint
```

| Area | Covers |
| :--- | :--- |
| `AuditView.test.tsx` (extended) | Filter controls only apply on explicit Apply action (not live-as-you-type); empty state on zero matches; resourceLabel renders as plain text; **hostile string in a resourceLabel renders as literal text, not HTML** (XSS guard, matching existing PII-display convention) |
| `auditDisplay.test.ts` (extended) | `formatAuditResource` prefers `resourceLabel` when present, falls back to the existing `resourceType`/`resourceId` join when absent or `null` |
| `dataService` (extended) | Filter options mapped through to query params; `resourceLabel` mapped through normalization |

---

## B. Manual QA (UAT or Live)

### B1. US1 — Audit log loads without a long wait

1. Sign in as **admin**, open **`#/audit`**.
2. **Pass**: the most recent page of entries loads perceptibly fast (SC-001 target: well under 3 seconds) — no repeat of the previously-reported 18-21 second delay, regardless of total audit history in the workspace.
3. Navigate to the next page.
4. **Pass**: the next page loads promptly as well — no cumulative slowdown from paging deeper into history.

### B2. US2 — Filter the audit log

1. On `#/audit`, select an **actor** filter matching a known staff member who has performed actions, then click **Apply**.
2. **Pass**: only entries from that actor are shown; entries update only after Apply is clicked, not as the dropdown selection changes.
3. Change the filter to a combination (e.g. actor **and** action) and click **Apply** again.
4. **Pass**: results update to match the new combined filter, replacing the previous result set.
5. Select a filter combination unlikely to match anything (e.g. an action that never occurred for that actor) and click **Apply**.
6. **Pass**: a clear "no matching entries" empty state is shown — not an error message.
7. Repeat steps 1-2 on the **per-Event** audit view (`#/events/{id}/audit` or equivalent), if reachable in the UI.
8. **Pass**: filtering behaves identically, scoped to that Event's entries.

### B3. US3 — Resource labels

1. Find (or create, per Prerequisite 6) an audit entry referencing a catalog Program or Event that still exists.
2. **Pass**: the Resource column shows that Program/Event's **name**, not a raw id.
3. Find (or create, per Prerequisite 6) an audit entry referencing a catalog resource that has since been deleted.
4. **Pass**: the Resource column shows a readable "no longer available"-style label — not a raw id, and the page does not error or fail to load.

### B4. Non-catalog resource types are unaffected (regression guard)

1. Find an audit entry with `resourceType: session` (e.g. an `auth.exchange`/`auth.logout` row) or another non-catalog resource type.
2. **Pass**: displays exactly as it did before this feature — no attempted (and failed) label resolution, no visual change.

---

## C. Operator security comfort checks

> **When to run:** After §A automated tests pass in CI and before marking this slice signed off on Live (or UAT, if that is your release gate).
> **Time:** Allow 20-30 minutes (shorter than a new-surface slice — this reuses the existing audit baseline's RBAC/auth/PII-display plumbing; only §C7 below is new).
> **Rule:** If any **Failure signal** below occurs, **stop**, note the step number, and do not deploy to Live until engineering fixes and you re-run the failed checks.

### C0. What you are proving (read once)

| Property | Plain English |
| :--- | :--- |
| **No new access granted** | Filters and resource labels are still behind the same admin-only gate as the audit log always was |
| **No new PII exposure** | A resource label is just a Program/Event name — the same class of data already visible in WorkingEventPicker / Programs & Events, not attendee PII |
| **Safe display** | Resource labels render as plain text, not executable HTML, even if a name contains unusual characters |
| **Filters don't leak across scope** | The per-Event audit view's filters never surface another Event's entries |
| **Fixed the actual bug** | The log loads quickly regardless of history size — the reason this slice exists |

### C1. Before you start

| # | Item | Your value | How to confirm |
| :---: | :--- | :--- | :--- |
| 1 | **Environment** | ☐ UAT ☐ Live | Full URL you will use. |
| 2 | **Admin test account** | `@adaptavist.com` email: `<!-- FILL: admin email -->` | Listed as `admin` in `USER_ROLE_MAP`. |
| 3 | **Viewer test account** | `@adaptavist.com` email: `<!-- FILL: viewer email -->` | Listed as `viewer`, separate browser/profile. |
| 4 | **Frontend data path** | ☐ UAT ScriptRunner confirmed | EMS has no mock-data mode; confirm requests reach the intended environment. |
| 5 | **Backend deployed** | ☐ Yes | Confirm extended `AuditStore.ts`/`Audit.ts`/`OnGetAuditRecent.ts` were SFTP-uploaded after the merge being tested. |
| 6 | **Audit history present** | ☐ Yes | Per Prerequisite 5 — enough entries across more than one hour-bucket to meaningfully exercise paging. |
| 7 | **Existing + deleted catalog resource** | Existing: `<!-- FILL -->` Deleted: `<!-- FILL -->` | Per Prerequisite 6 — needed for US3's two branches. |

### C2-C6

Deploy sanity, authentication boundary, RBAC (admin allowed / viewer denied on `#/audit`), audit trail, and PII display safety for the audit log itself are established in [slice-1.5-tier-a/signoff-checklist.md](../slice-1.5-tier-a/signoff-checklist.md) (rows A8, C4a.3, C4b.2, C5.3, C5.4) — this feature adds no new route and no new role. Confirm those checks once against the currently deployed build; do not duplicate them here.

### C7. Slice-specific security checks

#### C7.1 Filters don't grant new access

| Step | Action | Expected result | Failure signal — stop |
| :---: | :--- | :--- | :--- |
| C7.1.1 | Sign in as **viewer**. Attempt to reach `#/audit` directly (deep link), with or without filter query params appended manually to the URL. | Same denial as before this feature (redirect / hidden nav / no audit rows) — filters do not bypass the existing admin gate. | Viewer sees any audit rows, filtered or not. |

#### C7.2 Resource labels carry no new PII

| Step | Action | Expected result | Failure signal — stop |
| :---: | :--- | :--- | :--- |
| C7.2.1 | Complete §B3. Inspect the resolved resource label shown. | Shows only a Program/Event **name** — no attendee email, contact name, or other PII beyond what a resource label (a catalog object's own name) implies. | A resource label surfaces attendee PII or any field beyond the resource's own name. |

#### C7.3 Resource labels render safely

| Step | Action | Expected result | Failure signal — stop |
| :---: | :--- | :--- | :--- |
| C7.3.1 | Automated (engineering runs before merge): Frontend test asserts a hostile string (`<script>`, `<img onerror=…>`) as a resourceLabel renders as literal text. | CI green. | CI failing — do not sign off. |
| C7.3.2 | Manual spot-check (optional): if feasible, temporarily name a disposable test Event with an angle-bracket string (e.g. `Test <b>Event</b>`), trigger an auditable action against it, view it in `#/audit`. | Angle brackets show literally — no bold formatting, no alert popup. | Script alert, bold rendering, or broken layout. |

#### C7.4 Per-Event audit scope isolation

| Step | Action | Expected result | Failure signal — stop |
| :---: | :--- | :--- | :--- |
| C7.4.1 | Open the per-Event audit view for one Event; apply a filter that would match entries belonging to a **different** Event (e.g. a common `action` value). | Only the current Event's own entries appear, regardless of filter — never another Event's rows. | Another Event's entries appear in a scoped view. |

### C8. Automated test comfort (operator checklist)

| # | Question | Answer for this slice |
| :---: | :--- | :--- |
| C8.1 | Did the PR(s) for this slice have green CI (lint, test, build, npm audit)? | ☐ Yes — link: `<!-- FILL: PR URL -->` |
| C8.2 | Was `/review-security` run and summarised on the PR? | ☐ Yes — note: `<!-- FILL -->` |
| C8.3 | Test count stable or increased? | ☐ Yes |

### C9. When something fails

Same escalation path as prior slices: stop Live deploy, record the step ID + account + screenshot, message engineering, re-run only the failed section plus a re-confirmation of the C2-C6 baseline after the fix.

**Escalate to InfoSec / defer Live** if: a viewer can reach filtered or unfiltered audit rows (C7.1), a resource label exposes attendee PII (C7.2), or a filter leaks another Event's entries into a scoped view (C7.4).

### C10. Operator security sign-off

| Step ID | Check | Pass ☐ | Fail ☐ | Notes |
| :--- | :--- | :---: | :---: | :--- |
| (slice-1.5-tier-a C4a.3/C4b.2/C5.3/C5.4) | Baseline auth/RBAC/audit trail/PII display — reused, not re-run here | | | Confirm once per deployed build |
| C7.1 | Filters don't grant new access | | | |
| C7.2 | Resource labels carry no new PII | | | |
| C7.3 | Resource labels render safely | | | |
| C7.4 | Per-Event scope isolation | | | |
| C8 | CI + security review confirmed | | | |

**Operator name:** _______________ **Date:** _______________ **Environment:** ☐ UAT ☐ Live

**Slice / tier:** `009-audit-log-ux` **Version / PR:** `<!-- FILL -->`
