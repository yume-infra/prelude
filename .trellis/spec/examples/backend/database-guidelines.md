# Database Guidelines

> Data and persistence conventions for the `examples` package.

---

## Overview

`apps/examples` has no database, migrations, API storage, or persistent application state. The package only receives generated projects during smoke verification.

Any generated project state is temporary test output.

## Current Data Boundaries

- `apps/examples/.generated/` is created by linked smoke tests and ignored by git.
- `linked-examples.smoke.ts` writes only workspace helper files such as `pnpm-workspace.yaml` and `.npmrc` inside `.generated/`.
- Generated project `package.json` files are asserted by smoke helpers, not treated as hand-maintained data.

## Examples

- `apps/cli/tests/linked-examples.smoke.ts` calls `prepareGeneratedRoot()` to remove and recreate `.generated/`.
- `apps/cli/tests/support/generated-smoke-gate.ts` reads generated `package.json` files and validates project names and lint scripts.
- `apps/examples/README.md` describes `.generated/` as local smoke verification output.

## Rules

- Treat `.generated/` as disposable.
- Keep data assertions in CLI smoke helpers.
- If a generated project needs structured data changes, modify CLI templates and runtime contracts first.

## Forbidden Patterns

- Do not add database clients, migrations, seed data, or fixtures to `apps/examples`.
- Do not hand-edit generated package manifests as a source of truth.
- Do not commit `.generated/` output.

## Common Mistakes

- Debugging a generated failure by patching `.generated` instead of the template source.
- Forgetting that linked smoke deletes and recreates the generated root.
- Adding persistent files under `apps/examples` that should be generated from the CLI.
