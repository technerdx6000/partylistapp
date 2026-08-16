# Operations

## Runtime layout

- `db`: MariaDB on the private `prod` Docker network only
- `migrate`: one-shot migration container
- `api`: compiled Node API container
- `web`: nginx-unprivileged static frontend bound to `127.0.0.1:${WEB_PORT}`

Use the external env file and prod compose for every operational command:

```bash
export LISTCOLLAB_ENV_FILE=/etc/listcollab/listcollab.env
docker compose --env-file "$LISTCOLLAB_ENV_FILE" -f docker-compose.prod.yml ps
```

## Deploy

```bash
git pull
./deploy.sh
./health-check.sh
```

`deploy.sh` waits for `db`, `migrate`, `api`, and `web` to become ready.

## Rollback

1. Check out the previous known-good release or commit.
2. Run `./deploy.sh` again with the same external env file.
3. Run `./health-check.sh`.
4. If the older release cannot run on the current schema, stop and make the schema decision explicitly before reverting data.

## Logs

Container logs are the primary operational log surface:

```bash
docker compose --env-file "$LISTCOLLAB_ENV_FILE" -f docker-compose.prod.yml logs api --tail=200
docker compose --env-file "$LISTCOLLAB_ENV_FILE" -f docker-compose.prod.yml logs web --tail=200
docker compose --env-file "$LISTCOLLAB_ENV_FILE" -f docker-compose.prod.yml logs db --tail=200
```

The API emits a `requestId` on every request and includes the same value in error responses. When a user reports an error, search the API logs for that `requestId`.

## Health checks

```bash
./health-check.sh
```

The script checks:

- compose service state
- `http://127.0.0.1:${WEB_PORT}/health`
- `http://127.0.0.1:${WEB_PORT}/api/health`
- MariaDB responsiveness through `mariadb-admin`

## Backups

`scripts/backup-prod.sh` writes compressed SQL dumps outside the repository and prunes old dumps based on `LISTCOLLAB_BACKUP_RETENTION_DAYS`.

Recommended host path and retention:

- backup directory: `/var/backups/listcollab`
- retention: `14` days
- schedule: daily via the included systemd timer

Example manual run:

```bash
LISTCOLLAB_BACKUP_DIR=/var/backups/listcollab ./scripts/backup-prod.sh
```

## Restore drill

Restore into a scratch DB, not the live DB:

```bash
./scripts/restore-prod-backup.sh /var/backups/listcollab/listcollab-YYYYMMDDTHHMMSSZ.sql.gz listcollab_restore_drill
```

Verified local drill on 2026-08-16:

- backup path: `/tmp/listcollab-backups/listcollab-20260816T050426Z.sql.gz`
- elapsed time from dump start to queryable scratch DB: `2` seconds
- restored drill fixture: `Backup Drill Event` / `Restore validation fixture`
- restored dataset counts: `events=2`, `participants=1`, `categories=1`, `items=1`, `assignments=1`

Worst-case data loss is the time since the last scheduled backup. With a daily run, the maximum loss window is less than 24 hours. For this low-volume homelab app that is acceptable; if events begin changing throughout the day, shorten the schedule before shipping more usage.

## Recover organiser access

Admin tokens are stored in plaintext by design so a lost organiser link can be recovered.

Example lookup by event id:

```bash
docker compose --env-file "$LISTCOLLAB_ENV_FILE" -f docker-compose.prod.yml exec -T db \
  mariadb -N -h127.0.0.1 -u root -p"$DB_ROOT_PASSWORD" "$DB_NAME" \
  -e "SELECT CONCAT('https://listcollab.example.com/e/', share_token, '/manage#k=', admin_token) FROM events WHERE id = 42;"
```

Example lookup by event name:

```bash
docker compose --env-file "$LISTCOLLAB_ENV_FILE" -f docker-compose.prod.yml exec -T db \
  mariadb -N -h127.0.0.1 -u root -p"$DB_ROOT_PASSWORD" "$DB_NAME" \
  -e "SELECT id, name, created_at FROM events WHERE name LIKE 'Summer BBQ%' ORDER BY created_at DESC;"
```

Do not paste recovered admin links into shared chat threads.