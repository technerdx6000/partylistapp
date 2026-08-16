# ListCollab

ListCollab is a mobile-first shared event list for low-friction group coordination. An organiser creates an event, seeds the categories or requirements, and shares one guest link; attendees identify themselves, claim part or all of an item, and can add ad-hoc contributions without accounts.

The stack is React 19 + Vite + MUI on the frontend, Express + TypeScript on Node 22 on the API, and MariaDB 11 for storage. The application is deployed as a small Docker Compose stack: unprivileged nginx serving the built web app, a compiled API container, and a MariaDB container on a private Docker network behind a separate TLS reverse proxy.

## Local development

```bash
npm install
cp .env.example .env
cp apps/api/.env.example apps/api/.env
npm run dev
```

Useful commands:

```bash
npm run test
npm run test:coverage
npm run test:security
npm run test:e2e
npm run test:e2e:dev
npm run lint
npm run type-check
```

`npm run test:e2e` runs against a compiled production-style stack. `npm run test:e2e:dev` keeps the Vite-dev workflow available when you need it.

## Production deployment

The production stack lives in `docker-compose.prod.yml` and expects an external env file such as `/etc/listcollab/listcollab.env`.

```bash
export LISTCOLLAB_ENV_FILE=/etc/listcollab/listcollab.env
./deploy.sh
./health-check.sh
```

The web container binds only to `127.0.0.1:${WEB_PORT}` and is intended to be exposed through a host reverse proxy using TLS. A reference nginx config is included at `deploy/nginx/listcollab-atlas.conf`.

## Architecture

The event is the root entity. Every participant, category, item, and assignment belongs to exactly one event and every API route resolves the current event from the `X-Event-Token` header before it reads or writes data. The frontend consumes a single aggregate event payload with TanStack Query as the server-state source of truth, while client state is limited to small UI state and per-event identity storage.

## Key decisions

- One aggregate event read per page instead of multiple round trips.
- Two capability tokens per event: a share token for guests and an admin token for organisers.
- Tokens move in `X-Event-Token`, not API query strings.
- `required_items` does not exist as a separate concept; coverage is derived from assignments.
- Structural writes are organiser-only; guests can identify themselves, claim items, and add ad-hoc contributions.
- Zod schemas in `@listcollab/shared` are the API contract source of truth.
- The admin token lives in the manage URL fragment and is stripped into browser session storage.

## Deployment versions

- Node runtime image: `node:22-alpine@sha256:c610fcdfb1d5b4740dd70c284ed3cb16bb857e0f7166196e36a5501df7a3aa32` (`v22.23.2`)
- MariaDB image: `mariadb:11@sha256:d9f7eb2637296652f24b484afd5d246f759f49f5babcadc6a9e344c9acb75fbf` (`11.8.8`)
