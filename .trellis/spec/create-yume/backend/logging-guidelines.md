# Logging Guidelines

> Logging, tracing, and diagnostics conventions for the CLI runtime.

---

## Overview

Runtime code uses Effect logging and spans. Logs should be attached to the Effect that performs the work, and spans should carry project/config context where useful.

Smoke scripts may use `console.log` for phase progress because they are executable test scripts, not reusable runtime services.

## Runtime Logging Rules

- Use `Effect.logInfo`, `Effect.logDebug`, or `Effect.logWarning` inside the executing Effect.
- Add `Effect.withSpan` around meaningful service operations.
- Use `Effect.annotateLogs` and `Effect.annotateSpans` for command args, task kinds, template paths, and project type when those fields help diagnosis.
- Keep command diagnostics focused on command, args, cwd, output, exit code, and timeout. Do not dump `env`.

## Examples

- `apps/cli/src/core/services/command.ts` logs the command before execution, logs output after success, and annotates logs/spans with command, args, and cwd.
- `apps/cli/src/core/services/template-engine.ts` wraps render operations in `template.render` spans through `withProjectAnnotations`.
- `apps/cli/src/core/questions/compose.ts` annotates question collection with `taskKind: questions.collect`.
- `apps/cli/tests/support/generated-smoke-gate.ts` formats generated smoke failures without including environment variables.

## Forbidden Patterns

- Do not call an Effect logger separately from the Effect pipeline and assume it executed.
- Do not add generic `console.log` in service/runtime modules.
- Do not log full process environments, tokens, or package registry credentials.
- Do not hide command stderr/stdout when mapping a local command failure; preserve available diagnostics on `CommandError`.

## Common Mistakes

- Logging before constructing an Effect rather than inside `Effect.gen`.
- Making smoke diagnostics too terse to identify the preset, phase, cwd, or command.
- Adding a new command boundary without command failure tests.
