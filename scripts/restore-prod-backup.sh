#!/usr/bin/env bash

set -euo pipefail

if [[ $# -lt 1 ]]; then
    echo "Usage: $0 /path/to/listcollab-backup.sql.gz [scratch_database_name]" >&2
    exit 1
fi

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$REPO_ROOT/docker-compose.prod.yml"
ENV_FILE="${LISTCOLLAB_ENV_FILE:-/etc/listcollab/listcollab.env}"
BACKUP_FILE="$1"
SCRATCH_DB="${2:-listcollab_restore_drill}"

if [[ ! -f "$ENV_FILE" ]]; then
    echo "Expected production env file at $ENV_FILE" >&2
    exit 1
fi

if [[ ! -f "$BACKUP_FILE" ]]; then
    echo "Backup file not found: $BACKUP_FILE" >&2
    exit 1
fi

set -a
source "$ENV_FILE"
set +a

compose() {
    docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

compose exec -T db mariadb -h127.0.0.1 -u root -p"${DB_ROOT_PASSWORD}" -e "DROP DATABASE IF EXISTS \`${SCRATCH_DB}\`; CREATE DATABASE \`${SCRATCH_DB}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

gzip -dc "$BACKUP_FILE" | compose exec -T db mariadb -h127.0.0.1 -u root -p"${DB_ROOT_PASSWORD}" "$SCRATCH_DB"

compose exec -T db mariadb -N -h127.0.0.1 -u root -p"${DB_ROOT_PASSWORD}" "$SCRATCH_DB" -e "SELECT (SELECT COUNT(*) FROM events), (SELECT COUNT(*) FROM event_participants), (SELECT COUNT(*) FROM event_categories), (SELECT COUNT(*) FROM event_items), (SELECT COUNT(*) FROM event_item_assignments);"