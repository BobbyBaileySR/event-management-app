# Research: US3 Walk-in (003-check-in)

**Tranche**: User Story 3 only — HubSpot iframe embed on Check-in page  
**Date**: 2026-07-06  
**Spec**: [spec.md](./spec.md) (Session 2026-07-06 clarifications)

---

## R-001: Walk-in form rendering

**Decision**: Embed HubSpot registration form in an `<iframe>`; EMS does not render native form fields.

**Rationale**: HubSpot owns field discovery, validation, Contact create/update, Parts Attended, attendance, and form submission via form configuration and workflows. EMS becomes a thin shell — no duplicate write path, no schema-discovery blocker for `OnWalkIn.ts`.

**Alternatives considered**:
- **EMS-native form mirroring Program registration fields** — rejected: duplicates HubSpot UX, requires ongoing field parity, needs `POST …/walkin` backend (FR-015 forbids).
- **Redirect to HubSpot in new tab** — rejected: poor on-site desk UX; staff lose EMS context.

---

## R-002: Walk-in form URL storage

**Decision**: Optional `walkInFormUrl` on each **Event** catalog record; edited in **Event catalog modal** (create + edit); cleared via PATCH `null`.

**Rationale**: Walk-in is Event-scoped (Parts Attended option + attendance property differ per Event). Event modal already holds HubSpot mapping fields (`partsAttendedOption`, `attendanceProperty`); `walkInFormUrl` is the natural companion.

**Alternatives considered**:
- **Program-level URL** — rejected: one Program has many Events with different walk-in forms.
- **ScriptRunner Parameter** — rejected: not self-service for events team; conflicts with catalog admin model (001/002).

---

## R-003: HubSpot URL allowlist

**Decision**: Accept **HTTPS only**; host must match allowlist: `*.hubspot.com`, `*.hsforms.com`, `share.hsforms.com`. Validate on **frontend modal save** and **backend catalog POST/PATCH** (`400` / field error). Re-validate in Check-in view before setting iframe `src` (defence in depth for legacy bad data).

**Rationale**: Prevents open-redirect / arbitrary iframe embed (XSS/phishing surface). Aligns with production CSP `frame-src` (NFR-004).

**Alternatives considered**:
- **Any HTTPS URL** — rejected: CSP and security review would block arbitrary embeds.
- **Frontend-only validation** — rejected: spec requires backend `400` on catalog write (Session 2026-07-06).

**Implementation note**: Shared host-matching logic — suffix match for `hubspot.com` / `hsforms.com`; exact host for `share.hsforms.com`. Reject `http:`, missing host, userinfo, and non-443 implicit ports if parsed.

---

## R-004: Check-in page mode switch

**Decision**: Segmented control **Check-in | Walk-in** on Check-in page; default **Check-in**; visible only when Program + Event selected and user is **admin**. Walk-in mode hides search table + QR scanner; shows staff hint + iframe. Switching back unmounts iframe and restores US2 layout.

**Rationale**: Keeps US2 desk workflow unchanged; walk-in is an explicit staff mode for edge cases. Unmounting iframe stops background HubSpot load and allows QR scanner lifecycle rules (stop camera on leave Walk-in).

**Alternatives considered**:
- **Separate route `#/events/walk-in`** — rejected: splits desk UX; spec requires mode switch on Check-in page (FR-012).
- **Side-by-side iframe + search** — rejected: spec requires Walk-in view only (FR-013).

---

## R-005: Resolving `walkInFormUrl` in Check-in view

**Decision**: Extend **catalog selection context** with optional `walkInFormUrl` (and keep it in sync when `CatalogPickers` refetches). `CheckInView` reads `walkInFormUrl` from `useCatalogSelection()` — no extra API call.

**Rationale**: `GET catalog` already returns the full tree; pickers resolve the selected Event on every fetch/revision bump. Adding one optional field to selection avoids a second catalog fetch in Check-in.

**Alternatives considered**:
- **CheckInView calls `fetchCatalog()` independently** — rejected: duplicate fetch and drift risk vs pickers.
- **Dedicated `GET catalog/event/{id}`** — rejected: no new route needed; tree already includes Event metadata.

---

## R-006: Mock API behaviour

**Decision**: Walk-in iframe loads **real** HubSpot URL from catalog when set; `USE_MOCK_API` does **not** affect iframe behaviour (FR-016). Mock layer unchanged for attendee/check-in routes only.

**Rationale**: Walk-in has no EMS API surface; iframe is a direct browser → HubSpot interaction. Mock flag should not block on-site UAT with a real HubSpot form URL.

---

## R-007: CSP `frame-src` for HubSpot embed

**Decision**: Extend production CSP in `vite.config.ts` `frame-src` with `https://*.hubspot.com`, `https://*.hsforms.com`, `https://share.hsforms.com`. Do **not** widen `script-src` or `connect-src`.

**Rationale**: Browser blocks iframe load if `frame-src` omits HubSpot origins. Allowlist must match `walkInFormUrl` validation (NFR-004). Dev server keeps CSP off (existing HMR policy).

**Alternatives considered**:
- **`frame-src *`** — rejected: violates blueprint §3.6.
- **HubSpot script embed (non-iframe)** — rejected: widens `script-src`; iframe is spec-mandated.

---

## R-008: Backend scope for US3

**Decision**: **No** `OnWalkIn.ts`, **no** `POST …/walkin` route, **no** new slice write handler. US3 backend work is limited to **catalog field + validation** on existing `POST/PATCH catalog/event` handlers.

**Rationale**: FR-015; HubSpot form owns all walk-in mutations. Cancels prior tasks T043–T045 (EMS walk-in write) — replaced in `/speckit-tasks` tranche.

**Alternatives considered**:
- **EMS proxy submit** — rejected: duplicate HubSpot writes; higher scope and audit complexity.

---

## R-009: Staff post-submit UX

**Decision**: **Persistent static hint** above iframe (“After submit, check Attendees to confirm registration”). **No** `postMessage` listener, **no** auto-refresh of attendee list.

**Rationale**: HubSpot iframe origin prevents reliable cross-origin submit detection without fragile hacks. Staff manually refresh Attendees — matches on-site desk workflow (Session 2026-07-06).

---

## R-010: HubSpot configuration dependency (out of EMS)

**Decision**: Document in quickstart that HubSpot form must be configured to set Parts Attended, attendance, and form submission for the Program — EMS does not verify HubSpot-side config.

**Rationale**: EMS cannot introspect HubSpot form workflow rules; acceptance scenario 4–5 depend on HubSpot admin setup. QA validates end-to-end only when HubSpot form is correctly wired.
