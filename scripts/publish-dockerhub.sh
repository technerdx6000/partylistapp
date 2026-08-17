#!/usr/bin/env bash

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOCKERHUB_NAMESPACE="${DOCKERHUB_NAMESPACE:-technerdx6000}"
IMAGE_TAG="${IMAGE_TAG:-1.0.20}"
EXTRA_TAG="${EXTRA_TAG:-git-$(git -C "$REPO_ROOT" rev-parse --short HEAD)}"
WEB_IMAGE="${DOCKERHUB_NAMESPACE}/listcollab-web"
API_IMAGE="${DOCKERHUB_NAMESPACE}/listcollab-api"

echo "Publishing ListCollab images to Docker Hub namespace ${DOCKERHUB_NAMESPACE}"
echo "API tags: ${IMAGE_TAG}, ${EXTRA_TAG}, latest"
echo "WEB tags: ${IMAGE_TAG}, ${EXTRA_TAG}, latest"

docker build \
  -f "$REPO_ROOT/apps/api/Dockerfile" \
  -t "${API_IMAGE}:${IMAGE_TAG}" \
  -t "${API_IMAGE}:${EXTRA_TAG}" \
  -t "${API_IMAGE}:latest" \
  "$REPO_ROOT"

docker build \
  -f "$REPO_ROOT/apps/web/Dockerfile" \
  -t "${WEB_IMAGE}:${IMAGE_TAG}" \
  -t "${WEB_IMAGE}:${EXTRA_TAG}" \
  -t "${WEB_IMAGE}:latest" \
  "$REPO_ROOT"

docker push "${API_IMAGE}:${IMAGE_TAG}"
docker push "${API_IMAGE}:${EXTRA_TAG}"
docker push "${API_IMAGE}:latest"

docker push "${WEB_IMAGE}:${IMAGE_TAG}"
docker push "${WEB_IMAGE}:${EXTRA_TAG}"
docker push "${WEB_IMAGE}:latest"

echo "Published successfully."