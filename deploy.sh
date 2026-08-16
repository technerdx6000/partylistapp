#!/usr/bin/env bash

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$REPO_ROOT/docker-compose.prod.yml"
ENV_FILE="${LISTCOLLAB_ENV_FILE:-/etc/listcollab/listcollab.env}"

if [[ ! -f "$ENV_FILE" ]]; then
	echo "Expected production env file at $ENV_FILE" >&2
	exit 1
fi

compose() {
	docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

wait_for_health() {
	local service="$1"
	local container_id
	container_id="$(compose ps -q "$service")"

	if [[ -z "$container_id" ]]; then
		echo "Could not find container for service $service" >&2
		exit 1
	fi

	for _ in {1..90}; do
		local status
		status="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container_id")"

		if [[ "$status" == "healthy" || "$status" == "running" || "$status" == "exited" ]]; then
			return 0
		fi

		sleep 2
	done

	echo "Timed out waiting for $service to become ready" >&2
	compose logs "$service" --tail=100
	exit 1
}

echo "Deploying ListCollab with docker-compose.prod.yml"
compose up -d --build --remove-orphans

wait_for_health db
wait_for_health migrate
wait_for_health api
wait_for_health web

compose ps
echo "Deployment finished. Web is bound to localhost on the configured WEB_PORT and should be reached through the reverse proxy."
