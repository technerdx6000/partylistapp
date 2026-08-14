# Phase 6 — Collaborative UX

> **Phase goal**: The MVP is functionally complete — an organiser shares one link, guests identify themselves, claim part or all of what is needed, add contributions nobody requested, and everyone sees what is covered.

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

- [ ] Phase 5 complete, all its test flags passed
- [ ] The event page renders items, categories and coverage from the API
- [ ] Claim and assignment endpoints exist and are covered by integration tests

---

## Context

Everything before this phase was scaffolding for one interaction: **"I'll bring this."** The old app made the organiser assign everything, which meant the organiser did all the work and the list was only ever as current as their last manual edit. Here, the people bringing things maintain the list themselves.

The permission model is settled (README Key Decision 4): anyone with the share link can identify themselves, claim, unclaim, adjust their own claim, and add items. Structural editing — event details, deleting or renaming anything, changing what is required, touching someone else's claim — requires the admin token. The server already enforces this; this phase makes the UI reflect it rather than offering actions that will be rejected.

Identity is deliberately weak. A name in `localStorage` is not authentication and is not meant to be. Anyone with the link could claim as anyone else, and for a group of friends organising a barbecue that is an acceptable trade for zero friction. Do not add passwords, PINs or email verification to close a gap that the threat model does not contain.

---

## Tasks

### Task 6.1 — Identity

- `hooks/useEventIdentity.ts` — reads and writes `listcollab:identity:{shareToken}` in `localStorage`, holding only `{ participantId, displayName }`
- `features/participants/IdentifyDialog.tsx` — "Who are you?" with a picker of existing participants plus a free-text field to add a new name
- Adding a name calls `POST /api/participants`; an existing name returns the existing participant rather than erroring
- Triggered on the first action that needs an identity, not on page load — a visitor should be able to read the list without being challenged
- A "not you?" control clears the stored identity, for shared devices
- 🔒 Identity storage is per-event and holds no token

---

### Task 6.2 — Claim

- `features/items/ClaimItemDialog.tsx` — identity (pre-filled if known), quantity defaulting to the remaining amount, and an optional note (`I'll grab these Saturday morning`)
- Quantity is capped in the UI at the remaining amount, and the server rejection is still handled — client validation is UX, server validation is the control
- Optimistic update through TanStack Query with a rollback on failure, then invalidate `['event', shareToken]`
- A rejected claim (`OVER_CLAIM`, someone else got there first) shows a clear message and the refreshed real state, not a silent revert
- Items with no `quantityRequired` accept a claim of any quantity

---

### Task 6.3 — Unclaim and adjust

- A participant can change their own claim quantity or remove it entirely from the item row
- Reducing to zero deletes the assignment
- Only the current identity's own claim exposes these controls; another participant's claim is display-only unless the viewer holds the admin token
- Removing a claim is a destructive action on shared data — confirm before acting (the confirmation pattern is built properly in Phase 7; a basic confirm is fine here)

---

### Task 6.4 — Add a contribution

- `features/items/ItemForm.tsx` used in two modes: organiser adding a requirement (with `quantityRequired`), and guest adding a contribution (`quantityRequired: null`, auto-claimed by the adder)
- Guests choose a category or leave it uncategorised
- A guest-added contribution appears for everyone on next refetch and shows who added it
- The add control lives inside each category section as well as at the list level, so adding to a specific category is one tap

---

### Task 6.5 — Coverage indicators

- Per-item: `2 / 4 covered` plus a progress indication, and an unambiguous covered state
- Per-category: covered count against total
- Per-event: the header summary from Phase 5, now live
- Ad-hoc contributions are excluded from coverage denominators — they are extras, not requirements. Assert this in a test; getting it wrong makes the headline number meaningless.
- Colour is never the only signal of state. A covered item is marked with an icon and text as well.

---

### Task 6.6 — Organiser mode

🔒

- The manage route enables structural controls: edit event details, add/edit/delete categories, edit any item, change `quantityRequired`, delete items, remove participants, and adjust anyone's claim
- Without the admin token these controls are **not rendered** — not rendered-and-disabled, which advertises what is there
- Hiding a control is presentation, not security. The server check from Phase 4 is the control; confirm it is still enforced by attempting an admin action with a share token during verification.
- An "organiser view" indicator makes it obvious which mode the page is in
- Event settings include a visible warning before deleting the event, stating that it removes everything for everyone

---

### Task 6.7 — Share flow

- A share control on the event page producing the URL `/e/:shareToken`, with copy-to-clipboard and the Web Share API where available
- The manage page shows both links clearly labelled, with the admin link explained as "keep this one, it's your organiser access"
- 🔒 The share control must never expose the admin link. Copying from the guest view yields the share URL only — write a test for this.
- The landing page lists events this browser has visited so the organiser can find their way back

---

## 🔒 Security Tasks for This Phase

- [ ] Identity in `localStorage` contains no token and is scoped per event
- [ ] Admin-only controls are absent, not merely disabled, without the admin token
- [ ] Server-side rejection verified by hand: an admin action attempted with a share token returns `403` even when the UI is bypassed
- [ ] The share control never emits the admin URL, verified by test
- [ ] A participant cannot modify another participant's claim through the UI, and the server rejects it if they try
- [ ] No token appears in a clipboard payload except the intended one for the link being copied

---

## Test Flags

> All tests written in this phase must comply with **`TESTING_STANDARDS.md`**. Check Section 11 (Definition of Done) before marking this phase complete.

### Automated
- [ ] `npm run test` — component tests for identity, claim, unclaim and add-item flows pass
- [ ] Coverage denominator test passes: ad-hoc contributions do not affect the covered ratio
- [ ] Optimistic-update rollback test passes: a failed claim restores the prior state and surfaces an error
- [ ] `npm run test:e2e` — the full MVP path passes **on the mobile project** and then on desktop: create → share link → identify → claim part → second participant claims remainder → item covered → add own contribution
- [ ] E2E assertion: the claim dialog is fully visible and submittable at 390×844 with the on-screen keyboard occupying the lower half of the viewport
- [ ] E2E over-claim path passes: claiming more than remaining is rejected visibly with no partial write
- [ ] `npm run test:coverage`, `npm run type-check`, `npm run lint` — all green

### Manual Verification
- [ ] Open the share link in a private window with no `localStorage`: the list is readable without identifying, and the first claim prompts for identity
- [ ] Two browsers claiming the same item both end up showing the same correct totals after refetch
- [ ] The manage view shows structural controls; the guest view does not show them at all
- [ ] Deleting the event from the manage view warns clearly before proceeding
- [ ] A guest-added contribution appears in the other browser after a refetch
- [ ] The whole claim flow completes on a real phone, one-handed, from a link opened cold in a messaging app's in-app browser
- [ ] The share control produces a link that opens correctly when tapped from a messaging app, not just when pasted into a desktop browser

### Security Verification
- [ ] With devtools, call an admin endpoint using the share token — server returns `403 ADMIN_REQUIRED`
- [ ] `localStorage` inspected in both views — no admin token anywhere
- [ ] Copying the share link from the guest view yields a `/e/:shareToken` URL with no fragment

---

## Done When...

- [ ] All tasks above are checked off in TRACKER.md
- [ ] All automated test flags pass
- [ ] All manual verification steps confirmed
- [ ] All security tasks confirmed
- [ ] `TESTING_STANDARDS.md` Section 11 checklist satisfied for all tests written this phase
- [ ] Code committed with message: `feat(web): complete phase 6 - collaborative claim and share flow`
- [ ] TRACKER.md updated with all task statuses

---

## Notes for Agent

- **The MVP is complete at the end of this phase.** The definition to test against: create a BBQ, send friends one URL, they add themselves, see what is needed, claim two cartons of drinks or one bag of ice, add something nobody requested, and everyone can immediately see what is covered and what is missing. If that sentence is not true end to end, the phase is not done regardless of the task checkboxes.
- Real-time sync is deliberately absent. Refetch-on-focus plus a manual refresh is the v1 answer. If two people editing simultaneously turns out to be a genuine problem in real use, that is evidence for adding polling later — not a reason to add WebSockets now.
- The weak identity model is a decision, not an oversight. If it feels wrong while building, raise it as a blocker rather than quietly adding a PIN field.
- Notes on claims are free text from an untrusted source rendered on a shared page. They go through the same text-node rendering as everything else.

---

*Next phase: [Phase 7 — Responsive Polish and Accessibility](./PHASE_07_polish.md)*
