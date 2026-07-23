# Contract: Theme Preference API (Phase A)

**Feature**: 007 Redesign · **Phase**: A (unblocked) · **Date**: 2026-07-13

Per-user, cross-device theme preference. Small, non-PII, write-gated. On merge, fold these rows into [docs/api-contract.md](../../../docs/api-contract.md) + [docs/rbac.md](../../../docs/rbac.md) and add the matching rule to `Backend/scripts/Utils/RouteGuard.ts` (secure default: deny if missing).

**Conventions**: logical route via the `route` query parameter (legacy `X-EMS-Route` fallback); `Authorization: Bearer <sessionToken>`; JSON errors `{ "message": string, "code"?: string }`. See api-contract.md § Conventions.

---

## `GET user/prefs` · `X-EMS-Route: user/prefs`

Return the signed-in user's preferences. **Celebration is re-validated server-side**: if the stored theme is `celebration` and the user's email is not on the allowlist, the returned `theme` is `aurora`.

**Auth**: Bearer (any authenticated role).

**Response `200`:**
```json
{ "theme": "darkAurora", "celebrationAllowed": false }
```

- `theme`: resolved theme (`aurora` | `celebration` | `darkAurora`) after allowlist re-validation.
- `celebrationAllowed`: whether the switcher should offer Celebration for this user.

**Errors**

| HTTP | `code` | When |
| :---: | :--- | :--- |
| 401 | `unauthorized` | Missing/invalid session |
| 429 | `rate_limited` | Too many requests |

---

## `PUT user/prefs/theme` · `X-EMS-Route: user/prefs/theme`

Persist the user's chosen theme.

**Auth**: Bearer (any authenticated role).

**Request:**
```json
{ "theme": "darkAurora" }
```

**Response `200`:**
```json
{ "theme": "darkAurora", "celebrationAllowed": false, "updatedAt": "2026-07-13T10:00:00.000Z" }
```

- If `theme` is `celebration` and the user is **not** allowlisted → `403 celebration_not_allowed` (stored value unchanged); the client falls back to Aurora.

**Errors**

| HTTP | `code` | When |
| :---: | :--- | :--- |
| 400 | `validation_error` | `theme` missing or not one of the three enum values |
| 401 | `unauthorized` | Missing/invalid session |
| 403 | `celebration_not_allowed` | `theme=celebration` for a non-allowlisted email |
| 405 | `method_not_allowed` | Non-PUT method |
| 429 | `rate_limited` | Write rate limit exceeded |

**Handler order (write-gate)**: session → RBAC → validate (enum) → rate limit → persist. **No audit** required (cosmetic, non-PII — [ADR-009](../../../docs/decisions/009-redesign-ui-platform-theming-typography.md) §5).

**Storage key**: preference is keyed by the **Google account subject ID (non-PII)**, not the email — no PII is stored.

**Rate limit**: Parameter `USER_PREFS_RATE_LIMIT_PER_HOUR` (default **60 / user / hour**); exceeding returns `429 rate_limited`. Add to `docs/rbac.md` § Rate limits on merge.

---

## RBAC rows (for rbac.md)

| Route *(logical)* | Method | viewer | operator | communications | admin | Phase/Slice |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| `user/prefs` | GET | Yes | Yes | Yes | Yes | 007-A |
| `user/prefs/theme` | PUT | Yes | Yes | Yes | Yes | 007-A |

> All authenticated roles may set their own theme (self-scoped, non-PII). Celebration gating is enforced by allowlist re-validation, not by role.

## Frontend consumption

- `dataService.getThemePreference()` → `GET user/prefs`
- `dataService.setThemePreference(theme)` → `PUT user/prefs/theme`
- Mapping coverage in `dataService.test.ts`; the former runtime mock-data parity path was removed 2026-07-15.
