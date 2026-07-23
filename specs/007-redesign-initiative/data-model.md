# Phase 1 Data Model: Redesign Initiative (Slice 007)

**Plan**: [plan.md](./plan.md) · **Research**: [research.md](./research.md) · **Date**: 2026-07-13

> This artifact began as a design model. The custom-object schema is now implemented; [docs/hubspot-schema.md](../../docs/hubspot-schema.md) is authoritative for verified property and association IDs.

---

## Phase A — Presentation + preferences (unblocked)

### Theme (frontend concept)

A named set of semantic-token values applied via the `data-theme` attribute on `<html>`.

| Field | Type | Notes |
| :--- | :--- | :--- |
| `id` | `'aurora' \| 'celebration' \| 'darkAurora'` | `data-theme` value; `aurora` = default (no attribute or `aurora`) |
| `label` | string | Display name in the switcher |
| `gated` | boolean | `true` for Celebration (allowlist-gated); `false` for Aurora/Dark Aurora |

- **Not persisted as an entity** — the theme catalog is static frontend metadata (`theme/themeTokens.ts`). Only the user's *choice* is persisted (below).
- **State transition**: switching sets `data-theme` instantly (no animation) and triggers a `ThemePreference` write.

### ThemePreference (persisted — backend, Phase A)

Per-user, cross-device stored choice. Backed by a Record Storage user-preferences store.

| Field | Type | Validation | Notes |
| :--- | :--- | :--- | :--- |
| `userKey` | string | **Google account subject ID** (from the session) | Key; **not** the email — a stable, non-PII identifier. Never returned to other users |
| `theme` | `'aurora' \| 'celebration' \| 'darkAurora'` | must be one of the three | Rejected otherwise (`validation_error`) |
| `updatedAt` | ISO 8601 string | server-set | — |

**Rules**
- **No PII** stored (theme id + non-PII subject-ID key only; **never the email**) — audit not required for this cosmetic preference ([ADR-009] §5).
- **Rate limit**: writes are limited via Parameter `USER_PREFS_RATE_LIMIT_PER_HOUR` (default 60/user/hour).
- **Celebration re-validated server-side** on read (load/login): if `theme === 'celebration'` and the signed-in email is **not** on the allowlist, the resolved theme is **Aurora**. The stored value is never trusted for gating.
- **Write-gate**: session → RBAC → validate (`theme` enum) → rate limit → persist. See [contracts/theme-preference-api.md](./contracts/theme-preference-api.md).

---

## Phase B — Event-first data model (implemented)

> **Outcome (updated 2026-07-17):** feasibility gates passed and the model shipped. Confirmed IDs and environment Parameters live in [docs/hubspot-schema.md](../../docs/hubspot-schema.md) § *Redesign custom objects*; IDs are read from ScriptRunner Parameters, never hardcoded.

### Program (HubSpot custom object "Event Programs", type `2-65757052`) — optional grouping

| Field (intent) | Type | Notes |
| :--- | :--- | :--- |
| `id` | string | HubSpot object id (mapped to stable EMS catalog id inside the adapter) |
| `name` | string | required (`program_name`, primary display) |
| `description` | string | optional |
| `owner` | string | program owner (`hubspot_owner_id`) |
| `startDate` / `endDate` | date | optional |

- **Program → Event is a 1-to-many HubSpot association** (association type ID `286`, Parameter `HUBSPOT_ASSOC_PROGRAM_TO_EVENT`) — **not** a `programId` property. An Event may have no Program association and stand alone ([ADR-008] §3–§4).

### Event (HubSpot custom object "Event Items", type `2-65757130`) — primary entity

| Field (intent) | Type | Notes |
| :--- | :--- | :--- |
| `id` | string | HubSpot object id (mapped to stable EMS catalog id inside the adapter) |
| `name` | string | required (`event_name`, primary display) |
| Program link | association | **1-to-many Program→Event association (ID `286`)**; absent ⇒ standalone Event (FR-014). No `programId` property |
| `date` / `startTime` | date/time | `event_start` (+ optional `event_end`) |
| `location` | string | — |
| `capacity` | number | Live capacity/occupancy ±1 handled per Slice 004 |
| `status` | `'active' \| 'cancelled'` | manual; **`completed`** is **derived** when end date has passed (FR-017) |
| `publishState` | `'draft' \| 'published'` | tracked **separately** from `status` (FR-017) |
| `walkInFormUrl` | string \| null | HubSpot walk-in form (iframe) — retained per ADR-007 §5 |
| `publicRegistrationUrl` | string \| null | public registration panel — retained |

**Retired** (per ADR-007 §5): global `attendanceProperty`, `partsAttendedOption`, Program `hubspotFormIds` used for registration resolution.

### Registration (Contact↔Event association)

Registration **exists ⇔ the association exists**. Lifecycle + type are **association labels** (not properties).

| Concept | Representation | Notes |
| :--- | :--- | :--- |
| Registered | label `registered` (Parameter `HUBSPOT_ASSOC_LABEL_REGISTERED`) | created by HubSpot workflow (public/walk-in), not EMS |
| Checked in | label `checked-in` (Parameter `HUBSPOT_ASSOC_LABEL_CHECKED_IN`) | EMS flips `registered` → `checked-in`; undo reverses |
| Attendee type | **deferred** — derived from existing Parts Attended flags, **not** an association label this pass | revisit if needed (see hubspot-schema.md) |

Contact↔Event association type ID → Parameter `HUBSPOT_ASSOC_CONTACT_EVENT` (TBD until created). Workflow-settable behaviour is **assumed** (gate #2) — confirm with a test workflow before EMS writes.

**Rules**
- Phase B needs **2** labels (`registered`, `checked-in`); ≤ 10 per object pairing (gate #3 ✔, research R-005).
- **Remove attendee** = delete the association; **blocked while `checked-in`** (FR-015).
- EMS exposes **no** "register attendee" write (FR-015; ADR-007 §4).

**Association label state transitions**

```text
(none) ──workflow register──▶ registered ──EMS check-in──▶ checked-in
                                  ▲                              │
                                  └──────── EMS undo ────────────┘
registered ──EMS remove attendee──▶ (association deleted)
checked-in ──remove attempt──▶ BLOCKED (must undo first)
```

### RegistrationDetail (Record Storage cache, keyed `contactId + eventId`)

Per-registration operational detail HubSpot cannot hold on the association.

| Field | Type | Notes |
| :--- | :--- | :--- |
| `contactId` | string | key part |
| `eventId` | string | key part (HubSpot Event object id) |
| `checkedInAt` | ISO 8601 | set on check-in |
| `scanMethod` | `'qr' \| 'name' \| 'walkin'` | how the check-in happened |
| `qrNonce` / `qrJwt` | string | check-in QR nonce/JWT (event id = HubSpot object id, `BE-REDESIGN-005`) |

**Rules**
- **Purged when the Event is archived**; the **audit log is the durable backstop** for check-in "when" (ADR-007 §3).

---

## Cross-references

- Frontend DTOs: `ThemePreference` (Phase A) in `src/types.ts`; `Registration`/association DTOs (Phase B) added with the adapter.
- Backend stores: `UserPrefsStore` (Phase A); `CustomObjectAdapter` + `RegistrationStore` (Phase B).
- Migration/backfill of existing Contact-property attendance + Parts-Attended → objects/associations: `X-REDESIGN-005` (dual-read window TBD).
