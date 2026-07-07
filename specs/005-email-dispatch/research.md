# Research: Email Dispatch (Slice 2)

**Feature**: 005-email-dispatch  
**Date**: 2026-07-07  
**Spec**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md)

---

## R-001: Catalog-scoped routes (not legacy `events/{id}/email`)

**Decision**: All Slice 2 email routes use prefix `programs/{programId}/events/{eventId}/email/…` with **`admin`** RBAC — same pattern as attendees/check-in/capacity. Retire legacy flat `events/{id}/email/*` for this slice.

**Rationale**: Slice 1+ catalog is source of truth (ADR-003 Plan C). Clarification Session 2026-07-07 mandates `#/events/email` + catalog pickers.

**Alternatives considered**:
- **Keep legacy routes with catalog ids in body** — rejected: inconsistent with 003/004; duplicate route matrix.
- **Event Hub sub-route only** — rejected: spec FR-001 requires dedicated catalog-scoped Email route.

---

## R-002: Email job queue in Record Storage

**Decision**: Persist **Email dispatch jobs** and **per-Contact recipient rows** in ScriptRunner **Record Storage** (not Contact properties, not HubSpot custom objects). Background **`QueueProcessor`** (Scheduled Trigger, cron `*/15 * * * *`) claims due jobs, resolves audiences, hands off to HubSpot, writes **sent** rows and audit entries.

**Rationale**: Blueprint §8 Email Job Queue; idempotency, schedule lock, partial failure, and dispatch log filtering require EMS-owned state. HubSpot marketing UI alone cannot satisfy FR-011–FR-013.

**Alternatives considered**:
- **HubSpot workflows only** — rejected: spec out-of-scope; staff need EMS compose/schedule/log UX.
- **Contact custom properties for send history** — rejected: blueprint explicitly avoids Contact property queue; PII/scale risk.

**Key prefixes** (implementation detail in plan):
- `ems-dispatch-{dispatchId}` — job record
- `ems-dispatch-{dispatchId}--recipient-{contactId}` — outcome row
- Index/list keys per Event for scheduled pending + log listing (design in data-model.md)

---

## R-003: HubSpot send mechanism

**Decision**: **Phase 0 spike required before live cutover** — verify Adaptavist portal supports one of:

1. **Preferred (segment + bulk)**: HubSpot **Marketing Email** publish/send API to a **list/segment id** when available for the account tier, **or**
2. **Fallback (all audiences)**: Resolve recipient Contact emails via CRM **Lists/Segments membership API**, then **Marketing Single-Send API** (`POST /marketing/v4/email/single-send` or current transactional single-send path) **one Contact at a time** inside `QueueProcessor` with HubSpot rate-limit backoff.

**Rationale**: Community + docs confirm no simple “send marketing email to list id” single endpoint for all accounts; Single-Send is per-recipient but matches “template by id + handoff” model. EMS queue absorbs batching and retries.

**Alternatives considered**:
- **SMTP bulk** — rejected: not template-id aligned; harder audit.
- **Workflow trigger from EMS** — rejected: out of scope; slower feedback loop for staff.

**Implementation gate**: Document chosen path in Backend spike ticket; block `USE_MOCK_API: false` email cutover until spike passes on UAT HubSpot.

---

## R-004: HubSpot templates and segments read paths

**Decision**:
- **Templates**: HubSpot Marketing Email metadata API — return `{ id, name, description? }`; UI shows **name** only (FR-002).
- **Segments**: HubSpot CRM **Lists API v3** (`/crm/v3/lists/`) filtered to **Active + Static** segment types used in Adaptavist portal (verified under CRM → Segments). Return `{ id, name, listType }`; UI shows **name** only (FR-005).

**Rationale**: Stakeholder verified CRM Segments (Active/Static) and marketing templates exist (2026-07-07).

**Alternatives considered**:
- **Cache templates/segments in EMS catalog** — rejected: stale data; HubSpot is system of record for marketing assets.

---

## R-005: Send now = accept + queue (non-blocking)

**Decision**: `POST …/email/dispatches` with no `scheduledAt` creates job in **`pending`** or **`processing`** state, returns **`202`-style acceptance** (`200` with `status: "accepted"` / `"processing"`) immediately; UI shows non-blocking success (Clarification Session 2026-07-07).

**Rationale**: Large audiences + HubSpot rate limits; matches scheduled pipeline; avoids UI timeout.

**Alternatives considered**:
- **Synchronous send in HTTP handler** — rejected: clarification answer B; risk of ScriptRunner timeout on large lists.

---

## R-006: Schedule grid, timezone, processing lock

**Decision**:
- Store **`scheduledAtUtc`** (ISO instant) + **`timezone`** (IANA string, e.g. `Europe/London`) on job record.
- UI picker: date + time constrained to **:00/:15/:30/:45** in selected timezone; server rejects off-grid and past instants.
- **`processing`** starts when cron claims job (at or after scheduled instant, aligned to 15-min tick). While **`processing`**, PATCH/DELETE blocked (FR-008).
- **Warning flag** in GET scheduled list when `scheduledAtUtc - now <= 15 minutes` and status is **`pending`** (FR-009).

**Rationale**: ScriptRunner scheduled trigger minimum interval; stakeholder-chosen timezone per schedule.

---

## R-007: Audience resolution

**Decision**:

| Audience type | Resolution at processing time |
| :--- | :--- |
| `registered_all` | All Registered attendees for Program+Event (reuse `RegistrationAdapter` query) |
| `registered_checked_in` / `registered_not_checked_in` | Same query + `checkedIn` filter |
| `registered_manual` | Fixed `contactIds[]` from compose payload (Clarification: fixed selection — filters only helped pick) |
| `hubspot_segment` | Expand segment membership via Lists API at processing time (Active membership may change) |

Preview endpoint runs same resolver in **count-only** mode (no send).

**Rationale**: FR-004, FR-005, edge case on segment membership drift.

---

## R-008: Idempotency and rate limits

**Decision**:
- Client sends **`idempotencyKey`** (UUID) on create dispatch; server dedupes duplicate POST within TTL → same `dispatchId` response (edge case: double-click).
- **`DISPATCH_RATE_LIMIT_PER_HOUR`** (Parameter, default **10**) counts **dispatch create** actions per admin email (send now + new schedule); enforced before job persist; **`429 rate_limited`** when exceeded.
- **`GET …/email/limits`** returns `{ dispatchLimitPerHour, dispatchUsedThisHour, largeSendThreshold }` for Compose tab (FR-010a, NFR-005).

**Rationale**: Blueprint §11 parameters; clarification requires limit visible in UI.

---

## R-009: Dispatch log and attendee filter

**Decision**:
- **Dispatch log tab**: `GET …/email/dispatches?status=completed,processing` (newest first) + detail `GET …/email/dispatches/{dispatchId}` with paginated recipients `{ contactId, email, outcome: "sent" }`.
- **Attendee filter**: extend existing `GET …/attendees` with `dispatchId` + `dispatchFilter=received|not_received` — filters **Registered attendees** only (US4 scenario 4).

**Rationale**: FR-011–FR-013; reuse attendee list surface for follow-up targeting.

---

## R-010: Frontend navigation refactor

**Decision**:
- Add **`sliceModulePath('email')` → `/events/email`** (extend pattern from attendees/check-in).
- Replace legacy **`EmailView`** at `#/events/:eventId/email` with catalog-scoped **`EmailDispatchView`** (name TBD in tasks) using **`useCatalogSelection()`**.
- **Tab state**: `compose` | `scheduled` | `log` — URL hash query `?tab=` optional (plan default: in-component state; query param if deep-link needed in tasks).
- Sidebar: show **Email** for **admin** when Program+Event selected (match Attendees gate).
- Remove/mock retire flat `eventId` email fetches in `dataService`.

**Rationale**: FR-001, Clarification Session 2026-07-07.

---

## R-011: Mock layer

**Decision**: Extend `mockData` + `dataService` so **`USE_MOCK_API: true`** supports full Compose / Scheduled / Log tabs, limits display, preview counts, idempotent create, and attendee dispatch filters — no live HubSpot until flag false.

**Rationale**: Spec edge case; matches Slice 1 mock parity pattern.

---

## Open spike (pre-implement)

| Spike | Owner | Blocks |
| :--- | :--- | :--- |
| HubSpot single-send + list membership scopes on Adaptavist private app | Backend | Live send |
| Marketing email template list API shape | Backend | Template picker live |
| Lists API: map CRM “Segments” to list ids/types | Backend | Segment picker live |

Park failures in `Backend/TODO.md` / `Frontend/TODO.md` per constitution if spike deferred.
