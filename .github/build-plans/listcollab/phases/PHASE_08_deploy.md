# Phase 8 — Hardening, Deployment and Handoff

> **Phase goal**: ListCollab runs in production on the homelab behind TLS, with verified security controls, working backups, a full green test suite, and documentation good enough to pick the project up cold in six months.

---

## Session Start

Before doing anything in this phase — at the start of every session, and after any context reset:

- [ ] Read `../TRACKER.md` and identify the next incomplete task in this phase
- [ ] Read `../CONVENTIONS.md` if you have not read it this session
- [ ] Read `../TESTING_STANDARDS.md` if you will write or change any test this session
- [ ] Read `../TEST_PLAN.md` — this phase verifies every checklist in it
- [ ] Confirm the Prerequisites below still hold

Do not resume from memory. You do not retain this plan between sessions.

---

## Prerequisites

- [ ] Phase 7 complete, all its test flags passed
- [ ] The full MVP flow passes on desktop and mobile
- [ ] No `⛔ Blocked` rows outstanding in TRACKER.md

---

## Context

The app works. This phase makes it safe to leave running and possible to fix later. Two things are easy to skip here and expensive to skip: the backup restore drill, and the documentation. An untested backup is not a backup, and a personal project's institutional knowledge evaporates within a month of the last commit.

The security verification here is not a first pass. Every control was built into its own phase. This is confirmation that they all still hold together in the deployed configuration, which is where they most often quietly stop holding.

---

## Tasks

### Task 8.1 — Security test suite consolidation

🔒

- Walk the entire TEST_PLAN.md security checklist and confirm each line has a passing automated test. Anything without one gets written now.
- Group the security tests so they can run as a named suite: `npm run test:security`
- Include the IDOR matrix explicitly: for each of item, category, participant and assignment, event A's token against event B's row returns `404`
- Include the enumeration checks: invalid token and unknown event are identical in status code, body and (roughly) timing
- Include the log-redaction assertion over a full request cycle

---

### Task 8.2 — Headers, CSP and transport

🔒

- Content-Security-Policy on the web app served in production: `default-src 'self'`, no `unsafe-inline` for scripts. MUI's emotion runtime requires `style-src 'self' 'unsafe-inline'` — that is the only exception, and it is documented in the handoff.
- `helmet` verified active on API responses in the production build, not just in dev
- HSTS set at the reverse proxy; HTTP redirects to HTTPS
- `Referrer-Policy: no-referrer` so share URLs are not leaked onward
- CORS restricted to the production origin, verified by a cross-origin request failing
- Confirm no source maps expose original source in production, or accept them deliberately and record the choice

---

### Task 8.3 — Dependency and supply chain

🔒

- `npm audit` clean at high/critical across all workspaces
- Production dependency versions pinned exactly (CONVENTIONS.md §6.6)
- Dependabot (or Renovate) configured on the repository
- Remove dev-only dependencies from production images; confirm the API image does not ship `tsx`, test runners or Playwright
- Record the Node and MariaDB versions the deployment is pinned to

---

### Task 8.4 — Production Compose stack

- `docker-compose.prod.yml`: web served as static build by a small nginx image, API running compiled output, MariaDB with a named volume
- Multi-stage Dockerfiles so build tooling does not reach production images
- Containers run as non-root users
- `restart: unless-stopped` on all services
- Health checks on all three services, with the API check hitting `/api/health` and the database check using `mysqladmin ping`
- API waits for the database health check before starting
- **Migrations run on boot** as a distinct step that fails the deploy loudly if a migration fails, rather than starting an API against an unmigrated schema
- All configuration from environment variables, with production values supplied outside the repository
- The database container is not published to the host network — only the API reaches it

---

### Task 8.5 — Backups and restore drill

- A scheduled `mysqldump` (or ZFS snapshot of the dataset, whichever fits the atlas setup) with a documented retention period
- **Perform an actual restore into a scratch database and verify an event, its participants, items and assignments come back intact.** Record the restore steps and the elapsed time in the handoff docs.
- Document what is lost in the worst case (time since last backup) and confirm that is acceptable
- Verify the backup does not land inside the git repository

---

### Task 8.6 — Full verification pass

- `npm run test`, `npm run test:coverage`, `npm run test:e2e`, `npm run test:security`, `npm run lint`, `npm run type-check` — all green against the production build, not just the dev server
- Coverage thresholds from TEST_PLAN.md met and enforced as a failing condition, not a report
- Every critical path in TEST_PLAN.md ticked
- Load sanity check: the aggregate event endpoint stays responsive with an event of 50 items and 20 participants. This app will never see real load, but a missing index shows up here.
- Verify the imported legacy event still renders correctly in production

---

### Task 8.7 — Documentation and handoff

- `README.md` at the repo root: what the app is, the stack, how to run it locally, how to deploy, and the architecture in a paragraph
- `DEVELOPMENT.md` updated for the final layout and commands
- `OPERATIONS.md`: deploy procedure, rollback procedure, backup and restore steps, where logs go, how to read a `requestId`, and how to recover organiser access to an event when someone loses their admin link (a documented SQL lookup, since that is the deliberate consequence of Key Decision 7)
- `SECURITY.md`: the threat model in short, the token capability model, the two accepted trade-offs recorded plainly — plaintext admin tokens and weak participant identity — with the conditions that would require revisiting each, and the note that early git history contains rotated credentials
- An architecture decision record (or a section in the README) capturing the Key Decisions from the plan, so the reasoning survives the plan files

---

### Task 8.8 — Deploy to atlas

- Deploy the production stack behind the existing reverse proxy with a TLS certificate
- Confirm the app is reachable at its intended hostname over HTTPS only
- Confirm the migration step ran and the schema is current
- Confirm logs are being written where operations expects them and are rotating
- Confirm the database is not reachable from outside the Docker network
- Create one real event and run the full MVP flow against production before considering the deploy done

---

### Task 8.9 — Merge and close out

- Merge `listcollab` into `main` once production is verified
- Tag the release `v1.0.0`
- Update TRACKER.md: all tasks `✅ Complete`, with the session log filled in
- Record in TRACKER.md notes anything deliberately left undone and why — the deferred scope from Key Decision 14, plus the stretch items from Phase 7 if they were not built
- Optional stretch items, only if everything above is complete: dark mode, event cover colour/icon, drag-and-drop reordering, polling for near-real-time updates

---

## 🔒 Security Tasks for This Phase

- [ ] Full TEST_PLAN.md security checklist passing as an automated suite
- [ ] CSP, HSTS, `Referrer-Policy` and helmet verified on the deployed app, not just locally
- [ ] CORS restricted to the production origin and verified failing cross-origin
- [ ] `npm audit` clean; production images contain no dev tooling; containers run as non-root
- [ ] Database not reachable from the host network or the LAN
- [ ] Backups verified by an actual restore, and stored outside the repository
- [ ] Production error responses confirmed generic against the live deployment
- [ ] `SECURITY.md` records the accepted trade-offs and the git-history credential note
- [ ] Rotated credentials in use in production; no value that ever appeared in git history is still live

---

## Test Flags

> All tests written in this phase must comply with **`TESTING_STANDARDS.md`**. Check Section 11 (Definition of Done) before marking this phase complete.

### Automated
- [ ] `npm run test` — all unit, integration and component tests pass
- [ ] `npm run test:security` — full security suite passes
- [ ] `npm run test:e2e` — desktop and mobile projects pass against the production build
- [ ] `npm run test:coverage` — thresholds met and enforced as a failure condition
- [ ] `npm audit --audit-level=high` — clean
- [ ] `npm run lint`, `npm run type-check` — zero errors
- [ ] `docker compose -f docker-compose.prod.yml up` — all services reach healthy from a cold start

### Manual Verification
- [ ] The full MVP flow completes against the live production URL from a phone on a different network
- [ ] The legacy imported event renders correctly in production
- [ ] A restart of the stack loses no data and re-runs migrations cleanly (no-op)
- [ ] A restore from backup into a scratch database produces intact event data
- [ ] Following `OPERATIONS.md` from cold, without prior knowledge, is enough to deploy and roll back

### Security Verification
- [ ] `curl -I` on the production URL shows the expected security headers
- [ ] HTTP redirects to HTTPS; HSTS present
- [ ] An admin action attempted with a share token against production returns `403`
- [ ] Event A's token against event B's item id against production returns `404`
- [ ] Production logs inspected for a full request cycle — no token, credential or full participant list present

---

## Done When...

- [ ] All tasks above are checked off in TRACKER.md
- [ ] All automated test flags pass
- [ ] All manual verification steps confirmed
- [ ] All security tasks confirmed
- [ ] `TESTING_STANDARDS.md` Section 11 checklist satisfied for all tests written this phase
- [ ] Code committed with message: `chore(repo): complete phase 8 - hardening, deployment and handoff`
- [ ] `listcollab` merged to `main` and tagged `v1.0.0`
- [ ] TRACKER.md updated with all task statuses and the close-out notes

---

## Notes for Agent

- Do the restore drill. A backup nobody has restored is a hypothesis.
- If the security suite finds something at this stage, treat it as a phase blocker rather than a known issue to ship with. Everything in it was supposed to be built two to four phases ago, so a failure here means a control silently regressed.
- The handoff documentation is a deliverable, not paperwork. The specific thing to write down is anything that was a decision rather than an obvious consequence — future readers can infer the obvious parts from the code.
- Resist adding stretch features before the deploy is verified. A working deployed v1 beats an undeployed v1.1.

---

*This is the final phase. On completion, the build plan is closed out and further work proceeds as normal issues against `main`.*
