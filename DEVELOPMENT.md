# Development

## Prerequisites

- Docker Engine with the `docker compose` plugin
- Node.js 22.x
- npm 10+

## Environment files

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
```

Update the placeholder DB passwords before starting either stack. The root `.env` controls Docker Compose values; `apps/api/.env` is only for direct API execution outside the container.

## Local app workflow

```bash
npm install
npm run dev
```

The dev wrapper:

- starts the local MariaDB container from `docker-compose.yml`
- waits for it to become healthy
- runs `npm run db:migrate`
- starts the Vite dev server on `127.0.0.1:4273`
- starts the API on `127.0.0.1:4301`

## Docker dev workflow

```bash
docker compose up --build
```

This is the easier path when you want nginx in front of the API locally.

## Tests

Run these serially in this repository. The unit/integration suite, coverage run, and Playwright stack all share local DB/server resources.

```bash
npm run test
npm run test:coverage
npm run test:security
npm run test:e2e
npm run test:e2e:dev
npm run lint
npm run type-check
```

Notes:

- `npm run test:e2e` uses a compiled production-style harness and runs on `127.0.0.1:4274` and `127.0.0.1:4302`.
- `npm run test:e2e:dev` uses the dev-server harness on `127.0.0.1:4273` and `127.0.0.1:4301`.
- `npm run test:security` is intentionally single-worker because it contains DB-resetting integration files.

## Database reset

```bash
docker compose down -v
docker compose up -d db
npm run db:migrate
```

## Production-stack smoke check

```bash
DB_NAME=listcollab \
DB_USER=listcollab_user \
DB_PASSWORD=replace_with_generated_app_password \
DB_ROOT_PASSWORD=replace_with_generated_root_password \
CORS_ORIGIN=http://127.0.0.1:8080 \
WEB_PORT=8080 \
LOG_LEVEL=info \
docker compose -f docker-compose.prod.yml up -d --build
```

This brings up the hardened stack with a separate migration service and localhost-only web binding.