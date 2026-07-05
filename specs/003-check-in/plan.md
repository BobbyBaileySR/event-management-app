# Implementation Plan: Attendees & Check-in (Slice 1)

**Branch**: `003-check-in` | **Date**: 2026-07-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-check-in/spec.md`

## Summary

Deliver **Slice 1** attendee read + check-in write for a selected **Program + Event**: admin-only **Attendees** list, **Check-in** via name search and in-app QR scan, idempotent HubSpot attendance write via ScriptRunner. **Walk-in** deferred to a follow-on phase after SFTP and live schema smoke.

Build order: **Backend handlers + tests first**, then **Frontend data layer + mock**, then **views + sidebar**, then **polish + live validation**.

## Technical Context

**Language/Version**: TypeScript — ScriptRunner Connect ECMAScript 2020 + Node 20 (Jest); React 19 + Vite (Frontend)

**Primary Dependencies**: `@sr-connect/record-storage` (catalog read); HubSpot contact read/write adapters; `html5-qrcode` (npm); existing `catalogContext`, `dataService`, RouteGuard

**Storage**: HubSpot Contacts (attendance + Parts Attended); EMS catalog in Record Storage (Event `attendanceProperty`, Program form IDs)

**Testing**: Backend `Slice1Routes.test.ts`, `CheckInJwt.test.ts`, adapter tests; Frontend Vitest on views, QR panel, dataService mock path

**Target Platform**: ScriptRunner Connect + GitHub Pages (UAT branch → UAT Pages)

**Constraints**: Admin-only slice routes; JWT verify server-side; handler order unchanged; deploy Backend SFTP / Frontend Git

## Constitution Check

| Gate | Status |
| :--- | :--- |
| Security-governed write gate (schema verified before live write) | ✅ Schema doc 2026-07-05 |
| JWT alg-pinned + Event-id match | ✅ `CheckInJwt.ts` |
| No secrets in frontend | ✅ |
| RBAC admin on slice routes | ✅ `RouteGuard.ts` |
| XSS via JSX + Vitest hostile strings | ✅ view tests |
| Contract sync | ⏳ Merge [contracts/check-in-api.md](./contracts/check-in-api.md) → `Frontend/docs/api-contract.md` |
| Tests ship with behaviour | ✅ (partial happy-path gaps — see tasks) |

## Project Structure

```text
Backend/scripts/
  OnGetAttendees.ts
  OnCheckInScan.ts
  OnCheckIn.ts
  Utils/CheckInJwt.ts
  Utils/HubSpot/RegistrationAdapter.ts
  Utils/HubSpot/CheckInAdapter.ts

Backend/node/tests/
  Slice1Routes.test.ts
  CheckInJwt.test.ts

Frontend/src/
  views/AttendeesView.tsx
  views/CheckInView.tsx
  components/CheckInQrPanel.tsx
  services/dataService.ts
  data/mockData.ts
```

## Delivery Phases

1. **Foundational** — types, contract, RouteGuard, normalizers, mock layer
2. **US1** — attendee list (Backend GET + Frontend AttendeesView)
3. **US2** — check-in (Backend scan/confirm + Frontend CheckInView + QR panel)
4. **US3** — walk-in (deferred)
5. **Polish** — docs, changelogs, manual QA, SFTP, live smoke

See [tasks.md](./tasks.md) for the full checklist and current completion status.
