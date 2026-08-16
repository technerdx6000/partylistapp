# Production Checklist

## Stack

- [ ] `/etc/listcollab/listcollab.env` exists outside the repository
- [ ] `LISTCOLLAB_ENV_FILE` points at the external env file
- [ ] `docker compose -f docker-compose.prod.yml up -d --build` reaches healthy on `db`, `api`, and `web`
- [ ] `migrate` exits successfully before the API starts
- [ ] the database container exposes no host port

## Security

- [ ] reverse proxy redirects HTTP to HTTPS
- [ ] reverse proxy sets HSTS
- [ ] the live hostname returns `Referrer-Policy: no-referrer`
- [ ] the live web response returns the CSP from `apps/web/nginx.conf`
- [ ] CORS `Access-Control-Allow-Origin` matches only the configured production origin
- [ ] `npm audit --audit-level=high` is clean
- [ ] `npm run test:security` passes
- [ ] no source maps are shipped in the web image
- [ ] no dev-only tooling is shipped in the API image

## Verification

- [ ] `npm run test`
- [ ] `npm run test:coverage`
- [ ] `npm run test:e2e`
- [ ] `npm run lint`
- [ ] `npm run type-check`
- [ ] create one real event on the live host and complete the full guest claim flow
- [ ] verify organiser reload on `/manage#k=...`

## Operations

- [ ] install `deploy/systemd/listcollab-backup.service`
- [ ] install `deploy/systemd/listcollab-backup.timer`
- [ ] confirm backups are written outside the repo
- [ ] run `scripts/restore-prod-backup.sh` against a scratch DB before go-live
- [ ] confirm `OPERATIONS.md` is enough for deploy, rollback, and recovery from cold

## Handoff

- [ ] README reflects the final stack and commands
- [ ] SECURITY.md records the accepted trade-offs
- [ ] OPERATIONS.md records backup, restore, rollback, and organiser-link recovery
- [ ] tracker is updated for every completed or blocked Phase 8 task
