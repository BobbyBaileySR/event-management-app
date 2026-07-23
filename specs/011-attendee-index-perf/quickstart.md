# Quickstart: Attendee Index Performance Fix

Manual and automated validation for **011-attendee-index-perf** — fast attendee list (US1), write-through freshness (US2), registration webhook (US3), reconciliation sweep (US4).

**Related**: [spec.md](./spec.md) · [plan.md](./plan.md) · [research.md](./research.md) · [data-model.md](./data-model.md) · [contracts/attendee-webhook-contract.md](./contracts/attendee-webhook-contract.md) · [ADR-011](../../docs/decisions/011-attendee-index-freshness.md) · [ADR-012](../../docs/decisions/012-attendee-index-write-conflict-resolution.md)

Builds on the existing Slice 1 attendee list (`OnGetAttendees.ts`, `admin`-only RBAC) — this quickstart does not re-derive that baseline, it covers what's new here.

---

## Sign-off overview

| Area | Gate | Notes |
| :--- | :---: | :--- |
| **Automated tests** | Required | §A — before release candidate |
| **US1 Fast attendee list** | Required | §B1 — proves the timeout fix |
| **US2 Write-through freshness** | Required | §B2 |
| **US3 Registration webhook** | Required | §B3 — blocked on HubSpot Workflow-edit coordination for a fully live test; can be validated with a simulated request first |
| **US4 Reconciliation sweep** | Required | §B4 |
| **Operator security comfort checks** | Required before Live | §C — includes the first non-session-authenticated endpoint in this codebase |
| **Storage/read-path mechanics** | N/A — resolved by code inspection | [research.md](./research.md) R-001/R-002 (no live spike needed, pure Record Storage API surface) |

---

## Prerequisites

1. Slice 1 attendee list already shipped and deployed (`OnGetAttendees.ts`, `admin`-only RBAC via `Utils/Routes.ts`).
2. **011 Backend** SFTP-deployed: new `AttendeeIndexStore.ts`, rewired `HubSpotCustomObjectAdapter.ts`/`DispatchAudience.ts`, write-through in `confirmCheckIn`/`undoCheckIn`/`removeAttendee`, new `OnAttendeeRegistrationWebhook.ts` registered as its own Async HTTP Event Listener, `QueueProcessor.ts`'s reconciliation step, extended `deleteAllForEvent`.
3. New Parameters set: `ATTENDEE_WEBHOOK_SHARED_SECRET`, `ATTENDEE_WEBHOOK_ALLOWED_IPS`.
4. **Admin** account in `USER_ROLE_MAP` (inherited from the existing Slice 1 baseline); a **viewer** account for the RBAC spot-check in §C.
5. A test Program + Event with enough registered attendees to meaningfully exercise paging/search (ideally spanning more than one page at the default page size).
6. **For §B3**: either (a) the HubSpot registration Workflow's webhook step has been configured (see contracts/attendee-webhook-contract.md — coordination-dependent), or (b) a manually-constructed test request matching that contract, sent directly to the new listener's URL with a valid shared secret and an allowlisted source IP, to validate the endpoint's own behavior independent of the Workflow coordination.

---

## A. Automated tests

### A1. Backend

```bash
cd Backend
npm test -- --testPathPattern="AttendeeIndex|CustomObjectAdapter|DispatchAudience|DispatchFoundation|AttendeeRegistrationWebhook|Slice1Routes|EventFirstRoutes|EventTicketPurge|RegistrationCacheStore"
npm run lint:fix
```

| Suite | Covers |
| :--- | :--- |
| `AttendeeIndexStore.test.ts` (new) | Manifest add/remove; field-scoped write applies only when the incoming group's observed-at is `>=` what's stored; TTL derives from `event.end ?? event.start` + grace period, matching `EventTicketPurge.ts`'s existing convention |
| `CustomObjectAdapter.test.ts` (extended) | `listRegisteredAttendees` reads/searches/paginates via the index, not live HubSpot; `confirmCheckIn`/`undoCheckIn`/`removeAttendee` write-through fires correctly (checked-in fields only, roster fields untouched) |
| `DispatchAudience.test.ts` / `DispatchFoundation.test.ts` (extended) | Dispatch-filtered attendee listing reads via the index |
| `OnAttendeeRegistrationWebhook.test.ts` (new) | Valid shared secret + allowlisted IP → processed, index updated, audit entry written; bad secret or disallowed IP → rejected, no index write; rate limit enforced per source IP |
| `AttendeeIndexReconciliation.test.ts` (new) | Drifted entry corrected to match HubSpot; orphaned entry (contact no longer associated) removed; a run truncated by `deadlineMs` resumes cleanly on the next invocation |
| `AttendeeIndexReconciliationSource.test.ts` (new) | HubSpot association-label filtering, roster-field mapping, and 100-ID Contact batch-read chunking |
| `RegistrationCacheStore.test.ts` (extended) | Event-scoped archive purge removes the Attendee index manifest + entries alongside registration/ticket cache data |
| `Slice1Routes.test.ts` / `EventFirstRoutes.test.ts` (extended) | `GET attendees` request/response shape, RBAC (`admin`-only), and error codes byte-for-byte unchanged from before this feature |

---

## B. Manual QA (UAT or Live)

### B1. US1 — Attendee list loads without a long wait

1. Sign in as **admin**, open an Event's attendee list.
2. **Pass**: the first page of results loads perceptibly fast (SC-001 target: under 3 seconds) — no repeat of the previously-reported 18-21 second delay, regardless of roster size.
3. Search by name/company and page to later results.
4. **Pass**: search and paging remain fast — no cumulative slowdown, no re-fetch from HubSpot per keystroke/page.

### B2. US2 — Attendee list reflects in-app actions immediately

1. Check in a registered attendee. **Pass**: the attendee list shows them as checked in immediately, no reload needed.
2. Undo that check-in. **Pass**: reverts immediately.
3. Remove an attendee. **Pass**: they no longer appear in the list immediately.
4. **Pass** (regression guard): none of the above actions get silently reverted by a subsequent reconciliation sweep run — re-check the list a few minutes later (after at least one sweep interval) and confirm the state from steps 1-3 still holds (unless you deliberately changed something in HubSpot directly in the meantime).

### B3. US3 — New registrations appear without a blind spot

1. Complete a self-service registration for the test Event (or send a manually-constructed webhook request per Prerequisite 6 if the HubSpot Workflow step isn't configured yet).
2. **Pass**: the new registrant appears in the attendee list within a short window — not only after waiting for the next scheduled reconciliation.
3. Send a webhook request with a **wrong** shared secret or from a **non-allowlisted** source IP (a manual test, not via the real HubSpot Workflow).
4. **Pass**: the request is rejected and does **not** appear in the attendee list.

### B4. US4 — Attendee list self-corrects from missed updates

1. Manually edit an attendee's index entry to be incorrect (e.g. via a temporary ops script, mirroring `DumpAuditEntries.ts`'s pattern) so it no longer matches HubSpot's actual state, or manually remove a Contact's association in HubSpot without going through the app.
2. Wait for the next reconciliation sweep (or trigger `QueueProcessor` manually if available in your environment).
3. **Pass**: the drifted entry is corrected, or the orphaned entry is removed, without any manual index fix.

---

## C. Operator security comfort checks

> **When to run:** After §A automated tests pass in CI and before marking this slice signed off on Live (or UAT, if that is your release gate).
> **Time:** Allow 45-60 minutes — longer than a typical slice, because this introduces the first non-session-authenticated inbound endpoint in this codebase (§C7.3-C7.5 below are new; §C2-C6 mostly reuse the existing Slice 1 attendee-list baseline).
> **Rule:** If any **Failure signal** below occurs, **stop**, note the step number, and do not deploy to Live until engineering fixes and you re-run the failed checks.

### C0. What you are proving (read once)

| Property | Plain English |
| :--- | :--- |
| **No new UI access granted** | The attendee list is still behind the same admin-only gate as before; nothing about this feature is reachable by a viewer or an unauthenticated user through the app |
| **No new PII exposure** | The index stores the same fields already shown in the attendee list today — no new person-data field is introduced |
| **The new webhook endpoint can't be abused** | A request without the correct shared secret, or from outside the IP allowlist, is rejected and never touches attendee data |
| **Traceability** | Every registration processed via the webhook leaves an audit row without leaking attendee email/name into that row's metadata |
| **Fixed the actual bug** | The attendee list loads quickly regardless of roster size — the reason this slice exists |
| **Freshness is trustworthy** | Checked-in state doesn't silently revert after a reconciliation pass |

### C1. Before you start

| # | Item | Your value | How to confirm |
| :---: | :--- | :--- | :--- |
| 1 | **Environment** | ☐ UAT ☐ Live | Full URL you will use. |
| 2 | **Admin test account** | `@adaptavist.com` email: `<!-- FILL: admin email -->` | Listed as `admin` in `USER_ROLE_MAP`. |
| 3 | **Viewer test account** | `@adaptavist.com` email: `<!-- FILL: viewer email -->` | Listed as `viewer`, separate browser/profile. |
| 4 | **Frontend data path** | ☐ UAT ScriptRunner confirmed | EMS has no mock-data mode; confirm requests reach the intended environment. |
| 5 | **Backend deployed** | ☐ Yes | Confirm `AttendeeIndexStore.ts`, rewired adapter methods, `OnAttendeeRegistrationWebhook.ts`, `QueueProcessor.ts` reconciliation step were SFTP-uploaded after the merge being tested. |
| 6 | **Webhook Parameters set** | `ATTENDEE_WEBHOOK_SHARED_SECRET` / `ATTENDEE_WEBHOOK_ALLOWED_IPS` | Confirm both are set in ScriptRunner Connect Parameters for this environment before testing §C7.3-C7.5. |
| 7 | **Test Program + Event** | Program: `<!-- FILL -->` Event: `<!-- FILL -->` | Enough registered attendees to exercise paging (Prerequisite 5). |

### C2-C6

Deploy sanity, authentication boundary, RBAC (admin allowed / viewer denied on the attendee list), audit trail, and PII display safety for the attendee list itself are established in the Slice 1 sign-off baseline — this feature adds no new Frontend route and no new role. Confirm those checks once against the currently deployed build; do not duplicate them here.

### C7. Slice-specific security checks

#### C7.1 Attendee list still fast and still correct

| Step | Action | Expected result | Failure signal — stop |
| :---: | :--- | :--- | :--- |
| C7.1.1 | Complete §B1. | Fast load, correct data, matches HubSpot's actual roster. | Slow load (regression), or data mismatch vs. HubSpot. |

#### C7.2 Write-through doesn't get silently reverted

| Step | Action | Expected result | Failure signal — stop |
| :---: | :--- | :--- | :--- |
| C7.2.1 | Complete §B2, including its step 4 (re-check after a sweep interval). | Checked-in state from your own actions persists. | Checked-in state reverts after a reconciliation pass — this is exactly the failure mode ADR-012 exists to prevent. |

#### C7.3 Webhook endpoint rejects bad credentials

| Step | Action | Expected result | Failure signal — stop |
| :---: | :--- | :--- | :--- |
| C7.3.1 | Send a manually-constructed request to the webhook listener's URL with a **wrong** shared secret. | Rejected — no attendee data changes, no successful audit row. | Request is processed despite a wrong secret. |
| C7.3.2 | Send a request with the **correct** secret but from a source IP **not** on `ATTENDEE_WEBHOOK_ALLOWED_IPS`. | Rejected. | Request is processed from a disallowed IP. |

#### C7.4 Webhook endpoint is rate-limited

| Step | Action | Expected result | Failure signal — stop |
| :---: | :--- | :--- | :--- |
| C7.4.1 | Send repeated valid requests rapidly from the same source (exact threshold: ask engineering). | Eventually rate-limited; system recovers after waiting. | Unlimited requests processed with no throttling. |

#### C7.5 Webhook processing is audited without leaking PII

| Step | Action | Expected result | Failure signal — stop |
| :---: | :--- | :--- | :--- |
| C7.5.1 | Send one valid webhook request (or complete a real self-service registration, §B3). Open **`#/audit`** as admin. | A new row appears for the registration-webhook action. | No row appears for a successfully processed notification. |
| C7.5.2 | Inspect that row's metadata. | Contains only non-PII bookkeeping (e.g. event/contact ids, outcome) — no attendee email or name. | Attendee email or name appears in the audit row's metadata. |

#### C7.6 Reconciliation sweep corrects drift without manual help

| Step | Action | Expected result | Failure signal — stop |
| :---: | :--- | :--- | :--- |
| C7.6.1 | Complete §B4. | Drift corrected / orphan removed after the next sweep, no manual fix needed. | Drift persists indefinitely, or the sweep never runs. |

### C8. Automated test comfort (operator checklist)

| # | Question | Answer for this slice |
| :---: | :--- | :--- |
| C8.1 | Did the PR(s) for this slice have green CI (lint, test, build, npm audit)? | ☐ Yes — link: `<!-- FILL: PR URL -->` |
| C8.2 | Was `/review-security` run and summarised on the PR, **including a dedicated look at the new webhook endpoint specifically** (not just the general pass)? | ☐ Yes — note: `<!-- FILL -->` |
| C8.3 | Test count stable or increased? | ☐ Yes |

### C9. When something fails

Same escalation path as prior slices: stop Live deploy, record the step ID + account/request details + screenshot, message engineering, re-run only the failed section plus a re-confirmation of the C2-C6 baseline after the fix.

**Escalate to InfoSec / defer Live** if: the webhook endpoint processes a request with a bad secret or disallowed IP (C7.3), a webhook audit row contains attendee PII (C7.5.2), or write-through state is observed reverting after a reconciliation pass (C7.2).

### C10. Operator security sign-off

| Step ID | Check | Pass ☐ | Fail ☐ | Notes |
| :--- | :--- | :---: | :---: | :--- |
| (Slice 1 baseline) | Deploy/auth/RBAC/audit/PII display for the attendee list — reused, not re-run here | | | Confirm once per deployed build |
| C7.1 | Attendee list still fast and correct | | | |
| C7.2 | Write-through doesn't get silently reverted | | | |
| C7.3 | Webhook rejects bad credentials | | | |
| C7.4 | Webhook is rate-limited | | | |
| C7.5 | Webhook processing is audited without leaking PII | | | |
| C7.6 | Reconciliation sweep corrects drift | | | |
| C8 | CI + security review confirmed (including webhook-specific review) | | | |

**Operator name:** _______________ **Date:** _______________ **Environment:** ☐ UAT ☐ Live

**Slice / tier:** `011-attendee-index-perf` **Version / PR:** `<!-- FILL -->`
