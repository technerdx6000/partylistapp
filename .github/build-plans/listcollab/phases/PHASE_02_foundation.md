# Phase 2 — Turborepo, TypeScript and Test Infrastructure

> **Phase goal**: The repo is a Turborepo monorepo with strict TypeScript across both apps and a shared package, every test runner is installed and executing at least one real test, and the app still behaves exactly as it did at the end of Phase 1.

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

- [ ] Phase 1 complete, all its test flags passed
- [ ] `docker compose up --build` produces a working app from a clean clone
- [ ] No `.env*` files tracked in git

---

## Context

This phase is plumbing. The product does not change and no domain modelling happens here — the schema rewrite is Phase 3. The point is to arrive at a state where TypeScript can actually enforce something in later phases and where every test written from Phase 3 onward has a runner waiting for it.

The one substantive decision baked in here: `packages/shared` holds Zod schemas, and domain types are inferred from them with `z.infer`. This is the mechanism that prevents a repeat of the Phase 1 Task 1.6 contract mismatch. Nothing hand-writes a type that mirrors a schema.

Turborepo is heavier than this app strictly needs. It was chosen deliberately for task caching and parallel dev. Keep the config minimal — a `turbo.json` with `dev`, `build`, `test`, `lint`, `type-check` pipelines and correct `dependsOn` for the shared package. Do not add remote caching, generators, or additional packages.

---

## Tasks

### Task 2.1 — Convert the repo to npm workspaces + Turborepo

- Root `package.json`: `"private": true`, `"workspaces": ["apps/*", "packages/*"]`, Node engine `>=22`
- Install `turbo` as a root dev dependency (pinned)
- Create `turbo.json` with pipelines: `build` (dependsOn `^build`), `dev` (persistent, no cache), `test`, `test:coverage`, `lint`, `type-check` (dependsOn `^build`)
- Root scripts: `dev`, `build`, `test`, `test:watch`, `test:coverage`, `test:e2e`, `lint`, `type-check`, `db:migrate`, `db:rollback` — every one of these is referenced by a phase test flag, so all must be real and runnable
- Single lockfile at the root. Delete any nested `package-lock.json`.

---

### Task 2.2 — Relocate the apps

- `git mv` the existing frontend directory to `apps/web` and the API directory to `apps/api` — use `git mv` so history follows the files
- Update `docker-compose.yml` build contexts, volume mounts and Dockerfile paths to the new locations
- Update any relative path in scripts, Dockerfiles or `.dockerignore`
- Verify `docker compose up --build` still works before moving on. If it does not, fix it here — a broken container at this point compounds through every later phase.

---

### Task 2.3 — Shared TypeScript configuration

Create `packages/tsconfig` exporting three configs:

- `base.json` — `strict`, `noImplicitAny`, `strictNullChecks`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, target `ES2022`, `skipLibCheck: true`
- `node.json` — extends base, module `NodeNext`, for `apps/api`
- `react.json` — extends base, module `ESNext`, `moduleResolution: bundler`, `jsx: react-jsx`, for `apps/web`

Every workspace extends one of these and may not weaken any flag. See CONVENTIONS.md §1.

---

### Task 2.4 — Create `packages/shared`

- Package name `@listcollab/shared`, TypeScript, depends on `zod`
- Structure: `src/schemas/` (Zod schemas), `src/types.ts` (re-exports `z.infer` types), `src/coverage.ts` (the coverage calculation), `src/index.ts`
- For now, populate it only with what the current app needs so it is genuinely wired up and compiled — the event-centred schemas arrive in Phase 4
- Implement `calculateCoverage` now, with unit tests, since both the API and the web app will import it: given `quantityRequired: number | null` and a list of assignment quantities, return `{ required, claimed, remaining, status }` where `status` is `'open' | 'covered' | 'completed'` and a `null` requirement is never `'covered'` by arithmetic
- Add it as a dependency of both apps and confirm both compile against it

---

### Task 2.5 — Convert the API to TypeScript

- Add `typescript`, `tsx` (dev runner), `@types/node`, `@types/express` to `apps/api`
- Rename `.js` → `.ts` incrementally and fix the resulting type errors properly. No `any`, no `@ts-ignore`, no `// eslint-disable` to get green.
- `server.js` → `server.ts`
- Build with `tsc` to `dist/`, run dev with `tsx watch`
- Update the API Dockerfile to build TypeScript and run the compiled output in production, while dev uses the watch runner
- The app must behave identically afterwards. Do not restructure into controllers/services here — Phase 4 does that against the new domain.

---

### Task 2.6 — Convert the web app to TypeScript

- Add `typescript`, `@types/react`, `@types/react-dom` to `apps/web`
- `vite.config.js` → `vite.config.ts`, `main.jsx` → `main.tsx`, `api.js` → `api.ts`
- Rename `App.jsx` → `App.tsx` and do the **minimum** typing needed to compile. Do not restructure it, do not extract components, do not fix its architecture — Phase 5 deletes it.
- Where the old code passes untyped API data around, type it as `unknown` and narrow at the point of use rather than reaching for `any`

---

### Task 2.7 — ESLint and Prettier

- Flat config (`eslint.config.js`) at the root covering all workspaces
- `typescript-eslint` recommended-type-checked, `eslint-plugin-react-hooks`, `eslint-plugin-import` with the `import/order` rule matching CONVENTIONS.md §5
- Custom rule or `no-restricted-imports` entry forbidding imports between `apps/web` and `apps/api`
- `no-console` as an error in `apps/api` (pino is the logger) and a warning in `apps/web`
- Prettier for formatting, with ESLint deferring to it
- `npm run lint` must exit zero across the repo before this task is done

---

### Task 2.8 — Test infrastructure

Install and configure every runner now, each with at least one real passing test so a broken configuration surfaces here rather than three phases later.

- **Vitest** at the root with a workspace config covering both apps and `packages/shared`; coverage via `@vitest/coverage-v8` with the thresholds from TEST_PLAN.md
- **Supertest** in `apps/api` — write one integration test hitting `/api/health` and asserting the `503` path with the database unreachable
- **React Testing Library** + `jsdom` + `@testing-library/user-event` in `apps/web` — write one component test against any existing component
- **Playwright** in `/e2e` at the repo root, configured with a desktop project and a mobile project (`Pixel 5` device descriptor) — write one smoke spec that loads the app and asserts the page renders
- **`docker-compose.test.yml`** providing a disposable MariaDB on a separate port and volume for integration tests
- The `calculateCoverage` unit tests from Task 2.4 count toward this task

---

### Task 2.9 — Verify the whole toolchain

- `npm install` from a clean clone (delete `node_modules` and reinstall) succeeds
- `npm run dev` starts web and API together via turbo
- `npm run build`, `npm run test`, `npm run lint`, `npm run type-check` all pass
- `docker compose up --build` still produces the working app
- Update `DEVELOPMENT.md` with the new commands and the monorepo layout

---

## 🔒 Security Tasks for This Phase

- [ ] `.gitignore` covers `node_modules`, `dist`, `coverage`, `.turbo`, `playwright-report`, and all `.env*` except `.env.example`
- [ ] `npm audit` run and recorded; zero high/critical vulnerabilities carried forward from the new dev dependencies
- [ ] Dependency versions pinned for production dependencies (no `^`/`~`), per CONVENTIONS.md §6.6
- [ ] No secret, token or connection string added to any config file, Dockerfile, or `turbo.json` during the move
- [ ] Test database credentials in `docker-compose.test.yml` are obviously non-production values and the file contains no reference to real credentials

---

## Test Flags

> All tests written in this phase must comply with **`TESTING_STANDARDS.md`**. Check Section 11 (Definition of Done) before marking this phase complete.

### Automated
- [ ] `npm run type-check` — zero TypeScript errors across all workspaces
- [ ] `npm run lint` — zero errors
- [ ] `npm run test` — all tests pass, including the `calculateCoverage` unit tests
- [ ] `npm run test:coverage` — coverage reporting produces output for all three workspaces
- [ ] `npm run test:e2e` — the Playwright smoke spec passes on both desktop and mobile projects
- [ ] `npm run build` — both apps build

### Manual Verification
- [ ] A clean clone + `npm install` + `npm run dev` gets a working app with no undocumented steps
- [ ] `docker compose up --build` works from the relocated paths
- [ ] Editing a file in `packages/shared` is picked up by both apps without a manual rebuild in dev
- [ ] Git history is preserved for the moved files (`git log --follow` on a relocated file shows prior commits)

### Security Verification
- [ ] `git ls-files` shows no `.env` files, no `dist`, no `node_modules`
- [ ] `npm audit --audit-level=high` reports nothing

---

## Done When...

- [ ] All tasks above are checked off in TRACKER.md
- [ ] All automated test flags pass
- [ ] All manual verification steps confirmed
- [ ] All security tasks confirmed
- [ ] `TESTING_STANDARDS.md` Section 11 checklist satisfied for all tests written this phase
- [ ] Code committed with message: `chore(repo): complete phase 2 - turborepo, typescript and test infrastructure`
- [ ] TRACKER.md updated with all task statuses

---

## Notes for Agent

- The temptation in this phase is to "improve while you're in there". Don't. A restructure mixed into a TypeScript conversion produces a diff nobody can review, and Phase 5 discards most of the frontend anyway.
- If a `.ts` conversion surfaces a real bug (a genuine null case the old JS was tolerating), fix it and note it in TRACKER.md. That is the conversion paying for itself.
- If Turborepo's caching starts producing confusing results during development, `npx turbo run <task> --force` bypasses the cache. If caching causes more trouble than it saves, raise it as a blocker rather than silently removing it.
- `exactOptionalPropertyTypes` is the flag most likely to generate friction with third-party types. Fix your own code; do not disable the flag.

---

*Next phase: [Phase 3 — Domain Model and Migrations](./PHASE_03_domain_model.md)*
