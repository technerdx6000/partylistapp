# Phase 3 — Domain Model and Migrations

> **Phase goal**: A numbered migration system is in place, the event-centred schema exists with proper constraints and cascade deletes, and the existing party data has been migrated into a real event without loss.

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

- [ ] Phase 2 complete, all its test flags passed
- [ ] `packages/shared` compiles and is imported by both apps
- [ ] `docker-compose.test.yml` provides a disposable MariaDB for integration tests
- [ ] A backup of the current database exists — Task 3.5 rewrites real data

---

## Context

This is the phase that changes the product's shape. The old model is `Person → Item` plus a separate `Required Item → Person`, which cannot express "four bread rolls, two people bringing two each" and which conflates assignment with completion. The new model roots everything in an `Event` and separates requested from claimed from completed.

Two things must survive this phase intact: the existing party's data, and the ability to roll a migration back. The old app used setup SQL plus follow-up SQL scripts with no ordering guarantees; that is what gets replaced.

The API is not touched here. Routes still read the old tables at the end of this phase — Phase 4 moves them. That means the new tables sit alongside the old ones temporarily. That is intended.

---

## Tasks

### Task 3.1 — Migration runner

- Install `umzug` plus `mysql2` in `apps/api`
- Implement `apps/api/src/db/migrator.ts` reading `.sql` files from `apps/api/migrations/` in numeric filename order, tracked in a `schema_migrations` table
- Each migration is a pair: `NNN_name.up.sql` and `NNN_name.down.sql`. A migration without a down file is rejected by the runner.
- Wire `npm run db:migrate` (apply all pending) and `npm run db:rollback` (revert the most recent)
- Migrations run inside a transaction where MariaDB permits; DDL is not transactional in MariaDB, so each migration file must be written to be safely re-runnable (`IF NOT EXISTS`, `IF EXISTS`) and the runner must record success only after the file completes
- The runner reads connection details from the environment. No database name is hardcoded anywhere.

---

### Task 3.2 — Migration 001: baseline the current schema

- Capture the schema as it exists today into `001_initial_schema.up.sql` so a fresh database can be built from migrations alone
- The down file drops those tables
- Mark 001 as already-applied on the existing database rather than re-running it (`schema_migrations` seed step, documented in `DEVELOPMENT.md`)
- Delete the old ad-hoc setup and follow-up SQL scripts once 001 reproduces them. Verify equivalence by building a fresh database from 001 and diffing the schema against the existing one before deleting anything.

---

### Task 3.3 — Migration 002: events, participants, categories

```
events
  id                BIGINT UNSIGNED PK AUTO_INCREMENT
  name              VARCHAR(120) NOT NULL
  description       TEXT NULL
  event_date        DATE NULL
  location          VARCHAR(200) NULL
  share_token       VARCHAR(24) NOT NULL UNIQUE
  admin_token       VARCHAR(64) NOT NULL
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP

participants
  id                BIGINT UNSIGNED PK
  event_id          FK → events.id ON DELETE CASCADE
  name              VARCHAR(60) NOT NULL
  created_at        TIMESTAMP
  UNIQUE (event_id, name)

categories
  id                BIGINT UNSIGNED PK
  event_id          FK → events.id ON DELETE CASCADE
  name              VARCHAR(60) NOT NULL
  icon              VARCHAR(40) NULL
  sort_order        INT NOT NULL DEFAULT 0
  UNIQUE (event_id, name)
```

- Index `events.share_token` (unique) — it is the lookup key for every request
- Categories are per-event, not global. There is no global category table after this phase.
- 🔒 `admin_token` is stored plaintext by decision (README Key Decision 7). Add a SQL comment on the column recording that this is deliberate and what the upgrade path is, so it is not mistaken for an oversight later.

---

### Task 3.4 — Migration 003: items and assignments

```
items
  id                BIGINT UNSIGNED PK
  event_id          FK → events.id ON DELETE CASCADE
  category_id       FK → categories.id ON DELETE SET NULL, NULL allowed
  name              VARCHAR(120) NOT NULL
  description       VARCHAR(500) NULL
  quantity_required INT UNSIGNED NULL          -- NULL = ad-hoc contribution, nobody requested it
  status            ENUM('open','covered','completed') NOT NULL DEFAULT 'open'
  created_by        FK → participants.id ON DELETE SET NULL, NULL allowed
  created_at        TIMESTAMP
  updated_at        TIMESTAMP

item_assignments
  id                BIGINT UNSIGNED PK
  item_id           FK → items.id ON DELETE CASCADE
  participant_id    FK → participants.id ON DELETE CASCADE
  quantity          INT UNSIGNED NOT NULL DEFAULT 1
  note              VARCHAR(500) NULL
  created_at        TIMESTAMP
  UNIQUE (item_id, participant_id)
```

- Index `items.event_id`, `items.category_id`, `item_assignments.item_id`
- `CHECK (quantity >= 1)` on assignments
- The `UNIQUE (item_id, participant_id)` constraint means one row per person per item — claiming more updates the existing row rather than inserting a second. This is what makes unclaim unambiguous.
- **`status` is never written as a side effect of creating an assignment.** Coverage is derived at read time from `SUM(quantity)`; `status` records an organiser's explicit statement that something is done. Enforce this in Phase 4's service layer and note it here so the columns are not misread.

---

### Task 3.5 — Migration 004: migrate the legacy party

- Create exactly one event row from the existing data, with a generated share token and admin token, named from whatever the old data implies (fall back to `Imported Party`)
- Map existing people → `participants` for that event
- Map existing global categories → `categories` for that event
- Map existing items → `items`, and their person association → one `item_assignments` row each with `quantity = 1`
- Map existing required items → `items` with `quantity_required` set, **not** to a separate table
- Any required item that was marked fulfilled purely because someone was assigned to it must land as an assignment with `status = 'open'`, not `'completed'` — the old flag conflated two things and importing it faithfully would import the bug
- The migration must be idempotent (safe to run twice, producing one event not two) and must no-op cleanly against an empty legacy dataset so it works on a fresh install
- Print a summary on completion: counts of events, participants, categories, items and assignments created
- The down file removes the imported event and its cascaded rows

🔒 **Security note**: tokens generated inside a migration must use `crypto.randomBytes` via a small Node pre-step, not a SQL `RAND()` or `UUID()` expression. If the migration runner cannot inject them, generate them in a Node migration step rather than weakening the source of randomness.

---

### Task 3.6 — Constraints, indexes and cascade verification

🔒 This task is the data-protection control from CONVENTIONS.md §6.7.

- Verify every foreign key has the correct `ON DELETE` behaviour: deleting an event removes its participants, categories, items and assignments; deleting a participant removes their assignments but leaves the items they created; deleting a category leaves its items uncategorised rather than deleting them
- Confirm no orphan rows are reachable after any single delete
- Confirm the character set is `utf8mb4` with a `utf8mb4_unicode_ci` collation on every text column — names and notes contain emoji in practice
- Confirm `NOT NULL` on every column that must not be null, particularly `event_id` on all child tables

---

### Task 3.7 — Migration tests

Against the disposable test database:

- Migrating from empty to latest succeeds and produces the expected table list
- Rolling back to 002 and re-migrating to latest succeeds (each down file actually works)
- 004 is idempotent: running it twice produces one imported event
- 004 on an empty legacy dataset completes without error and creates nothing
- Cascade behaviour: deleting an event leaves zero rows in participants, categories, items and assignments for that event
- The `UNIQUE (item_id, participant_id)` constraint rejects a duplicate assignment
- A `quantity` of 0 or negative is rejected by the database, independent of any application validation

---

## 🔒 Security Tasks for This Phase

- [ ] Tokens generated with `crypto.randomBytes` / `nanoid`, never SQL randomness
- [ ] Share token column is unique and indexed; admin token column carries the comment explaining the plaintext decision
- [ ] Cascade deletes verified so no participant names survive their event
- [ ] No connection string, password or database name hardcoded in any migration file
- [ ] Migration runner fails loudly on a checksum or ordering mismatch rather than skipping a file

---

## Test Flags

> All tests written in this phase must comply with **`TESTING_STANDARDS.md`**. Check Section 11 (Definition of Done) before marking this phase complete.

### Automated
- [ ] `npm run test` — all migration tests pass against the test database
- [ ] `npm run db:migrate` on an empty database completes and reports every migration applied
- [ ] `npm run db:rollback` reverts the most recent migration cleanly
- [ ] `npm run type-check` — zero errors
- [ ] `npm run lint` — zero errors

### Manual Verification
- [ ] After migrating the real database, the imported event contains the same people and items as before (compare against the Phase 1 baseline notes)
- [ ] The old app still runs — Phase 3 does not break it, since the API still reads the old tables
- [ ] Emoji in a participant name and an item name round-trip correctly through the database

### Security Verification
- [ ] Two consecutive share tokens are unrelated and of the expected length
- [ ] Deleting a test event leaves zero orphan rows across all four child tables
- [ ] No migration output logs a token value

---

## Done When...

- [ ] All tasks above are checked off in TRACKER.md
- [ ] All automated test flags pass
- [ ] All manual verification steps confirmed
- [ ] All security tasks confirmed
- [ ] `TESTING_STANDARDS.md` Section 11 checklist satisfied for all tests written this phase
- [ ] Code committed with message: `feat(db): complete phase 3 - event-centred domain model and migrations`
- [ ] TRACKER.md updated with all task statuses

---

## Notes for Agent

- Take a database dump before running 004 against real data. If the import is wrong you want to be able to retry, and "it's only a party list" is exactly the attitude that loses the one dataset that proves the migration works.
- The old tables are not dropped in this phase. Dropping them is a task in Phase 4 once nothing reads them.
- If the legacy data turns out to be messier than the mapping above assumes (duplicate names, items with no person, categories referenced but missing), handle it explicitly in the migration and record the decision in TRACKER.md. Do not silently drop rows.
- MariaDB does not roll back DDL. Write each migration so a partial failure can be re-run safely.

---

*Next phase: [Phase 4 — Event-Centred API](./PHASE_04_api.md)*
