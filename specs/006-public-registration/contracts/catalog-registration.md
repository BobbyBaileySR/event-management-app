# Catalog API Contract — Public Registration (006 delta)

> **Superseded design contract — re-plan before implementing.** Not authoritative for live handlers. Assumes Plan C catalog fields, Settings hub, and header-only `X-EMS-Route` transport. When re-planned, merge the delta into [docs/api-contract.md](../../../docs/api-contract.md) using the current **`route` query parameter** transport and event-first Programs & Events / Event Details surfaces. Retained as historical design reference only.
>
> **Historical status note:** Originally intended to extend [001 catalog-api](../../_shipped/001-catalog-admin/contracts/catalog-api.md) and [002 delta](../../_shipped/002-catalog-metadata-modal/contracts/catalog-api.md).
>
> **Historical transport:** Generic Sync HTTP; `X-EMS-Route` + `Authorization: Bearer <session>` (superseded by `route` query param).
>
> **Historical RBAC:** Catalog POST/PATCH **`admin` only**; registration panel via `GET catalog`.

**Status**: Historical design only — **not** live.

---

## Summary of changes

| Route | Change |
| :--- | :--- |
| `GET catalog` | Program and Event nodes may include `registrationPageUrl`, `registrationPublishState` |
| `POST catalog/program` | Body accepts optional registration fields |
| `PATCH catalog/program/{id}` | Body accepts optional registration fields + `null` to clear |
| `POST catalog/event` | Body accepts optional override registration fields |
| `PATCH catalog/event/{id}` | Body accepts optional override registration fields + `null` to clear |

**No new routes.** Registration panel inline edit uses existing PATCH endpoints.

---

## Field definitions

### `registrationPageUrl`

| Level | Semantics |
| :--- | :--- |
| **Program** | Default public HubSpot landing page URL |
| **Event** | Override URL when set; otherwise resolution uses Program |

| Rule | Value |
| :--- | :--- |
| Type | string (HTTPS URL) |
| Optional | Yes |
| Clear | `null` or `""` after trim |
| Validation | HTTPS; host `*.hubspot.com`, `*.hs-sites.com`, or any valid HTTPS host |

### `registrationPublishState`

| Level | Semantics |
| :--- | :--- |
| **Program** | Publish state for Program default URL |
| **Event** | Independent state when Event `registrationPageUrl` set |

| Rule | Value |
| :--- | :--- |
| Type | `"draft"` \| `"published"` |
| Optional | Yes |
| Default | `"draft"` when `registrationPageUrl` newly set without explicit state |
| Clear | `null` removes stored state (treat as unset → `draft` on next resolve) |

---

## `GET catalog`

Program node example:

```json
{
  "id": "prog-atlassian-2026",
  "name": "Atlassian Event 2026",
  "hubspotFormIds": ["form-guid-1"],
  "archived": false,
  "registrationPageUrl": "https://events.adaptavist.com/atlassian-2026",
  "registrationPublishState": "published",
  "events": []
}
```

Event node with override example:

```json
{
  "id": "evt-vip",
  "name": "VIP Event",
  "partsAttendedOption": "VIP Event",
  "archived": false,
  "registrationPageUrl": "https://pages.hubspot.com/vip-2026",
  "registrationPublishState": "draft"
}
```

Omitted keys mean unset (not stored).

---

## `POST catalog/program`

**Body** (extended):

```json
{
  "name": "Atlassian Event 2026",
  "hubspotFormIds": ["form-guid-1"],
  "registrationPageUrl": "https://12345678.hs-sites.com/register",
  "registrationPublishState": "draft"
}
```

If `registrationPageUrl` provided without `registrationPublishState`, response stores `"draft"`.

**Response `201`**: `{ "program": { … } }` — includes registration fields when set.

---

## `PATCH catalog/program/{id}`

**Body** (partial):

```json
{
  "registrationPageUrl": "https://events.example.com/register",
  "registrationPublishState": "published"
}
```

Clear URL:

```json
{
  "registrationPageUrl": null,
  "registrationPublishState": null
}
```

**Response `200`**: `{ "program": { … } }`.

**Errors**:

| Condition | Status | Code |
| :--- | :--- | :--- |
| Invalid URL | 422 | `validation_error` — `registrationPageUrl must use HTTPS` or host/parse message |
| Invalid publish state | 422 | `validation_error` — `registrationPublishState must be draft or published` |

---

## `POST catalog/event` / `PATCH catalog/event/{id}`

Same field names; Event values are **overrides**.

**PATCH clear override** (fall back to Program):

```json
{
  "registrationPageUrl": null,
  "registrationPublishState": null
}
```

Validation rules identical to Program.

---

## Frontend consumption

| Surface | API usage |
| :--- | :--- |
| Program modal | POST/PATCH program with registration fields |
| Event modal | POST/PATCH event with override fields |
| Registration panel (no Event override) | PATCH program |
| Registration panel (Event override active) | PATCH event |

After successful PATCH from panel, client calls `bumpCatalog()` and refetches tree via pickers.

---

## Security notes

- URLs rendered as plain text in UI; used in `href` only after client allowlist re-check.
- No HubSpot credentials in request bodies.
- Audit: existing catalog mutation audit covers registration field changes.

---

## Unchanged from prior slices

- `hubspotFormIds` / `hubspotFormId` — required Program identity fields (001)
- `walkInFormUrl` — Event walk-in embed (003); separate validator
- `partsAttendedOption`, `attendanceProperty`, capacity, etc.
