# Directory Structure

> How backend-like code is organized in the `examples` package.

---

## Overview

`apps/examples` is not an application backend. It is a smoke-test output area for generated projects created by the local `create-yume` CLI.

The only stable source file in this package is documentation. Generated projects are written to `apps/examples/.generated/` by `apps/cli/tests/linked-examples.smoke.ts` and are ignored by git.

## Directory Layout

```text
apps/examples/
  README.md
  .generated/        created and removed/recreated by linked smoke tests
```

## Module Organization

- Do not add backend modules, API routes, services, or database code under `apps/examples`.
- If generated backend-like behavior ever appears, it must come from `apps/cli/templates/` and `apps/cli/src/core/template-registry/`, not hand-authored example source.
- Keep smoke orchestration in `apps/cli/tests/linked-examples.smoke.ts`.

## Naming Conventions

- Generated example project names are explicit and preset-oriented: `react-full-linked`, `vue-full-linked`.
- Smoke output stays under `.generated/`.
- Documentation should describe how to run smoke commands, not duplicate CLI implementation details.

## Examples

- `apps/examples/README.md` documents that `.generated/` is for local smoke verification.
- `.gitignore` excludes `apps/examples/.generated/`.
- `apps/cli/tests/linked-examples.smoke.ts` prepares `.generated/`, writes a local `pnpm-workspace.yaml`, links the CLI, generates React/Vue full presets, and runs build/lint.

## Forbidden Patterns

- Do not commit generated projects from `apps/examples/.generated/`.
- Do not put reusable runtime code in `apps/examples`.
- Do not fix generated example output by editing `.generated`; fix CLI templates, registries, or package contributions.
