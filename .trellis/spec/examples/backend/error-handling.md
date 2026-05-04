# Error Handling

> Error handling conventions for examples smoke workflows.

---

## Overview

The `examples` package does not expose runtime backend errors. Its failure surface is the linked smoke workflow that generates, installs, builds, and lints projects under `apps/examples/.generated/`.

Smoke errors must identify the preset, phase, generated project, cwd, command, and exit/timeout information.

## Examples

- `apps/cli/tests/linked-examples.smoke.ts` preserves the original smoke failure if unlink cleanup also fails.
- `apps/cli/tests/support/generated-smoke-gate.ts` formats errors with prefix, preset, phase, project name, cwd, command, exit code, and timeout.
- `apps/cli/tests/generated-smoke-gate.spec.ts` verifies smoke error formatting does not dump environment variables.

## Rules

- Keep smoke failure messages actionable and phase-specific.
- Preserve failed `.generated/` output for inspection when a smoke case fails.
- Use the shared smoke helper for command execution and formatting.

## Forbidden Patterns

- Do not swallow linked smoke failures after cleanup.
- Do not print `env` or secret-bearing process data in error messages.
- Do not replace shared smoke helpers with one-off `execa` formatting.

## Common Mistakes

- Reporting only "build failed" without the generated project path.
- Losing the original failure when cleanup/unlink also fails.
- Making assertions in `apps/examples` instead of shared CLI smoke helpers.
