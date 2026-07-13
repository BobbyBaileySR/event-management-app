# Phase 1 Data Model: Redesign Initiative (Slice 007)

**Plan**: [plan.md](./plan.md) · **Research**: [research.md](./research.md) · **Date**: 2026-07-13

> **HubSpot property names below are illustrative field intents, not verified schema.** No custom-object type, property, or association-label type ID is authoritative until verified in [docs/hubspot-schema.md](../../docs/hubspot-schema.md) (`X-REDESIGN-004`, blocked on `X-REDESIGN-001`).

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

## Phase B — Event-first data model (gated on `X-REDESIGN-001`)

> All of Phase B is blocked until the feasibility gates pass (research R-005). Shapes below are the **target model** per ADR-007/008 and [CONTEXT.md](../../CONTEXT.md) § *Redesign transition — target model*.

### Program (HubSpot custom object) — optional grouping

| Field (intent) | Type | Notes |
| :--- | :--- | :--- |
| `id` | string | HubSpot object id (mapped to stable EMS catalog id inside the adapter) |
| `name` | string | required |
| `description` | string | optional |
| `owner` | string | program owner |
| `startDate` / `endDate` | date | optional |

- **Optional**: an Event may reference a Program via `programId`, or stand alone ([ADR-008] §3–§4).

### Event (HubSpot custom object) — primary entity

| Field (intent) | Type | Notes |
| :--- | :--- | :--- |
| `id` | string | HubSpot object id (mapped to stable EMS catalog id inside the adapter) |
| `name` | string | required |
| `programId` | string \| null | **optional** — standalone Event when absent (FR-014) |
| `date` / `startTime` | date/time | — |
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
| Registered | label `registered` | created by HubSpot workflow (public/walk-in), not EMS |
| Checked in | label `checked-in` | EMS flips `registered` → `checked-in`; undo reverses |
| Attendee type | label `customer` / `partner` | durable label, never Record Storage |

**Rules**
- ≤ 10 association labels per object pairing (gate #3, research R-005).
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
