# Copilot Instructions

> Location: `.github/copilot-instructions.md`
> VS Code applies this file automatically to every Copilot chat and agent request in this workspace.
> It does **not** affect inline (ghost text) completions.
> Keep it short — every line here is prepended to every request.

## Project Build Plans

Each project has a structured build plan under `.github/build-plans/{project-slug}/`. These files are **not**
loaded automatically. When working on a project, **read its README.md first**:

```
.github/build-plans/
├── listcollab/
│   ├── README.md              ← Start here. Project overview, tech stack, commands, and how to use the plan.
│   ├── CONVENTIONS.md         ← Coding standards and security requirements. Read before writing code.
│   ├── TRACKER.md             ← Current build status. Check and update as you work.
│   ├── TEST_PLAN.md           ← Central test strategy and coverage targets.
│   ├── TESTING_STANDARDS.md   ← How to write tests. Applies to every phase.
│   └── phases/
│       ├── PHASE_01_*.md      ← Work through phases sequentially.
│       └── ...
```

## Active Projects

| Project | Plan Location | Status |
|---------|--------------|--------|
| ListCollab | `.github/build-plans/listcollab/README.md` | 🔄 Not Started |

## Session Start

You do not retain the plan between sessions. At the start of every session, and after any context reset or
summarisation, re-read these before writing code:

1. `.github/build-plans/listcollab/TRACKER.md` — find the active phase and next incomplete task
2. `.github/build-plans/listcollab/phases/PHASE_{NN}_*.md` — the active phase file
3. `.github/build-plans/listcollab/CONVENTIONS.md` — if you have not read it this session
4. `.github/MISTAKES.md` — if you have not read it this session

If you are unsure whether you have read a file this session, read it again. Guessing at the plan is worse than
re-reading it.

## MISTAKES.md

This is your internal feedback loop. Use MISTAKES.md to write down any mistakes you made and what you did to resolve it in a easily machine-readable format. This will be reviewed before all code changes.

## Working Loop

When directed to work on a project, follow this cycle:

1. **Read** `.github/build-plans/listcollab/README.md` to orient yourself
2. **Read** `.github/build-plans/listcollab/CONVENTIONS.md` before writing any code
3. **Read** `.github/MISTAKES.md` before making any code changes to avoid repeating known mistakes
4. **Check** `.github/build-plans/listcollab/TRACKER.md` to identify the active phase and next task
5. **Read** the active phase file in `.github/build-plans/listcollab/phases/`
6. **Implement** the task, write tests, run tests, update tracker, commit
7. **Repeat** until the phase is complete, then move to the next phase

## Behavioural Rules

These apply to all projects:

- **Security first.** Complete all 🔒 security tasks before marking any phase done. Never defer security.
- **No placeholder code.** Every function must be fully implemented. `// TODO` is not acceptable in committed code.
- **No skipping tests.** Every task includes testing. A task without passing tests is not complete.
- **Run the full test suite** before completing a task, not just the tests you wrote. Regressions are your responsibility.
- **Keep TRACKER.md current.** Update task status immediately when you start, complete, or get blocked on a task. It is the only record that survives between sessions.
- **Package-first.** Check if an NPM package solves the problem before writing custom logic.
- **Comment every function.** JSDoc on all exported functions and non-trivial internal functions.
- **Ask before deviating.** If a phase instruction is ambiguous or seems wrong, surface the question rather than making an autonomous decision that could invalidate subsequent phases.
- **Stay in scope.** Only work on tasks in the current phase. Do not jump ahead or refactor outside the active phase unless a blocker requires it.
- **Commit frequently** with conventional commit messages as you complete tasks.

---

*Add new projects to the Active Projects table as build plans are created. If this file already existed in the repo, merge the new row in rather than replacing the file.*
