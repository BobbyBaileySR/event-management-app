# Quickstart: HubSpot Lead Generation

Manual and automated validation for **014-lead-generation** — single-attendee generation (US1), no-duplicate/no-clobber updates (US2), bulk generation (US3), and the optional cross-event history expansion (US4).

**Related**: [spec.md](./spec.md) · [plan.md](./plan.md) · [research.md](./research.md) · [data-model.md](./data-model.md) · [contracts/](./contracts/) · [ADR-018](../../docs/decisions/018-hubspot-lead-generation.md)

Builds on the existing Attendee Detail modal (`010-attendee-detail-modal`) and registration-answer history (`013-registration-form-bridge`) — this quickstart does not re-derive either baseline.

---

## Sign-off overview

| Area | Gate | Notes |
| :--- | :---: | :--- |
| **Automated tests** | Required | §A |
| **US1 Single-attendee generation with content** | Required | §B1 |
| **US2 No duplicates, no clobbering non-EMS Leads** | Required | §B2 — this is the feature's most important correctness property |
| **US3 Bulk generation** | Required | §B3 |
| **US4 Expanded cross-event history** | Required | §B4 |
| **Operator security comfort checks** | Required before Live | §C — first EMS write creating a brand-new HubSpot CRM record |
| **HubSpot-side confirmations** | Blocking for live testing | `HS-015`/`016`/`017` — code can be built/unit-tested against a mocked adapter before these land, but §B/§C need them for a real end-to-end pass |

---

## Prerequisites

1. `010-attendee-detail-modal` and `013-registration-form-bridge` already shipped and deployed.
2. **014 Backend** SFTP-deployed: `LeadAdapter.ts`, `OnPostAttendeeLead.ts`, `OnPostAttendeeLeadBatch.ts`, `Utils/Routes.ts` entries.
3. **014 Frontend** deployed: Attendee Detail modal's "Generate Lead" action, Attendee list's bulk action.
4. `HS-015` (scopes), `HS-016` (association type ID), `HS-017` (lead type/label values) confirmed and set in config/Parameters for the environment under test.
5. A test Event with: one registered attendee **with** a recorded registration answer, one **without** one, and (for §B2) one Contact that already has a Lead created **outside** this feature (e.g. manually, in HubSpot directly, with no `ems_lead_interest_summary` property).

---

## A. Automated tests

### A1. Backend

```bash
cd Backend
npm test -- --testPathPattern="LeadAdapter|OnPostAttendeeLead"
npm run lint:fix
```

| Suite | Covers |
| :--- | :--- |
| `LeadAdapter.test.ts` (new) | Create path (no existing Lead); update-via-Note path (existing EMS-marked Lead); provenance-mismatch path (existing Lead without the marker → left untouched, new one created); fixed `hs_lead_type`/`hs_lead_label`/`associationTypeId` applied from config regardless of interest content; `ems_lead_interest_summary` set only on first creation, never on update |
| `OnPostAttendeeLead.test.ts` (new) | RBAC (`admin` only); no-recorded-interest attendee still gets a Lead; `includeFullHistory: true` triggers the extra audited read; `lead.generate` audit metadata contains no interest text or PII |
| `OnPostAttendeeLeadBatch.test.ts` (new) | RBAC; `batch_confirmation_required` at/above threshold without `batchConfirmed: true`; every `contactId` gets exactly one result entry, none skipped; mixed batch (create/update/created_separate cases together) |

### A2. Frontend

```bash
cd Frontend
npm test -- AttendeeDetailModal
npm run build
```

Covers: Generate Lead action renders and calls `dataService`; success/failure toast; expanded-history checkbox present and passed through; bulk action's confirmation dialog appears at the configured threshold.

---

## B. Manual QA (UAT or Live)

### B1. Single-attendee generation carries real content

1. Sign in as **admin**. Open the Attendee Detail modal for the attendee **with** a recorded registration answer (Prerequisite 5).
2. Click **Generate Lead**.
3. Open the resulting Lead in HubSpot (via the returned `leadId` / a "view in HubSpot" link if built).

**Expected**: the Lead exists, `ems_lead_interest_summary` contains that attendee's registration answer, and a Note with the same content is also present on the Lead.
**Failure signal**: Lead created with no content, or content missing from either the property or the Note.

### B2. No duplicates; non-EMS Leads are never touched

1. Generate a Lead (§B1) for an attendee, note the `leadId`.
2. Generate again for the **same** attendee, for a **different** event they're also registered for.
3. Confirm only one Lead exists for that Contact, and it now has **two** Notes (one per event) — the original property value is unchanged.
4. Separately: generate a Lead for the Contact with a pre-existing, non-EMS Lead (Prerequisite 5).

**Expected**: step 3 shows one Lead, growing Note history, stable property. Step 4 shows the pre-existing Lead completely unchanged, and a **new**, separate Lead created for that same Contact.
**Failure signal**: a second Lead appears in step 3 (duplicate), or the pre-existing Lead in step 4 is modified in any way (property, association, or otherwise) — this is the single most important thing to verify in this entire feature.

### B3. Bulk generation covers everyone, skips no one

1. Select several attendees for the test Event, including the one with no recorded interest (Prerequisite 5), and trigger bulk **Generate Leads**.
2. If the selection is at/above the configured threshold, confirm the size-warning dialog appears and must be confirmed before proceeding.
3. Review the per-attendee results.

**Expected**: every selected attendee has an entry in the results, including the one with no recorded interest (Lead created, empty summary) — none silently omitted.
**Failure signal**: any selected attendee missing from the results, or silently skipped without appearing as `failed`.

### B4. Expanded cross-event history

1. Using an attendee with recorded answers across more than one event, generate a Lead with the "include full history" option enabled.
2. Open **`#/audit`** as admin.

**Expected**: the Lead's content (property or Note, per B1) reflects more than just the current event; a new `attendee.registration_history.view_all` audit row appears alongside the `lead.generate` row.
**Failure signal**: the expanded content doesn't actually include other events' answers, or no separate audited-read row appears for the expanded read.

---

## C. Operator security comfort checks

> **When to run:** After §A automated tests pass in CI and before marking this feature signed off on Live (or UAT, if that is your release gate).
> **Time:** Allow 45-60 minutes — longer than a typical extension-only feature, because this is the first EMS write that creates a brand-new HubSpot CRM record, and because the provenance check (§C7.1 below) is the single most safety-critical thing to verify before this goes anywhere near real HubSpot data.
> **Rule:** If any **Failure signal** below occurs, **stop**, note the step number, and do not deploy to Live until engineering fixes and you re-run the failed checks.

### C0. What you are proving (read once)

| Property | Plain English |
| :--- | :--- |
| **No new UI access granted** | Generate Lead lives inside the same admin-only Attendee Detail modal and Attendee list as before |
| **EMS never touches a Lead it didn't create** | The provenance check is the core safety property of this entire feature — get this wrong and EMS could silently corrupt a salesperson's own CRM work |
| **No duplicates pile up** | The same attendee, generated for repeatedly, always resolves to one Lead (or a deliberate second one only in the non-EMS-Lead case) |
| **Traceability without leaking content** | Every generation leaves an audit row with outcome/counts, never the interest text itself |
| **The size warning actually gates** | A large bulk batch can't proceed past the confirmation threshold without an explicit confirm |

### C1. Before you start

| # | Item | Your value | How to confirm |
| :---: | :--- | :--- | :--- |
| 1 | **Environment** | ☐ UAT ☐ Live | Full URL you will use. |
| 2 | **Admin test account** | `@adaptavist.com` email: `<!-- FILL: admin email -->` | Listed as `admin` in `USER_ROLE_MAP`. |
| 3 | **HubSpot confirmations** | ☐ `HS-015` ☐ `HS-016` ☐ `HS-017` all closed for this environment | Without these, Lead creation will fail against real HubSpot even with correct code. |
| 4 | **Test Contact with a pre-existing, non-EMS Lead** | Contact: `<!-- FILL -->` | Created manually in HubSpot directly, with no `ems_lead_interest_summary` property — needed for §C7.1/§B2 step 4. |
| 5 | **Backend deployed** | ☐ Yes | Confirm `LeadAdapter.ts`, `OnPostAttendeeLead.ts`, `OnPostAttendeeLeadBatch.ts` were SFTP-uploaded after the merge being tested. |

### C2-C6

Deploy sanity, authentication boundary, RBAC (admin allowed / viewer denied), and PII display safety are established in the `010`/`013` baselines — this feature adds no new role and no new rendering of free text beyond what `013` already established a safe pattern for (the Lead's summary content is EMS's own already-validated registration-answer data, not fresh untrusted input at this point). Confirm those once against the currently deployed build; do not duplicate them here.

### C7. Feature-specific security checks

#### C7.1 EMS never modifies a Lead it didn't create

| Step | Action | Expected result | Failure signal — stop |
| :---: | :--- | :--- | :--- |
| C7.1.1 | Complete §B2 step 4 (generate for the Contact with a pre-existing non-EMS Lead, C1.4). Before generating, record the pre-existing Lead's exact property values and association state. | After generating, the pre-existing Lead's properties and associations are **byte-for-byte identical** to before. A new, separate Lead exists for the same Contact. | Any change at all to the pre-existing Lead — a modified property, a new association, anything. Escalate immediately; do not deploy. |

#### C7.2 No duplicate Leads accumulate

| Step | Action | Expected result | Failure signal — stop |
| :---: | :--- | :--- | :--- |
| C7.2.1 | Complete §B2 steps 1-3 (generate twice for the same Contact, two different events). | Exactly one EMS-created Lead exists for that Contact throughout. | A second EMS-created Lead appears. |

#### C7.3 Bulk never silently skips an attendee

| Step | Action | Expected result | Failure signal — stop |
| :---: | :--- | :--- | :--- |
| C7.3.1 | Complete §B3, including the no-recorded-interest attendee. | Every selected attendee has a result entry — created, updated, created_separate, or failed. | Any selected attendee simply absent from the results with no explanation. |

#### C7.4 Large-batch confirmation actually gates the request

| Step | Action | Expected result | Failure signal — stop |
| :---: | :--- | :--- | :--- |
| C7.4.1 | Attempt bulk generation at/above the configured threshold **without** confirming. | Request rejected (`400 batch_confirmation_required`) — no Leads created, no Notes logged. | Any Lead or Note created despite the missing confirmation. |

#### C7.5 Audit trail exists without leaking interest content

| Step | Action | Expected result | Failure signal — stop |
| :---: | :--- | :--- | :--- |
| C7.5.1 | After §B1, open **`#/audit`** as admin and find the new row. | `lead.generate` row present with `eventId`/`contactId`/`outcome`/`includeFullHistory` metadata — no interest text, no other PII. | Interest content or attendee PII visible in the audit row's metadata. |

### C8. Automated test comfort (operator checklist)

| # | Question | Answer for this feature |
| :---: | :--- | :--- |
| C8.1 | Did the PR(s) for this feature have green CI (lint, test, build, npm audit)? | ☐ Yes — link: `<!-- FILL: PR URL -->` |
| C8.2 | Was `/review-security` run and summarised on the PR, **including a specific look at the provenance check and the new HubSpot write path**? | ☐ Yes — note: `<!-- FILL -->` |
| C8.3 | Test count stable or increased? | ☐ Yes |

### C9. When something fails

Same escalation path as prior slices: stop Live deploy, record the step ID + Contact/Lead ids + screenshot, message engineering, re-run only the failed section plus a re-confirmation of the C2-C6 baseline after the fix.

**Escalate to InfoSec / defer Live immediately** if: a pre-existing non-EMS Lead is modified in any way (C7.1.1) — this is the feature's core safety guarantee — or interest content/PII appears in audit metadata (C7.5.1).

### C10. Operator security sign-off

| Step ID | Check | Pass ☐ | Fail ☐ | Notes |
| :--- | :--- | :---: | :---: | :--- |
| C2-C6 | Baseline (deploy sanity, auth, RBAC, PII display) reconfirmed against `010`/`013` | | | |
| C7.1 | EMS never modifies a Lead it didn't create | | | |
| C7.2 | No duplicate Leads accumulate | | | |
| C7.3 | Bulk never silently skips an attendee | | | |
| C7.4 | Large-batch confirmation actually gates the request | | | |
| C7.5 | Audit trail exists without leaking interest content | | | |
| C8 | CI + security review confirmed | | | |

**Operator name:** _______________ **Date:** _______________ **Environment:** ☐ UAT ☐ Live

**Feature:** `014-lead-generation` **Version / PR:** `<!-- FILL -->`
