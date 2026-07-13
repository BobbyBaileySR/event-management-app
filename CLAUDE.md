# Frontend guidance

Converted from `Frontend/.cursor/rules/*.mdc`. See also the repo root [CLAUDE.md](../CLAUDE.md) for changelog/testing/TODO/API-contract discipline that applies across Frontend and Backend.

## Adaptavist EMS (Frontend) — product model

Staff-only Event Management System UI over HubSpot via ScriptRunner Connect.

- **Event** is the primary object; **Email** is a sub-feature under an event.
- HubSpot is system of record; browser never holds HubSpot credentials.

**Read before coding:**
1. `project-blueprint.md` — §2 product model, §3 security
2. `TODO.md` — parked/deferred items
3. Frontend security rules (below)

**When touching APIs:** `docs/api-contract.md` · `docs/rbac.md` · `docs/hubspot-schema.md`

Backend work: see [../Backend/AGENTS_EMS.md](../Backend/AGENTS_EMS.md). `AGENTS_ANNEX.md` supersedes conflicting guidance if present.

## Frontend security — never violate

- No HubSpot tokens, signing secrets, or private keys in frontend code
- No auth bypass or mock login in production paths
- No direct HubSpot API calls from the browser — all data via ScriptRunner
- No inventing HubSpot property names — use `docs/hubspot-schema.md` or TODO
- Email navigation must stay under event context — not a top-level email app
- Brand colours from `css/tokens.css` only (#FF6633, #0B0573, #000A27, #170AF0, #ECF1FF)
- Edit only under `Frontend/` — do not modify `Backend/scripts/` from here
- Blueprint Section 3 is non-negotiable — defer features that cannot be secured

**XSS prevention (top risk once real data renders):** the session token lives in memory (`src/state/appState.tsx`). Any XSS can read it while the page is open, so an injection is a session compromise — treat XSS as a first-class security issue, not a polish item.

- Render all dynamic text (HubSpot data, user input, API responses, URL/hash values) with JSX `{text}` — **never** `dangerouslySetInnerHTML`, `innerHTML`, `insertAdjacentHTML`, `outerHTML`, or `document.write` with dynamic content.
- Build attributes with React props / `setAttribute`; never interpolate dynamic values into an HTML string. Never put untrusted data in `href`/`src`/`on*`/`style`.
- Do not loosen the production CSP (no `*`, no broad `https:` in `script-src`/`connect-src`, no `unsafe-eval`). Chart.js is self-hosted via npm in the Vite bundle.

Deploy via Git only. Register OAuth origins for every hosting URL.

Deferred security work (optional hardening the user skips — CI Bugbot/security-review, dependency audit, etc.) must be parked in `TODO.md`. CSP `img-src` is tightened in `vite.config.ts` (`FE-SEC-004`); add HubSpot CDN hosts when Slice 1 renders real images.

## Frontend patterns

- One view per file in `src/views/` — export a React component (no `mount()`/`unmount()`)
- Data via `src/services/dataService.ts`; HTTP via `src/api/client.ts` (`X-EMS-Route` for logical paths)
- Auth via `src/services/authService.ts` → `auth/exchange` when live
- Routing: `react-router` hash routes in `src/App.tsx`; event context from URL params via `useActiveRoute()`
- Session: `src/state/appState.tsx` + `useSession()`; data fetching: `useDataService()` hook
- Keep `USE_MOCK_API` path until backend endpoint exists for that feature
- Render dynamic/remote data with JSX `{value}` — never `dangerouslySetInnerHTML` (XSS)

**When changing features:**
- Update `docs/ui-routes.md` if routes or views change
- Align with `docs/product-flows.md` or flag stakeholder review
- Minimal diffs — no drive-by refactors
- Do not edit `project-blueprint.md` unless the user asks

Before finishing: event-centric nav, no bypass auth, brand tokens used, responsive on mobile/tablet/desktop, UI/a11y rules followed, new view ships with Vitest specs.

## Responsive UI (mobile, tablet, desktop)

Every new or changed screen must work on **phone, tablet, and desktop/laptop** — not desktop-only layouts. Staff may check events on-site from phones; treat responsive layout as a shipping requirement, not polish.

**Design defaults:**
- Mobile-first CSS — base styles for narrow viewports; add `@media (min-width: …)` for larger layouts when needed.
- Fluid width — prefer `%`, `fr`, `minmax()`, and `min-width: 0` on flex/grid children; avoid fixed widths that break on small screens.
- Existing breakpoint — align with the app shell: **`900px`** (`Sidebar`, `AppLayout`, global layout in `css/layout.css`).
- Touch targets — interactive controls at least **44×44px** (padding counts); adequate spacing between tap targets.
- Readable text — no tiny fixed font sizes; body copy legible without horizontal zoom.

**Layout patterns:**
- Shell — sidebar collapses / stacks below `900px`; new chrome follows the same pattern.
- Tables — on narrow viewports: horizontal scroll wrapper, card/stack alternative, or hide non-essential columns — never overflow the viewport silently.
- Forms & modals — full-width fields on mobile; modals fit the viewport.
- Data viz — charts (`ConversionChart`, etc.) must resize; use responsive container height/width, not fixed desktop-only dimensions.

Before finishing UI work: mentally check ~375px, ~768px, ≥1024px; no horizontal page scroll from layout bugs; primary actions reachable without hover-only interactions. Vitest/jsdom does not replace device testing — assert layout renders without error at a narrow container when practical.

## UI stack

Do **not** add Tailwind, Shadcn, Tremor, or Mantine. EMS uses CSS modules + brand tokens.

- Colours, radii, shadows: `css/tokens.css` only — never hardcode hex outside tokens
- Shared primitives: `css/components.css` (`.btn`, `.card`, `.form-group`, tables, badges)
- View-specific layout: `*.module.css` beside the component
- No inline `style={}` except skeleton width placeholders in `LoadingState`

**Reuse before inventing:**

| Need | Use |
| :--- | :--- |
| Page title + meta | `TopBar` |
| Async loading | `LoadingState` (variant + skeleton) |
| No data | `EmptyState` |
| Success / error feedback | `useToast()` |
| Destructive confirm | `useConfirm()` / `ConfirmModal` |
| Charts | `ConversionChart` only (Chart.js via npm bundle) |
| Modal focus trap | `useModalFocusTrap` |

Layout inspiration: follow journeys in `docs/product-flows.md` — do not import external template libraries. AI chat UI (`assistant-ui`, Vercel AI SDK): deferred — park in `TODO.md` if requested.

## Accessibility (WCAG 2.2)

**Structure:**
- `<html lang="en">` in `index.html`
- One `<h1>` per view via `TopBar` — subsections use `<h2>`+
- Landmarks: `<nav>`, `<main>`, `<header>` where appropriate
- Tabular data: `<table>`, `<th scope="col|row">`
- Form groups: `<label htmlFor>` paired with input `id`; complex groups use `<fieldset>` + `<legend>`

**Interaction:**
- Actionable controls: `<button type="button|submit">` or `<a href>` — never clickable `<div>`
- No `autofocus` anywhere
- Skip link in `AppLayout`: first focusable element jumps to `#main-content`
- Modals: `role="dialog"`, `aria-modal="true"`, labelled title, focus trap via `useModalFocusTrap`
- Hidden panels: remove from tab order when collapsed (`tabIndex={-1}` or `hidden`)

**Keyboard and focus:**
- Visible `:focus-visible` on buttons, links, inputs, custom selects
- Sticky chrome must not obscure focused elements — use `scroll-padding-top` on `main`
- Do not trap keyboard focus outside modals

**Visual:**
- Text contrast ≥ 4.5:1; large text / UI borders / icons ≥ 3:1 — use token pairs from `tokens.css`
- Form validation: error text + `role="alert"` / `aria-describedby` — never colour alone
- Touch targets ≥ 44×44px on interactive controls
- `prefers-reduced-motion`: disable or simplify animations globally

**Media and motion:** no autoplay audio/video; respect `prefers-reduced-motion` for spinners, shimmer, transitions.

## User flows

Before building or changing a screen, read the matching journey in `docs/product-flows.md` and route entry in `docs/ui-routes.md`.

**EMS flow map:**
1. Sign-in → `LoginView` → Google → `/auth/exchange`
2. Catalog scope → `CatalogPickers` (Program + Event) required for slice views
3. Operations → Attendees / Check-in / Email under selected catalog scope
4. Admin → Catalog admin, Audit log

Email always lives under event/catalog context — never a standalone top-level app.

**Required states per data screen:**

| State | Component / pattern |
| :--- | :--- |
| Loading | `LoadingState` with appropriate skeleton |
| Empty | `EmptyState` with helpful next action |
| Error | Visible message (`role="alert"`) + retry where sensible |
| Success mutation | `showToast()` |

**Standard flows (checklist):**
- Check-in: search / scan / walk-in → confirm → toast → list refresh
- Send email: compose → preview recipients → send or schedule → toast → log tab
- Catalog CRUD: modal form → validate → save → toast → tree refresh
- Archive / cancel: confirm dialog → API → toast

Do not duplicate full journey prose here — update `product-flows.md` when product behaviour changes.

## UX laws (coding rules)

**Cognitive load:**
- Hick's Law: max **2 primary** actions in `TopBar` trailing; bury secondary actions in outline buttons or progressive disclosure
- Miller's Law: chunk long forms and dense tables — cards, sections, pagination
- Tesler's Law: auto-format inputs (dates, phones) server-side or on blur; do not push complexity to the user

**Feedback and performance:**
- Doherty Threshold: show `LoadingState` (or inline skeleton) on first paint for any async fetch — target perceived feedback under 400ms
- Visibility of system status: disable submit buttons while saving; show `aria-busy` on refresh actions
- Peak-End Rule: call `showToast()` on successful completion of major flows (check-in, send email, save catalog, archive)

**Safety and trust:**
- Destructive actions: `useConfirm()` before archive, cancel dispatch, irreversible mutations
- Error prevention: disable submit until required fields valid; inline validation before API call
- User control: every modal and destructive flow has Cancel; modals restore focus on close

**Patterns EMS already uses:**
- Jakob's Law: event list → event hub → module; sidebar nav; catalog pickers for slice scope
- Humane / finite: pagination or explicit page controls — no infinite scroll
- Aesthetic-usability: brand tokens + shared components — do not one-off styling

**Copy:** user-facing errors in plain language — no HTTP codes, HubSpot IDs, or stack traces.
