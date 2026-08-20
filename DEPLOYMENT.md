# Deployment

## Docker Hub images

The production deployment can now use prebuilt images instead of building on the target host.

Default image names:

- `technerdx6000/listcollab-api`
- `technerdx6000/listcollab-web`

Recommended tags:

- release tag: `1.0.27`
- immutable build tag: `git-97427c5-dirty-20260820d`
- moving tag: `latest`

Build and publish from the repo root:

```bash
DOCKERHUB_NAMESPACE=technerdx6000 \
IMAGE_TAG=1.0.27 \
EXTRA_TAG=git-97427c5-dirty-20260820d \
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
- Starting with image tag `1.0.4`, the organiser-link field includes an inline copy action in the header so the token-safe manage link is easier to capture without text selection.
- Starting with image tag `1.0.5`, phone-sized event pages use a sticky category navigator that shows one category at a time, which reduces long vertical scrolling while keeping search global across the whole event.
- Starting with image tag `1.0.6`, phone-sized organiser pages use a compact action panel with participant management moved into a dedicated dialog, and the sticky category tabs use denser coverage badges while preserving fuller accessibility labels.
- Starting with image tag `1.0.7`, item cards are replaced by compact inline rows that keep title, edit, claim, delete, and status visible, while row clicks and inline actions open a desktop flyout or mobile modal detail surface for claim, edit, and delete flows.
- Starting with image tag `1.0.8`, phone-sized organiser item rows and item-detail views keep edit and delete visible again, restoring full mobile organiser functionality after the compact-row redesign.
- Starting with image tag `1.0.9`, phone-sized organiser rows and mobile item-detail dialogs use the same compact action bar, and the mobile detail view no longer repeats the item title above the action controls.
- Starting with image tag `1.0.10`, share-link and organiser item rows now expose the same edit and delete actions, share-token item updates and deletes follow that unified UI model, and phone-sized item rows are tightened into a single inline line instead of a stacked mini-card.
- Starting with image tag `1.0.11`, inline claim, edit, and delete buttons now open their specific target dialogs directly instead of routing through the generic item detail surface first, and browser back closes the active transient event-page overlay on mobile.
- Starting with image tag `1.0.12`, event pages add an `Everything / Me` filter so identified participants can switch from the full event list to only items they have claimed, without losing the existing search or mobile category-navigation behavior.
- Starting with image tag `1.0.13`, the phone-sized `Everything / Me` control moves into a permanently anchored bottom tab bar with safe-area-aware spacing, and mobile snackbars now sit above that bar instead of blocking taps.
- Starting with image tag `1.0.14`, the anchored mobile `Everything / Me` bar uses a flatter bottom-navigation treatment with readable selected and disabled tab colors, so it matches the screen-edge placement instead of rendering as an oversized rounded pill strip.
- Starting with image tag `1.0.15`, the mobile bottom bar drops the last remaining rounded corners on both the bar container and the active tab indicator so the navigation sits flush with the screen edge.
- Starting with image tag `1.0.16`, the phone-sized share, copy, and add-contribution controls are condensed into a smaller inline action row so they no longer dominate the top of the event page on mobile.
- Starting with image tag `1.0.17`, event pages add a third `Summary` tab that renders a themed assignment table for requirement items, including assignee, quantity, and outstanding quantity rows so event status can be scanned quickly.
- Starting with image tag `1.0.18`, the Summary table uses shorter mobile-friendly headings and flexible, non-equal column widths so headers do not collide and text-heavy item names can wrap cleanly without forcing numeric columns wide.
- Starting with image tag `1.0.19`, guest contribution submits that reach the form without an active participant now reopen the existing identity prompt instead of ending in a local dead-end validation error, so the user can select or create themselves and continue.
- Starting with image tag `1.0.20`, the event-page create handler also blocks any guest contribution request that still reaches the page without `createdBy`, reopens the identity prompt, and binds the chosen participant back onto the open draft before the API can be called.
- Starting with image tag `1.0.21`, organiser manage pages resolve the `#k=` admin token synchronously on first render and block organiser mode when no organiser token is available, which prevents add-item requests from falling back to the share token and surfacing the guest `createdBy` validation error.
- Starting with image tag `1.0.22`, claim and requirement quantity inputs can be temporarily cleared during editing without snapping back to `1`, while blank quantities now show field-local validation and stay blocked from submission until a valid number is re-entered.
- Starting with image tag `1.0.23`, the share-link `Add your contribution` flow restores its quantity field, carries that quantity through the guest auto-claim path, and the non-managed claim/create dialogs now keep invalid blank quantities field-local instead of hiding the quantity flow behind the organiser-only path.
- Starting with image tag `1.0.24`, the mobile category bar now shows the actual visible item count for each category group so its number matches the list in both `All Items` and `My Items`.
- Starting with image tag `1.0.25`, the event header, category section labels, mobile category bar, and summary table all use the same item-based `ready / total` model, and contribution items now appear in the summary instead of being silently excluded.
- Starting with image tag `1.0.26`, compact item rows now use a single `Closed` status label for both requirement and contribution items, removing the `Closed contribution` versus `Closed · 0 left` wording split.
- Starting with image tag `1.0.27`, the summary tab no longer adds synthetic `Unassigned` rows for partially assigned items; multiple rows for the same item now only appear when multiple real assignees exist, while remaining work stays in the `Remaining Qty` column.

Values to edit inline in the TrueNAS compose:

```bash
technerdx6000/listcollab-api:1.0.27
technerdx6000/listcollab-web:1.0.27
DB_PASSWORD=replace_with_generated_app_password
DB_ROOT_PASSWORD=replace_with_generated_root_password
CORS_ORIGIN=https://listcollab.example.com
WEB_PORT=8080
```

The current `git-97427c5-dirty-20260820d` image tag was published from this validated uncommitted workspace state.

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
