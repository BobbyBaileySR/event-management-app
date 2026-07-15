# Frontend Changelog

All notable changes to the Adaptavist EMS frontend (UI, static assets, frontend docs, and Cursor rules in this folder).

Format: entries grouped by date (newest first). One bullet per logical change.

---

## 2026-07-15

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

- **`specs/custom-objects-and-standalone-events-grilling-brief.md`**: Added a pre-grilling brief framing the HubSpot custom-objects migration (Program/Event objects, Contact↔Event association, attendee status, per-registration JWT storage) together with making Programs optional for standalone Events. Includes a "Design vocabulary" section directing the grilling to use the `codebase-design` skill's terms (module/interface/seam/adapter/depth) and its design-it-twice pattern.

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

## 2026-07-07

### Slice 1.5 Tier A — step A9: sign-off checklist

- **`specs/slice-1.5-tier-a/signoff-checklist.md`**: Tier A complete (A1–A9) — gate table, deploy evidence (UAT + Live PR #7), CI/test counts, security review summary, optional smoke checks, approvals.
- **`TODO.md`**: **X-SLICE15-001** done; Tier A table A1–A9 all ✅; **X-001** Foundation gates complete.

### Slice 1.5 Tier A — step A6: PR security review (Bugbot fallback)

- **`.github/pull_request_template.md`**: EMS security checklist on every PR.
- **`docs/security-review-process.md`**: author/reviewer workflow — local checks, **`/review-security`**, human approval, CI gates. Bugbot not approved on company GitHub.
- **`docs/CONTRIBUTING.md`**: linked security review process from PR checklist.
- **`TODO.md`**: **FE-SEC-002** / step A6 done.

### Slice 1.5 Tier A — admin audit viewer (A8 frontend)

- **`AuditView.tsx`** (`#/audit`): paginated table of recent audit entries via existing `dataService.fetchAuditLog()` → `GET audit/recent`; admin-only redirect and sidebar link.
- **`src/types.ts`**: `AuditLogEntry` / `AuditLogListResult` for Slice 1.5 API shape (distinct from legacy email-dispatch `AuditEntry` used by Analytics mock).
- **`src/utils/auditDisplay.ts`**: metadata formatting with PII key denylist — actor email only in the list.
- **`mockData.ts`**: `MOCK_SLICE_AUDIT_LOG` sample entries for mock mode.
- **`dataService.ts`**: `fetchAuditLog` overloads — global list returns paginated `AuditLogListResult`; event-scoped call unchanged for Analytics mock.
- **`docs/ui-routes.md`**, **`Sidebar.tsx`**, routing — register `#/audit`.
- **Tests:** `AuditView.test.tsx`, `Sidebar.test.tsx` audit link coverage.

### Slice 1.5 Tier A — audit log API contract (A8 backend)

- **`docs/api-contract.md`**: document `GET audit/recent` and `GET events/{id}/audit` — paginated Record Storage audit log, admin-only, known action names.
- **`docs/rbac.md`**: audit routes restricted to **admin** (Slice 1.5).

### Slice 1.5 Tier A — disable production source maps (A7)

- **`vite.config.ts`**: set `build.sourcemap: false` so production GitHub Pages bundles do not ship `.map` files that expose application source (**FE-SLICE15-001**). Dev HMR and Vitest are unchanged — only `vite build` output is affected.

### CI — `listFilters.test.ts` type error

- **`listFilters.test.ts`**: add required `description` field to event fixtures so `tsc --noEmit` passes — `Event` gained `description` during catalog metadata work but this test file was missed by the prior CI fix.

### Optional polish — pre–Slice 1.5 clean slate

- **`src/utils/listFilters.ts`**: moved attendee/event filter and search helpers out of `mockData.ts` (**FE-TECH-002**).
- **`src/api/client.ts` / `authService.ts`**: removed dead `USE_MOCK_API` short-circuit and `skipMock` flag — `dataService.withMockFallback` owns mock routing (**FE-TECH-004**).
- **`src/hooks/useModalFocusTrap.ts`**: Tab cycle, Escape dismiss, and return-focus on catalog Program/Event modals (**FE-TECH-006**).
- **`TODO.md`**: archived **FE-TECH-002/004/006**; test count **160** (28 files).

### Slice 1 housekeeping — pre–Slice 1.5 clean slate

- **`TODO.md`**: Slice 1 close-out table (two external blockers only); archived **FE-SLICE1-002/003/004/007**, **FE-PROD-001**, **FE-CAP-IMPL**; reorganized Product section; test count **153** (27 files).
- **`specs/003-check-in/tasks.md`**: close-out status — T072 B5c + 004 live QA remain; T060/B4b marked done.
- **`specs/004-capacity-management/tasks.md`**: T001–T042 marked complete; status section for blocked T043–T044.
- **`specs/004-capacity-management/quickstart.md`**: Manual QA log table added.
- **`CONTEXT.md`**: last-updated note.

### Toast — larger on desktop

- **`Toast.module.css`**: double desktop toast dimensions (min-width, max-width, padding, font size) from 901px up; mobile and tablet unchanged.

### Catalog — walk-in form URL not shown after save

- **`normalizeApi.ts`**: include `walkInFormUrl` when normalizing catalog Event nodes from `GET /catalog` — the field was saved on the backend but stripped on reload, so the Event modal appeared blank on reopen and Check-in **Walk-in** mode showed “No walk-in form URL configured” despite a valid catalog value.
- **`mockData.ts`**: persist `walkInFormUrl` on mock create/update for parity with live catalog.

### Check-in QR — desktop scanner viewport clipping

- **`CheckInQrPanel`**: size the scan region from the reader container (ResizeObserver + viewfinder-aware `qrbox` function) instead of `window.innerWidth`, so the shaded scan box fits inside the camera feed on desktop two-column layout.
- **`CheckInQrPanel.module.css`**: keep the reader square with `aspect-ratio: 1` only — removed `max-height` / viewport `min-height` rules that squashed the feed on wide columns; video uses `object-fit: cover` within the square frame.

### Check-in QR — long JWT payload documentation

- **`docs/hubspot-schema.md`**: § QR payload size — RS256 JWT ~550–800+ chars; generation must encode full token; ~400-char web QR cap causes `invalid_checkin_signature` on scan.
- **`specs/003-check-in/quickstart.md`**: B4b test QR generation (`qrcode` / `qrencode`); troubleshooting rows for truncated QR and malformed JWT paste.
- **`CONTEXT.md`**: QR capacity note for future email/ticket generation.
- **`TODO.md`**: **FE-QR-GEN-001** (pairs **BE-QR-GEN-001**) — planned work before shipping registrant QR minting.

### 004-capacity-management — Check-in live attendance indicator

- **`CapacityBar`**: extended with optional live variant, 75%/90% tier styling, and paired ±1 controls; Event Hub registered fill unchanged.
- **`CapacityBar` (live)**: desk-focused layout — large on-site count, prominent percentage, thicker bar, tier badge, and touch-sized ±1 controls with Left/Correction hints.
- **`CheckInView`**: loads capacity snapshot on mount and after confirm check-in; indicator above Check-in/Walk-in mode switch; count-only hint when Event capacity unset (FR-006); surfaces capacity API errors with Retry instead of hiding the section silently.
- **`CheckInView.module.css`**: desk toolbar groups capacity card + full-width mode switch; responsive spacing and walk-in iframe heights for tablet/phone; divider and larger separated Check-in/Walk-in controls below capacity adjustments.
- **`catalogContext` / `CatalogPickers`**: `CatalogSelection.capacity` from selected Event.
- **`dataService`**: `fetchCapacityStatus`, `adjustCapacity` with mock parity in `mockData.ts`.
- **`utils/capacityTier.ts`**: tier and percentage helpers.
- **Docs**: capacity routes in `docs/api-contract.md` and `docs/rbac.md`.
- **Tests**: `capacityTier`, `CapacityBar`, `CheckInView` capacity integration, `dataService` mock adjust, `normalizeCapacityStatusResponse`.
- **CI**: fixed TypeScript errors in test harnesses after `CatalogSelection.capacity` — Vitest passes without typecheck; `npm run build` (`tsc --noEmit`) was failing in GitHub Actions.

### US3 walk-in — CSP + contract sync (Phase D)

- **`vite.config.ts`**: production CSP `frame-src` extended with `https://*.hubspot.com`, `https://*.hsforms.com`, `https://share.hsforms.com` for Walk-in iframe embed (NFR-004).
- **`docs/api-contract.md`**: merged Event `walkInFormUrl` from `specs/003-check-in/contracts/catalog-event-walkin.md`; removed provisional `POST …/walkin` — US3 walk-in is HubSpot iframe only.

### US3 walk-in — Check-in mode switch (Phase C)

- **`catalogContext.tsx`** + **`CatalogPickers.tsx`**: `walkInFormUrl` carried in catalog selection from the selected Event.
- **`CheckInView.tsx`**: **Check-in | Walk-in** segmented control; walk-in shows staff hint + HubSpot iframe (or empty/invalid states); QR and search unmounted in walk-in mode; mode resets on Program/Event change.
- **`CheckInView.test.tsx`**: Vitest for mode toggle, iframe src, empty state, invalid URL guard, QR unmount, and catalog reset.

### US3 walk-in — Event catalog field (Phase B)

- **`CatalogEventModal.tsx`**: optional **Walk-in form URL (HubSpot)** field with client-side allowlist validation (`isAllowedHubSpotFormUrl`); included on create/patch and clear-on-save via PATCH `null`.
- **`CatalogEventModal.test.tsx`**: Vitest coverage for valid URL save, optional empty field, HTTPS/host validation errors, and edit clear.

## 2026-07-06

### Attendees pagination loading feedback

- **`AttendeesView`**: table overlay spinner + dimmed rows, pagination **Loading page…** label, and disabled Prev/Next while a page fetch is in flight — fixes missing feedback when changing pages on multi-page lists.

### Slice 1 polish

- **`Sidebar.test.tsx`**: admin + catalog gating for Attendees / Check-in slice links; navigation to `sliceModulePath`.
- **`src/test/setup.ts`**: `html5-qrcode` mock uses prototype class so `CheckInQrPanel` spies work in full suite.

### Slice 1 — Attendees & Check-in (003)

- **`AttendeesView.tsx`**: catalog-scoped registered list (`#/events/attendees`); columns, debounced search, checked-in filter, server-side pagination, admin redirect, `LoadingState` skeleton/spinner.
- **`CheckInView.tsx`**: name search (≥2 chars, server `q`), summary + idempotent confirm, debounced non-blocking refresh (`#/events/check-in`).
- **`CheckInQrPanel.tsx`**: self-hosted `html5-qrcode` scanner; mock simulate path; StrictMode lifecycle cleanup.
- **`dataService.ts`**, **`normalizeApi.ts`**, **`types.ts`**, **`mockData.ts`**: `fetchSliceAttendees`, `checkInScan`, `confirmCheckIn` + normalizers.
- **`navigation.ts`**: `sliceModulePath()` for catalog-scoped slice routes.
- **Tests**: AttendeesView (incl. non-admin redirect, pagination, XSS); CheckInView + CheckInQrPanel; `normalizeSliceAttendeesResponse`; dataService slice paths.

### Slice 1 QA — live QR deferred

- **`specs/003-check-in/quickstart.md`**: §8 sign-off no longer requires live QR; new **§10** end-of-Slice 1 checklist for camera + Event JWT validation. Manual QA log updated (§3–§4, §8–§9 pass; §10 pending).
- **`TODO.md`**: **FE-SLICE1-007** for end-of-Slice 1 QR QA. **`tasks.md`**: T060 added; T055–T057 marked done.

### AI token optimization

- **Slimmed [AGENTS.md](AGENTS.md)** to index + essentials (~80 lines); detail moved to `docs/setup.md` pointer and `.cursor/rules/`.
- **Shared EMS rules** consolidated to repo root [`.cursor/rules/`](../.cursor/rules/) — removed duplicate Frontend copies; process rules (changelog, testing, TODO, API contract, code quality) now glob-scoped.
- **Trimmed `frontend-ems-core.mdc`** reading list; security rule links to root process rules.
- **Archived** one-time `setup-matt-pocock-skills` to `.cursor/skills/_archive/`.
- Updated spec/constitution links to root rule paths.

### Architecture

- **[docs/decisions/006-portable-backend-boundary.md](docs/decisions/006-portable-backend-boundary.md)**: Platform adapter boundary for ScriptRunner → future Lambda migration; cross-links Backend `Utils/Platform/`.

## 2026-07-04

### UAT / Live environments and multi-machine setup

- **`VITE_EMS_ENV`** build injection (`uat` \| `live`) in [`src/config.ts`](src/config.ts); local dev defaults to UAT via [`.env.development`](.env.development).
- **`PocBanner`**: orange UAT banner when `EMS_ENV === 'uat'`; Vitest coverage in `PocBanner.test.tsx`.
- **CI:** [`ci.yml`](.github/workflows/ci.yml) sets `VITE_EMS_ENV=live` for Live Pages; new [`deploy-uat.yml`](.github/workflows/deploy-uat.yml) deploys `uat` branch to `event-management-app-uat`.
- **Docs:** [`docs/environments.md`](docs/environments.md), [`docs/multi-machine.md`](docs/multi-machine.md); OAuth and config tables updated in [`docs/setup.md`](docs/setup.md).
- **Backend:** [`../Backend/.vscode/sftp.json.example`](../Backend/.vscode/sftp.json.example) and UAT/Live section in [`../Backend/README.md`](../Backend/README.md).

### Catalog metadata & modal forms (002-catalog-metadata-modal)

- **Bug fix — mobile Program dropdown mispositioned:** `CatalogEventModal`'s native `<select>` for Program rendered its options popup detached (top-left of viewport) on mobile, because the modal sits inside nested scroll/overflow containers (`AppLayout` `.content`/`.main`) that break native `<select>` popup positioning on mobile browsers — the same issue already fixed for `CatalogPickers`. Replaced with an in-place custom dropdown (button + `role="listbox"`), matching the `CatalogPickerSelect` pattern; added regression tests (`CatalogEventModal.test.tsx`) asserting no native `<select>` is rendered and the menu opens in place.
- **`CatalogProgramModal.tsx`**, **`CatalogEventModal.tsx`**: create + edit modals replace inline catalog admin forms; active tab only for Create/Edit; archived tab read-only metadata.
- **`CatalogAdminView.tsx`**, **`utils/catalogMetadata.ts`**: metadata summary as `label: value` lines; clear-on-save via PATCH `null`.
- **`types.ts`**, **`normalizeApi.ts`**, **`mockData.ts`**, **`dataService.ts`**: optional metadata passthrough on catalog API/mock layer.
- **Tests**: modal render/XSS/a11y/responsive smoke; admin edit/clear/archived gating; normalizer legacy + metadata cases.
- **Docs**: `docs/api-contract.md`, `docs/ui-routes.md` — 002 catalog metadata contract and modal UX.

### Catalog admin — custom picker menus (responsive)

- Replaced native `<select>` in `CatalogPickers` with `CatalogPickerSelect` — menus render in-place below the trigger (fixes detached popup on mobile / DevTools emulation).

### Catalog admin — responsive picker dock

- **`AppLayout`**: catalog pickers sit outside the main scroll region so native `<select>` menus anchor correctly on mobile/tablet.
- **`CatalogPickers.module.css`**: full-width 44px touch targets; 16px font on narrow viewports (iOS zoom guard).

### Catalog admin — Phase 7 bug fixes (001-catalog-admin)

- **`api/client.ts`**: `X-EMS-Route` is path-only; query string forwarded on listener URL — fixes Archived tab `No handler for catalog?includearchived=true` on live API.
- **`Catalog.ts` / `mockData.ts` / `CatalogAdminView.tsx`**: archived admin view lists archived Events only; active Programs appear as section labels without Program archive controls.
- **`CatalogPickers.tsx` / `catalogContext.tsx`**: “Select Program” / “Select Event” placeholders; pickers refetch and clear stale selection after admin catalog mutations via `bumpCatalog()`.
- **Tests**: `client.test.ts`, extended picker/admin/catalog tests.

## 2026-07-03

### Slice 1 — Catalog admin (001-catalog-admin)

- **Catalog navigation**: `CatalogPickers` in `AppLayout` — all roles select active Program + Event; context in `catalogContext.tsx`.
- **Catalog admin UI**: `#/catalog` → `CatalogAdminView` (admin-only) — create/edit Programs and Events, active + archived tabs.
- **`dataService.ts`**: `fetchCatalog`, `createProgram`, `updateProgram`, `createEvent`, `updateEvent` with mock/live switch; `normalizeCatalogResponse` in `normalizeApi.ts`.
- **`mockData.ts`**: mutable mock catalog store for PoC.
- **Tests**: `CatalogPickers.test.tsx`, `CatalogAdminView.test.tsx`, catalog normalizer tests.
- **`docs/rbac.md`**, **`docs/api-contract.md`**: `GET catalog` all roles; `includeArchived` admin-only.

### Catalog simplified to two levels (Program → Event)

- Removed the **iteration** layer from the EMS catalog. Each calendar run (e.g. "Atlassian Event 2025", "Atlassian Event 2026") is now its **own Program**; hierarchy is **Program → Event** only.
- HubSpot registration **form ID** now lives on the **Program** (was iteration); **Parts Attended** option stays on the **Event**.
- Updated `CONTEXT.md`, `docs/decisions/003-phase1-attendees-checkin.md`, `docs/api-contract.md` (routes now `programs/{programId}/events/{evId}/…`), `docs/rbac.md`, `docs/product-flows.md`, `docs/hubspot-schema.md`, `project-blueprint.md`, `TODO.md`, and `MY-WORKFLOW.md`.

### Foundation gates — steps 4, 8, 10

- **`vite.config.ts`**: narrowed production CSP `img-src` from bare `https:` to `'self' data:` plus Google OAuth image hosts (`*.googleusercontent.com`, `*.gstatic.com`, `accounts.google.com`). Comment notes HubSpot CDN hosts to add when Slice 1 renders real assets (**Foundation step 4**, `FE-SEC-004`).
- **`.cursor/rules/ems-api-contract-discipline.mdc`**: always-on rule — any new/changed route must update `docs/api-contract.md`, `docs/rbac.md`, `RouteGuard`, and `dataService.ts` in the same change (**Foundation step 8**). Updated `frontend-ems-core.mdc`, `frontend-security.mdc`.
- **`docs/testing-validation.md`**: test validation playbook signed off 2026-07-03 — Tier 1 negative spot-checks, Backend + Frontend CI red/green proof (**Foundation step 10**, `FE-TEST-006`).

### Delivery model — vertical slices (ADR-004)

- Added **`docs/decisions/004-vertical-slice-delivery.md`**: EMS ships one complete, production-ready feature at a time; **security-governed write gate** (schema verified + RBAC + audit + validation/rate-limit + handler order) replaces "read-only until Phase 5". Supersedes sequencing in **ADR-001** (marked superseded; risk gate retained).
- **ADR-003** reframed as **Slice 1** (catalog + attendees + check-in) with a **blocking security acceptance checklist** (write gate, alg-pinned JWT verify + Event-id match, defence-in-depth admin session, idempotency, least-privilege scopes, PII/CSP/QR-lib discipline, audit).
- **`project-blueprint.md`** §1/§2.3/§7/§8/§10/§12 reframed from Phase 0–6 to **Foundation + Slices**; Slice 1 routes and scripts added; legacy flat `events/*` marked later slice.
- **`docs/rbac.md`** + **`docs/api-contract.md`**: added Slice 1 catalog + attendee + check-in routes (`admin`, provisional); Phase column → Foundation/Slice; legacy routes relabelled later.
- **`TODO.md`**: "Phase 1 Process" → **Foundation gates (before Slice 1)**; added `FE-SLICE1-001..004` build items.
- **`docs/product-flows.md`** (stakeholder): leads with the first feature (catalog + attendees + on-the-day check-in) and Program → run → event navigation.

### Engineering skills — Matt Pocock setup

- Added **`docs/agents/`** configuration for engineering skills: GitHub issue tracker (no external-PR triage), default triage labels, and multi-context domain doc rules.
- Added **`CONTEXT-MAP.md`** — Frontend + Backend contexts with relationship notes.
- Updated **`AGENTS.md`** with `## Agent skills` section pointing at the config files.

### AI / contributor guidance — responsive UI

- Added **`.cursor/rules/frontend-responsive.mdc`**: new views and UI changes must support mobile, tablet, and desktop (mobile-first CSS, `900px` shell breakpoint, touch targets, table/chart patterns).
- Updated **`AGENTS.md`** product principles and agent checklist; cross-linked from **`frontend-patterns.mdc`**.

### Backend deploy — Phase 0 scripts live (Phase 1 Process step 6)

- Backend **BE-DEPLOY-001** complete: latest ScriptRunner `scripts/` uploaded via SFTP; auth exchange + logout verified against local Vite proxy.

### Process — TODO audit (pre–Phase 1 checklist)

- Reconciled **TODO.md** with repo state: marked Phase 1 Process steps **1, 5, 9** done; moved completed items to **Done (archive)**.
- **X-001** set to **in progress** (git + ESLint XSS + test CI done; Bugbot remains). **FE-OPS-001/002** marked **blocked**.

### Security — dependency audit CI (Phase 1 Process step 3)

- Added **`npm audit --audit-level=high`** to `.github/workflows/ci.yml` after `npm ci`.

### Architecture — React migration R4 (cleanup, branch `react-migration`)

- **Deleted legacy vanilla app:** `js/` tree, `dev-server.mjs`, `index.vanilla.html`.
- **ESLint** retargeted to `src/` with **`dangerouslySetInnerHTML` ban** (closes **FE-SEC-007** for React). Removed `dev:legacy` npm script.
- **CI** runs `npm test` (37 specs) in addition to lint + build.
- Updated **AGENTS.md**, **README.md**, **docs/setup.md**, **docs/ui-routes.md**, **docs/CONTRIBUTING.md**, **frontend-patterns.mdc**, **frontend-security.mdc**, **react-migration-plan.md**, **TODO.md**.

### Architecture — React migration R3e + R3f (Settings + Email, branch `react-migration`)

- Ported **`SettingsView`** — read-only event details, registration/access panel, danger zone (PoC placeholders).
- Ported **`EmailView`** — audience overview, compose send (template/segment/timing), scheduled sends table, mock dispatch with large-send **`ConfirmModal`**.
- Added **`ConfirmProvider`** / **`useConfirm()`** in `src/components/ConfirmModal.tsx`; wired into `App.tsx`.
- Wired both into **`ViewRouter`**. Added **5 Vitest specs** (render + XSS guards). **37 tests** passing; production bundle ~449 KB.

### Architecture — React migration R3d (Agenda + Check-in, branch `react-migration`)

- Ported **`AgendaView`** — session schedule table, Export PDF placeholder (disabled when empty), HubSpot sync hint.
- Ported **`CheckInView`** — registered-only search list (max 8 rows), per-row Check in toast (PoC), QR scan placeholder panel.
- Wired both into **`ViewRouter`** (`agenda`, `check-in` routes). Added **4 Vitest specs** (render + XSS guards). `npm test` green (32 tests).

### Architecture — React migration R3c (Analytics + Chart.js npm, branch `react-migration`)

- Ported **`AnalyticsView`** — registration summary stats, campaign metrics list, recent sends audit feed, empty states.
- Added **`ConversionChart`** (`chart.js` + `react-chartjs-2`) — doughnut funnel chart using brand CSS tokens; **self-hosted in the Vite bundle** (no CDN). Closes **FE-SEC-005** for the React app.
- Wired into **`ViewRouter`** for the `analytics` route. Added **2 Vitest specs** (render + XSS guard). `npm test` green (28 tests). Production bundle ~433 KB (Chart.js included).

### Architecture — React migration R3b (Attendees, branch `react-migration`)

- Ported **`AttendeesView`** — segment filters (All/Registered/Checked In/Cancelled), search, selectable rows, detail panel, Export CSV toast, Send email / Update status actions (PoC placeholders).
- Wired into **`ViewRouter`** for the `attendees` route.
- Added **3 Vitest specs** including XSS render guard and row-selection detail panel test. `npm test` green (26 tests).

### Architecture — React migration R3a (Events + Event Hub, branch `react-migration`)

- Ported **`EventsView`** and **`EventHubView`** — portfolio table (filters, search, stats) and event hub (capacity bar, module cards, activity feed) wired to `useDataService()`.
- Added shared view shell components: **`TopBar`**, **`StatusBadge`**, **`EmptyState`**, **`CapacityBar`**; **`format.ts`** (`statusBadgeClass`, `formatDateTime`).
- **`ViewRouter`** dispatches by logical route — ported views replace `RoutePlaceholder`; unported modules still show the placeholder.
- Imported global **`layout.css`** + **`components.css`** for PoC view styling; **`AppLayout`** loads event name for the sidebar.
- **R3 split into R3a–R3f** in [docs/react-migration-plan.md](docs/react-migration-plan.md) (each ~R2 intensity). Added **6 Vitest specs** (EventsView, EventHubView XSS guards, format utils). `npm test` green.

### Architecture — React migration R2 (data layer, branch `react-migration`)

- Ported **`dataService.ts`**, **`normalizeApi.ts`**, and **`mockData.ts`** to TypeScript under `src/` — same mock/live switch as the vanilla app; session token passed explicitly via `DataServiceOptions` / `createDataService()`.
- Added **`useDataService()`** hook (`src/hooks/useDataService.ts`) — binds `useSession()` token to all fetch methods for R3 views.
- Extended **`types.ts`** with domain types (Event, Attendee, analytics, email payloads, etc.).
- Added **12 Vitest specs** — `normalizeApi.test.ts` (API → UI mapping) and `dataService.test.ts` (mock path + live path with token). `npm test` green (17 tests total).

### Architecture — React migration R1 (shell + routing + auth, branch `react-migration`)

- Ported the **app shell** to React: `AppLayout` (banner + sidebar + routed main), `Sidebar`, `PocBanner`, `Toast` (context/hook) — each with a CSS Module using brand tokens.
- **Hash routing** via `react-router` with `:eventId`/`:module` params; `eventId` now derives from the URL, removing the old `setSelectedEventId` double-render workaround. Added `router/navigation.ts` helpers.
- **Session context** (`state/appState.tsx`) replaces `appState.js` — session in memory, `useSession()` hook.
- **Auth brought forward from R2** (a login gate needs it): ported `authService.ts` (Google Identity Services button + `/auth/exchange` live/mock) and `api/client.ts` (token passed explicitly, no global state). Added GIS script + minimal GIS typings; `LoginView` mounts the button.
- **Testing set up** (`FE-TEST-001` done): Vitest + React Testing Library + jsdom via `vite.config.ts` `test` block; first specs `navigation.test.ts` and `RoutePlaceholder.test.tsx` (includes an XSS render guard). `npm test` green (5 tests).
- Views remain `RoutePlaceholder` stand-ins until R3. Build, tests, lint, and dev server all verified.

### Architecture — React migration R0 (scaffold, branch `react-migration`)

- Scaffolded **Vite 8 + React 19 + TypeScript** with `react-router` hash routing; placeholder route renders and the production build passes (`npm run build` = `tsc --noEmit && vite build`).
- **CSS Modules** adopted (`PlaceholderView.module.css`) using brand tokens from `css/tokens.css`.
- **Build-only CSP:** strict Content-Security-Policy injected into `index.html` at build time via a Vite plugin (dev server stays HMR-friendly; production bundle keeps `script-src 'self'`). Dropped `cdn.jsdelivr.net` (Chart.js will be self-hosted when Analytics is ported).
- Preserved the vanilla app as `index.vanilla.html` for reference during porting; `dist/` gitignored.
- `vite.config.ts` `/api/ems` dev proxy mirrors `dev-server.mjs` (reads `dev-server.config.js` when present).
- **CI rewritten** (`.github/workflows/ci.yml`): Node 22, `npm run lint` + `npm run build` on every push/PR; deploys `dist/` to GitHub Pages via Actions on `main`. Requires repo Pages source = GitHub Actions (one-time manual setting).

## 2026-07-02

### Architecture — React migration (planning only)

- Removed the "no React/Vue" line from `.cursor/rules/frontend-patterns.mdc` (was included by mistake).
- Added [docs/react-migration-plan.md](docs/react-migration-plan.md) — decision + phased plan to adopt **React + TypeScript + Vite** (build step, CSP notes, phased R0–R4, docs/rules to update). No code migrated yet.
- Added `TODO.md` **Architecture** section (`FE-ARCH-001`–`005`); noted this reshapes `FE-SEC-005/007`, `FE-TEST-001` (→ Vitest + RTL), and `FE-TECH-001/005`. Cross-folder `X-006` added in `../Backend/TODO.md` (CI build step; Backend runtime unaffected).

### Testing — discipline + parked setup

- Added **Testing** section to `TODO.md` (`FE-TEST-001` runner setup, `FE-TEST-002` pure-logic unit tests, `FE-TEST-003` XSS render tests, `FE-TEST-004` test CI, `FE-TEST-005` per-view standing requirement) and Phase 1 Process **step 9** (automated test CI).
- Added cross-cutting `X-004` (Playwright E2E) and `X-005` (standing test discipline).
- Added `.cursor/rules/ems-testing-discipline.mdc` and an `AGENTS.md` checklist item: new views/services ship with tests once a runner exists; deferrals parked in `TODO.md`.
- Added [docs/testing-validation.md](docs/testing-validation.md) — how to validate tests (Tier 1 negative spot-checks, CI proof, deploy smoke) without infinite meta-testing; **`FE-TEST-006`** + Phase 1 Process **step 10**.

## 2026-07-02

### TODO — Phase 1 Process + remaining cleanup parked

- Added **Phase 1 Process** pre-flight checklist (8 gates before HubSpot read APIs).
- Parked optional polish: `FE-TECH-001`–`005`, `FE-PROD-003` (UI role gating), `FE-SEC-007` (ESLint innerHTML ban).
- Added `X-003` contract sync discipline; moved `FE-SEC-004` to Pre–Phase 1 (Phase 1 Process step 4).

### Small quick wins (with caveats)

- **`APP_NAME` / `APP_SHORT_NAME` wired:** Login card and `document.title` use `APP_NAME`; sidebar header uses `APP_SHORT_NAME`. Added `js/utils/branding.js`.
- **Chart.js brand colors:** Analytics funnel reads `--color-cobalt`, `--color-orange`, `--color-black` from CSS tokens via `getBrandColor()`.
- **Removed unused `escapeHtml`** from `dom.js` (`htmlToElement` kept for documented trusted-static use).
- **CSP / ScriptRunner host:** Documented `connect-src` pinning and proxy vs direct-listener setup in `docs/setup.md`.

### Nice-to-have quick wins

- **withMockFallback:** Removed unreachable `ApiError` status-0 catch (mock path never calls `apiRequest` when `USE_MOCK_API` is true).
- **config.example.js:** Clarified `CONFIG_EXAMPLE` vs `CONFIG`; added `APP_SHORT_NAME` to the example.
- **Docs:** Mermaid route diagram includes Check-in, Agenda, Settings; product flows “Recent sends” wording aligned with Analytics UI.

### Navigation & contract polish

- **F3 — Double render fix:** `setSelectedEventId` no longer notifies app subscribers; hashchange is the single view-update driver.
- **F4 — Single nav source:** `js/config/eventModules.js` feeds sidebar and Event Hub module cards.
- **F6 — api-contract:** Documented activity, agenda, campaign metrics, scheduled emails, and audit routes; `fetchTemplates(eventId)` now uses `/events/{id}/email/templates`.

### Before Phase 1 — API alignment & live-data prep

- **Email naming (F1):** Renamed `previewDispatch` → `previewEmail`, `dispatchEmail` → `sendEmail`; live paths now use `/events/{id}/email/preview` and `/events/{id}/email/dispatch`. Config key `DISPATCH_CONFIRM_THRESHOLD` → `EMAIL_SEND_CONFIRM_THRESHOLD`. CSS `.dispatch-panel` → `.email-panel`.
- **API normalizer (F5):** Added `js/utils/normalizeApi.js` — maps contract shapes (`startDate`, `firstName`/`lastName`, `checked_in`) to UI shapes used by views. Applied in `dataService.js` on live API responses.
- **api-contract.md:** Phase 0 auth error codes, opaque session token wording, logout errors, 429 on exchange.

### Phase 0 cleanup (quick wins)

- Aligned PoC messaging: login notice now says **sample data** (matches app banner) when `USE_MOCK_API` is true.
- Updated `docs/ui-routes.md`, `docs/rbac.md`, and `TODO.md` — removed stale “empty mock data” wording; rbac role inheritance now references live `expandRole` / `roleCanAccessRoute` in backend.

### Fully populated EMS PoC

- Restored rich **sample mock data**: 6 events (active, draft, completed, cancelled), attendees with email/ticket/source, templates, campaign metrics, scheduled sends, agenda sessions, activity feed, audit log.
- **New module shells:** Check-in (`checkInView.js`), Agenda (`agendaView.js`), Settings (`settingsView.js`).
- Enhanced All Events (portfolio stats, status filters, search), Event Hub (capacity bar, activity, 6 modules, quick actions), Attendees (search, detail panel, export), Email (scheduled sends table, preview), Analytics (live mock metrics + event-scoped audit).
- Extended router, sidebar, and `dataService.js` for new routes and mock endpoints.

### Security briefings (internal, gitignored)

- Added `docs/security-briefing-stakeholders.md` — non-technical FAQ for managers/events team pushback on public URLs and PII.
- Added `docs/security-briefing-technical.md` — architecture, threat model, Phase 0 controls, production checklist for security reviewers.
- Explicit `.gitignore` entries for both briefing files (entire `docs/` folder was already excluded from GitHub Pages publish).

### Project tracking

- Added `TODO.md` — parked/deferred optional work (git/CI security scanning, CSP follow-ups, hosting); seeded from Phase 0 security assessment.
- Added `.cursor/rules/ems-todo-discipline.mdc` — agents must park skipped/deferred items in `TODO.md`.
- Updated `frontend-ems-core.mdc`, `ems-ask-before-acting.mdc`, and `AGENTS.md` to reference `TODO.md`.

### EMS PoC refactor (event-centric shell)

- Replaced email-blast PoC with **Event Management System** navigation: All Events → Event Hub → Attendees / Email / Analytics.
- Hash routes now use `#/events/{id}` and `#/events/{id}/{module}` (removed legacy `#/dispatch/{id}`).
- Added `eventHubView.js`, `attendeesView.js`, and `emailView.js`; removed `dispatchView.js`.
- Mock data cleared to **empty arrays** — views show purposeful empty states until HubSpot read APIs connect (Phase 2+).
- Updated branding from "Event Command Center" to "Adaptavist EMS" / "Event Management System".
- Event-scoped sidebar with module nav; global "All Events" always visible.

### Security hardening

- Tightened CSP `connect-src` from broad `https:` to `self` + required Google/ScriptRunner hosts (narrows XSS exfiltration).
- Added Subresource Integrity (SRI `sha384`) hash to the pinned `chart.js` CDN script (supply-chain protection).
- Documented XSS-prevention rules (render dynamic data via `textContent` / `el({ text })`, never `innerHTML`) across `frontend-security.mdc`, `frontend-patterns.mdc`, `AGENTS.md`, `docs/CONTRIBUTING.md`, blueprint §3.6, and a `dom.js` `htmlToElement()` warning — session token is in memory, so XSS = session compromise.

### Local dev proxy (Phase 0 auth)

- Added `dev-server.mjs` + `dev-server.config.example.js` — serves UI and proxies `/api/ems` → ScriptRunner (avoids OPTIONS/CORS).
- `API_BASE_URL` is now `/api/ems` (same origin); ScriptRunner URL lives in gitignored `dev-server.config.js`.
- `npm run dev` replaces `python3 -m http.server` when testing live auth.

### Phase 0 — Authentication (frontend)

- Fixed logout remounting login twice (duplicate `bootstrap()` + duplicate GIS `initialize()`); Google button 403 warnings after sign-out.
- Single-flight GIS `initialize()` at app startup; disabled FedCM for local dev; login mount guard prevents duplicate button renders on refresh.
- Login shell and Google button render once per page load; logout only toggles visibility (fixes gsi/button 403 after sign-out).
- Reverted OAuth redirect/PKCE experiment — GIS popup button is sufficient for Phase 0; optional gsi/button 403 in Network tab is harmless noise.
- `authService.js` calls `auth/exchange` and `auth/logout` with `skipMock` when `USE_MOCK_AUTH` is false.
- `api/client.js` posts to full `API_BASE_URL` with `X-EMS-Route` header (ScriptRunner flat listener paths).

### Documentation (hosting and budget)

- **`project-blueprint.md` §4:** $0 default (GitHub Pages), Phase 0 session auth mandatory, Cloudflare Access deferred to Phase 6.
- **`docs/setup.md`:** Cloudflare Access timing; Phase 0 auth checklist.
- **`docs/decisions/002-zero-budget-hosting.md`:** ADR for GitHub Pages primary, Phase 6 edge auth.
- **`README.md` / `AGENTS.md`:** Public UI vs protected API until Cloudflare Access.

### Repository
- `.gitignore` now excludes `docs/`, `project-blueprint.md`, and `node_modules/` so internal specs and deps are not published via GitHub Pages.

### Tooling

- Added ESLint (flat config, `eslint.config.js`) with browser/ES-module globals and `Chart`/`google` CDN globals; scripts `lint` and `lint:fix`.
- Added GitHub Actions workflow `.github/workflows/ci.yml` to run lint on push/PR.
- Baseline lint: 0 errors, 3 warnings (unused `ApiError` import and two unused `root` vars) — non-blocking.

### Cursor rules

- Migrated from `Frontend/.cursorrules` to `.cursor/rules/*.mdc` (scoped, always-on vs file-specific rules).
- Added rules: clarify before acting when requests are unclear; modular/readable code priority; changelog discipline.

### Documentation

- Added `docs/product-flows.md` — non-technical user journeys for events team stakeholder.
- Added `docs/CONTRIBUTING.md` — roles, PR checklist, AI guardrails.
- Rewrote `project-blueprint.md` — EMS vision, event-centric model, read-first HubSpot phases, documentation index.
- Added `AGENTS.md` — frontend development guide for AI and developers.
- Added supporting docs: `hubspot-schema.md`, `api-contract.md`, `rbac.md`, `ui-routes.md`, `setup.md`, `decisions/001-read-first-hubspot.md`.

### Application (PoC shell)

- Replaced monolithic `index.html` with modular ES module structure (`js/views/`, `js/services/`, `css/`).
- Implemented Google Sign-In via programmatic `renderButton` (dynamic login mount).
- Hash routing for events, dispatch, and analytics views with mock data layer.
- Brand tokens in `css/tokens.css` aligned to Adaptavist palette.

### Fixes

- Fixed `js/router.js` import path for `appState.js` (404 on `/state/appState.js`).

---

## How to add entries

When making changes, add bullets under today's date. If the date section exists, append to it; otherwise create a new `## YYYY-MM-DD` section at the top (below this instructions block).
