# Contract: Event-First Routing + Registration (Phase B — GATED)

**Feature**: 007 Redesign · **Phase**: B · **Status**: ⛔ **GATED** (objects created in UAT; write-gates remain) + design-it-twice `X-REDESIGN-002/003` · **Date**: 2026-07-13

> **Gate status (2026-07-13):** custom objects created in **UAT** — Program `2-65757052`, Event `2-65757130`, Program→Event association `286` (gate #1/#3 ✔). **Do not implement or merge writes until:** (1) workflow-association test confirms a HubSpot workflow can set the Contact↔Event `registered` label (gate #2, `X-REDESIGN-001`); (2) `CustomObjectAdapter` interface design-it-twice done (`X-REDESIGN-002`); (3) event-first routing shape design-it-twice done (`X-REDESIGN-003`); (4) HubSpot attributes + Contact↔Event association/labels created and verified in [docs/hubspot-schema.md](../../../docs/hubspot-schema.md) (`X-REDESIGN-004`). Object/association IDs are read from **ScriptRunner Connect Parameters** (research R-012), never hardcoded. Proposed property/label names live in hubspot-schema.md; confirm on creation.

**Conventions**: `X-EMS-Route` header; `Authorization: Bearer`; JSON errors `{ "message", "code"? }`.

---

## Routing change (breaking)

Slice 1 routes are `programs/{programId}/events/{eventId}/…`. Event-first navigation ([ADR-008](../../../docs/decisions/008-standalone-events-event-first-nav.md)) requires **event-scoped routes** so a standalone Event (no `programId`) is fully addressable:

| Slice 1 (current) | Event-first (target) |
| :--- | :--- |
| `programs/{programId}/events/{eventId}/attendees` | `events/{eventId}/attendees` |
| `programs/{programId}/events/{eventId}/checkin` | `events/{eventId}/checkin` |
| `programs/{programId}/events/{eventId}/capacity` | `events/{eventId}/capacity` |
| `catalog` (Program→Event tree) | `catalog` (Programs optional; Events top-level; Program membership via **association `286`**, resolved by adapter — no `programId` property) |

Program membership is a **1-to-many HubSpot association (type ID `286`, Parameter `HUBSPOT_ASSOC_PROGRAM_TO_EVENT`)** resolved inside `CustomObjectAdapter`, **not** a route param or `programId` property. Whether the wire still exposes an optional `programId` field for grouping is the `X-REDESIGN-003` design-it-twice output. **The api-contract.md + rbac.md + `RouteGuard.ts` change must land together.** A dual-read window supports existing `programs/.../events/...` callers during migration (`X-REDESIGN-005`).

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
