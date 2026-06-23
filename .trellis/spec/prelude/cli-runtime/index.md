# CLI Runtime

> Runtime, service, command, and error contracts for `apps/cli`.

---

## Scope

This layer covers the CLI package runtime under `apps/cli/src/`: entrypoint execution, CLI args, prompt composition, Effect services, plan application, filesystem and command boundaries, and domain errors.

## Current Runtime Shape

- Entrypoint: `apps/cli/src/index.ts`.
- CLI args: `apps/cli/src/core/cli-args.ts` and `apps/cli/src/core/cli-help.ts`.
- Prompt/preset composition: `apps/cli/src/core/questions/compose.ts`.
- Stable services: `PlanService`, `TemplateEngineService`, `FsService`, and `CommandService`.
- Domain errors: `apps/cli/src/core/errors.ts`.

## Contracts

| Surface | Contract |
| --- | --- |
| CLI input | Decode external args/spec input before project generation logic consumes them. |
| `--spec` | Decode create spec, adapt to `ProjectConfig`, then enter the normal plan workflow. |
| Commands | Use `CommandService`; command diagnostics preserve command, args, cwd, cause, and available stdout/stderr/output for local commands. |
| Filesystem | Use `FsService` and plan/apply boundaries; generated target paths remain project-relative. |
| Plan apply | Reject absolute, escaping, and duplicate target paths before writes. Roll back tracked created paths on failure. |

## Validation & Error Matrix

| Case | Expected behavior | Boundary |
| --- | --- | --- |
| Removed `--yes/-y` is used | Fail with `SchemaContractError` and guidance toward explicit preset/spec input | CLI args |
| `--spec` and `--preset` are both provided | Fail before prompts | CLI args |
| Command fails locally | Return `CommandError` with command diagnostics | `CommandService` |
| Target path escapes output root | Fail before writing | Plan apply |
| Plan contains duplicate target paths | Fail before writing | Plan apply |

## Tests Required

- CLI arg decode tests for changed flags and mutual exclusions.
- Plan/apply tests when target-path or rollback behavior changes.
- Command service tests when command diagnostics or execution boundaries change.
- Typecheck plus focused Vitest coverage for runtime-only edits.

## Forbidden Patterns

- Do not call filesystem or process execution directly from feature logic when an Effect service boundary exists.
- Do not leak platform errors through public service APIs when a domain error exists.
- Do not add redaction-sensitive command output behavior without updating this spec first.
