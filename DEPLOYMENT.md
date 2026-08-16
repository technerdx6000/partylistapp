# Deployment

## Production assumptions

- The application is deployed on a Linux host with Docker and the Compose plugin.
- The web container binds only to `127.0.0.1:${WEB_PORT}`.
- A separate host reverse proxy terminates TLS and forwards to the local web container.
- Production env values live outside the repository, for example at `/etc/listcollab/listcollab.env`.

## External env file

Create `/etc/listcollab/listcollab.env` with at least:

```bash
DB_NAME=listcollab
DB_USER=listcollab_user
DB_PASSWORD=replace_with_generated_app_password
DB_ROOT_PASSWORD=replace_with_generated_root_password
CORS_ORIGIN=https://listcollab.example.com
WEB_PORT=8080
LOG_LEVEL=info
```

Do not place this file in the repository.

## Deploy

```bash
git pull
export LISTCOLLAB_ENV_FILE=/etc/listcollab/listcollab.env
./deploy.sh
```

The production stack includes:

- `db`: MariaDB 11.8.8 pinned by digest, private Docker network only
- `migrate`: one-shot schema migration step that must exit successfully before the API starts
- `api`: compiled Node 22 API container, non-root runtime
- `web`: nginx-unprivileged static web container on localhost only

## Reverse proxy

Use `deploy/nginx/listcollab-atlas.conf` as the starting point for the host reverse proxy. It includes:

- HTTP to HTTPS redirect
- HSTS
- `Referrer-Policy: no-referrer`
- proxying to `127.0.0.1:${WEB_PORT}`

## Local validation already performed

The hardened local production stack was validated with:

- `docker compose -f docker-compose.prod.yml up -d --build`
- web CSP and referrer-policy headers present on `http://127.0.0.1:8080/`
- API CORS restricted to the configured origin by header mismatch on disallowed origins
- API and web containers running as non-root users
- no source maps shipped in the web image
- compiled API image does not contain `tsx` or Playwright

## Rollback

1. Check out the previous known-good git revision or release tag.
2. Re-run `./deploy.sh` with the same external env file.
3. Verify with `./health-check.sh`.
4. Only roll back database schema manually if the older app version is incompatible with the current schema; otherwise prefer forward-only schema compatibility.

## Live-production tasks still requiring the host

This repository now contains the stack, scripts, and proxy reference needed for atlas deployment. The final host-specific actions still have to be performed on atlas itself:

- install the reverse-proxy config with the real hostname and certificate paths
- verify HTTPS redirect and HSTS on the live hostname
- confirm the app is reachable from outside the LAN as intended
