# Catalog Event — `walkInFormUrl` (US3)

**Status**: Provisional — merge into `Frontend/docs/api-contract.md` `POST/PATCH catalog/event` sections when implementing.

**RBAC**: Same as existing catalog event mutations — **`admin`** only.

**Depends on**: Existing `POST catalog/event`, `PATCH catalog/event/{id}`, `GET catalog` tree.

---

## Field: `walkInFormUrl`

Optional HTTPS URL pointing to a HubSpot form embed or share page for on-site walk-in intake for this Event.

| Property | Value |
| :--- | :--- |
| Type | `string` |
| Required on create | No |
| Clear | PATCH `{ "walkInFormUrl": null }` or `""` |
| Returned on | `GET catalog` Event nodes, `POST/PATCH` response `event` object |

### Validation

| Rule | Error |
| :--- | :--- |
| Must be valid URL with scheme `https:` | `422 validation_error` — `walkInFormUrl must use HTTPS` |
| Host must match allowlist | `422 validation_error` — `walkInFormUrl must be a HubSpot form URL` |
| Exceeds max text length | `422 validation_error` — same as other Event metadata |

**Allowlist hosts** (case-insensitive):

- Suffix: `.hubspot.com`, `.hsforms.com`
- Exact: `share.hsforms.com`

**Examples (valid)**:

- `https://share.hsforms.com/1a2b3c4d-...`
- `https://js.hsforms.net/ui/...` *(if host ends with `.hsforms.com`)*
- `https://app.hubspot.com/...`

**Examples (invalid)**:

- `http://share.hsforms.com/...` — not HTTPS
- `https://evil.example.com/form` — host not allowlisted
- `javascript:alert(1)` — not a navigable HTTPS URL

---

## `POST catalog/event` — extended body

```json
{
  "programId": "prog-atlassian-2026",
  "name": "Main Room",
  "partsAttendedOption": "Main Room 2026",
  "attendanceProperty": "main_room_2026_attendance",
  "walkInFormUrl": "https://share.hsforms.com/1a2b3c4d-e5f6-7890-abcd-ef1234567890"
}
```

All existing required fields unchanged. `walkInFormUrl` is optional on create.

---

## `PATCH catalog/event/{id}` — extended body

```json
{
  "walkInFormUrl": "https://share.hsforms.com/1a2b3c4d-e5f6-7890-abcd-ef1234567890"
}
```

Clear:

```json
{
  "walkInFormUrl": null
}
```

---

## `GET catalog` — Event node (excerpt)

```json
{
  "id": "ev-mr-2026",
  "name": "Main Room",
  "partsAttendedOption": "Main Room 2026",
  "attendanceProperty": "main_room_2026_attendance",
  "archived": false,
  "walkInFormUrl": "https://share.hsforms.com/1a2b3c4d-e5f6-7890-abcd-ef1234567890"
}
```

Omitted key = unset (same convention as `owner`, `capacity`, etc.).

---

## Frontend consumption (Check-in)

| Condition | Walk-in mode behaviour |
| :--- | :--- |
| `walkInFormUrl` set and passes client allowlist | iframe `src={walkInFormUrl}` + staff hint |
| `walkInFormUrl` unset | Empty state — link to catalog Settings |
| `walkInFormUrl` set but fails allowlist | Inline validation error — no iframe |

**No new HTTP route** for walk-in submit. HubSpot form POST goes directly to HubSpot.

---

## Audit

Catalog POST/PATCH for `walkInFormUrl` changes are covered by existing catalog mutation audit (001). HubSpot iframe form submit produces **no** EMS audit entry (NFR-002).
