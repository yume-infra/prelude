# Database Guidelines

> Data persistence and structured data conventions for `create-yume`.

---

## Overview

This project has no database, ORM, migrations, or server-side persistence layer. "Database" work in this CLI usually means structured data contracts for generated files, especially `package.json`, `PlanSpec`, and decoded CLI/project configuration.

If a task appears to need a database, it is probably outside the current product boundary. Re-check `docs/agent/constraint/architecture.md` before adding storage concepts.

## Current Data Boundaries

- Project configuration is modeled with Effect Schema in `apps/cli/src/schema/project-config.ts`.
- CLI arguments are parsed by `mri`, then decoded through Effect Schema in `apps/cli/src/core/cli-args.ts` and `apps/cli/src/schema/cli-args.ts`.
- Generated file operations are represented as plan tasks and serializable `PlanSpec` data, not hidden side effects.
- `package.json` mutations are composed through JSON builders and package manifest contribution helpers.

## Examples

- `apps/cli/src/schema/project-config.ts` restricts supported project types to `react` and `vue`, and models React/Vue router and state-management options explicitly.
- `apps/cli/src/core/services/plan/build.ts` defines JSON/text/render/copy tasks and projects them into `PlanSpec`.
- `apps/cli/src/core/services/plan/apply.ts` reads existing JSON only when a task opts into `readExisting`, applies reducers with `immer`, and encodes JSON through Effect Schema.
- `apps/cli/src/core/owners/router.ts` and `apps/cli/src/core/owners/state-management.ts` return package manifest contributions instead of mutating package JSON ad hoc.

## Rules

- Use Effect Schema at external or persisted boundaries.
- Keep JSON mutation declarative through `JsonBuilder`, `PackageManifestContribution`, or the existing modifier helpers.
- Preserve sorted and stable generated JSON where existing builders request it.
- Treat generated project files as the durable output; make dry-run and `PlanSpec` visibility part of the contract.

## Forbidden Patterns

- Do not introduce ORM clients, migration directories, or local database files.
- Do not parse or mutate JSON with string replacement.
- Do not hide generated file mutations behind command execution if they should be visible in `PlanSpec` or dry-run output.
- Do not widen project type literals beyond `react` and `vue` without updating schemas, questions, templates, tests, and docs together.

## Common Mistakes

- Adding a new config option in prompts but forgetting the schema decoder.
- Updating package dependencies in one owner path but not the corresponding package manifest contribution path.
- Treating `package.json` as ordinary text instead of a structured JSON task.
