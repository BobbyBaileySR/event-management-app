# Data Model: Registration Form Bridge

## Registration answer history entry

One entry per submission (initial registration or amendment) that included at least one follow-up answer for a given Contact + Event.

| Field | Type | Notes |
| :--- | :--- | :--- |
| `answers` | `Record<string, string \| string[]>` | The parsed answer bundle for this slot's questions at submission time — question label as key, answer as value; `string[]` for multi-select (checkbox-style) questions, `string` for free text. Stored verbatim, never validated/interpreted server-side beyond JSON parsing. |
| `source` | `'registration' \| 'amendment'` | `registration` for the first entry recorded for this Contact+Event; `amendment` for every subsequent one. Informational only — does not gate any behavior. |
| `observedAt` | ISO 8601 string | When the underlying HubSpot form submission happened (per the webhook payload), not when EMS received/processed it. |
| `slot` | number (1–10) | Which registration slot the submission came through — useful for tracing which form section produced this entry; not used for any lookup (lookups are always by `{eventId, contactId}`). |

## Storage shape (Record Storage)

**Key**: `ems-regform-answers-{eventId}--{contactId}` — one key per Contact+Event pair, mirroring `AttendeeIndexStore`'s existing `ems-attidx-{eventId}--{contactId}` naming convention (`011-attendee-index-perf`).

**Value**: `{ entries: RegistrationAnswerHistoryEntry[] }` — an array, appended to, never overwritten in place. Ordered by `observedAt` (append order matches submission order in practice, but readers should not assume it — sort by `observedAt` if a specific order is required for display).

**Write path** (`RegistrationAnswerHistoryStore.appendEntry`):

1. Read the current value for the key (or treat as `{ entries: [] }` if the key doesn't exist yet).
2. Append the new entry to a local copy of the array.
3. Write the updated array back.
4. Read the key again; confirm the new entry is present at the expected position.
5. If not (another writer raced this one), retry from step 1 — bounded to a small number of attempts (e.g. 3), per ADR-017 decision #3. This is a best-effort mitigation, not true atomicity — Record Storage has no compare-and-swap (`Backend/AGENTS.md` § Record Storage, "No Atomic Operations").

**Retention**: Indefinite — **not** included in `RegistrationCacheStore.deleteAllForEvent`'s archive-purge call. See research.md R-002 (flagged for user confirmation).

## API surface deltas

### `GET events/{evId}/attendees/{contactId}` (extended — see `contracts/get-attendee-detail-delta.md`)

Adds one field to the existing `AttendeeDetailResponse`:

```typescript
registrationAnswerHistory: RegistrationAnswerHistoryEntry[]; // [] if none recorded
```

No change to RBAC (`admin`-only, unchanged), rate limiting (`attendees-list` bucket, unchanged), or audit posture (unaudited read, unchanged — matches how the existing `journey` field on this same response is also unaudited).

### `OnAttendeeRegistrationWebhook` request body (extended — see `contracts/attendee-webhook-payload-delta.md`)

Adds one optional field:

```typescript
answers?: string; // JSON-encoded answer bundle from the slot's ems_reg_answers_N field; absent when the
                   // submission's slot had no follow-up questions
slot?: number;     // which registration slot (1-10) fired this notification — a literal per-workflow
                   // constant; carried onto the stored entry as informational metadata only, defaults
                   // to 0 ("unknown") when absent
```

When present and parseable, appended to the history store for that `{eventId, contactId}` and folded into the existing `attendee.registration.webhook` audit entry as `answersCaptured: true` + `answerCount: <number of keys>`. When absent or unparseable, the existing roster-field processing (`011`) is entirely unaffected — this is additive, not a breaking change to the existing contract.
