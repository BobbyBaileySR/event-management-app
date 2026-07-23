# Research: QR Ticket Emails

**Feature**: 008-qr-ticket-emails
**Date**: 2026-07-16
**Prerequisites**: [ADR-010](../../docs/decisions/010-qr-ticket-email-single-send.md), [spec.md](./spec.md)

Most of what would normally be Phase 0 research here was already resolved by the `grill-with-docs` session and live HubSpot UAT spike behind ADR-010 (send mechanism, consent model, mint timing, image host, Campaign association). This file covers the **remaining unknowns** — the ones the grill/spike didn't reach because they're implementation-level, not architecture-level.

---

## R-001: QR image encoding inside ScriptRunner Connect's script sandbox — ✅ RESOLVED 2026-07-16

**Decision**: `qrcode-generator` (2.0.4), added to `Backend/package.json` dependencies. Output via `createSvgTag()` — SVG, not PNG, sidestepping any image-encoding step entirely.

**Verified locally (2026-07-16)**:
- `npm install qrcode-generator` adds exactly **1 package** — zero transitive dependencies.
- Source inspection of the installed `dist/qrcode.js` confirms **zero Node built-ins** (no `require(`, `process.`, `fs.`, or global `Buffer` usage — the one `buffer` reference in its source is the library's own internal bit-buffer class, unrelated to Node's `Buffer`).
- Encoded a realistic check-in JWT (560 chars, matching the real header/payload/RS256-signature shape) successfully at all 4 error-correction levels; also verified an 800-char payload (upper end of the documented ~550–800+ char range) — nowhere near Version 40's ~2953-byte ceiling at level `L`.
- ESM `import qrcode from 'qrcode-generator'` works correctly under the Backend's own `"type": "module"` config (tested from within `Backend/` so module resolution matched the real project, not an isolated scratch dir).
- `npm run lint` and `npm test` (293/293 passing) show zero regressions from the dependency addition.

**Rationale**: The Backend's portable-boundary rule (`ADR-006`) restricts non-`Platform/` `Utils/` code to Web-standard APIs only. `qrcode-generator`'s zero-dependency, zero-Node-builtin design satisfies that without needing any workaround. SVG output also avoids the harder problem of producing PNG bytes without Node's canvas/zlib bindings.

**Alternatives considered**:
- Node `qrcode` package (PNG output) — has Buffer/canvas-adjacent code paths; rejected in favor of the simpler, verified-clean SVG-only library.
- Generate the QR client-side (Frontend) and upload — rejected: signing key and full JWT must never reach the browser (`NFR-001`); ticket minting is server-side only.
- Vendoring the source directly into `Utils/` instead of an npm dependency — considered, but the user opted for the standard dependency route (easier to audit/update).

**Still open (cannot be resolved outside the real platform)**: confirm this exact code also executes inside the actual ScriptRunner Connect script sandbox, not just local Node — its bundler/transform behavior is unobserved from here. Low risk given the zero-dependency, ESM-compatible result above, but worth one live smoke-test during Phase 2 implementation (T009) rather than assuming.

---

## R-002: Setting `subcategory: "single_send_api"` on the QR-tagged template — ✅ RESOLVED 2026-07-16 (corrected)

**Decision**: **No API call needed at all.** The HubSpot email editor's creation flow includes an email **type/category choice** at the point of creating a new email — selecting the correct type there sets the send-eligibility field as part of normal UI authoring. Confirmed directly by the user: they created an email through the editor and were able to mark it eligible for API-driven (single-send) sending as part of that creation flow, with no API call involved.

This **supersedes** the original assumption below (kept for record — the initial live spike didn't distinguish "the field must be set via API" from "the field must be set via API *or* a UI choice we hadn't found yet"; it was the latter).

**Rationale**: Template authoring stays entirely inside the HubSpot Team's normal workflow — no engineering hand-off, no API-created email shell, no PATCH step. EMS's job is reduced to **detecting** the QR placeholder (unchanged — `research.md`'s original R-001/design intent) and, ideally, **validating** at dispatch time that the chosen template was actually created with the right type/category, so a mismatch fails with a clear error instead of a confusing HubSpot 400 at send time. That validation is a **read-only `GET`**, not a write — a materially smaller footprint than the PATCH this section originally proposed.

**Confirmed 2026-07-21, live UAT, against a real QR-tagged template that had already sent successfully**: `type: "MARKETING_SINGLE_SEND_API"` / `subcategory: "marketing_single_send_api"` — **not** `AUTOMATED_EMAIL` / `single_send_api`, the pair this doc and ADR-010 had assumed (from a 2026-07-16 spike that apparently tested a different creation path and never captured a literal working example). `EmailTemplatesAdapter.ts`'s eligibility check now recognizes both pairs (`SINGLE_SEND_ELIGIBLE_COMBINATIONS`) rather than trusting either one alone — see `Backend/CHANGELOG.md` 2026-07-21. Authoring guidance for the HubSpot Team: creating a new marketing email and picking the type/category that HubSpot itself labels for single-send/API-driven delivery is what produces this pair — no PATCH or other API step needed, consistent with this section's original "no API call needed at all" decision.

<details>
<summary>Original (superseded) proposal — attempt PATCH, fall back to API-created email</summary>

Originally proposed attempting `PATCH /marketing/v3/emails/{emailId}` once per dispatch job, falling back to creating the email via `POST /marketing/v3/emails` with the field set at creation if PATCH failed. Superseded — no PATCH or POST-based creation is needed; the UI creation flow already covers it.

</details>

---

## R-003: HubSpot Files upload/delete API for the transient QR image — ✅ RESOLVED 2026-07-16

**Decision**: Use the Files API (`POST /files/v3/files` for upload, `DELETE /files/v3/files/{fileId}` for cleanup), calling `HubSpot.fetch` **directly** (not through `HubSpotApiClient.ts`'s `hubspotFetch` wrapper — that wrapper only forwards string bodies, but the underlying Managed API's `fetch` natively supports `FormData` bodies; confirmed by reading `@managed-api/commons-core`'s type declarations and implementation directly, not assumed). Store the returned file id on the recipient's ticket record (see `data-model.md`) so Event-archive purge can delete the exact uploaded file, not just the Record Storage row referencing it.

**Verified live 2026-07-16** — upload `201`, delete `204`, full round trip against the real portal. Confirmed request shape (differs from this doc's original assumption — corrected against HubSpot's official API reference + Node SDK source, not guessed):

- `file`, `folderPath`, and `options` are **separate top-level multipart fields** — `folderPath` is **not** nested inside `options`. (Two earlier attempts nesting `folderPath` inside `options` both failed with `400 — "Either folderId or folderPath is required"`, regardless of whether `options` was sent as a plain string or a `Blob` typed `application/json`.)
- `options` (its own field, a JSON string) carries only `access` (`PUBLIC_INDEXABLE` | `PUBLIC_NOT_INDEXABLE` | `PRIVATE`), `overwrite` (boolean), and optionally `duplicateValidationStrategy`/`duplicateValidationScope`/`ttl`.
- Required scope: `files` (or `files.ui_hidden.write`) — confirmed present (no 403; only the 400s above, both resolved).
- `folderPath` auto-creates the folder if it doesn't already exist.

**Rationale**: Matches ADR-010 Decision #7 (HubSpot Files, purged on Event archive) — purge requires knowing which file to delete, so the id must be tracked somewhere durable. Reusing the same file across repeat dispatches to the same recipient (rather than re-uploading every send) keeps HubSpot Files lean, consistent with the "no HubSpot clutter" goal.

**Alternatives considered**:
- Re-upload a fresh file on every send, never track the id — rejected: leaves orphaned files in HubSpot Files after Event archive with no way to find and delete them.
- Extending `HubSpotApiClient.ts`'s `hubspotFetch` wrapper to support FormData — not needed; `FilesAdapter.ts` (T011) can call `HubSpot.fetch` directly for this one multipart call without touching the shared wrapper.

---

## R-004: Extending `SingleSendAdapter` for per-recipient image injection

**Decision**: Add an optional `contactProperties?: Record<string, string>` field to `SingleSendParams` (`Backend/scripts/Utils/HubSpot/SingleSendAdapter.ts`). `DispatchQueue.processDispatchJob`'s per-recipient loop passes the recipient's QR image URL under the fixed token property name when `job.ticketsEnabled` is true, and omits it otherwise — so the interface serves both ticket and non-ticket dispatches without branching adapter implementations.

**Rationale**: `HubSpotSingleSendAdapter` is currently an intentionally-throwing stub (`BE-EMAIL-SEND-001` — "wire the real HubSpot send path" is separately tracked, higher-risk work since it sends real email). This feature's build depends on that same file; extending its interface now, before either piece is implemented for real, avoids a second breaking interface change later.

**Alternatives considered**:
- A parallel `TicketSingleSendAdapter` — rejected: duplicates the entire per-recipient send/retry/idempotency plumbing `DispatchQueue.ts` already owns for the exact same HTTP call shape.

**Cross-reference**: `BE-EMAIL-SEND-001` (Backend `TODO.md`) must be resolved (or resolved together with this feature) before ticket dispatches can go live — both need the same real adapter implementation.

---

## Summary of what's genuinely still open at implementation time

| # | Item | Resolvable in planning? | Where it gets proven |
| :--- | :--- | :--- | :--- |
| R-001 | QR encoder runs in ScriptRunner sandbox | ✅ Resolved locally 2026-07-16 (`qrcode-generator`) | Live sandbox smoke-test still recommended during T009, low risk |
| R-002 | Setting `subcategory` on the template | ✅ Resolved 2026-07-16 — UI creation flow covers it, no API call needed | Confirm exact type/category label + author guidance during implementation |
| R-003 | Files API scope + upload/delete | ✅ Resolved live 2026-07-16 (upload 201, delete 204) | N/A, ready to implement |
| R-004 | `SingleSendAdapter` interface shape | Yes — decided above | N/A, ready to implement |

R-002's resolution **removes** a planned PATCH-based write from the design (see `plan.md`/`tasks.md` — the eligibility check becomes read-only validation, not a write). **All four research items are now resolved** — Phase 0 is complete; nothing blocks starting Phase 2.
