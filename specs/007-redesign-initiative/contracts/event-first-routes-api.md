# Contract: Event-First Routing + Registration (Phase B — GATED)

**Feature**: 007 Redesign · **Phase**: B · **Status**: ⛔ **GATED** (objects created in UAT; write-gates remain) + design-it-twice `X-REDESIGN-002/003` · **Date**: 2026-07-13

> **Gate status (2026-07-13):** custom objects created in **UAT** — Program `2-65757052`, Event `2-65757130`, Program→Event association `286` (gate #1/#3 ✔). **Do not implement or merge writes until:** (1) workflow-association test confirms a HubSpot workflow can set the Contact↔Event `registered` label (gate #2, `X-REDESIGN-001`); (2) `CustomObjectAdapter` interface design-it-twice done (`X-REDESIGN-002`); (3) event-first routing shape design-it-twice done (`X-REDESIGN-003`); (4) HubSpot attributes + Contact↔Event association/labels created and verified in [docs/hubspot-schema.md](../../../docs/hubspot-schema.md) (`X-REDESIGN-004`). Object/association IDs are read from **ScriptRunner Connect Parameters** (research R-012), never hardcoded. Proposed property/label names live in hubspot-schema.md; confirm on creation.

**Conventions**: `X-EMS-Route` header; `Authorization: Bearer`; JSON errors `{ "message", "code"? }`.

---

## Design-it-twice: event-first routing shape (`X-REDESIGN-003`) — DECIDED 2026-07-13

Two independent shapes were drafted and compared before committing to one, per ADR-008's consequence note ("event-scoped routes **or** making `programId` optional throughout").

### Option A — Event-scoped routes (drop `programId` from the path entirely)

`programs/{programId}/events/{eventId}/…` → `events/{eventId}/…` for every Event-scoped route. Program membership is resolved inside `CustomObjectAdapter` from the HubSpot association (type ID `286`), never a route segment or property. If a caller needs to know an Event's Program (for grouping/filtering UI), it comes back as an **optional field on the Event object itself** (`programId?: string | null`), populated by the adapter — never required to reach the Event.

- **Pros**: Matches ADR-008 §1 exactly ("the Event is the primary entity... does not require [a Program]"). Zero risk of an "empty/sentinel programId" bug class. Already has a working precedent in this exact route table — `events/:eventId/audit` is already event-scoped-only, coexisting fine with the Program-scoped Slice 1 routes, so the router/RBAC guard is proven to handle this shape today. Simpler `RouteDescriptor.pattern` (one path param instead of two) and simpler handler signatures.
- **Cons**: Every one of the 14 existing `programs/:programId/events/:eventId/...` route entries needs a parallel event-scoped entry during the dual-read window (temporary duplication in `Routes.ts`), and the ~6 handler files behind them need `programId` dropped from their required signature.

### Option B — Keep the existing path shape, make `programId` optional in place

Keep `programs/{programId}/events/{eventId}/…`, but allow `{programId}` to be an optional/sentinel segment (e.g. `programs/_/events/{eventId}/…` for a standalone Event), so the route *pattern* itself doesn't change.

- **Pros**: No route-table duplication; one pattern per action, not two.
- **Cons**: Requires inventing and special-casing a sentinel value in every handler ("is this real or the no-program placeholder?"), and a real bug risk if a HubSpot object id ever collided with the sentinel. The router's pattern compiler (`Utils/Routes.ts` `compileRoutePattern`) has no concept of an optional path segment today — supporting this needs new routing-engine capability just to express "optional," not reuse of anything that exists. Structurally, it keeps Program in the URL as if it were still a required parent, which works *against* ADR-008's actual decision (Program is no longer structural) rather than expressing it. No existing precedent in this codebase.

### Decision: **Option A**

Reasons, beyond the pros/cons above: today's Slice 1 handlers call `resolveCatalogEvent(programId, eventId)` — `programId` isn't just a URL nicety, it's a real lookup key into the Plan-C Record Storage catalog (events are stored *nested under* their Program). Phase B's `CustomObjectAdapter` removes that constraint entirely: a HubSpot Event Item is a root-level object addressable by its own id, no Program key needed to resolve it. So Option A isn't just the better-shaped URL — it's the shape the underlying Phase B data model actually enables, while Option B would be inventing path-level complexity to paper over a lookup constraint that no longer exists once the adapter lands.

**One thing intentionally left open** (not part of the routing-shape decision): whether the existing separate `checkin/scan` (QR) path collapses into the single `checkin` action (distinguished by `scanMethod` in the body, as the check-in write-surface section below already shows) is a Phase B *check-in handler* design question (T052/T054), not a routing-shape one — flagging it here so it isn't silently decided by omission.

---

## Routing change (breaking) — full target-state table

Program membership is a **1-to-many HubSpot association (type ID `286`, Parameter `HUBSPOT_ASSOC_PROGRAM_TO_EVENT`)** resolved inside `CustomObjectAdapter`, **never** a route param or `programId` property. **The api-contract.md + rbac.md + `RouteGuard.ts` change must land together** with the route-table change. A dual-read window keeps both patterns registered against the same handlers during migration (`X-REDESIGN-005`) — remove the `programs/:programId/...` entries only once the frontend has fully cut over.

| Slice 1 (current) | Event-first (target) | Method |
| :--- | :--- | :---: |
| `programs/{programId}/events/{eventId}/attendees` | `events/{eventId}/attendees` | GET |
| `programs/{programId}/events/{eventId}/checkin/scan` | `events/{eventId}/checkin/scan` | POST |
| `programs/{programId}/events/{eventId}/checkin` | `events/{eventId}/checkin` | POST |
| `programs/{programId}/events/{eventId}/capacity` | `events/{eventId}/capacity` | GET |
| `programs/{programId}/events/{eventId}/capacity/adjust` | `events/{eventId}/capacity/adjust` | POST |
| `programs/{programId}/events/{eventId}/email/limits` | `events/{eventId}/email/limits` | GET |
| `programs/{programId}/events/{eventId}/email/templates` | `events/{eventId}/email/templates` | GET |
| `programs/{programId}/events/{eventId}/email/segments` | `events/{eventId}/email/segments` | GET |
| `programs/{programId}/events/{eventId}/email/preview` | `events/{eventId}/email/preview` | POST |
| `programs/{programId}/events/{eventId}/email/dispatches` | `events/{eventId}/email/dispatches` | GET |
| `programs/{programId}/events/{eventId}/email/dispatches` | `events/{eventId}/email/dispatches` | POST |
| `programs/{programId}/events/{eventId}/email/dispatches/{dispatchId}` | `events/{eventId}/email/dispatches/{dispatchId}` | GET |
| `programs/{programId}/events/{eventId}/email/dispatches/{dispatchId}` | `events/{eventId}/email/dispatches/{dispatchId}` | PATCH |
| `programs/{programId}/events/{eventId}/email/dispatches/{dispatchId}` | `events/{eventId}/email/dispatches/{dispatchId}` | DELETE |
| `catalog` (Program→Event tree, Program required) | `catalog` (reshaped — see below) | GET |

### `catalog` response reshape

Today's `CatalogResponse` is a strict tree — `{ programs: CatalogProgram[] }`, each Program nesting its own `events: CatalogEvent[]`. That shape has no way to express a standalone Event (every Event must live inside some Program's array). Target shape flips the ownership direction to match ADR-008 §4 (an Event carries an *optional* Program link, not the reverse):

```typescript
interface CatalogResponse {
  events: CatalogEventSummary[];     // flat, top-level — always present, incl. standalone Events
  programs: CatalogProgramSummary[]; // for optional grouping/filter UI only, no nested events[]
}
interface CatalogEventSummary extends CatalogEvent {
  programId?: string | null;         // resolved from association 286 by the adapter; absent/null = standalone
}
```

The client builds "Events in Program X" by filtering the flat `events` list on `programId`, rather than the server pre-nesting them — this is what makes "select a Program filters/groups Events; it is not required to reach an Event" (ADR-008 §2) actually work on the wire.

---

## EMS write surface (association-label writes)

EMS writes are limited to check-in / undo / remove / catalog CRUD. **No public "register attendee" write** (registration is workflow-side). Writes target the Contact↔Event association (Parameter `HUBSPOT_ASSOC_CONTACT_EVENT`) and flip labels `registered`↔`checked-in` (Parameters `HUBSPOT_ASSOC_LABEL_REGISTERED` / `HUBSPOT_ASSOC_LABEL_CHECKED_IN`).

### `POST events/{eventId}/checkin` · flip `registered` → `checked-in`

**Auth**: Bearer, **admin** (role-aware shell, FR-013). **Request:**
```json
{ "contactId": "12345", "scanMethod": "qr", "qrNonce": "<nonce>" }
```
**Response `200`:** `{ "contactId": "12345", "status": "checked-in", "checkedInAt": "2026-07-13T10:00:00.000Z" }`

- Writes association label `checked-in`, writes `RegistrationDetail` cache (`contactId+eventId`), **audits** actor + time (no attendee email/name in metadata).

### `POST events/{eventId}/checkin/undo` · revert to `registered`

**Auth**: Bearer, admin. **Request:** `{ "contactId": "12345" }` → **`200`** `{ "contactId": "12345", "status": "registered" }`. Audited.

### `DELETE events/{eventId}/attendees/{contactId}` · remove attendee

**Auth**: Bearer, admin. Deletes the association. **Blocked while `checked-in`** → `409 attendee_checked_in` (must undo first). Audited.

---

## Error codes (common)

| HTTP | `code` | When |
| :---: | :--- | :--- |
| 400 | `validation_error` | Missing/invalid `contactId`/`scanMethod` |
| 401 | `unauthorized` | Missing/invalid session |
| 403 | `forbidden` | Non-admin |
| 404 | `event_not_found` / `association_not_found` | Unknown event / not registered for this event |
| 405 | `method_not_allowed` | Wrong method |
| 409 | `attendee_checked_in` | Remove attempted while checked-in |
| 429 | `rate_limited` | Rate limit exceeded |

**Handler order (write-gate)**: session → RBAC (admin) → validate → rate limit → act (via `CustomObjectAdapter`) → audit.

---

## RBAC rows (for rbac.md, when unblocked)

| Route *(logical)* | Method | viewer | operator | communications | admin | Phase |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| `events/{eventId}/attendees` | GET | No | No | No | Yes | 007-B |
| `events/{eventId}/checkin` | POST | No | No | No | Yes | 007-B |
| `events/{eventId}/checkin/undo` | POST | No | No | No | Yes | 007-B |
| `events/{eventId}/attendees/{contactId}` | DELETE | No | No | No | Yes | 007-B |
| `events/{eventId}/capacity` | GET | No | No | No | Yes | 007-B |

> Admin-only for now; the shell is role-aware so a future `check-in operator` role can be granted the check-in routes without restructuring (FR-013).

## Audit (per rbac.md § Audit requirements)

| Action | Audit | Fields (no PII) |
| :--- | :---: | :--- |
| check-in | Yes | eventId, actor, timestamp, scanMethod |
| undo check-in | Yes | eventId, actor, timestamp |
| remove attendee | Yes | eventId, actor, timestamp |
