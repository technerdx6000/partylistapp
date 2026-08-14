# Phase 1 — Stabilise the Existing Repo

> **Phase goal**: The current PartyList app runs reliably from a clean checkout, no secrets are tracked in git, and the known defects in the existing code are fixed — before any architecture changes begin.

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

- [ ] The repository is checked out and the `listcollab` branch is the active branch
- [ ] Docker and Docker Compose are available on the machine
- [ ] `node --version` reports 22.x

If any prerequisite is not met, do not proceed. Raise a blocker in TRACKER.md.

---

## Context

This is a brownfield repo. The existing app is a single-purpose party organiser with real defects, and it is easier to fix them now than to carry them into a rewrite and lose track of which breakage is old and which is new. Nothing in this phase changes the product. Do not start restructuring, do not introduce TypeScript, do not touch the data model — those are Phases 2 and 3.

The defects below were identified during a review of the branch. **Verify each one against the actual code before fixing it.** If a described defect is not present, record that in TRACKER.md notes rather than inventing a fix.

---

## Tasks

### Task 1.1 — Establish a baseline

Read the repo and record what is actually there before changing anything.

- Run the app via the existing Docker Compose setup and confirm whether it starts
- List the current top-level structure (frontend directory, API directory, SQL scripts, compose files)
- Note the line count of `App.jsx` and the current API route list from `server.js`
- Write findings into the Notes column of TRACKER.md task 1.1, including any defect from this phase that is **not** present in the code

Do not fix anything in this task. This is the record you will check later rewrites against.

---

### Task 1.2 — Remove tracked secrets and rotate credentials

🔒 **Security note**: `.env` and `.env.production` are currently tracked in both the repository root and the API directory. Assume every value they contain is compromised — they exist in git history even after deletion.

- `git rm --cached` every tracked `.env*` file (keep the local copies on disk so the app still runs)
- Add `.env`, `.env.*`, `!.env.example` to `.gitignore`
- Create `.env.example` at the root and in the API directory containing every required key with placeholder values and a one-line comment each
- Change the MariaDB password to a newly generated value, update the local `.env` files and the running container
- Do **not** attempt a history rewrite (`filter-repo`, BFG) as part of this task. Record in TRACKER.md that history still contains the old values, and that the rotation is the mitigation.

---

### Task 1.3 — Fix the database naming inconsistency

The Compose file creates `${DB_NAME:-partylistdb}` while the SQL scripts execute `USE atlasdb;`. These disagree, which means the schema may be landing somewhere other than where the app connects.

- Determine which database the running app actually uses
- Remove every hardcoded `USE <database>;` statement from the SQL scripts
- Ensure the database name comes from `DB_NAME` in every place it is referenced: Compose, the API connection config, and any script
- Pick one canonical default (`listcollab`) and set it in `.env.example`
- Verify by starting the stack from empty volumes and confirming tables land in the expected database

---

### Task 1.4 — Remove the duplicate health endpoint

`server.js` defines `/api/health` twice. The second definition is unreachable.

- Delete the duplicate and keep a single handler
- The handler must report database connectivity, not just process liveness: run `SELECT 1` and return `503` if it fails
- Response body: `{ status: 'ok' | 'degraded', db: boolean }`. No version strings, no environment details, no error text — this endpoint is unauthenticated.

---

### Task 1.5 — Remove mock required-items data

Required items are currently hard-coded as mock data on load rather than being read from the existing API.

- Delete the mock array
- Wire the existing required-items API endpoint into the load path
- If the endpoint does not work, fix it — do not reinstate the mock
- Confirm an empty database renders an empty state rather than throwing

---

### Task 1.6 — Fix the item update contract mismatch

The frontend sends `person_id` when updating an item, but the backend route only updates `name` and `category_id`. The field is silently dropped.

- Confirm the mismatch in the code
- Fix it so the request and the handler agree: either the backend persists the field or the frontend stops sending it
- Whichever you choose, the route must reject unknown fields rather than ignoring them — a silently discarded field is the defect, not the specific column
- Add an integration test asserting that an unexpected field produces a `400`, not a `200`

Note for context: the assignment model is replaced entirely in Phase 3. This fix exists so the current app is honest, not because the shape survives.

---

### Task 1.7 — Reproducible Docker development environment

- Confirm `docker compose up --build` works from a clean clone plus `.env` copied from `.env.example`
- Fix any container that depends on manual setup steps not captured in the Compose file
- Ensure the database container's data survives a restart and that the schema scripts are idempotent on re-run
- Document the startup sequence in a short `DEVELOPMENT.md` at the repo root: prerequisites, env setup, start command, how to reach the app and the API, how to reset the database

---

## 🔒 Security Tasks for This Phase

- [ ] All `.env*` files untracked, `.gitignore` updated, `.env.example` committed with placeholders only
- [ ] Database password rotated after removing the tracked files
- [ ] No credential, connection string, or password appears anywhere in the working tree
- [ ] The health endpoint discloses no version, path, or error detail
- [ ] The note about git history retaining old secrets is recorded in TRACKER.md so it reaches the handoff docs

---

## Test Flags

> All tests written in this phase must comply with **`TESTING_STANDARDS.md`**. Check Section 11 (Definition of Done) before marking this phase complete.

Formal test infrastructure arrives in Phase 2, so this phase's verification is mostly manual. Write the one integration test named in Task 1.6 using whatever runner the repo has; if it has none, record the test as pending in TRACKER.md and implement it as the first test in Phase 2.

### Automated
- [ ] `docker compose up --build` completes with all containers healthy
- [ ] `git ls-files | grep -E '\.env'` returns only `.env.example` entries

### Manual Verification
- [ ] Fresh clone + `.env` from example + `docker compose up` produces a working app
- [ ] Required items render from the API, and an empty database shows an empty state
- [ ] `GET /api/health` returns `200` with the database up and `503` with the database stopped
- [ ] Tables are created in the database named by `DB_NAME`, not `atlasdb`
- [ ] Updating an item with an unexpected field returns `400`

### Security Verification
- [ ] `.env` files are absent from `git status` and from `git ls-files`
- [ ] The rotated password works and the old one no longer does
- [ ] No secrets appear in container logs on startup

---

## Done When...

- [ ] All tasks above are checked off in TRACKER.md
- [ ] All automated test flags pass
- [ ] All manual verification steps confirmed
- [ ] All security tasks confirmed
- [ ] `TESTING_STANDARDS.md` Section 11 checklist satisfied for all tests written this phase
- [ ] Code committed with message: `fix(repo): complete phase 1 - stabilise existing app`
- [ ] TRACKER.md updated with all task statuses

---

## Notes for Agent

- Resist the urge to improve code you are not asked to touch. `App.jsx` is dismantled in Phase 5; leave it alone here beyond Task 1.5.
- If a defect listed above does not exist in the code, that is a useful finding. Record it and move on. Do not manufacture a fix to close a task.
- If `docker compose up` fails for a reason unrelated to these tasks, treat it as a blocker and raise it — the rest of the plan assumes a working local stack.

---

*Next phase: [Phase 2 — Turborepo, TypeScript and Test Infrastructure](./PHASE_02_foundation.md)*
