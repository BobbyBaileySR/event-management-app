# EMS domain glossary

Ubiquitous language for Adaptavist EMS. **Glossary only** — no implementation, API shapes, or storage choices. See `docs/hubspot-schema.md`, `docs/api-contract.md`, and `docs/decisions/` for technical detail.

> **Last updated:** 2026-07-05 (HubSpot schema verified — dual Parts Attended tracks, attendance properties, multi-form Programs)

---

## Program

A top-level grouping of related **Events** (sub-events or “parts”) for one run of an event effort. Each calendar run is its **own Program** — e.g. **“Atlassian Event 2025”** and **“Atlassian Event 2026”** are **two separate Programs**, not two iterations of one Program.

EMS catalog supports **multiple Programs** from Phase 1 — **`admin`** can create several Program roots, each with its own **Events**.

Each Program has **one or more HubSpot registration form IDs** (the Program holds `hubspotFormIds` in the catalog). Contacts must submit **any** of those forms to satisfy the form leg of **Registered attendee** for Events under that Program.

Program display name, dates, and location are set in the EMS catalog admin UI (optional metadata fields) — not in HubSpot until custom objects exist.

---

## Event

A child item under a **Program** — a specific part or sub-event the team tracks separately (e.g. “Meeting Room”, “VIP Event”).

In the current HubSpot workaround, each Event maps to an **option** on a Contact **Parts Attended** multi-select property (customer or partner track — see below), not to a HubSpot Event custom object. Each Event also stores an **`attendanceProperty`** — the HubSpot Contact property EMS updates on check-in.

---

## Parts Attended

HubSpot Contact multi-select properties. Each **option** corresponds to an **Event** under a **Program** (e.g. “Meeting Room”, “VIP Event”).

Two **tracks** (verified 2026-07-05):

| Track | HubSpot property (internal name) |
| :--- | :--- |
| Customer | `atlassian_event___parts_attended` |
| Partner | `atlassian_event__partners__parts_attended` |

Both properties share the **same option values**. If a Contact has the customer property populated, they are a **customer**; if the partner property is populated, they are a **partner**.

**Multiple Programs in EMS share these HubSpot properties** — option labels map to Events per Program via the EMS catalog; **Program + registration form submission** disambiguate registration scope.

Option **labels can repeat across Programs** (e.g. “Meeting Room” on Atlassian Event 2025 and 2026). The label alone is **not** globally unique — always interpret together with the **Program** and that Program’s **registration form** submission.

EMS stores the option as **free text** on each Event (`partsAttendedOption`). Wrong text → no matching attendees.

---

## Program registration form

The HubSpot form(s) a contact must submit to be in scope for a **Program**. The Program catalog record holds **one or more form IDs** (`hubspotFormIds`). Submitting **any** of those forms satisfies the form leg of **Registered attendee**. **Walk-in** staff intake should submit a real HubSpot form when possible (iframe embed preferred — see walk-in spike).

*Walk-in field discovery — HubSpot embed or Forms API at runtime; not duplicated in EMS when embed works.*

---

## Registered attendee

A **Contact** who meets **both**, scoped to a specific **Program** and **Event**:

1. Has HubSpot activity showing they **submitted any of that Program’s registration forms**, and  
2. Has that **Event’s** option on **either** the customer **or** partner **Parts Attended** property (e.g. “Meeting Room”).

The attendee list **includes both tracks** and shows `attendeeType: customer | partner` per row.

Example: “Meeting Room” selected plus a form submission for **Atlassian Event 2025** only → registered for 2025’s Meeting Room **Event**, **not** for 2026’s Meeting Room — even though the option label is the same.

Someone with only the form, or only the multi-select value, is **not** a registered attendee for that Event under current rules.

---

## Checked-in attendee

A **Contact** marked as **attended** at an **Event** (on-site or virtual).

HubSpot stores attendance as **global** Yes/No select properties on the Contact (customer, partner, or VIP variants — see `hubspot-schema.md`). Each EMS **Event** catalog record specifies which property (`attendanceProperty`) EMS updates on check-in.

- **Pre-registered** (Program form + Parts Attended already satisfied): check-in **only** updates the attendance property to `Yes`; registration is left unchanged.  
- **Walk-in**: staff form → match or create Contact → Parts Attended + attendance + form submission in one flow (see **Walk-in**).

Distinct from **Registered attendee** who has not yet arrived.

---

## EMS event catalog

The staff-facing hierarchy of **Programs** and **Events** shown in EMS when HubSpot does not yet provide Program/Event objects. Two levels — **Program → Event**. Distinct from HubSpot Contact data; stored in **ScriptRunner Record Storage** (Plan C — see ADR-003).

**Maintenance:** **events team self-service** in EMS — a Settings or admin screen (**`admin` role only**) to create and update Programs (including HubSpot **form IDs**) and Events (including **Parts Attended** option mapping and **attendance property**). Viewers and other roles read the catalog through navigation but cannot edit it.

**Removal:** **archive / disable** — archived Programs or Events are **hidden from navigation** but **retained** in Record Storage for audit and historical attendee/check-in context (not hard delete).

---

## EMS navigation (staff)

Default staff flow: choose a **Program** (e.g. “Atlassian Event 2026”), then an **Event** part under that Program (Meeting Room, VIP Event), then modules such as attendees or check-in. Not a single flat event list without Program context.

---

## Staff EMS vs public registration

**Staff EMS** — Adaptavist-only UI (Google sign-in, ScriptRunner session). Used by the events team to view attendees, check-in, email ops, analytics. **Not** the public-facing registration website.

**Public registration** — Open webpage and HubSpot forms where **customers** sign up. Technology and hosting for this channel are **not decided** (manual site, generated page, HubSpot-hosted, etc.). May be optional per Program (“white glove” programs may skip mass outreach).

*Boundary for Phase 1 — to be confirmed: which parts of the ideal pre/during/post flow live in staff EMS vs HubSpot vs other tooling.*

---

## White glove registration

A Program where mass automated outreach (registration page blast, follow-up “sign up for other events” email) is **turned off** — customers are handled personally. **Not a HubSpot property or EMS catalog flag** — the events team knows which Programs are white glove. EMS Email module offers bulk send; staff simply skip it for white-glove Programs.

---

## Registration wave (multi-event form pain)

For one **Program**, the **first Event** is often open for registration long before other Events (venues unconfirmed). Today: one HubSpot form gains new pages when more Events open; HubSpot cannot hide pages conditionally, so registrants **re-enter data** for Events they already completed. Desired future: second touch only for **new** Events (e.g. email to first-wave registrants inviting additional sign-ups). **Technology TBD**; closely tied to HubSpot forms limits and $0 budget.

---

## QR check-in app (separate from staff EMS)

A **separate application** historically handled QR generation for registrants and on-site scan/check-in. **Phase 1 EMS replaces that app entirely** — scan, Contact summary, and check-in button move into staff EMS, reusing the same ScriptRunner patterns (JWT validation, HubSpot read/write, signing key in Parameters).

**QR payload:** a **JWT** whose claims encode the Contact’s **HubSpot record UUID** and the **EMS catalog Event id**. Signed with a key stored in **ScriptRunner Connect Parameters** (not in the browser or frontend). On scan, ScriptRunner **rejects** the token if the JWT Event id does **not** match the **Event** staff have open in EMS — prevents check-in at the wrong sub-event when multiple Events exist under a Program.

**QR generation (pre-event email):** **not confirmed for Phase 1.** Likely **HubSpot** (workflow/email) produces QR images or links; EMS may **control or trigger** that flow later — out of scope until decided. Phase 1 EMS scope is **scan, validate, display summary, check-in write** only.

**On scan (in EMS):** staff scan the QR in the EMS check-in module → EMS calls ScriptRunner → SRC validates the JWT, loads the Contact, and returns a **fixed summary** for staff (same fields for every Event): **name, company, email, account manager** *(HubSpot property names — see `hubspot-schema.md`)*. Staff confirm identity, then press **check-in**; SRC **writes back to HubSpot** to mark attendance.

This flow is **staff-mediated** (scan → review → button), not customer self-service check-in without staff action.

*HubSpot attendance properties verified — see `docs/hubspot-schema.md`. No check-in timestamp in HubSpot; duplicate check-in is idempotent (skip write if already `Yes`).*

---

## Check-in (during event)

Confirming a **Contact** as physically/virtually present at an **Event**. Staff channels include:

1. **QR scan** — in **staff EMS** (ported from the former separate check-in app): JWT → SRC validate → Contact summary → staff check-in button → HubSpot write.  
2. **Search by name** (no QR) — **substring (contains)** match on **name or company** within the **registered attendee list** for the selected **Program + Event** (e.g. `smith` or `acme`). If no match, staff treat them as a **walk-in**.  
3. **Walk-in** — staff form in EMS (see **Walk-in**).

For **pre-registered** contacts, check-in **only** updates attended/checked-in in HubSpot; registration is unchanged.

**RBAC:** attendee list, check-in actions (QR confirm, name search confirm, walk-in submit), and catalog admin all require the **`admin`** role. Other roles do not see attendee PII or check-in modules in Phase 1.

**Duplicate check-in:** **idempotent** — if the Contact’s attendance property is already `Yes`, show **“already checked in”**; do not write HubSpot again.

---

## Walk-in

A person who arrives **without prior registration** (or without a scannable QR). Staff complete a **walk-in form** in EMS. Required fields match the **public HubSpot registration form** for that **Program** (not a fixed minimal set in EMS). Then:

- **Existing Contact** (matched by **email**) → update HubSpot: **Parts Attended** (Event option) + **attended**, and record a **form submission** (or HubSpot equivalent) for that Program’s registration form — plus persist walk-in form field values on the Contact as needed.  
- **New Contact** → create in HubSpot with walk-in form data, set Parts Attended + attended, and record the Program **form submission**.

Walk-in therefore **waives** the normal two-step rule (Program form + Parts Attended) in one staff-mediated action — but HubSpot should still show the **form leg** for reporting via submission record.

**Contact matching:** **email only** — exact match on the Contact’s email property; if no match, **create a new Contact** in HubSpot.

---

## Attendee list

The staff-facing list of **Registered attendees** (and checked-in state) for an **Event** under a **Program**, derived from HubSpot rules plus EMS catalog mapping until HubSpot objects exist. **`admin` role only** — same gate as check-in (includes email and account manager on each row).

**Columns (fixed, all Events):** name, company, email, account manager, **attendee type** (customer/partner), **checked-in status** — same field set as the QR check-in confirm screen, plus track and checked-in state.

**Default view:** **all registered attendees**; staff may **filter** by checked-in / not checked-in (optional). **Default sort:** **last name A→Z**.

---

## Phase 1 MVP (staff EMS)

First shipped slice (stakeholder priority): **B**

1. Staff select **Program → Event** and see a **registered attendee list** (HubSpot-derived, read-only). Default: all registered; optional checked-in filter.  
2. **During the event:** staff **check-in** in EMS via QR scan (camera in-app), name search, or walk-in — with updates **written back to HubSpot**. Replaces the former separate QR check-in app.  
3. **Catalog admin:** events team **self-service** in EMS (Settings) to create/update **Programs** and **Events** (form IDs, Parts Attended mapping) — **`admin` role only** (viewers/operators use catalog read-only via navigation).

Deferred from Phase 1: public registration webpage, second registration wave / form UX fix, automated email sequences (confirmation, KBYG, **QR email generation**), post-event feedback, capacity/live exit tracking.

*QR JWT minting for registrant emails — **not confirmed**; likely HubSpot-driven, possible future EMS control.*

*Check-in uses per-Event `attendanceProperty` from catalog — see `docs/hubspot-schema.md`.*
