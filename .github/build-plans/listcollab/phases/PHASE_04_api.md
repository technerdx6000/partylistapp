# Phase 4 — Event-Centred API

> **Phase goal**: A token-scoped, fully validated REST API over the new schema, with `required_items` removed as a concept, every route proven against IDOR, and the whole surface exercised by integration tests.

---

## Session Start

Before doing anything in this phase — at the start of every session, and after any context reset:

- [ ] Read `../TRACKER.md` and identify the next incomplete task in this phase
- [ ] Read `../CONVENTIONS.md` if you have not read it this session — §3, §6.2, §6.3 and §6.4 govern almost every task here
- [ ] Read `../TESTING_STANDARDS.md` if you will write or change any test this session
- [ ] Confirm the Prerequisites below still hold

Do not resume from memory. You do not retain this plan between sessions.

---

## Prerequisites

- [ ] Phase 3 complete, all its test flags passed
- [ ] The new tables exist and the legacy party is imported as an event
- [ ] Integration tests can run against the disposable test database

---

## Context

This is the security-critical phase. ListCollab has no login, so **the event token is the entire authorisation model** — the checks built here are doing the job that authentication does in an app that has it. An IDOR bug in this phase is not a data-quality issue, it is the whole security posture failing.

Two rules run through every task. First, the event is resolved from the `X-Event-Token` header and nothing else; ids in a path are never trusted to belong to the caller's event. Second, an invalid token and a missing event return the identical `404` — any difference between them is an enumeration oracle.

The API contract lives in `packages/shared` as Zod schemas. The frontend will import the same schemas in Phase 5. That is what makes a repeat of the `person_id` mismatch structurally impossible rather than merely unlikely.

---

## Tasks

### Task 4.1 — Validated configuration and fail-fast startup

🔒

- `apps/api/src/config/env.ts` — a Zod schema over every required environment variable: `NODE_ENV`, `PORT`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `CORS_ORIGIN`, `LOG_LEVEL`
- Parse at startup, before the server listens. On failure, log which variables are missing or malformed (names only, never values) and `process.exit(1)`.
- Export a typed, frozen config object. Nothing else in the codebase may read `process.env` directly — enforce with an ESLint `no-restricted-properties` rule.

---

### Task 4.2 — Connection pool and repository layer

- `apps/api/src/db/pool.ts` — a `mysql2/promise` pool sized for the container, with a `withTransaction(fn)` helper that acquires a connection, begins, commits or rolls back, and always releases
- `apps/api/src/repositories/` — one repository per aggregate: `eventRepository`, `participantRepository`, `categoryRepository`, `itemRepository`, `assignmentRepository`
- All SQL lives here and nowhere else. Every query is parameterised.
- Repositories map `snake_case` rows to `camelCase` domain objects. Row types and domain types are distinct (CONVENTIONS.md §1).
- Every repository read that takes an id also takes an `eventId` and filters on it. Make it impossible to fetch a row by id alone — that shape is what IDOR bugs grow from.

---

### Task 4.3 — Shared API contract schemas

In `packages/shared/src/schemas/`:

- `event.ts`, `participant.ts`, `category.ts`, `item.ts`, `assignment.ts`
- Request schemas are `.strict()` — unknown fields are rejected, not ignored
- Length caps per CONVENTIONS.md §6.2. Quantities: integer, min 1, max 999.
- Response schemas for every endpoint, including the aggregate event payload
- Export inferred types via `z.infer`. No hand-written mirrors.
- Export a `ApiErrorSchema` matching `{ error: { code, message, requestId } }`

---

### Task 4.4 — Token generation and scoping middleware

🔒 The most important task in the phase.

- `apps/api/src/services/tokenService.ts` — `generateShareToken()` (nanoid, 10 chars, URL-safe alphabet) and `generateAdminToken()` (32 bytes hex via `crypto.randomBytes`). Constant-time comparison via `crypto.timingSafeEqual` on equal-length buffers, with a length check first that does not short-circuit into a timing difference on the compare path.
- `requireEventToken` middleware: reads `X-Event-Token`, looks up the event by share token **or** admin token, attaches `req.event = { id, isAdmin }`. Missing header → `401 INVALID_TOKEN`. Unknown token → `404 EVENT_NOT_FOUND`. Never reveal which.
- `requireAdminToken` middleware: runs after the above, rejects with `403 ADMIN_REQUIRED` when `req.event.isAdmin` is false
- Default posture is admin-required. A route is public only where this phase explicitly says so.
- Extend the Express `Request` type in a declaration file — do not cast `req as any`

---

### Task 4.5 — Error model and middleware

- `AppError` class with `statusCode`, machine-readable `code`, and an optional safe `details` object
- `asyncHandler` wrapper so every rejected promise reaches the error middleware
- Error middleware returns `{ error: { code, message, requestId } }`. In production the message is generic for anything 500-level; validation errors may name the offending field but never echo the body.
- `requestLogger` middleware assigning a `requestId` (nanoid) and logging method, path, status, duration
- 🔒 Configure pino `redact` for `req.headers['x-event-token']` and `req.headers.cookie`. Add a test asserting a token value never appears in captured log output.

---

### Task 4.6 — Event routes

```
POST   /api/events                      public, rate-limited
GET    /api/events/:shareToken          public by token, rate-limited
PATCH  /api/events/:shareToken          admin
DELETE /api/events/:shareToken          admin
```

- `POST /api/events` creates the event, generates both tokens, creates the initial categories supplied in the body, and returns both tokens **once** in the response. This is the only response that ever contains the admin token.
- `GET /api/events/:shareToken` returns the aggregate payload: `{ event, participants, categories, items }`, where each item carries its assignments and a computed `coverage` from `calculateCoverage` in `@listcollab/shared`. One request renders the page.
- The response must **never** include `admin_token`. Assert this in a test — it is the single most likely accidental leak in the app.
- `DELETE` cascades per Phase 3 and returns `204`

---

### Task 4.7 — Participant and category routes

```
GET    /api/participants                token
POST   /api/participants                token      — this is "identify yourself", so it is not admin-gated
PATCH  /api/participants/:id            admin
DELETE /api/participants/:id            admin

GET    /api/categories                  token
POST   /api/categories                  admin
PATCH  /api/categories/:id              admin
DELETE /api/categories/:id              admin
```

- The event comes from `req.event`, never from the path or body
- `POST /api/participants` is deliberately open to anyone with the share link — a guest adding their own name is the entry point to the whole collaborative flow. Rate-limit it and cap the number of participants per event at 200 to prevent a link-holder filling the table.
- Adding a participant with a name already used in that event returns the existing participant rather than erroring — the unique constraint is a data rule, not a user-facing failure

---

### Task 4.8 — Item routes

```
GET    /api/items                       token
POST   /api/items                       token      — guests may add contributions (Key Decision 4)
PATCH  /api/items/:id                   mixed      — see below
DELETE /api/items/:id                   admin
```

- `POST /api/items` accepts `quantityRequired: null` for an ad-hoc contribution. A guest-created item records `created_by`.
- `PATCH /api/items/:id`: changing `quantityRequired`, `categoryId`, or `status` requires admin. A guest may edit the name or description **only** of an item they created. Implement this as an explicit permission check in the service, with a test per branch.
- Every handler verifies the item belongs to `req.event.id` before doing anything, returning `404 ITEM_NOT_IN_EVENT` otherwise
- `status` is never modified as a side effect of an assignment change. Assert this in a test.

---

### Task 4.9 — Assignment routes (claim and unclaim)

🔒 The concurrency-sensitive surface.

```
POST   /api/items/:itemId/assignments   token
PATCH  /api/assignments/:id             token, own assignment only
DELETE /api/assignments/:id             token, own assignment only
```

- Claiming runs inside a transaction: `SELECT ... FOR UPDATE` on the item row, sum existing assignments, reject with `409 OVER_CLAIM` if the new total would exceed `quantity_required`, then insert or update the assignment. The read and the write must be in the same transaction — checking outside it is the classic race and two people claiming the last carton simultaneously will find it.
- Items with `quantityRequired: null` accept any number of assignments — there is nothing to exceed
- Claiming again as the same participant updates the existing row (per the unique constraint), it does not create a second
- `PATCH` and `DELETE` verify the assignment belongs to an item in `req.event.id` **and** that the requesting `participantId` owns it, unless the caller is admin
- Unclaiming to zero deletes the row rather than storing a zero quantity

---

### Task 4.10 — Hardening, cutover and cleanup

🔒

- `helmet` with a CSP appropriate for the API (it serves JSON, so a restrictive policy)
- `cors` configured from `CORS_ORIGIN`, no wildcard
- `express-rate-limit`: a general limiter on all routes, and a tighter one on `POST /api/events`, `GET /api/events/:shareToken` and `POST /api/participants` (30/minute/IP)
- `express.json({ limit: '100kb' })`
- `trust proxy` set so rate limiting and `X-Forwarded-Proto` work behind the reverse proxy
- Delete the old routes, the old controllers, and the `required_items` concept entirely
- Add a migration `005_drop_legacy_tables` dropping the superseded tables, only after confirming nothing reads them
- The health endpoint from Phase 1 stays, unauthenticated and information-free

---

## 🔒 Security Tasks for This Phase

- [ ] Environment validated at startup, process exits on failure, no value logged
- [ ] Tokens generated with `crypto.randomBytes`/`nanoid` and compared with `timingSafeEqual`
- [ ] Every route resolves its event from `X-Event-Token`; no route trusts a path id for scoping
- [ ] Every mutating handler verifies row ownership against `req.event.id` before writing
- [ ] Admin-only operations gated by `requireAdminToken`, with a test per operation
- [ ] Invalid token and unknown event are indistinguishable in status, body and timing
- [ ] `admin_token` never appears in any response except the creation response
- [ ] Rate limiting active on all token-resolving and creation endpoints
- [ ] `helmet`, explicit CORS, and a 100kb body limit in place
- [ ] Pino redaction verified by test — no token in any log line
- [ ] Production error responses carry no stack trace, SQL, or table name

---

## Test Flags

> All tests written in this phase must comply with **`TESTING_STANDARDS.md`**. Check Section 11 (Definition of Done) before marking this phase complete.

### Automated
- [ ] `npm run test` — full integration suite passes against the test database
- [ ] Every item in the TEST_PLAN.md "Token Authorisation" checklist has a passing test
- [ ] Every item in the TEST_PLAN.md "Input Validation" checklist has a passing test, including the `person_id` extra-field rejection
- [ ] The concurrency test passes: two parallel claims for the last unit produce exactly one success and one `OVER_CLAIM`
- [ ] `npm run test:coverage` — 90% branch coverage on services and controllers, 95% on the token middleware and claim service
- [ ] `npm run type-check` and `npm run lint` — zero errors

### Manual Verification
- [ ] `POST /api/events` returns a share token and an admin token, and `GET` with the share token renders the full aggregate payload
- [ ] A claim with the share token succeeds; a delete-item with the share token returns `403`
- [ ] Using event A's token against event B's item id returns `404 ITEM_NOT_IN_EVENT`
- [ ] Stopping the database produces a `503` on `/api/health` and a generic `500` elsewhere, with no SQL text in the body

### Security Verification
- [ ] Grep the codebase: `process.env` appears only in `config/env.ts`
- [ ] Grep the codebase: no string-interpolated SQL — every query uses placeholders
- [ ] Captured log output across a full integration run contains no token value
- [ ] The aggregate event response, inspected by eye, contains no `adminToken` field

---

## Done When...

- [ ] All tasks above are checked off in TRACKER.md
- [ ] All automated test flags pass
- [ ] All manual verification steps confirmed
- [ ] All security tasks confirmed
- [ ] `TESTING_STANDARDS.md` Section 11 checklist satisfied for all tests written this phase
- [ ] Code committed with message: `feat(api): complete phase 4 - event-centred api with token scoping`
- [ ] TRACKER.md updated with all task statuses

---

## Notes for Agent

- The frontend is still the old `App.tsx` during this phase and will break as the old routes disappear. That is expected. Do not attempt to keep it working — Phase 5 rebuilds it. Note the breakage in TRACKER.md so it is not mistaken for a regression.
- If you find yourself writing a repository method that fetches by id without an event id, stop. That signature is the bug.
- The over-claim check is the one piece of business logic in this app that genuinely deserves a transaction. Do not simplify it to a read-then-write outside one because the tests happen to pass sequentially.
- `SELECT ... FOR UPDATE` requires InnoDB. Confirm the table engine before relying on row locking.

---

*Next phase: [Phase 5 — Frontend Restructure](./PHASE_05_frontend.md)*
