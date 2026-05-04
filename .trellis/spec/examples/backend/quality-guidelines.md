# Quality Guidelines

> Quality standards for the `examples` package.

---

## Overview

`apps/examples` quality is about proving the linked CLI can generate real React and Vue projects from the local package. It is not a place for reusable source code.

The package should stay small and disposable: documentation plus ignored generated output.

## Rules

- Keep linked smoke representative of user-facing CLI behavior.
- Generate examples through the linked `create-yume` bin, not by importing internal modules.
- Run build and lint for full presets.
- Keep `.generated/` ignored and disposable.

## Examples

- `apps/cli/tests/linked-examples.smoke.ts` verifies `create-yume --version` through the linked global bin before generating examples.
- `apps/cli/tests/support/generated-smoke-gate.ts` centralizes command environment and generated lint arguments.
- `apps/examples/README.md` points users to `pnpm smoke:examples`.

## Verification

- For linked examples behavior, run `pnpm --filter create-yume smoke:examples` or root `pnpm smoke:examples`.
- If template/runtime changes also affect ordinary generated projects, run `pnpm --filter create-yume smoke:generated`.

## Forbidden Patterns

- Do not make `.generated/` a checked-in fixture directory.
- Do not add unit tests under `apps/examples`; CLI tests live under `apps/cli/tests/`.
- Do not weaken full-preset lint checks to hide generated output problems.

## Common Mistakes

- Running only unit tests after changing linked bin behavior.
- Forgetting to unlink the global package during smoke cleanup.
- Treating example generation as documentation-only when it is a validation gate.
