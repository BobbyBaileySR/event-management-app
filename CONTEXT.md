# EMS domain glossary

Ubiquitous language for Adaptavist EMS. **Glossary only** — no implementation, API shapes, or storage choices. See `docs/hubspot-schema.md`, `docs/api-contract.md`, and `docs/decisions/` for technical detail.

> **Last updated:** 2026-07-07 (Slice 3 — public registration grilling)

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

**Public registration** — Open webpage and HubSpot forms where **Contacts** sign up. **Slice 3** — pages are **built and hosted in HubSpot** (landing pages, forms, optional Breeze AI in HubSpot admin). EMS **does not** host or generate public pages; it stores **public registration page URLs**, shows them in the **Registration panel**, and links staff to HubSpot admin to edit. May be optional per Program (“white glove” programs may skip mass outreach).

---

## Slice 2 (email dispatch)

Staff send HubSpot **marketing email templates** to audiences scoped to a **Program + Event** — immediately or on a **schedule**. Includes ad-hoc sends, multiple schedules per Event, a **dispatch log** (who received what), and attendee filtering by past dispatches. **No EMS template builder** — templates are chosen from HubSpot only. **`admin` role only** (same gate as attendee list and check-in). Delivered as its own vertical slice after Slice 1.

_Avoid_: “Campaign” as the primary EMS term (HubSpot overload) — prefer **Email dispatch**.

---

## Slice 3 (public registration)

Staff link EMS to **HubSpot-hosted** registration landing pages for a **Program** — page creation (manual or **Breeze** in HubSpot admin) stays **outside** EMS. Slice 3 adds a **Registration panel** in staff EMS: resolved public URL, EMS **registration publish state**, copy link, and **Open in HubSpot** — no page builder. Form IDs remain on the Program catalog record (`hubspotFormIds`); **one public URL per Program** even when multiple form IDs exist (extra IDs are alternate/legacy forms, not separate public pages). Optional **Event override URL** when one part needs its own landing page. Distinct from **walk-in form URL** (staff-only HubSpot embed on Check-in). Separate vertical slice from Slice 2.

_Avoid_: Treating Slice 3 as EMS-hosted signup pages or Breeze integration inside EMS.

---

## Public registration page URL

The published HubSpot **landing page** where **Contacts** sign up for a **Program**. Stored on the **Program** catalog record; an **Event** may override with its own URL when that part needs a separate page. **Resolved registration URL** for staff UI: Event override if set, otherwise Program default. One URL per Program scope — multiple Program **form IDs** do not imply multiple public pages.

_Avoid_: Conflating with **walk-in form URL** (staff Check-in iframe) or raw HubSpot form embed/share links.

---

## Registration publish state

Whether staff treat public registration as **draft** or **published**. **EMS-owned** — staff set it when configuring URLs; EMS does not infer it from HubSpot. Lives on the **Program**; an **Event** with an override URL has its **own** publish state (independent of Program). Governs what the **Registration panel** shows and whether “copy registration link” is offered for that resolved URL. HubSpot remains where pages are actually published.

_Avoid_: Mirroring HubSpot page publish APIs in Slice 3; using Event catalog `status` (active/draft/cancelled) as a proxy for registration openness.

---

## Registration panel

Slice 3 staff UI section (under Event **Settings**) for the selected **Program + Event**: **resolved registration URL**, **registration publish state**, **copy link**, and **Open in HubSpot** (HubSpot admin page editor — **derived from the public URL** where HubSpot allows; no separate admin URL field in Slice 3). **`admin` role only** — non-admins do not see the panel or registration controls. Admins may edit URL and publish state **inline** on the panel; catalog Program/Event modals stay in sync. Does not build or host pages.

_Avoid_: “Registration settings” as a standalone top-level app — stays under event context; “Open in HubSpot” opening the public Contact-facing page as the only action.

---

## Walk-in form URL

Staff-only HubSpot form embed URL on each **Event** (`walkInFormUrl`) — used in Check-in **Walk-in** mode iframe. **Not** the public registration landing page; different URL by design (Slice 3 vs 003 check-in).

---

## Email dispatch

A single staff-initiated send (or scheduled send) of one HubSpot marketing template to a **dispatch audience**, scoped to a **Program + Event**. Every dispatch has a **staff-entered name** (no format rules) and a **system-generated id** for search, filter, and log correlation. Covers both **send now** and **scheduled** dispatches once they run.

_Avoid_: “Campaign” (HubSpot marketing term), “blast” (informal).

---

## Dispatch audience

Who receives an **Email dispatch** for a given **Program + Event**. Two scopes — **registered attendees** (in EMS) or **HubSpot contact segment** (beyond that scope):

**Registered attendees (EMS)** — audience is drawn only from **Registered attendees** for that Event. Staff use **first-class EMS filters and selection**: all registered, checked-in / not checked-in, search, and **manual multi-select** on the **Attendee list**. No HubSpot segment required.

**HubSpot contact segment** — when the audience must go **beyond** registered attendees for that Event. Staff pick a **HubSpot-defined segment** only; EMS does not accept free-text lists or ad-hoc Contact queries.

Segment-based sends may include Contacts who are **not** registered attendees for that Event — staff must understand that when picking a segment.

---

## HubSpot contact segment (dispatch audience)

A HubSpot **CRM → Segments** entry (verified in Adaptavist portal: **Active** and **Static** both exist) that staff attach as a **dispatch audience** when recipients are not limited to **Registered attendees** for the Event. Staff **choose by segment name** in EMS; EMS keeps the HubSpot **segment id** for sends and log correlation — ids are not shown in routine UI. Membership is evaluated in HubSpot at send time (Active segments refresh by rules; Static membership is fixed until updated in HubSpot).

_Avoid_: “List” as the primary EMS label — use **segment**; exposing raw HubSpot ids in the picker.

---

## HubSpot marketing email template

A **marketing email template** maintained in HubSpot (confirmed available in Adaptavist portal). Staff **choose by template name** in EMS for an **Email dispatch**; EMS keeps the HubSpot **template id** for send — ids are not shown in routine UI. EMS does not create or edit template content.

_Avoid_: Building templates in EMS; showing raw template ids in the picker.

---

## Scheduled dispatch

An **Email dispatch** queued to run at a future time. Multiple scheduled dispatches may exist per **Event**. Staff may **fully edit** or **cancel** a scheduled dispatch until processing **starts** (when the ScriptRunner cron picks it up). Once processing has started, **edit and cancel are blocked** — the dispatch runs to completion. The UI should **warn** when a dispatch is approaching its send window that editing and cancelling will soon be locked. After run, the dispatch is immutable and appears in the **Dispatch log**. Send times align to **15-minute intervals** (`:00`, `:15`, `:30`, `:45`) because processing runs on a ScriptRunner scheduled trigger.

**Timezone:** staff **choose the timezone** for each scheduled dispatch (e.g. `Europe/London`) so local event time is explicit; the UI converts to the stored instant accordingly.

---

## Dispatch log

The staff-facing record of **Email dispatches** for an **Event** — ad-hoc and scheduled (after they run) — including template, dispatch name/id, actor, time, audience summary, and **per-Contact** outcome. For Slice 2, per-Contact outcome is **`sent`** (successfully handed off to HubSpot) — bounces and delivery detail are out of scope. Staff use the log to answer “what went out for this Event?” and to **filter the Attendee list** by which dispatches a Contact received (or did not receive).

_Avoid_: Relying on HubSpot marketing UI alone as the only send history for EMS-initiated dispatches.

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

**QR capacity (2026-07-07 QA):** check-in JWTs are **long** (~550–800+ chars). QR encoders must store the **entire** token. Tools that cap at ~400 characters produce scannable codes that fail verify (`invalid_checkin_signature`). See `docs/hubspot-schema.md` § QR payload size and `Frontend/TODO.md` **FE-QR-GEN-001** before building ticket/email QR generation.

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

**RBAC:** attendee list, check-in actions (QR confirm, name search confirm, walk-in submit), **email dispatch** (Slice 2), and catalog admin all require the **`admin`** role. Other roles do not see attendee PII, check-in, or email modules until a future role split.

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

**Slice 1 shipped.** **Slice 2:** email dispatch, schedules, dispatch log (see **Slice 2 (email dispatch)**). **Slice 3:** HubSpot-hosted public registration pages (see **Slice 3 (public registration)**). Still deferred: second registration wave / form UX fix, post-event feedback, opens/clicks analytics dashboard, **QR email generation** in EMS.

*QR JWT minting for registrant emails — **not confirmed**; likely HubSpot-driven, possible future EMS control.*

*Check-in uses per-Event `attendanceProperty` from catalog — see `docs/hubspot-schema.md`.*
