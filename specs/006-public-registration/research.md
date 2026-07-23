# Research: Public Registration (Slice 3)

> **Historical research — revalidate before implementation.** Runtime mock-data and Plan C catalog/Settings assumptions were superseded by the event-first HubSpot custom-object model. `docs/hubspot-schema.md` is authoritative for current Event registration fields.

**Feature**: 006-public-registration  
**Date**: 2026-07-07  
**Spec**: [spec.md](./spec.md) (Clarifications 2026-07-07)

---

## R-001: Catalog field names and storage

**Decision**: Add two optional metadata keys to **Program** and **Event** catalog records:

| Key | Type | Scope |
| :--- | :--- | :--- |
| `registrationPageUrl` | `string \| undefined` | Program = default public landing page; Event = **override** when set |
| `registrationPublishState` | `'draft' \| 'published' \| undefined` | Program = default state; Event = override state **only when** `registrationPageUrl` set on Event |

**Rationale**: Mirrors `walkInFormUrl` metadata pattern (003). Same key names on both levels with resolution rules documented in [data-model.md](./data-model.md). No new Record Storage collections.

**Alternatives considered**:
- **Separate `overrideRegistrationPageUrl` on Event** — rejected: longer API surface; resolution logic identical to optional Event `registrationPageUrl`.
- **Dedicated registration store** — rejected: violates read-first catalog model; URLs are catalog configuration.

---

## R-002: Landing-page URL allowlist (distinct from walk-in)

**Decision**: New validator `isAllowedRegistrationPageUrl` — **HTTPS only**; accept:

1. Host suffix `*.hubspot.com`
2. Host suffix `*.hs-sites.com`
3. **Any other valid HTTPS host** (custom domains staff paste after HubSpot publish)

Reject: `http:`, malformed URL, userinfo in URL, non-standard ports.

Validate on **frontend** (modal + panel) and **backend** catalog POST/PATCH (`422 validation_error`).

**Rationale**: Clarify session chose custom domains for real landing pages on customer CNAMEs. Walk-in embed allowlist (`*.hsforms.com`) stays **separate** — different threat model (iframe src vs external link/copy).

**Alternatives considered**:
- **Reuse `hubspotFormUrl.ts`** — rejected: forms hosts ≠ landing-page hosts; would block valid pages or allow wrong embed URLs.
- **HubSpot subdomains only** — rejected: clarify chose B (custom domains).

---

## R-003: HubSpot admin editor URL derivation

**Decision**: `tryResolveHubSpotPageEditorUrl(publicUrl: string): string | null` — **best-effort** only:

| Public URL pattern | Editor deep link |
| :--- | :--- |
| Contains parseable HubSpot page/site identifiers in known path shapes | Construct `https://app.hubspot.com/...` editor URL when pattern matches (implement conservatively in code + unit tests) |
| Custom domains, `*.hs-sites.com` public URLs, unrecognized shapes | Return `null` |

When `null`, **Open in HubSpot** opens fixed fallback `HUBSPOT_LANDING_PAGES_FALLBACK_URL` (`https://app.hubspot.com/landing-pages/`) and shows inline note that exact editor link was unavailable (FR-009, clarify Q4).

**Rationale**: Public Contact-facing URLs do not reliably encode portal editor paths — especially custom domains. Spec explicitly rejects separate admin URL field in Slice 3. Fallback keeps one-click staff workflow.

**Alternatives considered**:
- **Store admin URL separately** — rejected in grilling/clarify.
- **Disable button on failure** — rejected in clarify (Option B).
- **HubSpot API lookup by URL** — rejected: new integration scope, credentials, budget.

**Follow-up**: If UAT surfaces a stable public→editor pattern for Adaptavist portal, extend `tryResolveHubSpotPageEditorUrl` regex table; park unknown shapes in `Frontend/TODO.md` if needed.

---

## R-004: Resolved registration in UI

**Decision**: Pure function `resolveRegistration(program, event)`:

```
if event.registrationPageUrl (trimmed):
  url = event.registrationPageUrl
  publishState = event.registrationPublishState ?? 'draft'
  source = 'event'
else:
  url = program.registrationPageUrl
  publishState = program.registrationPublishState ?? 'draft'
  source = 'program'
```

Copy enabled only when `url` set **and** `publishState === 'published'`.

**Rationale**: Matches FR-002/FR-003 and clarify (no per-Event disable without override URL).

**Alternatives considered**:
- **Server-side resolve endpoint** — rejected: no new route; catalog tree already has both nodes.

---

## R-005: Registration panel edit scope (inline)

**Decision**:

| Panel context | Inline edit PATCH target | Fields |
| :--- | :--- | :--- |
| Event **without** override URL | `PATCH catalog/program/{programId}` | `registrationPageUrl`, `registrationPublishState` |
| Event **with** override URL | `PATCH catalog/event/{evId}` | `registrationPageUrl`, `registrationPublishState` |
| Admin clears override URL on Event | `PATCH catalog/event/{evId}` with `registrationPageUrl: null` | Falls back to Program resolution |

After save: `bumpCatalog()` so pickers + panel reflect latest values without second navigation.

**Rationale**: FR-006/FR-007 sync requirement; avoids PATCHing Program from an Event that has active override (would confuse source indicator).

---

## R-006: Settings view and RBAC

**Decision**: Embed `RegistrationPanel` in `SettingsView`; render only when `session.role === 'admin'`. Non-admins retain Settings (event details, other cards) without Registration panel (FR-013, clarify Q3).

Registration panel uses **catalog selection** (`useCatalogSelection`) — not legacy `fetchEvent(eventId)` mock for URL/state.

**Rationale**: Aligns with Check-in/Email catalog-scoped pattern. Mock “Public registration On/Off from event.status” removed — EMS `registrationPublishState` is separate from catalog Event `status`.

**Alternatives considered**:
- **Settings admin-only entirely** — rejected in clarify.
- **Dedicated `#/events/registration` route** — rejected: spec requires panel under Settings.

---

## R-007: Default publish state on first URL save

**Decision**: When `registrationPageUrl` transitions from unset → set and `registrationPublishState` omitted, backend + frontend default to **`draft`**.

**Rationale**: Clarify Q5 — prevents accidental copy on first paste.

**Implementation**: `Catalog.ts` merge helper sets `registrationPublishState: 'draft'` when URL newly provided without explicit state; modal/panel may show draft selected by default.

---

## R-008: Mock API behaviour

**Decision**: Mock catalog tree includes `registrationPageUrl` / `registrationPublishState` on sample Programs/Events; `USE_MOCK_API` supports full Registration panel flows including PATCH (extend mock catalog handlers).

**Rationale**: Consistent with 003/005 — slice UX testable locally before UAT.

---

## R-009: Walk-in distinction in UI

**Decision**: Registration panel shows note/link: “Walk-in form is configured separately on Check-in” when `walkInFormUrl` set; does **not** display walk-in URL as registration URL (FR-011).

**Rationale**: Clarify — different URLs by design; reduces staff confusion at desk.
