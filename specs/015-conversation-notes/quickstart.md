# Quickstart: Live Event Conversation Notes

Manual and automated validation for **015-conversation-notes** — finding a checked-in attendee (US1), capturing a note (US2), correcting/removing one (US3), Lead sync (US4), and the cross-event expand (US5).

**Related**: [spec.md](./spec.md) · [plan.md](./plan.md) · [research.md](./research.md) · [data-model.md](./data-model.md) · [contracts/](./contracts/) · [ADR-019](../../docs/decisions/019-live-event-conversation-notes.md)

Builds on Check-in (`003-check-in`), the Attendee Detail modal (`010-attendee-detail-modal`), and Lead generation (`014-lead-generation`) — this quickstart does not re-derive any of those baselines.

---

## Sign-off overview

| Area | Gate | Notes |
| :--- | :---: | :--- |
| **Automated tests** | Required | §A |
| **US1 Find a checked-in attendee** | Required | §B1 |
| **US2 Capture a note** | Required | §B2 |
| **US3 Correct/remove a note (any admin)** | Required | §B3 — this app's first no-author-lock access property |
| **US4 Notes reach the Lead** | Required | §B4 |
| **US5 Cross-event expand** | Required | §B5 |
| **Operator security comfort checks** | Required before Live | §C — new PII-read surface, new any-admin access property, QR lookup must not write a check-in |

---

## Prerequisites

1. `003-check-in`, `010-attendee-detail-modal`, `014-lead-generation` already shipped and deployed.
2. **015 Backend** SFTP-deployed: `ConversationNoteStore.ts`, `OnGetAttendeeLookup.ts`, the four notes routes, `LeadAdapter.ts`'s extension.
3. **015 Frontend** deployed: `ConversationsView.tsx` + nav entry, `AttendeeDetailModal.tsx`'s Notes section.
4. Two admin test accounts (to prove the any-admin edit/delete property in §B3 needs a *different* admin than the note's author).
5. A test Event with at least two checked-in attendees.

---

## A. Automated tests

### A1. Backend

```bash
cd Backend
npm test -- --testPathPattern="ConversationNoteStore|OnGetAttendeeLookup|OnGetAttendeeNotes|OnPostAttendeeNote|OnPatchAttendeeNote|OnDeleteAttendeeNote|LeadAdapter"
npm run lint:fix
```

| Suite | Covers |
| :--- | :--- |
| `ConversationNoteStore.test.ts` (new) | Add; edit appends to `editHistory` without losing prior content; soft-delete hides without destroying; **any admin, not just the original author, can edit/delete** (explicit test with a second admin identity); `getUnsynced` returns only entries with `syncedToLeadAt: null` |
| `OnGetAttendeeLookup.test.ts` (new) | Resolves a valid JWT to the right contact; **never calls `OnCheckIn.ts`'s write path**; **produces no `checkin.scan` audit entry** — both asserted explicitly, not inferred |
| `OnGetAttendeeNotes.test.ts` + create/edit/delete suites (new) | RBAC; `attendee.notes.view`/`.create`/`.update`/`.delete` audit entries with no note content in metadata; `allEvents` expansion; soft-deleted notes excluded from normal reads |
| `LeadAdapter.test.ts` (extended, `014`) | Pushes only `syncedToLeadAt: null` entries as individual HubSpot Notes; marks them synced; a second generation does not resend already-synced notes; a note edited/deleted after sync is not reconciled with HubSpot |

### A2. Frontend

```bash
cd Frontend
npm test -- ConversationsView AttendeeDetailModal
npm run build
```

Covers: checked-in-only filtering; QR scan resolves to the right attendee with no check-in side effect; Notes section CRUD; an admin who isn't the note's author can still edit/delete it through the UI (not just the API); hostile-string guard on note content display.

---

## B. Manual QA (UAT or Live)

### B1. Find a checked-in attendee

1. Sign in as **admin**. Open the new Conversations screen for the test Event.
2. Confirm only checked-in attendees appear (compare against the full roster in Registered Attendees).
3. Scan a checked-in attendee's QR code.

**Expected**: the list is checked-in-only; the scan opens the same attendee's info without appearing as a new check-in event.
**Failure signal**: a not-yet-arrived registrant appears in the list, or the scan shows up as a check-in in Registered Attendees/Check-in.

### B2. Capture a note

1. Open an attendee's detail, add a note in the new Notes section.
2. Reopen the modal.

**Expected**: the note persists, timestamped, attributed to the admin who wrote it.
**Failure signal**: note lost on reopen, or missing author/timestamp.

### B3. Any admin can correct or remove a note — not just the author

1. As **admin A**, write a note.
2. Sign in as a **different admin B**. Edit that note's content.
3. As admin B, delete a different note originally written by admin A.
4. Check the note's edit history / audit trail.

**Expected**: admin B succeeds at both editing and deleting admin A's notes; the edit shows both the old and new content plus who made the change; the deleted note no longer appears in the normal view.
**Failure signal**: admin B is blocked from touching admin A's note (an accidental author-lock), or the prior content/editor identity isn't retrievable after an edit, or a deleted note is fully gone with no trace.

### B4. Notes reach the Lead, once each

1. Capture two notes for an attendee. Generate a Lead for them.
2. Open the Lead in HubSpot — confirm two separate Note entries, not one merged block.
3. Capture a third note. Regenerate the Lead.

**Expected**: step 2 shows two distinct Notes; step 3 adds only the third note — the first two are not duplicated.
**Failure signal**: notes merged into one entry, or a regeneration re-sends already-synced notes.

### B5. Cross-event expand

1. For an attendee with notes from two different events, view their detail normally (should show only the current event's notes), then toggle "show all events."

**Expected**: default view is current-event-only; expanded view shows both events' notes, distinguishable by event.
**Failure signal**: default view leaks other events' notes, or expanded view doesn't actually show more than the default.

---

## C. Operator security comfort checks

> **When to run:** After §A passes in CI and before Live sign-off.
> **Time:** Allow 45-60 minutes — this introduces a new PII-read surface (notes), a genuinely new access property (any admin, not author-locked), and a QR-adjacent lookup that must be proven not to double as a check-in.
> **Rule:** If any **Failure signal** below occurs, **stop** and do not deploy to Live until fixed and re-verified.

### C0. What you are proving (read once)

| Property | Plain English |
| :--- | :--- |
| **No new UI access granted** | Everything here stays behind the same admin-only gate as the rest of the app |
| **Scanning to find someone never checks them in** | The lookup is read-only, provably so — not just "probably fine because it's idempotent" |
| **Notes are traceable without leaking content** | Every view and every change leaves an audit row with no note text in it |
| **Correction never depends on one specific person being around** | Any admin can fix or remove any note — a deliberate, tested property, not an accident |
| **Deleted doesn't mean gone** | A removed note is hidden, not destroyed — recoverable if something needs investigating |

### C1. Before you start

| # | Item | Your value | How to confirm |
| :---: | :--- | :--- | :--- |
| 1 | **Environment** | ☐ UAT ☐ Live | Full URL. |
| 2 | **Two admin test accounts** | A: `<!-- FILL -->` B: `<!-- FILL -->` | Needed for §C7.2/§B3's any-admin proof. |
| 3 | **Backend deployed** | ☐ Yes | Confirm `ConversationNoteStore.ts`, `OnGetAttendeeLookup.ts`, the four notes routes, and `LeadAdapter.ts`'s extension were SFTP-uploaded. |

### C2-C6

Deploy sanity, authentication boundary, RBAC baseline, and PII display safety are established in the `003`/`010`/`014` baselines. Confirm those once against the currently deployed build; do not duplicate them here.

### C7. Feature-specific security checks

#### C7.1 QR lookup never writes a check-in

| Step | Action | Expected result | Failure signal — stop |
| :---: | :--- | :--- | :--- |
| C7.1.1 | Note an attendee's check-in timestamp in Registered Attendees. Use the Conversations screen's QR scan on them. Re-check that timestamp. | Unchanged — no new check-in event, no `checkin.scan` audit row. | Timestamp changes, or a `checkin.scan` row appears for this action. |

#### C7.2 Any admin can correct/remove any note

| Step | Action | Expected result | Failure signal — stop |
| :---: | :--- | :--- | :--- |
| C7.2.1 | Complete §B3 in full, with two genuinely different admin accounts. | Admin B succeeds editing/deleting admin A's notes; both actions are auditable with correct editor identity. | Admin B is blocked, or the audit trail doesn't show who actually made the change. |

#### C7.3 Notes audit trail leaks no content

| Step | Action | Expected result | Failure signal — stop |
| :---: | :--- | :--- | :--- |
| C7.3.1 | View, create, edit, and delete a note. Check `#/audit` for all four resulting rows. | Metadata shows ids/counts/editor identity only — never note text. | Note content anywhere in audit metadata. |

#### C7.4 Deleted notes are hidden, not destroyed

| Step | Action | Expected result | Failure signal — stop |
| :---: | :--- | :--- | :--- |
| C7.4.1 | Delete a note. Confirm it's gone from the normal view. (Ask engineering to confirm, via a direct store read if needed, that the entry still exists with `softDeleted` set.) | Hidden from UI; still present in storage, marked deleted. | Entry fully removed from storage with no trace. |

### C8. Automated test comfort (operator checklist)

| # | Question | Answer |
| :---: | :--- | :--- |
| C8.1 | Green CI (lint, test, build, npm audit)? | ☐ Yes — link: `<!-- FILL -->` |
| C8.2 | `/review-security` run, **specifically covering the QR-lookup/no-check-in-write proof and the any-admin access property**? | ☐ Yes — note: `<!-- FILL -->` |
| C8.3 | Test count stable or increased? | ☐ Yes |

### C9. When something fails

Stop Live deploy, record step ID + accounts/note ids + screenshot, message engineering, re-run only the failed section plus C2-C6.

**Escalate to InfoSec / defer Live immediately** if: the QR lookup is ever observed writing a check-in (C7.1.1), or note content leaks into audit metadata (C7.3.1).

### C10. Operator security sign-off

| Step ID | Check | Pass ☐ | Fail ☐ | Notes |
| :--- | :--- | :---: | :---: | :--- |
| C2-C6 | Baseline reconfirmed against `003`/`010`/`014` | | | |
| C7.1 | QR lookup never writes a check-in | | | |
| C7.2 | Any admin can correct/remove any note | | | |
| C7.3 | Notes audit trail leaks no content | | | |
| C7.4 | Deleted notes are hidden, not destroyed | | | |
| C8 | CI + security review confirmed | | | |

**Operator name:** _______________ **Date:** _______________ **Environment:** ☐ UAT ☐ Live

**Feature:** `015-conversation-notes` **Version / PR:** `<!-- FILL -->`
