---
name: 'ListCollab Build Rules'
description: 'Non-negotiable conventions for ListCollab. Full detail in .github/build-plans/listcollab/CONVENTIONS.md.'
applyTo: '**'
---

# ListCollab — Non-Negotiables

> Location: `.github/instructions/listcollab.instructions.md`
> Auto-applied whenever you work on a file matching `applyTo`. Without `applyTo`, this file is never applied
> automatically — do not remove it.
>
> This is the condensed set. The full rules are in
> [CONVENTIONS.md](../build-plans/listcollab/CONVENTIONS.md), and the current task is in
> [TRACKER.md](../build-plans/listcollab/TRACKER.md). Read both before writing code.

## Before You Write Code

- Read the active phase file in `.github/build-plans/listcollab/phases/`. It defines what you are allowed to build right now.
- Do not implement tasks from a later phase. Do not refactor outside the active phase.

## Always

- **Security first.** 🔒 tasks in the phase file are blocking. Never mark a phase done with one outstanding.
- **No placeholder code.** No `// TODO`, no stubbed returns, no unimplemented branches in committed code.
- **Tests ship with the code.** Write them per `TESTING_STANDARDS.md`, then run the full suite — not just the new tests.
- **Update `TRACKER.md`** the moment a task starts, completes, or blocks.
- **JSDoc every exported function** before considering a file finished.
- **Package-first.** Check for an existing NPM package before writing custom logic. If you choose custom, add `// CUSTOM: <reason>`.
- **Validate all external input** at the boundary with a Zod schema from `@listcollab/shared`. Never trust client-supplied data.
- **Event scoping is authorisation.** Every read or write must resolve the event from the `X-Event-Token` header and verify the target row belongs to that event before touching it.
- **Never log event tokens**, admin tokens, connection strings, or participant contact details.
- **Never commit credentials.** Config comes from environment variables validated at startup.

## Never

- Disable a type check, lint rule, or failing test to make something pass. Fix the cause or raise a blocker.
- Put a token in a query string, a log line, or an error message.
- Duplicate a domain type in `apps/web` or `apps/api`. Types live once in `packages/shared`.
- Introduce a dependency that is not in the preferred packages table without flagging it.
- Silently deviate from a phase instruction. If it is wrong or ambiguous, say so and stop.

## Stack

React 19 + Vite + MUI + TypeScript (strict), Express + TypeScript on Node 22, MariaDB via `mysql2` with parameterised queries, Turborepo monorepo, Vitest + Supertest + React Testing Library + Playwright, Docker Compose self-hosted.

## Commands

```bash
npm run test         # run before completing any task
npm run type-check
npm run lint
```
