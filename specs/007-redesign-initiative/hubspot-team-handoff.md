# HubSpot team handoff — Slice 007 custom-object attributes + associations

**For:** HubSpot admin · **From:** EMS build (Slice 007 Phase B) · **Env:** **UAT first** (promote same shape to Prod later) · **Date:** 2026-07-13

> The two custom objects already exist in UAT as shells. This doc lists **exactly** the attributes (properties) and associations to add so EMS can build against them. Property **internal names** below are our **proposed** names — if HubSpot can create them with these exact internal names, great; if not, create them and **send us the actual internal names** (see [§5 What to send back](#5-what-to-send-back)). Nothing here is destructive.

Source of truth once created: [../../docs/hubspot-schema.md](../../docs/hubspot-schema.md) § *Redesign custom objects*.

---

## 0. The objects (already created — for reference)

| Object | HubSpot name | Object type ID (UAT) | Primary display property |
| :--- | :--- | :--- | :--- |
| Program | Event Programs | `2-65757052` | Program Name (`program_name`) |
| Event | Event Items | `2-65757130` | Event Name (`event_name`) |

---

## 1. Properties to add — **Event Items** (`2-65757130`)

For each: create in the object's default property group (or an "EMS" group — your call). "Field type" is the HubSpot Settings → Properties field type.

| # | Internal name (proposed) | Label | Field type | Options / notes |
| :---: | :--- | :--- | :--- | :--- |
| 1 | `event_name` | Event Name | Single-line text | **Already exists** as primary display — no action, listed for completeness |
| 2 | `event_start` | Start | **Date and time picker** | Event start (date **and** time) |
| 3 | `event_end` | End | **Date and time picker** | Optional; used to auto-derive "Completed" when it has passed |
| 4 | `location` | Location | Single-line text | Optional |
| 5 | `capacity` | Capacity | **Number** (integer) | Optional; max attendees |
| 6 | `status` | Status | **Dropdown select** | Options (internal value → label): `active` → *Active*, `cancelled` → *Cancelled*. **Do not add a "completed" option** — EMS derives it from `event_end` |
| 7 | `publish_state` | Publish State | **Dropdown select** | Options: `draft` → *Draft*, `published` → *Published* |
| 8 | `walkin_form_url` | Walk-in Form URL | Single-line text | Optional; URL of the HubSpot walk-in form |
| 9 | `public_registration_url` | Public Registration URL | Single-line text | Optional; URL of the public registration page |
| 10 | `hubspot_owner_id` | Owner | **HubSpot user** (owner) | Standard owner field — enable if not already present |

---

## 2. Properties to add — **Event Programs** (`2-65757052`)

| # | Internal name (proposed) | Label | Field type | Options / notes |
| :---: | :--- | :--- | :--- | :--- |
| 1 | `program_name` | Program Name | Single-line text | **Already exists** as primary display — no action |
| 2 | `description` | Description | **Multi-line text** | Optional |
| 3 | `hubspot_owner_id` | Program Owner | **HubSpot user** (owner) | Standard owner field |
| 4 | `program_start_date` | Start Date | **Date picker** (date only) | Optional |
| 5 | `program_end_date` | End Date | **Date picker** (date only) | Optional |

---

## 3. Associations

### 3a. Program → Event (already created — please **confirm**)

| Property | Expected |
| :--- | :--- |
| Pairing | Event Programs ↔ Event Items |
| Cardinality | **1-to-many** (one Program groups many Events) |
| Association type ID | `286` |

Please confirm `286` is the correct type ID and the cardinality is 1-to-many. This is how an Event links to a Program — **we are not using a "program id" property**.

### 3b. Contact ↔ Event Items (**needs creating**)

Create a **Contact ↔ Event Items** association and add **two labels** on it. This is how "registration" and "attendance" are represented — the association *existing* means the Contact is registered for that Event.

| Label (display) | Purpose | Who sets it |
| :--- | :--- | :--- |
| **Registered** | Contact is registered for the Event | A HubSpot **workflow** (public/walk-in form submission) |
| **Checked in** | Contact has been checked in at the Event | **EMS** (flips Registered → Checked in; can undo) |

- Cardinality: **many-to-many** (a Contact can attend many Events; an Event has many Contacts).
- We only need these **2 labels** for now (well under the 10-label limit).
- We do **not** need `customer` / `partner` labels — attendee type stays on the existing Parts-Attended contact fields for now.

### 3c. Workflow-association test (blocking check — please help verify)

Before we build the check-in writes we must confirm a **HubSpot workflow can set the Contact ↔ Event "Registered" association**. Please either confirm this is possible on our tier, or build a small test workflow in UAT that, on a trigger of your choice, associates a test Contact to a test Event Item with the **Registered** label. If a workflow **cannot** set custom-object associations on our tier, tell us — it changes our registration approach.

---

## 4. Scopes / permissions

Please confirm the ScriptRunner Connect UAT connector (private app / OAuth) has read **and** write scopes for:

- Custom objects: **Event Programs** (`2-65757052`) and **Event Items** (`2-65757130`) — read + write.
- Associations — read + write (Program↔Event and Contact↔Event, including reading/writing labels).
- Contacts — read (already granted for existing slices).

---

## 5. What to send back

So we can wire up EMS (fill `HubSpotSchema.ts` + ScriptRunner Connect Parameters), please return:

1. **Confirmed internal names** for every property in §1 and §2 (especially if any differ from our proposed names).
2. **Contact ↔ Event association type ID** (§3b) → we store as Parameter `HUBSPOT_ASSOC_CONTACT_EVENT`.
3. **Label IDs** for *Registered* and *Checked in* (§3b) → Parameters `HUBSPOT_ASSOC_LABEL_REGISTERED` / `HUBSPOT_ASSOC_LABEL_CHECKED_IN`.
4. **Confirmation** of the Program→Event type ID `286` + 1-to-many (§3a).
5. Result of the **workflow-association test** (§3c): works / doesn't work.
6. Confirmation of **scopes** (§4).

Once we have 1–6 we can clear the last Phase B write-gates (`X-REDESIGN-004`) and start building.

---

## 6. Quick copy-paste summary (for a ticket)

```
Env: HubSpot UAT
Objects already created: Event Programs (2-65757052), Event Items (2-65757130)

ADD to Event Items (2-65757130):
  event_start        Date and time
  event_end          Date and time (optional)
  location           Single-line text (optional)
  capacity           Number/integer (optional)
  status             Dropdown: active | cancelled   (NO "completed" option)
  publish_state      Dropdown: draft | published
  walkin_form_url    Single-line text/URL (optional)
  public_registration_url  Single-line text/URL (optional)
  hubspot_owner_id   Owner (enable if missing)

ADD to Event Programs (2-65757052):
  description        Multi-line text (optional)
  hubspot_owner_id   Owner
  program_start_date Date (optional)
  program_end_date   Date (optional)

ASSOCIATIONS:
  Program -> Event : confirm type ID 286, 1-to-many
  Contact <-> Event Items : CREATE many-to-many + 2 labels: "Registered", "Checked in"
  Test that a WORKFLOW can set the Contact<->Event "Registered" label.

SEND BACK: confirmed internal property names, Contact<->Event association type ID,
label IDs for Registered/Checked in, scope confirmation, workflow-test result.
```
