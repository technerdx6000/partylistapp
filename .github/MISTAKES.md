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