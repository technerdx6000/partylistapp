#!/usr/bin/env bash

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$REPO_ROOT/docker-compose.prod.yml"
ENV_FILE="${LISTCOLLAB_ENV_FILE:-/etc/listcollab/listcollab.env}"

if [[ ! -f "$ENV_FILE" ]]; then
    echo "Expected production env file at $ENV_FILE" >&2
    exit 1
fi

set -a
source "$ENV_FILE"
set +a

compose() {
    docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

web_port="${WEB_PORT:-8080}"

echo "ListCollab production health check"
compose ps
echo

echo "Web health"
curl -fsS "http://127.0.0.1:${web_port}/health"
echo

echo "API health"
curl -fsS "http://127.0.0.1:${web_port}/api/health"
echo

echo "Database health"
compose exec -T db mariadb-admin ping -h localhost -u root "-p${DB_ROOT_PASSWORD}" --silent
echo

echo "Recent logs"
compose logs --tail=20
