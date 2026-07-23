# Quickstart: QR Ticket Emails

Manual and automated validation for **008-qr-ticket-emails** — send tickets through the ordinary Compose flow (US1), consent-driven fallback to manual check-in (US2), HubSpot Campaign reporting rollup (US3).

**Related**: [spec.md](./spec.md) · [plan.md](./plan.md) · [research.md](./research.md) · [data-model.md](./data-model.md) · [contracts/qr-ticket-dispatch-delta.md](./contracts/qr-ticket-dispatch-delta.md) · [ADR-010](../../docs/decisions/010-qr-ticket-email-single-send.md)

Builds on [005-email-dispatch quickstart](../005-email-dispatch/quickstart.md) (Compose/Scheduled/Dispatch-log flows, admin RBAC, rate limiting) and [003-check-in quickstart](../003-check-in/quickstart.md) (scan/check-in path).

---

## Sign-off overview

| Area | Gate | Notes |
| :--- | :---: | :--- |
| **Automated tests** | Required | §A — before release candidate |
| **US1 Send + scan a ticket** | Required | §B1 — mock then live UAT |
| **US2 Consent fallback** | Required | §B2 — live HubSpot only (needs a real unsubscribed test Contact) |
| **US3 Campaign reporting** | Optional (P3) | §B3 — depends on HubSpot Team having Campaign-associated the test template |
| **Non-ticket dispatch unchanged** | Required | §B4 — proves FR-005 |
| **Operator security comfort checks** | Required before Live | §C |
| **Implementation-level spikes** | Required before build | [research.md](./research.md) R-001/R-002/R-003 |
| **Real send shape + token name verification** | Required before Live | §B1a — first live exercise of `BE-EMAIL-SEND-001`'s send wiring |

---

## Prerequisites

1. **005-email-dispatch** shipped and deployed (Compose/Scheduled/Dispatch-log, `QueueProcessor`, `DispatchStore`).
2. **003-check-in** shipped (scan/check-in path a ticket is checked in through).
3. **008 Backend** SFTP-deployed: ticket-mint utility, extended `RegistrationCacheStore`, extended `SingleSendAdapter`, Files adapter, QR-detection helper.
4. Frontend: no new UI required for MVP (US1) — Dispatch log's `ticketsEnabled` indicator is the only Frontend-visible change.
5. **Admin** account in `USER_ROLE_MAP`; non-admin for RBAC checks (inherited from 005 — not re-tested here).
6. HubSpot: one QR-tagged template (contains the check-in QR placeholder, created with the correct type/category for single-send eligibility — see `research.md` R-002) and one ordinary template with **no** placeholder, both `PUBLISHED`.
7. Catalog: Program + Event with at least 2 Registered attendees you can receive mail for (real inboxes or aliases you control).
8. One Registered attendee **unsubscribed** from HubSpot marketing communications, for §B2.
9. `EMAIL_SEND_ENABLED` on for live UAT (per 005's existing guard). **2026-07-16: this is the first time turning it on exercises a real, non-mock send** — `BE-EMAIL-SEND-001` shipped the real `HubSpotSingleSendAdapter`, but its request/response shape was never live-verified (see §B1a below before running B1).
10. **Scheduled Trigger configured** — one trigger on script `QueueProcessor` (default export, no payload, every 15 minutes). See `Backend/README.md`'s "Scheduled Trigger" section. Without it: scheduled dispatches never send, and the ticket-cleanup sweep in §C7.8 never runs. If this was already set up for 005-email-dispatch, nothing further to configure — the same trigger now also runs the ticket-purge sweep.

---

## A. Automated tests

### A1. Backend

```bash
cd Backend
npm test -- --testPathPattern="CheckInTicket|QrTicket|DispatchQueue|RegistrationCache|CustomObjectAdapter|EventTicketPurge|HubSpotApiClient|SingleSendAdapter|EmailSendGuard"
npm run lint:fix
```

| Suite | Covers |
| :--- | :--- |
| `CheckInTicket.test.ts` (new) | Mint produces a JWT verifiable by the existing `verifyCheckInJwt`; mint-if-missing never rotates an existing ticket |
| `RegistrationCacheStore.test.ts` (extended) | `checkInTicket`/`checkInTicketImageFileId` round-trip; `deleteAllForEvent` also calls Files delete for each stored file id; `deleteRegistrationCache` deletes the file when unregistering (C7.6); `clearCheckInState` preserves ticket fields across an undo (C7.7) |
| `CustomObjectAdapter.test.ts` (extended) | `removeAttendee` deletes the ticket's uploaded file (C7.6); `undoCheckIn` does **not** delete it (C7.7) |
| `EventTicketPurge.test.ts` (new) | Events past their end/start date get purged after the 24h grace period; future/recent events don't; archived/status untouched (C7.8); deadline-exceeded stops cleanly and resumes; re-run is a no-op |
| `DispatchQueue.test.ts` (extended) | `ticketsEnabled` jobs pass `contactProperties` to `singleSendAdapter.sendToContact`; `ticketsEnabled: false` jobs behave byte-for-byte like today (FR-005 regression guard); 15-minute timeout budget stops mid-job and resumes cleanly |
| `EmailDispatchRoutes.test.ts` (extended) | `POST dispatches` detects and stamps `ticketsEnabled`; `GET dispatches`/`GET dispatches/{id}` surface it |
| `HubSpotApiClient.test.ts` / `SingleSendAdapter.test.ts` (new) | Real `singleSend` request shape + error handling (B1a) |
| `EmailSendGuard.test.ts` (extended) | `EMAIL_SEND_ENABLED` still blocks the real adapter even though it's wired in (B1a safety net) |

### A2. Frontend

```bash
cd Frontend
npm test -- EmailDispatch dataService
npm run lint
```

| Area | Covers |
| :--- | :--- |
| `EmailDispatchView` / Dispatch log | New `ticketsEnabled` indicator renders as plain text/state, hostile values guard (`NFR-002`) |
| `dataService` | `ticketsEnabled` field mapped through normalization |

---

## B. Manual QA (UAT)

### B1a. Before running B1 for the first time — real send + token verification (`BE-EMAIL-SEND-001`)

B1 below is the **first live exercise** of the real HubSpot send path — everything up to now ran against a mock adapter. Two things were implemented to best-available knowledge, not live-verified, and either one failing shows up as B1 not passing:

1. **Request/response shape.** `HubSpotApiClient.singleSend` calls `POST /marketing/v4/email/single-send` with a body shaped `{ emailId, message: { to }, contactProperties }` — this is a documented-best-guess against HubSpot's public v4 contract; the original ADR-010 spike confirmed the *mechanism* (the `subcategory: single_send_api` requirement, inline `contactProperties` resolving a template merge tag) but never captured the literal request/response JSON. If B1 step 3 (**Send now**) fails or throws, check the error message — `FetchHubSpotApiClient.singleSend` surfaces the HubSpot response status + body text, which should show whether the request shape itself was rejected (e.g. an unexpected field name) versus a template-configuration issue (e.g. missing `subcategory`).
2. **Personalization token name.** The QR-tagged template's `<img src="{{ contact.ems_checkin_qr_url }}">` module must reference the **exact** token `ems_checkin_qr_url` (the shipped `CHECKIN_QR_CONTACT_PROPERTY` constant). The token that was actually live-tested during ADR-010's original spike was a *different* placeholder string, `ems_qr_test_url` — the production name was never itself run through a live send. If B1 step 5 (**Pass**: each recipient's email shows a distinct QR image) instead shows a broken/missing image for everyone, re-check the template's HTML module uses `ems_checkin_qr_url` verbatim, and confirm with HubSpot whether the property needs to be pre-registered in the portal's Contact property schema (untested either way) before the merge tag will resolve.

Record the outcome of both checks (pass, or what had to be corrected) in the §C10 sign-off notes — this is the evidence that `BE-EMAIL-SEND-001`'s "not yet live-verified" flag can be cleared.

> **2026-07-21 status: both checks now live-verified, with corrections.** (1) Request shape: the real send initially failed with a `408` — root cause was unrelated to the send request shape itself (an oversized synchronous template lookup elsewhere in dispatch creation timing out ScriptRunner's sync-listener ceiling; see `Backend/CHANGELOG.md`). Once fixed, the real single-send request succeeded. (2) Token name: `ems_checkin_qr_url` resolved correctly once the template's single-send eligibility check itself was corrected — the real template's `type`/`subcategory` values (`MARKETING_SINGLE_SEND_API` / `marketing_single_send_api`) didn't match what this doc and ADR-010 had assumed (`AUTOMATED_EMAIL` / `single_send_api`); see `research.md` R-002's correction. With both fixed, a real "Send now" delivered a working, scannable QR code. **Not yet exercised**: the full B1 script below (2 recipients, distinct-image check, scan-to-correct-recipient, re-scan dedup, second-dispatch ticket reuse) — only a single-recipient send was run.

### B1. US1 — Send a QR ticket email through the ordinary Compose flow

1. Sign in as **admin**, select Program + Event, open **Email**.
2. Compose a dispatch exactly as in 005's quickstart — enter a name, pick the **QR-tagged** template by name (no different UI from an ordinary send), audience = 2 known-good Registered attendees.
3. **Send now**.
4. **Dispatch log** → open the new entry → **Pass**: indicator shows this dispatch **generated tickets** (FR-006).
5. Check both recipients' inboxes → **Pass**: each has a **visually distinct** QR code (not the same image).
6. Open **Check-in** → scan recipient A's code → **Pass**: resolves to recipient A's own Contact summary, not recipient B's (SC-002). Confirm check-in.
7. Scan recipient A's code again → **Pass**: "already checked in", no duplicate write.
8. Send a **second** dispatch to the same two recipients (same template) → **Pass**: the emails still contain a working code, but re-scan the codes from step 3 (not the new email) → still works — proves "mint if missing" reused the original ticket rather than issuing a new one (FR-002/FR-004).

### B2. US2 — Consent-driven fallback to manual check-in

> **2026-07-16 status:** T034 (partial-send-failure regression test) and T035 (code-read confirming no check-in path gates on `checkInTicket`) are done — see `Backend/CHANGELOG.md` and `tasks.md`. This section itself requires a **real** unsubscribed test Contact and a live HubSpot send — it needs a human with live UAT/HubSpot access to actually run; not executable from an implementation session. **Still pending T036.**

1. Confirm the designated test Contact (prerequisite 8) is unsubscribed from HubSpot marketing communications.
2. Send a QR ticket dispatch to an audience that includes them.
3. **Pass**: they do **not** receive the ticket email (check HubSpot's send activity for that Contact — should show suppressed/not-sent, not a bounce).
4. In **Check-in**, use **name search** to find that Contact and check them in normally.
5. **Pass**: check-in succeeds through the manual path — an undelivered ticket never blocked entry (FR-008).

### B3. US3 — Campaign reporting rollup (optional, P3)

> **2026-07-16 status (T037):** No channel to ask the HubSpot Team whether the QR-tagged test template already has a Campaign association was available in this implementation session — per step 5 below, this section is **marked skipped**, a documented, non-blocking outcome. US1 sign-off does not depend on it. Revisit whenever someone with a HubSpot Team contact confirms an association exists.

1. Confirm with the HubSpot Team that the QR-tagged test template is already associated to a HubSpot Marketing Campaign (one-time HubSpot-side setup — EMS does not create this association).
2. Send a ticket dispatch using that template.
3. Open the Campaign's own Analytics tab in HubSpot.
4. **Pass**: the send appears in the Campaign's reporting.
5. Skip this section entirely if no Campaign association exists yet — **Pass** for US1 does not depend on this.

### B4. Non-ticket dispatch is unchanged (regression guard for FR-005)

1. Compose and send a dispatch using the **ordinary** (non-QR-tagged) template from the prerequisites.
2. **Pass**: behaves identically to 005's existing quickstart §B1 — no QR code in the email, `ticketsEnabled` shows **false** in the Dispatch log.

---

## C. Operator security comfort checks

> **When to run:** After §A automated tests pass in CI and before marking this slice signed off on Live (or UAT, if that is your release gate).
> **Time:** Allow 30–45 minutes for a first run (shorter than a full new-surface slice — this reuses 005's Compose/RBAC/audit plumbing; only the QR-specific checks in C7 are new).
> **Rule:** If any **Failure signal** below occurs, **stop**, note the step number, and do not deploy to Live until engineering fixes and you re-run the failed checks.

### C0. What you are proving (read once)

| Property | Plain English |
| :--- | :--- |
| **No signing key in the browser** | Ticket minting happens entirely server-side; the browser never sees the private key |
| **Recipient isolation** | A ticket code always identifies the *correct* person for the *correct* Event — never someone else's |
| **Consent is honored** | An unsubscribed attendee doesn't get a ticket email, but can still be checked in manually |
| **No new PII written to HubSpot** | The QR image URL is never saved as a permanent property on the Contact record |
| **Traceability** | Minting a new ticket leaves an audit row without leaking email/name into it |
| **Safe display** | The Dispatch log's ticket indicator renders as plain text, not executable HTML |
| **No orphaned HubSpot Files** | A ticket's QR image is deleted when the attendee is removed or ~24h after the Event finishes — not just when someone remembers to archive |

### C1. Before you start

| # | Item | Your value | How to confirm |
| :---: | :--- | :--- | :--- |
| 1 | **Environment** | ☐ UAT ☐ Live | Full URL you will use. |
| 2 | **Admin test account** | `@adaptavist.com` email: `<!-- FILL: admin email -->` | Listed as `admin` in `USER_ROLE_MAP`. |
| 3 | **Frontend data path** | ☐ UAT ScriptRunner confirmed | EMS has no mock-data mode; confirm requests reach the intended environment. |
| 4 | **Backend deployed** | ☐ Yes | Confirm the ticket-mint + Files-adapter + extended `SingleSendAdapter` changes were SFTP-uploaded after the merge being tested. |
| 5 | **Test Program + Event** | Program: `<!-- FILL -->` Event: `<!-- FILL -->` | Non-production Event on UAT if possible. |
| 6 | **Two recipient test Contacts** | `<!-- FILL: recipient A email -->` / `<!-- FILL: recipient B email -->` | Inboxes you can actually check — needed for B1's cross-recipient isolation proof. |
| 7 | **Unsubscribed test Contact** | `<!-- FILL: contact name/id -->` | Registered for the test Event **and** unsubscribed from HubSpot marketing — needed for B2/C7.2. |
| 8 | **QR-tagged template** | `<!-- FILL: template name -->` | Contains the QR placeholder; created with the correct type/category for single-send eligibility (research.md R-002). |
| 9 | **Scheduled Trigger** | ☐ Configured | One trigger, script `QueueProcessor`, default export, no payload, every 15 minutes — see `Backend/README.md`. Needed for §B2 (scheduled dispatch would need it too, inherited from 005) and §C7.8 (time-based ticket purge). |

### C2–C6

Deploy sanity, authentication boundary, RBAC, audit trail, and PII display safety are **unchanged from 005-email-dispatch's own §C** — this feature adds no new route, no new role, and no new PII field to the Compose/Scheduled/Log surfaces. Run 005's §C2–§C6 once for the deployed build under test; do not duplicate them here.

### C7. Slice-specific security checks

#### C7.1 Ticket recipient isolation

| Step | Action | Expected result | Failure signal — stop |
| :---: | :--- | :--- | :--- |
| C7.1.1 | Complete §B1 steps 1–6 (two recipients, two distinct codes). | Recipient A's code, when scanned, shows recipient A's name/company/email/account manager. | Recipient A's code resolves to recipient B (or any other Contact). |
| C7.1.2 | Attempt to scan recipient A's code against a **different** Event (open Check-in for a second test Event, if one exists, and scan the same code). | Rejected — Event-id claim mismatch, no check-in. | Code from Event 1 checks someone in for Event 2. |

#### C7.2 Consent honored + manual fallback works

| Step | Action | Expected result | Failure signal — stop |
| :---: | :--- | :--- | :--- |
| C7.2.1 | Complete §B2. | Unsubscribed Contact receives no ticket email; is checkable via name search. | Unsubscribed Contact receives the email anyway (consent violation), **or** cannot be checked in manually (entry blocked). |

#### C7.3 No durable PII write to the Contact record

| Step | Action | Expected result | Failure signal — stop |
| :---: | :--- | :--- | :--- |
| C7.3.1 | Before sending, note the test recipient's HubSpot Contact record properties (or ask engineering to pull them). Send a ticket dispatch to them. Re-check the Contact record afterward. | No new permanent property (e.g. a QR URL) was added to the Contact record. | A new property containing the QR image URL, ticket, or JWT now exists on the Contact record. |

#### C7.4 Ticket dies with the Event

| Step | Action | Expected result | Failure signal — stop |
| :---: | :--- | :--- | :--- |
| C7.4.1 | On a **disposable** test Event (not one with real attendees), send a ticket, then archive the Event in EMS. | Ask engineering to confirm the Record Storage cache row and the HubSpot Files upload for that recipient are both gone. | Either the ticket data or the uploaded QR image survives archive — orphaned data/HubSpot clutter. |

#### C7.5 Audit trail for ticket minting

| Step | Action | Expected result | Failure signal — stop |
| :---: | :--- | :--- | :--- |
| C7.5.1 | Send a ticket dispatch to a recipient who has **never** received one for that Event before. Open `#/audit`. | A `checkin.ticket.mint` row appears with `eventId`/`contactId` only — **no** email or name in metadata. | No audit row, or row contains recipient email/name. |
| C7.5.2 | Send a **second** dispatch reusing the same recipient + Event. | **No new** `checkin.ticket.mint` row (ticket was reused, not reminted). | A second mint row appears for the same recipient + Event (ticket was wrongly rotated). |

#### C7.6 Ticket dies when the attendee is removed (no Event archive needed)

| Step | Action | Expected result | Failure signal — stop |
| :---: | :--- | :--- | :--- |
| C7.6.1 | On a **disposable** test Event, send a ticket to a test recipient, then remove that attendee from the Event roster (Attendees → Remove — not archiving the whole Event). | Ask engineering to confirm the Record Storage cache row **and** the HubSpot Files upload for that recipient are both gone. | Either the ticket data or the uploaded QR image survives removal — orphaned file in HubSpot. |

#### C7.7 Undoing a check-in preserves the ticket (does not delete it)

| Step | Action | Expected result | Failure signal — stop |
| :---: | :--- | :--- | :--- |
| C7.7.1 | Check in a ticketed recipient via QR scan, then **undo their check-in** from the Check-in view (they remain registered). | Ask engineering to confirm the ticket/QR file still exists afterward. A follow-up ticket send to the same recipient reuses the **same** code — no new file created. | The ticket/file is deleted on undo, or a follow-up send mints a brand-new code for someone who's still registered (wasted HubSpot Files upload). |

#### C7.8 Ticket dies ~24h after the Event finishes, with no archive action

| Step | Action | Expected result | Failure signal — stop |
| :---: | :--- | :--- | :--- |
| C7.8.1 | On a **disposable** test Event with at least one ticketed recipient, edit the Event so its end (or start, if no end) date is more than 24 hours in the past. **Do not archive it.** Wait ~15 minutes for the Scheduled Trigger to run (prerequisite 10), or ask engineering to invoke `QueueProcessor` manually. | The ticket cache row + QR file for that recipient are gone. The Event **itself remains not archived** — still visible/active in the catalog. | Ticket/file still present after 15+ minutes (Scheduled Trigger not configured, or the sweep didn't run), **or** the Event was auto-archived (should never happen — this sweep must never touch `archived`/`status`). |

### C8. Automated test comfort (operator checklist)

| # | Question | Answer for this slice |
| :---: | :--- | :--- |
| C8.1 | Did the PR(s) for this slice have green CI (lint, test, build, npm audit)? | ☐ Yes — link: `<!-- FILL: PR URL -->` |
| C8.2 | Was `/review-security` run and summarised on the PR? | ☐ Yes — note: `<!-- FILL -->` |
| C8.3 | Test count stable or increased? | ☐ Yes |

### C9. When something fails

Same escalation path as 005: stop Live deploy, record the step ID + account + Program/Event + screenshot, message engineering, re-run only the failed section plus 005's §C2 after the fix.

**Escalate to InfoSec / defer Live** if: a code resolves to the wrong recipient (C7.1), consent is bypassed (C7.2), a durable PII property appears on a Contact (C7.3), or audit metadata contains email/name (C7.5).

### C10. Operator security sign-off

| Step ID | Check | Pass ☐ | Fail ☐ | Notes |
| :--- | :--- | :---: | :---: | :--- |
| (005 §C2–C6) | Deploy/auth/RBAC/audit/PII — reused, not re-run here | ☐ | ☐ | Not re-confirmed this session — still needs its own run |
| B1a | Real send shape + `ems_checkin_qr_url` token resolve correctly (`BE-EMAIL-SEND-001` first live exercise) | ☑ | ☐ | **2026-07-21**: confirmed via a real single-recipient "Send now" after two corrections (see B1a note above and `Backend/CHANGELOG.md`) — request shape and token both resolved, QR delivered and scannable |
| B1 (full script) | 2-recipient distinct-image, scan-to-correct-recipient, re-scan dedup, ticket reuse across a 2nd dispatch | ☐ | ☐ | **Not yet run** — only a single-recipient send has been exercised |
| C7.1 | Ticket recipient isolation | ☐ | ☐ | Needs the 2-recipient B1 script above to actually prove this |
| C7.2 | Consent honored + manual fallback | ☐ | ☐ | Needs a real unsubscribed test Contact (prerequisite 8) |
| C7.3 | No durable PII write | ☐ | ☐ | |
| C7.4 | Ticket dies with the Event (archive) | ☐ | ☐ | |
| C7.5 | Audit trail for minting | ☐ | ☐ | |
| C7.6 | Ticket dies when attendee is removed | ☐ | ☐ | |
| C7.7 | Undo check-in preserves the ticket | ☐ | ☐ | |
| C7.8 | Ticket dies ~24h after Event finishes (no archive) | ☐ | ☐ | |
| C8 | CI + security review confirmed | ☐ | ☐ | |

**Operator name:** _______________ **Date:** _______________ **Environment:** ☐ UAT ☐ Live

**Slice / tier:** `008-qr-ticket-emails` **Version / PR:** `<!-- FILL -->`
