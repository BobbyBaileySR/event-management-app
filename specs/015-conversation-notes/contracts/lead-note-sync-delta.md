# Contract delta: `LeadAdapter.createOrUpdateLead` — conversation-note push

This feature does not introduce a new Lead-generation endpoint — it extends `014-lead-generation`'s existing `LeadAdapter.createOrUpdateLead` (`BE-LEAD-001`), whose contracts live in [`014-lead-generation/contracts/`](../../014-lead-generation/contracts/).

**Summary of the delta:**

- After resolving the create/update/created_separate outcome (unchanged from `014`), `createOrUpdateLead` reads `ConversationNoteStore` for this `{eventId, contactId}` (default scope: this event, matching `014`'s own interest-summary default — an `includeFullHistory`-equivalent option is **not** added here; conversation-note sync always scopes to the event the generation was triggered for, since notes are inherently event-specific in a way the interest summary isn't required to be).
- For every entry with `syncedToLeadAt: null`, push it as its own HubSpot Note (same mechanism `014` already uses for the interest-summary Note), then set `syncedToLeadAt` on that entry.
- Entries with `syncedToLeadAt` already set are skipped — never re-pushed, never duplicated (spec FR-012).
- An entry edited or soft-deleted **after** its `syncedToLeadAt` was set is not reconciled with HubSpot in any way — the pushed Note stays as it was (spec FR-013, ADR-019 decision #7, accepted limitation).
- Response shape of `POST events/{evId}/attendees/{contactId}/lead` (single) and the batch route (`014`) is **unchanged** — this is an internal side-effect of generation, not a new field callers need to read.

**Blocked on**: `HS-018` (Notes/engagement scope), same as `014`'s own interest-summary Note push — buildable/testable against a mocked adapter before then.
