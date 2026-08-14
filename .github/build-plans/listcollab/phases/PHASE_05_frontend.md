# Phase 5 — Frontend Restructure

> **Phase goal**: `App.jsx` is gone. A routed, feature-organised React app renders the event page from the new aggregate API, with server state owned by TanStack Query and the event list as the primary view.

---

## Session Start

Before doing anything in this phase — at the start of every session, and after any context reset:

- [ ] Read `../TRACKER.md` and identify the next incomplete task in this phase
- [ ] Read `../CONVENTIONS.md` if you have not read it this session — §2 governs every task here
- [ ] Read `../TESTING_STANDARDS.md` if you will write or change any test this session
- [ ] Confirm the Prerequisites below still hold

Do not resume from memory. You do not retain this plan between sessions.

---

## Prerequisites

- [ ] Phase 4 complete, all its test flags passed
- [ ] The API serves the aggregate `GET /api/events/:shareToken` payload
- [ ] `packages/shared` exports response schemas and `calculateCoverage`

---

## Context

The old UI put three fixed panels side by side — People, that person's items, Required items — which mirrors the old database rather than what a user came to do. The user's actual question is "what still needs bringing, and can I take one?" That question is answered by a single scrolling list grouped by category, which also happens to be the right shape for a phone at a barbecue.

This phase builds the structure and the read path. Claiming, identity and the share flow are Phase 6; visual polish and accessibility are Phase 7. Resist pulling those forward — a half-built claim flow behind a half-built layout is very hard to test.

**Build and review every component at phone width first.** Keep the browser at 390×844 while working; open the desktop width only to check the adaptation. Phase 7 is polish, not the first time mobile gets looked at — a component that needs restructuring to fit a phone was built wrong here, and retrofitting it later costs more than building it right now. Concretely: single-column by default, no fixed-width containers, no side-by-side panels, dialogs sized as sheets, and controls large enough to tap before they are styled.

MUI stays. The old UI's problem was information architecture, not the component library.

---

## Tasks

### Task 5.1 — Router and route shapes

- Install `react-router-dom` in `apps/web`
- `apps/web/src/app/router.tsx` with routes:
  - `/` — landing: create an event, plus a list of events this browser has visited (from `localStorage`)
  - `/create` — event creation
  - `/e/:shareToken` — the event page
  - `/e/:shareToken/manage` — the same page in organiser mode, admin token read from the URL **fragment** (`#k=...`)
  - `*` — not found
- 🔒 On mounting the manage route, read the fragment, hold the admin token in memory (a context or a query-client-scoped value), then strip it from `window.location` with `history.replaceState`. It must never be sent to the server as part of a page request and must never enter `localStorage`.
- A 404 or invalid token from the API renders a plain "this event link isn't valid" screen with no detail about why

---

### Task 5.2 — API client

- `apps/web/src/services/apiClient.ts` — a thin `fetch` wrapper that attaches the `X-Event-Token` header from the current token context, sets `Content-Type`, and throws a typed `ApiError` carrying `code` and `requestId`
- **Validate every response with the shared Zod schema before returning it.** A response that fails validation throws rather than propagating a malformed object into the UI. This is the second half of the contract guarantee — the API validates in, the client validates out.
- No token is ever placed in a query string or logged
- One place, one implementation. No component calls `fetch` directly.

---

### Task 5.3 — TanStack Query and `useEvent`

- Install `@tanstack/react-query`, provider mounted in `App.tsx`
- `apps/web/src/hooks/useEvent.ts` — one query, key `['event', shareToken]`, returning the aggregate payload with loading and error states
- Configure sensible defaults: `staleTime` around 30 seconds, retry once, refetch on window focus (someone else may have claimed something while the phone was in a pocket)
- All mutations in later phases invalidate this one key. Do not add a second source of truth for event data.
- No `useState` copies of query data anywhere in the app

---

### Task 5.4 — Theme

- `apps/web/src/app/theme.ts` — a real MUI theme: palette, typography scale, spacing, shape, and component defaults
- Mobile-first breakpoints. Density and touch target sizes chosen for a phone held one-handed; the desktop layout is the adaptation, not the base.
- No colour or spacing value hardcoded in a component — everything comes from the theme
- Dark mode is Phase 7 polish. Structure the theme so it can be added without a rewrite, but do not build it now.

---

### Task 5.5 — Event page shell

- `features/events/EventPage.tsx` — route component, owns the `useEvent` query, renders loading, error and empty states
- `features/events/EventHeader.tsx` — event name, date, location, description, and a coverage summary line (`12 people · 18 / 24 items covered`)
- Coverage totals computed from `calculateCoverage` in `@listcollab/shared`, never recalculated inline
- An event with no items renders a clear empty state pointing at the add-item action, not a blank panel

---

### Task 5.6 — Category sections and item rows

- `features/categories/CategorySection.tsx` — a category heading with its icon and its items, ordered by `sort_order`
- `features/items/ItemList.tsx` — groups items by category, with an "Uncategorised" section for items whose category is null
- `features/items/ItemRow.tsx` — item name, coverage state (`2 / 4 covered`), the participants assigned with their quantities (`Aaron ×2 · James ×2`), and a slot for the claim action that Phase 6 fills
- Items with `quantityRequired: null` render as a plain contribution (`Aaron is bringing a Bluetooth speaker`), not as `0 / null`
- 🔒 All user-supplied text renders as React text nodes. No `dangerouslySetInnerHTML` anywhere. Write a component test asserting that an item named `<img src=x onerror=alert(1)>` appears as visible text and creates no element.
- Search filters the list client-side across item names and participant names

---

### Task 5.7 — Event creation

- `features/events/CreateEventPage.tsx` and `EventForm.tsx` — name, date, location, description, and a checkbox set of starter categories (Food, Drinks, Equipment, Games, Other) with the option to add a custom one
- Client-side validation uses the same shared Zod schemas as the server
- On success, store the returned share token and admin token, record the event in the browser's visited list, and navigate to the manage route
- The admin token is shown to the organiser with a clear explanation that this link is how they keep organiser access — losing it means losing it

---

### Task 5.8 — Delete the old app

- Remove `App.jsx`/`App.tsx` legacy content, the three-panel layout, the old dialogs, the old `api.js` helpers, and any component no longer reachable
- `git grep` for references to removed concepts (`required_items`, `person_id`, `people`) and clear them out
- Component tests for `ItemRow`, `CategorySection`, `EventHeader` and `EventForm` per TESTING_STANDARDS.md
- Update the Playwright smoke spec to load an event page rather than the old UI

---

## 🔒 Security Tasks for This Phase

- [ ] Admin token read from the URL fragment, held in memory only, stripped from the URL after read, never written to `localStorage`
- [ ] `X-Event-Token` set only by `apiClient`; no token in any query string, log, or error message shown to the user
- [ ] Every API response validated against its shared schema before use
- [ ] No `dangerouslySetInnerHTML` in the codebase — verified by grep and by the XSS component test
- [ ] Error states show the `requestId` and a generic message, never the raw server error
- [ ] `localStorage` contains only the visited-events list and (from Phase 6) the participant identity

---

## Test Flags

> All tests written in this phase must comply with **`TESTING_STANDARDS.md`**. Check Section 11 (Definition of Done) before marking this phase complete.

### Automated
- [ ] `npm run test` — component tests for all new components pass
- [ ] The XSS component test passes: script-like item names render as text
- [ ] `npm run test:e2e` — the smoke spec loads an event page and sees its items, passing on the **mobile project first** and then desktop
- [ ] E2E assertion: no horizontal scrollbar on the event page or the create page at 390px and 320px
- [ ] `npm run test:coverage` — 80% branch coverage on frontend components
- [ ] `npm run type-check` and `npm run lint` — zero errors
- [ ] `git grep -n "dangerouslySetInnerHTML"` returns nothing

### Manual Verification
- [ ] Creating an event lands on a working manage page with the categories chosen
- [ ] The event page renders items grouped by category with correct coverage counts
- [ ] An invalid share token shows the invalid-link screen, not a crash or an infinite spinner
- [ ] Stopping the API produces a visible error state with a retry, not a blank page
- [ ] The admin token is absent from the URL bar after the manage page loads
- [ ] Search filters items and participants as expected
- [ ] The event page is fully usable at 390×844: the item list is the dominant element, coverage counts are legible without zooming, and nothing is clipped
- [ ] The create-event form is completable one-handed on a phone, with the keyboard open, without the submit control being obscured

### Security Verification
- [ ] Browser devtools: no token appears in any request URL, only in the header
- [ ] `localStorage` inspected — no admin token present
- [ ] An item named with an HTML payload displays literally in the DOM

---

## Done When...

- [ ] All tasks above are checked off in TRACKER.md
- [ ] All automated test flags pass
- [ ] All manual verification steps confirmed
- [ ] All security tasks confirmed
- [ ] `TESTING_STANDARDS.md` Section 11 checklist satisfied for all tests written this phase
- [ ] Code committed with message: `feat(web): complete phase 5 - event page and feature structure`
- [ ] TRACKER.md updated with all task statuses

---

## Notes for Agent

- If a component is heading past 200 lines, split it before finishing the task. The failure this rebuild exists to correct was a 900-line component, and it got there one reasonable-seeming addition at a time.
- Claim buttons render in this phase but may be inert until Phase 6. Prefer an obviously disabled control over a half-working one.
- The visited-events list in `localStorage` is a convenience, not a permission. Anyone who clears it just needs the link again.
- Do not add a global store. If two distant components need the same event data, they both call `useEvent` — the query cache is the sharing mechanism.

---

*Next phase: [Phase 6 — Collaborative UX](./PHASE_06_collaboration.md)*
