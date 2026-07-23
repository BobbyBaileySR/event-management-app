# Frontend Changelog

All notable changes to the Adaptavist EMS frontend (UI, static assets, frontend docs, and Cursor rules in this folder).

Format: entries grouped by date (newest first). One bullet per logical change.

---

## 2026-07-23

### Security — v0.1 docs for BE-SEC-009 / 011 / 012 (also affects Backend)

- Synced `docs/api-contract.md` + `docs/rbac.md` (+ slice contracts): attendee detail now audited as `attendee.detail.view`; webhook association proof; note content max 8192. Parked `FE-SEC-008` (walk-in iframe) for later.

### Docs — park v0.1 full-tree security audit findings

- Ran a **full on-disk** Frontend + Backend security audit for the v0.1 release gate (not `/review-security` git-diff scope). **0 Critical/High**; **1 Frontend Medium** parked as `FE-SEC-008` (walk-in iframe sandbox + tighter HubSpot URL allowlist). Backend Mediums parked in `../Backend/TODO.md` (`BE-SEC-009`–`012`, sticky-role note on `BE-SLICE15-008`).
- Updated [DEVELOPMENT-GUIDE-FOR-BOBBY.md](DEVELOPMENT-GUIDE-FOR-BOBBY.md): stage before `/review-security`; note that release gates need a full-tree audit while incremental QA fixes use the skill.

### Feature: unlocked the Check-in "+" live-attendance correction (also affects Backend, `BE-CHECKIN-001`)

- **Why**: event staff wanted full control to correct live attendance up as well as down "where and when they see fit" — the "+" button was capped at `checkedInCount`, so staff couldn't correct the live count above it (e.g. a walk-in checked in through a side channel that hasn't landed in `checkedInCount` yet, but is physically on site).
- **Change**: [CapacityBar.tsx](src/components/CapacityBar.tsx) — `disableUp` no longer checks `value >= checkedInCount`; the "+" ("Correct one departure") control is now only disabled while a request is in flight, matching the corresponding Backend change (`Utils/Capacity.ts`/`CapacityStore.ts` — see `../Backend/CHANGELOG.md`) that dropped the matching `422 capacity_at_ceiling` server-side bound. Also reworded the manual-adjustment note for the new negative case — `manualAdjustmentCount` (from the API's now-signed `departureCount`) below zero now reads "Includes manual adjustment of 3 above checked-in" instead of a bare "-3".
- Tests: `CapacityBar.test.tsx`'s ceiling-disable case replaced with one asserting "+" stays enabled at/above `checkedInCount`; new case for the negative-adjustment copy. Full suite green (68 files / 603 tests), `tsc`/`eslint` clean.

### Fix: required modal fields had no visible marker

- **Why**: E2E testing found several required fields across modals gave no visual cue they were required until submit was blocked — only [CatalogProgramModal.tsx](src/components/CatalogProgramModal.tsx)'s "Program name" had a red `*` (`.requiredMark`, local to that module).
- **Change**: promoted the marker to a shared global class — `.required-mark` in [css/components.css](css/components.css) (same `--danger` color/weight) — and switched `CatalogProgramModal` to it, deleting its local duplicate. Added an optional `required?: boolean` prop to the shared pickers ([CalendarPicker.tsx](src/components/pickers/CalendarPicker.tsx), [SelectPicker.tsx](src/components/pickers/SelectPicker.tsx), [TimePicker.tsx](src/components/pickers/TimePicker.tsx)) that renders the same marker next to the picker's own label plus `aria-required` on the trigger button, since their `label` is a plain string prop (no way for a call site to inject a marker itself). Applied the marker to every field that's actually enforced as required (HTML `required`, an inline "X is required" validation error, or blocks the submit button when empty):
  - [CatalogEventModal.tsx](src/components/CatalogEventModal.tsx): Event name, Start Date.
  - [EmailDispatchView.tsx](src/views/EmailDispatchView.tsx): Template (compose + edit), HubSpot list (when that audience source is chosen), Schedule Date/Time, and the edit modal's Dispatch name (a plain input previously missing `required`/`aria-required` entirely — `docs/api-contract.md` already documents it as "Required non-empty string"). Left every genuinely optional field alone (Description, Owner, Location, Capacity, Walk-in form URL, Status, Publish state, the disabled Program-owner picker, etc.) — none of those block a save.
- Tests: `CatalogProgramModal.test.tsx`'s existing assertion now checks the shared `.required-mark` class instead of the deleted local one; `CatalogEventModal.test.tsx`'s `getByLabelText('Event name')` calls became `/^Event name/` (the label's accessible text now includes the marker, matching the convention `CatalogProgramModal.test.tsx` already used for "Program name") and a new case asserts exactly two markers (Event name, Start Date) render; new `EmailDispatchView.test.tsx` case asserts the compose modal's Template field carries the marker and `aria-required`.
- **Follow-up same day — two bugs the above introduced, both caught before merge:**
  1. **Broken alignment**: adding the marker to CalendarPicker's Start Date label visibly broke — the `*` dropped to its own line, pushing the date field lower than the paired Start Time field. Root cause: `CatalogEventModal.module.css`'s `.form label` rule is a *descendant* selector — CSS Modules only hashes the `.form` class, not the bare `label` type, so it was unintentionally reaching into and reflowing CalendarPicker/SelectPicker/TimePicker's own internal `<label>` too (`display: flex; flex-direction: column` split the label's two children, text and marker, onto separate lines) — invisible before because those pickers' labels only ever had one child (their own text). Reproduced with an isolated static HTML/CSS repro in-browser before touching source, confirmed the fix the same way. Changed to `.form > label` (direct-child) in both `CatalogEventModal.module.css` and `CatalogProgramModal.module.css` (same latent bug there, not yet triggered since its pickers don't use `required` today) — scopes the rule to the modals' own plain labels (Event name, Owner, Location, …) without reaching into a nested picker's internals.
  2. **Invisible marker**: `EmailDispatchView.module.css` visually hides `.templatePicker`/`.segmentListPicker`'s built-in `<label>` entirely (`position: absolute; width: 1px; height: 1px; overflow: hidden`) in favor of a visible section title above — so the marker I'd nested *inside* that `<label>` was hidden along with it, on Template and HubSpot list specifically. Fixed generally rather than special-casing those two fields: `CalendarPicker.tsx`/`SelectPicker.tsx` now render the marker as a **sibling** of `<label>` (both wrapped in a plain inline `.labelRow` span, new in `Pickers.module.css`) instead of a child, so no consuming module's `label`-targeting CSS can hide it. Confirmed both call sites (visible-label and hidden-label) render correctly via the same repro before applying to source.
- Full suite green (68 files / 602 tests), `tsc`/`eslint` clean.

### Fix: newly created Program/Event needed a manual page refresh to appear in Programs & Events

- **Why**: E2E testing found that creating a Program or Event from the modal wrote it to HubSpot correctly, but the row didn't appear until the browser was manually refreshed. Root cause: `handleProgramSave`/`handleEventSave` in [EventsView.tsx](src/views/EventsView.tsx) already called `invalidateAfterCatalogChange` (invalidate + forced refetch of the active `catalog` query) right after create — but that refetch hits HubSpot's list-read endpoint, which can briefly lag right after a brand-new object is created, so the refetch would come back without the just-created row. A later manual refresh worked only because enough time had passed for HubSpot's list read to catch up.
- **Change**: `createProgram`/`createEvent` already return the created record in their response — `handleProgramSave`/`handleEventSave` now write that record straight into the `catalog` query cache (`upsertCatalogRecord`, new helper) immediately after `refreshCatalog()` resolves, so the just-created row is guaranteed to be present regardless of HubSpot's list-read timing. Applied after the refetch (not before) so the refetch can't stomp the optimistic entry with its own lagging response.
- Tests: new case in `EventsView.test.tsx` — "shows a newly created Program immediately, even if the follow-up catalog refetch has not caught up yet" — mocks `fetchCatalog` to keep returning the pre-create dataset on every call (simulating the HubSpot lag) and asserts the new Program still renders. Full suite green (68 files / 600 tests).

### Fix: tablet rail's working-event control was an unlabeled icon with no context

- **Why**: the icon rail's working-event affordance was a plain 🗓️ icon button — unclear what it did, and gave no indication of *which* event (if any) was currently selected once the nav was collapsed to the rail.
- **First attempt (superseded same day, see below)**: widened the rail from 64px to 124px and turned that one row into a chip showing the truncated event name. User feedback: the widened rail itself was the problem — "made the sidebar way too [w]ide" for only ~9 characters of payoff.
- **Options presented for the redo**: (a) revert to 64px icon-only and surface the working-event name in `TopBar` instead (visible on every breakpoint, not just tablet), (b) 64px icon-only + a plain selected/unselected status dot (no name shown anywhere), (c) 64px icon-only + a tap-to-preview flyout popover, (d) (a)+(b) combined. **User chose (a).**
- **Change**:
  - [IconRail.tsx](src/components/IconRail.tsx)/[.module.css](src/components/IconRail.module.css) reverted to the original 64px icon-only rail — the working-event button is a plain 44px icon again (`eventName` still feeds its accessible name/tooltip for screen-reader/hover users, just not shown visually).
  - `TopBar` ([TopBar.tsx](src/components/TopBar.tsx)/[.module.css](src/components/TopBar.module.css)) gained an optional `workingEvent` pill ("Working on: **Meeting Room**") rendered under the title/meta — visible at every chrome tier (desktop/tablet/phone), not just where the picker happens to collapse.
  - Wired `workingEvent={eventName}` (via the existing `useWorkingEventMeta` hook) into the three event-scoped views whose own title/meta said nothing about which event they were scoped to: [AttendeesView.tsx](src/views/AttendeesView.tsx), [CheckInView.tsx](src/views/CheckInView.tsx), [ConversationsView.tsx](src/views/ConversationsView.tsx) (including their loading/error states via `ViewErrorState`'s new `workingEvent` prop). `EventHubView` and `EmailDispatchView` were deliberately left alone — both already show the event name prominently in their own body/title, so an extra pill there would just duplicate it.
- Tests: `IconRail.test.tsx` reverted to icon-only expectations; new `TopBar.test.tsx` cases (renders/omits the pill, XSS guard); new "shows the working event in the TopBar pill" case added to `AttendeesView.test.tsx`/`CheckInView.test.tsx`/`ConversationsView.test.tsx` (the latter two needed a `fetchCatalog` mock added to their data-service fixture, since neither previously exercised `useWorkingEventMeta`). Full suite green (68 files / 599 tests). Verified in-browser at 900px: rail back to 64px, icon-only.

### Fix: tablet-portrait polish pass (theme dot, Check-in icon, Check-in/Conversations layout)

- **Theme switcher dot** — Dark Aurora's swatch dot (`--theme-swatch-dark-aurora`, `css/tokens.css`) was identical to Aurora's (`#FF6633`), because Dark Aurora's real `--accent` genuinely is the same brand orange (`theme-dark-aurora.css`) — not a copy-paste error, but it made the two dots indistinguishable in the switcher. Changed the swatch (display-only; the real `--accent` role token is untouched) to Dark Aurora's `--surface` tone (`#0B0E1A`) so the dot itself reads as "the dark theme."
- **Check-in rail/tab-bar icon** — `Check-in`'s icon (`src/config/eventModules.ts`) was the bare glyph `✓`, which renders at a different size/weight than the pictograph emoji used everywhere else (📊🏢📋👥✉️💬), reading as misaligned in `IconRail`/`MobileTabBar`. Changed to `✅` to match.
- **Check-in "Start scanner"/"+ Add walk-in" button misalignment** — the two action cards can hold a different amount of description text, so their buttons landed at different heights even though the cards themselves were equal height (flex row's default `align-items: stretch`). [CheckInView.module.css](src/views/CheckInView.module.css): `.actionColumn > .card` is now a column flex container with its button pinned to the bottom (`margin-top: auto`), so both buttons sit level regardless of description length.
- **Large dead gap above the Attendees/Conversations list at tablet width** — [CheckInView.module.css](src/views/CheckInView.module.css) and [ConversationsView.module.css](src/views/ConversationsView.module.css)'s `≤900px` layout stacks the action card(s) above the list but never sized the two rows — both defaulted to `auto`, and since `.layout` itself is flex-stretched to fill available height, the leftover space collected as dead space between them instead of growing the list. Added `grid-template-rows: auto 1fr` (action row content-sized, list row takes the rest) and `align-items: stretch` (overriding the unconditional `align-items: start` that's correct for desktop's side-by-side columns) so the list card fills its row. Also removed the `max-height: min(50vh, 420px)` cap on `.resultsScroll` at this breakpoint — the card's own height (from the 1fr row) now bounds it instead of an arbitrary viewport fraction.
- Verified with a CSS-only repro (isolated, real selectors) at 810×1080: buttons align, gap gone, no regression at ≥901px (desktop keeps its unbounded-except-520px-cap column layout, untouched). No test changes — CSS/config only; full suite still green (68 files / 591 tests).

### Feature: 3-tier responsive shell chrome — icon rail + drawer (tablet), top tab bar (phone)

- **Why**: the sidebar tablet fix earlier today (below) patched a real visual bug, but the user flagged that it didn't match the actually-agreed design. `Frontend/design_handoff 2/README.md`/`DESIGN-CONTEXT.md` — the authoritative visual source of truth per the [007-redesign spec](specs/007-redesign-initiative/spec.md) — has always specified: desktop ≥1024px full sidebar, **tablet 768–1023px a 64px icon rail + hamburger-triggered slide-out drawer**, **phone <768px a top horizontal tab bar** replacing the sidebar/rail entirely. The shipped shell instead had one 900px breakpoint that just stacked the full labeled nav on top for both tablet and phone — never tracked as an intentional simplification, just missed. Confirmed against the interactive prototype (`design_handoff 2/Event Management System.dc.html`) and its screenshots.
- **Change**:
  - New `useSidebarNavItems` hook (`src/hooks/useSidebarNavItems.ts`) — single source of truth for nav items/role-gating/active/disabled state, shared by `Sidebar`, `IconRail`, and `MobileTabBar` so the three chrome variants can't drift apart.
  - New `IconRail` (tablet icon-only rail + hamburger), `NavDrawer` (slide-out overlay — `role="dialog"`, focus trap via the existing `useModalFocusTrap`, Escape/backdrop-click/× to close, wraps `Sidebar variant="drawer"`), and `MobileTabBar` (phone horizontal scrollable tab row + inline `WorkingEventPicker` row + theme row) components.
  - `ThemeSwitcher` gained a `variant` prop (`list` default / `row` phone tab bar / `compact` icon-dot-only tablet rail, `sr-only` label kept for screen readers) — replaces the narrower interim `@media` hack from the superseded fix below.
  - New `useViewportTier` hook (`src/hooks/useViewportTier.ts`) drives which of the three `AppLayout` mounts — deliberately JS (`window.innerWidth` + resize listener), not CSS `@media`: this project's jsdom/vitest environment does not evaluate `@media` conditions at all (verified empirically — computed style always reflects a rule's unconditional base, never a media-gated override), so a CSS-only tier switch would render all three chrome variants simultaneously under test and can't be asserted on. `AppLayout` also auto-closes the drawer if a resize carries the viewport out of the tablet tier while it's open.
  - `Sidebar` unchanged at the desktop tier (same DOM/classes — all 29 pre-existing tests pass unmodified); gained a `variant="shell" | "drawer"` prop for the drawer-embedded case.
  - Removed the now-superseded `@media (max-width: 900px)` stacking block from `Sidebar.module.css`/`ThemeSwitcher.module.css`. Shell-level breakpoints in `AppLayout.module.css`/`TopBar.module.css` moved from the old single 900px cutover to 1024px (matching the new tier boundary) for the visual padding tweaks that still apply there; per-view content breakpoints (`AttendeesView`, `CheckInView`, etc.) are untouched — separate concern, not part of the shell.
- **Deferred/pragmatic calls** (see `TODO.md`): the phone tier has no pixel reference in the design handoff (its own README says so) — its layout (tab row, working-event row, theme row) follows the README's textual spec, not a screenshot. Dead legacy `#app-layout`/`.nav-items` selectors in `css/layout.css` (pre-React, unused) were left alone — out of scope for this change.
- Tests: new `useSidebarNavItems.test.tsx`, `useViewportTier.test.ts`, `IconRail.test.tsx`, `NavDrawer.test.tsx`, `MobileTabBar.test.tsx`, plus an `AppLayout` "3-tier responsive chrome" describe block (tier switching, drawer open/close). Full suite green (68 files / 591 tests), `tsc --noEmit` clean, lint clean. Manually verified all three tiers (1280/900/390px) plus drawer open/Escape-close/focus-return in a live browser session against a temporary auth-bypassed preview harness (deleted after verification — real Google/HubSpot auth isn't reachable in this sandboxed environment).

### Fix: Attendee Detail modal had two buttons both accessibly named "Close"

- **Why**: found incidentally while running the full Frontend suite for the sidebar tablet fix (unrelated). `AttendeeDetailModal.test.tsx` tolerated it via `getAllByRole`, but `AttendeesView.test.tsx`'s "opens the Attendee Detail modal when a row is clicked outside the action-button cell" test used `getByRole('button', { name: 'Close' })` (singular), which failed once the 2026-07-22 redesign added a footer Close button alongside the existing header icon "×" button (`aria-label="Close"`).
- **Change**: header icon button's `aria-label` in [AttendeeDetailModal.tsx](src/components/AttendeeDetailModal.tsx) changed to `"Close attendee detail"` so the footer "Close" button is the sole element named "Close". No visual change.
- Verified: full Frontend suite green (68 test files / 591 tests).

### Fix: sidebar Theme switcher broken at tablet widths (≤900px) — superseded same day

- **Superseded** by the 3-tier responsive shell rebuild above, later the same day — that replaced the single 900px stacking breakpoint entirely, so this fix's `@media (max-width: 900px)` blocks no longer exist. Left here for the record of what was tried first and why.
- **Why**: reported app-wide tablet bug — reproduced with a standalone harness rendering the actual `Sidebar`/`ThemeSwitcher` CSS at 810×1080. Root cause was two-fold: (1) `.footer p { flex: 1 1 160px }` (specificity 0,1,1) was beating the bare `.sectionLabel` mobile rule (0,1,0) that should have put "Theme" on its own full-width row like `WORKING EVENT` does, so the label stayed inline; (2) `ThemeSwitcher` had no responsive styles at all, so its 3 options stayed a narrow fixed-width vertical column stranded mid-row in the now-horizontal footer, with large empty gaps either side.
- **Change**: added `.footer .sectionLabel { flex: 1 0 100%; }` in [Sidebar.module.css](src/components/Sidebar.module.css) to win on specificity and give "Theme" its own row. Added a `@media (max-width: 900px)` block to [ThemeSwitcher.module.css](src/components/ThemeSwitcher.module.css) turning the vertical option list into a wrapping horizontal pill row (matching the existing nav-item mobile treatment).
- Verified in-browser at 810×1080 (fixed) and 1280×900 (desktop layout unchanged, no regression). No test changes — this is CSS-only; existing `Sidebar`/`ThemeSwitcher` Vitest suites still pass (24/24).

## 2026-07-22

### Docs — HubSpot + EMS travel form story for Events walkthrough

- Added [story/hubspot-plus-ems-travel-form.md](../story/hubspot-plus-ems-travel-form.md): draft hybrid story (HubSpot registration stays default; EMS travel form for EMS-only fields), how Events would enable the form, public URL patterns, phased MVP sketch, and open questions for Events/Travel. Not a build spec.

### Attendee Detail modal — tighter header + taller default height

- Fixed the large gap under the header subtitle: global `.modal p { margin-bottom: 20px }` was beating the module `.subtitle` rule (same bug CatalogEventModal already documented). Selector is now `.modal .subtitle`.
- Raised max-height from a 720px cap to `calc(100vh - 32px)` so typical Registered/Conversations content does not force an immediate scrollbar.

### Attendee Detail modal — context-specific sections + Create lead footer

- **Why**: the same modal was used on Registered Attendees and Conversations, so Conversations incorrectly showed HubSpot Lead, Attendee Journey, and Registration History, while Registered showed a mid-body "Generate Lead" block instead of the designed footer action.
- **Change**: `AttendeeDetailModal` takes a required `variant` (`registered` | `conversations`). Registered keeps Basic Information, Attendee Journey, notes **history only**, Registration History, and a footer **Create lead** (primary) + Close with the cross-event history checkbox. Conversations keeps Basic Information, notes input + history, and a Close footer only.
- `ConversationNotesPanel` gains `mode="compose" | "history"` — history hides add/edit/delete; compose keeps capture (Save note).
- "Show all communications" restyled as an accent text link to match the Registered design.
- Tests cover both variants' section visibility plus history-only notes on Registered.

### Refactor: one shared `useUndoCheckIn` hook instead of two drifted copies

- **Why**: architecture review found `CheckInView` and `AttendeesView` each hand-rolled the same undo-check-in sequence (call, toast, invalidate) with copy that had drifted — `CheckInView`'s toast named the attendee, `AttendeesView`'s didn't.
- **Change**: new `hooks/useUndoCheckIn.ts` owns the call → toast → `invalidateAfterAttendeeMutation` sequence and the `undoingId` in-flight flag. Each view still owns its own confirm-dialog copy (`CheckInView` legitimately skips it when undoing from its already-open "Already checked in" modal) and its own reaction to success (`CheckInView`'s optimistic local roster patch + modal close).
- **Copy change** (disclosed, not silent): standardized the toast on the more informative name-included form (`"Ada Lovelace: check-in undone."`, matching `confirmCheckIn`'s existing pattern) — `AttendeesView` previously showed a generic `"Check-in undone"` with no name.
- Tests: new `useUndoCheckIn.test.tsx` adds the failure-path coverage (a rejected `undoCheckIn` call) neither view's own tests had before. Full suite: 558/558 green, `tsc --noEmit` clean, lint clean.
- **Scoped down deliberately**: left `CheckInView`'s local-`useState` roster fetch as-is rather than migrating it onto the shared `useAttendees` cache hook in this same pass — that's a real-time desk workflow where a data-fetching architecture change carries real regression risk, and it was already flagged in `TODO.md` (`FE-ARCH-004`) as design-sensitive, pending a `/grilling` pass first.

### Refactor: collapsed dataService's tripled route surface

- **Why**: architecture review found every route declared three times — the free function, `createDataService`'s factory wrapper (re-typing the same parameter list just to bind the token), and, for the attendees query, a third hand-typed copy in `queryKeys.ts`.
- **Change**: new generic `bindOptions(fn, options)` helper replaces ~28 of 34 factory wrapper one-liners that were pure "forward args, append options" passthroughs — TS infers each method's exact types from the underlying free function, so `DataService`'s shape is unchanged. The 3 methods that genuinely merge extra per-call fields into `options` (`fetchAuditLog`, `fetchCatalog`, `fetchAttendeeNotes`) stay hand-written since that's real behaviour, not boilerplate.
- Deleted the two dead `@deprecated` forwarders `fetchSliceAttendees`/`fetchCapacityStatus` — zero callers and zero test coverage anywhere.
- `updateEmailDispatch` no longer wraps its PATCH response in a fake list envelope just to reuse the list normalizer — exported the normalizer's existing per-item helper and calls it directly.
- `fetchEventAttendees`'s query type is now exported (`EventAttendeesQuery`) and is the single source `queryKeys.ts`'s `AttendeesQueryParams` re-exports, instead of an independent third copy.
- Verified: `tsc --noEmit` clean, lint clean, full suite 553/553 green **unchanged** — no test needed updating, confirming this was pure internal restructuring.

### Fixed: three tested functions weren't actually used on the render/send path they were written to guard

- **Why**: architecture review found `assertScheduleFields`, `isRegisteredContactSelected`, and `getFillPercent` each had unit-test coverage, but the real UI either bypassed them with a hand-copied duplicate or never called them at all — meaning the tests could pass while the real screen was wrong.
- **`assertScheduleFields`** (`utils/emailSchedule.ts`) had zero callers anywhere. Wired into `useEmailDispatchWorkflow.ts`'s `handleScheduleForLater` and `handleSaveEdit`, both now validating the built schedule instant (future + 15-minute-aligned) before the network round-trip. Its error messages were also bare `'validation_error'` strings that would have rendered raw in a toast — changed to plain language ("Choose a time in the future.", "Schedule time must be on a 15-minute mark (e.g. 9:00, 9:15, 9:30, 9:45).").
- **`isRegisteredContactSelected`** (exported from the hook, tested) was bypassed by `EmailDispatchView.tsx`'s own hand-copied `isContactSelected`, which re-implemented the same switch. The view now delegates to the tested predicate.
- **`getFillPercent`** (`utils/capacityTier.ts`, tested, already used by `CapacityBar`/`OverviewView`) was bypassed by a byte-for-byte-identical private `occupancyPercent` in `EventsView.tsx` — deleted in favour of the shared, tested function.
- Tests: 4 new `assertScheduleFields` cases in `emailSchedule.test.ts` (past instant, misaligned minute, valid case, non-UTC timezone alignment) and a new `useEmailDispatchWorkflow.test.ts` case proving a past schedule date is rejected before `previewEmailDispatch`/`createEmailDispatch` are ever called. Full suite: 553/553 green, `tsc --noEmit` clean, lint clean.

---

## 2026-07-21

### Fixed: Programs & Events showed "Live Capacity" (checked-in) instead of "Event Capacity" (registered)

- **Bug report**: an event with 1 registrant (not yet checked in) showed `1/100` on Event Details but `0/100` on Programs & Events. There are two distinct capacity numbers in this product — **Event Capacity** (total registered vs. capacity, shown on Event Details and now correctly on Programs & Events/Overview) and **Live Capacity** (on-site/checked-in count, shown on the Check-in page) — and Programs & Events was silently displaying the latter under a field named `attendeeCount`.
- **Root cause**: `enrichPortfolioWithCapacity` (`catalogEventPresentation.ts`) fed the summary route's `checkedInCount` into `PortfolioEvent.attendeeCount`. `OverviewView.tsx:71` even names its own local variable `totalRegistered` while summing this same field — the intent was always "registered," the data source just didn't match.
- **Fix**: backend `events/capacity-summary` now returns a separate `registeredCount` field (total registered, checked-in or not) — see `../Backend/CHANGELOG.md`. `enrichPortfolioWithCapacity` now reads `registeredCount` instead of `checkedInCount` for `attendeeCount`. No UI/markup changes — Programs & Events and Overview both consume `PortfolioEvent.attendeeCount` already, so fixing the one shared merge function fixes both screens.
- Tests: `catalogEventPresentation.test.ts` — new regression case (registered-only, not checked-in, still counts toward `attendeeCount`) plus updated existing cases to include `registeredCount`. Updated fixtures in `normalizeApi.test.ts`, `dataService.test.ts`, `OverviewView.test.tsx`, `EventsView.test.tsx` for the new required field. Full suite: 548/548 green, `tsc --noEmit` clean, `vite build` clean, lint clean.
- Docs: `docs/api-contract.md`'s `events/capacity-summary` section documents both fields and the bug, so the distinction doesn't get re-conflated later.

### Working Event picker delay — shared the catalog cache instead of three independent raw fetches

- **Root cause**: `WorkingEventPicker`, `AppLayout`'s own event-name lookup, and `useWorkingEventMeta` each called `dataService.fetchCatalog()` directly in their own `useEffect`, bypassing TanStack Query entirely — so the catalog prefetch `sessionLifecycle.ts` already warms right after sign-in (`prefetchCatalog`, keyed `queryKeys.catalog()`) never actually helped: all three fired their own independent, uncached network round-trip on every mount, up to three concurrent requests per login. The closed picker also gave no visible loading feedback (just sat on "Select an event" with no spinner/busy state), so the delay looked like nothing was happening.
- **Fix**: `WorkingEventPicker` and `AppLayout` now use the existing `useCatalog()` hook (default `includeArchived: false`) — same query key as the sign-in prefetch, so both get the already-warm cache instead of a fresh fetch. `useWorkingEventMeta` now uses `useCatalog({ includeArchived: true, enabled: Boolean(eventId) })` — a deliberately separate cache entry (archived events still need to resolve here), but now cached/deduped via TanStack Query rather than a raw fetch on every mount, and skips the fetch entirely when there's no active event (new `enabled` option added to `useCatalog`).
- Added a purely visual (`aria-hidden`, `aria-busy` on the trigger) spinner to `WorkingEventPicker`'s closed state while the first fetch is in flight — deliberately doesn't change the trigger's label text (`currentEventName ?? 'Select an event'`), so the existing accessible-name-based test assertions and the picker's instant-clickability are unaffected.
- Also investigated as part of the same session: a session-timeout report where the URL sticks to the last-viewed event route and lands back there after re-login. Confirmed intentional-by-omission (no redirect/URL-clearing logic exists in the session-expiry or login path) and safe — `sessionLifecycle.ts` clears the query cache on every session-token change, and views like `AttendeesView` re-check the *current* session's role on every render, so a different/lower-privileged user landing on the same URL after re-login gets access-denied against their own real role, never a replay of the prior session's data. No code change made for this half.
- Tests: `WorkingEventPicker.test.tsx`, `AppLayout.test.tsx`, and `Sidebar.test.tsx` (which renders `WorkingEventPicker`) now wrap renders in a `QueryClientProvider` via the existing `renderWithQueryClient` test util; `useWorkingEventMeta.test.tsx` (renamed from `.ts` — now contains JSX for its wrapper) does the same via `renderHook`'s `wrapper` option. All existing assertions (loading row, "No events found.", XSS guard, filter/navigate) pass unchanged. Full suite: 547/547 green, `tsc --noEmit` clean, `vite build` clean, lint clean.
- Not verified live in-browser: reaching the authenticated shell needs a real Google Identity Services sign-in (mock auth only stubs the server-side token exchange, not the Google button itself), which isn't reachable from this sandbox — verified instead via the Vitest coverage above.

### HubSpot Lead-generation feasibility gates — UAT values confirmed (`HS-015`/`HS-016`/`HS-017` progress, `HS-018` reclassified)

- Live UAT checks against the portal resolved most of the Lead-generation feasibility gates blocking `014-lead-generation`: `HS-015` (`crm.objects.leads.read`/`write` scopes) confirmed granted; `HS-016` (Contact↔Lead `associationTypeId`) confirmed as `578` ("Lead to primary contact," the Lead→Contact direction — not the `579`/`609` pair from the reverse Contact→Lead direction initially queried) and the Note↔Lead `associationTypeId` confirmed as `855`.
- `HS-017` (`hs_lead_type`/`hs_lead_label` values) — confirmed 2026-07-21: "Marketing / Event" / "WARM", internal `value` strings verified to match the display labels. **Every Lead-generation feasibility gate is now closed except `HS-018`.**
- `HS-018` reclassified from "grant a scope" to "confirm portal tier" — `crm.objects.notes.read`/`write` doesn't appear in this portal's private-app scope picker, matching a recurring HubSpot-Community-documented pattern where Notes/engagement API access is gated by subscription tier rather than a permissions bug. Blocks the interest-summary Note (ADR-018) and conversation-notes sync (ADR-019) at the account level until confirmed with the HubSpot account rep.
- Docs updated: `docs/hubspot-ops-todo.md` (`HS-015`/`HS-016` moved to Done archive, new `HS-016b` archived for the Note association ID, `HS-017`/`HS-018` reworded), `docs/hubspot-schema.md` (Lead-generation section — confirmed values recorded in the Parameters table and feasibility gates list). No code changes.

### Live event conversation notes — Phases 4/5/7 implemented (`FE-NOTES-001` done, `015-conversation-notes`)

- **Phases 4/5/7 (US2/US3/US5) of `specs/015-conversation-notes/tasks.md`** — the Attendee Detail modal's third "Notes" section. US1 (Conversations screen, QR lookup) was already shipped in an earlier session; Backend's `015` Phase 2/4/5/6/7 counterpart shipped the same session — see `../Backend/CHANGELOG.md`.
- New `components/ConversationNotesPanel.tsx` + `.module.css` — a flat, non-tabbed `<section>` matching the modal's existing Basic Information/Attendee Journey/Registration history pattern (decomposed as its own component, mirroring `RegistrationHistoryPanel.tsx`'s precedent). List of captured notes (author + timestamp + "Edited" tag when `editHistory` is non-empty) + an add-note form + inline edit/delete controls per note + a "Show notes from all events" checkbox (`allEvents`, US5) that tags cross-event entries with an "Other event" badge. Wired into `AttendeeDetailModal.tsx` between the Attendee Journey section and `RegistrationHistoryPanel`.
- **Edit/Delete controls are deliberately not gated to the note's own `authorEmail` client-side** (ADR-019 decision #5, tasks.md T033) — every note shows both controls to whichever admin is viewing the modal, matching the server's any-admin policy; the component has no "current user" concept to check against at all.
- `types.ts` gains `ConversationNoteEntry`/`AttendeeNotesResponse`; `normalizeApi.ts` gains `normalizeConversationNoteEntry`/`normalizeAttendeeNotesResponse`; `dataService.ts` gains `fetchAttendeeNotes(eventId, contactId, {allEvents?})`, `createAttendeeNote`, `updateAttendeeNote`, `deleteAttendeeNote` — all wired into `createDataService`'s `useDataService()` binding, matching the existing CRUD-method conventions (`fetchAttendeeDetail`/`generateAttendeeLead` etc.).
- Delete uses the existing `useConfirm()` promise-based confirmation dialog (same pattern as `AttendeesView.tsx`'s remove/undo-check-in flows) before calling `deleteAttendeeNote` — idempotent on the backend, so a double-click never errors.
- **Dedicated adversarial test for the no-author-lock property** (explicit per the user's ask, T035): a new `AttendeeDetailModal.test.tsx` case renders a note authored by `author-admin@adaptavist.com` and completes a full edit-then-delete flow through the UI as a different notional viewer, asserting both `updateAttendeeNote`/`deleteAttendeeNote` are called and the UI updates — proving the controls are never gated by authorship, not just asserting "an admin can."
- Also extended: `AttendeeDetailModal.test.tsx` (Notes fetched/rendered, empty state, add-note flow + failure toast, hostile-string-renders-as-text guard on note content, `allEvents` toggle refetch + cross-event tagging — 8 new cases). Two other suites that render `AttendeeDetailModal` (`AttendeesView.test.tsx`, `ConversationsView.test.tsx`) needed `fetchAttendeeNotes` added to their `dataService` mocks and (for `ConversationsView.test.tsx`) a `ConfirmProvider` ancestor added to their render helper, since the modal now unconditionally mounts the Notes panel.
- Tests: 8 new cases in `AttendeeDetailModal.test.tsx` (26 total in that file). Full suite green: 547/547 tests, 62 files; `tsc --noEmit` clean; `npm run lint:fix` clean.
- Docs updated: `docs/api-contract.md` (four new routes under the Lead-generation section), `docs/rbac.md` (RBAC matrix rows, three new audited actions, UI-gating row), `docs/ui-routes.md` (`ConversationsView.tsx` entry updated — Notes section is no longer "future"). `TODO.md`: `FE-NOTES-001` → `done-pending-QA`, `X-NOTES-001` → `done-pending-QA`. Not done by this change: quickstart.md §C operator security sign-off on UAT and `HS-018` for a real end-to-end Lead-sync test; live-browser verification (no live HubSpot-backed API or Google OAuth reachable in this sandbox) — verified instead via Vitest component tests (real DOM rendering + user-event interactions) plus a clean `tsc --noEmit`.

### Live event conversation notes — US1 implemented (`FE-NOTES-001` partial, `015-conversation-notes`)

- **Only Phase 1 (Setup) and Phase 3 (User Story 1) of `specs/015-conversation-notes/tasks.md`** — the checked-in attendee lookup and the new Conversations screen. `ConversationNoteStore`, the Notes section, and everything else note-related is explicitly out of scope for this change (separate session).
- New `ConversationsView.tsx` (`#/events/{id}/conversations`, new "Conversations" Sidebar module via `eventModules.ts`, wired through `ViewRouter.tsx`'s `ConversationsRouteGate`) — a checked-in-only roster reusing the existing `fetchEventAttendees` with `checkedIn: true` (no new list route, per research.md R-003) and `CheckInQrPanel.tsx` unmodified for scanning. Selecting a row or completing a scan opens the existing `AttendeeDetailModal` (010) with that attendee's `contactId` — the same reused component, not a new one.
- QR scan calls a new, dedicated `dataService.lookupAttendeeByQr(eventId, jwt)` → `POST events/{evId}/attendees/lookup`, **not** `checkInScan` — this is deliberate: scanning a checked-in attendee to find them for a conversation must never write or audit a check-in event (spec FR-003). `types.ts` gains `AttendeeLookupResponse`; `normalizeApi.ts` gains `normalizeAttendeeLookupResponse` (reuses the existing `normalizeCheckInContact` mapper).
- Tests: new `ConversationsView.test.tsx` (7 cases — checked-in-only filtering against a mixed fixture, row-click and QR-scan both opening the Attendee Detail modal, an explicit assertion that `checkInScan` is never called during a Conversations-screen scan, empty/non-admin states, XSS guard). Full suite green: 540/540 tests, 62 files; `tsc --noEmit` + `vite build` clean.
- Backend counterpart (`BE-NOTES-002` partial) shipped the same session — see `../Backend/CHANGELOG.md`. Docs updated: `docs/api-contract.md`, `docs/rbac.md`, `docs/ui-routes.md`. `TODO.md`: `FE-NOTES-001` → **in progress** (not done — the Attendee Detail "Notes" section itself, US2–US5, and the Lead-sync extension are unbuilt, tracked as a separate session). Not done by this change: quickstart.md §B2–§B5/§C (those exercise notes capture, which doesn't exist yet) and live-browser verification (no live HubSpot-backed API or Google OAuth reachable in this sandbox) — verified instead via Vitest component tests plus a clean `tsc`/`vite build`.

### HubSpot Lead generation — implemented (`FE-LEAD-001`/`002`, `014-lead-generation`)

- **US1 (single-attendee):** new "Generate Lead" action in `AttendeeDetailModal.tsx` — a dedicated "HubSpot Lead" section (admin-only, inheriting the modal's existing gate) with a button calling the new `dataService.generateAttendeeLead(eventId, contactId, { includeFullHistory })`; a success toast distinguishes all three outcomes (`created`/`updated`/`created_separate`, the last one explicitly noting the existing HubSpot Lead was left untouched) and shows the returned `leadId`; a failure toast surfaces the backend's plain-language error message.
- **US3 (bulk):** `AttendeesView.tsx` gained its **first multi-select surface** — a checkbox column, a select-all-visible header checkbox, and a bulk action bar (shown only once at least one attendee is selected) with "Clear selection" and "Generate Leads." Selection is cleared on event/page change. At/above `CONFIG.LEAD_BATCH_CONFIRM_THRESHOLD` (client default 50, mirrors the Backend's own default), a `useConfirm()` dialog gates the call (same pattern as email dispatch's large-send confirmation) before passing `batchConfirmed: true`. Calls the new `dataService.generateAttendeeLeadsBatch(eventId, { contactIds, includeFullHistory, batchConfirmed? })`; result is summarized in one toast (counts per outcome + failed `contactId`s), not a separate results table.
- **US4 (opt-in cross-event history):** an "Include full cross-event history" / "Include this attendee's full cross-event history" checkbox added to both the single and bulk UI, threaded through to both `dataService` methods as `includeFullHistory`.
- `types.ts` gains `LeadGenerationOutcome`/`LeadGenerationBatchOutcome`/`GenerateLeadRequestBody`/`GenerateLeadResponse`/`GenerateLeadBatchRequestBody`/`GenerateLeadBatchResponse`/`GenerateLeadBatchResultEntry`; `normalizeApi.ts` gains `normalizeGenerateLeadResponse`/`normalizeGenerateLeadBatchResponse` (an unrecognized batch-entry outcome defaults to `'failed'`, never silently dropped). `config.ts` gains `LEAD_BATCH_CONFIRM_THRESHOLD` (default 50), a separate constant from `EMAIL_SEND_CONFIRM_THRESHOLD` per this feature's own risk-profile reasoning (research.md R-002).
- Tests: extended `AttendeeDetailModal.test.tsx` (+5, including a `ToastProvider`-wrapped render helper since the modal now calls `useToast()`) and `dataService.test.ts` (+3 mapping tests); extended `AttendeesView.test.tsx` (+9, covering selection, the bulk API call shape, the per-outcome/failed-contactId summary toast, the confirmation-dialog gate at threshold, and selection clearing on page change). Full suite green: 533/533 tests, 61 files; `tsc --noEmit` + `vite build` clean.
- Backend counterpart (`BE-LEAD-001`/`002`) shipped the same day — see `../Backend/CHANGELOG.md` (including a real audit-key-collision bug found and fixed while building the route tests). Not done by this change: quickstart.md §C operator security sign-off on UAT, and the HubSpot ops confirmations (`HS-015`/`016`/`017`/`018`) every user story depends on for a real end-to-end test. Live-browser verification of this feature specifically was not possible in this session's sandbox (no live HubSpot-backed API reachable, no Google OAuth available) — verified instead via Vitest component tests exercising the real rendered DOM with simulated user interaction, plus a clean `tsc`/`vite build`. `TODO.md`: `FE-LEAD-001`/`002` → `done-pending-QA`; `X-LEAD-001` → `done-pending-QA`.

### Registration form bridge — "Registration history" panel implemented (`FE-REGFORM-001`, `013-registration-form-bridge`)

- New `RegistrationHistoryPanel.tsx` mounted in the existing `AttendeeDetailModal.tsx`, right after Attendee Journey — renders every retained registration-answer-history entry (submission time via `formatDateTime`, question/answer pairs) or a clear "No registration answers recorded yet." empty state. Multi-select answers (`string[]`) join into a comma-separated display string. Pathologically long answers are cut to 500 characters with a trailing ellipsis for display only — the underlying data is never truncated in storage.
- This is the first EMS surface rendering text authored directly by an anonymous public form submitter (spec FR-007) — rendered with JSX `{text}` only, never `dangerouslySetInnerHTML` or any other HTML-interpreting sink. A dedicated hostile-string Vitest guard (`<script>alert(1)</script>`, `<img src=x onerror=alert(1)>`) is a hard pass/fail gate confirming literal-text rendering with no script/img DOM node produced, not folded into general polish.
- `types.ts`: new `RegistrationAnswerHistoryEntry`; `AttendeeDetail` gains `registrationAnswerHistory`. `normalizeApi.ts`'s `normalizeAttendeeDetailResponse` maps the new field (defaults absent/malformed input to `[]`, normalizes multi-select values, defaults an unrecognized `source` to `registration`) — no new `dataService` method, rides the existing `fetchAttendeeDetail` call.
- Tests: new `RegistrationHistoryPanel.test.tsx` (entries + submission time, empty state, hostile-string guard, truncation); extended `AttendeeDetailModal.test.tsx` (panel mounts with history present, empty state when absent), `normalizeApi.test.ts` (populated/empty/multi-select/unrecognized-source cases), and `AttendeesView.test.tsx`'s attendee-detail fixtures (now include the field the type requires). Full suite green: 517/517 tests, 61 files; `tsc --noEmit` + `vite build` clean.
- Backend counterpart (`BE-REGFORM-001`/`002`) shipped the same day — see `../Backend/CHANGELOG.md`. Not done by this change: quickstart.md §C operator security sign-off on UAT, and the HubSpot ops slot build (`HS-001`/`HS-013`/`HS-014`) this feature's US1/US4 depend on. `TODO.md`: `FE-REGFORM-001` moved to `TODO-DONE.md`; `X-REGFORM-001` → `done-pending-QA`.

### Live event conversation notes — gap review (5 gaps found and resolved)

- Refined [ADR-019](docs/decisions/019-live-event-conversation-notes.md) after a follow-on gap review: (1) viewing notes is now its own dedicated, audited fetch (mirroring `fetchAttendeeCommunications`) rather than riding unaudited inside the base attendee-detail response; (2) notes can now be soft-deleted, not just edited, for recovering from a misattributed note; (3) an edit/delete after a note's already been pushed to a Lead does not propagate back to HubSpot — accepted as a documented limitation; (4) editing/deleting is now open to any admin (tracked by editor identity), not locked to the original author, since author-only would have been the first per-user ownership restriction anywhere in this app and would leave a departed author's notes uncorrectable; (5) notes default to the current event only, with the same fetch supporting an opt-in expand to every event, mirroring ADR-014/ADR-018's precedent. `CONTEXT.md` and both `TODO.md` files updated to match.

### Live event conversation notes — design (`X-NOTES-001`, grill-with-docs)

- New [ADR-019](docs/decisions/019-live-event-conversation-notes.md): a new "Conversations" nav item lets staff find a checked-in attendee (list or QR scan, reusing Check-in's mechanics but not its check-in write) and add timestamped, staff-attributed notes about their conversation, surfaced as a new "Notes" section on the existing Attendee Detail modal. Notes are editable by their author with before/after tracked — deliberately not append-only/immutable like `013`'s registration-answer history, since staff-authored content realistically needs correction. Notes sync to HubSpot only when a Lead is generated/regenerated (never a live push at capture time), each becoming its own separate Note on the Lead's timeline distinct from `014`'s interest-summary Note, with EMS tracking which notes have already been pushed to avoid duplicating them on a later regeneration. **AI transcription was explicitly deferred to its own later phase** — consent, third-party audio data-flow, and retention questions need real privacy/legal input this session couldn't supply, not an engineering default.
- **Retroactive gap found in [ADR-018](docs/decisions/018-hubspot-lead-generation.md):** creating a HubSpot Note/engagement needs its own OAuth scope, distinct from the Leads scopes already tracked — wasn't separately called out when `014` was designed. New `HS-018`, cross-referenced from both ADRs.
- `CONTEXT.md`: new glossary term **Conversation note**, sharpened against **Registration answer** and **Lead interest summary** to avoid overloading either.
- `docs/hubspot-ops-todo.md`: new `HS-018`.
- `TODO.md` / `Backend/TODO.md`: new **Live event conversation notes** sections — `FE-NOTES-001` (the screen + modal section), `BE-NOTES-001`/`002`/`003` (storage, the new read-only lookup endpoint, and the Lead-sync push), and `X-NOTES-002` (AI transcription, parked). `BE-LEAD-001`'s note updated to reflect its extended scope. Not yet built — design only.

### HubSpot Lead generation — gap review (5 gaps found and resolved)

- Refined [ADR-018](docs/decisions/018-hubspot-lead-generation.md) after a follow-on gap review: (1) EMS only updates a Lead it can verify it created (via the `ems_lead_interest_summary` property's presence as a provenance marker) — a Lead without that marker is left alone and a new, separate Lead is created instead, so EMS never overwrites a salesperson's own unrelated work; (2) `ems_lead_interest_summary` is now set once at first creation only and never modified — every update instead logs a HubSpot Note, avoiding an ever-growing concatenated property; (3) the "expand to full cross-event history" read is now its own audited action, reusing ADR-014's precedent for reads beyond the currently-open event; (4) lead temperature/type stays fixed for all EMS-generated leads, no signal-strength differentiation; (5) `admin`-only RBAC confirmed for now, explicitly flagged as a watch item to revisit later, not a closed question. `hubspot-schema.md`, `CONTEXT.md`, and both `TODO.md` files updated to match.

### HubSpot Lead generation from event attendees — design (`X-LEAD-001`, grill-with-docs)

- New [ADR-018](docs/decisions/018-hubspot-lead-generation.md): gives staff the ability to generate/update a HubSpot Lead from an event attendee, carrying that attendee's **Registration answer history** ([ADR-017](docs/decisions/017-registration-slots-and-answer-history.md)) onto the Lead as a new `ems_lead_interest_summary` custom property, so a salesperson sees *why* someone is a lead, not just that they attended. Native HubSpot Leads confirmed enabled on this portal; researched its live API mechanics (`POST /crm/v3/objects/leads`, required Contact association, two new OAuth scopes not yet granted) before designing rather than guessing. Two slices: single-attendee (Attendee Detail modal) and bulk (Attendee list multi-select, reusing email dispatch's existing 50+ confirmation pattern) — same confirmation flow, no skip for either. Duplicate handling updates an existing Lead rather than creating a second, consistent with ADR-017's append-don't-overwrite philosophy. Company association and an EMS-side cached "has-a-lead" reference are both deliberately deferred, not overlooked.
- `docs/hubspot-schema.md`: new § HubSpot Leads (lead generation) documenting the confirmed API mechanics and the three feasibility gates blocking any write.
- `CONTEXT.md`: new glossary terms **Lead / Lead generation** and **Lead interest summary**.
- `docs/hubspot-ops-todo.md`: new `HS-015` (scope grant), `HS-016` (association type ID), `HS-017` (lead type/label values).
- `TODO.md` / `Backend/TODO.md`: new **Lead generation** sections — `FE-LEAD-001`/`002` (the two slices), `BE-LEAD-001`/`002` (the adapter + bulk endpoint), and two deliberately parked items (`X-LEAD-002` Company association, `BE-LEAD-003` cached existing-lead reference). Not yet built — design only, blocked on the three HubSpot-side feasibility gates.

## 2026-07-20

### Registration form bridge — multi-event slots + registration-answer history design (`X-REGFORM-001`, grill-with-docs)

- New [ADR-017](docs/decisions/017-registration-slots-and-answer-history.md): bridges the live multi-page, multi-event public registration form onto ADR-007's association model. Ten fixed "registration slots" (independent match-key/workflow pairs) let one submission register a Contact for several Events at once, without a HubSpot Workflow loop primitive that doesn't exist on this portal. Registration answers (meeting topic, guest names, etc.) get a durable, appended (never overwritten) history in Record Storage keyed `contactId+eventId`, captured via a JSON bundle per slot built by a small form-side script rather than ~100+ individually-provisioned hidden fields. Why: two currently-known event types need 4–5 follow-up questions each, and rejected alternatives (native workflow list-looping, a paid Custom Code workflow action, or EMS itself writing registrations) each cost more in tier lock-in, developer dependency, or reopening ADR-007's "registration writes stay HubSpot-workflow-side" decision than the chosen design.
- `docs/hubspot-schema.md`: new § Registration slots (multi-event) + § Registration answers webhook documenting the ten slot properties, the answer-bundle field, and the extended `OnAttendeeRegistrationWebhook` contract (one combined call per slot, not two).
- `CONTEXT.md`: new glossary terms **Registration slot** and **Registration answer / Registration answer history**; updated the existing **Registration wave** entry to note this design fixes the data-loss half of that pain (history is never destroyed) but not the ergonomic half (amendments still require a full-form resubmission, re-ticking every prior Event).
- `docs/hubspot-ops-todo.md`: `HS-001` updated from "not yet designed" to reference the settled design and remaining build work; new `HS-013` for the answer-bundling script's feasibility gates (form embed type, script ownership, live DOM/label validation).
- `TODO.md` / `Backend/TODO.md`: new **Registration form bridge** sections — `FE-REGFORM-001` (Attendee Detail "Registration history" panel), `BE-REGFORM-001`/`002` (the answers store + extended webhook contract), and three deliberately parked items (`X-REGFORM-002` general Record Storage viewer, `X-REGFORM-003` self-service withdrawal — out of scope, `BE-REGFORM-003`/`004` reconciliation sweep + automated recovery tool). Not yet built — design only.

### Data caching layer — US4 request-shape/degradation specs + docs/QA sweep (`FE-PERF-001`, slice `012-data-caching-layer`, T034–T037, T039)

- `EventsView.test.tsx` / `OverviewView.test.tsx`: extended each view's request-shape spec so it also asserts zero `fetchEventCapacityStatus` calls (both mock services now expose the function so a regression to the old per-event fan-out would fail loudly, not silently no-op); `CheckInView.test.tsx` gained an explicit "keeps using the per-event capacity route, never the bulk capacity-summary route" spec (T034 — CheckInView's own mock service gained a `fetchCapacitySummary` stub for the same reason).
- New `EventsView.test.tsx` spec: `fetchCapacitySummary` rejecting on the *first* load (not just a later background refetch, already covered) still paints the catalog with fallback capacity values (`0/100`, the `enrichPortfolioWithCapacity` per-row fallback) behind the existing non-blocking retry banner — never a blank error screen (T035, spec acceptance US4-2).
- `Frontend/TODO.md`: `FE-PERF-001` → **done-pending-QA**, pointing at this slice's `tasks.md`/`quickstart.md`; noted that `OverviewView`'s T019 migration onto the bulk route supersedes the archived `FE-REDESIGN-021` keep-the-fan-out decision; `FE-ARCH-006` re-scoped — the `loading/error/reloadKey` ladder it tracked is now subsumed by `src/data/hooks`, leaving only the unrelated pagination-hook remainder in scope. `FE-PERF-002` (optimistic updates) confirmed still parked with its design notes, unchanged.
- `Backend/TODO.md`: `BE-PERF-001` → **done-pending-QA**, cross-referenced against `FE-PERF-001`.
- `quickstart.md`: sign-off table updated — §A ✅ (this session, both repos: FE 60 files/510 tests + build clean, BE 42 suites/439 tests + lint clean); §B marked partial with a new local-coverage table mapping each manual scenario to the automated spec that proves its mechanism, since this sandbox has no reachable UAT listener (`src/config.ts`'s `API_BASE_URL` has no local proxy target here, and the app has no mock-data path) — the manual DevTools/OAuth/storage steps themselves still need a live UAT pass. §C untouched (operator-run).
- Full suite: 60 files / 510 tests green; `npm run build` (`tsc --noEmit` + `vite build`) clean. Backend: 42 suites / 439 tests green; `lint:fix` clean (pre-existing unused-var warnings only, no errors).
- **Not done this session**: T038 (Backend SFTP upload to the QA environment + re-verifying §B2 against the deployed listener) — no SFTP access from this environment; the upload list (the full `Backend/scripts/` tree, 84 files, per `Backend/README.md`'s stated deploy step) was prepared and handed to the user rather than executed. T039's UAT run of §A/§B and T040's operator-run §C remain open — see `tasks.md`.

### Master pre-event/QA docs synced with Slice 012 (data caching layer)

- `../PRE-EVENT-ACTION-PLAN.md`: added §1.6 — deploy (SFTP, `T038`) + full UAT/operator QA (`T039`/`T040`) for the data caching layer, mirroring §1.5's "built and tested but never run live" treatment, since the slice's sign-out/no-speculative-PII-read guarantees are ship-blockers, not polish; added a cache-clear-on-account-switch step to the §2 end-to-end rehearsal; added `FE-PERF-002` (optimistic updates, parked) to the §5 explicitly-deferred list.
- `../FULL-QA-TEST-PLAN.md`: added Slice 012 checks throughout — cache-clear-on-sign-out and cross-account paint (§2.1), warming fires only catalog/capacity never attendees/audit (§2.2), Programs & Events single catalog + single `capacity-summary` request plus instant-repaint/degraded-fallback checks (§2.3), always-fresh attendee reads (§2.5), unchanged per-event capacity route on Check-in (§2.6), no speculative PII audit entries (§2.9), `events/capacity-summary` RBAC (§3, §4), and the full "speed layer never lies and never leaks" security block (§4) mirroring quickstart.md §C7.1–C7.4; added two accepted-limitation notes to §6 (multi-tab cache is out of scope; within-freshness-window staleness is by design); linked ADR-015/016 and the slice's quickstart/contract docs in the Appendix.

### Data caching layer — session lifecycle, prefetch, and invalidation wiring (`FE-PERF-001`, slice `012-data-caching-layer`, T026–T033)

- New `src/data/sessionLifecycle.ts` (`useSessionLifecycle`), mounted from a small bridge component in `App.tsx` beside `QueryClientProvider`: on any `session?.token` change (sign-out, sign-in, or a swap), `queryClient.cancelQueries()` runs before `queryClient.clear()` — unconditional, so an in-flight response from the old token can never be written back into the cleared cache (data-model.md §4). The effect is keyed on the token alone (read via a ref for `data`, not a dependency) so it can never be retriggered by an unrelated re-render if `useDataService()`'s own memoization ever changes — the same class of bug already fixed once in `OverviewView.test.tsx` (FE-TEST-008, 2026-07-19), caught here before it shipped by a spurious extra prefetch call in a new test.
- New `src/data/prefetch.ts` (ADR-016 structural gate) — exposes exactly `prefetchCatalog(queryClient, dataService)` and `prefetchCapacitySummary(queryClient, dataService)`, no PII-adjacent function exists to call. Wired into `useSessionLifecycle`: when the new token is truthy (a session became available, live auth or `USE_MOCK_AUTH`), both fire once to warm Programs & Events ahead of navigation.
- New `src/data/invalidation.ts` — `invalidateAfterCatalogChange`, `invalidateAfterAttendeeMutation(eventId)`, `invalidateAfterCapacityAdjust(eventId)`, `invalidateAfterCampaignChange(eventId)` per data-model.md §3; the only module allowed to call `invalidateQueries` (FR-010). Added two narrow prefix-only key helpers to `queryKeys.ts` (`capacityAll`, `attendeesForEvent`, `dispatchesForEvent`) so invalidation can target a whole family/event without the params object baked into a `useQuery` key.
- Wired invalidation at every mutation success site: `EventsView.tsx`'s `refreshCatalog()` (program/event create/edit/archive) now calls `invalidateAfterCatalogChange` instead of manually refetching two hooks; `AttendeesView.tsx`'s `refreshAfterMutation()` (remove/undo check-in) now calls `invalidateAfterAttendeeMutation`; `CheckInView.tsx`'s confirm/undo check-in now call the same helper, and its −1 capacity-adjust handler additionally invalidates the capacity *summary* only (the per-event key is already fresher via the existing `setQueryData` write from the adjust response — re-invalidating it would just race that write with a stale-mocked refetch, confirmed by a real test failure while wiring this up); `useEmailDispatchWorkflow.ts` (compose/schedule/edit/cancel) takes a new `queryClient` dependency and calls `invalidateAfterCampaignChange` alongside its existing local-state reloads, so `AttendeesView`'s dispatch filter and the Overview scheduled-summary tile now also refresh after a campaign mutation — previously only the compose view's own list did.
- `EmailDispatchView.tsx` and its test now use `useQueryClient()`/`QueryClientProvider` for the same reason; `useEmailDispatchWorkflow.test.ts`'s harness gained a default `QueryClient`. No other view or existing assertion changed.
- New specs: `src/data/__tests__/sessionLifecycle.test.tsx`, `prefetch.test.tsx`, `invalidation.test.tsx`.
- Full suite: 60 files / 507 tests green; lint clean; `tsc --noEmit` + `vite build` clean.

### Data caching layer — remaining five views migrated to `src/data/hooks` (`FE-PERF-001`, slice `012-data-caching-layer`, T019–T024)

- `OverviewView.tsx`: replaced the combined `Promise.all` + `reloadKey` effect with `useCatalog`/`useCapacitySummary`/`useAuditLog`/`useScheduledDispatchSummary`. The per-event capacity fan-out is gone — stats/upcoming-events now build from the bulk `events/capacity-summary` response via `enrichPortfolioWithCapacity`, superseding the FE-REDESIGN-021 keep-the-fan-out decision now that the bulk route exists (TODO note to follow at T036). Catalog/audit/scheduled-summary gate first paint; the capacity summary is enrichment-only (soft-fails to the existing per-row fallback), matching EventsView's pattern.
- `EventHubView.tsx`: migrated to `useCatalog`/`useEventCapacity`/`useAttendees` (attendee preview), dropping its local `loading`/`error`/`reloadKey` ladder in favor of a small combined-query gate plus a `RefetchFailureBanner` for background-refetch failures.
- `AttendeesView.tsx`: the roster table now reads via `useAttendees` (page/filters in the query key, so filter swaps never bleed rows); the "whole event" stat tiles read via a second `useAttendees` (page 1/size 1) + `useEventCapacity`; the dispatch-filter dropdown reads via `useDispatches`. Added `placeholderData: keepPreviousData` to `useAttendees` (`src/data/hooks/useAttendees.ts`) so page changes keep the previous rows on screen behind the existing "Updating…" overlay instead of blanking. Imperative remove/undo-check-in mutations are unchanged; they now call `.refetch()` on the affected queries directly (invalidation helpers land in US3/T031).
- `CheckInView.tsx`: capacity reads move to `useEventCapacity`; the existing reload-after-mutation cadence is preserved via `capacityQuery.refetch()` (confirm/undo) and a direct `queryClient.setQueryData` write (the −1 "record departure" adjust, which already returns the new snapshot). Server search, QR scan lookups, and walk-in stay direct `dataService` calls per the slice notes — the parked `FE-ARCH-004` refactor scope is untouched.
- `AuditView.tsx`: reads via `useAuditLog` with page/filters in the key; added an `enabled` option to `useAuditLog` (`src/data/hooks/useAuditLog.ts`) so the query never fires for a non-admin session (matches the prior effect's early-return behavior exactly).
- Test suites for all five views (plus `EventsView.test.tsx`) now render through `renderWithQueryClient`. Several tests that synchronized on a heading/meta string also present during the loading skeleton (identical text in both states) were changed to wait on loaded-only content first — a race made visible by the react-query migration, not a functional regression; every pre-existing assertion still holds (SC-006).
- Added a representative stale-while-revalidate spec to `EventsView.test.tsx` (background refetch keeps the previous rows on screen, then swaps in the new rows once it resolves) alongside the existing refetch-failure-keeps-snapshot spec.
- Full suite: 57 files / 493 tests green; lint clean; `tsc --noEmit` + `vite build` clean.

### Data caching layer — TanStack Query foundation + EventsView migration (`FE-PERF-001`, slice `012-data-caching-layer`, T001/T006–T018/T025)

- Added `@tanstack/react-query` v5 (no devtools package, per research R1) — bundled via npm like Chart.js, no CSP/`vite.config.ts` change needed.
- `dataService.ts`/`normalizeApi.ts`/`types.ts`: added `fetchCapacitySummary()` + `normalizeCapacitySummaryResponse` + `CapacitySummaryRow`/`CapacitySummaryResponse` types, consuming the new `GET events/capacity-summary` backend route (already live from the prior session's T002–T005).
- New `src/data/` module — the only place query keys/cache config/prefetch may live (FR-010, not yet including invalidation/prefetch, which are US3/US5): `queryKeys.ts` (central key factory with param normalization so `{page:1}` ≡ `{}`), `queryClient.ts` (module-scoped `QueryClient` — global `staleTime: 0` + `refetchOnWindowFocus: false` fail-safe defaults; never retries a 401/403; a 401 anywhere routes to the existing sign-out flow via a registered listener), `queryStatus.ts` (`describeQueryStatus` — maps a query to first-load loading/error vs. ready-with-a-failed-background-refetch), and five domain hooks (`useCatalog`, `useCapacitySummary`/`useEventCapacity`, `useAttendees`, `useAuditLog`, `useDispatches`/`useScheduledDispatchSummary`) composing `useQuery` over the existing `useDataService()` seam — `dataService.ts`/`client.ts`/`useDataService.ts` keep their exact roles, unchanged.
- `App.tsx`: mounted `QueryClientProvider`; added a small bridge component that registers `clearSession` as the query client's 401 listener. (The session-token → `cache.clear()` invariant itself is US2/T026 — not part of this change.)
- New shared `RefetchFailureBanner` component (`src/components/`) — the T017 non-blocking "Couldn't refresh — Retry" affordance (research R6): a background-refetch failure keeps the last-loaded data on screen behind this banner instead of blanking to a full error state; a first-load failure still shows the existing full `loading → error` ladder.
- New `src/testing/renderWithQueryClient.tsx` test util — fresh, isolated `QueryClient` per test (retry off, `gcTime: 0`).
- Migrated `EventsView.tsx` off its hand-rolled `loading`/`error`/`reloadKey` ladder onto `useCatalog` + `useCapacitySummary`. `enrichPortfolioWithCapacity` (`catalogEventPresentation.ts`) is now a synchronous function keyed by `eventId` against the bulk summary instead of an async per-event `fetchCapacity` fan-out — Programs & Events now issues exactly one `fetchCatalog` + one `fetchCapacitySummary` call regardless of event count (was `1 + N`). `OverviewView.tsx`'s call site got a minimal, behavior-preserving adaptation to the new signature (still its own per-event fan-out for now — the bulk-route switch there is `T019`, a later session).
- Seam review (T025, ADR-015 stop signal): **passed** — see `specs/012-data-caching-layer/tasks.md` T025 for the full accounting of every touched file and why each is in-scope or a minor/expected addition. `T019`–`T024` (the other five views + full six-view test-suite update) intentionally not started this session.
- Full suite: 57 files / 492 tests green; lint clean; `tsc --noEmit` + `vite build` clean.

## 2026-07-19

### Data caching layer — design settled via grill-with-docs (`FE-PERF-001`, slice `012-data-caching-layer`)

- Ran the grilling session seeded by `specs/data-loading-and-caching-grilling-brief.md` (the brief had never been linked from `TODO.md` — now tracked as `FE-PERF-001`). All seven decision branches settled; no code shipped yet — speckit `specify → plan → tasks` is the next step.
- **[ADR-015](docs/decisions/015-client-data-caching-layer.md):** adopt **TanStack Query** behind the existing `useDataService` seam (rejected: hand-rolled cache, status quo). Freshness: catalog 5 min / capacity 30 s / attendees + audit `staleTime: 0` (always refetch on view — preserves PII read-audit truthfulness). One app-scoped `QueryClient` cleared on any session-token change (logout/swap/sign-in); memory-only, no persistence. Central query-key factory + mutation→invalidation map (replaces the deleted `bumpCatalog` signal from zero). **Big-bang** migration of all six data views, per user direction. Optimistic updates deferred (`FE-PERF-002`).
- **[ADR-016](docs/decisions/016-no-prefetch-of-audited-pii.md):** prefetch only non-PII catalog/capacity — **never** audited `attendees.list`/audit reads, since a speculative fetch would write a false "operator viewed PII" audit entry. Enforced structurally via a `prefetch.ts` module that exposes no PII functions.
- Backend pairing: new `events/capacity-summary` bulk route planned as `BE-PERF-001` (see `Backend/TODO.md` + `Backend/CHANGELOG.md`), replacing Programs & Events' per-event capacity fan-out.
- `CONTEXT.md`: added **Cache**, **Stale-while-revalidate**, **Prefetch**, **Query key / cache invalidation** glossary terms; the seeding brief marked as settled.
- Ran `/speckit-specify`: wrote [specs/012-data-caching-layer/spec.md](specs/012-data-caching-layer/spec.md) (5 prioritized user stories, FR-001–014, SC-001–006, edge cases) + quality checklist, treating ADR-015/016 as settled inputs rather than reopening them. `.specify/feature.json` now points at slice 012.
- Ran `/speckit-plan`: wrote `plan.md` (constitution gates all pass; new-dependency justification recorded), `research.md` (R1–R9 — integration shape: typed domain hooks in new `src/data/`; mutations stay imperative + central invalidation helpers; conservative `staleTime: 0` global default; sign-in-only prefetch triggers), `data-model.md` (query-key scheme, freshness/retention, invalidation map, session boundary), `contracts/events-capacity-summary.md` (admin-only; route-order caveat vs `events/:eventId/*`; minimal `{eventId, programId, capacity, checkedInCount}` rows), and `quickstart.md` incl. §C operator security checks (C7.1–C7.4: cache-clear/no-persistence, no speculative PII audit entries, viewer 403 on the bulk route, no stale cross-role paint). Also corrected `Backend/TODO.md` `BE-PERF-001` — the bulk route is **admin-only** (an earlier note wrongly said admin+viewer).
- Ran `/speckit-tasks`: wrote `specs/012-data-caching-layer/tasks.md` — 40 tasks across 8 phases (Setup → Foundational incl. the backend route → US1 instant navigation (MVP) → US2 session lifecycle → US5 audit truth → US3 invalidation → US4 request-shape verification → Polish/QA gates). Notable encoded decisions: `refetchOnWindowFocus: false` globally (a focus refetch of attendees would write un-viewed PII read-audit entries), the T025 seam-review stop signal from ADR-015, and Overview's capacity fan-out switching to the bulk summary (supersedes FE-REDESIGN-021 once the route exists). Next: `/speckit-implement` (or `/speckit-analyze` first).

### Fixed a real flaky test (`FE-TEST-008`)

- Root-caused an intermittent full-suite failure that had shown up a few times today across different, seemingly unrelated files (`OverviewView.test.tsx` itself, and once in `AttendeesView.test.tsx`). Cause: `OverviewView.test.tsx`'s mocked `useDataService()` built a brand-new object literal (with fresh inline `vi.fn()`s) on every call, instead of returning a stable object like every other test file in the repo does. `OverviewView`'s data-loading effect lists `data` (the hook's return value) in its dependency array — the real hook memoizes it, but this unstable mock made the effect re-fire on every re-render it caused, occasionally re-fetching and clobbering `stats` with a later (default) value after an assertion had already observed the correct one.
- Fixed by hoisting the mock's `fetchCatalog`/`fetchEventCapacityStatus`/`fetchAuditLog`/`fetchScheduledEmailSummary` functions to module scope and returning one stable `mockDataService` object, matching the pattern already used in `EventsView.test.tsx`/`AuditView.test.tsx`/`CheckInView.test.tsx`/etc.
- Verified with 15 consecutive full-suite runs, all clean (previously ~2 failures per 9 runs). `AttendeesView.test.tsx` never reproduced the failure in isolation and has no bug of its own — the working theory is the runaway re-fetching briefly starved the shared test-runner event loop enough to destabilize a concurrently-running file's own timing-sensitive assertions.

### Removed dead code found via the coverage report

- Deleted `src/state/catalogContext.tsx` (`CatalogProvider`/`useCatalogSelection`) — leftover CatalogPicker-era scoped-selection state from before the event-first redesign moved to URL-driven routing; confirmed zero imports anywhere in `src/` before removing. Caught because the new coverage report (`FE-TEST-007`) flagged it at 0%.
- While verifying (`tsc --noEmit` / `npm run build`, which `npm test` alone doesn't run), found and fixed two pre-existing type errors surfaced by the deletion's verification pass, unrelated to the deletion itself: (1) `vite.config.ts`'s `test.coverage.reporter` array had an `as const` that produced a readonly tuple TypeScript won't accept where Vitest expects a mutable array — removed it; (2) `WorkingEventPicker.test.tsx`'s event fixtures were missing the required `archived` field on `CatalogEventSummary` — added `archived: false`. Neither broke `npm test` (Vitest doesn't fully type-check config/test files the way `tsc --noEmit` does), but both would have broken CI's `npm run build` step.
- Full suite: 54 files / 475 tests green; lint and `tsc --noEmit`/`npm run build` clean; coverage 81.65% statements.

### Closed two more real coverage gaps flagged by the new coverage report

- `services/authService.test.ts` — the real (unmocked) implementation of Google token exchange, logout, and GIS button setup: live-mode POST to `/auth/exchange`/`/auth/logout` with the right body/headers, error propagation, mock-mode credential decoding (unauthorized domain, missing email, malformed token), GIS `initialize`/`renderButton` wiring, the `onCredential` callback firing with the raw ID token, and the 15s "GIS never loaded" timeout (via fake timers). This file previously had **0% coverage** — every other test that touches login mocks it, so its own logic had never actually been executed by a test.
- `constants/hubspot.test.ts` — `suggestAttendanceProperty` (VIP/partner/customer precedence, case-insensitivity), `parseFormIdsInput`/`formatFormIdsInput` (comma/newline splitting, blank-entry handling), and the `ATTENDANCE_PROPERTY_PRESETS` constant. Also previously **0% covered**.
- Identified but intentionally left alone: `state/catalogContext.tsx` (0% covered) is not a testing gap — nothing in `src/` imports it; it's dead code, a candidate for deletion rather than tests. `App.tsx` (0% covered) is low-value to test in isolation — pure provider/router wiring already exercised indirectly through every view's own tests.
- Full suite: 54 files / 475 tests green; lint clean. Coverage: 81.15% statements (up from a 77.46% pre-session baseline).

### Test coverage reporting (`vite.config.ts`)

- Added `@vitest/coverage-v8` devDependency and configured `test.coverage` (v8 provider, `enabled: true` so it runs on every `npm test`, html/lcov/text-summary output, excludes test files/`src/test/**`/`src/main.tsx`). Unlike Backend (see Backend changelog `BE-TEST-007`), this worked cleanly first try — no ESM/source-map caveat. No enforced threshold yet, visibility only. Baseline: 77.46% statements before this session's new tests; 79.45% after the first pass, 81.15% after closing the `authService`/`hubspot` gaps above.
- Added `coverage/` to `.gitignore`.

### Closed the 6 remaining untested views/components (`FE-TEST-005`)

- `LoginView.test.tsx` — render + notice text, error path when the Google Sign-In script fails to load, session pushed into context on a successful credential exchange, and an XSS guard on a hostile exchange-failure message. Mocks `authService` rather than driving real Google Sign-In — closes the gap that was previously blocked on "we use Google auth to test" by testing the UI's reaction to auth outcomes, not the auth mechanism itself (the real mechanism — RS256 JWKS signature verification — is already exercised for real in `Backend/node/tests/AuthPipeline.test.ts`).
- `ViewRouter.test.tsx` — logical route → view mapping (overview/events/catalog/audit/event-hub/attendees/check-in/email) against the real route tree (mirrors `App.tsx`), plus the attendees/check-in/email route gates redirecting to `/events` when the URL has no `eventId`, and the email gate redirecting a non-admin session even with a valid `eventId`. Seeds the session before the route tree mounts (matching how `AuthGate` in `App.tsx` never mounts the router until `isAuthenticated`) to avoid a transient-null-session race against `EmailRouteGate`'s render-time `<Navigate>`.
- `ConfirmModal.test.tsx` — dialog open/closed state, default and custom button labels, `confirm()` resolving true/false on Confirm/Cancel/backdrop click, staying open on a click inside the dialog body, and an XSS guard on hostile title/message text.
- `EmptyState.test.tsx` — message render, `viewId` as the section id, optional action button + navigate call, and an XSS guard on a hostile message.
- `StatusBadge.test.tsx` — capitalized text + correct badge class per known status (`active`/`draft`/`cancelled`/`completed`/`Registered`/`Checked In`/`Cancelled`), fallback class for an unrecognized status, and an XSS guard.
- `WorkingEventPicker.test.tsx` — loading state while the catalog fetch is in flight, populated/empty list, search filtering, navigate + menu-close on selecting a match, graceful degrade (not a throw) when the fetch fails, and an XSS guard on a hostile event name. Mocks `useDataService`/`fetchCatalog` per the existing `EventsView.test.tsx` convention.
- Full suite: 52 files / 448 tests green (up from 46/402); lint clean.

## 2026-07-17

### Attendee Detail Modal — Polish: QA sign-off + TODO archive (010-attendee-detail-modal, T031/T034)

- Confirmed `specs/010-attendee-detail-modal/quickstart.md` §C (Operator security comfort checks) is already slice-specific — filled per this feature (RBAC, audit, PII-display, HubSpot-contact-ID, cross-Event bounding, rate-limiting checks all reference the real routes/UI), not generic template placeholders; only the runtime-only fields (PR link, operator sign-off, actual test-account emails) remain blank, same as every other shipped slice's quickstart.
- Ran full automated suites (§A): Backend `npm test` — 433/433 tests, 41 suites green; Frontend `npm test` — 402/402 tests, 46 files green. Both `lint` clean.
- `TODO.md`: moved `FE-ATTENDEE-DETAIL-001`/`002` to **[Done (archive)](TODO-DONE.md)** (US1 + US2 both shipped); updated the `X-ATTENDEE-DETAIL-001` cross-cutting summary to reflect that code is shipped while flagging what's still genuinely open — `HS-010`/`HS-011` (HubSpot ops) and `BE-ATTENDEE-DETAIL-002`/`003` (registration timestamp/source, email-open tracking), which this feature does not fix and which stay `parked` in `Backend/TODO.md`.

### Attendee Detail Modal — US2: "Show all communications" toggle (010-attendee-detail-modal, T029)

- Extended `AttendeeDetailModal.tsx` with the "Show all communications" toggle next to the Attendee Journey heading: fetches once via `fetchAttendeeCommunications` on first expand and caches the result (re-toggling doesn't re-fetch), flips its own label ("Show all communications" ↔ "Hide all communications"), shows an inline loading state while in flight, and — on fetch failure — keeps the base this-Event timeline fully visible with an inline error + "Try again" retry rather than blanking the modal. Non-`this_event` timeline items render an inline badge: the other Event's name (`other_event`) or the generic "OTHER DISPATCH" label (`external`), per `CONTEXT.md` § **Attendee communications view**.
- The Backend route this calls (`GET attendees/{contactId}/communications`) is real now (see Backend changelog), but its real HubSpot engagement data is gated on `HS-011` (still `open`) — every call today resolves as a `502` `ApiError`, which this toggle already treats like any other fetch failure (base timeline stays visible, retry offered), so no special-case handling was needed for the degrade path.
- Tests: extended `AttendeeDetailModal.test.tsx` — toggle expand/collapse + label flip + single-fetch caching, loading state, fetch-failure-keeps-base-timeline-with-retry, silent no-op when the expansion adds nothing new, and tag rendering for both `other_event` (named) and `external` (generic) kinds.

### Attendee Detail Modal — US1: Basic Information + event-only Attendee Journey (010-attendee-detail-modal, T005–T007/T010/T011/T015/T016)

- Added `AttendeeDetailModal.tsx` (+ `.module.css`): read-only modal opened from a Registered Attendees row — Basic Information card (email, company, and phone/job title/dietary requirement/registration source only when present — omitted, never a fabricated placeholder, per spec.md's Edge Cases) plus the event-only Attendee Journey timeline (registered/dispatch sent/dispatch opened/checked in), rendering `null` timestamps as "Not yet" rather than fabricating a date. No edit/send/delete control and no raw HubSpot contact ID anywhere in the view (FR-003/FR-004).
- Wired `AttendeesView.tsx`: clicking a row (outside the Remove/Undo action cell) opens the modal via the existing `fetchAttendeeDetail` dataService method; the name cell is a real `<button>` for keyboard access, and the rest of the row is a pointer-convenience click target (`stopPropagation` keeps the action cell's Remove/Undo buttons from also triggering it).
- "Show all communications" (US2) is intentionally not included in this change — stays scoped to `AttendeeDetailModal`'s later extension (T019–T030).
- `HS-010` (dietary requirement property / phone/jobTitle population confirmation) is still **open** per `docs/hubspot-ops-todo.md` — this UI already degrades gracefully to omitted fields regardless, so T017 doesn't block this change. The Backend route (`BE-ATTENDEE-DETAIL-001`, T012/T013) is still a `501 not_implemented` stub — this is Frontend-only work per this repo's Frontend/Backend edit boundary; the modal will resolve to a real read once that lands.
- Tests: new `AttendeeDetailModal.test.tsx` (fetch + render, no-edit/no-contact-ID guard, field omission, XSS guard on company/job title/dietary requirement, fetch-error retry, Close) and `AttendeesView.test.tsx` extension (row click opens the modal; Remove/Undo do not). Full suite: 397 tests / 46 files green; lint/typecheck clean.

### Attendee Detail Modal — Setup phase: dataService + docs synced with the 2 new Backend routes (010-attendee-detail-modal, T001/T003)

- Added `AttendeeDetail`, `AttendeeJourneyStep`, `CommunicationItem`, `AttendeeTimelineItem`, `AttendeeCommunicationsResponse` types (`src/types.ts`), per `specs/010-attendee-detail-modal/data-model.md`.
- Added `fetchAttendeeDetail`/`fetchAttendeeCommunications` to `dataService.ts` (+ `createDataService` wiring) and matching `normalizeAttendeeDetailResponse`/`normalizeAttendeeCommunicationsResponse` in `normalizeApi.ts` — pending fields (`phone`, `jobTitle`, `dietaryRequirement`, `registrationSource`, and `dispatch_opened`/`registered` timestamps) normalize to `null`, never a fabricated placeholder, per spec.md's Edge Cases.
- Documented both routes in `docs/api-contract.md` and added `admin`-only rows in `docs/rbac.md`, flagged as Setup-phase stubs (Backend currently returns `501 not_implemented` for both — see Backend changelog) so the contract is discoverable without implying the real read is live yet.
- No UI change yet — `AttendeesView.tsx`/`AttendeeDetailModal.tsx` (Foundational phase, T004–T007) are a separate, later change.
- Tests: new `normalizeApi.test.ts` coverage for both normalizers (pending-field defaulting, unrecognized journey-step-type fallback, this-Event-step vs. tagged-`CommunicationItem` disambiguation) and new `dataService.test.ts` coverage for both fetch functions' route/query construction. Full suite: 388 tests / 45 files green; lint/typecheck clean.

### Docs — Backend cross-reference and architecture alignment

- Updated ADR-005/006/007, HubSpot schema, security briefing, domain-agent guidance, testing validation, blueprint, and redesign/audit status text to match the shipped custom-object adapters, current Platform stores, `route` query transport, Slice 1.5B Cloudflare placement, and 38-suite/420-test Backend snapshot.
- Re-synced cross-folder TODO ownership and Slice 009 status: Backend now owns the `BE-ATTENDEE-DETAIL-*` rows, both folders mirror the attendee-webhook external gate, and audit paging/filters are recorded as shipped while resource labels remain required for full sign-off.

### Docs — Remaining drift cleanup (006 banners, glossary, links)

- Bannered unmarked Slice 006 spec/quickstart/contract/data-model as design-only / do-not-execute; restructured `CONTEXT.md` Plan C vs current event-first glossary (removed stale `(target)` labels; clarified Campaign rename is partial).
- Corrected `docs/api-contract.md` config path (`src/config.ts`), Programs & Events labels, and ADR-009 link; fixed broken Backend/docs relative links across setup, agents, ADRs, PR template, and rules.
- Updated agent UX laws / operator-security QA prerequisites (WorkingEventPicker; no `USE_MOCK_API`); aligned TODO audit-slice naming, capacity QA notes, and Slice 003–005/009 quickstart+spec UI wording with modal / event-first UX.
- Marked ADR-005 partially superseded by ADR-007; noted redesign plan file tree as historical; fixed `api/client.ts` JSDoc route transport and hubspot-schema walk-in link.

### Docs — Current architecture and coverage drift corrected

- Updated `docs/api-contract.md` to identify shipped Slice 1 routes as final, removed obsolete operator/communications UI-gating rows from `docs/rbac.md`, marked the pre-cutover combined Slice 1.5/2 QA runbook as superseded now that the frontend has no mock-data path, and corrected `TODO.md`'s recorded frontend suite size to the latest full run (45 files / 374 tests).

### Docs — Repository-wide shipped-architecture alignment

- Rewrote the current operator/architecture surfaces (`ui-routes`, `setup`, `product-flows`, blueprint, glossary/schema, component catalog, testing playbook, security-QA template) to match the shipped event-first, all-admin, mock-free Slice 1/2 application and `route` query-parameter transport.
- Updated agent guidance (`AGENTS.md`, `CLAUDE.md`, `CONTEXT-MAP.md`, and Frontend rules) so future work uses `WorkingEventPicker`, Event-scoped routes, Programs & Events, the unified campaign list/modal, and the live ScriptRunner data path.
- Corrected active Slice 003/004/005/007–011 validation docs and contracts; added missing Slice 004/005 operator security checks; marked obsolete Program-scoped/mock/tabbed implementation artifacts as historical or superseded so they cannot be mistaken for live instructions.
- Marked the unbuilt Slice 006 plan/tasks as requiring re-planning because their deleted Settings/CatalogPickers/mockData surfaces no longer exist, and corrected Slice 009 status to distinguish shipped paging/filters from the still-planned resource label.

### Docs — Attendee-index backend complete; Live setup actions remain

- Updated the `011-attendee-index-perf` spec/plan/task status for the completed write-through, webhook, and reconciliation implementation, including deadline-safe idempotent replay and archive-time purge coverage. No Frontend API/UI behavior changed.
- Kept the HubSpot registration Workflow action explicit in `docs/hubspot-ops-todo.md`: a HubSpot admin must still configure the listener URL, `X-Attendee-Webhook-Secret` header, and token→body-field mapping, coordinated with the separately tracked ScriptRunner Parameter setup before Live.

### Docs — Spec status audit across `specs/003` through `010`

Six spec `**Status**` headers were stale (some claiming "Draft"/"ready for implement" for features that had actually shipped weeks ago). Verified each against real code + `TODO.md`/`CHANGELOG.md`/ADRs before correcting — see per-spec detail below. Also caught and fixed two stale functional claims inside spec bodies (not just headers), and one leftover shipped-item row in `TODO.md`'s roadmap table.

- **003-check-in**: Status → Shipped/code-complete (only `HS-002`/`X-008` external HubSpot verification remains). Corrected FR-012/FR-013 — the spec described a segmented-control "Check-in | Walk-in" mode switch that was superseded by the actual shipped UI (two buttons, "Start scanner"/"+ Add walk-in", each opening its own modal, per `FE-REDESIGN-016`).
- **004-capacity-management**: Status → Implemented and tested (T001–T042); only live-environment QA sign-off (`X-009`) is pending, not code.
- **005-email-dispatch**: Status → Implemented (US1–US4); live send gated behind `EMAIL_SEND_ENABLED` pending its own verification, not missing code. Flagged (not rewritten, since it's a historical Q&A) that the spec's "tabs" navigation description was superseded by `FE-REDESIGN-014`'s unified list + "+ New campaign" modal.
- **006-public-registration**: Status → **Not started** — corrected an Assumptions-section claim that a "Settings hub module" was already shipped; no such view exists in `Frontend/src` today, so this slice has nowhere to mount `RegistrationPanel.tsx` yet.
- **007-redesign-initiative**: Status → Phase A shipped, Phase B substantially shipped (~8 of ~20 tracked items remain, all polish/ops). Also corrected [ADR-007](docs/decisions/007-hubspot-custom-objects-registration.md) and [ADR-008](docs/decisions/008-standalone-events-event-first-nav.md), both still reading "pending"/"depends on gates" despite the gates clearing 2026-07-14 and the adapter shipping 2026-07-16.
- **008-qr-ticket-emails**: Status → Implemented (shipped 2026-07-16); remaining `tasks.md` items are QA/governance gates (live send test, operator sign-off, `/review-security`), not missing code. Removed a stale `TODO.md` roadmap-table row still listing this as upcoming work after it had already shipped and moved to `TODO-DONE.md`.
- **009-audit-log-ux** / **010-attendee-detail-modal**: both already accurately "Draft" — added a short qualifier to each (design-settled-but-unbuilt for 009; spec/plan/tasks-complete-but-0/36-tasks-done for 010) for consistency with the other specs' new level of detail.

### Docs — Attendee-index + audit-index design settled (grill-with-docs session, mirrors Backend)

Backend production logs showed `OnGetAttendees`/`OnGetAuditRecent` sync requests taking 18-21s, close to ScriptRunner Connect's 25s timeout. A `grill-with-docs` session settled the fix design (see `Backend/CHANGELOG.md` same date for full detail) — planning/documentation only, no implementation yet.

- New ADRs: [011-attendee-index-freshness.md](docs/decisions/011-attendee-index-freshness.md), [012-attendee-index-write-conflict-resolution.md](docs/decisions/012-attendee-index-write-conflict-resolution.md), [013-audit-index-scope.md](docs/decisions/013-audit-index-scope.md).
- **`CONTEXT.md`** gained the **Attendee index** glossary term (the Record Storage cache backing the **Attendee list** UI, kept distinct from it).
- **`TODO.md`**: `FE-SLICE1-005` un-parked, points to the new step table under `BE-SLICE1-006` in `Backend/TODO.md` — no Frontend code changes expected, response shape is unchanged. `X-SLICE007-001` notes updated to reference ADR-013.

### Docs — Attendee Detail modal design settled (grill-with-docs session, mirrors Backend)

New read-only "Attendee Detail" modal (opens from a Registered Attendees row): Basic Information card + an "Attendee Journey" timeline defaulting to the current Event only, with a "Show all communications" expansion. Planning/documentation only — no implementation yet.

- New **[ADR-014](docs/decisions/014-attendee-communications-hubspot-engagement-pull.md)**: the expansion pulls the Contact's full HubSpot marketing-email engagement history (not just EMS's own dispatch records), merged with EMS's own cross-Event dispatch log for "part of this Event" tagging — the first EMS read that spans PII beyond the currently-open Event, so it's the first **audited** GET in Slice 1/2.
- **`CONTEXT.md`** gained **Attendee journey** and **Attendee communications view** glossary terms; reaffirmed "dispatch" (not "Campaign") as the current shipped vocabulary until the target-model rename actually lands.
- **`TODO.md`**: new `X-ATTENDEE-DETAIL-001` (Cross-cutting) plus a new "Attendee Detail modal" section (`FE-ATTENDEE-DETAIL-001/002`, `BE-ATTENDEE-DETAIL-001/002/003`) — flags two real backend gaps found during grilling: no stored registration timestamp or walk-in-vs-form signal exists anywhere today, and no email-open tracking exists anywhere.
- **`docs/hubspot-ops-todo.md`**: new `HS-010` (net-new "dietary requirement" Contact property) and `HS-011` (HubSpot scope grant for Contact engagement/timeline reads — portal confirmed Enterprise tier).
- Deliberately dropped from v1 scope: a "Returning attendee" indicator (would need the same cross-Event lookup, but wasn't asked for) and showing the raw HubSpot contact ID in the UI (existing allowlist rule — `Include in UI: No` — kept, not reversed).

### Docs — `/speckit-specify` for the Attendee Detail modal

Ran `/speckit-specify` against the grilling-session decisions above, seeded so nothing needed rediscovering — zero `[NEEDS CLARIFICATION]` markers, all quality-checklist items pass on first draft.

- New **[specs/010-attendee-detail-modal/spec.md](specs/010-attendee-detail-modal/spec.md)** — 2 prioritized user stories (P1 basic info + event-scoped journey, P2 "Show all communications" expansion), 12 functional requirements, 4 success criteria, edge cases, and assumptions carrying forward the two known backend data gaps (`BE-ATTENDEE-DETAIL-002`/`003`).
- New **[specs/010-attendee-detail-modal/checklists/requirements.md](specs/010-attendee-detail-modal/checklists/requirements.md)** — all items pass.
- New **`specs/010-attendee-detail-modal/assets/`** — placeholder folder + `README.md` for the two reference screenshots shared during grilling; could not be extracted from the chat directly, so they're tracked as a pending manual step rather than silently dropped.
- `.specify/feature.json` now points at `specs/010-attendee-detail-modal`.

### Docs — `/speckit-plan` for the Attendee Detail modal

Ran `/speckit-plan` against `spec.md`. Constitution Check passes against every linked rule source with no violations (Complexity Tracking not needed).

- New **[plan.md](specs/010-attendee-detail-modal/plan.md)** — Technical Context, Constitution Check table, and a concrete Project Structure (2 new Backend handlers + 1 new Frontend modal component, reusing the existing two-repo layout and `On*.ts`/modal-component conventions — no new project/library).
- New **[research.md](specs/010-attendee-detail-modal/research.md)** — 4 implementation-level research items (exact HubSpot engagement-API scope still pending as `HS-011`; dedup strategy; audit metadata shape; where the communications cutoff timestamp is computed). None block Phase 1.
- New **[data-model.md](specs/010-attendee-detail-modal/data-model.md)** — `AttendeeDetail`, `AttendeeJourneyStep`, `CommunicationItem`, `AttendeeCommunicationsResponse` entities, each field marked with its real availability status (today / pending `HS-010` / pending `BE-ATTENDEE-DETAIL-002`/`003`).
- New **`contracts/get-attendee-detail.md`** and **`contracts/get-attendee-communications.md`** — draft request/response/error shapes for the two new routes, explicitly marked as design-only until copied into `api-contract.md`/`rbac.md` alongside the real Backend implementation.
- New **[quickstart.md](specs/010-attendee-detail-modal/quickstart.md)** — §A automated test plan, §B manual UAT steps for both user stories, and a full **§C Operator security comfort checks** (filled per `docs/slice-operator-security-qa-template.md`) covering the new cross-Event PII surface specifically (bounded-exposure check, audit-row check, contact-ID-never-exposed check).

### Docs — `/speckit-tasks` for the Attendee Detail modal

Ran `/speckit-tasks` against `plan.md`/`spec.md`. Tests are marked **required, not optional** in the generated `tasks.md` — this repo's testing discipline overrides spec-kit's generic "tests are optional" default.

- New **[tasks.md](specs/010-attendee-detail-modal/tasks.md)** — 36 tasks across Setup (3), Foundational (4), User Story 1/MVP (11, incl. 4 test tasks), User Story 2 (12, incl. 4 test tasks), and Polish (6). US1 is independently shippable as the MVP; US2 reuses US1's this-Event journey logic and modal component, so it is implementation-dependent on US1 even though it's independently testable once shipped.
- Explicitly scoped **out** of this task list (per plan.md's Constitution Check): `BE-ATTENDEE-DETAIL-002`/`003` (registration timestamp/source, email-open tracking) — both stories are built to degrade gracefully rather than block on these.

### `009-audit-log-ux` — audit log filter bar + Apply/Clear (`FE-SLICE007-001`)

Implements the frontend half of the fix settled by ADR-013 above (Backend half: `BE-SLICE007-001`, see `Backend/CHANGELOG.md` same date). `AuditView.tsx` now loads against the Backend's new bucketed-index read path (transparent to the frontend — no response-shape change beyond `total` becoming bounded/approximate for large logs, see `docs/api-contract.md`).

- **`AuditView.tsx`:** new filter bar (`Action`/`Resource type` as `SelectPicker` dropdowns from a static known-values list — no reactive search; `Actor`/`Resource ID` as plain text inputs for exact match) with explicit **Apply**/**Clear** buttons. Filter changes are held in local draft state and only sent to the Backend when Apply is clicked (not live-as-you-type, per FR-004) — Apply also resets to page 1. Clear resets both the draft and the last-applied filters and re-fetches unfiltered. A zero-match applied filter shows a distinct "No entries match the selected filters." message, never the generic error state.
- **`utils/auditDisplay.ts`:** new `KNOWN_AUDIT_ACTIONS`/`KNOWN_AUDIT_RESOURCE_TYPES` exported constants backing the two dropdowns.
- **`services/dataService.ts`:** `fetchAuditLog`/`AuditLogQueryOptions` accept the four filter options and forward them as query params.
- Tests: extended `AuditView.test.tsx` (filters don't fetch until Apply, zero-match empty state, Clear resets to unfiltered) and `dataService.test.ts` (filter options mapped through to query params, including URL-encoding of an `actor` email).
- `resourceLabel` display (`FE-SLICE007-002`) is a separate, not-yet-built follow-on — out of scope for this change; the Resource column still shows `resourceType`/`resourceId` as it does today.

## 2026-07-16

### Docs — QA coverage for the QR ticket bloat fixes + Scheduled Trigger setup

`specs/008-qr-ticket-emails/quickstart.md` and `specs/005-email-dispatch/quickstart.md` updated to cover the same-day Backend fixes (unregister/undo-check-in ticket cleanup, 24h post-Event-finish purge) and the previously-undocumented Scheduled Trigger — none of this had a QA path before.

- New security checks **C7.6** (ticket dies when attendee is removed), **C7.7** (undo-check-in preserves the ticket, doesn't delete it), **C7.8** (ticket dies ~24h after Event finish with no archive) added to 008's quickstart, plus matching rows in the §C10 sign-off table and a new "No orphaned HubSpot Files" property in §C0.
- Prerequisites/§C1 in 008's quickstart now list the Scheduled Trigger as a concrete, checkable item (script `QueueProcessor`, default export, no payload, every 15 minutes) rather than assuming it's already set up.
- §A1's automated-test table/command extended to cover the new/extended suites (`CustomObjectAdapter`, `EventTicketPurge`, `HubSpotApiClient`, `SingleSendAdapter`, `EmailSendGuard`).
- 005-email-dispatch's quickstart §D checklist line for the Scheduled Trigger de-vagued into concrete setup steps + a cross-reference to `Backend/README.md`'s new section, plus a note that the same trigger now also runs 008's ticket-purge sweep.

### Docs — QR ticket emails: US2/US3 verification pass, TODO close-out (008-qr-ticket-emails, Phase 4 + Phase 5 + Phase 6/T038-T040)

Verification-only pass over `specs/008-qr-ticket-emails/tasks.md` T034–T040 (Backend-side test/code-read work in `Backend/CHANGELOG.md`) — no Frontend code changed.

- `specs/008-qr-ticket-emails/quickstart.md` §B2/§B3 annotated with 2026-07-16 status notes: §B2 (US2 live UAT) needs a human with real HubSpot access and is not runnable from an implementation session (tracked as T036); §B3 (US3 Campaign-reporting) is explicitly marked **skipped** — no channel to reach the HubSpot Team for a live Campaign-association confirmation existed this session, which is the task's own documented, non-blocking fallback (T037).
- `TODO.md`: `FE-QR-GEN-001` moved to `TODO-DONE.md` (done 2026-07-16) — see that entry for shipped scope and the explicit list of what's still open (`BE-EMAIL-SEND-001`, T036 live UAT, T041 operator sign-off, T042 security review). `FE-QR-GEN-002` (send-on-registration) and `X-QR-GEN-001` (HubSpot Team governance) left parked, unchanged.
- Re-ran `npm test`/`npm run lint` after the Backend-side T034 test addition — no Frontend-visible change, **374/374** still passing, lint clean.

### Feature — QR ticket emails: Dispatch-log "Tickets" indicator (008-qr-ticket-emails, Phase 2 + Phase 3/US1)

Frontend half of `specs/008-qr-ticket-emails/tasks.md` T007–T033 (Backend half in `Backend/CHANGELOG.md`) — no new route or view, per the plan's "additive extension of Slice 2" structure decision.

- `types.ts` — `CreateEmailDispatchResponse` and `EmailDispatchListItem` gained a required `ticketsEnabled: boolean`, detected server-side from the chosen template and never client-supplied.
- `utils/normalizeApi.ts` — `normalizeCreateEmailDispatchResponse` and `normalizeEmailDispatchListItem` (used by both the list and detail responses) map `ticketsEnabled` through, defaulting to `false` when the field is absent (e.g. pre-feature stored jobs).
- `views/EmailDispatchView.tsx` — the Dispatch-log row shows a small "Tickets" badge (shared `.badge`/`.badge--registered` primitive, not a one-off style) next to the dispatch name when `ticketsEnabled` is true. Renders as static text regardless of the raw field's value — even a hostile non-boolean value from the API can only ever produce the literal word "Tickets", never interpolated markup (NFR-002).
- **Tests:** extended `normalizeApi.test.ts` (ticketsEnabled pass-through + default-false case) and `EmailDispatchView.test.tsx` (badge shown/hidden per dispatch, badge renders as plain text against a hostile raw value). `npm test` 374/374 passing, `npm run lint` clean, `tsc --noEmit` clean.
- **Not built (out of scope for this change):** US2/US3 verification, `/review-security`, quickstart §C sign-off — see `TODO.md`'s `FE-QR-GEN-001`.

### Docs — `specs/008-qr-ticket-emails/plan.md` + Phase 1 artifacts (`/speckit-plan`)

- Generated the implementation plan and design artifacts: `research.md` (4 implementation-level unknowns not resolved by the ADR-010 spike — QR encoder inside ScriptRunner's sandbox, `subcategory` PATCH mechanism, HubSpot Files scope, `SingleSendAdapter` interface shape), `data-model.md` (extends existing `EmailDispatchJob` with `ticketsEnabled` and `RegistrationCacheRecord` with `checkInTicket`/`checkInTicketImageFileId` — no new store), `contracts/qr-ticket-dispatch-delta.md` (one new response field on two existing routes, no new routes), and `quickstart.md` (including the mandatory §C operator security comfort checks, filled for this slice — recipient isolation, consent honored, no durable PII write, ticket dies with the Event, audit trail).
- Key finding surfaced during planning: this feature and `BE-EMAIL-SEND-001` (Backend `TODO.md`) both need real work on the same file, `Utils/HubSpot/SingleSendAdapter.ts` — flagged as a build-order dependency, not something to build twice.
- No code shipped — planning artifacts only. Next: `/speckit-tasks`.

### Docs — `specs/008-qr-ticket-emails/spec.md` created (`/speckit-specify`)

- Formalized the QR ticket-email feature as a slice spec, matching how Slice 2 (`005-email-dispatch`) was delivered. Encodes ADR-010's settled architecture as testable user stories/requirements without re-deriving it — 3 user stories (P1: send tickets through the ordinary Compose flow; P2: consent-driven fallback to manual check-in; P3: HubSpot Campaign reporting rollup), 12 functional requirements, 3 non-functional/security requirements, and a `Clarifications` section capturing the grill/spike Q&A provenance. No `[NEEDS CLARIFICATION]` markers — all underlying decisions were already resolved before drafting. Quality checklist at `specs/008-qr-ticket-emails/checklists/requirements.md` passes in full.
- `TODO.md`'s `FE-QR-GEN-001` updated to point at the new spec directory. Next step is `/speckit-plan`.

### Docs — ADR-010: QR ticket-email send mechanism confirmed via live HubSpot UAT spike

- Ran a `/grilling` (`grill-with-docs`) session on `docs/design-notes/qr-ticket-email-campaigns.md`, resolving the send-mechanism uncertainty that doc research alone couldn't close. Live-tested against our own HubSpot portal: (1) `POST /marketing/v4/email/single-send` with a per-recipient image URL passed inline via `contactProperties` — **pass**, no durable Contact write needed; (2) associating the email to a HubSpot Marketing Campaign so the send rolls up into Campaign analytics — **pass**, despite this rollup being undocumented in HubSpot's public API docs.
- New finding not in any public doc: the target email needs **`subcategory: "single_send_api"`** set (not just `type: AUTOMATED_EMAIL`) — this field isn't exposed in the drag-and-drop editor UI and must be set via the Marketing Emails API. Without it, HubSpot rejects the send with `400 MISSING_REQUIRED_PARAMETER`.
- Wrote **[ADR-010](docs/decisions/010-qr-ticket-email-single-send.md)** capturing the settled architecture (JWT identity + lazy-mint-at-send + v4 single-send + Campaign association + consent/late-registrant trade-offs). `docs/design-notes/qr-ticket-email-campaigns.md`, `CONTEXT.md` § QR check-in, `TODO.md` (`X-QR-GEN-001`/`FE-QR-GEN-001`), and `docs/hubspot-ops-todo.md` (`HS-003`) all updated to point at it. `HS-003`/`X-QR-GEN-001` narrowed to a governance-only conversation (naming/consent ownership) — no technical spike remains open.
- No code shipped — this is architecture confirmation ahead of scheduling `FE-QR-GEN-001`/`BE-QR-GEN-001` for build.

### Docs — QR ticket-email design note: HubSpot API research + decisions ahead of grill session

- `docs/design-notes/qr-ticket-email-campaigns.md`: researched HubSpot's public API docs for the 3 open UAT-spike questions from the 2026-07-15 discussion. Key correction: **there is no API to trigger a batch/list send of a standard Marketing Email at all** (UI/workflow-only) — the note's "dual send path" table assumed this was an option and it never was; QR (and non-QR) sends both need the v4 marketing single-send API (`POST /marketing/v4/email/single-send`, needs Marketing Hub Enterprise), not a list send. Per-Contact dynamic image injection via a contact-property token confirmed viable from docs. Marketing Campaign association across send types remains genuinely undocumented — flagged as still needing a live UAT spike, not just doc research.
- User decided 4 of the open items: detect the HubSpot template snippet (not an EMS toggle) to know a template needs QR; host the transient QR PNG in HubSpot Files with purge-on-archive; accept the late-registrant gap as out of scope for now (parked as a possible future "send on registration" Campaign trigger — see `TODO.md` `FE-QR-GEN-002`); revoke/reissue tickets after the event. Mint timing given as a recommendation (lazy-mint at send time) pending confirmation, not locked in. Governance (consent/ownership) left explicitly open.
- `TODO.md`: narrowed `X-QR-GEN-001`'s remaining live-UAT-spike scope; added `FE-QR-GEN-002`/`BE-QR-GEN-002` (parked) for the future on-registration Campaign trigger. `docs/hubspot-ops-todo.md`'s `HS-003` narrowed to match — cross-referenced against `HS-009`'s existing portal-tier question (same Marketing Hub Enterprise/Pro gate).
- No code change — documentation only, ahead of a `/grilling` session on the remaining open items.

### Feature — Check-in list redesign: avatars, status indicators, checked-in timestamp; search-first gate removed

- `CheckInView.tsx`: restyled the roster rows to match the redesign mockup — a circular initials avatar per row (`attendeeInitials`, matching the existing `.confirmInitials` pattern), a light-tinted row background for checked-in attendees, and a green "In · HH:MM" indicator (replacing the plain outline "Undo check-in" button — clicking it still opens the same undo-confirm flow). Unchecked rows keep the orange `Check in` button.
- Removed the 2-character search-first gate (`CHECK_IN_MIN_SEARCH_LENGTH`) — the full roster now loads on open (`pageSize` 200, no `q`), matching the mockup. This gate existed purely as a workaround for a slow full-HubSpot-join attendee fetch, tracked as `FE-SLICE1-005`/`BE-SLICE1-006` (still parked/unresolved) — removing it is an accepted performance risk on large rosters, not a fix to the underlying issue. See `TODO.md` for the updated note.
- Wired up the check-in timestamp end-to-end: the backend has returned a real `checkedInAt` since `BE-REDESIGN-001` (2026-07-14), but `normalizeApi.ts` was hardcoding it to `null` and `SliceAttendee`/`ConfirmCheckInResponse` typed it as literal `null`. Fixed the types (`string | null`) and normalization (`normalizeSliceAttendeesResponse`, `normalizeConfirmCheckInResponse`) to pass the real value through, and `CheckInView` now updates `checkedInAt` locally on confirm/undo so the indicator reflects the new state without a refetch.
- `format.ts`: new `formatCheckInTime()` — 24-hour `HH:MM` for the list indicator.
- Docs: `docs/ui-routes.md`, `specs/003-check-in/quickstart.md`, `docs/api-contract.md` updated to describe the new default-loaded roster and the `checkedInAt` display.
- Tests: `CheckInView.test.tsx` updated for default-load behavior (roster fetches on mount, not gated behind typing) and the new status-indicator button; `normalizeApi.test.ts` and `format.test.ts` extended for `checkedInAt` pass-through and `formatCheckInTime`. Full suite green (45 files / 370 tests).
- Not verified in a live browser — Google sign-in is required and no test credentials were available in this session (same constraint as the `SelectPicker` entry above); verified via the full Vitest suite instead.

### Feature — `SelectPicker` dropdowns are now searchable (typeahead filter)

- `SelectPicker.tsx`: opening the popover now focuses a text input (pattern borrowed from `WorkingEventPicker`) that filters the option list by label substring as the user types. Keyboard nav (arrow keys, Home/End, Enter, Escape, Tab) moved from the listbox onto this search input, since focus now lands there on open. Filtering out the active option's index clamps `activeIndex` back into range.
- Applies to every current usage automatically: `CatalogProgramModal`, `CatalogEventModal` (program/status/publish-state), `TimePicker` (wraps `SelectPicker`), `EmailDispatchView` (template/segment/edit-template pickers), `AttendeesView` (email dispatch filter).
- `Pickers.module.css`: split `.menu` into a bordered wrapper `div` plus a scrollable `.optionsList`; added `.search` (44px min-height, `--input-bg`, 16px font at ≤900px to avoid iOS auto-zoom) and `.empty` ("No options found." message when the filter matches nothing).
- Tests: `SelectPicker.test.tsx` updated to dispatch keyboard events on the new search input instead of the listbox, plus new cases for focus-on-open, substring filtering, the empty-results message, and search clearing on reopen. `TimePicker.test.tsx` updated the same way plus a new typeahead case (filtering by formatted time label, e.g. "9:00 AM").
- Not verified in a live browser — the app requires Google sign-in (`USE_MOCK_AUTH` is hardcoded `false`) and no test credentials were available in this session; verified via the full Vitest suite for all affected files instead (88/88 passing).

### Fix — compose modal no longer fails entirely when one reference-data field errors

- `useEmailDispatchWorkflow.loadComposeData` previously fetched limits/templates/segments via a single `Promise.all` — one field failing (e.g. Templates 403ing on the HS-009 scope gap) rejected the whole load, so none of the three populated even though the other two had actually succeeded over the wire.
- Switched to `Promise.allSettled`: each field now sets its own state (`limits`/`templates`/`segments`) on success and its own error (`limitsError`/`templatesError`/`segmentsError`) on failure, independently.
- `EmailDispatchView`: replaced the single blanket error banner with a per-field inline error (message + "Try again" button) shown in place of the Template picker or the Segment picker specifically, so a failure in one doesn't hide a working picker in the other.
- Tests: 3 new cases in `useEmailDispatchWorkflow.test.ts` (one field failing doesn't block the other two) + 2 new cases in `EmailDispatchView.test.tsx` (Templates failing still shows a working Segment picker, and vice versa).

### Fix (Backend-only) — compose modal's Template and Segment dropdowns were empty

- Root cause was entirely server-side (see `Backend/CHANGELOG.md`) — Templates were a deliberate stub pending the `005-email-dispatch` T002 HubSpot spike; Segments had a real bug where the adapter parsed a field name (`listType`) that doesn't exist on HubSpot's actual API response, silently discarding every result. Both are fixed now that the user confirmed HubSpot API access. No Frontend code changes were needed — `EmailDispatchView`/`useEmailDispatchWorkflow` already called `fetchEmailTemplates`/`fetchEmailSegments` correctly.

### Test fix — `EventsView.test.tsx` "Create Program" heading assertion updated to match actual modal text

- The "opens create Program / Event modals from the header actions" test asserted `heading: 'Create Program'`, but `CatalogProgramModal.tsx`'s create-mode heading is `'New program'` (sentence case) — set during today's Program modal header redesign (see the `New program`/`Edit program` header entry above). Confirmed the modal's rendered text is the intended/current behaviour, not a bug; updated the test's expected heading to `'New program'` to match.
- Verified: `npx vitest run src/views/EventsView.test.tsx` (13/13 passed) and full `npx vitest run` (45 files / 357 tests passed) — no regressions.

### Feature — Overview "emails scheduled this week" now one API call, not one per event (FE-REDESIGN-020)

- `OverviewView.loadStats` no longer fans out `fetchEmailDispatches({ view: 'scheduled' })` once per active event — it makes a single `fetchScheduledEmailSummary()` call against the new Backend aggregate route (`GET events/scheduled-email-summary`), which sums the same numbers server-side.
- `dataService.ts`: new `fetchScheduledEmailSummary()` + `normalizeScheduledEmailSummaryResponse()`; `types.ts`: new `ScheduledEmailSummary`.
- The capacity fan-out (one `fetchEventCapacityStatus` call per portfolio event) is unchanged — that's the standing `FE-REDESIGN-021` decision, out of scope for this change per user direction.
- Tests: `OverviewView.test.tsx` updated to mock `fetchScheduledEmailSummary`; added a case asserting the stat tile renders the aggregate's actual numbers (not just that the call happened).
- Docs: `docs/api-contract.md` + `docs/rbac.md` updated with the new route.
- **Found in passing, not fixed here:** `EventsView.test.tsx`'s "Create Program" heading assertion is stale against the Program modal's actual (lowercase) heading text from an earlier change today — flagged as a separate spawned task, out of scope for this change.

### Architecture — legacy `programs/{programId}/events/{eventId}/…` routes retired (X-REDESIGN-003)

- Confirmed via a full read of `dataService.ts` that no Frontend call site has built a `programs/…` URL for a while — both routes' "legacy" wrapper functions already ignored their `programId` argument. The Backend deleted the legacy route table entries this session (see `Backend/CHANGELOG.md`); no Frontend code changes were needed.
- Docs: `docs/api-contract.md` (dropped legacy-alias mentions from every affected route) + `docs/rbac.md` updated.

### Fix — standalone-event storage-key drift closed (X-REDESIGN-010)

- Verified the actual risk (see `Backend/CHANGELOG.md` for the fix): `eventId` alone was already globally unique, so there was never a cross-event collision — but standalone Events' storage keys were template-coercing `programId: null` into the literal string `"null"`, which is a real drift risk if an Event's Program association ever changes later. Backend now normalizes to a `'_standalone'` sentinel; covered by new tests.

### Docs — new `docs/hubspot-ops-todo.md` for ongoing HubSpot-portal work

- Added [docs/hubspot-ops-todo.md](docs/hubspot-ops-todo.md) — a running checklist for work that has to happen inside the HubSpot portal itself (forms, workflows, schema, owners) as distinct from EMS repo code tracked in `TODO.md`. Seeded with 8 items pulled from existing `X-*` cross-cutting rows: registration form match-key wiring (`HS-001`/`X-REDESIGN-009`), walk-in form verification (`HS-002`/`X-008`), QR ticket-email spikes (`HS-003`/`X-QR-GEN-001`), Event Items timezone property (`HS-004`/`FE-REDESIGN-026`), HubSpot Owners access (`HS-005`/`X-REDESIGN-011`), registration-submit audit gap (`HS-006`/`BE-SLICE15-010`), attendance migration/backfill (`HS-007`/`X-REDESIGN-005`), and per-environment ID re-verification before Prod cutover (`HS-008`/`X-REDESIGN-007`).
- `TODO.md` (both folders): added a pointer to the new doc; cross-referenced each relevant `X-*` row with its `HS-*` counterpart.
- `hubspot-schema.md` § *Registration match-key mechanism*: corrected a stale line claiming `registration_slug` is set "manually today" — confirmed `HubSpotCatalogAdapter.createEvent` already auto-generates it (shipped with `BE-REDESIGN-001`); the only open gap is the HubSpot-side form/workflow piece, now tracked as `HS-001`.

### Ops — UAT infrastructure confirmed live

- `TODO.md`: **`FE-INFRA-002`** (UAT GitHub Pages site) and **`FE-INFRA-003`** (ScriptRunner UAT environment) marked done — user confirmed both are live. Flagged that this may unblock **`X-009`**/**`FE-CAP-001`** capacity live QA, which was blocked specifically on this infra; needs user confirmation before treating it as unblocked (data readiness in the UAT HubSpot instance is a separate question).

### Ops — `BE-CORS-001` verified; Cloudflare proxy confirmed unnecessary

- User inspected live authenticated response headers from the deployed Pages origin: `access-control-allow-origin: https://bobbybaileysr.github.io` (specific, not `*`), correct `allow-methods`/`allow-headers`. Confirms the AWS gateway's `*` wildcard seen on its OPTIONS preflight does not leak onto real data responses.
- `TODO.md`: **`FE-OPS-002`** and **`FE-INFRA-001`** (Cloudflare Worker/Pages Function proxy) marked **not needed** — the `route` query-param workaround (2026-07-13) plus this CORS verification means direct browser calls to ScriptRunner Connect work end-to-end from the deployed origin with no proxy in front. See `Backend/TODO.md` / `TODO-DONE.md` for `BE-CORS-001`.

### Docs — verified `X-REDESIGN-002`/`X-REDESIGN-007` already complete; corrected stale TODO status

- Asked to implement the `CustomObjectAdapter` (`X-REDESIGN-002`) and its stable HubSpot-ID constants (`X-REDESIGN-007`); found both already fully implemented, wired into every attendee/check-in/capacity/email handler, and covered by passing tests (273/273 across 23 suites) — no code change needed.
- `TODO.md`: corrected both rows and the "Remaining roadmap" summary from "next: implementation" / "remaining: add constants" to done; only Prod Parameter values (an ops task, not code) remain open.

### Fix — Program modal required-asterisk wrapping to a new line; oversized modal subtitle spacing (all modals)

- **Program modal**: the "Program name" label text and its required `*` were separate children of a column-flex `<label>`, so the asterisk became its own flex item and dropped below the label text. Wrapped both in a single `<span>` so they lay out as one line.
- **Program + Event modals**: the header subtitle's `margin-bottom: 0` was losing to the global `.modal p { margin-bottom: 20px }` rule (`css/components.css`) on CSS specificity, making the header noticeably taller than intended. Fixed by scoping `.subtitle` under the module's local `.modal` class (`.modal .subtitle`), which now wins without `!important`.

### UX — Program create/edit modal refined to match design_handoff 2

- **Header**: title is now "New program" (create) / "Edit program" (edit) with a descriptive subtitle ("Group related events under a single program"), wired to the dialog via `aria-describedby`, plus a close (×) button — mirrors `CatalogEventModal`'s header pattern.
- **Fields**: added placeholders ("e.g. Summit Series 2026", "What is this program about?") and the tinted `--input-bg` field fill so inputs match the pickers.
- **Program owner**: added the owner dropdown from the design as a **disabled / UI-only** control — `hubspot_owner_id` is a real Program property but there is no owners-list API yet; backend wiring parked as `X-REDESIGN-011` (Backend `BE-REDESIGN-011`).
- **Footer**: primary action relabelled "Create program" / "Save program", Archive relabelled sentence-case, actions moved into a tinted footer bar that bleeds to the modal edges.
- Tests updated for the new labels + coverage for subtitle wiring, close button, and the disabled owner field.

### UX — Overview restyled to match design_handoff 2

- **Stat tiles**: left-aligned cards with accent square, value → label → delta (no centred `hub-stat`).
- **Split**: Upcoming events / Recent activity use `2fr 1fr`; upcoming card has orange top border.
- **Event rows**: 44×44 date badge (month + day), name/location stack, capacity count + % above bar, status pill — fixes the overlapping date/title layout.
- **Activity**: timestamp on its own line under the action (no `list16 Jul` concatenation). Cobalt dots per design.

### UX — page loads: spinner + Did you know only (no skeleton), larger tip

- **All page loads** (Overview, Programs & Events, Event Details, Attendees, Audit, and any other `LoadingState` page/panel use): removed table/card skeleton shimmer. Loading UI is the centred Did you know tip, spinner, and message.
- **Did you know tip box** ~50% larger (max-width, padding, type). Tip renders above the spinner. Attendees/Audit loading no longer wrap the spinner in a card.
- Docs: `docs/loading-did-you-know-tips.md` updated to match.

### Fix — Overview "emails scheduled this week" used a missing API route

- **`OverviewView`**: "Emails scheduled this week" now fans out `fetchEmailDispatches(eventId, { view: 'scheduled' })` (live Slice 2 route) instead of deprecated `fetchScheduledEmails` → `GET …/email/scheduled`, which has no backend handler and broke `#/overview` on the live API (`No handler for events/…/email/scheduled`).
- Removed unused `fetchScheduledEmails` from `dataService` (nothing else called it). Updated `docs/ui-routes.md`, `TODO.md` `FE-REDESIGN-020`, and Overview tests.

### Docs — attendees list rate limit (120/60s)

- **`docs/api-contract.md`** / **`docs/rbac.md`**: document `GET …/attendees` per-actor limit **120 / 60s** (was implied default 10/60s). Backend change in `OnGetAttendees`.

## 2026-07-15

### Architecture — unify check-in / attendee mutation error messages (review candidate 4, part 1)

- Added `src/utils/attendeeMutationErrors.ts` (`attendeeMutationErrorMessage`, + tests) and adopted it in `CheckInView` (confirm + undo) and `AttendeesView` (remove + undo). **Fixes the documented drift** the review flagged: `AttendeesView` translated the `contact_not_registered` code to a friendly message while `CheckInView`'s undo path showed a generic string; both now share one mapping. Also stops `CheckInView` from surfacing a raw backend `err.message` on check-in failure (plain-language fallback instead, per the UX rule).
- Parked the larger candidate 4 work (extract a `useCheckInWorkflow` hook; split the scanner/walk-in/confirm dialogs into sibling components) as `FE-ARCH-004` — a 642-line view with heavy tests; design-sensitive, better via the `/grilling` loop.

### Architecture — collapse `CatalogPickerSelect` into `SelectPicker` (review candidate 7)

- Deleted `CatalogPickerSelect.tsx` (+ its orphaned `CatalogPickers.module.css`) and pointed its four call sites (`AttendeesView` dispatch filter; `EmailDispatchView` template/segment/edit-template selects) at `SelectPicker`. The two components had the same prop shape, but `CatalogPickerSelect` lacked keyboard arrow/Home/End navigation, used a focus outline (`--color-link`) that fails WCAG 1.4.11 in Dark Aurora, and had no visible keyboard-active-option indicator. **This is an accessibility fix**, not just dedup — the weaker picker was the one shipping in views. `SelectPicker`'s existing a11y tests now cover these surfaces.
- Parked the shared-popover-shell extraction (`usePopoverShell` across `SelectPicker`/`CalendarPicker`/`WorkingEventPicker`) as `FE-ARCH-007` — larger, and each picker's popover needs differ.

### Architecture — shared `useDebouncedValue` hook (review candidate 6, part 1)

- Added `src/hooks/useDebouncedValue.ts` (+ tests) and adopted it in `AttendeesView`, `CheckInView`, and `useEmailDispatchWorkflow`, replacing three byte-identical hand-rolled `setTimeout`/`clearTimeout` debounce blocks. The event-switch reset effects now just clear `searchQuery` (the debounced value derives from it).
- Parked the remainder of candidate 6 (the `loading/error/empty/reloadKey` async-resource ladder + paginator abstraction across 5 views) as `FE-ARCH-006` — design-sensitive and higher-churn, flagged for the `/grilling` loop first.

### Architecture — attendee-presentation adapter (review candidate 8)

- Added `src/utils/attendeePresentation.ts` (`attendeeName`, `attendeeInitials`, `initialsFromName`) — one home for turning a `SliceAttendee`'s name into display strings. Replaced four re-authored copies across `CheckInView`, `AttendeesView`, `EmailDispatchView`, `EventHubView` that used three subtly different algorithms (notably `AttendeesView` lacked the `?` initials fallback and skipped whitespace-trimming). New unit tests cover all three helpers.
- Added `walkInFormUrlError` to `src/utils/hubspotFormUrl.ts` and pointed both the byte-identical copies at it (`CheckInView` render path + `CatalogEventModal` field validation), so the validation message can't drift.

### Architecture — drop mock data; collapse the data seam (supersedes review candidate 5)

- Deleted `src/data/mockData.ts` (~1,331 lines). Testing is now against HubSpot Staging via the live ScriptRunner API; the mock-data mode was already inert (`USE_MOCK_API: false`). **Mock auth (`USE_MOCK_AUTH`) is kept** for local sign-in.
- Removed `withMockFallback` + `mockDelay` from `dataService.ts`; every method now calls `apiRequest` directly and normalizes via `normalizeApi.ts`. This collapses the shallow data seam the architecture review flagged as candidate 5 — with no mocks, there is no mock-vs-live shape to reconcile, so candidate 5 is satisfied by removal rather than rework.
- Dropped the mock error mappers (`mapMockCatalogError`/`mapMockCapacityError`/`mapMockEmailError`/`mapMockThemePreferenceError`) — dead once the mock arms were gone.
- Removed the mock-only `email` parameter from `getThemePreference`/`setThemePreference` (the live route derives the user from the session); updated `useTheme.ts` call sites.
- Deleted `src/utils/celebrationTheme.ts` (+ test) and the `CELEBRATION_THEME_EMAIL`/`CELEBRATION_TOAST_EMAIL`/`CELEBRATION_TOAST_MESSAGE` + `USE_MOCK_API`/`MOCK_API_DELAY_MS` config fields — all mock-mode stand-ins whose only consumer was `mockData.ts`. Live celebration gating stays via the backend `user/prefs` response.
- Rewired `PocBanner`/`LoginView` to stop labelling the removed `USE_MOCK_API` mode.
- Rewrote `dataService.test.ts` as a live-path suite (route/method/body/token + normalization). Typecheck + lint clean; suite green (338 tests).
- Docs: updated `CLAUDE.md`, `.cursor/rules/frontend-patterns.mdc`, and `README.md` (removed the "keep `USE_MOCK_API` path" rule and the mock-UI setup step).

### Architecture — delete dead data-seam code (review candidate 1)

- Removed unused `dataService` methods `previewEmail`, `sendEmail`, and `fetchTemplates` (superseded by `previewEmailDispatch`/`createEmailDispatch`/`fetchEmailTemplates`) plus their factory bindings and now-unused imports. Why: zero consumers across views/hooks.
- Removed the orphaned `normalizeApi` functions `normalizeEvent`, `normalizeAttendee`, `normalizeEventsResponse`, `normalizeEventResponse`, `normalizeAttendeesResponse` and the `isUiEventShape`/`isUiAttendeeShape` mock-vs-live guards they depended on — exported and unit-tested but imported by nothing. Deleted their tests from `normalizeApi.test.ts`. Why: tested code disconnected from every live path (locality inversion).
- Typecheck + lint clean; suite green (356 tests).

### Docs — cleanup pass (Tier A + B)

- Fixed stale `Frontend/js/config.js` references → `src/config.ts` in blueprint; corrected `AGENTS.md` annex wording.
- Archived completed React migration plan under [docs/archive/react-migration-plan.md](docs/archive/react-migration-plan.md); shipped specs **001** / **002** → [specs/_shipped/](specs/_shipped/); spent custom-objects grilling brief → [specs/_archive/](specs/_archive/).
- Slimmed [CHANGELOG.md](CHANGELOG.md): older entries (2026-07-02–07) → [CHANGELOG-archive-2026-07-02-to-07.md](CHANGELOG-archive-2026-07-02-to-07.md).
- Extracted TODO Done rows → [TODO-DONE.md](TODO-DONE.md).
- Root skills: `.claude/skills` is now a symlink to `.cursor/skills` (single tree).

### Docs — QR ticket email Campaign direction (parked)

- New [docs/design-notes/qr-ticket-email-campaigns.md](docs/design-notes/qr-ticket-email-campaigns.md): working direction for event+contact JWT in Record Storage, HubSpot template QR snippet, EMS inject at Campaign send (any schedule), dual send path (Marketing Email vs Single-Send), lean HubSpot, open UAT spikes. **Not an ADR; not scheduled for build.**
- Linked from `CONTEXT.md`, `docs/hubspot-schema.md` § QR JWT, `TODO.md` (`FE-QR-GEN-001`, `X-QR-GEN-001`).

### Fix — UAT login 405: wire absolute API base URL for deployed builds

- **`config.ts`**: `API_BASE_URL` now reads `import.meta.env.VITE_API_BASE_URL`, falling back to the relative `/api/ems` for local dev. On GitHub Pages there is no proxy, so the previously-hardcoded relative path meant the login `POST` hit the static Pages host itself → **405 Method Not Allowed** (with a compressed HTML error body, not JSON), never reaching ScriptRunner.
- **`deploy-uat.yml`**: build step now passes `VITE_API_BASE_URL` from the `UAT_API_BASE_URL` Actions repo variable, so the UAT bundle targets the absolute cross-origin ScriptRunner listener URL.
- **`vite-env.d.ts`**: typed the new `VITE_API_BASE_URL` env var.
- Note: cross-origin UAT calls also require the Pages origin in the backend `ALLOWED_ORIGINS` Parameter and in Google OAuth authorized origins.

### Feature — Undo check-in UI (`FE-REDESIGN-001` / T056)

- **`dataService.undoCheckIn`** + mock + live `POST events/{eventId}/checkin/undo` mapping; createDataService binding.
- **Attendees**: checked-in rows show **Undo check-in** (confirm → toast → refetch); registered rows keep **Remove**.
- **Check-in**: search results show **Undo check-in** for already-checked-in people; confirm modal offers undo when status is already checked in.
- **Audit feed**: `checkin.undo` / `attendee.remove` plain-language phrases.
- **Tests**: AttendeesView, CheckInView, dataService undo coverage.

### Docs — Label directionality confirmed (`X-REDESIGN-004`)

- HubSpot Contact→Event labels are **`291` registered** / **`293` checked-in** (Event→Contact stays `290`/`292`).
- Google OAuth origins marked done (`FE-OPS-001`).

### Chore — Remove unused Chart.js dependencies (`FE-REDESIGN-023`)

- Uninstalled `chart.js` and `react-chartjs-2` (sole consumer `ConversionChart` was removed with Analytics in T080).
- Dropped Chart.js / `ConversionChart` references from `CLAUDE.md`, README, UI-stack/security/responsive rules, and related comments.
- Ops: Celebration theme allowlist Parameter is List (`X-REDESIGN-008`) and toast Parameters exist (`X-REDESIGN-010`) — marked done in `TODO.md`.

### Fix — Email compose modal: HubSpot-list + Schedule states

UI parity pass on `EmailDispatchView` for the HubSpot-list and Schedule branches (against `design_handoff 2/`).

- **HubSpot list**: reuse the tinted `.selectionInfo` box (`N recipients selected` / `Synced from HubSpot list {name}`); drop the verbose segment-membership hint; visually hide the list picker’s built-in label (same pattern as Template).
- **Schedule**: Date + Time side by side via existing `TimePicker` (15-minute slots, clock icon); remove the Hour/Minute-grid/Timezone stacked controls from the modal (timezone still sent under the hood — Event Items have no timezone property yet; parked as `FE-REDESIGN-026`).
- **Copy**: primary CTA becomes `Schedule for {date} at {time}`; Summary **Delivery** shows the same datetime instead of static “Scheduled”.
- **Still parked**: Summary **From** (`FE-REDESIGN-024`), **Save as draft** (`FE-REDESIGN-008`), list option `· N contacts` (`FE-REDESIGN-025`).
- **Tests**: `EmailDispatchView.test.tsx` + `emailSchedule.test.ts` (`formatScheduleSlotLabel`).

### Fix — Check-in screen: design_handoff alignment

UI review pass on `CheckInView` (`src/views/CheckInView.tsx` + `.module.css`) to match the design.

- **TopBar**: static `"Check-in"` / `"Scan, search or add attendees at the door"` — dropped the redundant event-name title and the dynamic match-count subtitle.
- **Layout**: Attendees panel widened to `2fr` vs the right column's `1fr` (was an even split).
- **Check-in button**: filled `btn-primary` (brand orange) instead of the outline style; action column pinned to the far right.
- **Attendee rows**: company + type moved to a muted sub-line under the name (removed the Company/Type columns); taller rows and a taller results container.
- **Search**: adopted the Registered-Attendees `.searchField` pattern (Material Symbols search icon + tinted field); shorter placeholder, `0.8rem` text.
- **Searching indicator**: now renders as a row inside the results table instead of in the panel header (was shifting the header layout).

### Change — Email compose modal: full "New campaign" redesign (initial state)

Reworked the inline compose modal in `EmailDispatchView.tsx` + `useEmailDispatchWorkflow.ts` + `.module.css` to match `design_handoff 2/`'s "New campaign" layout. Scope was the **initial/default state** + the **Recipients** section (per operator direction); other selection-driven branches unchanged.

- **Header**: title + `"Compose and send to {program — event}"` subtitle + a close (×) button, bled to the modal edges like `CatalogEventModal`. Footer gets the matching bled/tinted treatment.
- **Template**: section with a `"Choose a HubSpot email template to send."` hint.
- **Recipients** (full redesign): segmented **Event attendees / HubSpot list** toggle (was source radios); for Event attendees an always-visible attendee checklist with avatars + `Select all` / `Checked-in only` / `Clear` quick actions and a `"N of N attendees selected"` info box (was radio modes revealing a table only under "Manual selection"). Quick actions map to existing audience payloads (`registered_all` / `registered_checked_in`); hand-picking switches to `registered_manual`, seeded from the current selection.
- **Delivery**: segmented **Send now / Schedule** pill toggle (was radios).
- **Summary card**: derived Event / Template / Audience / Recipients / Delivery rows (accent-topped).
- **Footer**: `Cancel` + `Send campaign now` / `Schedule campaign` (single primary button; label follows delivery mode).
- **Auto-naming**: the visible "Dispatch name" field was removed to match the design; the dispatch is now auto-named after the selected template (`useEmailDispatchWorkflow` effect). Validation still blocks send when no template is selected.
- **Removed to match design**: the "Dispatch name" field and the `"N / 10 dispatches this hour · Large-send confirm at 50+"` info line. The hourly limit is **still enforced** via the large-send confirm dialog; the informational readout removal is tracked in `TODO.md` (`FE-REDESIGN-024`).
- **Deferred (parked in `TODO.md`)**: the Summary **"From"** row (no sender identity in the data model — `FE-REDESIGN-024`) and the **"Save as draft"** footer button (no draft-save endpoint — `FE-REDESIGN-008`).
- **Tests**: `EmailDispatchView.test.tsx` and `useEmailDispatchWorkflow.test.ts` updated for the new controls, auto-naming, and payload mapping (full suite 358 green).

### Fix — Email compose modal: styling polish (review round 2)

Sizing/spacing + control styling pass on the compose modal (`EmailDispatchView.module.css` + search markup) after design review.

- **Template/picker triggers**: tinted `--input-bg` fill (was white `--panel`); pickers span full width (removed the 32rem `.field` cap); the "Template" label now matches the "Recipients"/"Delivery" section titles (0.95rem/700).
- **Recipient search**: adopted the icon + tinted `.searchField` treatment (Material Symbols search icon), matching Check-in / Registered Attendees (was a plain white input).
- **Checkboxes**: `accent-color: var(--accent)` + 18px sizing (was default browser blue).
- **Spacing**: larger inter-section gap (20px), taller segmented-toggle buttons (46px), roomier attendee rows and selection info box.

### Fix — Email compose modal: paragraph margins leaking from global `.modal p` (review round 3)

Root-caused excessive/uneven spacing (over-tall section headings, a ~2× "N of N selected" box, big Template title↔hint↔dropdown gaps) to the global `.modal p { margin-bottom: 20px; color: var(--muted) }` rule in `css/components.css`. Its `.modal`-class + `p`-element specificity (0,1,1) outranked the compose modal's single-class module rules (0,1,0), so every `margin: 0` was silently ignored and each paragraph carried a stray 20px bottom margin.

- Scoped the modal's paragraph rules under `.composeModal` (specificity 0,2,0) so the intended margins/colours win: `.composeSubtitle`, `.sectionTitle`, `.sectionHint`, `.selectionCount`, `.selectionMeta`, `.summaryTitle`, `.manualHint`, `.recipientPreview`.
- Fixed the **Template** hint ordering — now renders **title → hint → dropdown** (own visible title/hint; the picker's built-in label kept for a11y but visually hidden) instead of the hint under the control.
- Tightened header padding, inter-section gap (16px), toggle height (40px) and the selection-info box back down after the round-2 over-spacing.

## 2026-07-14

### Feature — Celebration login toast from prefs (independent of theme)

- **API:** `user/prefs` responses include `celebrationToastMessage` (`string | null`) from backend Parameters `CELEBRATION_TOAST_EMAIL` + `CELEBRATION_TOAST_MESSAGE`.
- **`useTheme`**: shows the one-time login toast whenever that field is non-null — any theme, including for users who cannot select Celebration.
- **Mock:** `CONFIG.CELEBRATION_TOAST_EMAIL` / `CELEBRATION_TOAST_MESSAGE` stand in for those Parameters; helpers in `celebrationTheme.ts`.
- **Docs:** `docs/api-contract.md` updated. Ops: create the two Parameters in ScriptRunner Connect (parked as `X-REDESIGN-010`).

### Fix — `CELEBRATION_THEME_EMAIL` mock allowlist is a list again

Frontend `CONFIG.CELEBRATION_THEME_EMAIL` had drifted back to a single `string` while `isCelebrationEmail()` / theme-pref mock tests already expected `string[]` (matching the backend ScriptRunner Parameter). Restored `string[]` (default `['kjohnston@adaptavist.com']`) and clarified in the config comment that this is **mock-mode only** — live gating stays on backend `user/prefs` → `celebrationAllowed`.

### Fix — Registered Attendees list: design_handoff restyle + remove action

Brings `AttendeesView` in line with design_handoff 2 and wires the already-documented `DELETE attendees/{contactId}` affordance on the frontend.

- **Fixed TopBar**: title/meta are always `"Registered Attendees"` / `"Full attendee roster for the working event"` (loading, error, loaded) — no more catalog-derived program/event title string.
- **Stat tiles**: Registered / Checked in / Not checked in above the filter card, from an unfiltered `fetchEventAttendees` (pageSize 1 → `.total`) + `fetchEventCapacityStatus` (`.checkedInCount`), so active filters cannot skew the tiles.
- **Search + filters**: EventsView-style search field (icon + tinted field) above flush/soft-accent pills for Attendee type, Status, and Email dispatch outcome.
- **Email under name**: dropped the Email column; email is a muted sub-line under the name (Account manager column kept).
- **Remove attendee**: `dataService.removeAttendee` + mock (`mockRemoveAttendee`); per-row Remove for non-checked-in only; `useConfirm` before delete; success/error toasts; list refetch.
- **Pagination copy**: `"‹ Prev"` / `"Next ›"`; count lives in the pager summary (`Page N of M · X attendees`).
- **Tests**: `AttendeesView.test.tsx` updated throughout; `dataService.test.ts` covers `removeAttendee` mock + live DELETE paths.

### Fix — Event Details page + Edit Event modal, matching design_handoff 2 (design review follow-up)

Implements all confirmed findings from the Event Details / Edit Event modal review, plus the two clarifications requested: Program stays read-only (parked as `X-010` pending a real backend capability — see TODO.md), start/end datetime editing implemented as 4 separate fields (Start Date, Start Time, End Date, End Time).

**Event Details (`EventHubView.tsx` / `.module.css`):**
- **Page header restored**: `<TopBar title="Event Details" meta="Full record for the selected event" />` now renders in the success state too — previously it only appeared during loading/error, so it silently disappeared once the event loaded.
- **Event name/Edit button no longer reuse `TopBar`**: replaced with a bespoke `.headerRow` (design_handoff 2's own layout for this card) — `align-items: flex-start` so the button top-aligns with the badges/title block instead of centering against it, and no `border-bottom` divider (that was `TopBar`'s page-header styling leaking into a context it was never meant for).
- **Consistent spacing**: `.view` now has one explicit `gap: 20px` (was relying on the global `.card`'s own `margin-bottom`, inconsistently zeroed in some places — 24px in one gap, 0px in the next). New `.view :global(.card) { margin-bottom: 0 }` so the explicit gap is the only source of spacing; `.detailColumn`'s gap brought down from 24px to 20px to match (was also double-counting against each card's own margin-bottom).
- **Attendees card width**: new local `.detailGrid` (`grid-template-columns: 2fr 1fr`, matching `design_handoff 2`'s `layout.split3`) replaces the global `.grid-2` (an even `1fr 1fr`) for this row only — `.grid-2`'s other consumer (`OverviewView`) is untouched.
- **Fixed in passing**: the meta line under the event name showed a lone "·" when date/location were both empty (`[date, location].join(' · ')` on two empty strings) — now filters to only non-empty parts.

**Edit Event modal (`CatalogEventModal.tsx` / `.module.css`):**
- **Header**: added the missing subtitle (`"Update details for this event"` / `"Add a standalone event or attach it to a program"`, mode-dependent — matches `design_handoff 2`'s `modalMeta.subtitle` exactly), a `border-bottom` divider, and a `×` close button (`aria-label="Close"`) — none of these existed before; only a bare `<h3>{title}</h3>` was rendered. Escape-to-close and overlay-click-to-close already existed (`useModalFocusTrap`) — the button is a new, additional affordance, not a replacement.
- **Start/End become 4 fields**: `Start Date` + `Start Time` + `End Date` + `End Time` (`CalendarPicker` + new `TimePicker` pairs), replacing the old 2 date-only fields. This wasn't just a label change — the old code silently **hardcoded every event to 09:00 UTC** (`toIsoDateTime` appended `T09:00:00.000Z` unconditionally, and `dateInputFromIso` discarded any real time when populating the edit form), so editing an event with a real non-9am start time and saving would have silently reset it. Replaced with `combineDateAndTime(date, time)` (defaults to 09:00 **only** when time is genuinely left blank) and a new `timeInputFromIso` that round-trips the real time back into the form.
- **Date fields get a calendar icon, not a chevron**: `CalendarPicker` now renders `styles.triggerDate` alongside the shared `Pickers.module.css` `.trigger` class, overriding just the `::after` `content` to `calendar_month` (Material Symbols) — inherits everything else from the shared chevron rule. `TimePicker`/`SelectPicker` (genuine list-of-options fields — Status, Publish state) keep the chevron.
- **Program field**: **kept read-only** in edit mode per explicit direction — `docs/api-contract.md` states "Cannot change `programId` via PATCH", and the mock data layer stores events inside each program's own array (no cross-program move op). Parked as `X-010` in `TODO.md` (mirrored in `../Backend/TODO.md`) — the `create`-mode `SelectPicker` is already there as the template to reuse once a real backend capability exists.
- **Field styling**: labels changed from `color: var(--text)` (dark) to `var(--muted)` at 12px (matches `design_handoff 2`'s field-label treatment); inputs/pickers now use the new `--input-bg` token (see below) instead of falling through to the browser default/`--panel`.
- **Footer**: bled to the modal's edges with a `border-top` + `var(--input-bg)` background (bottom corners matched to the modal's own `border-radius` so the bled background doesn't square off past the rounded corners) — was a plain `display:flex` row with no divider or background.

**New shared tokens (`tokens.css` + `theme-celebration.css` + `theme-dark-aurora.css`):**
- `--input-bg` (design_handoff 2 `THEMES.*.inputBg`) — didn't exist anywhere before. Applied to `CatalogEventModal`'s own text/number/url inputs and, more broadly, to the shared `Pickers.module.css` `.trigger` (every `SelectPicker`/`CalendarPicker`/`TimePicker` app-wide) since picker triggers are form fields, not cards — a small, low-risk, more-correct fix given the token didn't exist at all before.

**Tests**: `CatalogEventModal.test.tsx` (+7: header/subtitle/close button, Start Time/End Time combining into the ISO datetime, edit-mode time round-trip), `EventHubView.test.tsx` (+4: page header presence, button alignment, grid ratio, no stray separator). All existing tests updated for the field rename (`Start:` → `Start Date:` in the shared test helper) — behavior otherwise unchanged where not explicitly listed above.

### Fix — Search field height direction reversed; Sidebar footer divider was full-width

Two corrections from screenshot review:

- **Search field vs. button height, corrected direction**: the previous fix raised the "+ New program"/"+ New event" buttons to match the search field's 44px — backwards. The button (`.btn.btn-sm`, shared/global, no explicit height) is the fixed point; **`EventsView.module.css`'s `.searchField`** now matches *it* instead — `min-height: 44px` removed, vertical padding brought down from `7px` to `6px` (matching `.btn-sm`'s own `6px`). `.createButton`'s `min-height: 44px` from the previous (wrong-direction) fix reverted.
- **Sidebar footer divider, full-width**: `Sidebar.module.css`'s `.footer` (Theme section + Sign out) is a sibling of `.nav`, not a child of it, so its `border-top` — the divider between "Audit log" and "Theme" — spanned the full sidebar width, unlike the other section dividers (`.section`'s `border-top`), which are inset by `.nav`'s own 10px side padding. Added `margin: 0 10px` to `.footer` (padding brought down from `16px` to `16px 6px` to keep the same 16px total edge-to-content spacing) so the divider lines up with the others instead of reading as a different, full-width one. Reset to `margin: 0` in the `@media (max-width: 900px)` override — mobile's footer layout is unrelated to this divider-alignment concern and stays exactly as it was.
- **Tests**: `EventsView.test.tsx` — replaced the (reversed) height-matching assertion with one confirming the search field's padding matches the button's and that it no longer forces 44px; also now imports `components.css` directly so `.btn`/`.btn-sm` actually resolve in the test environment (previously unstyled there, silently invalidating any assertion against them). `Sidebar.test.tsx` — new test asserting the footer's left/right margin matches the nav's side padding.

### Fix — App-frame shadow was invisible (clipped); Programs & Events search field/button height mismatch

Follow-up from screenshots showing the previous app-frame shadow fix still wasn't visible, and the search field sitting shorter than the button next to it.

- **Shadow clipping (`AppLayout.module.css`)**: `.shell` (the wrapper directly around `.layout`, with zero padding of its own) had `overflow: hidden`, clipping `.layout`'s `box-shadow: var(--shadow-frame)` to nothing before it could ever reach `.frame`'s 20px padding — the only zone with room for it to bleed into (matching `design_handoff 2`'s structure: the shadowed card is a direct child of the padded/overflow-hidden frame section, with no intermediate zero-padding clipping layer in between). Removed `overflow: hidden` from `.shell`; `.layout` itself still clips its own children for the rounded corners, and `.frame` still safely bounds everything.
- **Search field vs. button height (`EventsView.module.css`)**: `.searchField` has an explicit `min-height: 44px`; the "+ New program"/"+ New event" buttons (`btn btn-primary btn-sm`, shared/global) have no `min-height` of their own and render ~31px tall from padding/font-size alone. Added `min-height: 44px` to `EventsView`'s own `.createButton` modifier — scoped there rather than raising the shared global `.btn-sm`, which is also used for compact inline actions elsewhere that shouldn't grow to 44px.
- **Tests**: `AppLayout.test.tsx` — new test asserting `.layout`'s parent doesn't clip (`overflow` ≠ `hidden`) while `.layout` itself still does (rounded corners intact). `EventsView.test.tsx` — new test asserting both search fields and both create buttons compute `min-height: 44px`.

### Fix — Design-tool review follow-up: app-frame card, card radius/shadow token, pill fill, table density

Implemented the 3 real findings (+2 minor tuning items) from a design-tool review of the current build against `design_handoff 2/`; the other 2 findings (nav divider, Manrope loading) were confirmed already-correct/intentional on inspection and left untouched — see conversation for the full per-item verdict.

- **App-frame card (missing)**: `AppLayout.module.css` `.layout` (sidebar+main, not the `PocBanner` above it — no equivalent in the source design) now gets `border:1px solid var(--border); border-radius:20px; overflow:hidden; box-shadow:var(--shadow-frame)`, matching `Event Management System.dc.html` line ~28. New `--shadow-frame` token (`tokens.css` + `theme-celebration.css`/`theme-dark-aurora.css` per-theme overrides) — distinct from the pre-existing `--shadow-card`/`--shadow-login` tokens, which are unrelated.
- **Card radius (under-rounded)**: new `--radius-card: 16px` token (`tokens.css`) — no existing step in the `--radius-sm/md/lg` scale matched the design's consistent 16px card radius. `.card` (`components.css`, used by Overview's stat tiles, EventHub's header card, etc.) now uses it instead of `--radius-md` (10px). `EventsView`'s own panels already hardcoded 16px directly — unaffected, already correct.
- **Card shadow (present but too subtle)**: `--shadow-card` default (aurora) bumped from `0 4px 6px -1px rgba(11,5,115,0.06)` to the design's `0 4px 20px -8px rgba(11,5,115,0.10)`; added the missing `theme-dark-aurora.css` override (`0 12px 40px -24px rgba(0,0,0,0.9)`) — `theme-celebration.css`'s was already correct.
- **Filter pill inactive state (duplicate light-blue fill)**: `design_handoff 2`'s `pillStyle()` makes inactive pills flush/transparent (`background:transparent; border:1px solid transparent; color:muted`) — only the *active* option gets a visible container. `EventsView.module.css`'s `.tab`/`.statusPill` (Active/Archived tabs and All/Active/Cancelled/Completed filters) had a visible `--ice` fill + `--border` outline + `--text` color on the *inactive* state too, so both states read as "filled pill," just different tints. Fixed to match the design exactly; active states (`--accent-soft`/`--accent`) unchanged.
- **Table density (generic table looser than EventsView's)**: `EventsView`'s own table already matched design pixel-for-pixel, but the shared global `table`/`th`/`td` (`components.css`, used by `AttendeesView`/`CheckInView`/`EmailDispatchView`, which have no table styles of their own) was looser — `th` used `padding:12px` / `2px` border / `0.8rem` vs `EventsView`'s already-correct `18px horizontal` / `1px` / `0.7rem`; `td` used `padding:14px 12px` / `0.95rem` vs `14px 18px` / `0.85rem`. Aligned the generic rules to `EventsView`'s values.
- **`EventsView.test.tsx`**: fixed a pre-existing test bug (was comparing an *active* tab against an *inactive*-by-default status pill of the same label and asserting `backgroundColor` — a comparison that only "passed" because unresolved CSS custom properties collapse to the same jsdom fallback regardless of which token is referenced, not because the styles actually matched). Replaced with an active-vs-active sizing check plus a new test asserting active items resolve `color: var(--accent)` and inactive items resolve `color: var(--muted)` on both the tabs and the pills.
- Confirmed unchanged, by design: the Sidebar's Audit-log divider (`border-top` + `margin-top:auto`) exactly replicates `design_handoff 2`'s own `navAdmin` block — the large gap above it is the source design's own bottom-pinning, not a missing divider. Manrope is confirmed loading (`document.fonts` reports `"Manrope Variable"` `status:"loaded"`, body computed `font-family` resolves correctly) — its quiet, geometric look just reads as "systemy" in a screenshot.

### Fix — Material Symbols icons rendered as literal text ("search") instead of glyphs

`@fontsource/material-symbols-outlined` only ships the `@font-face` rule — unlike Google's icon-font CDN CSS, it has no `.material-symbols-outlined` utility class. `EventsView`'s search fields and program-edit button used that className with no matching `font-family` anywhere, so the glyph name rendered as literal Manrope text ("search", "edit") instead of the icon.

- **`src/styles/fonts.css`**: added the shared `.material-symbols-outlined` utility (font-family + `font-variation-settings: 'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 20` + the rest of Google's reference `ICON_FONT` declaration block, matching `design_handoff 2/`'s own inline style) right after the font import it depends on. Global (not a CSS module), so it fixes all 3 broken `EventsView` glyph spans with zero JSX changes — the view's own scoped rules (`.searchField .material-symbols-outlined`, `.programEditButton .material-symbols-outlined`) still override size/color on top of it.
- **Audit**: `Toast.module.css`, `CatalogPickers.module.css`, and `pickers/Pickers.module.css` already declared `font-family: 'Material Symbols Outlined'` correctly on their own scoped rules — `EventsView` was the only offender.
- **`docs/ui-component-catalog.md`**: documented the new utility; added `edit` and `expand_more` to the in-use glyph list (previously undocumented).
- **`EventsView.test.tsx`**: new test asserting every `.material-symbols-outlined` glyph in the view computes `font-family: "Material Symbols Outlined"` (imports `fonts.css` directly, since it's normally only wired up at the app entry point, not per-component).

### Feature — Events table trailing chevron + "‹ Prev" / "Next ›" pagination copy (design_handoff 2)

- **`EventsView.tsx`**: events table gets a 6th column — empty header (visually; `sr-only` "Open event" for screen readers) and a right-aligned, `aria-hidden` `›` per row, reinforcing the row's existing click-through (`role="link"`/`aria-label` already carries the accessible name). Empty-state colspan updated 5 → 6. Pagination buttons renamed **Previous** → **‹ Prev**, **Next** → **Next ›**.
- **`EventsView.module.css`**: new `.eventChevron` (`text-align: right; color: var(--muted)`).
- Missing HubSpot fields / n/a values are unaffected — out of scope per this pass.
- **`EventsView.test.tsx`**: new test asserting the 6-column header (with the empty/`sr-only` 6th), the `›` cell, and the renamed pagination buttons.

### UI — Active/Archived lifecycle tabs restyled to match the status filter pills (design_handoff 2)

Same visual language as the **All / Active / Cancelled / Completed** status pills below them (soft accent when active, compact) instead of the previous larger white pill-shaped tabs — no behavior change (Active vs. Archived still drives `fetchCatalog({ includeArchived })`), no renaming.

- **`EventsView.module.css`**: `.tab`/`.tabActive` now share the `.statusPill`/`.statusPillActive` recipe — `background: var(--ice)` (`--accent-soft` when active), `border-radius: 9px` (was `999px`), `font-size: 0.8rem`, `min-height: 40px` (was `44px`).
- **`EventsView.test.tsx`**: new test asserting the active tab's computed `border-radius`/`background-color`/`min-height` match the active status pill's.

### Audit — Programs↔Events panel gap (density pass)

Checked `EventsView.module.css`'s `.view { gap: 18px }` (governs the vertical space between the Programs panel, the optional filter chip row, and the Events panel) against `design_handoff 2/`'s own wrapper (`gap:18px`), plus every other spacing value in the view (`padding:20px` panels, `padding:13px/14px 18px` table cells, `padding:14px 18px` pager) against the prototype's matching declarations — all already pixel-identical. No code change made; a no-op "fix" would have been indistinguishable from a regression risk for no benefit.

### Fix — Sidebar working-event section: divider position, muted/enabled contrast, redundant label (design review)

Follow-up from a design vs. current-build screenshot review (`design_bar` / `current_bar` / `design_bar_no_event`): the divider was in the wrong place and enabled/disabled nav text was too visually similar to tell apart.

- **Divider position**: moved from between the working-event picker and its module list to between **Programs & Events** and **Working event** — matches the design (`WorkingEventPicker.module.css` `.field` now owns the divider via `border-top`/`margin-top`; `Sidebar.module.css`'s module-list wrapper (new `.workingEventModules` class) no longer has one).
- **Enabled vs. disabled contrast**: `.navItem` base color changed from `--muted` to `--text` (dark, matches the design's bold nav labels); `.navItem:disabled` now explicitly sets `color: var(--muted)` (previously relied only on `opacity: 0.55` over the already-muted base, which read as barely-different shades of grey — hard to tell disabled from enabled, per the reported complaint).
- **Removed a redundant label**: the `<p>{hubEventName ?? 'Selected event'}</p>` row previously shown above the module list (e.g. "TESTING EVENT 1") duplicated the event name already shown in the working-event picker trigger directly above it — the design has no such row, so it's gone; the module list now sits directly under the picker with no extra label.
- **`Sidebar.test.tsx`**: new coverage — enabled items resolve to `var(--text)`, disabled items to `var(--muted)`; the redundant label is gone and the working-event name appears exactly once.

### Feature — Sidebar working-event modules always visible, muted when no working event (007 event-first)

Event Details / Registered Attendees / Check-in / Email no longer disappear from the Sidebar when no working event is selected — they're always rendered for admin under the working-event picker, just muted/disabled until one is picked.

- **`Sidebar.tsx`**: module section is now gated on admin role only (previously required `eventId && isEventScopedRoute(activeRoute)`, which hid it entirely with no working event). Each `NavButton` gets `disabled={!eventId}`; `onClick` is only wired to `navigate(eventPath(eventId, item.id))` when an `eventId` exists, otherwise `undefined` (no navigation possible). Dropped the now-unused `isEventScopedRoute` import (the helper itself is untouched — still exported/tested in `navigation.ts`/`navigation.test.ts`).
- **`NavButton`**: new optional `disabled` prop; renders a native `disabled` button (non-navigating, removed from tab order — matches "not-allowed" intent) instead of just an `active` toggle.
- **`Sidebar.module.css`**: `.navItem:disabled` → `opacity: 0.55; cursor: not-allowed;` plus a `:disabled:hover` override so the accent hover fill doesn't apply to a muted item.
- **`eventModules.ts`**: sidebar label for `attendees` renamed **Attendees** → **Registered Attendees** (matches `design_handoff 2/`'s `navDefs`); route id (`attendees`, `#/events/{id}/attendees`) unchanged.
- **`docs/ui-routes.md`**: routes table Sidebar-label column, the event-scoped-nav paragraph, and the `EventHubView` view-responsibilities bullet updated to describe the always-visible/muted behavior and the renamed label.
- **`Sidebar.test.tsx`**: renamed `Attendees` → `Registered Attendees` assertions; replaced the "hides event modules with no eventId" test with one asserting they're present and `toBeDisabled()`; added a test that clicking a disabled module does not call `navigate`.
- **`RoutePlaceholder.test.tsx`**: updated expected heading text for the renamed label (`RoutePlaceholder` reads module labels straight from `eventModules.ts`).

### UI — Sidebar desktop nav matches design_handoff 2 (no emoji, accent-only active state)

Desktop sidebar nav items (Overview, Programs & Events, Audit log, working-event modules) are now text + left accent bar only, matching `design_handoff 2/`'s `navDefs`/`navItems` desktop rendering (`Event Management System.dc.html` — desktop `<aside>` nav buttons render only `item.label` + `item.barStyle`; the emoji-equivalent `item.abbr` glyphs are only ever used in the tablet icon rail, never on desktop).

- **`Sidebar.tsx`**: `NavButton`'s icon `<span>` now carries a `styles.navIcon` class (still `aria-hidden`, decorative — never contributed to the accessible name either way).
- **`Sidebar.module.css`**: `.navIcon { display: none }` by default (desktop); overridden back to `display: inline` inside the existing `@media (max-width: 900px)` block, so the current pill-grid mobile/narrow nav is completely unchanged. Active/hover colors were already wired to the semantic `--accent` / `--accent-soft` tokens (orange in Aurora/Dark Aurora, the theme's own rose in Celebration) — verified, no "cool/purple" leftover found, left as-is. Event Console title, user email, Sign out, and Theme section placement untouched.
- **`Sidebar.test.tsx`**: new coverage — icon glyph computes `display: none` at desktop width; active nav item's `color` resolves to the `var(--accent)` token (not a hardcoded cool color); accessible names still work with the icon hidden.

### UI — TopBar restyle to design_handoff 2 (compact panel header bar)

`TopBar` (used by Overview, Programs & Events, Audit log, Email, Attendees, Check-in, Event Details) now renders as a compact `--panel`-backed bar with a bottom border instead of a bare `<h1>` sitting directly on the page's `--surface` background — matches `design_handoff 2/`'s `<header>` (`Event Management System.dc.html` line 150: `background:var(--panel-bg);border-bottom:1px solid var(--border)`, `h1` `font-size:16.5px;font-weight:700`, subtitle `font-size:12px;color:var(--muted)`). No avatar added (not required); title/meta/trailing props API unchanged.

- **`TopBar.module.css`**: bar bleeds to the edges of its immediate container via negative margin sized to `AppLayout`'s `.content` padding (28px/32px desktop, 20px/16px at ≤900px) so it reads as a full-width main-column header bar for the common case (every view except one — see below); `--panel` background, `border-bottom: 1px solid var(--border)`; title down to 16.5px/700, subtitle to 12px/`--muted`, both single-line with ellipsis truncation (matches the prototype).
- **`TopBar.tsx`**: title/subtitle wrapped in a new `.titleGroup` (`min-width: 0`) so the ellipsis truncation works correctly inside the flex row; no prop changes.
- **`EventHubView.tsx` / `.module.css`**: this is the one consumer where `TopBar` is nested inside a `card card--accent` (its own 24px padding) rather than sitting directly in `.content` — added a local `.headerCard` class that cancels the shared component's edge-bleed margin/padding so the header's bottom border spans the card's own inner width instead of blowing through the card's border/radius. Still gets the same compact title/subtitle styling and `--panel` background (inherited from the card, same color).
- **`TopBar.test.tsx`** (new): title/meta/trailing rendering, the `top-bar` global class other views' CSS keys off of (`:global(.top-bar)` in `AuditView`/`AttendeesView`/`CheckInView` module CSS), and an XSS guard for hostile title/meta strings.

### UI — Framed app shell (design_handoff 2)

Authenticated app shell now caps at `max-width: 1400px`, centered (`margin: 0 auto`), so wide monitors show the page background as side gutters instead of the sidebar/main stretching edge-to-edge — matches the `design_handoff 2/` prototype's "App frame" wrapper (`Event Management System.dc.html` line 27).

- **`AppLayout.tsx` / `AppLayout.module.css`**: new outer `.frame` wrapper (max-width 1400px, `padding: 20px`, full viewport height) around the existing `.shell` (banner + sidebar + main); `.shell` now fills the frame (`flex: 1`) instead of owning the viewport height itself. Internal scroll-only layout (no page-level scroll) preserved. Branding (Sidebar "Event Console" header) and routing untouched — CSS-only change.

### Feature — CatalogPickers → event-scoped cutover (Slice 1/2)

Attendees / Check-in / Email no longer depend on the top Program/Event catalog dock. They work from URL `eventId` (`#/events/{eventId}/{module}`) and event-scoped APIs.

- **`dataService.ts`**: Slice check-in / capacity adjust / email helpers call `events/{eventId}/…` (no `programId` in `createDataService` signatures). Preferred GETs remain `fetchEventAttendees` / `fetchEventCapacityStatus`. Mocks use `'_standalone'` where helpers still take a program key; email mock list/find matches by `eventId`.
- **`useWorkingEventMeta`**: new hook (+ test) resolves event/program names + walk-in URL from `fetchCatalog()`.
- **Views**: Attendees / CheckIn / EmailDispatch use URL `eventId` + meta; EventHub “See all ›” → `eventPath(eventId, 'attendees')`; EventsView drops catalog `setSelection`/`bumpCatalog`.
- **Shell**: CatalogPickers dock removed from `AppLayout`; catalog-gated Sidebar block removed; WorkingEventPicker + event-scoped `SIDEBAR_EVENT_MODULES` remain. Legacy `#/events/attendees|check-in|email` kept as routes that redirect to `#/events`.
- **Deleted:** `CatalogPickers.tsx` + test (`CatalogPickerSelect` / `catalogContext` kept for filters / harmless test wraps).
- **Docs:** `docs/ui-routes.md` updated for the cutover.

### Feature — Programs & Events IA (T075–T082, FE-REDESIGN-022)

`#/events` is now the single create/manage/archive surface from `design_handoff 2/` **Programs & Events**. Catalog admin is retired. Phase 11 locks closed.

- **`EventsView.tsx` + `.module.css`**: program strip (incl. “No program (standalone)”), events table, Active/Archived tabs, status filters All/Active/Cancelled/Completed on Active only, search + pagination, “Filtered by program:” dismissible chip, program hover → Edit, HubSpot `CatalogProgramModal` / `CatalogEventModal` mounted; event row click sets Working Event + navigates to Event Details (no row edit/archive).
- **`CatalogProgramModal` / `CatalogEventModal`**: edit mode **Archive/Unarchive** via `onArchive` (Program from Programs & Events; Event from Event Details **Edit event** only — not a header button).
- **Catalog retirement (T079):** Sidebar Catalog admin link removed; label **All Events** → **Programs & Events**; `CatalogAdminView` is a redirect stub `#/catalog` → `#/events`; Check-in / Event Details / Attendees copy no longer points operators at Catalog admin / Settings.
- **PoC modules (T080):** `analytics` / `agenda` / `settings` removed from `eventModules` / Sidebar / `ViewRouter`; views deleted.
- **Vitest (T075–T077):** EventsView filter+chip, tabs, create buttons, XSS, `#/catalog` redirect; Sidebar Programs & Events / no Catalog admin / no Analytics·Agenda·Settings; EventHub Edit opens modal with Archive Event, no Settings nav.
- **Docs:** `ui-routes.md` updated; FE-REDESIGN-022 → Done.

### Docs — Programs & Events IA decided (grill → tasks T075–T082)

- **Product decision**: `design_handoff 2/` **Programs & Events** is the single create/manage/archive surface. Retire Catalog admin (`#/catalog` → `#/events`); keep route `#/events` with renamed chrome; Active/Archived tabs; remove Analytics/Agenda/Settings; reuse HubSpot Catalog modals; program cards filter events (+ dismissible “Filtered by program:” chip); Program hover-edit + archive in modal; Event row click → Working Event + Event Details; Event edit/archive only from Event Details **Edit event**.
- Recorded in `specs/007-redesign-initiative/tasks.md` **Phase 11** (T075–T082) and `TODO.md` **FE-REDESIGN-022**. UI not implemented in this change.

### Docs / copy — Convergence cleanup (T056 FR-019, T064, T074, T058/T059/T062)

- **`CheckInView` FR-019 copy**: Confirm-check-in summary now uses the fixed labeled set (Name, Company, Email, Account manager, Attendee type, Current status); walk-in modal states roster sync lag and that walk-in registers only (does not check in). Scan card already had no "auto-checks in on scan" wording. Email Campaign already used "HubSpot segment" (no rename needed). Undo/remove affordances not added (still `FE-REDESIGN-001` / open T056).
- **`CheckInView.test.tsx`**: assertions updated for the labeled QR summary fields, lag copy, and absence of "auto-checks in".
- **T064**: capacity tier/bar inherited as-is — Backend already counts via `countAttendees`; no Frontend rework.
- **Docs polish**: `docs/ui-component-catalog.md` lists `ThemeSwitcher` + `WorkingEventPicker`; `TODO.md` archived completed redesign rows and parked T057 dual-read retirement.

### Feature — Overview / All Events / Event Details rewired to Catalog + capacity fan-out, Type & Registration closes removed (T071, FE-REDESIGN-021)

`OverviewView`, `EventsView`, `EventHubView`, `WorkingEventPicker`, and `AppLayout` no longer read the legacy `Event` mock via `fetchEvents()`/`fetchEvent()` — they build `PortfolioEvent` rows from `fetchCatalog()` (+ `catalogEventToPortfolio`/`enrichPortfolioWithCapacity`), matching the flat HubSpot CatalogAdapter wire shape and the T073 status derivation.

- **`OverviewView.tsx`**: loads `fetchCatalog()` then fans out `fetchEventCapacityStatus(eventId)` per event via `enrichPortfolioWithCapacity` for `attendeeCount` (= `checkedInCount`). `eventsThisMonth`/`programsThisMonth` derive from portfolio `dateIso`/`programId`; `totalRegistered` sums portfolio `attendeeCount`. `registeredThisWeek` is now a hard `0` — neither the catalog nor the capacity response carries a registration timestamp (slice attendees have no `registeredAt`), so it's surfaced as zero rather than guessed; the `fetchAttendees` fan-out for this figure was removed. `emailsScheduledThisWeek` keeps its `fetchScheduledEmails` fan-out, now scoped to `status === 'active'` portfolio events. Recent activity keeps `fetchAuditLog(undefined, { page: 1, pageSize: 5 })`.
- **`EventsView.tsx`**: same catalog + capacity load; filtering/search/stats moved to `filterPortfolioByStatus`/`searchPortfolioEvents`/`getPortfolioStats` (Draft filter matches `publishState`, not a status value). Meta copy changed from "sample HubSpot events (PoC mock data)" to "Portfolio overview" now that the view reads live Catalog data.
- **`EventHubView.tsx`**: loads `fetchCatalog()` + finds the event by id (`catalogEventToPortfolio`), `fetchEventCapacityStatus(eventId)` for Capacity/Checked-in, and `fetchEventAttendees(eventId, { page: 1, pageSize: 5 })` for the Registered stat (`total`) and the attendee preview (mapped from `firstName`/`lastName`/`company`/`attendeeType`/`checkedIn`). **Removed "Type" and "Registration closes"** from both the Details list and the TopBar meta line (`date · location` only) — Catalog has no backing field for either and the redesign rule is no blanks/guessed values. Detail fields are now Program, Location, Date, Owner, HubSpot record (`hubspotId` = event id).
- **`WorkingEventPicker.tsx`**: now loads `fetchCatalog()` and maps to `PortfolioEvent` for the name-search list; capacity fan-out is intentionally skipped here (picker only needs names, so no need to pay for a capacity request per event on every Sidebar mount).
- **`AppLayout.tsx`**: resolves the Sidebar's working-event name via `fetchCatalog()` + a client-side `find` instead of the retiring `fetchEvent(eventId)`; soft-fails to `null` on error so the shell never breaks over a missing event name.
- New `src/utils/catalogEventPresentation.test.ts` (mapper lifecycle: cancelled is a terminal status even past its end date, active auto-derives to completed past end, `hubspotId` = event id, program resolution, capacity fan-out merge/fallback/soft-fail). Rewrote `OverviewView.test.tsx`, `EventsView.test.tsx`, `EventHubView.test.tsx`, and the `WorkingEventPicker` coverage in `Sidebar.test.tsx` against `fetchCatalog`/`fetchEventCapacityStatus`/`fetchEventAttendees` mocks; fixed `overviewStats.test.ts` and `listFilters.test.ts`, which had drifted out of sync with the already-updated `PortfolioEvent`-typed helpers. XSS guards kept on Overview (event name, audit actor) and Event Details (event name, attendee name). 329 tests passing (was 327), clean `tsc`/`eslint`.
- `SettingsView.tsx`, `AnalyticsView.tsx`, and `AgendaView.tsx` still call `fetchEvent`/`fetchAnalytics`/`fetchAgenda` (and keep `MOCK_EVENTS` for those mocks) — out of scope for T071. Retired from `dataService`: unused `fetchEvents`, legacy `fetchAttendees`, and `fetchActivity`.
- Docs: `docs/ui-routes.md` updated for the T071 catalog/capacity wiring; `FE-REDESIGN-021` moved to Done (archive).

### Feature — Catalog Admin aligned to HubSpot CatalogAdapter wire shapes (T069)

Catalog Admin + mock/normalize layers now match the Backend CatalogAdapter Event/Program shapes (no Parts Attended / attendance property / HubSpot form IDs on Programs).

- **Types** (`src/types.ts`): Program is `{ id, name, archived, description?, startDate?, endDate? }`; Event carries `programId: string | null`, required `start`, optional `end`, `status` (`active`|`cancelled`), `publishState` (`draft`|`published`), walk-in/registration URLs, owner, location, capacity, `archivedViaProgramId`.
- **Normalize** + mock CRUD updated for optional Program on create (standalone Events), ISO `start`/`end`, and the new status/publish fields.
- **Modals**: Event modal drops Parts Attended / attendance property; Program is optional (“No program”); CalendarPicker for start + optional end; status (edit) + publishState selects. Program modal drops HubSpot form IDs, location, and timezone.
- **CatalogAdminView**: shows start/status/publishState metadata; Form IDs / Parts Attended removed; standalone Events listed and editable without a parent Program; Create Event always enabled.
- Metadata helpers map wire `status`/`publishState` to Active/Cancelled and Draft/Published for display.

### Feature — Event status model: Active/Cancelled manual, Completed auto-derived (007 redesign, T073, FR-017/US5-AC4)

Pure-logic groundwork for the status field `T071`'s rewire needs (`FE-REDESIGN-021`) — deliberately not wired into any view yet, since `T071` is sequenced after this task specifically because it needs a real status source.

- Added `EventManualStatus` (`'Active' | 'Cancelled'` — the only two values a staff member sets directly), `EventLifecycleStatus` (`'Active' | 'Cancelled' | 'Completed'` — the effective, displayed status), and `EventPublishState` (`'Draft' | 'Published'`, tracked with no coupling to status) to `src/utils/catalogMetadata.ts`.
- Added `deriveEventLifecycleStatus()` and `isPastEndDate()` — both pure, take an explicit `now` for testability. Operate on a standalone `EventStatusInput` shape (`manualStatus` + `endDate`) rather than `CatalogEvent`, since that type has no `manualStatus`/`endDate`/`publishState` fields yet (lands with the T069 HubSpot custom-objects work).
- **Decision (user, 2026-07-14):** Cancelled is a terminal manual override — once an event is manually Cancelled, its end date passing never auto-flips it to Completed. Only a manually-Active event auto-derives to Completed once its end date is in the past.
- New `catalogMetadata.test.ts` (12 tests covering no/invalid/future/exact/past end dates and both manual statuses). 310 tests passing (was 298), clean `tsc`.

### Feature — Event-first shell: Overview dashboard, Event Details, working-event picker (007 redesign, T046)

Backend has shipped event-scoped routing (`events/{eventId}/...`, dual-read window) and `docs/api-contract.md`/`docs/rbac.md` are already updated (see the entry below); this session builds the Frontend event-first shell against it, per T046's scope note in [specs/007-redesign-initiative/tasks.md](specs/007-redesign-initiative/tasks.md) (Overview and Event Details are genuinely new/richer surfaces, not restyles).

- **New `#/overview` dashboard** (`src/views/OverviewView.tsx`) — no prior equivalent. 4 stat tiles (events this month + program count, total registered + this-week delta, registered this week, emails scheduled this week), all computed client-side from `dataService.fetchEvents()` fanned out to `fetchAttendees()`/`fetchScheduledEmails()` per active/draft event (no portfolio-wide aggregate endpoint exists yet — flagged in `TODO.md`). An "Upcoming events" card list (capacity mini-bar + status badge, click-through to Event Details) and a "Recent activity" feed (`dataService.fetchAuditLog()`, actor + action + timestamp only — no HubSpot IDs in copy per plain-language rule).
- **`EventHubView.tsx` restyled as Event Details** — replaced the module-card grid (Attendees/Check-in/Email/… as clickable tiles) with a header card (status + optional Program badge, "✓ Working event" pill, "Edit event" button → Settings), 4 stat tiles, an Attendees preview (top 5, reuses `fetchAttendees`, "See all ›"), a Capacity card (reuses `CapacityBar`), and a Details definition list. Event-scoped navigation now lives entirely in the Sidebar.
- **New Sidebar working-event picker** (`src/components/WorkingEventPicker.tsx`) — always-visible admin control that searches every event (`dataService.fetchEvents()`, no catalog Program+Event selection required) and jumps straight to Event Details; fails soft (empty list) if the fetch errors, so a Sidebar-mounted widget can never break the shell. Sidebar gained a new "Overview" nav item, and "Audit log" moved into its own group above the Theme section (resolves parked `FE-REDESIGN-015`).
- **Standalone-event support**: `Event` type gained optional `programId`/`programName` (`src/types.ts`, threaded through `normalizeApi.ts` and two `mockData.ts` sample events) so the UI can show a Program badge/grouping when an Event has one, without requiring it — matches the event-first data model (`ADR-008`).
- `eventModules.ts`: renamed the `event-hub` module label from "Event Hub" to "Event Details" (route/id unchanged); removed the now-unused `HUB_MODULE_CARDS` export.
- New tests: `OverviewView.test.tsx`, `overviewStats.test.ts` (pure date-window helpers), `WorkingEventPicker` coverage in `Sidebar.test.tsx`; `EventHubView.test.tsx` rewritten for the new layout. 43 files / 298 tests passing, clean `tsc`/`eslint`.
- `docs/ui-routes.md` updated for the new `#/overview` route, Event Details relabel, and working-event picker.

### Docs — API contract + RBAC updated for event-first routing (R-007 — `X-REDESIGN-003`, breaking, Backend-only change)

Backend-rooted session implemented the decided event-scoped routing shape ([specs/007-redesign-initiative/contracts/event-first-routes-api.md](specs/007-redesign-initiative/contracts/event-first-routes-api.md)) in `Backend/scripts/Utils/Routes.ts` + handlers; this entry covers the Frontend-owned docs updated in the same change. `src/` and `dataService.ts` are **not** touched yet — that cutover is the next session.

- **`docs/api-contract.md`**: every Slice 1/1.5/2 route heading moved from `programs/{programId}/events/{evId}/...` to `events/{evId}/...`, each noting the legacy path still works during the dual-read window (`X-REDESIGN-005`). `GET catalog` response reshaped in the doc to match the new flat `{ events: [...], programs: [...] }` wire shape (was a strict Program→Event tree) — `programId` on an Event is now resolved association metadata, optional/nullable for a standalone Event.
- **`docs/rbac.md`**: route matrix rows for the same routes moved to the event-scoped path (RBAC unchanged — still `admin`-only); added a note that the legacy `programs/{programId}/...` form of each row still answers with identical RBAC during the dual-read window; changelog entry added.
- **Still on `USE_MOCK_API`/legacy paths until next session**: `src/services/dataService.ts` still calls the `programs/{programId}/events/{evId}/...` paths — this keeps working unchanged (dual-read window), but the event-first shell/dataService cutover itself is parked for the next session per user instruction.

### Fix — `docs/ui-routes.md` route table corrected to match reality; flat-catalog reshape completed on the Frontend (T070/T072)

`docs/ui-routes.md` still documented `GET /events`, `GET /events/{id}`, and `GET /events/{id}/analytics` as real routes backing Overview/Event Details — they don't exist anywhere in `Backend/scripts/Utils/Routes.ts` (`tasks.md` T070). Fixing the doc required first checking whether T071 (rewiring those views onto the flat catalog) had shipped — it hadn't, and doing so turned up a real data-model gap (see below), so per user decision T072 (the flat-catalog reshape) shipped now and T071 stayed parked with the doc describing current reality rather than an aspirational future state.

- **`docs/ui-routes.md`**: `#/overview`, `#/events`, and `#/events/{id}` rows now state plainly that `fetchEvents`/`fetchEvent`/`fetchAnalytics`/`fetchScheduledEmails` have no matching Backend route and those views only render real data under `USE_MOCK_API: true`; `GET audit/recent` and `GET events/{id}/attendees` are correctly called out as real. `#/catalog` row updated for the flat `GET catalog` shape. Added a callout documenting the T071 blocker.
- **Flat catalog reshape (T072, Frontend half)** — `Backend/scripts/Utils/Catalog.ts`'s `flattenCatalogTree`/`Backend/scripts/Utils/Types.ts` `CatalogResponse` (`{events, programs}`, each event carrying a resolved `programId`) was already deployed; the Frontend still expected the old nested `{programs: [{events: [...]}]}` tree. Brought in sync: `src/types.ts` (new `CatalogEventSummary`, `CatalogProgram` no longer carries `events`), `src/utils/normalizeApi.ts` (`normalizeCatalogResponse` now reads a top-level `events` array), `src/data/mockData.ts` (internal Program→Event tree kept for mock CRUD ergonomics, flattened at the `getMockCatalog` read boundary — mirrors the Backend's own `buildCatalogTree`/`flattenCatalogTree` split), `src/components/CatalogPickers.tsx` and `src/views/CatalogAdminView.tsx` (derive a Program's events by filtering the flat list on `programId` instead of reading a nested `.events`). Updated fixtures in `normalizeApi.test.ts`, `CatalogPickers.test.tsx`, `CatalogAdminView.test.tsx`, `CatalogProgramModal.test.tsx` to the flat wire shape. Full suite: 298 tests passing, clean `tsc`/`eslint`.
- **T071 (rewiring `OverviewView`/`EventsView`/`EventHubView`/`WorkingEventPicker` onto the flat catalog) intentionally not attempted** — the flat `CatalogEventSummary` has no `status`, `type`, `attendeeCount`, `registrationClose`, or `hubspotId`, all of which those views currently render (status badges, `EventsView`'s status filter tabs, "Type"/"Registration closes"/"HubSpot record"). Parked pending a data-model decision — `TODO.md` `FE-REDESIGN-021`.

### Fix — Phase A QA pass: 6 issues from screenshot comparison (`design_*` vs `current_*`)

User QA'd Phase A against design screenshots (`untitled folder/`) and found 6 fidelity/regression issues; fixed all 6, 41 files / 278 tests passing, clean `tsc`/`eslint`.

- **`CheckInView` "Start scanner" button** — was `btn-outline` (muted/outline), while its sibling "+ Add walk-in" was `btn-primary` — a real style regression (both are equally primary actions on the check-in desk). Switched to `btn-primary`.
- **Loading screen layout** (`LoadingState.tsx`/`.module.css`) — moved the spinner above the "Did you know?" tip and gave the tip its own bordered card, matching the design's boxed "DID YOU KNOW?" treatment. Tried replacing the existing country-music/Dolly Parton/Shaboozey trivia pool (`src/constants/loadingTips.ts`) with EMS-relevant tips, but the user asked to keep that pool as-is (intentional, not an oversight) — reverted content, kept only the layout change.
- **`CapacityBar` "Adjust count for walk-outs"** — buttons were already 44×44px (a11y floor met) but the label text was 0.7rem and read as too small next to the design. Bumped buttons to 48×48px, label to 0.875rem, and widened the gap.
- **`AuditView` restyled as a readable feed, all data kept** — user chose "restyle only, keep all data" over matching the design's simplified feed 1:1 (which drops Outcome/Resource/Details/pagination — real compliance-relevant fields per the Slice 1.5 Tier A audit work). New feed-style rows (avatar initials from actor email, plain-language action phrase via new `describeAuditAction`/`categorizeAuditAction` helpers in `auditDisplay.ts` mapped from the known action list in `docs/api-contract.md`, outcome badge, resource, and metadata) replace the `<table>`, but every field — raw action code, outcome, resource ID, metadata, and pagination — is still shown. Known actions get a plain-language phrase (e.g. `checkin.confirm` → "checked in an attendee"); unknown/future actions get a generic "performed an action" phrase rather than a guessed one, so the raw action code is never duplicated/collided with in the DOM. Partially addresses parked `FE-SLICE007-002` (action readability) — the Resource-ID→human-label part of that item (needs a `resourceLabel` from the API) is still open.
- **`AttendeesView` — fixed a real mislabel + restyled to match design**: the "Track" column header was rendering `person.attendeeType` (`customer`/`partner`), not an actual track field — renamed to "Type" (also fixed the same mislabel in `CheckInView`'s "Find attendee" search table). Added an "Attendee type" filter row (All types/Customer/Partner) alongside the existing "Status" filter, and restyled rows with an avatar-initials name cell + Type/Status badges. Kept the Account Manager column and Email dispatch filter (real HubSpot-backed features not shown in the design mockup) per user decision — design mockup's per-row "Remove" action was **not** added (already tracked as Phase B work under `FE-REDESIGN-001`'s "remove-attendee affordance").
- **QR scanner + "Confirm check-in" modal** — user's screenshot showed a plain `[camera preview]` placeholder with no confirm step; turned out this was already fully built on this branch (`CheckInQrPanel.tsx` via `html5-qrcode`, wired to a "Confirm check-in" modal in `CheckInView.tsx`) — the screenshot was stale. Verified via the existing test suite (`CheckInView.test.tsx` scan→decode→confirm flow, `CheckInQrPanel.test.tsx`) rather than a live click-through, since a real Google sign-in isn't something to drive on the user's behalf.
- New: `src/utils/auditDisplay.test.ts` (6 tests) for the new humanizer helpers.
- `TODO.md`: added `FE-REDESIGN-019` (Attendees "Type" filter is client-side only, not server-authoritative — narrows the current page, doesn't change the "N registered" total); updated `FE-SLICE007-002` note for the partial overlap above.

### Docs — All `X-REDESIGN-001` Phase B feasibility gates cleared; HubSpot schema confirmed directly (no team handoff needed)

User was granted HubSpot admin access and worked through the whole [hubspot-team-handoff.md](specs/007-redesign-initiative/hubspot-team-handoff.md) checklist directly, plus a manual workflow test — no code changed, docs only.

- **All 4 `X-REDESIGN-001` gates now cleared**: 2 custom-object slots (existing), workflow-can-associate (**confirmed** via manual test), ≤10 labels (2 used), and the security write-gate (a build-time discipline, not a precondition). `research.md` R-005 moved from OPEN to CLEARED.
- **Schema confirmed 2026-07-14** (`X-REDESIGN-004`): all Event Items/Event Programs properties created as proposed except one rename (`public_registration_url` → `registration_form`); all 4 association type IDs (`286` Program→Event, `287` Event→Program, `288` Event→Contact, `289` Contact→Event — Event↔Contact **confirmed genuinely many-to-many**, not restricted); label type IDs `290` (`registered`)/`292` (`checked-in`); OAuth scopes confirmed sufficient. Full detail in `docs/hubspot-schema.md`.
- **New finding that shapes the actual build**: the only workflow action available for creating the association is "matching property values" — there's no direct record-picker action on this portal. Designed and manually verified a match-key mechanism: a transient `ems_registration_match_key` property on Contact, matched against a stable `registration_slug` property on Event Items, with the workflow clearing the Contact property back to blank right after use (durable state lives in the accumulated associations, not this property). Documented in `docs/hubspot-schema.md` § *Registration match-key mechanism* and `research.md` R-008.
- **Two things intentionally left open, tracked as `X-REDESIGN-009`**: (1) confirming whether the `290`/`292` label type IDs are directional (may need a second pair, unconfirmed); (2) the actual registration-form-to-match-key wiring (who writes the slug into the hidden Contact field at submission time) and who populates `registration_slug` on new Events going forward (manual today, should be EMS Catalog-Admin-generated later). Neither blocks starting `X-REDESIGN-002`'s adapter design.
- `TODO.md`/`research.md` updated throughout: `X-REDESIGN-001` (cleared), `X-REDESIGN-004` (mostly done, one follow-up open), `X-REDESIGN-007` (real Parameter values now known, still need setting in ScriptRunner Connect), new `X-REDESIGN-009`.

### Docs — `CustomObjectAdapter` interface decided via design-it-twice (`X-REDESIGN-002`, T048)

Docs only — no Backend code written yet (that's the next step, in a Backend-rooted session).

- Ran the `codebase-design` design-it-twice process: 4 parallel sub-agent designs for the second implementation of the ADR-005 `RegistrationAdapter`/`CheckInAdapter` seam, each under a different constraint (minimize-interface, maximize-flexibility, optimize-for-real-common-caller, explicit-ports-and-adapters).
- **Finding that reshaped the result**: only 2 of the 7 current callers of the existing interfaces are check-in-desk callers — the other 5 (attendee list, capacity status/adjust, 2 campaign-audience call sites) are list/count/audience-shaped, and 2 of those were abusing a paginated list call just to read `.total`. The decided interface fixes that directly (`countAttendees`, `resolveAudience` as first-class methods) rather than perpetuating the abuse.
- All 4 designs independently agreed catalog CRUD should be a separate sibling `CatalogAdapter`, not folded into this adapter — treated as settled, unanimous signal.
- Synthesized a hybrid from where the 4 designs disagreed: named methods over a compressed `query()`/`mutate()` mega-interface (better call-site readability); a materialized array for `resolveAudience`, not an unverified `AsyncIterable` (one design flagged unconfirmed ScriptRunner Connect support for long-lived generators); a generic `excludeContactIds` exclusion list rather than baking campaign-specific knowledge into the adapter (2 of 4 designs independently rejected the campaign-aware version); one `countAttendees` method serving both capacity and audience-estimate needs; a single HubSpot port rather than 3 split ports; no multi-portal `PortalConfig` (YAGNI — EMS only ever talks to one portal per environment); and a maintained checked-in counter (compare-and-swap via `trySet`, with drift-recompute fallback) as the internal count-performance strategy, since HubSpot's v4 Associations API has no native cheap count endpoint.
- Full interface, the 9 specific decisions, and rejected alternatives written up in `research.md` R-006 (OPEN → DECIDED). `TODO.md` `X-REDESIGN-002` and `tasks.md` T048 marked decided/done.

### Ops — ScriptRunner Connect Parameters set in UAT (`X-REDESIGN-007`, T065)

- All 7 HubSpot ID Parameters (object types + 4 directional associations + 2 labels) set in ScriptRunner Connect UAT; the stale `HUBSPOT_ASSOC_CONTACT_EVENT` placeholder (superseded once we learned the pairing needs 4 directional IDs, not 1) was deleted. Workspace synced locally, `ev_params.ts` confirmed updating.
- `TODO.md`/`tasks.md` T065 marked done. Remaining `HubSpotSchema.ts` constants deferred to the `CustomObjectAdapter` implementation task itself, not tracked as a separate pre-req.

## 2026-07-13

### Feat — Four `design_handoff 2/` fidelity gaps fixed (`FE-REDESIGN-013/014/016/017`)

Phase A was paused for a scoped design-fidelity pass rather than deferring these to "after Phase B" as originally parked — full regression: 40 files / 272 tests passing, clean `tsc`/`eslint`/`vite build`.

- **`ThemeSwitcher`** (`FE-REDESIGN-013`): reworked from bordered pill buttons to borderless full-width rows with a per-theme colored dot swatch + soft-tint-on-select, matching the prototype. Added fixed `--theme-swatch-{aurora,celebration,dark-aurora}` reference tokens to `tokens.css` (mirroring each theme's own `--accent`) so the switcher can show all 3 themes' true colors regardless of which is currently active.
- **`CapacityBar`** (`FE-REDESIGN-017`): "live" variant reworked — adjust (±1) buttons now sit beside the count instead of below the bar; added an "Includes manual adjustment of N" note (wired to the existing `capacityStatus.departureCount`, no new data needed); added a "N spots remaining" line to the non-live variant. Renamed the label "Room capacity" → "Live capacity" to match. **Did not** add the prototype's "reset" link — that needs a new backend write action (reset accumulated adjustments) with its own RBAC/audit consideration, out of scope for a Frontend-only layout pass — parked as `FE-REDESIGN-018`. Kept the existing tier-severity label ("Approaching capacity"/"Nearly full") — an intentional enhancement beyond the prototype, not a deviation.
- **`CheckInView`** (`FE-REDESIGN-016`): replaced the always-inline QR panel + check-in/walk-in mode-toggle with "Start scanner"/"+ Add walk-in" buttons opening dedicated modals, plus a new "Confirm check-in" modal (opened by a search-row click or a successful QR scan) showing name/email/company/**account manager**/attendee type/current status. Kept account manager in the summary even though the specific mockup didn't show it — it's the already-decided fixed field set from `FE-REDESIGN-002`. **Deliberately did not copy** the prototype's "Auto-checks in on scan" copy (twice in the mockup) — that wording was already flagged for removal in `FE-REDESIGN-002`; check-in correctly requires a manual confirm step regardless of scan vs. search. This incidentally completes 2 of `FE-REDESIGN-002`'s 4 copy fixes.
- **`EmailDispatchView`** (`FE-REDESIGN-014`, the biggest of the four): replaced the Compose/Scheduled/Log tabs with a single unified "Email schedule" list (scheduled + sent dispatches merged client-side and tagged by source, so scheduled rows get Edit/Cancel actions and sent rows expand a recipient-detail panel) + Sent/Scheduled/Drafts stat tiles (Drafts pinned to 0 per the already-parked `FE-REDESIGN-008` no-drafts-this-pass decision) + a "+ New campaign" button opening the existing compose form in a modal. Small, low-risk change to `useEmailDispatchWorkflow.ts`: the scheduled/log data-load effect is now unconditional (previously gated on the now-removed `activeTab`), and `handleSendNow`/`handleScheduleForLater` now return a success boolean so the view knows when to close the compose modal — the hook's own test suite (11 tests) needed zero changes.
- Test files fully rewritten for the new structures: `CheckInView.test.tsx` (24 tests, was 21), `EmailDispatchView.test.tsx` (18 tests, was 15), `CapacityBar.test.tsx` + `ThemeSwitcher.test.tsx` updated in place.
- Could not get a live-browser screenshot walkthrough — the running UAT server requires real Google sign-in (no test account available in this environment); verified via the automated suite instead.
- `TODO.md`: moved `FE-REDESIGN-013/014/016/017` from parked to Done (archive); added `FE-REDESIGN-018` (capacity reset action, parked) and a partial-completion note on `FE-REDESIGN-002`.

### Feat — Toast rebuilt to match a new design (not in `design_handoff 2/` — user-supplied)

- **`src/components/Toast.tsx`/`.module.css`** rebuilt from a flat colored banner (single message string, no icon, auto-dismiss only) into a card matching the supplied design: a circular icon (`check_circle` success / `error` error, on a tinted `--success-bg`/`--danger-bg` background), a bold title + optional muted description line, a manual close (✕) button (44×44 touch target per accessibility rules, even though the visible glyph is small), and a thin countdown progress bar along the bottom edge that animates from full to empty over the toast's duration (respects `prefers-reduced-motion` via the existing global rule in `base.css` — no extra code needed).
- **`showToast(message, type, durationMs, description?)`**: added an optional 4th `description` parameter. Every existing call site (~20+, across `CheckInView`, `CatalogAdminView`, `SettingsView`, etc.) is unchanged and keeps working exactly as before — its `message` renders as the bold title, just with no subtitle line (since none of today's call sites have a natural title/subtitle split). Future call sites can opt into a description without a mass rewrite.
- Added `Toast.test.tsx` (previously untested directly, only indirectly via other views' `toHaveTextContent` assertions): title/description rendering, per-type icon, close-button dismissal, and an XSS guard (hostile title/description render as text, never markup).
- Added the 3 new Material Symbols glyphs (`check_circle`, `error`, `close`) to the documented glyph list in `docs/ui-component-catalog.md`.
- **Note**: this removed a prior deliberate "Toast — larger on desktop" behavior (2× size from 901px up, added in an earlier session) in favor of one consistent card size across breakpoints, matching the new design. Flagging since it was an intentional past decision, not an oversight — revisit if that extra desktop visibility still matters.
- 40 files / 266 tests passing (+5), clean `tsc`/`eslint`. Could not get a live-browser screenshot to confirm — the assigned dev-server port is occupied by a stale, unrelated process (same issue as earlier in this session); verified via the automated tests instead.

### Docs — Overview/Event Details Phase B scope clarified; two more fidelity gaps parked (`FE-REDESIGN-016`/`-017`)

- **`tasks.md` T046 expanded**: confirmed against the prototype that Overview (no current equivalent — today's `EventsView.tsx` is a stat-tile+table page, not a dashboard) and Event Details (replaces `EventHubView.tsx`'s module-card grid with a header/stats/attendee-preview/capacity-card/details-card layout) are genuinely new/richer pages, not simple restyles — added the specific widget list to T046 so Phase B build work doesn't rediscover this from scratch.
- **`CheckInView` gap parked** (`FE-REDESIGN-016`): prototype puts QR scan and walk-in behind "Start scanner"/"+ Add walk-in" buttons opening modals; current screen has QR always inline and walk-in as a mode toggle. Not Phase B — pure interaction-pattern change.
- **`CapacityBar` "live" layout gap parked** (`FE-REDESIGN-017`): adjust-button placement, missing "reset" link and "N spots remaining" text vs. the prototype. Not Phase B — Slice 004's ±1 functionality itself is unaffected by the HubSpot migration (T064 only re-verifies data-model compatibility). Explicitly noting the current tier-severity labels are an intentional enhancement to keep, not a deviation to remove.
- No code changed.

### Docs — Parked: two more `design_handoff 2/` fidelity gaps found by user comparison (`FE-REDESIGN-014`/`-015`)

- **Email page IA** (`FE-REDESIGN-014`): prototype shows a single unified "Email schedule" list (sent/scheduled/draft together, one status badge per row) + a "+ New campaign" button opening a compose modal; current `EmailDispatchView.tsx` uses a 3-tab layout (Compose/Scheduled/Log) instead. Not a Phase B item — pure UI/IA restructuring, independent of the HubSpot data model. Bigger lift than the ThemeSwitcher gap (real interaction-model change), parked rather than started mid-UAT-testing.
- **Sidebar "Audit log" position** (`FE-REDESIGN-015`): prototype groups it separately, directly above the Theme section; current `Sidebar.tsx` renders it inline with the top-level nav list. Unlike the other two gaps, **not** parked as a standalone fix — it's architecturally tied to the same sidebar region Phase B's `T046` (working-event picker) will rewrite anyway, so it's folded into that task instead of being fixed twice.
- No code changed.

### Docs — Parked: `ThemeSwitcher` visual-fidelity gap vs `design_handoff 2/` (`FE-REDESIGN-013`)

- User caught, by comparing a live UAT screenshot against the prototype, that `ThemeSwitcher` doesn't match `design_handoff 2/Event Management System.dc.html` pixel-accurately: the prototype renders each theme as a borderless full-width row with a colored dot swatch (selected = soft tint + colored text), while the current `ThemeSwitcher.tsx`/`.module.css` renders bordered pill buttons with no dot and a colored border ring on selection. Confirmed directly against the prototype's `themeSidebarOptions` style block (lines 1622–1639).
- Not a Phase B item (Phase B never touches theming) — parked as `FE-REDESIGN-013` in `TODO.md`, deliberately deferred **until after Phase B** so Phase A isn't reopened mid-UAT-testing. No code changed.

### Feat — Celebration theme allowlist: single email → list (`X-REDESIGN-008`)

- **`src/config.ts`**: `CELEBRATION_THEME_EMAIL` changed from a single `string` to `string[]` — any email in the list unlocks Celebration, matching the Backend's list-type ScriptRunner Parameter of the same name.
- **`src/utils/celebrationTheme.ts`**: `isCelebrationEmail()` now does a case/whitespace-insensitive membership check (`.some(...)`) across the list, instead of an equality check against a single configured email.
- **Tests**: `celebrationTheme.test.ts` adds multi-entry and empty-allowlist coverage; `dataService.test.ts` fixed its now-invalid direct use of `CONFIG.CELEBRATION_THEME_EMAIL` as a bare string, and adds a case proving a *second* email added to the list also gets access (not just the first/only entry). 39 files / 261 tests passing (+3), clean `tsc`/`eslint`.
- **Scope note**: this session is Frontend-rooted, so only the Frontend half of this change is done here. The Backend half — `Utils/Platform/types.ts` and `Utils/UserPrefs.ts`'s `isCelebrationAllowed()` still type/compare against a single string — needs a Backend-rooted session, plus changing the actual ScriptRunner Connect Parameter type (Simple String → List) in UAT/Live. Parked as `X-REDESIGN-008` in `TODO.md` with the exact Backend diff needed.

### Docs — Slice 007 Phase B prep: event-first routing shape design-it-twice (T041, `X-REDESIGN-003`)

- **Decided the event-first routing shape** ahead of the HubSpot gates clearing — safe to do now since it's planning-only (no application code touched, so it can't affect Phase A UAT testing). Drafted two options and compared them in [contracts/event-first-routes-api.md](specs/007-redesign-initiative/contracts/event-first-routes-api.md):
  - **Option A (chosen): event-scoped routes** (`events/{eventId}/…`), Program membership resolved via the HubSpot association only, never a route param/property.
  - **Option B (rejected): keep `programs/{programId}/events/{eventId}/…`** with an optional/sentinel `{programId}` segment — rejected because the router has no "optional path segment" concept today, it invents a sentinel-collision risk, and it keeps Program in the URL as a structural parent, working against ADR-008 rather than expressing it.
  - Decisive evidence for Option A: `events/:eventId/audit` already proves this exact shape works today alongside the Program-scoped Slice 1 routes; and Slice 1's handlers call `resolveCatalogEvent(programId, eventId)` only because Plan-C Record Storage nests Events under their Program — a constraint `CustomObjectAdapter` removes entirely once Events are root-level HubSpot objects.
  - Captured the **full 14-route target-state table** (every `programs/:programId/events/:eventId/...` route → its event-scoped equivalent) and the **`catalog` response reshape** — flips from a Program→Event tree to a flat `events[]` (each with an optional `programId`) + `programs[]` for grouping/filter UI only, which is what actually makes standalone Events reachable on the wire.
  - Left open, not part of this decision: whether `checkin/scan` (QR) collapses into `checkin` (distinguished by `scanMethod`) — flagged as a Phase B check-in-handler question (T052/T054), not silently decided here.
- `research.md` R-007 updated from OPEN to **DECIDED**; `tasks.md` T041 marked done; noted the `codebase-design` skill referenced in the plan wasn't available in this session, so the design-it-twice was run manually (two proposals drafted and compared) instead.
- Also logged: user created the Slice 007 Phase B **ScriptRunner Connect Parameters** in UAT for the known IDs (Program/Event object types, Program→Event association `286`); the 3 placeholder Parameters (`HUBSPOT_ASSOC_CONTACT_EVENT`/`_LABEL_REGISTERED`/`_LABEL_CHECKED_IN`) remain pending the HubSpot team (T065 partially done).
- No code changes; doc-only.

### Docs — Slice 007 Phase A: US3 rollout + in-flight slice compatibility confirmation (T038–T039)

- **`quickstart.md` §B, new "Phase 6" subsection**: documents the actual foundation-first rollout order Phase A shipped in (Setup/Foundational → US4 theming → US1 per-view restyle, in the T025–T031 view order → US2 verification), and confirms no step required an IA rebuild — the sidebar/nav structure, hash routes, and module list are byte-for-byte unchanged from before the redesign.
- **In-flight slice compatibility verified**: `src/App.tsx` (hash routes) and `config/eventModules.ts`/`shellAccess.ts` (module list + RBAC) untouched by the redesign diff; Slice 004's `utils/capacityTier.ts` and Slice 005's dispatch/schedule logic untouched (only their views' CSS/pickers were restyled); Slice 006 (public registration) has no view built yet, so nothing to conflict with. **Phase A is now fully done** (Setup → Foundational → US4 → US1 → US2 → US3, T001–T039); only Phase B (US5/US6, gated on `X-REDESIGN-001`) remains.
- No code changes; 39 files / 258 tests still passing, clean `tsc`/`eslint`/`build`.

### Fix — Slice 007 Phase A: US2 brand + accessibility audit (T034–T037)

- **WCAG 2.2 contrast/focus audit across all 3 themes** (`docs/ui-a11y-audit.md`) surfaced and fixed 5 real gaps, all traceable to the same root cause — a focus/active indicator relying on a single low-contrast tint with no outline:
  - **Celebration's global `:focus-visible` ring was effectively invisible app-wide.** `theme-celebration.css` remapped `--color-cobalt` (the token every focus ring in `components.css`/`Sidebar.module.css`/`Pickers.module.css` reads) to a pastel `#F2A0BE` — ~2:1 against white panels, well under the 3:1 WCAG 1.4.11 minimum. Deepened to `#D45C82` (reusing an existing theme color) — now 3.5–3.7:1, with no color collision against the `ConversionChart` doughnut's other two segment colors.
  - **Celebration's `--muted` text color failed 4.5:1** (4.12–4.32:1 against surface/panel) — darkened `#93707E` → `#846571` (same hue), now 4.9–5.2:1.
  - **Field pickers' trigger focus ring used `--color-link`**, never remapped for Dark Aurora (1.99:1 against the dark panel) — switched to the theme-aware `--color-cobalt` in `Pickers.module.css`.
  - **Skip-link's gold outline** read only 2.44:1 against Celebration's remapped pink `--color-denim` — changed to white, which clears 3:1 against every theme's denim background.
  - **Pickers' roving-tabindex active-item indicator** (`SelectPicker`'s active option, `CalendarPicker`'s active day — `aria-activedescendant` pattern, so `:focus-visible` never fires on the item itself) had only a `--ice` background tint (~1.1–1.3:1 in all 3 themes) with no outline — added a real `outline: 2px solid var(--color-cobalt)` to `.optionActive`.
  - Two pre-existing, brand-/design-handoff-mandated contrast shortfalls (`--accent` as small text, `--border` on `--panel`) documented as monitor-only in the audit rather than silently altered — both trace to values dictated by the approved `design_handoff 2/` source or the non-negotiable brand hex, not app code.
- **Picker a11y completion-gate tests** (T035): `SelectPicker`/`CalendarPicker`/`TimePicker` already had full keyboard nav, ARIA, and focus-return; added tests for `aria-expanded`/`aria-selected` state, `aria-activedescendant` tracking (arrow/Home/End/PageUp/PageDown), disabled no-op, and Tab-closes-without-refocus (18/18 passing).
- **Dependency + asset guard** (T036, new `src/test/redesignDependencyGuard.test.ts`): asserts no Tailwind/Shadcn/Tremor/Mantine dependency, that the only font packages are the two self-hosted `@fontsource*` ones, and that neither the CSP nor `index.html` references a Google Fonts/icon CDN.
- **XSS render guard** (T037): 10 of 12 restyled views/modals already had a hostile-string render-as-text test; added the missing one to `CatalogAdminView.test.tsx`.
- Frontend tests: 39 files / 258 passing (was 243). Clean `tsc --noEmit` and `eslint`.

### Feat — Slice 007 Phase A: US1 modernized UI (`/speckit-implement 007`, T023–T033, T063)

- **Every existing view + shared chrome restyled onto the semantic token layer** (Overview/Events, Attendees, Check-in, Email/Campaign, Catalog admin + modals, Audit, plus the app shell). Scope naturally expanded beyond the task list's named files to `css/base.css`, `css/components.css`, and the shared components every view depends on (`Toast`, `LoadingState`, `EmptyState`, `ViewErrorState`, `CapacityBar`, `CatalogPickers`) — skipping those would have left every view showing un-themed buttons/cards/badges regardless of per-view work.
- **Sidebar redesigned** to match the `design_handoff 2/` prototype: light panel background (was a dark navy fill), accent-soft + left-bar active-nav indicator, logo chip — replacing the old right-border dark-fill active state.
- **New `--warning`/`--warning-bg` semantic tokens** (`tokens.css` + all 3 theme files) to resolve the Email dispatch lock-warning banner that was parked as `FE-REDESIGN-009` rather than leaving it as literal hex.
- **Picker chevron icons fixed**: the select/date trigger dropdown arrow was baked into a hardcoded-color SVG data URI (can't reference CSS custom properties, so it wouldn't adapt to Dark Aurora); replaced with a Material Symbols glyph (`components/pickers/Pickers.module.css`, `CatalogPickers.module.css`) that correctly follows `--muted` per theme.
- **T032 — native inputs replaced with the shared pickers**: `CatalogEventModal`'s bespoke duplicate Program dropdown → `SelectPicker`; native `<input type="date">` in `CatalogEventModal`, `CatalogProgramModal` (start/end date), and `EmailDispatchView`'s schedule date → `CalendarPicker`. Added `event.stopPropagation()` to both pickers' Escape handlers — without it, closing a picker's popover with Escape inside a modal would also bubble to the modal's own Escape-to-cancel handler and close the whole modal.
- **Tests**: added a `data-theme`/no-inline-hex render test to all 8 view test files (`EventsView`, `EventHubView`, `AnalyticsView`, `AttendeesView`, `CheckInView`, `EmailDispatchView`, `CatalogAdminView`, `AuditView`); added touch-target (`getComputedStyle(...).minHeight >= 44`) + 375px-no-overflow smoke tests to `AppLayout.test.tsx` and `CheckInView.test.tsx`. Updated `CatalogEventModal.test.tsx` assertions for the new picker's accessible-name pattern (`"Program: <value>"` instead of a bare `"Program"` label) and its no-longer-conditional initial focus.
- **Click-count parity (T063, SC-003)**: traced check-in / send-email / catalog-CRUD flows in code — no flow gained clicks; logged in `quickstart.md` §B. Not a live-browser recording (no test Google account available in this environment); still owed as a manual UAT step.
- Frontend tests: 38 files / 243 passing (was 232 before this batch). Clean `tsc --noEmit`, `vite build`, and `npm audit --audit-level=high` (0 vulnerabilities).
- **Phase A is now done** except Phase 5 (US2 — a11y/dependency/XSS proof) and Phase 6 (US3 — rollout confirmation).

### Fix — Send logical route as a query param so cross-origin GitHub Pages calls pass CORS preflight

- **`src/api/client.ts`**: the logical route now travels in the **`route` query param** (`?route=…`, merged with any existing query) instead of the custom **`X-EMS-Route`** request header, and the header is no longer set. ScriptRunner's AWS gateway now answers the CORS preflight itself, but its canned `Access-Control-Allow-Headers` list does not include `X-EMS-Route` (it does allow `Authorization` + `Content-Type`), so a browser on `github.io` would have blocked the real request. A query param needs no preflight header allowance, so cross-origin calls work against the current gateway config with no ScriptRunner change required. Auth token stays in the `Authorization` header; RBAC/handlers unchanged.
- **`src/api/client.test.ts`**: updated to assert the route + existing query params land on the listener URL and that no `X-EMS-Route` header is sent; added a case for a route with no extra query string.
- **`docs/api-contract.md`**: routing section rewritten to describe the `route` query-param transport (with the CORS-preflight rationale) and the `X-EMS-Route` header retained only as a backward-compat fallback.

### Docs — Slice 007 Phase B: HubSpot team handoff spec (T067)

- **`specs/007-redesign-initiative/hubspot-team-handoff.md`** (new): ready-to-send, copy-pasteable spec for the HubSpot admin to add attributes to the Event Items/Event Programs shells, create the Contact↔Event association + `Registered`/`Checked in` labels, confirm the Program→Event `286` association, run the workflow-association test (gate #2), and verify connector scopes — plus an explicit "what to send back" list (confirmed internal names, association/label IDs) so we can fill `HubSpotSchema.ts` + the ScriptRunner Parameters. Linked from tasks T067 and docs/hubspot-schema.md.

### Docs — Slice 007 Phase B: HubSpot custom objects created in UAT (unblocking prep for Claude Code build)

- **HubSpot team created the two custom objects in UAT** (shells): Program = **Event Programs** (`2-65757052`, display `program_name`); Event = **Event Items** (`2-65757130`, display `event_name`); **Program→Event = 1-to-many association type ID `286`**. Recorded across the 007 artifacts so the slice is buildable in Claude Code.
- **`docs/hubspot-schema.md`**: replaced the speculative "Future: Program/Event" section with a concrete **Redesign custom objects (Slice 007 — UAT)** section — object IDs, **proposed property API names** for Event/Program (marked pending HubSpot creation + confirmation), Contact↔Event labels (`registered`/`checked-in` only; attendee type deferred to existing Parts-Attended flags), and the full **ScriptRunner Connect Parameters** table (IDs are portal-specific, read at runtime, never hardcoded). QR JWT `emsEventId` = HubSpot Event record id.
- **`specs/007-redesign-initiative/data-model.md`**: Program→Event is now an association (`286`), not a `programId` property; Event has no `programId`; Contact↔Event labels reduced to `registered`/`checked-in`; gate status updated (gates #1/#3 met); points to hubspot-schema.md + Parameters as source of truth.
- **`research.md`**: R-005 updated to **PARTIALLY UNBLOCKED** with per-gate status (target env = UAT); R-007 clarified Program membership = association not route param/property; added **R-012** (store HubSpot object/association IDs in ScriptRunner Connect Parameters).
- **`plan.md`**: gate status + Parameter approach in Summary/Technical Context/Storage; added a Phase B "pre-write gates" step (attributes/labels creation, Parameters, workflow-association test); risk table updated.
- **`contracts/event-first-routes-api.md`**: status → GATED (objects created; writes gated); Program membership via association `286`; write surface + labels keyed to Parameter names.
- **`tasks.md`**: T040 gate reworded to current status; added **T065** (ScriptRunner Parameters + `HubSpotSchema.ts` constants), **T066** (workflow-association test — gate #2, stop-if-fail), **T067** (attribute/label spec handoff + confirm names); T044 routing uses association `286`; T049 verifies confirmed names; dependencies/strategy updated. Now 67 tasks.
- **`TODO.md`**: X-REDESIGN-001 → in progress (gates #1/#3 met); X-REDESIGN-004 → in progress (proposed schema recorded, attributes pending); X-REDESIGN-006 → done; added **X-REDESIGN-007** (ScriptRunner Parameters); immediate-next-steps updated.

### Feat — Slice 007 Phase A: US4 theme persistence, frontend half (`/speckit-implement 007`, T012–T013, T015–T017, T021–T022)

- **Theme CSS filled in** (`css/theme-aurora.css`, `theme-dark-aurora.css`, `theme-celebration.css`): all 3 themes now carry the full semantic-role remap using the exact `design_handoff 2/` prototype values (Aurora default, Celebration `#EC6C93` superseding the old dusty-rose, Dark Aurora net-new). `theme-celebration.css`'s legacy primitive overrides (`--color-orange`, `--color-denim`, sidebar tokens, etc.) were updated to the new pink family too, so components not yet migrated to semantic tokens (pending Phase 4) don't regress to the old palette.
- **`src/theme/useTheme.ts`** (new): applies `data-theme`, loads the persisted preference on mount, persists changes, and always re-resolves through the server response — a rejected/failed write falls back to Aurora client-side too. Preserves the one-time "welcome" toast behavior from the old `CelebrationThemeEffect`.
- **`src/utils/celebrationTheme.ts`** simplified to just `isCelebrationEmail` (the DOM-toggling `applyCelebrationTheme`/`CELEBRATION_THEME_ATTRIBUTE`/`CELEBRATION_THEME_VALUE` exports are superseded by `useTheme`'s generic attribute setter). **`src/components/CelebrationThemeEffect.tsx`** (+ its test) removed — fully replaced by `useTheme` + `ThemeSwitcher`. `App.tsx` no longer mounts it.
- **`src/components/ThemeSwitcher.tsx`** (new): 3-swatch switcher, Celebration hidden unless `celebrationAllowed`; mounted in `Sidebar`'s footer, wired through `AppLayout` (which now calls `useTheme()` and passes `theme`/`celebrationAllowed`/`onThemeChange` down). A failed/rejected theme change shows a toast explaining the Aurora fallback.
- **`dataService.ts`/`types.ts`/`mockData.ts`/`normalizeApi.ts`**: `getThemePreference`/`setThemePreference` mapping to `GET user/prefs` / `PUT user/prefs/theme` per [contracts/theme-preference-api.md](specs/007-redesign-initiative/contracts/theme-preference-api.md); `ThemePreference` DTO; mock store with an `email` parameter (mock-only — simulates the server-side Celebration allowlist re-check the live route performs from the session; ignored on the live path); `normalizeThemePreferenceResponse` never trusts an unrecognized `theme` value (falls back to Aurora).
- **Docs synced**: `docs/api-contract.md` (new Slice 007 section) and `docs/rbac.md` (route matrix rows, rate-limit row, UI-gating note, changelog) per api-contract discipline.
- **Backend half (T014, T018–T020) is intentionally not done here** — per [Frontend/CLAUDE.md](CLAUDE.md), edits under `Backend/scripts/` don't happen from a Frontend-rooted session; do it from a session rooted at `Backend/` so its own `CLAUDE.md`/`AGENTS_EMS.md` guardrails apply.
- Frontend tests: 38 files / 231 passing.

### Feat — Slice 007 Phase A: Setup + Foundational (`/speckit-implement 007`, T001–T005, T009–T011)

- **`css/tokens.css`**: added the semantic role-token layer (`--surface`, `--panel`, `--border`, `--text`, `--muted`, `--accent`, `--accent-soft`, `--ice`, status roles), aliased to existing `--color-*` primitives (research R-001). Per-theme remap values land in T015.
- **`css/theme-aurora.css`, `css/theme-dark-aurora.css`** (new): empty `[data-theme]` skeletons wired into `main.tsx`; filled in T015.
- **Hardcoded-hex sweep** across `css/layout.css` and 7 component/view `*.module.css` files (`CapacityBar`, `CatalogEventModal`, `CatalogPickers`, `CatalogProgramModal`, `CatalogAdminView`, `CheckInView`, `EmailDispatchView`): literal hex/rgba border/panel/text/status colors now reference the semantic tokens (or `color-mix()` against `--ice` for sidebar chrome) so Dark Aurora will render correctly once themed. A few instances (text-on-accent white, one amber "lock" warning banner) were left as literal hex — no semantic role covers them yet; parked as **FE-REDESIGN-009** in TODO.md.
- **Self-hosted fonts (T006–T008)**: added `@fontsource-variable/manrope` (variable, weights 200–800) and `@fontsource/material-symbols-outlined` (static, weight 400 only — the prototype only ever uses `wght 400`; ~318KB vs. ~1.4MB for the full variable-axis build) as dependencies, per user decision to source via npm rather than manually committing font binaries (same precedent as chart.js, `FE-SEC-005`). `src/styles/fonts.css` now `@import`s both; imported from `main.tsx`; `font-src 'self'` added to the CSP in `vite.config.ts`. `tokens.css` `--font-sans` now leads with `'Manrope Variable'`. Verified via `vite build` that the woff2 files bundle correctly. Glyph list actually used by the prototype (`calendar_month`, `photo_camera`, `schedule`, `search`, `videocam_off`) documented in `docs/ui-component-catalog.md` — not a hand-picked subset build, so re-check coverage before adding new icons.
- **`src/theme/themeTokens.ts`** (new): static theme catalog (`aurora`/`celebration`/`darkAurora`, labels, `gated` flag) per data-model.md.
- **`src/components/pickers/`** (new): `SelectPicker`, `TimePicker`, `CalendarPicker` — accessible popover pickers extending the `CatalogPickerSelect` pattern (button trigger + listbox/grid, arrow-key + Home/End/Escape navigation via `aria-activedescendant`, outside-click dismiss, focus returns to trigger on close). Ships with Vitest coverage; full a11y completion-gate suite still lands in T035.
- **FR-013 — admin-only, role-aware shell**: `AppLayout.tsx` now gates the whole shell on role (`src/config/shellAccess.ts`) and shows a plain "Access restricted" screen with sign-out for non-admin sessions instead of rendering the app. `Sidebar.tsx`'s nav items (including "All Events", previously ungated) now go through the same role check; `EventModule.minRoles` in `config/eventModules.ts` makes per-module role requirements data-driven so a future `check-in operator` role doesn't require restructuring. Updated `Sidebar.test.tsx` expectation accordingly; added `AppLayout.test.tsx`.
- Baseline recorded in `specs/007-redesign-initiative/quickstart.md` §A (T003): Frontend 34/215 green, Backend 21/236 green, pre-existing warnings only.
- **All of Phase 1 (Setup) and Phase 2 (Foundational) — T001–T011 — are now complete.** Frontend tests: 38 files / 225 passing (was 34/215; +10 new: pickers ×3, `AppLayout` gate). Phase A can now proceed to Phase 3 (US4 theming + persistence) and Phase 4 (US1 per-view restyle).

### Fix — flaky `EmailDispatchView` large-send test in CI

- **`src/views/EmailDispatchView.test.tsx`**: "shows a confirm modal before accepting large sends" now waits for the "Send now" button to be enabled before clicking. The button is disabled while the on-mount recipient preview is in flight (`previewLoading`), so in slower CI runs the click landed on a disabled button and was dropped — `handleSendNow` never ran and the confirm dialog never appeared, causing an intermittent `Unable to find role="dialog"` failure. Passed locally due to faster preview timing. No component behaviour change; test-only determinism fix.

### Docs — `/speckit-analyze` remediation for slice 007 (redesign initiative)

- **`specs/007-redesign-initiative/`** — applied cross-artifact analysis fixes (user-approved): **A1** theme-save rate limit now specified (`USER_PREFS_RATE_LIMIT_PER_HOUR`, default 60/user/hour) in spec FR-009 + contract + data-model + quickstart C7.1.2; **U1** theme preference keyed by **Google subject ID (non-PII)** not email (spec FR-009, data-model, contract); **U2** redesign visual QA is against **live** HubSpot data (quickstart §B); **G1** added task **T063** (click-count parity, SC-003); **I1** added task **T064** (re-verify Slice 004 capacity ±1 under the custom-object model); **G2** extended **T036** to also assert self-hosted fonts are the only new front-end asset (no CDN). D1 (duplicate picker-a11y wording) and N1 (task order) left as-is by decision. Now 64 tasks.

### Docs — `/speckit-tasks` for slice 007 (redesign initiative)

- **`specs/007-redesign-initiative/tasks.md`** (new): 62 dependency-ordered tasks organised by the 6 user stories. Phase A (US1/US2/US3/US4) is immediately actionable; Phase B (US5/US6) explicitly ⛔ gated on `X-REDESIGN-001` + design-it-twice (`X-REDESIGN-002/003`) + schema verify (`X-REDESIGN-004`). Includes Vitest/Jest test tasks (testing-discipline), api-contract/rbac/RouteGuard doc-sync tasks, and quickstart §C operator sign-off. MVP = Setup → Foundational → US4 → US1.

### Docs — `/speckit-plan` for slice 007 (redesign initiative)

- **`specs/007-redesign-initiative/plan.md`** (new): implementation plan — Technical Context, Constitution Check (PASS; Phase B items gated not violations), source touch-points, and a two-phase delivery breakdown (Phase A visual foundation unblocked; Phase B event-first + custom objects gated on `X-REDESIGN-001`).
- **`specs/007-redesign-initiative/research.md`** (new): Phase 0 decisions R-001–R-011 consolidating ADR-007/008/009 (two-tier tokens, 3 themes + gated switcher, self-hosted fonts, a11y pickers, theme persistence) and flagging the open feasibility gate (R-005) + two design-it-twice items (R-006 `CustomObjectAdapter`, R-007 event-first routing).
- **`specs/007-redesign-initiative/data-model.md`** (new): Phase A `Theme`/`ThemePreference` (non-PII, server-side Celebration re-validation); Phase B target model — Program/Event custom objects, registration-as-association labels + state transitions, per-registration Record Storage cache. HubSpot names flagged provisional until `docs/hubspot-schema.md` verified.
- **`specs/007-redesign-initiative/contracts/theme-preference-api.md`** (new): Phase A `GET user/prefs` + `PUT user/prefs/theme` with write-gate, RBAC rows, error codes.
- **`specs/007-redesign-initiative/contracts/event-first-routes-api.md`** (new): Phase B (gated) event-scoped routing change + check-in/undo/remove association-label writes, RBAC + audit rows.
- **`specs/007-redesign-initiative/quickstart.md`** (new): §A automated, §B manual, and **§C Operator security comfort checks** (slice-specific — incl. the Celebration no-tamper-unlock property; Phase B check-in checks stubbed until unblocked).

### Docs — `/speckit-clarify` pass on spec 007 (redesign initiative)

- **`specs/007-redesign-initiative/spec.md`**: ran `/speckit-clarify` (3 Qs). Recorded clarifications: (1) visual source of truth = `design_handoff 2/` prototype; (2) 007 = the **full Redesign initiative** (UI + HubSpot custom-objects migration) per ADR-007/008/009, phased A (unblocked) / B (gated on `X-REDESIGN-001`); (3) **both phases specified in full** in this spec. Reconciled the now-stale "presentation-layer only / no backend / visual-only" framing: reworded FR-001/002/003 and US2, added **FR-008–FR-019** (theming + switcher, cross-device theme preference w/ server-side Celebration re-validation, self-hosted fonts + CSP, a11y pickers, Phase-B gating, admin-only role-aware shell, event-first nav, registration-as-association, Record-Storage detail, status model, routing contract, copy fixes), added **US4–US6** with acceptance scenarios, expanded Key Entities, Success Criteria (SC-004–SC-006), Assumptions, Scope, and Edge Cases.
- **`specs/007-redesign-initiative/checklists/requirements.md`**: re-validated (16/16 → 13/16). Unchecked "No implementation details" (×2) and "Success criteria technology-agnostic" — accepted trade-off of specifying a platform + data-model migration in one spec; detail anchored to ADRs. Notes updated.

## 2026-07-12

### Docs — TODO: remaining-roadmap summary + production-proxy plan

- **`TODO.md`**: added a **"Remaining roadmap — after the redesign week"** section near the top capturing next week's planned work (Redesign Phase A → HubSpot UAT custom objects + point SRC UAT at HubSpot UAT → Redesign Phase B → full E2E testing of Slice 004 + 005; production API proxy fallback) and the roadmap that remains afterwards (Slice 007, Slice 1.5 Tier B, QR generation, later product APIs, optional polish, standing disciplines). Planning/docs only — no code changes.
- **`TODO.md`** — **FE-OPS-002** (production API proxy) moved `blocked` → `planned` and scheduled for next week: root cause is ScriptRunner Connect's OPTIONS preflight bug; plan is to wait for a possible SRC fix, else stand up the Cloudflare proxy before end of week. Needed before staff use deployed URLs.



- **`docs/decisions/009-redesign-ui-platform-theming-typography.md`** (new): ADR capturing the **UI-implementation layer** decisions from the `grill-with-docs` re-run against `Frontend/design_handoff 2/` (data-model ADR-007/008 left unchanged). **Theming:** two-tier tokens (primitive brand + a **semantic role layer** themes remap) referenced via CSS modules — the prototype's **inline `var(--x)` per element is not carried over** (resolves the design agent's callout); **3 themes** on `data-theme` — **Aurora** (default light, replaces today's default), **Celebration** (prototype pink `#EC6C93`, superseding shipped dusty-rose, WCAG contrast-checked), **Dark Aurora** (net-new dark theme); **user-chosen switcher** with **Celebration allowlist-gated** (email now *unlocks* Celebration rather than forcing it); **persistence = backend per-user pref (cross-device)**, with Celebration **re-validated server-side** and never trusted from stored pref. **Typography/icons:** **Manrope self-hosted** (subset woff2) and **Material Symbols Outlined self-hosted subset** — `font-src 'self'`, no Google Fonts/icon CDN (matches the chart.js self-host precedent). **Pickers:** custom shared calendar/time/select popovers matching all 3 themes with keyboard + ARIA + screen-reader support as a **completion gate**. **Scope:** Campaign "Drafts" **deferred** (no persisted draft state this pass). **Sequencing:** **foundation-first, two phases** — Phase A (visual system, unblocked now) vs Phase B (event-first IA + data model, gated on the ADR-007/008 feasibility slots).
- **`TODO.md`**: Redesign section reworked into a **Phase A / Phase B** split; added Phase A tasks **FE-REDESIGN-005** (semantic token layer + 3 themes incl. Dark Aurora + switcher), **FE-REDESIGN-006** (self-hosted Manrope + Material Symbols subset), **FE-REDESIGN-007** (custom a11y field pickers); refined **FE-REDESIGN-001** (now Phase B; theming split out), **FE-REDESIGN-003** (backend cross-device theme pref, server-side Celebration re-validation), **FE-REDESIGN-002** (added "HubSpot list" → "segment" copy fix); parked **FE-REDESIGN-008** (campaign drafts). Fixed the stale `ClaudeDesignHandoff` reference → `design_handoff 2`. Mirrored in Backend `TODO.md` (BE-REDESIGN-003 marked Phase A). Docs/planning only — no code changes.

### Docs — UI-redesign grilling outcomes (ADR-007, ADR-008, CONTEXT target model, TODO redesign initiative)

- **`docs/decisions/007-hubspot-custom-objects-registration.md`** (new): ADR for the redesign's data model — Program/Event become **HubSpot custom objects**; **registration = a Contact↔Event association** with labels (`registered`/`checked-in`/`customer`/`partner`); rich per-registration detail (`checkedInAt`, scan method, QR JWT) lives in **Record Storage** keyed by `contactId+eventId`, purged on Event archive, with the audit log as the durable backstop. Public/walk-in registration writes are **HubSpot-workflow-side** (EMS gains no register-attendee write); EMS's write surface is check-in / undo / remove-attendee / catalog CRUD, all checked in through the audited EMS path. Supersedes the Plan-C parts of ADR-003, resolves ADR-005 open questions. Includes blocking **feasibility gates** (free 2 object slots, workflow associations, ≤10 labels, security write-gate) and rejects association-level properties (not a real HubSpot feature) + a third join object (needs a slot the account can't spare).
- **`docs/decisions/008-standalone-events-event-first-nav.md`** (new): ADR making **Program optional** and navigation **event-first** — the Event is the primary entity, may have an optional `programId`, and a standalone Event is fully functional. Depends on ADR-007 (registration on the Event). Flags the breaking `programs/{programId}/events/{eventId}/…` → event-scoped routing change as a design-it-twice follow-up.
- **`CONTEXT.md`**: added a **redesign-transition banner** (two models in flight — Plan-C terms remain Live-accurate until ADR-007/008 ship) and a new **"Redesign transition — target model"** section defining the target vocabulary (Program/Event optional, Registration-as-association, association label, standalone Event, checked-in label, status Active/Cancelled + auto Completed, remove attendee, undo check-in, **Campaign** rename of Email dispatch, Live capacity/occupancy, **archive-vs-delete** policy, **walk-in** incl. roster propagation-lag, **no bulk "import attendees"**). Existing Plan-C terms retained for the dual-read migration window.
- **`TODO.md`**: new **"Redesign initiative"** section — parked `X-REDESIGN-001..006` (feasibility gates, `CustomObjectAdapter` design-it-twice, event-first routing/api-contract, `hubspot-schema.md` verify, migration/backfill, `/speckit-specify`) and `FE-REDESIGN-001..004` (new/redesigned surfaces, grilling copy fixes incl. propagation-lag copy, theme persistence, **RBAC posture** — admin-only incl. Overview dashboard, role-aware shell). Mirrored in Backend `TODO.md`.
- **Environment fix (not a code change):** restored the missing owner-write bit on `Frontend/docs/decisions/` and `Frontend/docs/agents/` (`chmod u+w`) — both directories were `dr-xr-xr-x`, which blocked creating new files (the ADRs) even outside the editor sandbox.

### Tooling — relocate Cursor skills from `Frontend/.cursor/skills/` to the workspace root

- **Moved `Frontend/.cursor/skills/` → `<workspace-root>/.cursor/skills/`** (all skills: `grill-with-docs`, `grilling`, `domain-modeling`, `codebase-design`, `improve-codebase-architecture`, the `speckit-*` set, `to-issues`, and `_archive`). Reason: skills nested under `Frontend/` were only picked up as scoped agent context, so they never appeared in the `/` slash-command autocomplete menu — which reads the workspace-root `.cursor/skills/` and the global `~/.cursor/skills/`. Combined with `disable-model-invocation: true` on `grill-with-docs` (explicit `/`-invocation only), the skill was effectively unreachable. Moving them next to the shared `.cursor/rules/` makes `/grill-with-docs` (and the rest) autocomplete project-wide. Note: the workspace-root folder is not a git repo, so these skills are no longer version-controlled inside the `Frontend/` repo.
- **Fixed the `../` relative links** that broke because the skills moved up one level and point at Frontend docs: `speckit-plan/SKILL.md` now links to `../../../Frontend/docs/slice-operator-security-qa-template.md`, and `_archive/setup-matt-pocock-skills/SKILL.md` now links to `../../../../Frontend/docs/agents/{issue-tracker,triage-labels,domain}.md` (also repointed the first link from the non-existent `issue-tracker-github.md` to the actual `issue-tracker.md`). Generic repo-root references (`docs/adr/`, `CONTEXT.md`, `specs/`, `.specify/…`) and the `.cursor/rules/…` reference were unaffected.

### Tooling — add the missing `grilling` skill (upstream original)

- **`.cursor/skills/grilling/SKILL.md`** (new): Added the `grilling` skill that both `grill-with-docs` and `improve-codebase-architecture` invoke but that was never present in the repo (the one broken link in the skill set). Used the original upstream skill from [mattpocock/skills](https://github.com/mattpocock/skills/tree/main/skills/productivity/grilling) verbatim rather than a locally-authored version — a relentless, one-question-at-a-time interview that walks the design tree and resolves decisions one by one before enacting a plan. Kept as a faithful copy (model-invocable via its `description` trigger phrases); the sibling skills invoke it by name (`/grilling`), so the frontmatter difference doesn't affect them.

---

## 2026-07-11

### Email dispatch — extract workflow into a testable hook (behaviour-preserving)

- **`src/hooks/useEmailDispatchWorkflow.ts`** (new): Extracted the entire email-dispatch workflow — all state (~43 fields), effects, and actions (compose, preview, send now, schedule, edit, cancel, dispatch detail) — out of the view into a dedicated hook. The hook owns the invariants (large-send confirmation gate + `largeSendConfirmed` stamping, schedule lock-warning derivation, `dispatch_locked` → friendly toast on edit/cancel, empty-audience guards) and takes its dependencies (`data`, `confirm`, `showToast`, catalog `programId`/`evId`) as explicit parameters so the logic is testable without the DOM. A derived `phase` value (`loading`/`draft`/`previewing`/`submitting`/`editing`/`savingEdit`/`cancelling`) exposes the state machine for assertions; it is not consumed by the view. No API calls or request shapes changed.
- **`src/views/EmailDispatchView.tsx`**: Reduced from ~1,227 lines to presentation + wiring — it now calls `useEmailDispatchWorkflow` and renders the returned state/actions. JSX, markup, CSS classes, `data-testid`s, and user-visible behaviour are unchanged; the view keeps only presentational helpers (`renderScheduleFields`, `attendeeDisplayName`, title/meta, schedule option constants).
- **`src/hooks/useEmailDispatchWorkflow.test.ts`** (new): DOM-free Vitest unit test driving the hook via `renderHook`. Asserts the state transitions and the large-send gate directly: draft load/defaults, send-now below threshold (no confirm, no `largeSendConfirmed`), large-send confirm required + `largeSendConfirmed: true` when confirmed, abort when declined, schedule-for-later switching to the scheduled tab, edit open/close, `dispatch_locked` handling, and the cancel confirmation gate. The existing DOM-driven `EmailDispatchView.test.tsx` continues to pass unchanged.

### Email schedule — fix past-time default when the minute rounds past :45

- **`src/utils/emailSchedule.ts`**: Replaced the separate `defaultScheduleDate` / `defaultScheduleHour` / `defaultScheduleMinute` helpers (each read its own `new Date()`) with a single `defaultScheduleSlot(now = new Date())` that derives date, hour, and minute from one clock. Rounding the minute up to the next quarter-hour now rolls the hour — and the calendar day (incl. month/year boundaries) — forward, so the suggested default is never in the past. Previously, between :46 and :59 the minute wrapped to :00 without advancing the hour (e.g. 10:53 suggested 10:00 today). `now` is injectable for testing.
- **`src/views/EmailDispatchView.tsx`**: Updated the only caller (compose + edit schedule defaults and the edit-modal fallback) to use `defaultScheduleSlot`; UI behaviour is otherwise unchanged.
- **`src/utils/emailSchedule.test.ts`** (new): Vitest coverage for the :46–:59 hour rollover, the 23:5x day rollover, month/year boundary rollovers, and that every minute maps to a valid 15-minute slot.

### Tooling — install architecture-review skills

- **`.cursor/skills/improve-codebase-architecture/`**, **`.cursor/skills/codebase-design/`**: Added Matt Pocock's `improve-codebase-architecture` skill (+ `HTML-REPORT.md`) and its `codebase-design` dependency (+ `DEEPENING.md`, `DESIGN-IT-TWICE.md`) for codebase health reviews. Skills mirror upstream verbatim; note they reference `docs/adr/` whereas this repo keeps ADRs in `docs/decisions/`.

### Planning — grilling brief for custom objects + standalone Events

- **`specs/_archive/custom-objects-and-standalone-events-grilling-brief.md`**: Added a pre-grilling brief framing the HubSpot custom-objects migration (Program/Event objects, Contact↔Event association, attendee status, per-registration JWT storage) together with making Programs optional for standalone Events. Includes a "Design vocabulary" section directing the grilling to use the `codebase-design` skill's terms (module/interface/seam/adapter/depth) and its design-it-twice pattern.

## 2026-07-09

### Email compose — schedule date input styling

- **`EmailDispatchView.module.css`**: Date and text inputs in compose fields match catalog modal form controls (border, padding, denim label, focus ring) — aligned with Hour/Timezone pickers.

### Email compose — Schedule button layout on desktop

- **`EmailDispatchView`**: Move Send/Schedule actions inside the Delivery fieldset so the primary button sits in the form flow with proper padding; stop stretching the compose card/panel to viewport height (fixes button overlapping the card border).

### Catalog admin — Archive Program destructive styling

- **`CatalogAdminView`**: Archive Program uses the same red `danger` button style as Archive Event; Unarchive Program stays secondary.

### Email compose — remove gap between Template and Audience

- **`CatalogPickers.module.css`**: Scope `flex: 1` on picker fields to `.catalogBar` only — in vertical form layouts (Email compose, etc.) the template select no longer stretches to fill leftover panel height.

### UI — consistent dropdown styling (Attendees + Email)

- **`CatalogPickerSelect`**: Reused for Attendees dispatch filter and all Email section selects (template, segment, schedule hour/timezone); native `<select>` styling replaced with catalog-picker look. Optional `className` and `testId` props; proper `<label htmlFor>` association.

### Layout — remove spurious page scroll on desktop

- **`AppLayout`**: Wrap PoC/UAT banner and shell in a `100dvh` flex column so the banner no longer stacks on top of a separate `min-height: 100vh` row (which pushed the document ~40px past the viewport). Main content area still scrolls internally when needed.

### Celebration theme — sidebar selected nav contrast

- **`css/tokens.css`**, **`css/theme-celebration.css`**, **`Sidebar.module.css`**, **`css/layout.css`**: Add `--color-sidebar-nav-active-*` tokens; celebration theme uses ice/white text on blush sidebar so selected menu items stay readable (orange accent was same hue as the shell).
- **Celebration sidebar header**: `--color-sidebar-header-bg` / `--color-sidebar-header-border` — deep dusty rose (`#9f6b6b`) with light blush accent instead of muddy brown-black on the Event Console strip.

### Sidebar — working context legibility

- **`Sidebar.module.css`**: Increase working-context label size and contrast (match nav item scale, ice colour, semibold); drop uppercase styling so event names read naturally; add section divider on the label (survives mobile `display: contents` flattening) and word-wrap for long titles; keep readable size on mobile wrap layout.

### Loading — Did you know tips on table skeletons

- **`src/constants/loadingTips.ts`**: `LOADING_DID_YOU_KNOW_TIPS` array for operators to populate; `LoadingState` shows a random tip above the spinner on table skeletons when tips exist.
- **`LoadingState`**: Did you know tips now show on all `page`/`panel` spinners in main content (not only table skeletons); inline catalog picker explicitly excluded.
- **`LoadingState.module.css`**: Scale Did you know text to 150% on desktop (≥901px); tip renders above the spinner so it stays visible on mobile/tablet without scrolling.
- **`docs/loading-did-you-know-tips.md`**: Documents the loading-screen easter egg — when tips appear, how to edit/disable them, and which views use it.

### UI/UX Taste Stack — Cursor rules + retrofit

- **`.cursor/rules/`**: Added `frontend-ui-stack.mdc`, `frontend-accessibility.mdc`, `frontend-ux-laws.mdc`, `frontend-user-flows.mdc` — adapted from internal UX guidance to EMS CSS-modules stack (not Shadcn/Tailwind).
- **`docs/ui-a11y-audit.md`**, **`docs/ui-component-catalog.md`**: Baseline scorecard and shared component index for AI-efficient audits.
- **Shared shell**: Skip-to-main link, global `:focus-visible`, `prefers-reduced-motion`; `ConfirmModal` focus trap and no `autofocus`.
- **`ViewErrorState`**: Reusable full-page error with retry; wired across data views.
- **Views**: Consistent error/alert handling, table `scope="col"`, Check-in search errors inline (keyboard-safe rows).

### Responsive — sidebar navigation on mobile/tablet

- **`Sidebar.module.css`**: Replace broken horizontal scroll (section groups stayed vertical inside a row nav) with wrapped two-column nav buttons; flatten section wrappers so catalog/event labels span full width above their links; compact header/footer on narrow viewports.
- **`css/layout.css`**: Align legacy sidebar nav breakpoint styles with the same wrap layout.

### Attendees QA — legacy navigation fix

- **`ViewRouter.tsx`**: Redirect legacy `#/events/:eventId/attendees` and `#/events/:eventId/check-in` to `#/events/attendees` / `#/events/check-in` (catalog picker context required), matching the email module pattern.
- **`EventHubView.tsx`**: Attendees, Check-in, and Email hub shortcuts now open catalog-scoped routes instead of legacy `#/events/{mockEventId}/…` URLs that ignored catalog selection.

### Security — large-send confirmation wired to backend (FR-010)

- **`EmailDispatchView.tsx`**: Sends `largeSendConfirmed: true` after operator confirms large send/schedule/edit; edit flow previews audience and confirms at threshold.
- **`src/types.ts`**, **`src/data/mockData.ts`**: `largeSendConfirmed` on create/patch bodies; mock API rejects at-threshold sends without it.

### Master QA runbook — Slice 1.5 Tier A + Slice 2

- **`specs/master-qa-slice-1.5-and-slice-2.md`**: Combined operator/engineering QA guide — phased before/after T002, automated tests, Slice 1.5 sign-off, Slice 2 mock + live checks, security comfort, and Live cutover checklist.

### Slice 2 email dispatch — US4 log polish + attendee filter (T060, T063–T065)

- **`AttendeesView.tsx`**: Email dispatch picker (from log) + Received / Did not receive outcome filter; passes `dispatchId` + `dispatchFilter` to `fetchSliceAttendees`.
- **`EmailDispatchView.tsx`**: Dispatch log detail panel paginates recipients (25 per page).
- **`dataService.ts`** + **`mockData.ts`**: `fetchSliceAttendees` forwards dispatch filter query params; mock honours sent recipient rows.
- **Tests**: `AttendeesView.test.tsx` — dispatch filter UI and API wiring.

### Slice 2 email dispatch — US3 segment picker (T053, T057–T058)

- **`EmailDispatchView.tsx`**: Audience source toggle (Registered attendees vs HubSpot segment); segment **name** picker with Active/Static label; membership drift copy.
- **`src/data/mockData.ts`**: Segment fixtures (`MOCK_EMAIL_SEGMENTS`, recipient counts, sample member emails for mock send-now).
- **Tests**: `EmailDispatchView.test.tsx` — segment picker load, preview, and send with `hubspot_segment`.

### Slice 2 email dispatch — US2 schedule UI (T049–T051)

- **`EmailDispatchView.tsx`** + **`EmailDispatchView.module.css`**: Compose **Schedule for later** (date, hour, 15-minute grid, timezone); **Scheduled** tab with list, lock-warning banner, edit modal, cancel.
- **`src/utils/emailSchedule.ts`**: Local schedule ↔ UTC conversion and validation helpers.
- **`src/data/mockData.ts`**: Scheduled create/update/cancel validation aligned with backend rules.
- **Tests**: `EmailDispatchView.test.tsx` — scheduled list + `lockWarning`, schedule create, cancel flow.

### Slice 2 email dispatch — US1 UI (T035–T041)

- **`EmailDispatchView.tsx`** + **`EmailDispatchView.module.css`**: Compose tab with audience controls (all / checked-in / not checked-in / manual multi-select with fixed selection), recipient preview, large-send confirm, Send now + toast; Dispatch log with detail panel and sent recipients; Scheduled placeholder tab.
- **`Sidebar.tsx`**: **Email** nav link for admin when Program + Event are selected (catalog picker pattern).
- **`EmailView.tsx`**: legacy `#/events/:eventId/email` redirects to `#/events/email`.
- **`ViewRouter.tsx`**: legacy event-scoped email URL redirects to catalog-scoped route.
- **Tests**: extended `EmailDispatchView.test.tsx`, `Sidebar.test.tsx`; `EmailView.test.tsx` covers redirect.
- **Build fix**: narrow `hubspot_segment` in `mockData.ts`; `EmptyState` uses `viewId` in `ViewRouter`; drop unused import in `EmailView.test.tsx`.

### Slice 2 email dispatch — US1 failing tests (T026–T027)

- **`src/views/EmailDispatchView.test.tsx`**: Compose tab, limits display, Send now flow, large-send confirm modal, and XSS guard tests.
- **`src/views/EmailDispatchView.tsx`** + **`EmailDispatchView.module.css`**: Compose | Scheduled | Dispatch log shell — limits, template picker, Send now with large-send confirm, log table (T035 partial).
- **`src/views/ViewRouter.tsx`**: Renders `EmailDispatchView` when catalog context is set.
- **`src/services/dataService.test.ts`**: Catalog-scoped email `dataService` mock/live path, idempotency, and dispatch detail tests.

### Slice 2 email dispatch — foundational (T014–T023)

- **`src/types.ts`**: Slice 2 dispatch DTOs (`DispatchAudience`, `EmailDispatchListItem`, limits/templates/segments responses, etc.).
- **`src/utils/normalizeApi.ts`** + **`normalizeApi.test.ts`**: normalizers for catalog-scoped email API responses.
- **`src/data/mockData.ts`**: mock limits, templates, segments, dispatches, preview/create/list/detail/cancel with idempotency and rate-limit simulation.
- **`src/services/dataService.ts`**: catalog-scoped `fetchEmailLimits`, `fetchEmailTemplates`, `fetchEmailSegments`, `previewEmailDispatch`, `createEmailDispatch`, `fetchEmailDispatches`, `fetchEmailDispatchDetail`, `updateEmailDispatch`, `cancelEmailDispatch` (`USE_MOCK_API` paths).
- **`src/router/navigation.ts`**, **`App.tsx`**, **`ViewRouter.tsx`**: `#/events/email` route with admin + catalog gate (placeholder until `EmailDispatchView`).
- **`docs/api-contract.md`**, **`docs/rbac.md`**, **`docs/ui-routes.md`**: Slice 2 email routes merged; legacy flat `events/{id}/email/*` deprecated.

### Audit log — table fills viewport

- **`AuditView.module.css`**: override global `.table-scroll` `max-height: 420px` so the audit table expands to fill the card (same flex pattern as Attendees view); pagination stays pinned at the bottom.

## 2026-07-08

### Slice operator security QA (process + template)

- **`.cursor/rules/ems-slice-operator-security-qa.mdc`**: requires **§C Operator security comfort checks** in every slice `quickstart.md` (and sign-off docs) — detailed step-by-step instructions for the non-developer operator before Live sign-off.
- **`docs/slice-operator-security-qa-template.md`**: copy-paste template (auth, RBAC, audit, PII, slice-specific checks, sign-off table).
- **`specs/slice-1.5-tier-a/signoff-checklist.md`**: manual smoke remapped to template step IDs; links to template for future slices.
- **`specs/003-check-in/quickstart.md`**: B7 points to Tier A sign-off + template for new slices.
- **`.cursor/rules/ems-testing-discipline.mdc`**, **`speckit-plan` skill**: cross-links to §C requirement.

## How to add entries

When making changes, add bullets under today's date. If the date section exists, append to it; otherwise create a new `## YYYY-MM-DD` section at the top (below the intro). Entries before 2026-07-08 live in [CHANGELOG-archive-2026-07-02-to-07.md](CHANGELOG-archive-2026-07-02-to-07.md).
