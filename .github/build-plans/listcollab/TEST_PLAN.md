# Test Plan — ListCollab

> This is the central test strategy document. Per-phase test flags live in each phase file.
> GitHub Copilot: read this before writing any tests. All tests must conform to this strategy.
>
> **Standing rule**: All test authoring is additionally governed by `TESTING_STANDARDS.md`, alongside this file in the build plan directory. That file defines required test cases, structure, mocking rules, determinism requirements, anti-patterns, and the definition of done for every testing task. This document defines *what* to test at the project level; `TESTING_STANDARDS.md` defines *how* to write the tests.

---

## Testing Philosophy

- Tests are written alongside the code they test, not after the fact
- Each phase must pass its own test flags before moving to the next phase
- Security-related paths always have test coverage — in this app that means token scoping, IDOR, and admin gating
- Tests run in CI on every pull request — failing tests block merge
- **Concurrency is a first-class test concern.** This is a shared list that several people hit at once from their phones. Two simultaneous claims against the last remaining unit must not both succeed.

---

## Test Stack

| Layer | Tool | Purpose |
|-------|------|---------|
| Unit | Vitest | Pure functions, services, coverage calculation, token utilities |
| Integration | Supertest + Vitest | API endpoints against a real MariaDB test database |
| Component | React Testing Library + Vitest + jsdom | UI component behaviour |
| E2E | Playwright | Critical user flows end-to-end, including mobile viewport |
| Security | `npm audit`, targeted Supertest suites | Dependency scan, IDOR and enumeration checks |

Integration tests run against a disposable MariaDB container (`docker compose -f docker-compose.test.yml up -d`), migrated from empty on each run. No mocking of the database in integration tests — the old code's failures were in the SQL and the contract, exactly where mocks hide problems.

---

## Coverage Targets

> Minimum branch coverage targets — sourced from `TESTING_STANDARDS.md`. Coverage is measured per changed file after each task, not just at the end of a phase.

| Layer | Minimum Branch Coverage |
|-------|------------------------|
| Backend services | 90% |
| Backend controllers | 90% |
| Frontend components | 80% |
| Critical paths (token authorisation, event scoping, claim writes) | 95% |

Coverage is a floor, not a goal. The goal is confidence the code handles real conditions including those it wasn't written for.

---

## Critical Paths — Must Have E2E Coverage

- [ ] **Create an event** — organiser fills the create form, gets an event page and a share link, and the admin link works on reload
- [ ] **Open a share link cold** — a visitor with no localStorage lands on `/e/:shareToken` and sees the event, categories, items and coverage
- [ ] **Identify yourself** — visitor picks or adds their name, identity persists across a page reload
- [ ] **Claim part of an item** — visitor claims 2 of 4, coverage updates to `2 / 4`, their name appears against the item
- [ ] **Claim the remainder** — a second participant claims the last 2, item flips to covered
- [ ] **Unclaim** — a participant removes their own claim and coverage decreases
- [ ] **Over-claim rejection** — claiming more than remaining is rejected with a visible error and no partial write
- [ ] **Add an unrequested contribution** — participant adds an item with no `quantityRequired` and it appears for everyone
- [ ] **Admin-only structural edit** — deleting an item succeeds with the admin token and is not offered (and is rejected server-side) without it
- [ ] **Error recovery** — with the API stopped, the event page shows an error state and a retry, not a blank screen or an infinite spinner
- [ ] **Mobile viewport** — the full claim flow completes at 390×844 without horizontal scrolling

---

## Security Test Checklist

These must be tested before any production deployment.

### Token Authorisation

- [ ] Requests with no `X-Event-Token` header to a scoped route return 401
- [ ] Requests with a malformed or unknown token return 404 `EVENT_NOT_FOUND` — never 401 vs 404 distinguishable by token validity
- [ ] A valid share token cannot perform an admin operation (delete item, edit event, delete participant) — returns 403 `ADMIN_REQUIRED`
- [ ] **IDOR:** a valid token for event A cannot read, update or delete an item, category, participant or assignment belonging to event B — returns 404 `ITEM_NOT_IN_EVENT`, tested per resource type
- [ ] A participant cannot modify or delete another participant's assignment
- [ ] Token comparison is constant-time (unit test asserts `timingSafeEqual` is used and rejects unequal-length input safely)
- [ ] Generated tokens are unique across 10,000 generations and drawn from `crypto.randomBytes`

### Input Validation

- [ ] Malformed request bodies return 400 with `VALIDATION_FAILED`
- [ ] Unexpected extra fields are rejected (`.strict()` schemas) — specifically, sending `person_id` to the item update route fails loudly rather than being silently ignored
- [ ] Oversized payloads (>100kb) are rejected
- [ ] Strings exceeding the documented length caps are rejected
- [ ] Quantity of `0`, `-1`, `1.5`, `NaN` and `999999` are all rejected
- [ ] SQL injection strings in item names, notes and participant names are stored and returned as literal text and do not alter query behaviour
- [ ] XSS payloads (`<img src=x onerror=...>`, `<script>`) in item names and notes render as visible text in the DOM, not as elements — asserted in a component test

### Concurrency

- [ ] Two simultaneous claims for the last remaining unit: exactly one succeeds, one returns `OVER_CLAIM`, and the total claimed never exceeds `quantityRequired`
- [ ] Deleting an item while another request claims it does not leave an orphan assignment

### Rate Limiting

- [ ] Rate limiting triggers on rapid repeated requests to `GET /api/events/:shareToken`
- [ ] Rate limit headers are present in responses
- [ ] A rate-limited response body contains no information about whether the token was valid

### Secrets and Data

- [ ] No token value appears in any log line (assert against a captured pino stream)
- [ ] Error responses in production mode contain no stack trace, SQL text, or table names
- [ ] `.env` and `.env.production` are ignored by git and absent from the working tree
- [ ] Startup fails fast with a clear message when a required env var is missing
- [ ] Deleting an event leaves no orphaned participants, items or assignments

---

## Test File Conventions

- Test files live alongside the code they test: `claimService.test.ts` next to `claimService.ts`
- E2E tests live in `/e2e` at the repo root
- Test files export nothing — they are self-contained
- Use `describe` blocks that mirror the module structure
- Each `it` or `test` description must describe observable behaviour: `'rejects a claim exceeding the remaining quantity'` not `'claim test'`
- No `fit`, `fdescribe`, `xit`, or `.only` in committed code
- Integration tests create their own event fixture and clean up after themselves. No test may depend on data left by another test.

---

## Running Tests

```bash
# Unit + integration tests (all workspaces via turbo)
npm run test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# E2E tests (requires the dev stack running)
npm run test:e2e

# Spin up the disposable test database
docker compose -f docker-compose.test.yml up -d
```

---

## CI Test Gates

All of the following must pass before a PR can be merged:

- [ ] `npm run lint` — zero errors
- [ ] `npm run type-check` — zero TypeScript errors
- [ ] `npm run test` — all tests pass
- [ ] `npm run test:coverage` — coverage targets met
- [ ] `npm run test:e2e` — critical paths pass
- [ ] `npm audit` — zero high/critical vulnerabilities
