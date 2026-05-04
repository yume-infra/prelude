# Error Handling

> Error types and handling strategies for the CLI runtime.

---

## Overview

Errors are domain-shaped and explicit. Runtime services map platform, schema, command, template, and filesystem failures into tagged error classes from `apps/cli/src/core/errors.ts`.

Effect failures should carry enough context for CLI diagnostics and tests without leaking unrelated environment data.

## Error Types

- `SchemaContractError`: invalid CLI args, project names, or project config contracts.
- `TemplateError`: Handlebars compile/render failures with template path and stage.
- `FileIOError`: filesystem operations with operation name and path.
- `CommandError`: local command execution failures with command, args, cwd, cause, and available output diagnostics.
- `PlanConflictError`: duplicate target paths inside one plan application.
- `PlanTargetPathError`: absolute or escaping generated target paths.
- `PlanSpecProjectionError`: non-serializable plan operations that cannot be projected to `PlanSpec`.

## Examples

- `apps/cli/src/core/cli-args.ts` rejects removed `--yes/-y` usage with `SchemaContractError` before decoding.
- `apps/cli/src/core/services/command.ts` maps platform command failures into `CommandError` and preserves stdout/stderr/output when available.
- `apps/cli/src/core/services/fs.ts` maps platform filesystem errors into `FileIOError` with operation and path.
- `apps/cli/src/core/services/plan/apply.ts` rejects absolute paths, path traversal, and duplicate target paths before writing.

## Rules

- Prefer `Effect.fail(new DomainError(...))` or `yield* new DomainError(...)` inside Effect code.
- Decode external input at the boundary and wrap formatter output in `SchemaContractError`.
- Preserve command diagnostics for local commands, but do not add environment dumps to error messages.
- Use `assertNever` only for unreachable exhaustive branches after schema-constrained unions.

## Forbidden Patterns

- Do not throw raw strings or generic `Error` from Effect service logic.
- Do not allow platform errors to leak through public service APIs when a domain error exists.
- Do not lose target path, command, cwd, or schema names in error mapping.
- Do not add redaction-sensitive command output behavior without updating `docs/agent/constraint/architecture.md`.

## Common Mistakes

- Calling `Effect.logInfo` outside the Effect that actually executes.
- Formatting command failures by dumping the whole error object, which can leak `env`.
- Adding a new plan task kind without extending conflict/path/projection tests.
