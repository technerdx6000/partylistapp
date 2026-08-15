# Execution Tracker — ListCollab

> Updated by the AI coding agent as tasks are completed.
> Status key: `⬜ Not Started` | `🔄 In Progress` | `✅ Complete` | `⛔ Blocked`
>
> This file is the only thing that survives between sessions. Update it when a task starts, completes or blocks — not at the end of a session, and not as a batch.

## Phase Summary

| Phase | Name | Status | Completion |
|-------|------|--------|-----------|
| 1 | Stabilise the existing repo | ✅ Complete | 7 / 7 |
| 2 | Turborepo, TypeScript and test infrastructure | ✅ Complete | 9 / 9 |
| 3 | Domain model and migrations | ✅ Complete | 7 / 7 |
| 4 | Event-centred API | 🔄 In Progress | 0 / 10 |
| 5 | Frontend restructure | ⬜ Not Started | 0 / 8 |
| 6 | Collaborative UX | ⬜ Not Started | 0 / 7 |
| 7 | Responsive polish and accessibility | ⬜ Not Started | 0 / 7 |
| 8 | Hardening, deployment and handoff | ⬜ Not Started | 0 / 9 |

---

## Detailed Task Tracker

| Phase | # | Task | Status | Notes |
|-------|---|------|--------|-------|
| 1 – Stabilise | 1.1 | Establish a baseline of the current repo and defects | ✅ Complete | Verified on 2026-08-14. Repo layout: root Vite frontend in `src/`, Express API in `api/`, SQL init scripts `api/setup-atlasdb.sql` and `api/add-required-items.sql`, root `docker-compose.yml` and `docker-compose.dev.yml`. `src/App.jsx` is 892 lines; `api/server.js` is 63 lines. Current API routes in `api/server.js`: `/api/people`, `/api/items`, `/api/categories`, `/api/required-items`, duplicate `/api/health` handlers, and `*` 404. All listed Phase 1 defects are present: tracked `.env` files at root and `api/`; SQL scripts hardcode `USE atlasdb;`; duplicate health route exists; `src/App.jsx` loads mock required-items data; `src/services/api.js` sends `person_id` for required-item assignment while `api/routes/items.js` update ignores unknown fields and only updates `name` and `category_id`. Prerequisites: Docker/Compose and Node 22 are present; workspace initially opened on `main`, so a local `listcollab` branch was created from current HEAD to satisfy the phase prerequisite without moving to stale `origin/listcollab`. Baseline Compose result: `docker compose up --build -d` builds images but does not start the full stack because MariaDB init runs `api/setup-atlasdb.sql`, which fails with `Unknown database 'atlasdb'` while the container created the database from `DB_NAME` (`partylist` in the current local env), leaving only the DB container up. |
| 1 – Stabilise | 1.2 | 🔒 Remove tracked `.env` files, add `.env.example`, rotate DB password | ✅ Complete | Removed root and API `.env*` files from git tracking, added committed root and API `.env.example` templates, rotated the local MariaDB credentials, and verified `git ls-files` now returns only `.env.example` entries. Mitigation note: old secrets remain in git history; password rotation is the Phase 1 mitigation and the history exposure must be carried into the handoff docs |
| 1 – Stabilise | 1.3 | Fix DB naming inconsistency (`USE atlasdb` vs `DB_NAME`) | ✅ Complete | Removed hardcoded `USE atlasdb;` from SQL init scripts, set the canonical default DB name to `listcollab` in `.env.example` and Compose, aligned local env files to `listcollab`, and verified on a clean volume reset that MariaDB initializes successfully and creates `categories`, `people`, `items`, and `required_items` in the `listcollab` database selected by `DB_NAME` |
| 1 – Stabilise | 1.4 | Remove duplicate `/api/health`, add DB connectivity check | ✅ Complete | Removed the duplicate `/api/health` route, implemented a single DB-backed health check using `SELECT 1`, and verified through the nginx entrypoint that it returns `200 {"status":"ok","db":true}` with MariaDB up and `503 {"status":"degraded","db":false}` with MariaDB stopped |
| 1 – Stabilise | 1.5 | Remove mock required-items data, wire the real API | ✅ Complete | Removed the hard-coded required-items array from `src/App.jsx`, wired startup loading to `requiredItemsAPI.getAll()`, and verified the live stack now returns required-items data through `/api/required-items` after fixing the nginx API proxy |
| 1 – Stabilise | 1.6 | Fix the item update contract mismatch (`person_id`) | ✅ Complete | Frontend no longer sends `person_id` on item updates, `PUT /api/items/:id` now rejects unexpected fields with `400`, and manual validation against the running stack confirmed a valid update still returns `200` while a payload containing `person_id` returns `400`. Formal integration test is pending Phase 2 because the repo does not yet have a configured test runner |
| 1 – Stabilise | 1.7 | Reproducible Docker dev environment + `DEVELOPMENT.md` | ✅ Complete | Fixed Compose startup blockers (DB init scripts, nginx `/api` proxying, container healthchecks), aligned scripts/docs to `.env.example` and `docker compose`, added `DEVELOPMENT.md`, and validated a clean-volume `docker compose up --build -d` with working `http://localhost/health`, `http://localhost/api/health`, and live `/api/required-items` data. The frontend container is reachable immediately after startup; Docker still shows `health: starting` until its first scheduled probe runs |
| 2 – Foundation | 2.1 | npm workspaces + Turborepo pipelines and root scripts | ✅ Complete | Root `package.json` now declares npm workspaces and Turbo, all required root scripts are real and runnable, `npm install` produces a single root lockfile, and the root `npm run dev` wrapper starts the database plus the web and API workspaces together |
| 2 – Foundation | 2.2 | Relocate apps to `apps/web` and `apps/api` with `git mv` | ✅ Complete | Moved the API to `apps/api` and the frontend sources/build files to `apps/web` with `git mv`, updated Dockerfiles and Compose paths for the monorepo layout, and verified `docker compose up --build -d` still builds and starts the relocated stack |
| 2 – Foundation | 2.3 | `packages/tsconfig` — base, node, react configs | ✅ Complete | Added `@listcollab/tsconfig` with strict base, node, and react configs, plus starter workspace `tsconfig.json` files for `apps/api` and `apps/web`; validated all new config files parse as JSON |
| 2 – Foundation | 2.4 | Create `packages/shared` with Zod + `calculateCoverage` | ✅ Complete | `packages/shared` now exposes current Zod schemas, inferred types, and `calculateCoverage`; both `apps/api` and `apps/web` depend on it and compile against it, and the shared coverage helper has a passing Vitest suite |
| 2 – Foundation | 2.5 | Convert the API to TypeScript (no restructuring) | ✅ Complete | `apps/api` now builds from `server.ts`, `config/database.ts`, and typed route modules with `tsc`, dev uses `tsx watch`, Docker runs compiled output from `dist/`, and the containerized app still serves `/api/health` and `/api/required-items` |
| 2 – Foundation | 2.6 | Convert the web app to TypeScript (minimum typing only) | ✅ Complete | Renamed `vite.config.ts`, `src/main.tsx`, `src/services/api.ts`, and `src/App.tsx`; wired shared-schema response validation into the web API client; added minimum explicit typing in `App.tsx`; verified `npm run --workspace @listcollab/web type-check`, `npm run --workspace @listcollab/web build`, and the Dockerized app still serves the frontend and proxied API health endpoints |
| 2 – Foundation | 2.7 | ESLint flat config + Prettier across all workspaces | ✅ Complete | Added a monorepo-aware flat ESLint config with typed TypeScript support, import ordering, cross-app import restrictions, and Prettier deferral; added workspace lint scripts and root tooling deps; `npm run lint` now exits zero across `@listcollab/api`, `@listcollab/shared`, and `@listcollab/web` |
| 2 – Foundation | 2.8 | Vitest, Supertest, RTL, Playwright, test DB compose file | ✅ Complete | Added root Vitest, Playwright, and disposable `docker-compose.test.yml` scaffolding plus one real passing test for shared coverage logic, API `/api/health` 503 behavior, web loading render, and desktop/mobile Playwright smoke coverage |
| 2 – Foundation | 2.9 | Verify the whole toolchain | ✅ Complete | Verified in the current workspace and in a fresh clone at `/tmp/partylistapp-phase2-check`: `npm install`, `npm run dev`, `npm run build`, `npm run test`, `npm run test:coverage`, `npm run lint`, `npm run type-check`, `npm run test:e2e`, and `docker compose up --build -d` all succeed; `git log --follow` on `apps/web/src/App.tsx` preserves history; `npm audit --audit-level=high` is clean with only a remaining moderate Turbo advisory |
| 3 – Domain Model | 3.1 | Migration runner (umzug) + `db:migrate` / `db:rollback` | ✅ Complete | Replaced the temporary schema scripts with an `umzug` runner under `apps/api/src/db`, added paired SQL migration support with required `.down.sql` files, seeded `001_initial_schema` automatically when legacy tables exist without migration history, and validated migrate/rollback against the disposable test DB |
| 3 – Domain Model | 3.2 | Migration 001 — baseline the current schema | ✅ Complete | Added `001_initial_schema.up.sql` / `.down.sql`, validated them against the test DB, seeded them automatically as already applied on a legacy schema, switched Docker/local bootstrap to numbered migrations, and removed the old ad-hoc SQL bootstrap files |
| 3 – Domain Model | 3.3 | Migration 002 — events, participants, categories | ✅ Complete | Added coexistence-safe `events`, `event_participants`, and `event_categories` tables so the legacy tables remain available to the old app during Phase 3 |
| 3 – Domain Model | 3.4 | Migration 003 — items and item_assignments | ✅ Complete | Added `event_items` and `event_item_assignments` with the planned indexes, unique assignment constraint, nullable category/creator FKs, and quantity check constraint |
| 3 – Domain Model | 3.5 | Migration 004 — migrate the legacy party into one event | ✅ Complete | Added the legacy import migration using token placeholders generated by the Node runner, mapped legacy people/categories/items/required items into the event-prefixed tables, and verified idempotent import plus empty-dataset no-op behavior in migration tests |
| 3 – Domain Model | 3.6 | 🔒 Constraints, indexes, cascade delete verification | ✅ Complete | Added database tests that verify foreign-key delete rules, utf8mb4/utf8mb4_unicode_ci text columns, duplicate-assignment rejection, quantity checks, and required non-null columns |
| 3 – Domain Model | 3.7 | Migration tests (up, down, idempotency, cascades) | ✅ Complete | Added `apps/api/src/db/migrator.test.ts` covering migrate-to-latest, rollback/reapply, legacy import idempotency, empty legacy no-op, cascade deletes, duplicate assignment rejection, quantity constraints, and schema verification on the disposable MariaDB test database |
| 4 – API | 4.1 | 🔒 Zod-validated env config with fail-fast startup | 🔄 In Progress | Replacing direct `process.env` access with a typed Zod-validated config module and fail-fast startup path |
| 4 – API | 4.2 | Connection pool, `withTransaction`, repository layer | ⬜ Not Started | No fetch-by-id without an event id |
| 4 – API | 4.3 | Shared API contract schemas in `packages/shared` | ⬜ Not Started | `.strict()` on every request body |
| 4 – API | 4.4 | 🔒 Token generation + `requireEventToken` / `requireAdminToken` | ⬜ Not Started | Most important task in the phase |
| 4 – API | 4.5 | Error model, `asyncHandler`, request logging with redaction | ⬜ Not Started | |
| 4 – API | 4.6 | Event routes incl. aggregate GET | ⬜ Not Started | Admin token must never appear outside the create response |
| 4 – API | 4.7 | Participant and category routes | ⬜ Not Started | POST participants is intentionally not admin-gated |
| 4 – API | 4.8 | Item routes with mixed permission rules | ⬜ Not Started | |
| 4 – API | 4.9 | 🔒 Assignment routes — claim/unclaim with transactional over-claim check | ⬜ Not Started | Requires `SELECT ... FOR UPDATE` |
| 4 – API | 4.10 | 🔒 helmet, CORS, rate limits, body cap, drop legacy tables | ⬜ Not Started | Migration 005 only after nothing reads them |
| 5 – Frontend | 5.1 | Router + admin token via URL fragment | ⬜ Not Started | Strip fragment after read |
| 5 – Frontend | 5.2 | API client with `X-Event-Token` and response validation | ⬜ Not Started | |
| 5 – Frontend | 5.3 | TanStack Query provider + `useEvent` | ⬜ Not Started | One query key, no state mirrors |
| 5 – Frontend | 5.4 | MUI theme, mobile-first | ⬜ Not Started | Base layout is the phone layout; desktop is the adaptation |
| 5 – Frontend | 5.5 | EventPage shell + EventHeader with coverage summary | ⬜ Not Started | |
| 5 – Frontend | 5.6 | CategorySection, ItemList, ItemRow + XSS render test | ⬜ Not Started | |
| 5 – Frontend | 5.7 | CreateEventPage + EventForm with starter categories | ⬜ Not Started | |
| 5 – Frontend | 5.8 | Delete the old App and dead code; component tests | ⬜ Not Started | Mobile E2E must pass before the phase closes |
| 6 – Collaboration | 6.1 | Identity hook + IdentifyDialog | ⬜ Not Started | Prompt on first action, not on load |
| 6 – Collaboration | 6.2 | ClaimItemDialog with partial quantities and optimistic update | ⬜ Not Started | Rollback on failure; must be submittable with the on-screen keyboard open |
| 6 – Collaboration | 6.3 | Unclaim and adjust own claim | ⬜ Not Started | |
| 6 – Collaboration | 6.4 | Add a contribution (organiser requirement / guest extra) | ⬜ Not Started | |
| 6 – Collaboration | 6.5 | Coverage indicators at item, category and event level | ⬜ Not Started | Ad-hoc items excluded from denominators |
| 6 – Collaboration | 6.6 | 🔒 Organiser mode — structural controls absent without admin token | ⬜ Not Started | Server check is the control, not the UI |
| 6 – Collaboration | 6.7 | 🔒 Share flow — share URL, copy, admin link never leaked | ⬜ Not Started | MVP is complete when this phase is done |
| 7 – Polish | 7.1 | Responsive layout, touch targets, dialogs as sheets on mobile | ⬜ Not Started | Refinement only — restructuring here means Phase 5 regressed |
| 7 – Polish | 7.2 | Skeletons and empty states | ⬜ Not Started | |
| 7 – Polish | 7.3 | Snackbars replacing persistent error banners | ⬜ Not Started | Include requestId only |
| 7 – Polish | 7.4 | Destructive-action confirmations with stated consequences | ⬜ Not Started | Event delete requires typing the name |
| 7 – Polish | 7.5 | Category icons, ordering controls, assignment display | ⬜ Not Started | Move up/down, not drag and drop |
| 7 – Polish | 7.6 | Accessibility pass — keyboard, focus, labels, contrast, live regions | ⬜ Not Started | |
| 7 – Polish | 7.7 | Mobile E2E + axe accessibility checks | ⬜ Not Started | |
| 8 – Deploy | 8.1 | 🔒 Consolidate the security test suite (`test:security`) | ⬜ Not Started | Full IDOR matrix + enumeration checks |
| 8 – Deploy | 8.2 | 🔒 CSP, HSTS, Referrer-Policy, CORS verified on the build | ⬜ Not Started | |
| 8 – Deploy | 8.3 | 🔒 Dependency audit, pinning, Dependabot, slim prod images | ⬜ Not Started | |
| 8 – Deploy | 8.4 | Production Compose stack with health checks and boot migrations | ⬜ Not Started | Non-root containers, DB not published |
| 8 – Deploy | 8.5 | Backups + an actual restore drill | ⬜ Not Started | An untested backup is a hypothesis |
| 8 – Deploy | 8.6 | Full verification pass against the production build | ⬜ Not Started | |
| 8 – Deploy | 8.7 | README, DEVELOPMENT, OPERATIONS, SECURITY docs | ⬜ Not Started | Include admin-token recovery procedure |
| 8 – Deploy | 8.8 | Deploy to atlas behind TLS and verify the live flow | ⬜ Not Started | |
| 8 – Deploy | 8.9 | Merge to `main`, tag `v1.0.0`, record deferred scope | ⬜ Not Started | |

---

## Blockers Log

| Date | Phase | Task | Blocker Description | Resolution |
|------|-------|------|---------------------|-----------|
| | | | | |

---

## Session Log

| Date | Session Start | Tasks Completed | Notes |
|------|--------------|-----------------|-------|
| | | | |

---

*Last updated: 14 August 2026 (generated)*
