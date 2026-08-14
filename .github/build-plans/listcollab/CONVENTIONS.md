# CONVENTIONS

> This file is the authoritative source of coding standards for ListCollab.
> Read it before writing any code. Re-read relevant sections when starting each phase.
> GitHub Copilot: apply these conventions to every suggestion and every file you create or modify.

---

## 1. TypeScript

### Configuration

Base configs live in `packages/tsconfig/` (`base.json`, `react.json`, `node.json`). Every workspace extends one of them and adds nothing that weakens it.

- `strict: true` is non-negotiable. No overrides.
- `noImplicitAny: true`
- `strictNullChecks: true`
- `noUncheckedIndexedAccess: true`
- `exactOptionalPropertyTypes: true`
- Target: `ES2022` minimum
- Module: `NodeNext` for `apps/api`, `ESNext` + `bundler` resolution for `apps/web`
- `packages/shared` compiles to both — it must not import anything Node-specific or DOM-specific

### Rules

- Prefer `type` aliases over `interface` unless declaration merging is required
- Never use `any`. Use `unknown` and narrow it, or define a proper type.
- Never use `// @ts-ignore`. Fix the type error.
- Enums: use string union types instead of regular enums. `ItemStatus` is `'open' | 'covered' | 'completed'`.
- All function parameters and return types must be explicitly typed (no implicit inference for public APIs)
- Use `readonly` for data that should not be mutated
- Prefer `satisfies` over type casting (`as`) where possible
- **Domain types are inferred from Zod schemas, never hand-written.** `export type EventItem = z.infer<typeof EventItemSchema>` in `packages/shared`. If you find yourself writing a `type` that mirrors a schema, you are creating the next `person_id` bug.
- Database row shapes (`snake_case`, from `mysql2`) are distinct types from API/domain shapes (`camelCase`). Mapping between them happens in the repository layer and nowhere else.

---

## 2. React

### Patterns

- Functional components only. No class components.
- One component per file. Filename matches component name (PascalCase).
- Co-locate component styles, tests, and types with the component file
- Use named exports for components (not default exports), except for page-level route components
- `React.FC` is discouraged — type props directly: `function ItemRow({ item }: ItemRowProps)`
- Components under `src/features/{feature}/` own their own dialogs and forms. Nothing shared moves to a `components/common/` folder until it is used by three features.
- No component may exceed ~200 lines. The old `App.jsx` was 900 lines and that is the failure this rebuild exists to correct.

### Hooks

- Custom hooks live in `apps/web/src/hooks/` and are prefixed with `use`
- No business logic in components — extract to custom hooks or the API service layer
- `useEffect` must have a dependency array. No empty arrays unless intentional (document why with a comment).
- Prefer `useMemo` and `useCallback` only where profiling shows it matters — don't pre-optimise
- Coverage maths (`claimed` vs `required`, `status`) is computed once in a shared helper in `packages/shared`, imported by both the API and `useEvent`. Never recomputed inline in a component.

### State Management

- **Server state: TanStack Query only.** One query key per event: `['event', shareToken]`. Mutations invalidate that key. No manual `useState` mirrors of API data — that duplication is what made the old app's derived state unreliable.
- **Client state: local `useState`, plus one small context for the current participant identity.** No Redux, no Zustand.
- Identity persists in `localStorage` under `listcollab:identity:{shareToken}` and holds only `{ participantId, displayName }`.
- Server state and client state must be managed separately. Never copy query data into component state.

### Anti-Patterns — Never Do These

- No prop drilling more than 2 levels deep — use context or lift the query
- No inline styles except for truly dynamic values — use the MUI `sx` prop or theme overrides
- No `dangerouslySetInnerHTML` anywhere in this app. Item names, notes and participant names are attacker-controlled text and must render as text.
- No direct DOM manipulation — use refs only when no React alternative exists
- No optimistic update without a rollback path. Claiming is a shared write; a failed claim must visibly revert.

---

## 3. Node.js / Backend

### Patterns

- Async/await everywhere. No raw Promise chains or callbacks.
- All async route handlers are wrapped by an `asyncHandler` helper so rejections reach the error middleware
- Never swallow errors silently — log and re-throw, or handle explicitly
- Controllers are thin — business logic belongs in the service layer
- Database access only through the repository layer, never directly in controllers or services' SQL strings
- **Every SQL query uses parameterised placeholders.** Never build SQL with template literals containing user input.
- Multi-statement writes (creating an event with its categories, claiming against a quantity) run inside a transaction obtained from the pool. Coverage checks and the write that depends on them must be in the same transaction.

### Structure

```
apps/api/src/
├── controllers/    # Request handling only, no business logic
├── services/       # Business logic (coverage rules, claim validation, token issuing)
├── repositories/   # Data access layer — the only place SQL lives
├── middleware/     # eventToken, errorHandler, requestLogger, rateLimit
├── models/         # Row types and mappers (snake_case → camelCase)
├── utils/          # Pure utility functions
├── db/             # pool.ts, migrator.ts
└── config/         # env.ts — Zod-validated environment
```

### Error Handling

- Define a central `AppError` class with `statusCode` and machine-readable `code`
- All thrown errors must be instances of `AppError` or wrapped by error middleware
- Never return raw database errors or stack traces to the client
- Always return structured error responses: `{ error: { code, message } }`
- Standard codes for this app: `EVENT_NOT_FOUND`, `INVALID_TOKEN`, `ADMIN_REQUIRED`, `VALIDATION_FAILED`, `ITEM_NOT_IN_EVENT`, `OVER_CLAIM`, `RATE_LIMITED`, `INTERNAL_ERROR`
- **An invalid token and a non-existent event both return `404` with `EVENT_NOT_FOUND`.** Never distinguish them — the difference is an enumeration oracle.

---

## 4. File and Folder Naming

| Type | Convention | Example |
|------|-----------|---------|
| React components | PascalCase | `ClaimItemDialog.tsx` |
| Hooks | camelCase, use prefix | `useEventIdentity.ts` |
| Utilities | camelCase | `calculateCoverage.ts` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_ITEM_NAME_LENGTH` |
| API routes | kebab-case | `/api/events/:shareToken/items` |
| DB tables/columns | snake_case | `item_assignments`, `quantity_required` |
| Migration files | `NNN_snake_case.sql` | `003_item_assignments.sql` |
| Environment variables | SCREAMING_SNAKE_CASE | `DB_NAME` |
| Test files | Same name + `.test.ts` | `claimService.test.ts` |
| E2E specs | kebab-case + `.spec.ts` | `claim-flow.spec.ts` |

---

## 5. Import Ordering

Use the following order, separated by blank lines:

```typescript
// 1. Node built-ins
import { randomBytes } from 'node:crypto';

// 2. External packages
import express from 'express';
import { z } from 'zod';

// 3. Internal packages / monorepo packages
import { ClaimRequestSchema } from '@listcollab/shared';

// 4. Absolute internal imports
import { itemRepository } from 'src/repositories/itemRepository';

// 5. Relative imports
import { calculateCoverage } from '../utils/calculateCoverage';
import type { ItemRow } from './types';
```

Enforce with `eslint-plugin-import` (`import/order`) configured in the shared ESLint config. Cross-app imports are forbidden: `apps/web` must never import from `apps/api` or vice versa. Both may import `@listcollab/shared`.

---

## 6. 🔒 Security Requirements

> **Security is non-negotiable.** Every item in this section must be implemented.
> GitHub Copilot: flag any code you generate that could violate these requirements with a `// SECURITY REVIEW NEEDED` comment.

### 6.1 Environment and Secrets

- **Never hardcode secrets, credentials, API keys, or tokens** in source code
- All secrets must be read from environment variables via a validated config module (`apps/api/src/config/env.ts`)
- Use Zod to validate all required env vars at startup — fail fast and exit non-zero if any are missing or malformed
- `.env` and `.env.production` must be in `.gitignore`. A `.env.example` with placeholder values must be committed.
- The repository currently has `.env` files tracked in both the root and API directories. Removing them from the working tree is not enough — they remain in git history. Rotate the database password as part of Phase 1 and treat every value that was ever committed as compromised.
- `DB_NAME` comes from the environment only. No SQL script may contain a hardcoded `USE atlasdb;`.

### 6.2 Input Validation

- **All input from external sources must be validated.** HTTP bodies, query params, route params, and headers.
- Use Zod schemas from `@listcollab/shared` for all validation — validate at the API boundary before any processing
- Validate on both client and server independently — client validation is UX, server validation is security
- Reject requests with unexpected fields — use `.strict()` on every request body schema
- Maximum length limits on every string input. Defaults: event name 120, description 2000, location 200, participant name 60, item name 120, note 500.
- Quantities are integers, minimum 1, maximum 999. Reject `0`, negatives, floats, and `NaN`.
- No file uploads exist in this app. If a phase seems to require one, stop and raise a blocker — it is out of scope.

### 6.3 Authentication and Authorisation

There is no login. Capability tokens are the authorisation model, so these rules carry the weight auth normally would.

- Token handling is implemented in **Phase 4** and must not be deferred past it. No route that reads or writes event data ships without it.
- Tokens are generated with `crypto.randomBytes` — never `Math.random`, never a timestamp, never an incrementing id. Share token: 10 characters from a URL-safe alphabet via `nanoid` (≥60 bits). Admin token: 32 bytes hex.
- Tokens are compared with `crypto.timingSafeEqual` on equal-length buffers, never `===`.
- **Every route is scoped to an event.** `requireEventToken` middleware resolves the token from the `X-Event-Token` header, loads the event, and attaches `req.event`. A route without it is a bug.
- **Every write verifies row ownership** before mutating: the item, category, participant or assignment must belong to `req.event.id`. Never trust that an id in a path belongs to the caller's event. This is the IDOR check and it is the single most important rule in this file.
- Admin-only operations (event edit, delete item/category/participant, change `quantity_required`, edit another participant's claim) additionally require `requireAdminToken`. Authorisation is opt-in to public, not opt-out: the default for any new route is admin-required until the phase file says otherwise.
- Participants may only modify their own assignments, identified by the `participantId` in the request body matched against the assignment row.
- Never expose internal auto-increment ids in shareable URLs. Public routes key on `share_token`.

### 6.4 API Security

- Rate limiting via `express-rate-limit` on all endpoints. Tighter bucket on token resolution (`GET /api/events/:shareToken`) and on event creation: no more than 30 requests per minute per IP, and log-and-drop beyond that.
- CORS configured explicitly from `CORS_ORIGIN` — no wildcard `*` in production
- HTTP security headers via `helmet` on all responses, including a Content-Security-Policy
- HTTPS enforced in production at the reverse proxy — the API sets `trust proxy` and honours `X-Forwarded-Proto`
- SQL injection prevention: parameterised queries only — never concatenate user input into SQL
- Request size limits: `express.json({ limit: '100kb' })`. There is no legitimate 1MB request in this app.
- Log every token-resolution failure with the IP and the path, but never the token value itself

### 6.5 Frontend Security

- Validate API responses with the shared Zod schemas before use — a bad response should surface as an error state, not a crash or a silently wrong screen
- `dangerouslySetInnerHTML` is banned outright. All user-supplied text renders as React text nodes.
- CSP configured and tested. No `unsafe-inline` script sources; MUI's emotion styles require `style-src 'unsafe-inline'` and that is the only exception permitted.
- `localStorage` holds only the participant id and display name for the current event. Never the admin token, and never anything a shoulder-surfer shouldn't see.
- The admin token lives in the URL fragment (`#k=...`) so it is never transmitted in a page request or leaked via `Referer`. Strip it from `window.location` after reading it into memory.
- Do not log tokens, full participant lists, or API payloads to the console — including in development, since those habits ship

### 6.6 Dependency Security

- Run `npm audit` before every release. Zero high/critical vulnerabilities before shipping.
- Pin dependency versions in `package.json` — no `^` or `~` for production dependencies
- Enable Dependabot for automated vulnerability alerts
- Avoid dependencies with no active maintenance or known vulnerabilities

### 6.7 Data Protection

- **PII in this app:** participant display names, event names, event location, event date, and free-text notes. That combination is sensitive: a location plus a date plus a guest list reveals when a house is unoccupied.
- Data minimisation is the control. Do not add fields for email, phone number, address, or payment details. If a phase appears to need one, raise a blocker.
- No password storage exists in this app, so no hashing requirement applies. If one is ever introduced, `bcrypt` at cost 12 minimum.
- Encryption at rest is provided by the ZFS dataset on the host, not the application layer. Document this in the handoff rather than implementing column encryption.
- Retention: add a documented manual process for deleting events after the event date passes. Do not build automated deletion in v1.
- Deleting an event must cascade to its participants, categories, items and assignments — no orphan rows holding names indefinitely.

### 6.8 Error Handling and Information Disclosure

- Never return stack traces, internal paths, database errors, or query details to the client
- Error responses must be generic in production: `{ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } }`
- Detailed errors only when `NODE_ENV !== 'production'`
- Validation errors may name the offending field but must never echo the whole request body back
- Logging captures full error details server-side without exposing them to the client

---

## 7. Logging

- Use `pino` — no raw `console.log` in committed code
- Log levels: `error`, `warn`, `info`, `debug`
- Every HTTP request logged with: method, path, status code, duration, request id
- Assign a unique `requestId` to every incoming request and propagate it through logs and into error responses so a user-reported failure can be traced
- **Never log:** the `X-Event-Token` header value, admin tokens, share tokens, database credentials, or full participant lists. Configure pino `redact` for `req.headers['x-event-token']` and `req.headers.cookie`.
- Log event references by internal id, not by token
- Sanitise log output before writing — redact sensitive fields automatically rather than relying on call sites to remember

---

## 8. Git Conventions

### Commit Messages

Follow Conventional Commits format:

```
<type>(<scope>): <short description>

[optional body]

[optional footer]
```

Types: `feat`, `fix`, `chore`, `docs`, `style`, `refactor`, `test`, `perf`, `ci`, `security`

Scopes for this project: `web`, `api`, `shared`, `db`, `docker`, `e2e`, `repo`

Examples:
- `feat(api): add claim endpoint with over-claim rejection`
- `fix(web): revert optimistic claim when the mutation fails`
- `security(repo): remove tracked .env files and rotate DB password`

### Branch Naming

- `feat/{description}` — new features
- `fix/{description}` — bug fixes
- `chore/{description}` — maintenance
- `security/{description}` — security fixes (never delay these)

All work happens off the existing `listcollab` branch, which is the integration branch for this rebuild. `main` holds the old PartyList until Phase 8.

### Rules

- No direct commits to `main`
- Phase branches merge into `listcollab` only when the phase's test flags pass
- PRs require passing tests and linting before merge
- Squash merge to keep history clean

---

## 9. Package-First Policy

> Before writing any custom logic, check whether a well-maintained NPM package already solves the problem.

### Rule

**Always prefer an existing, well-maintained NPM package over custom implementation** for any non-trivial logic. This includes date manipulation, validation, HTTP clients, encryption, id generation, string parsing, data transformation, and retry logic.

### Decision Criteria — use a package when:

- The problem domain is solved and stable (date formatting, schema validation, id generation)
- The custom implementation would exceed ~20 lines of logic
- The functionality has security implications (cryptography, token generation, input sanitisation) — always use a package or a Node built-in here
- The package has >1M weekly downloads, active maintenance, and no high/critical vulnerabilities

### Decision Criteria — write custom logic when:

- The requirement is so specific that no package comes close (the coverage calculation is a legitimate example)
- The only available packages are unmaintained or have known vulnerabilities
- The package would add significant bundle weight for trivial functionality
- The logic is simple, pure, and has no security surface

### Process

1. Search npmjs.com before writing custom logic
2. Check weekly downloads, last publish date, open issues, known CVEs (`npm audit`)
3. If a suitable package exists — use it
4. Document the choice in a comment if the package selection is non-obvious

### Preferred Packages (project defaults — do not swap without a documented reason)

| Purpose | Package |
|---------|---------|
| Schema validation | `zod` |
| Date handling | `date-fns` |
| HTTP client (frontend) | native `fetch` wrapped in `apps/web/src/services/apiClient.ts` |
| Server state / caching | `@tanstack/react-query` |
| Token / id generation | `node:crypto` + `nanoid` |
| Database driver | `mysql2` (promise API) |
| Migration runner | `umzug` with a SQL-file storage adapter |
| Logging | `pino` + `pino-http` |
| Rate limiting | `express-rate-limit` |
| Security headers | `helmet` |
| UI components | `@mui/material` + `@mui/icons-material` |
| Unit / integration tests | `vitest` |
| API integration tests | `supertest` |
| Component tests | `@testing-library/react` + `@testing-library/user-event` |
| E2E tests | `@playwright/test` |
| Monorepo orchestration | `turbo` |

HTML sanitisation libraries are deliberately absent: this app renders all user text as React text nodes and never as HTML, which is a stronger control than sanitising. If you believe you need `dompurify`, you have introduced `dangerouslySetInnerHTML` somewhere — remove it instead.

---

## 10. Code Commenting

> All functions, methods, hooks, and components must be documented using JSDoc.
> GitHub Copilot: generate JSDoc comments for every function you write. Do not leave undocumented functions.

### Standard — JSDoc for All Functions

Every exported function and any non-trivial internal function must have a JSDoc block covering:

```typescript
/**
 * Brief one-line description of what the function does.
 *
 * Longer description if needed — explain the why, not just the what.
 * Include any important behaviour, edge cases, or side effects.
 *
 * @param {Type} paramName - Description of the parameter and its purpose.
 * @param {Type} [optionalParam] - Optional params are wrapped in square brackets.
 * @returns {Type} Description of the return value.
 * @throws {ErrorType} When and why this function throws.
 *
 * @example
 * const coverage = calculateCoverage({ quantityRequired: 4, assignments: [{ quantity: 2 }] });
 * // coverage => { claimed: 2, required: 4, status: 'open' }
 */
export function calculateCoverage(input: CoverageInput): Coverage {
```

### React Components

```typescript
/**
 * Renders a single list item with its coverage state and claim action.
 *
 * Fetches no data — all data is passed via props. Mutations are raised
 * through callbacks so the parent owns the query invalidation.
 *
 * @param {ItemRowProps} props
 * @param {EventItem} props.item - The item and its current assignments.
 * @param {boolean} props.canManage - True when the viewer holds the admin token.
 * @param {(itemId: number) => void} [props.onClaim] - Opens the claim dialog.
 *   If omitted, the claim button is not rendered.
 */
export function ItemRow({ item, canManage, onClaim }: ItemRowProps) {
```

### Custom Hooks

```typescript
/**
 * Resolves the current participant identity for an event.
 *
 * Reads from localStorage under `listcollab:identity:{shareToken}` and
 * falls back to null when the visitor has not identified themselves yet.
 *
 * @param {string} shareToken - The event's share token from the route.
 * @returns {UseIdentityReturn}
 * @returns {Identity | null} returns.identity - Current identity, or null.
 * @returns {(identity: Identity) => void} returns.setIdentity - Persists identity.
 * @returns {() => void} returns.clearIdentity - Forgets the identity on this device.
 */
export function useEventIdentity(shareToken: string): UseIdentityReturn {
```

### Rules

- **No undocumented exported functions.** Add JSDoc before finalising any file.
- Types in JSDoc must match the TypeScript types exactly — do not contradict the signature
- `@example` is required for any utility function that could be used in multiple contexts
- `@throws` is required whenever a function can throw — list every thrown type
- Do not write comments that restate the code. Comments explain intent and non-obvious behaviour.
- Inline comments (`//`) explain *why*, not *what*
- Every SQL query in a repository gets a one-line comment stating which index it relies on

---

## 11. GitHub Copilot Agent Instructions

> These instructions apply specifically to GitHub Copilot operating in agent mode in VS Code on this project.
> Copilot reads `.github/copilot-instructions.md` and `.github/instructions/*.instructions.md` automatically at
> request time, which route to this project's plan. This section covers code-level conventions the agent must follow.
> Note: custom instructions apply to chat and agent mode only — they do not affect inline (ghost text) completions.

- **Always read the phase file for the current phase before writing code.** Phase files contain specific tasks, constraints, and test flags that govern what you should build.
- **Re-read the active phase file and TRACKER.md at the start of every session**, and after any context reset or summarisation. You do not retain the plan between sessions. If unsure whether you have read a file this session, read it again.
- **Check TRACKER.md** at the start of each session and update it as you complete tasks.
- **Follow CONVENTIONS.md strictly.** If you generate code that violates any convention, flag it with a `// CONVENTION VIOLATION: <reason>` comment so it can be corrected.
- **Security first.** Before completing any phase, verify all 🔒 tasks are implemented. Do not mark a phase complete with security tasks outstanding.
- **Test as you go.** Run per-phase test flags before declaring a phase done. Execute the test suite after each meaningful change.
- **Ask before deviating.** If a phase instruction is ambiguous or seems wrong, surface the question rather than making an autonomous decision that might invalidate subsequent phases.
- **This is a brownfield repo.** Before rewriting an existing file, read it. Where the plan and the existing code disagree about current behaviour, the code is the truth — report the discrepancy rather than assuming the plan is describing what is there.
- **Package-first.** Check for an existing NPM package before writing custom logic (§9). If you choose custom, add `// CUSTOM: <reason>`.
- **Comment every function** with JSDoc (§10) before marking a task complete.
- **Do not install dependencies without checking** whether a more appropriate package is already in `package.json` or the preferred packages table.
- **Install workspace dependencies into the correct workspace**, not the root: `npm install <pkg> --workspace=apps/api`. Only tooling shared by every workspace belongs at the root.
- **Commit frequently** with descriptive conventional commit messages.
- **Run the full test suite** before completing each task, not just the tests you wrote.
- **Keep TRACKER.md current.** It is the only continuity mechanism between sessions.

### Standing rule on testing

All test authoring must comply with `TESTING_STANDARDS.md`. That file is the single source of truth for test quality, coverage requirements, structure, and the definition of done for any testing task.
