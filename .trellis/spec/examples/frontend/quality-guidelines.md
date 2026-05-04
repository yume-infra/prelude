# Quality Guidelines

> Quality standards for generated frontend examples.

---

## Overview

Frontend example quality is proven by linked CLI smoke: the local package must link, generate full React/Vue projects, install dependencies, build, and lint with zero warnings.

Generated examples are inspection artifacts, not source files.

## Rules

- Use `pnpm smoke:examples` for linked example verification.
- Keep full generated examples lint-enabled.
- Keep generated output disposable and ignored.
- Inspect failed `.generated/` output only to trace the source template/runtime issue.

## Examples

- `apps/cli/tests/linked-examples.smoke.ts` generates full React/Vue examples into `apps/examples/.generated`.
- `apps/cli/tests/support/generated-smoke-gate.ts` centralizes generated lint args as `['lint', '--max-warnings=0']`.
- `apps/cli/tests/generated-smoke-gate.spec.ts` locks the full-vs-minimal generated lint policy.
- `docs/agent/verification-matrix.md` lists `smoke:examples` for CLI bin/link and generated project baseline changes.

## Verification

- Linked examples: `pnpm --filter create-yume smoke:examples`.
- Broader generated frontend changes: `pnpm --filter create-yume test` plus `pnpm --filter create-yume smoke:generated`.
- Unknown impact: `pnpm verify`.

## Forbidden Patterns

- Do not weaken lint to make generated examples pass.
- Do not skip build/lint after changing linked bin, template dependencies, or generated project baseline.
- Do not treat `.generated/` as stable documentation.

## Common Mistakes

- Inspecting only snapshots when the change affects dependency install or build.
- Forgetting linked smoke uses the globally linked `create-yume` bin.
- Leaving failed generated output unexamined after smoke gives a useful path.
