#!/usr/bin/env bash

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$REPO_ROOT/docker-compose.prod.yml"
ENV_FILE="${LISTCOLLAB_ENV_FILE:-/etc/listcollab/listcollab.env}"
BACKUP_DIR="${1:-${LISTCOLLAB_BACKUP_DIR:-/var/backups/listcollab}}"
RETENTION_DAYS="${LISTCOLLAB_BACKUP_RETENTION_DAYS:-14}"

if [[ ! -f "$ENV_FILE" ]]; then
    echo "Expected production env file at $ENV_FILE" >&2
    exit 1
fi

backup_dir_real="$(realpath -m "$BACKUP_DIR")"

if [[ "$backup_dir_real" == "$REPO_ROOT"* ]]; then
    echo "Backup directory must live outside the repository: $backup_dir_real" >&2
    exit 1
fi

mkdir -p "$backup_dir_real"

set -a
source "$ENV_FILE"
set +a

compose() {
    docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_file="$backup_dir_real/listcollab-${timestamp}.sql.gz"

compose exec -T db mariadb-dump \
    --single-transaction \
    --quick \
    --lock-tables=false \
    -h127.0.0.1 \
    -u"${DB_USER}" \
    -p"${DB_PASSWORD}" \
    "${DB_NAME}" | gzip -c > "$backup_file"

find "$backup_dir_real" -maxdepth 1 -type f -name 'listcollab-*.sql.gz' -mtime "+${RETENTION_DAYS}" -delete

echo "$backup_file"