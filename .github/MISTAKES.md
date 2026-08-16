# MISTAKES

> This file records coding mistakes made by LLM agents in this repository.
> Read it before making any code modification so previously identified mistakes are not repeated.
>
> When a new mistake is discovered, add a concise entry that includes:
> - what was done incorrectly
> - why it was incorrect
> - the correct approach to follow next time
>
> Keep entries brief, specific, and actionable. Record repository-specific lessons, not generic advice.

- 2026-08-14 | Treated immediate post-start frontend HTTP probes as definitive after `docker compose up -d` | The frontend container starts only after the API is healthy, so the first host probe can race nginx and return `000` even when the stack is fine | After cold-start validation in this repo, rerun live HTTP checks against the already-running stack before diagnosing a frontend failure
- 2026-08-15 | Renamed the web entry files to `.ts` and `.tsx` without updating `apps/web/tsconfig.json` include globs | The first web type-check passed while skipping the renamed files, which hid the real conversion errors | After any JS→TS rename in this repo, update the workspace `tsconfig.json` include patterns before trusting a type-check result
- 2026-08-15 | Added a Playwright-only rate-limit bypass by reading `process.env` directly in API middleware | This repo forbids direct `process.env` reads outside the validated env loader, and lint correctly rejected the shortcut | When a new runtime flag is needed here, add it to `apps/api/src/config/env.ts` and consume it via `getEnv()` instead of bypassing config validation
- 2026-08-16 | Ran `npm run test` and `npm run test:e2e` in parallel while both workflows manage local DB/server resources | This repo's unit/integration suite and Playwright webServer setup contend for the same MariaDB container and startup window, producing harness failures unrelated to app behavior | In this repo, run the full unit/integration suite, coverage suite, and Playwright suite serially when validating phase gates