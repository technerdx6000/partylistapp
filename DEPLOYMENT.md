# Deployment

## Docker Hub images

The production deployment can now use prebuilt images instead of building on the target host.

Default image names:

- `technerdx6000/listcollab-api`
- `technerdx6000/listcollab-web`

Recommended tags:

- release tag: `1.0.1`
- immutable build tag: `git-24794bb`
- moving tag: `latest`

Build and publish from the repo root:

```bash
DOCKERHUB_NAMESPACE=technerdx6000 \
IMAGE_TAG=1.0.1 \
EXTRA_TAG=git-24794bb \
bash scripts/publish-dockerhub.sh
```

If you are not already authenticated locally, run `docker login` first.

## Production assumptions

- The application is deployed on a Linux host with Docker and the Compose plugin.
- The web container binds only to `127.0.0.1:${WEB_PORT}`.
- A separate host reverse proxy terminates TLS and forwards to the local web container.
- Production env values live outside the repository, for example at `/etc/listcollab/listcollab.env`.

For TrueNAS specifically, prefer the image-based compose file in `docker-compose.truenas.yml` rather than the host-build compose file.

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

## TrueNAS deployment

`docker-compose.truenas.yml` is the copy-paste compose for the TrueNAS custom app UI. It removes build steps and points directly at Docker Hub images.

Do not rely on a local `env_file:` entry for the TrueNAS lifecycle actions. TrueNAS renders the compose into its own internal app path for `up` / `down`, and that rendered path may not contain your colocated `.env` file during later lifecycle operations.

What to do in the TrueNAS app UI:

1. Push the `technerdx6000/listcollab-api` and `technerdx6000/listcollab-web` images first.
2. Open the custom app / Docker Compose screen.
3. Paste the contents of `docker-compose.truenas.yml`.
4. Edit the literal values inline in `docker-compose.truenas.yml` before saving. The file is intentionally self-contained and no longer depends on `${...}` substitutions.
5. If you front the app with a reverse proxy, keep the web port internal and publish only what your proxy needs.
6. Deploy and confirm the `migrate` service exits successfully before trusting the API.

Important for repeated TrueNAS deploy attempts:

- MariaDB only applies `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`, and `MYSQL_ROOT_PASSWORD` when the data directory is empty on first initialization.
- If you already started the app once and then changed `DB_PASSWORD` or `DB_ROOT_PASSWORD`, the `db` container can still look healthy while `migrate` fails with `Access denied for user 'listcollab_user'`.
- For a fresh install, delete `/mnt/tank/apps/appdata/listcollab/db` before redeploying with your final passwords.
- If you need to preserve an existing database, keep using the original database passwords that were in place on the first successful MariaDB initialization.
- `CORS_ORIGIN` must be a full origin including the scheme, for example `https://listcollab.example.com` or `http://truenas.local:8080`.
- Starting with image tag `1.0.1`, the migration and rollback jobs no longer require `CORS_ORIGIN` or `PORT`, so a malformed frontend origin no longer blocks schema bootstrapping.
- Starting with image tag `1.0.2`, the migration runner retries transient database startup/auth readiness errors before failing, which hardens slower first-boot environments like NAS deployments.
- Starting with image tag `1.0.3`, the API normalizes DATE-backed event values at the repository boundary and includes a repository contract suite that validates event, participant, category, item, and assignment outputs against the shared Zod schemas.

Values to edit inline in the TrueNAS compose:

```bash
technerdx6000/listcollab-api:1.0.3
technerdx6000/listcollab-web:1.0.3
DB_PASSWORD=replace_with_generated_app_password
DB_ROOT_PASSWORD=replace_with_generated_root_password
CORS_ORIGIN=https://listcollab.example.com
WEB_PORT=8080
```

If you want immutable deploys on TrueNAS, replace the image tags inline with the current git-tagged images you published from this repo instead of the release tag.

In practice, the only values most deployments need to change are:

- API image tag
- web image tag
- `DB_PASSWORD`
- `DB_ROOT_PASSWORD`
- `CORS_ORIGIN`
- `WEB_PORT`

Hardcoded TrueNAS assumptions in this file:

- appdata path: `/mnt/tank/apps/appdata/listcollab`
- database name: `listcollab`
- database user: `listcollab_user`
- internal database port: `3306`
- API port: `3002`
- image namespace: `technerdx6000`
- runtime mode: `production`
- log level: `info`

Notes for TrueNAS:

- MariaDB data is stored at `/mnt/tank/apps/appdata/listcollab/db`
- the database is internal only; no host port is published
- the web container exposes the literal host mapping you leave in the compose, for example `8080:8080`
- the API stays internal to the app network

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

The Docker Hub / TrueNAS path still depends on a successful image push to the target namespace.

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
