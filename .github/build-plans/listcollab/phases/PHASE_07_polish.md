# Phase 7 — Responsive Polish and Accessibility

> **Phase goal**: The app is genuinely usable on a phone, communicates state clearly at every point, and is operable by keyboard and screen reader.

---

## Session Start

Before doing anything in this phase — at the start of every session, and after any context reset:

- [ ] Read `../TRACKER.md` and identify the next incomplete task in this phase
- [ ] Read `../CONVENTIONS.md` if you have not read it this session
- [ ] Read `../TESTING_STANDARDS.md` if you will write or change any test this session
- [ ] Confirm the Prerequisites below still hold

Do not resume from memory. You do not retain this plan between sessions.

---

## Prerequisites

- [ ] Phase 6 complete, all its test flags passed
- [ ] The full MVP flow passes end to end
- [ ] No functional work outstanding — this phase changes presentation, not behaviour

---

## Context

The primary device for this app is a phone, held one-handed, possibly outdoors, by someone who was handed a link thirty seconds ago and has no idea what the app is. Everything here serves that person.

Phases 5 and 6 were already built and verified at phone width, so this phase refines a mobile app rather than adapting a desktop one. If a task here requires restructuring a component to fit a phone rather than refining how it looks, that is a regression against Phase 5 — fix it, and record in TRACKER.md how it got through, since the same gap will produce the next one.

This phase is presentation only. If a polish task reveals a functional bug, fix the bug and record it in TRACKER.md, but do not add features. The scope list in the README's Key Decision 14 still applies — drag and drop, dark mode and event themes are explicitly optional and only justified if the rest of the phase is complete.

---

## Tasks

### Task 7.1 — Responsive layout

- Mobile-first: the base layout is the phone layout, and larger breakpoints adapt it
- Verify at 320px, 390px, 768px and 1280px. No horizontal scrolling at any width.
- Touch targets at least 44×44px. The claim control in particular must be comfortably tappable in a dense list.
- Dialogs become full-screen or bottom sheets on small screens rather than cramped modals
- Long item names, participant names and notes wrap or truncate with an accessible full value — they must never break the row layout
- The event header collapses gracefully on scroll so the list stays the focus

---

### Task 7.2 — Loading and empty states

- Skeletons for the event page load rather than a spinner over a blank screen
- Distinct, useful empty states for: an event with no items, a category with no items, an event with no participants, and a search with no matches — each pointing at the action that resolves it
- Mutations show pending state on the specific control being used, not a global overlay
- Slow network handled: the page renders as data arrives rather than blocking on everything

---

### Task 7.3 — Snackbars replace persistent error banners

- Replace the old global persistent error display with transient snackbars for transactional feedback (claim succeeded, claim rejected, item added)
- Errors that need action (invalid link, API unreachable) remain as inline states with a retry — those are not snackbar material
- Include the `requestId` in error snackbars so a report can be traced, and nothing else about the failure
- Snackbars must be dismissible and must not stack into an unreadable pile

---

### Task 7.4 — Destructive-action confirmation

- Confirmation dialogs for: deleting an item, deleting a category (naming how many items become uncategorised), removing a participant (naming how many claims are removed), removing your own claim, and deleting the event
- Each confirmation states the consequence in plain language, not "Are you sure?"
- The destructive button is visually distinct and is not the default focus target
- Deleting the event requires typing the event name to confirm — it destroys everyone's data, not just the organiser's

---

### Task 7.5 — Category and item presentation

- Category icons chosen from a fixed MUI icon set at category creation, with a sensible default
- Category ordering respected from `sort_order`, with organiser reordering via simple move-up/move-down controls. **Not** drag and drop — that is a Phase 8-optional stretch item, and reorder controls are keyboard-accessible by construction.
- Item rows show assignment detail (`Aaron ×2 · James ×2`) legibly at phone width, collapsing to a count with an expander when more than three participants are assigned
- Consistent, non-colour-dependent state treatment for open, partially covered, covered and completed items

---

### Task 7.6 — Accessibility pass

🔒 Accessibility is not a security control, but it is a correctness requirement and it is graded here.

- Every interactive element is reachable and operable by keyboard, in a sensible tab order
- Visible focus indicators throughout — do not remove outlines without replacing them
- Dialogs trap focus, close on Escape, and return focus to the trigger on close
- All form fields have associated labels. Icon-only buttons have accessible names.
- Coverage state is conveyed by text or icon, not colour alone
- Live regions announce claim results and snackbar content to screen readers
- Colour contrast meets WCAG AA (4.5:1 for body text) throughout, including the theme's secondary text
- Headings form a logical hierarchy; the item list is marked up as a list
- `lang` set on the document, page title updates per route

---

### Task 7.7 — Mobile E2E and visual verification

- Extend the Playwright mobile project to run the full MVP flow at 390×844
- Add an E2E assertion that no horizontal scrollbar exists on the event page at mobile width
- Run an automated accessibility check (`@axe-core/playwright`) over the landing page, event page and manage page, and fix every serious or critical violation
- Manually test on a real phone if one is available — emulation misses touch target and scroll behaviour problems

---

## 🔒 Security Tasks for This Phase

- [ ] Snackbars and error states expose only a generic message and the `requestId` — no server error text, stack trace or SQL
- [ ] Long or hostile user-supplied strings (very long names, RTL overrides, zero-width characters) cannot break layout or spoof UI elements — truncate and render as text
- [ ] The delete-event confirmation cannot be triggered without the admin token, and the server check still holds
- [ ] No new dependency added in this phase introduces a high/critical advisory (`npm audit` after installs)
- [ ] Accessibility changes did not introduce `dangerouslySetInnerHTML` or an `aria-label` containing unescaped user text used unsafely

---

## Test Flags

> All tests written in this phase must comply with **`TESTING_STANDARDS.md`**. Check Section 11 (Definition of Done) before marking this phase complete.

### Automated
- [ ] `npm run test` — component tests for empty states, confirmations and snackbars pass
- [ ] `npm run test:e2e` — mobile project passes the full MVP flow
- [ ] The axe accessibility check reports zero serious or critical violations on all three main routes
- [ ] The no-horizontal-scroll assertion passes at 320px and 390px
- [ ] `npm run test:coverage`, `npm run type-check`, `npm run lint` — all green

### Manual Verification
- [ ] Complete the whole claim flow using only the keyboard, from landing page to covered item
- [ ] Navigate the event page with a screen reader and confirm coverage state and claim results are announced
- [ ] An item named with 200 characters, and a participant named with emoji and RTL text, both render without breaking the row
- [ ] Every dialog closes on Escape and returns focus correctly
- [ ] Deleting a category clearly states how many items will become uncategorised before confirming

### Security Verification
- [ ] Trigger an API error and confirm the snackbar shows a generic message plus `requestId` only
- [ ] `npm audit --audit-level=high` reports nothing after this phase's installs

---

## Done When...

- [ ] All tasks above are checked off in TRACKER.md
- [ ] All automated test flags pass
- [ ] All manual verification steps confirmed
- [ ] All security tasks confirmed
- [ ] `TESTING_STANDARDS.md` Section 11 checklist satisfied for all tests written this phase
- [ ] Code committed with message: `feat(web): complete phase 7 - responsive polish and accessibility`
- [ ] TRACKER.md updated with all task statuses

---

## Notes for Agent

- Accessibility is cheaper here than it will ever be again, and most of it falls out of using MUI components as intended rather than styling `div`s into buttons. If you find a styled `div` acting as a control, replace it.
- Dark mode, event cover colours and drag-and-drop reordering are **not** in this phase. If everything else is done and there is appetite, they are optional Phase 8 stretch items.
- Do not chase pixel-perfection at the cost of the phase's real goal, which is a list a stranger can use on a phone without instructions.
- If a polish change makes a test fail, the test is usually right. Check before updating it.

---

*Next phase: [Phase 8 — Hardening, Deployment and Handoff](./PHASE_08_deploy.md)*
