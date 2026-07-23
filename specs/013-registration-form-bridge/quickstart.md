# Quickstart: Registration Form Bridge

Manual and automated validation for **013-registration-form-bridge** — multi-event registration slots' answer capture (US1/US2 depend on HubSpot-side slot build, `HS-001`/`013`/`014`, not EMS code), the registration-answer history store, and the Attendee Detail "Registration history" panel (US3).

**Related**: [spec.md](./spec.md) · [plan.md](./plan.md) · [research.md](./research.md) · [data-model.md](./data-model.md) · [contracts/](./contracts/) · [ADR-017](../../docs/decisions/017-registration-slots-and-answer-history.md)

Builds on the existing Attendee Detail modal (`010-attendee-detail-modal`, `admin`-only RBAC) and the existing `OnAttendeeRegistrationWebhook` (`011-attendee-index-perf`) — this quickstart does not re-derive either baseline, only what's new here.

---

## Sign-off overview

| Area | Gate | Notes |
| :--- | :---: | :--- |
| **Automated tests** | Required | §A — before release candidate |
| **US2 Answers captured + never overwritten** | Required | §B1 — can be validated against a manually-constructed webhook request; a fully live end-to-end test additionally needs the HubSpot-side slot build (`HS-001`) |
| **US3 Staff can see the history** | Required | §B2 |
| **Operator security comfort checks** | Required before Live | §C — first EMS surface rendering public-authored free text |
| **US1 Multi-event single submission** | Out of EMS's test scope | Purely a HubSpot-side mechanism (ten independent slot workflows) — nothing for EMS's own tests to exercise beyond "the webhook fires once per contact+event regardless of how many were selected," already true of the existing (011) contract |
| **US4 Bounded growth / slot reassignment** | Out of EMS's test scope | Slot assignment lives entirely in the HubSpot form's own configuration (ADR-017 gap review) — nothing in EMS tracks or needs to validate it |

---

## Prerequisites

1. `010-attendee-detail-modal` and `011-attendee-index-perf` already shipped and deployed.
2. **013 Backend** SFTP-deployed: new `RegistrationAnswerHistoryStore.ts`, extended `OnAttendeeRegistrationWebhook.ts`, extended `OnGetAttendeeDetail.ts`/`AttendeeDetailResponse`.
3. **013 Frontend** deployed: `RegistrationHistoryPanel.tsx` mounted in the Attendee Detail modal, `dataService.ts`/`normalizeApi.ts` mapping.
4. **Admin** account in `USER_ROLE_MAP` (inherited baseline); a **viewer** account for the RBAC spot-check reference in §C.
5. A test Event + a registered test Contact for that Event.
6. **For §B1**: since the HubSpot-side slot build (`HS-001`/`013`/`014`) may not be live yet, validate by sending a manually-constructed request to the existing webhook listener's URL (valid shared secret, allowlisted source IP — see `011`'s contract) with the new optional `answers` field included, matching [contracts/attendee-webhook-payload-delta.md](./contracts/attendee-webhook-payload-delta.md).

---

## A. Automated tests

### A1. Backend

```bash
cd Backend
npm test -- --testPathPattern="RegistrationAnswerHistoryStore|AttendeeRegistrationWebhook|AttendeeDetail"
npm run lint:fix
```

| Suite | Covers |
| :--- | :--- |
| `RegistrationAnswerHistoryStore.test.ts` (new) | `appendEntry` correctly appends without overwriting prior entries; read-verify-retry guard behavior under a simulated race |
| `OnAttendeeRegistrationWebhook.test.ts` (extended) | `answers` field present + parseable → appended to the store, audit metadata gains `answersCaptured`/`answerCount`; `answers` absent or unparseable → existing (011) roster-field processing completely unaffected |
| `OnGetAttendeeDetail`-adjacent test (extended) | Response includes `registrationAnswerHistory` (populated and empty-array cases); RBAC (`admin`-only) and rate-limit bucket (`attendees-list`) unchanged |

### A2. Frontend

```bash
cd Frontend
npm test -- RegistrationHistoryPanel AttendeeDetailModal
npm run build
```

| Suite | Covers |
| :--- | :--- |
| `RegistrationHistoryPanel.test.tsx` (new) | Renders history entries with submission time; empty state when none recorded; **hostile-string guard is a hard pass/fail gate** — a `<script>`/`<img onerror=…>` value in an answer renders as literal text, never executes or produces HTML nodes (spec FR-007) |
| `AttendeeDetailModal.test.tsx` (extended) | Panel mounts when `registrationAnswerHistory` is present on the response |

---

## B. Manual QA (UAT or Live)

### B1. Answers are captured and preserved across resubmissions

1. Send a manually-constructed webhook request (Prerequisite 6) for the test Contact + Event with an `answers` bundle, e.g. `{"What would you like to discuss?": "Renewal timeline"}`.
2. Confirm (via §B2 below, or a direct Record Storage read if you have engineering access) that an entry was appended.
3. Send a second request for the **same** Contact + Event with a **different** `answers` bundle.
4. Confirm **both** entries are now present — the second did not replace the first.

**Expected**: every submission adds a new entry; none are ever silently replaced.
**Failure signal**: the second request's answer is the only one present (overwrite, not append).

### B2. Staff can see the full history in Attendee Detail

1. Sign in as **admin**. Open the test Event's Attendee list, click the test Contact's row.
2. Open the "Registration history" panel.
3. Confirm every entry from §B1 is visible, each with its submission time.
4. Open the same panel for a Contact with **no** recorded registration answers.

**Expected**: step 3 shows both recorded entries; step 4 clearly shows nothing on file (not a blank/broken-looking panel).
**Failure signal**: an entry is missing, out of order in a misleading way, or the empty state looks like an error.

---

## C. Operator security comfort checks

> **When to run:** After §A automated tests pass in CI and before marking this feature signed off on Live (or UAT, if that is your release gate).
> **Time:** Allow 30-45 minutes — shorter than a typical new-endpoint slice, since this feature adds no new endpoint or role; the new ground to cover is entirely in §C7 below (public-authored-text rendering safety and audit-metadata hygiene). §C2-C6 reuse the existing `010`/`011` baselines.
> **Rule:** If any **Failure signal** below occurs, **stop**, note the step number, and do not deploy to Live until engineering fixes and you re-run the failed checks.

### C0. What you are proving (read once)

| Property | Plain English |
| :--- | :--- |
| **No new UI access granted** | The Registration history panel is inside the same admin-only Attendee Detail modal as before; nothing new is reachable by a viewer or an unauthenticated user |
| **No new write surface** | This feature only ever writes to EMS's own storage (never HubSpot) — the webhook it extends already existed and already had its own auth boundary (011), unchanged here |
| **Public text can't do anything except display as text** | This is the first EMS screen showing text typed by an anonymous member of the public — it must never be capable of executing as script or rendering as markup, no matter what's typed |
| **Traceability without leaking content** | The webhook's audit row gains a count of captured answers, never the answer text itself |
| **The data is actually preserved** | Resubmitting never erases a prior answer — the feature's entire point |

### C1. Before you start

| # | Item | Your value | How to confirm |
| :---: | :--- | :--- | :--- |
| 1 | **Environment** | ☐ UAT ☐ Live | Full URL you will use. |
| 2 | **Admin test account** | `@adaptavist.com` email: `<!-- FILL: admin email -->` | Listed as `admin` in `USER_ROLE_MAP`. |
| 3 | **Backend deployed** | ☐ Yes | Confirm `RegistrationAnswerHistoryStore.ts`, extended `OnAttendeeRegistrationWebhook.ts`, extended `OnGetAttendeeDetail.ts` were SFTP-uploaded after the merge being tested. |
| 4 | **Test Contact + Event** | Contact: `<!-- FILL -->` Event: `<!-- FILL -->` | Used for §B1/§B2 and the hostile-string check below. |
| 5 | **Webhook shared secret / allowlisted IP available for manual test requests** | ☐ Yes | Needed to exercise §B1/§C7 without waiting on the HubSpot-side slot build. |

### C2-C6

Deploy sanity, authentication boundary, RBAC (admin allowed / viewer denied on the Attendee list and Attendee Detail modal), and the webhook endpoint's own credential/rate-limit checks are established in the `010`/`011` sign-off baselines — this feature adds no new route, no new role, and no new endpoint. Confirm those checks once against the currently deployed build; do not duplicate them here.

### C7. Feature-specific security checks

#### C7.1 Public-authored text can never execute or render as markup

| Step | Action | Expected result | Failure signal — stop |
| :---: | :--- | :--- | :--- |
| C7.1.1 | Send a manually-constructed webhook request (C1.5) with an `answers` value containing `<script>alert(1)</script>` and another with `<img src=x onerror=alert(1)>`. | Request accepted and stored (this is a storage layer — it accepts arbitrary text, same as any other free-text field this system already stores). | N/A at this step — the check is in C7.1.2. |
| C7.1.2 | Open that Contact's Registration history panel as admin. | The literal characters `<script>alert(1)</script>` etc. are visible as plain text. No alert box, no bold/altered formatting, no broken layout. | Any script executes, any HTML renders, or the page breaks. |

#### C7.2 Absent answers never breaks existing registration processing

| Step | Action | Expected result | Failure signal — stop |
| :---: | :--- | :--- | :--- |
| C7.2.1 | Send a webhook request with **no** `answers` field (the ordinary shape from before this feature existed). | Processed exactly as it was before this feature — roster/index update succeeds, no error. | Any regression to plain registration-only webhook processing. |

#### C7.3 Audit metadata never contains answer content

| Step | Action | Expected result | Failure signal — stop |
| :---: | :--- | :--- | :--- |
| C7.3.1 | Send a webhook request with a real-looking `answers` value. Open **`#/audit`** as admin and find the new row. | Metadata shows `answersCaptured`/`answerCount` only — no answer text, no attendee email/name (matching this system's existing PII-in-audit convention). | The answer text (or attendee PII) appears anywhere in the audit row. |

#### C7.4 Resubmission never silently erases prior history

| Step | Action | Expected result | Failure signal — stop |
| :---: | :--- | :--- | :--- |
| C7.4.1 | Complete §B1 (two submissions, same Contact+Event, different answers). | Both entries visible in §B2. | Only the latest submission's answer is visible — silent data loss, the exact failure this feature exists to prevent. |

### C8. Automated test comfort (operator checklist)

| # | Question | Answer for this feature |
| :---: | :--- | :--- |
| C8.1 | Did the PR(s) for this feature have green CI (lint, test, build, npm audit)? | ☐ Yes — link: `<!-- FILL: PR URL -->` |
| C8.2 | Was `/review-security` run and summarised on the PR, **including a specific look at the new public-text rendering path** (not just the general pass)? | ☐ Yes — note: `<!-- FILL -->` |
| C8.3 | Test count stable or increased? | ☐ Yes |

### C9. When something fails

Same escalation path as prior slices: stop Live deploy, record the step ID + account/request details + screenshot, message engineering, re-run only the failed section plus a re-confirmation of the C2-C6 baseline after the fix.

**Escalate to InfoSec / defer Live** if: any script executes or HTML renders from a stored answer (C7.1.2), answer text or attendee PII appears in audit metadata (C7.3.1), or a resubmission is observed erasing prior history (C7.4.1).

### C10. Operator security sign-off

| Step ID | Check | Pass ☐ | Fail ☐ | Notes |
| :--- | :--- | :---: | :---: | :--- |
| C2-C6 | Baseline (deploy sanity, auth, RBAC, webhook credentials/rate-limit) reconfirmed against `010`/`011` | | | |
| C7.1 | Public-authored text never executes/renders as markup | | | |
| C7.2 | Absent `answers` never breaks existing registration processing | | | |
| C7.3 | Audit metadata never contains answer content or PII | | | |
| C7.4 | Resubmission never silently erases prior history | | | |
| C8 | CI + security review confirmed | | | |

**Operator name:** _______________ **Date:** _______________ **Environment:** ☐ UAT ☐ Live

**Feature:** `013-registration-form-bridge` **Version / PR:** `<!-- FILL -->`
