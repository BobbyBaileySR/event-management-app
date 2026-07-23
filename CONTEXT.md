# EMS domain glossary

Ubiquitous language for Adaptavist EMS. **Glossary only** — no implementation, API shapes, or storage choices. See `docs/hubspot-schema.md`, `docs/api-contract.md`, and `docs/decisions/` for technical detail.

> **Last updated:** 2026-07-21 (live event conversation notes grilling — **Conversation note** + [ADR-019](docs/decisions/019-live-event-conversation-notes.md)); previously same-day (lead-generation grilling — **Lead / Lead generation**, **Lead interest summary** + [ADR-018](docs/decisions/018-hubspot-lead-generation.md)); previously 2026-07-20 (registration-form bridge grilling — **Registration slot**, **Registration answer / Registration answer history** + [ADR-017](docs/decisions/017-registration-slots-and-answer-history.md); **Registration wave** entry updated to note what ADR-017 does/doesn't resolve); previously 2026-07-19 (data-caching grilling — **Cache**, **Stale-while-revalidate**, **Prefetch**, **Query key / cache invalidation** + [ADR-015](docs/decisions/015-client-data-caching-layer.md) / [ADR-016](docs/decisions/016-no-prefetch-of-audited-pii.md)); previously 2026-07-17 (Attendee Detail modal grilling — **Attendee journey** / **Attendee communications view** + [ADR-014](docs/decisions/014-attendee-communications-hubspot-engagement-pull.md); also 2026-07-17 **Attendee index** term, and 2026-07-12 UI-redesign grilling — target-model transition banner + [ADR-007](docs/decisions/007-hubspot-custom-objects-registration.md) / [ADR-008](docs/decisions/008-standalone-events-event-first-nav.md))

---

> ## Current model and historical Plan C terms
>
> The HubSpot custom-object/event-first model in [**Current event-first model**](#current-event-first-model) is the shipped model. [ADR-007](docs/decisions/007-hubspot-custom-objects-registration.md) and [ADR-008](docs/decisions/008-standalone-events-event-first-nav.md) shipped in July 2026; the legacy Program-scoped routes were retired 2026-07-16.
>
> The [**Historical (Plan C)**](#historical-plan-c) section below retains superseded vocabulary (Record Storage catalog, Parts Attended, Program-first nav). Where it conflicts with the current-model section, the current model wins.

---

# Historical (Plan C)

> Superseded workaround model (ADR-003 Plan C). Kept for reading older specs and changelogs only — not current product behaviour.

## Program

A top-level grouping of related **Events** (sub-events or “parts”) for one run of an event effort. Each calendar run is its **own Program** — e.g. **“Atlassian Event 2025”** and **“Atlassian Event 2026”** are **two separate Programs**, not two iterations of one Program.

EMS catalog supports **multiple Programs** from Phase 1 — **`admin`** can create several Program roots, each with its own **Events**.

Each Program has **one or more HubSpot registration form IDs** (the Program holds `hubspotFormIds` in the catalog). Contacts must submit **any** of those forms to satisfy the form leg of **Registered attendee** for Events under that Program.

Program display name, dates, and location are set in the EMS catalog admin UI (optional metadata fields) — not in HubSpot until custom objects exist.

---

## Event

A child item under a **Program** — a specific part or sub-event the team tracks separately (e.g. “Meeting Room”, “VIP Event”).

In the Plan C HubSpot workaround, each Event maps to an **option** on a Contact **Parts Attended** multi-select property (customer or partner track — see below), not to a HubSpot Event custom object. Each Event also stores an **`attendanceProperty`** — the HubSpot Contact property EMS updates on check-in.

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

# Shared and current terms

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

Historical Slice 3 design term for whether staff treat public registration as **draft** or **published**. Slice 3 is not implemented and must be re-planned against the current Event custom object's verified `publish_state` / `registration_form` fields; do not treat the earlier Program-inheritance model as current.

_Avoid_: Mirroring HubSpot page publish APIs in Slice 3; using Event catalog `status` (active/draft/cancelled) as a proxy for registration openness.

---

## Registration panel

Historical Slice 3 UI concept. No Event **Settings** view exists in the shipped app, and Slice 3 is not implemented. Re-plan its eventual event-scoped surface against Programs & Events / Event Details before building; it remains `admin`-only and must not become a standalone public-page builder.

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

**Partially addressed by [ADR-017](docs/decisions/017-registration-slots-and-answer-history.md) (2026-07-20):** the *data-loss* half of this pain is fixed — **Registration answer history** means no answer is ever silently destroyed when a later wave reopens the form. The *ergonomic* half is **not** fixed — amendments are still full-form resubmissions (ADR-017 decision #7), so a registrant must still re-tick and re-answer every previously-completed Event alongside the new one. "Second touch only for new Events" remains open.

---

## QR check-in app (separate from staff EMS)

A **separate application** historically handled QR generation for registrants and on-site scan/check-in. **Phase 1 EMS replaces that app entirely** — scan, Contact summary, and check-in button move into staff EMS, reusing the same ScriptRunner patterns (JWT validation, HubSpot read/write, signing key in Parameters).

**QR payload:** a **JWT** whose claims encode the Contact’s **HubSpot record UUID** and the **EMS catalog Event id**. Signed with a key stored in **ScriptRunner Connect Parameters** (not in the browser or frontend). On scan, ScriptRunner **rejects** the token if the JWT Event id does **not** match the **Event** staff have open in EMS — prevents check-in at the wrong sub-event when multiple Events exist under a Program.

**QR generation (pre-event email):** implemented 2026-07-16 per [ADR-010](docs/decisions/010-qr-ticket-email-single-send.md). Event+contact JWTs are lazy-minted at campaign send, selected through HubSpot template-snippet detection, sent via HubSpot Marketing Single-Send v4, and associated to the HubSpot Campaign for reporting. Remaining work is live UAT/operator governance and sign-off, not feature code.

**QR capacity (2026-07-07 QA):** check-in JWTs are **long** (~550–800+ chars). QR encoders must store the **entire** token. Tools that cap at ~400 characters produce scannable codes that fail verify (`invalid_checkin_signature`). See `docs/hubspot-schema.md` § QR payload size before building ticket/email QR generation.

**On scan (in EMS):** staff scan the QR in the EMS check-in module → EMS calls ScriptRunner → SRC validates the JWT, loads the Contact, and returns a **fixed summary** for staff (same fields for every Event): **name, company, email, account manager** *(HubSpot property names — see `hubspot-schema.md`)*. Staff confirm identity, then press **check-in**; SRC **writes back to HubSpot** to mark attendance.

This flow is **staff-mediated** (scan → review → button), not customer self-service check-in without staff action.

*HubSpot attendance properties verified — see `docs/hubspot-schema.md`. No check-in timestamp in HubSpot; duplicate check-in is idempotent (skip write if already `Yes`).*

---

## Check-in (during event)

Confirming a **Contact** as physically/virtually present at an **Event**. Staff channels include:

1. **QR scan** — in **staff EMS** (ported from the former separate check-in app): JWT → SRC validate → Contact summary → staff check-in button → HubSpot write.  
2. **Search by name** (no QR) — **substring (contains)** match on **name or company** within the registered attendee list for the working Event. If no match, staff use the Event's walk-in form.
3. **Walk-in** — HubSpot form embedded in EMS (see **Walk-in**).

For **pre-registered** contacts, check-in **only** updates attended/checked-in in HubSpot; registration is unchanged.

**RBAC:** attendee list, check-in actions (QR confirm, name search confirm, walk-in submit), **email dispatch** (Slice 2), and catalog admin all require the **`admin`** role. Other roles do not see attendee PII, check-in, or email modules until a future role split.

**Duplicate check-in:** **idempotent** — if the Contact↔Event association is already labelled `checked-in`, show **“already checked in”**; do not write HubSpot again.

---

## Walk-in

A person who arrives **without prior registration** (or without a scannable QR). Staff open the Event's allowlisted HubSpot walk-in form inside EMS. HubSpot owns the form submission and registration workflow; EMS exposes no walk-in POST handler. After the workflow creates/updates the Contact↔Event association, the attendee appears in the roster and can be checked in through the normal EMS action.

---

## Attendee list

The staff-facing list of **Registered attendees** (and checked-in state) for the working **Event**, backed by the Contact↔Event association and the derived **Attendee index**. A Program is optional. **`admin` role only** — same gate as check-in (includes email and account manager on each row).

**Columns (fixed, all Events):** name, company, email, account manager, **attendee type** (customer/partner), **checked-in status** — same field set as the QR check-in confirm screen, plus track and checked-in state.

**Default view:** **all registered attendees**; staff may **filter** by checked-in / not checked-in (optional). **Default sort:** **last name A→Z**.

---

## Attendee index

The Record Storage-backed cache the **Attendee list** is read from — one row per registered contact per Event, holding only the display fields the list/search/pagination need (name, company, email, account manager, checked-in state). Exists so `GET attendees` never re-fetches the full roster from HubSpot per request. Kept fresh by three mechanisms (write-through on EMS mutations, a HubSpot-Workflow webhook for registrations made outside EMS, and a scheduled reconciliation sweep) — see [ADR-011](decisions/011-attendee-index-freshness.md). Purely a derived cache: HubSpot stays system of record, so the index can always be rebuilt from HubSpot if lost.
_Avoid_: Attendee cache, roster cache — use **Attendee index** to keep it distinct from the **Attendee list** (the staff-facing UI feature this index backs).

---

## Attendee journey

The read-only per-attendee timeline shown in the **Attendee Detail modal** (opened by clicking a row on the **Attendee list**): this **Event's** registration step, this Event's **Email dispatch** sent/opened steps, and checked-in. Default/collapsed view — scoped to the single Event currently open, not the Contact's full history. See **Attendee communications view** for the expanded form.

_Avoid_: implying this shows the Contact's full communication history by default — that's the separate, explicitly-opted-into **Attendee communications view**.

## Attendee communications view

The expanded form of the **Attendee journey**, shown after staff click "Show all communications." Merges the Attendee journey with (1) this Contact's other **Email dispatches** across other Events, and (2) the Contact's full HubSpot marketing-email engagement history — decided [ADR-014](docs/decisions/014-attendee-communications-hubspot-engagement-pull.md). Anything not part of the currently-open Event is tagged: the other Event's name when it's known to be one of EMS's own dispatches, or a generic "OTHER DISPATCH" tag when it's a HubSpot send EMS never touched. Capped to communications at/after the attendee's earliest event-related timestamp (no separate pagination). Viewing it is an **audited** read — the first EMS surface that pulls PII beyond the currently-open Event/Program.

_Avoid_: "Campaign" in this view's copy — the full rename has not shipped (see **Campaign (partial rename)** below); keep saying **Email dispatch** in Attendee Detail until broader rename lands.

---

## Phase 1 MVP (staff EMS)

First shipped slice (stakeholder priority): **B**

1. Staff select a working **Event** (optionally grouped under a Program) and see its registered attendee list.
2. **During the event:** staff **check-in** in EMS via QR scan (camera in-app), name search, or walk-in — with updates **written back to HubSpot**. Replaces the former separate QR check-in app.  
3. **Programs & Events:** events team self-service to create/update/archive HubSpot **Programs** and **Events** — **`admin` role only**.

**Slice 1 shipped. Slice 2 shipped:** email dispatch, schedules, dispatch log, and QR ticket generation. **Slice 3:** HubSpot-hosted public registration pages (see **Slice 3 (public registration)**). Still deferred: second registration wave / form UX fix, post-event feedback, and opens/clicks analytics dashboard.

*QR JWT minting for registrant emails — settled by [ADR-010](docs/decisions/010-qr-ticket-email-single-send.md): EMS-driven, lazy-minted at Campaign send time (not HubSpot-driven, no registration webhook).*

*Check-in uses per-Event `attendanceProperty` from catalog — see `docs/hubspot-schema.md`.*

---

# Current event-first model

Vocabulary settled in the 2026-07-12 UI-redesign grilling and shipped in July 2026 after [ADR-007](docs/decisions/007-hubspot-custom-objects-registration.md) / [ADR-008](docs/decisions/008-standalone-events-event-first-nav.md) feasibility gates passed. These definitions describe **current** behaviour.

## Program

Optional grouping of related **Events** for a multi-part effort. **No longer mandatory** — an Event may stand alone with no Program ([ADR-008](docs/decisions/008-standalone-events-event-first-nav.md)). Becomes a **HubSpot custom object** ([ADR-007](docs/decisions/007-hubspot-custom-objects-registration.md)); catalog metadata lives on object properties. **Replaces** the Plan-C rule that every Event sits under a Program and that a Program holds registration `hubspotFormIds`.

## Event

The **primary entity**. May belong to a Program (optional `programId`) but does not require one — a **standalone Event** is fully functional (attendees, check-in, capacity, campaigns). Becomes a **HubSpot custom object**. **Retires** `partsAttendedOption` and the global `attendanceProperty`; keeps a **walk-in form reference** and **public registration URL**. **Replaces** the Plan-C Event (a Parts-Attended option under a Program).

## Registration / attendee

An attendee **is a Contact↔Event association**. Registration exists ⇔ the association exists. **Attendee lifecycle and type are association labels**: `registered`, `checked-in`, `customer`, `partner`. **Replaces** the Plan-C "two-leg" **Registered attendee** (Program form submission + Parts-Attended option) and the derived `attendeeType`.

## Association label

A HubSpot **association label** on a Contact↔Event association carrying attendee state/type (`registered`, `checked-in`, `customer`, `partner`). HubSpot has **no general "association properties"** (verified 2026-07-12 — labels only); richer per-registration detail lives in Record Storage instead.

## Registration slot

One of ten fixed, reusable hidden-property-plus-workflow pairs on the public registration form, each an independent copy of the single-event match-key mechanism, letting one form submission register a Contact for several Events at once. A slot is bound to whichever Event section is currently visible on the form — not to one Event permanently — so the same ten slots get repointed at different Events as the form's offerings change over time. Settled [ADR-017](docs/decisions/017-registration-slots-and-answer-history.md).
_Avoid_: "match-key property" as the primary term for the whole pairing — that's just the property half; **slot** is the property + its workflow together.

## Conversation note

A staff-authored note about a conversation with an attendee at an event, captured live (typed today; AI transcription explicitly deferred to a later phase — [ADR-019](docs/decisions/019-live-event-conversation-notes.md)). Attributed to the staff member who wrote it, timestamped. **Any `admin` may edit or soft-delete any note** (not author-locked — the first-considered author-only restriction was rejected in the 2026-07-21 gap review, since no other permission in this app carries per-user ownership) — every edit/delete tracks who made the change, and a delete hides rather than destroys the entry. Surfaced in a new "Notes" section on the existing Attendee Detail modal via its own dedicated, audited fetch (viewing notes is a PII read, tracked the same lightweight way as `attendees.list` — not bolted onto the unaudited base attendee-detail response), defaulting to the current event's notes with an opt-in expand to every event. Reachable via a new event-scoped nav item showing **checked-in attendees only** (narrower than Check-in's own full-roster list), with the same list-or-QR-scan pattern as Check-in.

_Avoid_: confusing this with **Registration answer** (public-submitted, immutable, append-only) or **Lead interest summary** (auto-derived from Registration answer history, set once, never edited) — a Conversation note is staff-authored, editable, and a distinct kind of content from both. At Lead generation, each Conversation note becomes its **own** separate HubSpot Note on the Lead's timeline — not merged into the Lead interest summary or its Note.

## Lead / Lead generation

**Lead** — a HubSpot Sales Hub CRM object, distinct from Contact and Deal, representing a person qualified as worth sales follow-up. Confirmed enabled on this portal. A Contact may have at most one EMS-generated Lead at a time — generating again for a Contact who already has one **updates** that Lead rather than creating a second.

**Lead generation** — the staff-initiated EMS action that creates or updates a Contact's Lead, carrying a **Lead interest summary** onto it. Single-attendee (Attendee Detail modal) and bulk (Attendee list multi-select) are the same underlying action at different selection sizes — settled [ADR-018](docs/decisions/018-hubspot-lead-generation.md).

_Avoid_: conflating this with **Registered attendee**/**registration** (the Contact↔Event association) — a Lead is a downstream sales artifact EMS optionally creates *from* an attendee, never a substitute for or trigger of registration itself.

## Lead interest summary

The content EMS writes onto a generated Lead describing what the attendee expressed interest in — sourced from **Registration answer history** ([ADR-017](docs/decisions/017-registration-slots-and-answer-history.md)). Defaults to the current Event's answer only; staff may opt to include the Contact's full cross-event history instead (that expanded read is itself an audited PII read, same as **Attendee communications view** — 2026-07-21 gap review). Written **once, at first creation only**, as a permanent "why this lead was created" record — never overwritten. Every generation afterward (including the first) logs a HubSpot **Note** on the Lead instead of growing this property, giving a native chronological history. Its presence (even empty, when the attendee has no recorded answer) is also how EMS tells its own Leads apart from ones created outside EMS — a Lead without it is never updated by EMS, only left alone in favor of creating a new one.

_Avoid_: assuming every Lead has a non-empty summary — attendance alone is a valid reason to generate one. Assuming this property reflects the *latest* event — it reflects the *first*; later activity lives in Notes.

## Registration answer / Registration answer history

**Registration answer** — the free-text or multi-select response to a conditional follow-up question shown when a specific Event is selected on the registration form (e.g. a private-meeting topic, guest names). Distinct from **registration** itself (the Contact↔Event association, which drives capacity/check-in) — an answer carries no roster or capacity meaning.

**Registration answer history** — every registration answer for a given Contact+Event, kept as an appended, timestamped log rather than the latest value overwriting the last (Record Storage, keyed `contactId+eventId`). A resubmission (**amendment**) adds a new entry even when the answer is unchanged — this is a submission log, not a diff. Surfaced to staff via the Attendee Detail modal's "Registration history" panel — settled [ADR-017](docs/decisions/017-registration-slots-and-answer-history.md).
_Avoid_: Assuming a missed webhook loses an answer permanently — the raw submission still exists in HubSpot's own Form Submissions history; recovery there is a manual staff lookup, not an automated EMS tool (deliberately not built, per ADR-017).

## Standalone Event

An Event with **no Program** ([ADR-008](docs/decisions/008-standalone-events-event-first-nav.md)). First-class; the redesign's **event-first navigation** lands staff on Events, with Program as an **optional filter/grouping** rather than a mandatory first step. **Replaces** the Plan-C Program-first navigation.

## Checked-in

Attendance is the **per-Event `checked-in` association label** (flip `registered` → `checked-in`; **undo** reverses it). Rich detail (`checkedInAt`, scan method, QR JWT/nonce) lives in a **Record Storage per-registration cache** keyed by `contactId + eventId`, **purged on Event archive**; the **audit log is the durable backstop** for "when". **Replaces** the Plan-C global Yes/No `attendanceProperty` on the Contact.

## Status

Event **status = Active / Cancelled** (set manually) + **Completed** (auto-derived once the end date passes). **Publish state** (registration draft/published) is tracked **separately** from status. **Replaces** the Plan-C `active/draft/cancelled` catalog status (drops `draft`).

## Remove attendee

Deletes the **Contact↔Event association only** (the Contact is untouched), **audited**, behind a confirm. **Blocked while `checked-in`** — staff must **undo check-in** first.

## Undo check-in

Error-correction only: flips `checked-in` → `registered`, **audited**. **Not** presence/check-out tracking. Distinct from the Check-in screen's **±1 Live Capacity** walk-out adjustment (occupancy, not registration state).

## Campaign (partial rename)

Grilling accepted renaming Slice-2 **"Email dispatch" → "Campaign"** (HubSpot marketing-term collision acknowledged). **UI today is mixed:** module/nav still say **Email** / **Email schedule**; compose uses **+ New campaign**; API/docs often still say dispatch. Treat **Campaign** as the target vocabulary for new copy; do not assume a full rename has shipped. Preserves Slice-2 richness — staff-entered name, timezone-aligned 15-minute scheduling, edit/cancel before lock, audience filtering, and a **campaign/dispatch log** with per-Contact outcome. Compose/edit live in a **modal**.

## Live capacity / occupancy

Two distinct capacity views, **both may exceed 100%** (overbooking shown, not capped): **Event Details "Filled %"** = registration fill (registered ÷ capacity); **Check-in "Live Capacity"** = occupancy (checked-in − walk-outs) with **±1** controls. The ±1 walk-out adjustment and **undo check-in** stay separate concepts.

## Archive vs delete

**Archive-by-default** for Programs/Events: a soft, restorable hidden flag; the record is **retained** for audit and historical attendee/check-in context. **Hard delete is permitted only for *empty* records** (no registrations/associations and no history). The redesign's "Delete" control is therefore **context-sensitive** — it archives when a record has history, and only offers a true delete when the record is empty.

## Walk-in

Walk-in is a **mode within Check-in** ("+ Add walk-in"). An **embedded HubSpot form (iframe) + workflow registers only** (creates the `registered` association) — it does **not** auto-check-in; staff then check the person in through the audited EMS path. **UX caveat:** there is a **propagation lag** between the HubSpot form submit and the new attendee appearing on the EMS roster (workflow + read latency), so the walk-in UI must set that expectation rather than imply an instant roster update.

## No bulk "import attendees"

The redesign's proposed **"import attendees"** action is **dropped**. Registration is **HubSpot-workflow-side** ([ADR-007](docs/decisions/007-hubspot-custom-objects-registration.md) §4) — EMS has no register/import write path; attendees enter via public forms or walk-in registration, not an EMS-side bulk import.

## Cache (client data cache)

An **in-memory, per-tab** store of recently fetched EMS data, so navigating back to a screen paints instantly instead of re-fetching from scratch. **Dies with the session** — cleared on sign-out and on signing in as anyone else; never written to disk. Settled in [ADR-015](docs/decisions/015-client-data-caching-layer.md). The browser still never holds HubSpot credentials; the cache holds only what the signed-in operator already fetched through the authenticated API.

## Stale-while-revalidate

The cache's refresh behaviour: on revisiting a screen, show the **previous data immediately** while quietly re-fetching the current data in the background, then swap it in. How stale is tolerable differs per data type — catalog tolerates minutes, capacity seconds, and **attendee lists and the audit log always re-fetch on every view** (see **Prefetch** for why).

## Prefetch

Fetching data **before** the operator navigates to the screen that shows it, so it's already warm. **Only non-PII data (catalog, capacity) may ever be prefetched.** Attendee and audit reads are **never** prefetched: every PII read is audited server-side as "this operator viewed this PII", and a speculative fetch would make the audit trail lie ([ADR-016](docs/decisions/016-no-prefetch-of-audited-pii.md)). **Audit integrity beats speed.**

## Query key / cache invalidation

Each cached fetch is identified by a **query key** (what data, for which Event, which page/filters). **Invalidation** marks keys as outdated after a mutation so affected screens re-fetch — e.g. a check-in invalidates that Event's attendee list and capacity everywhere at once. When in doubt the app **over-invalidates** (a spurious re-fetch is cheap; showing an operator stale data is not).
