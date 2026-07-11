# Grilling brief — HubSpot custom objects + standalone Events

> **Purpose.** Seed a `/grilling` session (via `grill-with-docs`, backed by `domain-modeling`) for two
> changes that are really one decision. This brief is **not** a spec — it frames the interview.
> The grilling should output ADR(s) under `docs/decisions/` and updates to `CONTEXT.md` /
> `docs/hubspot-schema.md`. Turn the settled outcome into a speckit `specify → plan → tasks` afterwards.

## Why these two are one decision

- **Change 1** — Program and Event become HubSpot **custom objects**; registering an attendee = **associating
  a Contact to an Event**; attendee status likely lives on an **association label** (Registered → Checked-in);
  extra per-registration data (e.g. a **per-attendee-per-event JWT** for the QR scanner) must live *somewhere*.
- **Change 2** — Events must be able to exist **without a parent Program** (hierarchy stays valid but optional).

They are coupled because the *single hardest blocker* to standalone Events is that "who is registered" is
currently defined by the **Program's** `hubspotFormIds`. Change 1 dissolves that blocker: once registration is a
Contact↔Event association, an Event defines its own registrants and no longer needs a Program. **Grill them together.**

## Design vocabulary for this grilling

Use the `codebase-design` skill's vocabulary throughout, so the interview and any ADRs stay precise and
consistent with the architecture-review skill. Use these terms exactly — don't drift into "component",
"service", "API", or "boundary":

- **module / interface / implementation**, **depth** (deep = lots of behaviour behind a small interface),
  **seam** (where the interface lives), **adapter** (a thing that satisfies an interface at a seam),
  **leverage** (what callers get) and **locality** (what maintainers get).
- Apply **"one adapter = hypothetical seam, two = real"** directly: the current contact-workaround is the *first*
  `RegistrationAdapter` implementation (hypothetical seam); the `CustomObjectAdapter` is the *second* that proves
  the seam. Design its **interface** first, then what sits behind it.
- For the pivotal per-registration-storage choice (decision 1), consider running `codebase-design`'s
  **design-it-twice** pattern — design the adapter interface 3+ ways, then compare on depth, locality, and seam
  placement before deciding.

## Current state (grounded in the code — do not re-investigate from scratch)

- **Program/Event are EMS records in ScriptRunner Record Storage today — NOT HubSpot objects.** HubSpot is
  system of record for **Contacts** only. We fully own the catalog schema (`Utils/Catalog.ts`,
  `Utils/Types.ts`), so making `programId` optional needs no HubSpot migration by itself.
- **Registration is *derived*, not stored:** a Contact is "registered" if it submitted one of the Program's
  `hubspotFormIds` **and** its "Parts Attended" multi-select contains the Event's `partsAttendedOption`
  (`Utils/HubSpot/RegistrantEligibility.ts`, `ContactWorkaroundRegistrationAdapter.ts`).
- **Check-in status** = a **global** Yes/No Contact property (not per-Event); `checkedInAt` is hardcoded `null`.
  **No per-attendee-per-event storage exists anywhere.**
- **The migration seam already exists:** `RegistrationAdapter` / `CheckInAdapter` interfaces (ADR-005) exist
  precisely so a `CustomObjectAdapter` can be swapped in without touching routes or the frontend. But those
  interfaces are **read-registration + write-attendance-property only** — there is **no "register attendee"
  write method or route today**. This is net-new write capability.
- **The target design is already blessed** in the backend blueprint (Phase 1: *"Establish 'Events' Custom Object.
  Map association labels between Events and Contacts (e.g., Registered, Checked In, Cancelled)"*) and
  `docs/hubspot-schema.md` already stubs the open questions.
- **Program→Event coupling for standalone Events** is broad but mechanical (~10 layers): no flat Event index
  (events reached via `program.eventIds`), routes are `programs/{programId}/events/{evId}/…`, a route guard
  enforces `event.programId === program.id`, handler signatures take `programId` first, capacity/audit keys
  concatenate both IDs, and the frontend selection state / pickers / sidebar require both. Frontend URLs are
  flat and read scope from context, so the browser routing layer barely changes.

## Core decisions to resolve in the grilling

1. **Where does per-registration state live?** (the pivotal one)
   - (a) A dedicated **Registration join custom object** (Contact ↔ Event) owning `status`, `jwt`, `checkedInAt`,
     `attendeeType` — cleanest, most HubSpot-native, but a third object to model + migrate.
   - (b) **Association + association-level properties** — lighter, but constrained by our HubSpot tier (verify).
   - (c) **Record Storage keyed by `contactId+eventId`** — matches existing session/audit/capacity patterns; keeps
     per-registration data EMS-side rather than in HubSpot.
2. **Is status a lifecycle label or a property?** Association labels classify; they don't hold a JWT. Decide the
   status model (label vs `status` property vs both) and the allowed transitions (Registered → Checked-in →
   Cancelled? no-show?).
3. **Does the per-Event `attendanceProperty` survive** or get replaced by association/label reads? (open question
   already flagged in `hubspot-schema.md`).
4. **Standalone-Event shape:** `programId` becomes `string | null`; add a flat `catalog-event-index`; add
   `events/{evId}/…` route variants alongside `programs/{programId}/events/{evId}/…`; `resolveCatalogEvent`
   accepts a null program. Confirm this is the intended shape.
5. **Registration definition for a parentless Event:** with associations, registration = association existence.
   Confirm `hubspotFormIds` moves off Program (onto Event? optional at either level? retired?).
6. **JWT minting + persistence:** storing a per-registration JWT implies EMS (or HubSpot) now **mints** it.
   Minting is currently unbuilt (`BE-QR-GEN-001`); signing key is Parameters-only. Decide who mints, where the
   token is stored, and whether keys stay single-issuer (claim-scoped by `emsEventId`) or go per-event.

## Open questions to surface (not decide unilaterally)

- HubSpot **tier / feature availability** for custom objects + association-level properties (drives decision 1).
- **Migration/backfill**: existing Contact-property attendance + Parts-Attended data → new objects/associations;
  dual-read window? EMS catalog IDs stay stable and map to new HubSpot object IDs *inside the adapter only*.
- **RBAC** for the new "register attendee" write and any standalone-Event admin.

## Guardrails (must hold — don't let the grilling wander past these)

- **Portable backend boundary** (`ems-portable-backend.mdc`, ADR-006) + **adapter seam** (ADR-005) are the
  insertion points. New HubSpot access goes behind a `CustomObjectAdapter`, not sprinkled through handlers.
- **Security write-gate**: no HubSpot/Record-Storage write ships until, for that slice — schema verified against
  live HubSpot · RBAC defined · audit in place · input validation + rate limiting · handler order
  (session → RBAC → validate → rate limit → act → audit).
- **QR JWT rules**: verify server-side, pin `RS256`, reject `alg:none`, enforce expiry, match `emsEventId` claim;
  a valid JWT never writes without an authenticated `admin` session; signing key in Parameters only.
- **Contract discipline**: any new route/write must update `docs/api-contract.md`, `docs/rbac.md`,
  `docs/hubspot-schema.md`, and `Backend/scripts/Utils/RouteGuard.ts` together.

## Expected artefacts from the grilling

- **ADR** (in `docs/decisions/`) recording the per-registration storage model (decision 1) — hard to reverse.
- Possibly a **second ADR** for making Programs optional / standalone-Event routing.
- `CONTEXT.md` updates for new/sharpened terms: **Registration**, **association label**, **standalone Event**.
- `docs/hubspot-schema.md` updates answering its own stubbed open questions.
- Then: speckit `specify → plan → tasks`, split into the existing slice/write-gate cadence.

## Scope boundaries

- **In:** custom-object data model, registration-as-association, attendee status model, per-registration storage
  (incl. JWT), standalone Events, the routes/guards/index needed to support the above.
- **Out (for now):** the total UI revamp (separate track), JWT *minting* pipeline beyond deciding ownership,
  and any HubSpot workflow/automation config that lives in HubSpot rather than EMS.

## Reference map

| Topic | Files |
| :--- | :--- |
| Catalog model + index + guard | `Backend/scripts/Utils/Catalog.ts`, `Backend/scripts/Utils/Types.ts` |
| Registration = Program forms | `Backend/scripts/Utils/HubSpot/RegistrantEligibility.ts`, `.../ContactWorkaroundRegistrationAdapter.ts` |
| Adapter seam | `Backend/scripts/Utils/HubSpot/RegistrationAdapter.ts`, `.../index.ts`, `docs/decisions/005-hubspot-adapter-layer.md` |
| QR JWT | `Backend/scripts/Utils/CheckInJwt.ts`, `.cursor/rules/backend-security.mdc` |
| Routes / contract | `Backend/scripts/OnHttpRouter.ts`, `Frontend/docs/api-contract.md`, `Frontend/docs/rbac.md`, `Frontend/docs/hubspot-schema.md` |
| Frontend coupling | `Frontend/src/state/catalogContext.tsx`, `Frontend/src/components/CatalogPickers.tsx`, `Frontend/src/components/Sidebar.tsx`, `Frontend/src/App.tsx` |
| Vision / open questions | `Backend/project-blueprint.md`, `Frontend/docs/hubspot-schema.md`, `Frontend/CONTEXT.md` |
