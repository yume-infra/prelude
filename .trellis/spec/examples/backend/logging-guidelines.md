# Logging Guidelines

> Logging and diagnostics conventions for examples smoke workflows.

---

## Overview

The `examples` package has no runtime logger. Logging happens in CLI smoke scripts and should help diagnose generated project failures.

Smoke logs are allowed to use `console.log` because they are executable scripts.

## Examples

- `apps/cli/tests/support/generated-smoke-gate.ts` logs each smoke phase with prefix, preset, command, args, and cwd.
- `apps/cli/tests/linked-examples.smoke.ts` logs the final generated root on success and keeps the failed root visible on failure.
- `apps/cli/tests/generated-smoke-gate.spec.ts` verifies formatted failures omit environment dumps.

## Rules

- Prefix smoke output with the workflow name, such as `linked-smoke`.
- Include command and cwd in phase logs.
- Keep generated root paths visible for inspection.
- Keep environment setup in `generatedSmokeEnv()` and avoid logging it.

## Forbidden Patterns

- Do not add runtime logging files to `apps/examples`.
- Do not dump `process.env` in smoke logs.
- Do not make smoke output so terse that the failing phase or generated directory is unclear.

## Common Mistakes

- Losing the generated root location after a failed smoke run.
- Logging unlink cleanup errors without preserving the original generation/build/lint error.
- Copying ad hoc logging into each smoke script instead of using shared helpers.
