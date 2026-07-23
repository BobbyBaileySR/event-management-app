# Contract delta: `GET events/{evId}/attendees/{contactId}` — `registrationAnswerHistory` field

This feature does not introduce a new route — it extends the existing `GET events/{evId}/attendees/{contactId}` response (`010-attendee-detail-modal`), whose canonical contract lives in [`docs/api-contract.md`](../../../docs/api-contract.md) (already edited in place for this feature) and [`010-attendee-detail-modal/contracts/get-attendee-detail.md`](../../010-attendee-detail-modal/contracts/get-attendee-detail.md).

**Summary of the delta** (see `api-contract.md`'s entry for the full response shape example):

- New response field: `registrationAnswerHistory` — every registration-form follow-up answer recorded for this Contact+Event, appended to (never overwritten) across submissions/amendments; `[]` if none recorded.
- No change to RBAC (`admin`-only), rate limiting (`attendees-list` bucket), or audit posture (unaudited read) — matches how the existing `journey` field on this same response is also unaudited.
- **Rendering requirement, not optional**: `answers` values inside each entry are free text authored directly by an anonymous public form submitter — the first such surface in this codebase. Frontend MUST render with JSX `{text}` only, never `dangerouslySetInnerHTML`, with a display length-cap for pathologically long answers. See spec.md FR-007.
