# Contract delta: `OnAttendeeRegistrationWebhook` — `answers` field

This feature does not introduce a new endpoint — it extends the existing `OnAttendeeRegistrationWebhook` contract, whose canonical single source of truth is [`011-attendee-index-perf/contracts/attendee-webhook-contract.md`](../../011-attendee-index-perf/contracts/attendee-webhook-contract.md) (already edited in place for this feature, not forked here).

**Summary of the delta** (see that file's Request table and Processing steps 3a/4 for the full detail):

- New optional request body field: `answers` — a JSON-encoded bundle of the submitting slot's follow-up question(s)/answer(s), sourced from that slot's `ems_reg_answers_N` HubSpot property.
- New optional request body field: `slot` — which registration slot (1-10) fired this notification, a literal per-workflow constant. Carried onto the stored history entry as informational metadata only (data-model.md); defaults to `0` ("unknown") when absent rather than blocking the append.
- Strictly additive: absent or unparseable `answers` leaves all existing (011) roster-field processing entirely unaffected.
- When present and parseable: appended (never overwritten) to the new registration-answer history store (see [data-model.md](../data-model.md)), and folded into the existing `attendee.registration.webhook` audit entry as `answersCaptured`/`answerCount` metadata — no new audit action, no answer text in metadata.
