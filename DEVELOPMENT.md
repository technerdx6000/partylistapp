# Development Setup

## Prerequisites

- Docker Engine with the `docker compose` plugin available
- Node.js 22.x if you want to run frontend tooling outside the containers

## Environment Setup

1. Copy the root example file.

```bash
cp .env.example .env
```

2. Copy the API example file if you plan to run the API directly outside Docker.

```bash
cp api/.env.example api/.env
```

3. Update the generated placeholder passwords in both files before starting the stack.

## Start The Full Stack

Run the application from the repository root:

```bash
docker compose up --build
```

Services:

- Frontend: http://localhost
- API health endpoint: http://localhost/api/health
- MariaDB: localhost:3306

## Run In The Background

```bash
docker compose up --build -d
docker compose ps
```

## Stop The Stack

```bash
docker compose down
```

## Reset The Database

This removes the MariaDB volume and recreates the schema from the SQL init scripts.

```bash
docker compose down -v
docker compose up --build -d
```

## Notes

- The root `.env` file controls Docker Compose startup values, including the `listcollab` database name.
- The API routes are exposed through nginx under `/api/*`; use `http://localhost/api/health` to verify end-to-end connectivity.
- `src/App.jsx` now reads required items from the live API instead of mock data, so startup issues are most visible in `docker compose logs api` and `docker compose logs frontend`.